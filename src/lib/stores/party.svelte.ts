import { createPersistedList } from './persistedList.svelte';
import { migrateConditions, type ConditionName, type Scar } from '../conditions';
import { applyDamage, type DamageOutcome } from '../combat';
import { addItem, removeItem, updateItem, tickCharge, type Item } from '../items';
import { DEMO_PARTY } from '../demoCampaign';

export interface PartyMember {
  id: string;
  name: string;
  role: string;
  hp: number;
  max: number;
  /** Current STR score (3–18 range in Mausritter). Drained by damage overflow once HP hits 0. */
  str: number;
  maxStr: number;
  /** Static DEX score — no "current vs max" distinction; DEX isn't drained by damage. */
  dex: number;
  /** Static WIL score — no "current vs max" distinction. */
  wil: number;
  pips: number;
  xp: number;
  level: number;
  status: 'active' | 'deceased';
  conditions: ConditionName[];
  /** Permanent Fatal Wounds outcomes — separate from `conditions`, never auto-cleared. */
  scars: Scar[];
  /** Flat inventory list — see `items.ts` for the fixed 10-slot cap this is checked against. */
  items: Item[];
}

const STORAGE_KEY = 'whiskerwatch:party';

/**
 * SRD "Advancement": the main XP source is treasure brought back to safety
 * (1 XP per pip, split across the party). On top of that, pips spent
 * *selflessly* on improvements for the whole community earn 1 XP per 10.
 * This constant is that bonus rate only.
 */
export const COMMUNITY_XP_PER_PIP = 0.1;

/**
 * Level-up XP thresholds (SRD "Advancement" table). Irregular through
 * level 6 (1000, +2000, +3000, +5000, +5000), then +5000/level uncapped.
 * Index = level - 1, so XP_THRESHOLDS[n] is the XP required to reach
 * level n + 1.
 */
export const XP_THRESHOLDS = [0, 1000, 3000, 6000, 11000, 16000];

function levelForXp(xp: number): number {
  let level = 1;
  while (true) {
    const threshold = level < XP_THRESHOLDS.length ? (XP_THRESHOLDS[level] ?? 0) : 16000 + (level - 5) * 5000;
    if (xp < threshold) return level;
    level += 1;
  }
}

const seedParty: PartyMember[] = [
  {
    id: crypto.randomUUID(),
    ...DEMO_PARTY[0]!.en,
    hp: 4,
    max: 6,
    str: 10,
    maxStr: 10,
    dex: 13,
    wil: 9,
    pips: 320,
    xp: 0,
    level: 1,
    status: 'active',
    conditions: [],
    scars: [],
    items: [],
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_PARTY[1]!.en,
    hp: 2,
    max: 6,
    str: 8,
    maxStr: 8,
    dex: 10,
    wil: 12,
    pips: 95,
    xp: 0,
    level: 1,
    status: 'active',
    conditions: ['frightened'],
    scars: [],
    items: [],
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_PARTY[2]!.en,
    hp: 6,
    max: 6,
    str: 13,
    maxStr: 13,
    dex: 9,
    wil: 8,
    pips: 610,
    xp: 0,
    level: 1,
    status: 'active',
    conditions: ['hungry-thirsty'],
    scars: [],
    items: [],
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_PARTY[3]!.en,
    hp: 3,
    max: 6,
    str: 8,
    maxStr: 8,
    dex: 10,
    wil: 13,
    pips: 140,
    xp: 0,
    level: 1,
    status: 'active',
    conditions: [],
    scars: [],
    items: [],
  },
];

function isScar(value: unknown): value is Scar {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.label === 'string' && typeof v.note === 'string';
}

function isItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.slots === 1 || v.slots === 2) &&
    (v.charges === null || typeof v.charges === 'number') &&
    (v.maxCharges === null || typeof v.maxCharges === 'number') &&
    typeof v.notes === 'string'
  );
}

/**
 * Fills sane defaults for fields a pre-Phase-7 record won't have (missing
 * attributes/status/scars/xp/level) and migrates the old free-text
 * `{tone, label}` conditions to the fixed vocabulary, so an old
 * localStorage or campaign-export record degrades gracefully instead of
 * shipping `undefined` fields into the UI.
 */
function normalizeMember(raw: unknown): PartyMember {
  const r = (raw ?? {}) as Partial<PartyMember> & Record<string, unknown>;
  const maxStr = typeof r.maxStr === 'number' ? r.maxStr : 10;
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : crypto.randomUUID(),
    name: typeof r.name === 'string' ? r.name : 'Unnamed',
    role: typeof r.role === 'string' ? r.role : '',
    hp: typeof r.hp === 'number' ? r.hp : 6,
    max: typeof r.max === 'number' ? r.max : 6,
    str: typeof r.str === 'number' ? r.str : maxStr,
    maxStr,
    dex: typeof r.dex === 'number' ? r.dex : 10,
    wil: typeof r.wil === 'number' ? r.wil : 10,
    pips: typeof r.pips === 'number' ? r.pips : 0,
    xp: typeof r.xp === 'number' ? r.xp : 0,
    level: typeof r.level === 'number' ? r.level : 1,
    status: r.status === 'deceased' ? 'deceased' : 'active',
    conditions: migrateConditions(r.conditions),
    scars: Array.isArray(r.scars) ? r.scars.filter(isScar) : [],
    items: Array.isArray(r.items) ? r.items.filter(isItem) : [],
  };
}

const list = createPersistedList<PartyMember>(STORAGE_KEY, seedParty);

export function getParty(): PartyMember[] {
  return list.items;
}

export function addMember(input: Omit<PartyMember, 'id'>): void {
  list.add({ ...input, id: crypto.randomUUID() });
}

export function updateMember(id: string, patch: Partial<Omit<PartyMember, 'id'>>): void {
  list.update(id, patch);
}

export function removeMember(id: string): void {
  list.remove(id);
}

export function replaceParty(members: PartyMember[]): void {
  // `normalizeMember` takes `unknown` deliberately: a record coming from
  // localStorage or a campaign-export JSON file may not actually match
  // `PartyMember` at runtime even though it's typed that way here, so we
  // re-validate instead of trusting the annotation.
  list.replaceAll((members as unknown[]).map(normalizeMember));
}

/**
 * Resolves once this store's data has been hydrated from IndexedDB (see
 * `persistedList.svelte.ts`) *and* normalized (see `normalizeMember` above)
 * so old-shape records never leak undefined fields into the app. App boot
 * awaits this (alongside every other store) before mounting `App.svelte`.
 */
export const ready: Promise<void> = list.ready.then(() => {
  // Skip the write entirely when normalization is a no-op (the overwhelmingly
  // common case) — an unconditional `replaceParty` here would mean every
  // single app boot pays for a second full IndexedDB round-trip on top of
  // hydration's own, for no actual change.
  const normalized = (list.items as unknown[]).map(normalizeMember);
  if (JSON.stringify(normalized) !== JSON.stringify(list.items)) {
    list.replaceAll(normalized);
  }
});

/** See `PersistedList.flush` — awaited by `campaignExport.ts` after `replaceParty` to guarantee an import is durably saved. */
export const flush: () => Promise<void> = () => list.flush();

export function setHp(id: string, value: number): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { hp: Math.max(0, Math.min(member.max, value)) });
}

export function healHp(id: string, amount: number): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { hp: Math.max(0, Math.min(member.max, member.hp + Math.max(0, amount))) });
}

/**
 * Applies damage using Mausritter's HP-then-STR overflow. Returns the
 * outcome so the caller (Live Session, stage 2) knows whether a STR save is
 * now due and whether STR hit exactly 0 — this function does not roll that
 * save or apply Injured/Incapacitated/deceased itself.
 */
export function dealDamage(id: string, amount: number): DamageOutcome | null {
  const member = list.items.find((m) => m.id === id);
  if (!member) return null;
  const outcome = applyDamage({ hp: member.hp, str: member.str }, amount);
  list.update(id, { hp: outcome.newHp, str: outcome.newStr });
  return outcome;
}

export function killMember(id: string): void {
  list.update(id, { status: 'deceased' });
}

export function addScar(id: string, scar: Scar): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { scars: [...member.scars, scar] });
}

export function addCondition(id: string, condition: ConditionName): void {
  const member = list.items.find((m) => m.id === id);
  if (!member || member.conditions.includes(condition)) return;
  list.update(id, { conditions: [...member.conditions, condition] });
}

export function removeCondition(id: string, condition: ConditionName): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { conditions: member.conditions.filter((c) => c !== condition) });
}

export function addMemberItem(id: string, input: Omit<Item, 'id'>): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { items: addItem(member.items, input) });
}

export function removeMemberItem(id: string, itemId: string): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { items: removeItem(member.items, itemId) });
}

export function updateMemberItem(id: string, itemId: string, patch: Partial<Omit<Item, 'id'>>): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { items: updateItem(member.items, itemId, patch) });
}

export function tickMemberItemCharge(id: string, itemId: string): void {
  const member = list.items.find((m) => m.id === id);
  if (!member) return;
  list.update(id, { items: tickCharge(member.items, itemId) });
}

export interface CommunityXpResult {
  xpGained: number;
  totalXp: number;
  leveledUp: boolean;
  newLevel: number;
}

/**
 * Awards the SRD's bonus XP for pips spent selflessly on community
 * improvements (1 XP per 10 pips). Not the treasure-recovery XP.
 */
export function spendForCommunity(id: string, pipsSpent: number): CommunityXpResult | null {
  const member = list.items.find((m) => m.id === id);
  if (!member) return null;
  // Snapshot the previous level before `list.update` mutates the same
  // reactive object `member` points to — reading `member.level` again after
  // that call would see the *new* value, not the one we're comparing against.
  const previousLevel = member.level;
  const xpGained = Math.round(Math.max(0, pipsSpent) * COMMUNITY_XP_PER_PIP);
  const totalXp = member.xp + xpGained;
  const newLevel = Math.max(previousLevel, levelForXp(totalXp));
  list.update(id, { xp: totalXp, level: newLevel });
  return { xpGained, totalXp, leveledUp: newLevel > previousLevel, newLevel };
}
