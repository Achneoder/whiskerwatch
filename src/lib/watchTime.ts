/**
 * Pure Mausritter hex-crawl turn math — watches, day-boundary wrapping,
 * travel cost, and passability. Mirrors `lib/hex.ts`/`lib/combat.ts`'s
 * existing style: pure functions, no rune state, fully unit-testable in
 * isolation from any store or component. See
 * `docs/design/phase-15-watch-tracker-and-position.md` for the SRD rules
 * this encodes.
 */
import type { HexTerrain } from './stores/hexmap.svelte';

export const WATCH_LABELS = ['Morning', 'Midday', 'Evening', 'Night'] as const;

export type Watch = 1 | 2 | 3 | 4;

/** SRD: the encounter check happens only at the watch that *starts* Morning
 * (watch 1) and the watch that *starts* Evening (watch 3) — not every watch. */
export function isEncounterCheckWatch(watch: Watch): boolean {
  return watch === 1 || watch === 3;
}

export interface AdvancedTime {
  day: number;
  watch: Watch;
  /** true the moment `watch` wraps 4 → 1, i.e. a new day has begun. */
  crossedIntoNewDay: boolean;
}

/** Advances exactly one watch, wrapping the day boundary. */
export function advanceOneWatch(day: number, watch: Watch): AdvancedTime {
  if (watch === 4) return { day: day + 1, watch: 1, crossedIntoNewDay: true };
  return { day, watch: (watch + 1) as Watch, crossedIntoNewDay: false };
}

/** SRD: 1 hex per watch on foot, 2 watches for difficult terrain
 * (forest/hills — physically obstructed ground). Ruins are a
 * point-of-interest type, not difficult ground, so they cost 1 watch like
 * everything else non-obstructed. Water is not a valid move destination on
 * foot at all (see `isPassableOnFoot` below) — this function is never
 * called for it. */
export function travelCost(terrain: HexTerrain): 1 | 2 {
  return terrain === 'forest' || terrain === 'hills' ? 2 : 1;
}

/** SRD: no boat mechanic is modeled, so water hexes can't be moved into on
 * foot — the same "don't invent a rule that isn't there" restraint the
 * roadmap already applies to getting-lost. */
export function isPassableOnFoot(terrain: HexTerrain): boolean {
  return terrain !== 'water';
}
