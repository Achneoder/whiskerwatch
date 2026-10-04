import { describe, expect, it, vi, afterEach } from 'vitest';
import { rollReaction, bandForTotal, REACTION_GUIDANCE } from './reaction';

/**
 * `rollReaction` rolls via `rollDice(2, 6)`, which draws two independent
 * `1 + Math.floor(Math.random() * 6)` values. Queue two mocked `Math.random`
 * results (one per die) to land on a specific 2d6 pair deterministically —
 * same pattern as the dice mocks in `save.test.ts`.
 */
function mockD6Pair(d1: number, d2: number) {
  const spy = vi.spyOn(Math, 'random');
  spy.mockReturnValueOnce((d1 - 1) / 6 + 0.0001);
  spy.mockReturnValueOnce((d2 - 1) / 6 + 0.0001);
}

describe('bandForTotal', () => {
  it('maps 2 to hostile', () => {
    expect(bandForTotal(2)).toBe('hostile');
  });

  it.each([3, 4, 5])('maps %i to unfriendly', (total) => {
    expect(bandForTotal(total)).toBe('unfriendly');
  });

  it.each([6, 7, 8])('maps %i to unsure', (total) => {
    expect(bandForTotal(total)).toBe('unsure');
  });

  it.each([9, 10, 11])('maps %i to talkative', (total) => {
    expect(bandForTotal(total)).toBe('talkative');
  });

  it('maps 12 to helpful', () => {
    expect(bandForTotal(12)).toBe('helpful');
  });
});

describe('rollReaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sums dice correctly and reports hostile on a 2', () => {
    mockD6Pair(1, 1);
    const result = rollReaction();

    expect(result).toEqual({
      dice: [1, 1],
      total: 2,
      band: 'hostile',
      guidance: REACTION_GUIDANCE.hostile,
    });
  });

  it('sums dice correctly and reports unfriendly on a 4', () => {
    mockD6Pair(1, 3);
    const result = rollReaction();

    expect(result.total).toBe(4);
    expect(result.band).toBe('unfriendly');
    expect(result.guidance).toBe(REACTION_GUIDANCE.unfriendly);
  });

  it('sums dice correctly and reports unsure on a 7', () => {
    mockD6Pair(3, 4);
    const result = rollReaction();

    expect(result.total).toBe(7);
    expect(result.band).toBe('unsure');
  });

  it('sums dice correctly and reports talkative on a 10', () => {
    mockD6Pair(5, 5);
    const result = rollReaction();

    expect(result.total).toBe(10);
    expect(result.band).toBe('talkative');
  });

  it('sums dice correctly and reports helpful on a 12', () => {
    mockD6Pair(6, 6);
    const result = rollReaction();

    expect(result).toEqual({
      dice: [6, 6],
      total: 12,
      band: 'helpful',
      guidance: REACTION_GUIDANCE.helpful,
    });
  });
});
