import { describe, expect, it, beforeEach } from 'vitest';
import {
  getHirelings,
  addHireling,
  updateHireling,
  removeHireling,
  replaceHirelings,
  healHirelingHp,
  dealHirelingDamage,
  killHireling,
  addHirelingScar,
  addHirelingCondition,
  removeHirelingCondition,
  type Hireling,
} from './hirelings.svelte';

function hireling(overrides: Partial<Hireling> = {}): Omit<Hireling, 'id'> {
  const { id: _id, ...rest } = {
    id: 'unused',
    name: 'Oat',
    role: 'Porter',
    hp: 3,
    max: 3,
    str: 10,
    maxStr: 10,
    dex: 10,
    wil: 10,
    loyal: false,
    wage: 5,
    notes: '',
    status: 'active' as const,
    conditions: [],
    scars: [],
    items: [],
    ...overrides,
  };
  return rest;
}

function seedOne(overrides: Partial<Hireling> = {}) {
  addHireling(hireling(overrides));
  return getHirelings()[0]!.id;
}

describe('hirelings store', () => {
  beforeEach(() => {
    replaceHirelings([]);
  });

  it('adds a hireling', () => {
    seedOne({ name: 'Clover' });
    expect(getHirelings()).toHaveLength(1);
    expect(getHirelings()[0]?.name).toBe('Clover');
  });

  it('updates a hireling', () => {
    const id = seedOne();
    updateHireling(id, { role: 'Guide' });
    expect(getHirelings()[0]?.role).toBe('Guide');
  });

  it('removes a hireling', () => {
    const id = seedOne();
    removeHireling(id);
    expect(getHirelings()).toHaveLength(0);
  });

  describe('healHirelingHp', () => {
    it('heals hp but clamps at max', () => {
      const id = seedOne({ hp: 1, max: 3 });
      healHirelingHp(id, 5);
      expect(getHirelings()[0]?.hp).toBe(3);
    });
  });

  describe('dealHirelingDamage', () => {
    it('drains hp only when damage does not exceed current hp', () => {
      const id = seedOne({ hp: 3, max: 3, str: 10, maxStr: 10 });
      const outcome = dealHirelingDamage(id, 2);

      expect(outcome).toEqual({
        hpLost: 2,
        strLost: 0,
        newHp: 1,
        newStr: 10,
        strSaveRequired: false,
        died: false,
      });
    });

    it('overflows into str once hp is exhausted, and flags a str save', () => {
      const id = seedOne({ hp: 1, max: 3, str: 10, maxStr: 10 });
      const outcome = dealHirelingDamage(id, 4);

      expect(outcome?.hpLost).toBe(1);
      expect(outcome?.strLost).toBe(3);
      expect(outcome?.newHp).toBe(0);
      expect(outcome?.newStr).toBe(7);
      expect(outcome?.strSaveRequired).toBe(true);
      expect(outcome?.died).toBe(false);
    });

    it('flags death when str is reduced to exactly 0', () => {
      const id = seedOne({ hp: 0, max: 3, str: 2, maxStr: 10 });
      const outcome = dealHirelingDamage(id, 2);

      expect(outcome?.newStr).toBe(0);
      expect(outcome?.died).toBe(true);
    });

    it('returns null for an unknown id', () => {
      expect(dealHirelingDamage('missing', 3)).toBeNull();
    });
  });

  it('kills a hireling by setting status to deceased', () => {
    const id = seedOne();
    killHireling(id);
    expect(getHirelings()[0]?.status).toBe('deceased');
  });

  it('adds a scar', () => {
    const id = seedOne();
    addHirelingScar(id, { label: 'Broken paw', note: 'Half speed until tended.' });
    expect(getHirelings()[0]?.scars).toEqual([{ label: 'Broken paw', note: 'Half speed until tended.' }]);
  });

  describe('conditions', () => {
    it('adds a condition without duplicating it', () => {
      const id = seedOne();
      addHirelingCondition(id, 'exhausted');
      addHirelingCondition(id, 'exhausted');
      expect(getHirelings()[0]?.conditions).toEqual(['exhausted']);
    });

    it('removes a condition', () => {
      const id = seedOne({ conditions: ['exhausted', 'hungry-thirsty'] });
      removeHirelingCondition(id, 'exhausted');
      expect(getHirelings()[0]?.conditions).toEqual(['hungry-thirsty']);
    });
  });

  describe('migration of legacy records', () => {
    it('fills in defaults for a record missing every Phase 7 field', () => {
      replaceHirelings([
        { id: 'legacy', name: 'Old Hand', role: 'Porter', hp: 2, max: 3, loyalty: 3, notes: 'n/a' } as unknown as Hireling,
      ]);

      const migrated = getHirelings()[0]!;
      expect(migrated.id).toBe('legacy');
      expect(migrated.str).toBeGreaterThan(0);
      expect(migrated.maxStr).toBeGreaterThan(0);
      expect(migrated.dex).toBeGreaterThan(0);
      expect(migrated.wil).toBeGreaterThan(0);
      expect(migrated.status).toBe('active');
      expect(migrated.scars).toEqual([]);
      expect(migrated.conditions).toEqual([]);
      expect(migrated.wage).toBe(0);
      // The pre-SRD 2d6 `loyalty` score has no SRD equivalent and is dropped.
      expect(migrated.loyal).toBe(false);
      expect('loyalty' in migrated).toBe(false);
    });

    it('maps recognizable legacy free-text conditions to the fixed vocabulary', () => {
      replaceHirelings([
        {
          id: 'legacy',
          name: 'Oat',
          role: 'Porter',
          hp: 1,
          max: 3,
          loyalty: 4,
          notes: '',
          conditions: [{ tone: 'warning', label: 'Hungry' }],
        } as unknown as Hireling,
      ]);

      expect(getHirelings()[0]?.conditions).toEqual(['hungry-thirsty']);
    });

    it('does not crash on a completely malformed record', () => {
      replaceHirelings([undefined as unknown as Hireling]);

      expect(getHirelings()).toHaveLength(1);
      expect(getHirelings()[0]?.name).toBe('Unnamed');
    });
  });
});
