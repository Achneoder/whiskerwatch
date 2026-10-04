import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getAdventures,
  addAdventure,
  updateAdventure,
  removeAdventure,
  replaceAdventures,
  watchStateOf,
  advanceAdventureWatch,
} from './adventures.svelte';

function mockD6(result: number) {
  vi.spyOn(Math, 'random').mockReturnValue((result - 1) / 6 + 0.0001);
}

describe('adventures store', () => {
  beforeEach(() => {
    replaceAdventures([]);
  });

  it('adds an adventure', () => {
    addAdventure({ title: 'The granary raid', description: 'Tunnels under the granary.', status: 'active' });

    expect(getAdventures()).toHaveLength(1);
    expect(getAdventures()[0]?.title).toBe('The granary raid');
    expect(getAdventures()[0]?.status).toBe('active');
  });

  it('updates an adventure', () => {
    addAdventure({ title: 'The granary raid', description: '', status: 'planned' });
    const id = getAdventures()[0]!.id;

    updateAdventure(id, { status: 'completed', title: 'The granary raid (resolved)' });

    expect(getAdventures()[0]?.status).toBe('completed');
    expect(getAdventures()[0]?.title).toBe('The granary raid (resolved)');
  });

  it('removes an adventure', () => {
    addAdventure({ title: 'The granary raid', description: '', status: 'planned' });
    const id = getAdventures()[0]!.id;

    removeAdventure(id);

    expect(getAdventures()).toHaveLength(0);
  });

  it('replaces the whole list', () => {
    addAdventure({ title: 'A', description: '', status: 'planned' });
    addAdventure({ title: 'B', description: '', status: 'planned' });

    replaceAdventures([{ id: 'x', title: 'Replacement', description: '', status: 'active' }]);

    expect(getAdventures()).toHaveLength(1);
    expect(getAdventures()[0]?.title).toBe('Replacement');
  });

  describe('watchStateOf', () => {
    it('defaults a legacy record with no hex-crawl fields to day 1, watch 1, not rested', () => {
      expect(watchStateOf({ id: 'a', title: '', description: '', status: 'active' })).toEqual({
        day: 1,
        watch: 1,
        restedThisDay: false,
      });
    });

    it('degrades a corrupted/out-of-range watch to a fresh day-1/watch-1 state', () => {
      expect(
        watchStateOf({ id: 'a', title: '', description: '', status: 'active', day: 0, watch: 7 as never }),
      ).toEqual({ day: 1, watch: 1, restedThisDay: false });
    });

    it('reads through a valid, fully-populated record', () => {
      expect(
        watchStateOf({ id: 'a', title: '', description: '', status: 'active', day: 3, watch: 2, restedThisDay: true }),
      ).toEqual({ day: 3, watch: 2, restedThisDay: true });
    });
  });

  describe('advanceAdventureWatch', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns null for an unknown adventure id', () => {
      expect(advanceAdventureWatch('missing')).toBeNull();
    });

    it('advances exactly one watch with no check on a non-check watch', () => {
      replaceAdventures([{ id: 'a1', title: 'A', description: '', status: 'active', day: 2, watch: 2 }]);

      const result = advanceAdventureWatch('a1');

      expect(result).toMatchObject({ day: 2, watch: 3, checkRolled: false, checkHit: false, crossedIntoNewDay: false });
      expect(getAdventures()[0]).toMatchObject({ day: 2, watch: 3 });
    });

    it('rolls an encounter check (and reports a hit) on a check watch', () => {
      replaceAdventures([{ id: 'a1', title: 'A', description: '', status: 'active', day: 2, watch: 3 }]);
      mockD6(1); // a roll of 1 is a hit

      const result = advanceAdventureWatch('a1');

      expect(result).toMatchObject({ day: 2, watch: 4, checkRolled: true, checkRoll: 1, checkHit: true });
    });

    it('rolls an encounter check with no hit on a roll of 2-6', () => {
      replaceAdventures([{ id: 'a1', title: 'A', description: '', status: 'active', day: 2, watch: 1 }]);
      mockD6(4);

      const result = advanceAdventureWatch('a1');

      expect(result).toMatchObject({ checkRolled: true, checkRoll: 4, checkHit: false });
    });

    it('wraps into a new day and resets restedThisDay once rested', () => {
      replaceAdventures([
        { id: 'a1', title: 'A', description: '', status: 'active', day: 2, watch: 4, restedThisDay: true },
      ]);

      const result = advanceAdventureWatch('a1');

      expect(result).toMatchObject({ day: 3, watch: 1, crossedIntoNewDay: true, exhaustedPending: false });
      expect(getAdventures()[0]?.restedThisDay).toBe(false);
    });

    it('flags exhaustedPending when a new day begins after a day with no rest watch', () => {
      replaceAdventures([
        { id: 'a1', title: 'A', description: '', status: 'active', day: 2, watch: 4, restedThisDay: false },
      ]);

      const result = advanceAdventureWatch('a1');

      expect(result).toMatchObject({ crossedIntoNewDay: true, exhaustedPending: true });
    });

    it('marks the day rested (and never exhausted) when the crossing tap is itself a Stay put', () => {
      replaceAdventures([
        { id: 'a1', title: 'A', description: '', status: 'active', day: 2, watch: 4, restedThisDay: false },
      ]);

      const result = advanceAdventureWatch('a1', { stay: true });

      expect(result).toMatchObject({ crossedIntoNewDay: true, exhaustedPending: false });
    });

    it('costs 2 watches and sets currentHexId when moving into difficult terrain', () => {
      replaceAdventures([{ id: 'a1', title: 'A', description: '', status: 'active', day: 1, watch: 2 }]);

      const result = advanceAdventureWatch('a1', { move: { hexId: 'forest1', terrain: 'forest' } });

      expect(result).toMatchObject({ day: 1, watch: 4 });
      expect(getAdventures()[0]?.currentHexId).toBe('forest1');
    });

    it('rolls only one encounter check across a 2-watch difficult-terrain move', () => {
      // Watch 1 is a check watch; the move consumes watch 1 then watch 2 — only one check.
      replaceAdventures([{ id: 'a1', title: 'A', description: '', status: 'active', day: 1, watch: 1 }]);
      mockD6(6);

      const result = advanceAdventureWatch('a1', { move: { hexId: 'forest1', terrain: 'forest' } });

      expect(result).toMatchObject({ day: 1, watch: 3, checkRolled: true, checkRoll: 6, checkHit: false });
    });

    it('does not move into water, but still advances the watch', () => {
      replaceAdventures([
        { id: 'a1', title: 'A', description: '', status: 'active', day: 1, watch: 2, currentHexId: 'start' },
      ]);

      const result = advanceAdventureWatch('a1', { move: { hexId: 'water1', terrain: 'water' } });

      expect(result).toMatchObject({ day: 1, watch: 3 });
      expect(getAdventures()[0]?.currentHexId).toBe('start');
    });

    it('treats a plain advance (no move) with no currentHexId change, when the caller omits an unresolvable destination', () => {
      // Mirrors `LiveSession.svelte`'s `handleMove`: an unresolvable hex id
      // (deleted between render and tap) means the caller simply doesn't
      // pass `move` at all — this function has no way to resolve a hex id
      // to terrain itself (see its doc comment).
      replaceAdventures([{ id: 'a1', title: 'A', description: '', status: 'active', day: 1, watch: 2 }]);

      const result = advanceAdventureWatch('a1', {});

      expect(result).toMatchObject({ day: 1, watch: 3 });
      expect(getAdventures()[0]?.currentHexId).toBeUndefined();
    });
  });
});
