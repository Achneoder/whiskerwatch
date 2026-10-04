import { describe, expect, it, beforeEach } from 'vitest';
import {
  getParty,
  addMember,
  updateMember,
  removeMember,
  replaceParty,
  setHp,
  healHp,
  dealDamage,
  killMember,
  addScar,
  addCondition,
  removeCondition,
  spendForCommunity,
  COMMUNITY_XP_PER_PIP,
  type PartyMember,
} from './party.svelte';

function member(overrides: Partial<PartyMember> = {}): Omit<PartyMember, 'id'> {
  const { id: _id, ...rest } = {
    id: 'unused',
    name: 'Pip',
    role: 'Scout',
    hp: 6,
    max: 6,
    str: 10,
    maxStr: 10,
    dex: 10,
    wil: 10,
    pips: 0,
    xp: 0,
    level: 1,
    status: 'active' as const,
    conditions: [],
    scars: [],
    items: [],
    ...overrides,
  };
  return rest;
}

function seedOne(overrides: Partial<PartyMember> = {}) {
  addMember(member(overrides));
  return getParty()[0]!.id;
}

describe('party store', () => {
  beforeEach(() => {
    replaceParty([]);
  });

  it('adds a member', () => {
    seedOne({ name: 'Juniper' });
    expect(getParty()).toHaveLength(1);
    expect(getParty()[0]?.name).toBe('Juniper');
  });

  it('updates a member', () => {
    const id = seedOne();
    updateMember(id, { role: 'Warden' });
    expect(getParty()[0]?.role).toBe('Warden');
  });

  it('removes a member', () => {
    const id = seedOne();
    removeMember(id);
    expect(getParty()).toHaveLength(0);
  });

  describe('setHp / healHp', () => {
    it('clamps setHp to [0, max]', () => {
      const id = seedOne({ hp: 6, max: 6 });
      setHp(id, 99);
      expect(getParty()[0]?.hp).toBe(6);
      setHp(id, -5);
      expect(getParty()[0]?.hp).toBe(0);
    });

    it('heals hp but clamps at max', () => {
      const id = seedOne({ hp: 2, max: 6 });
      healHp(id, 3);
      expect(getParty()[0]?.hp).toBe(5);
      healHp(id, 10);
      expect(getParty()[0]?.hp).toBe(6);
    });

    it('ignores negative heal amounts instead of draining hp', () => {
      const id = seedOne({ hp: 2, max: 6 });
      healHp(id, -10);
      expect(getParty()[0]?.hp).toBe(2);
    });
  });

  describe('dealDamage', () => {
    it('drains hp only when damage does not exceed current hp', () => {
      const id = seedOne({ hp: 6, max: 6, str: 10, maxStr: 10 });
      const outcome = dealDamage(id, 4);

      expect(outcome).toEqual({
        hpLost: 4,
        strLost: 0,
        newHp: 2,
        newStr: 10,
        strSaveRequired: false,
        died: false,
      });
      expect(getParty()[0]?.hp).toBe(2);
      expect(getParty()[0]?.str).toBe(10);
    });

    it('overflows into str once hp is exhausted, and flags a str save', () => {
      const id = seedOne({ hp: 3, max: 6, str: 10, maxStr: 10 });
      const outcome = dealDamage(id, 5);

      expect(outcome?.hpLost).toBe(3);
      expect(outcome?.strLost).toBe(2);
      expect(outcome?.newHp).toBe(0);
      expect(outcome?.newStr).toBe(8);
      expect(outcome?.strSaveRequired).toBe(true);
      expect(outcome?.died).toBe(false);
    });

    it('flags death when str is reduced to exactly 0', () => {
      const id = seedOne({ hp: 0, max: 6, str: 3, maxStr: 10 });
      const outcome = dealDamage(id, 3);

      expect(outcome?.newStr).toBe(0);
      expect(outcome?.strSaveRequired).toBe(true);
      expect(outcome?.died).toBe(true);
    });

    it('does not flag death when str is only partially drained', () => {
      const id = seedOne({ hp: 0, max: 6, str: 5, maxStr: 10 });
      const outcome = dealDamage(id, 3);

      expect(outcome?.newStr).toBe(2);
      expect(outcome?.died).toBe(false);
    });

    it('returns null for an unknown id', () => {
      expect(dealDamage('missing', 3)).toBeNull();
    });
  });

  it('kills a member by setting status to deceased', () => {
    const id = seedOne({ status: 'active' });
    killMember(id);
    expect(getParty()[0]?.status).toBe('deceased');
  });

  it('adds a scar', () => {
    const id = seedOne();
    addScar(id, { label: 'Lost an eye', note: 'Disadvantage on ranged attacks.' });
    expect(getParty()[0]?.scars).toEqual([{ label: 'Lost an eye', note: 'Disadvantage on ranged attacks.' }]);
  });

  describe('conditions', () => {
    it('adds a condition without duplicating it', () => {
      const id = seedOne();
      addCondition(id, 'frightened');
      addCondition(id, 'frightened');
      expect(getParty()[0]?.conditions).toEqual(['frightened']);
    });

    it('removes a condition', () => {
      const id = seedOne({ conditions: ['frightened', 'exhausted'] });
      removeCondition(id, 'frightened');
      expect(getParty()[0]?.conditions).toEqual(['exhausted']);
    });
  });

  describe('spendForCommunity', () => {
    it('awards xp proportional to pips spent', () => {
      const id = seedOne({ xp: 0, level: 1 });
      const result = spendForCommunity(id, 100);

      expect(result?.xpGained).toBe(Math.round(100 * COMMUNITY_XP_PER_PIP));
      expect(getParty()[0]?.xp).toBe(result?.xpGained);
    });

    it('flags a level-up once the xp threshold is crossed', () => {
      const id = seedOne({ xp: 0, level: 1 });
      const result = spendForCommunity(id, 100000);

      expect(result?.leveledUp).toBe(true);
      expect(result?.newLevel).toBeGreaterThan(1);
      expect(getParty()[0]?.level).toBe(result?.newLevel);
    });

    it('does not flag a level-up for a small amount of xp', () => {
      const id = seedOne({ xp: 0, level: 1 });
      const result = spendForCommunity(id, 1);

      expect(result?.leveledUp).toBe(false);
      expect(getParty()[0]?.level).toBe(1);
    });

    it.each<[number, number]>([
      [0, 1],
      [999, 1],
      [1000, 2],
      [2999, 2],
      [3000, 3],
      [5999, 3],
      [6000, 4],
      [10999, 4],
      [11000, 5],
      [15999, 5],
      [16000, 6],
      [20999, 6],
      [21000, 7],
      [25999, 7],
      [26000, 8],
    ])('follows the SRD advancement table at %i xp (level %i)', (xp, expectedLevel) => {
      const id = seedOne({ xp, level: 1 });
      spendForCommunity(id, 0);
      expect(getParty()[0]?.level).toBe(expectedLevel);
    });
  });

  describe('migration of legacy records', () => {
    it('fills in defaults for a record missing every Phase 7 field', () => {
      replaceParty([{ id: 'legacy', name: 'Old Timer', role: 'Scout', hp: 4, max: 6, pips: 10 } as unknown as PartyMember]);

      const migrated = getParty()[0]!;
      expect(migrated.id).toBe('legacy');
      expect(migrated.str).toBeGreaterThan(0);
      expect(migrated.maxStr).toBeGreaterThan(0);
      expect(migrated.dex).toBeGreaterThan(0);
      expect(migrated.wil).toBeGreaterThan(0);
      expect(migrated.status).toBe('active');
      expect(migrated.scars).toEqual([]);
      expect(migrated.conditions).toEqual([]);
      expect(migrated.xp).toBe(0);
      expect(migrated.level).toBe(1);
    });

    it('maps recognizable legacy free-text conditions to the fixed vocabulary', () => {
      replaceParty([
        {
          id: 'legacy',
          name: 'Wren',
          role: 'Tinker',
          hp: 2,
          max: 6,
          pips: 10,
          conditions: [
            { tone: 'danger', label: 'Frightened' },
            { tone: 'warning', label: 'Hungry' },
          ],
        } as unknown as PartyMember,
      ]);

      expect(getParty()[0]?.conditions).toEqual(['frightened', 'hungry-thirsty']);
    });

    it('drops unrecognized legacy conditions instead of crashing', () => {
      replaceParty([
        {
          id: 'legacy',
          name: 'Mystery Mouse',
          role: 'Scout',
          hp: 4,
          max: 6,
          pips: 0,
          conditions: [{ tone: 'danger', label: 'Cursed by an owl' }],
        } as unknown as PartyMember,
      ]);

      expect(getParty()[0]?.conditions).toEqual([]);
    });

    it('does not crash on a completely malformed record', () => {
      replaceParty([null as unknown as PartyMember]);

      expect(getParty()).toHaveLength(1);
      expect(getParty()[0]?.name).toBe('Unnamed');
      expect(getParty()[0]?.conditions).toEqual([]);
    });
  });
});
