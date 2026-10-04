import { createPersistedList } from './persistedList.svelte';
import { migrateConditions, type ConditionName, type Scar } from '../conditions';
import { applyDamage, type DamageOutcome } from '../combat';
import { addItem, removeItem, updateItem, tickCharge, type Item } from '../items';

export interface Hireling {
  id: string;
  name: string;
  role: string;
  hp: number;
  max: number;
  /** Current STR score. Drained by damage overflow once HP hits 0, exactly like a player mouse. */
  str: number;
  maxStr: number;
  /** Static DEX score — no "current vs max" distinction. */
  dex: number;
  /** Static WIL score — no "current vs max" distinction. */
  wil: number;
  /** Especially well-paid or loyal (SRD): morale saves roll with Advantage. */
  loyal: boolean;
  /** Plain GM-entered pips/day — no formula/auto-population from role. */
  wage: number;
  notes: string;
  status: 'active' | 'deceased';
  conditions: ConditionName[];
  /** Permanent Fatal Wounds outcomes — separate from `conditions`, never auto-cleared. */
  scars: Scar[];
  /** Flat inventory list — checked against `HIRELING_LAYOUT`'s 6 slots (see `items.ts`). */
  items: Item[];
}

const STORAGE_KEY = 'whiskerwatch:hirelings';

const seedHirelings: Hireling[] = [
  {
    id: crypto.randomUUID(),
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
    notes: 'Carries the spare rope and two rations. Paid 5p/day.',
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
 * Fills sane defaults for fields a pre-Phase-7 record won't have (hirelings
 * had no attributes, status, scars, or conditions at all before this) and
 * migrates any legacy free-text conditions, so an old record degrades
 * gracefully instead of shipping `undefined` fields into the UI.
 */
function normalizeHireling(raw: unknown): Hireling {
  const r = (raw ?? {}) as Partial<Hireling> & Record<string, unknown>;
  const maxStr = typeof r.maxStr === 'number' ? r.maxStr : 10;
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : crypto.randomUUID(),
    name: typeof r.name === 'string' ? r.name : 'Unnamed',
    role: typeof r.role === 'string' ? r.role : '',
    hp: typeof r.hp === 'number' ? r.hp : 3,
    max: typeof r.max === 'number' ? r.max : 3,
    str: typeof r.str === 'number' ? r.str : maxStr,
    maxStr,
    dex: typeof r.dex === 'number' ? r.dex : 10,
    wil: typeof r.wil === 'number' ? r.wil : 10,
    // Pre-SRD-fix records carried a 2d6 `loyalty` score instead; it has no
    // SRD equivalent, so it's dropped rather than mapped.
    loyal: r.loyal === true,
    wage: typeof r.wage === 'number' ? r.wage : 0,
    notes: typeof r.notes === 'string' ? r.notes : '',
    status: r.status === 'deceased' ? 'deceased' : 'active',
    conditions: migrateConditions(r.conditions),
    scars: Array.isArray(r.scars) ? r.scars.filter(isScar) : [],
    items: Array.isArray(r.items) ? r.items.filter(isItem) : [],
  };
}

const list = createPersistedList<Hireling>(STORAGE_KEY, seedHirelings);

export function getHirelings(): Hireling[] {
  return list.items;
}

/** Returns the generated id so callers (e.g. "save generated NPC") can offer an undo. */
export function addHireling(input: Omit<Hireling, 'id'>): string {
  const id = crypto.randomUUID();
  list.add({ ...input, id });
  return id;
}

export function updateHireling(id: string, patch: Partial<Omit<Hireling, 'id'>>): void {
  list.update(id, patch);
}

export function removeHireling(id: string): void {
  list.remove(id);
}

export function replaceHirelings(hirelings: Hireling[]): void {
  // See the equivalent note in party.svelte.ts's replaceParty — a record
  // coming from localStorage or a campaign-export file may not actually
  // match `Hireling` at runtime, so we re-validate instead of trusting the
  // static annotation.
  list.replaceAll((hirelings as unknown[]).map(normalizeHireling));
}

/**
 * Resolves once this store's data has been hydrated from IndexedDB (see
 * `persistedList.svelte.ts`) *and* normalized (see `normalizeHireling` above)
 * so old-shape records never leak undefined fields into the app. App boot
 * awaits this (alongside every other store) before mounting `App.svelte`.
 */
export const ready: Promise<void> = list.ready.then(() => {
  // Skip the write entirely when normalization is a no-op (the overwhelmingly
  // common case) — an unconditional `replaceHirelings` here would mean every
  // single app boot pays for a second full IndexedDB round-trip on top of
  // hydration's own, for no actual change.
  const normalized = (list.items as unknown[]).map(normalizeHireling);
  if (JSON.stringify(normalized) !== JSON.stringify(list.items)) {
    list.replaceAll(normalized);
  }
});

/** See `PersistedList.flush` — awaited by `campaignExport.ts` after `replaceHirelings` to guarantee an import is durably saved. */
export const flush: () => Promise<void> = () => list.flush();

export function healHirelingHp(id: string, amount: number): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { hp: Math.max(0, Math.min(hireling.max, hireling.hp + Math.max(0, amount))) });
}

/**
 * Applies damage using Mausritter's HP-then-STR overflow — identical rule
 * to `dealDamage` in party.svelte.ts (hirelings have HP and can die exactly
 * like player mice). See `combat.ts` for the shared arithmetic.
 */
export function dealHirelingDamage(id: string, amount: number): DamageOutcome | null {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return null;
  const outcome = applyDamage({ hp: hireling.hp, str: hireling.str }, amount);
  list.update(id, { hp: outcome.newHp, str: outcome.newStr });
  return outcome;
}

export function killHireling(id: string): void {
  list.update(id, { status: 'deceased' });
}

export function addHirelingScar(id: string, scar: Scar): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { scars: [...hireling.scars, scar] });
}

export function addHirelingCondition(id: string, condition: ConditionName): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling || hireling.conditions.includes(condition)) return;
  list.update(id, { conditions: [...hireling.conditions, condition] });
}

export function removeHirelingCondition(id: string, condition: ConditionName): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { conditions: hireling.conditions.filter((c) => c !== condition) });
}

export function addHirelingItem(id: string, input: Omit<Item, 'id'>): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { items: addItem(hireling.items, input) });
}

export function removeHirelingItem(id: string, itemId: string): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { items: removeItem(hireling.items, itemId) });
}

export function updateHirelingItem(id: string, itemId: string, patch: Partial<Omit<Item, 'id'>>): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { items: updateItem(hireling.items, itemId, patch) });
}

export function tickHirelingItemCharge(id: string, itemId: string): void {
  const hireling = list.items.find((h) => h.id === id);
  if (!hireling) return;
  list.update(id, { items: tickCharge(hireling.items, itemId) });
}
