import { createPersistedList } from './persistedList.svelte';
import { advanceOneWatch, isEncounterCheckWatch, isPassableOnFoot, travelCost, type Watch } from '../watchTime';
// Type-only — `hexmap.svelte.ts` itself imports `beats.svelte.ts`, which
// imports this module, so a *runtime* import here (e.g. `getHexNodes`) would
// create a genuine circular module dependency that breaks at load time
// (`list` used before its own initializer runs). `import type` is erased at
// build time, so it carries no runtime edge — `advanceAdventureWatch` takes
// the destination's already-resolved terrain from its caller instead of
// looking the hex up itself.
import type { HexTerrain } from './hexmap.svelte';
import { rollDice } from '../generators/roll';

export type AdventureStatus = 'planned' | 'active' | 'completed';

export interface Adventure {
  id: string;
  title: string;
  description: string;
  status: AdventureStatus;
  /** Phase 15 hex-crawl turn fields — all optional so every existing stored
   * Adventure (including ones from before this phase) reads back with sane
   * defaults rather than crashing on a missing field. 1-based; defaults to 1. */
  day?: number;
  /** Which watch of `day` the party is currently in; defaults to 1. */
  watch?: Watch;
  /** True once any watch this day was a "Stay put" watch; reset to false at each new day. */
  restedThisDay?: boolean;
  /** The hex the party currently occupies, or null if never placed. */
  currentHexId?: string | null;
}

/**
 * Defensive read of an adventure's hex-crawl turn fields — a corrupted or
 * missing `day`/`watch` degrades to "start of a fresh day" rather than
 * crashing, per `CLAUDE.md`'s storage-resilience rule. `currentHexId` is
 * passed through as-is (null/undefined both mean "not placed yet";
 * `advanceAdventureWatch`/callers treat them the same way).
 */
export function watchStateOf(adventure: Adventure): { day: number; watch: Watch; restedThisDay: boolean } {
  const day = typeof adventure.day === 'number' && Number.isFinite(adventure.day) && adventure.day >= 1 ? adventure.day : 1;
  const watch: Watch = adventure.watch === 1 || adventure.watch === 2 || adventure.watch === 3 || adventure.watch === 4 ? adventure.watch : 1;
  const restedThisDay = adventure.restedThisDay === true;
  return { day, watch, restedThisDay };
}

const STORAGE_KEY = 'whiskerwatch:adventures';

/**
 * Deliberately no seed data here: unlike every other store, an `Adventure`
 * used to be implicit (the app's one root `Beat`). Rather than seeding this
 * list independently — which would create a duplicate "The granary raid"
 * adventure for every GM already carrying that seed beat forward from before
 * this feature existed — the very first Adventure is *derived* by
 * `migrateLegacyBeatsToAdventures` (see `beats.svelte.ts`) from whatever root
 * beat is already on record, including the one baked into `beats.svelte.ts`'s
 * own seed data for a genuinely fresh install. See that function's doc
 * comment for the full algorithm.
 */
const seedAdventures: Adventure[] = [];

const list = createPersistedList<Adventure>(STORAGE_KEY, seedAdventures);

/** Resolves once this store's data has been hydrated from IndexedDB. App boot awaits this (alongside every other store) before mounting `App.svelte`. */
export const ready: Promise<void> = list.ready;

/** See `PersistedList.flush` — awaited by `campaignExport.ts` after `replaceAdventures` to guarantee an import is durably saved. */
export const flush: () => Promise<void> = () => list.flush();

export function getAdventures(): Adventure[] {
  return list.items;
}

export function addAdventure(input: Omit<Adventure, 'id'>): void {
  list.add({ ...input, id: crypto.randomUUID() });
}

export function updateAdventure(id: string, patch: Partial<Omit<Adventure, 'id'>>): void {
  list.update(id, patch);
}

export function removeAdventure(id: string): void {
  list.remove(id);
}

export function replaceAdventures(adventures: Adventure[]): void {
  list.replaceAll(adventures);
}

export interface AdvanceWatchResult {
  day: number;
  watch: Watch;
  /** Whether an SRD encounter check was rolled as part of this tap. */
  checkRolled: boolean;
  /** The raw d6 result of the check, or `null` if no check was rolled. */
  checkRoll: number | null;
  /** SRD: a roll of 1 is a hit. Always `false` when `checkRolled` is `false`. */
  checkHit: boolean;
  /** True the moment `watch` wraps 4 → 1 during this advance. */
  crossedIntoNewDay: boolean;
  /** True when a new day just began and the day that just ended never saw a "Stay put" watch — surfaces the Exhausted banner. */
  exhaustedPending: boolean;
}

/**
 * Advances one adventure's hex-crawl clock by one tap of the Watch card —
 * "stays put," "forages," or "moves to an adjacent hex" all funnel through
 * here, differing only in `opts`. Composes `advanceOneWatch`/`travelCost`/
 * `isEncounterCheckWatch` from `watchTime.ts` into one atomic store mutation
 * (day/watch/restedThisDay/currentHexId all update together) so a GM's tap
 * is never split across two separate mutations they could interrupt between.
 *
 * `opts.move` costs 1 or 2 watches depending on the destination hex's
 * terrain (2 for forest/hills, resolved by the caller — see the `HexTerrain`
 * import note above); a non-passable (water) destination is defensively
 * treated as "no move" — the position doesn't change, but the watch still
 * advances once, matching a plain "stay"/"forage" tap. An unresolvable hex
 * id (no matching `HexNode`) is the caller's responsibility to guard against
 * by simply omitting `opts.move` — this function has no way to resolve a
 * hex id to terrain itself. `opts.stay` marks the day just walked through
 * as rested (see `restedThisDay`'s doc comment); neither `stay` nor the
 * resolved-terrain shape of `move` is part of the `{ move?: string }` shown
 * in the design spec's TypeScript sketch, but folding both in here — rather
 * than a second `updateAdventure` call from `LiveSession.svelte`, or a
 * store-to-store dependency on `hexmap.svelte.ts` — keeps this one atomic
 * mutation and avoids a circular module dependency (`adventures` →
 * `hexmap` → `beats` → `adventures`) that broke at load time when tried.
 *
 * A 2-watch move can span at most one SRD check-watch (watches 1/3 are
 * always exactly one apart from any 2 consecutive watches), so only one
 * check is ever rolled per tap regardless of terrain cost — "one encounter
 * is enough table-time for one tap."
 */
export function advanceAdventureWatch(
  id: string,
  opts: { move?: { hexId: string; terrain: HexTerrain }; stay?: boolean } = {},
): AdvanceWatchResult | null {
  const adventure = list.items.find((a) => a.id === id);
  if (!adventure) return null;

  const { day: startDay, watch: startWatch, restedThisDay } = watchStateOf(adventure);

  let cost: 1 | 2 = 1;
  let destinationHexId: string | undefined;
  if (opts.move && isPassableOnFoot(opts.move.terrain)) {
    cost = travelCost(opts.move.terrain);
    destinationHexId = opts.move.hexId;
  }

  let day = startDay;
  let watch = startWatch;
  let checkRolled = false;
  let checkRoll: number | null = null;
  let checkHit = false;
  let crossedIntoNewDay = false;

  for (let step = 0; step < cost; step += 1) {
    if (!checkRolled && isEncounterCheckWatch(watch)) {
      checkRolled = true;
      checkRoll = rollDice(1, 6).total;
      checkHit = checkRoll === 1;
    }
    const advanced = advanceOneWatch(day, watch);
    day = advanced.day;
    watch = advanced.watch;
    if (advanced.crossedIntoNewDay) crossedIntoNewDay = true;
  }

  // "The party rested" is recorded against the day that's ending, before it
  // resets for the fresh one — see `exhaustedPending`'s doc comment above.
  const restedBeforeCross = opts.stay ? true : restedThisDay;
  const exhaustedPending = crossedIntoNewDay && !restedBeforeCross;
  const nextRestedThisDay = crossedIntoNewDay ? false : restedBeforeCross;

  list.update(id, {
    day,
    watch,
    restedThisDay: nextRestedThisDay,
    ...(destinationHexId ? { currentHexId: destinationHexId } : {}),
  });

  return { day, watch, checkRolled, checkRoll, checkHit, crossedIntoNewDay, exhaustedPending };
}
