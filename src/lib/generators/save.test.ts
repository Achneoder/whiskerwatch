import { describe, expect, it, vi, afterEach } from 'vitest';
import { rollSave, rollMoraleSave } from './save';

/**
 * `rollSave` rolls via `rollDice(1, 20)`, which computes
 * `1 + Math.floor(Math.random() * 20)`. Mock `Math.random` to land on a
 * specific d20 result so the pass/fail boundary can be tested deterministically.
 */
function mockD20Roll(result: number) {
  const random = (result - 1) / 20 + 0.0001;
  vi.spyOn(Math, 'random').mockReturnValue(random);
}

describe('rollSave', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes when the roll is under the score', () => {
    mockD20Roll(5);
    const result = rollSave(10);

    expect(result).toEqual({ roll: 5, score: 10, passed: true });
  });

  it('passes when the roll exactly equals the score (roll-under is inclusive)', () => {
    mockD20Roll(10);
    const result = rollSave(10);

    expect(result).toEqual({ roll: 10, score: 10, passed: true });
  });

  it('fails when the roll is over the score', () => {
    mockD20Roll(11);
    const result = rollSave(10);

    expect(result).toEqual({ roll: 11, score: 10, passed: false });
  });

  it('always passes when the score is at or above the maximum d20 result', () => {
    mockD20Roll(20);
    const result = rollSave(20);

    expect(result.passed).toBe(true);
  });

  it('always fails when the score is 0', () => {
    mockD20Roll(1);
    const result = rollSave(0);

    expect(result.passed).toBe(false);
  });
});

/** Queue specific d20 results for successive `rollDice` draws. */
function mockD20Sequence(...results: number[]) {
  const spy = vi.spyOn(Math, 'random');
  for (const r of results) spy.mockReturnValueOnce((r - 1) / 20 + 0.0001);
}

describe('rollMoraleSave', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rolls a single d20 against WIL without Advantage', () => {
    mockD20Sequence(7);
    expect(rollMoraleSave(7, false)).toEqual({ dice: [7], roll: 7, score: 7, advantage: false, passed: true });
  });

  it('fails when the d20 is over WIL', () => {
    mockD20Sequence(12);
    expect(rollMoraleSave(7, false).passed).toBe(false);
  });

  it('rolls 2d20 and keeps the lowest with Advantage', () => {
    mockD20Sequence(15, 4);
    expect(rollMoraleSave(7, true)).toEqual({ dice: [15, 4], roll: 4, score: 7, advantage: true, passed: true });
  });
});
