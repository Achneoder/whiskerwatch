import { describe, expect, it } from 'vitest';
import { WATCH_LABELS, isEncounterCheckWatch, advanceOneWatch, travelCost, isPassableOnFoot } from './watchTime';

describe('watchTime', () => {
  it('has the four watch labels in order', () => {
    expect(WATCH_LABELS).toEqual(['Morning', 'Midday', 'Evening', 'Night']);
  });

  describe('isEncounterCheckWatch', () => {
    it('is true for watch 1 (starts Morning) and watch 3 (starts Evening)', () => {
      expect(isEncounterCheckWatch(1)).toBe(true);
      expect(isEncounterCheckWatch(3)).toBe(true);
    });

    it('is false for watch 2 and watch 4', () => {
      expect(isEncounterCheckWatch(2)).toBe(false);
      expect(isEncounterCheckWatch(4)).toBe(false);
    });
  });

  describe('advanceOneWatch', () => {
    it('advances within the same day for watches 1-3', () => {
      expect(advanceOneWatch(2, 1)).toEqual({ day: 2, watch: 2, crossedIntoNewDay: false });
      expect(advanceOneWatch(2, 2)).toEqual({ day: 2, watch: 3, crossedIntoNewDay: false });
      expect(advanceOneWatch(2, 3)).toEqual({ day: 2, watch: 4, crossedIntoNewDay: false });
    });

    it('wraps into the next day when advancing from watch 4', () => {
      expect(advanceOneWatch(2, 4)).toEqual({ day: 3, watch: 1, crossedIntoNewDay: true });
    });
  });

  describe('travelCost', () => {
    it('costs 2 watches for forest and hills (difficult terrain)', () => {
      expect(travelCost('forest')).toBe(2);
      expect(travelCost('hills')).toBe(2);
    });

    it('costs 1 watch for meadow, hedgerow, settlement, and ruins', () => {
      expect(travelCost('meadow')).toBe(1);
      expect(travelCost('hedgerow')).toBe(1);
      expect(travelCost('settlement')).toBe(1);
      expect(travelCost('ruins')).toBe(1);
    });

    it('costs 1 watch for water even though it is never a valid move destination', () => {
      expect(travelCost('water')).toBe(1);
    });
  });

  describe('isPassableOnFoot', () => {
    it('is false only for water', () => {
      expect(isPassableOnFoot('water')).toBe(false);
      expect(isPassableOnFoot('meadow')).toBe(true);
      expect(isPassableOnFoot('forest')).toBe(true);
      expect(isPassableOnFoot('hills')).toBe(true);
      expect(isPassableOnFoot('ruins')).toBe(true);
      expect(isPassableOnFoot('settlement')).toBe(true);
      expect(isPassableOnFoot('hedgerow')).toBe(true);
    });
  });
});
