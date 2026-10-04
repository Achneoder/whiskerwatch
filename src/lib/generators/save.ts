import { rollDice } from './roll';

/**
 * Mausritter's core save mechanic: roll a single d20 and succeed if the
 * result is at or under the target attribute score (STR/DEX/WIL — the GM
 * picks which, based on the fictional situation). Plain pass/fail — there's
 * no crit/fumble rule on a natural 1 or 20 in core Mausritter. Rolling
 * exactly the score is a pass (roll-under is inclusive of the score).
 *
 * Deliberately generic on `score` rather than "STR save" specifically, so it
 * lives here rather than embedded in a component. Hireling morale saves are
 * WIL saves too, but may roll with Advantage — see `rollMoraleSave` below.
 */
export interface SaveResult {
  roll: number;
  score: number;
  passed: boolean;
}

export function rollSave(score: number): SaveResult {
  const { dice } = rollDice(1, 20);
  const roll = dice[0]!;
  return { roll, score, passed: roll <= score };
}

/**
 * Mausritter's hireling morale save (SRD "Hireling morale"): a plain d20 WIL
 * save — succeed at or under the hireling's WIL, or they flee. Especially
 * well-paid or loyal hirelings roll with Advantage: 2d20, keep the lowest.
 * Carries every die rolled so `DiceRoll` can show both faces on Advantage.
 */
export interface MoraleSaveResult {
  dice: number[];
  roll: number;
  score: number;
  advantage: boolean;
  passed: boolean;
}

export function rollMoraleSave(wil: number, advantage: boolean): MoraleSaveResult {
  const { dice } = rollDice(advantage ? 2 : 1, 20);
  const roll = Math.min(...dice);
  return { dice, roll, score: wil, advantage, passed: roll <= wil };
}
