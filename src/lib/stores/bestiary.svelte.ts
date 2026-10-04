import { createPersistedList } from './persistedList.svelte';
import { removeBestiaryEntryFromHexNodes } from './hexmap.svelte';
import { DEMO_BESTIARY } from '../demoCampaign';

export type BestiaryCategory = 'Vermin' | 'Beast' | 'Bird of Prey' | 'Humanoid' | 'Aberration';

export interface BestiaryAttack {
  name: string;
  damage: string;
}

export interface BestiaryEntry {
  id: string;
  name: string;
  category: BestiaryCategory;
  hd: number;
  hp: number;
  armor: number;
  attacks: BestiaryAttack[];
  special: string;
  notes: string;
}

const STORAGE_KEY = 'whiskerwatch:bestiary';

const seedBestiary: BestiaryEntry[] = [
  {
    id: crypto.randomUUID(),
    ...DEMO_BESTIARY[0]!.en,
    category: 'Vermin',
    hd: 2,
    hp: 4,
    armor: 1,
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_BESTIARY[1]!.en,
    category: 'Beast',
    hd: 3,
    hp: 6,
    armor: 0,
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_BESTIARY[2]!.en,
    category: 'Vermin',
    hd: 4,
    hp: 8,
    armor: 2,
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_BESTIARY[3]!.en,
    category: 'Bird of Prey',
    hd: 3,
    hp: 6,
    armor: 0,
  },
  {
    id: crypto.randomUUID(),
    ...DEMO_BESTIARY[4]!.en,
    category: 'Aberration',
    hd: 5,
    hp: 10,
    armor: 1,
  },
];

const list = createPersistedList<BestiaryEntry>(STORAGE_KEY, seedBestiary);

/** Resolves once this store's data has been hydrated from IndexedDB. App boot awaits this (alongside every other store) before mounting `App.svelte`. */
export const ready: Promise<void> = list.ready;

/** See `PersistedList.flush` — awaited by `campaignExport.ts` after `replaceBestiary` to guarantee an import is durably saved. */
export const flush: () => Promise<void> = () => list.flush();

export function getBestiary(): BestiaryEntry[] {
  return list.items;
}

/** Returns the generated id so callers (e.g. "save generated NPC") can offer an undo. */
export function addBestiaryEntry(input: Omit<BestiaryEntry, 'id'>): string {
  const id = crypto.randomUUID();
  list.add({ ...input, id });
  return id;
}

export function updateBestiaryEntry(id: string, patch: Partial<Omit<BestiaryEntry, 'id'>>): void {
  list.update(id, patch);
}

/** Removes a bestiary entry and cascades to any hex encounter lists that referenced it. */
export function removeBestiaryEntry(id: string): void {
  list.remove(id);
  removeBestiaryEntryFromHexNodes(id);
}

export function replaceBestiary(entries: BestiaryEntry[]): void {
  list.replaceAll(entries);
}
