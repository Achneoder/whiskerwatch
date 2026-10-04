import { rollDice } from './roll';

/**
 * Mausritter's reaction roll: a flat 2d6, NOT a roll-under save against any
 * score. The total is mapped to one of five SRD reaction bands the GM reads
 * straight off the table — there's no pass/fail here, just a band and the
 * guidance sentence that goes with it. Deliberately its own shape (not
 * `MoraleSaveResult`) since there's no score input and no notion of passing.
 */
export type ReactionBand = 'hostile' | 'unfriendly' | 'unsure' | 'talkative' | 'helpful';

export interface ReactionRollResult {
  dice: [number, number];
  total: number;
  band: ReactionBand;
  guidance: string;
}

/** SRD reaction prompt for each band (the GM's question to answer), keyed by band name. */
export const REACTION_GUIDANCE: Record<ReactionBand, string> = {
  hostile: 'How have the mice angered them?',
  unfriendly: 'How can they be appeased?',
  unsure: 'What could win them over?',
  talkative: 'What could they trade?',
  helpful: 'How can they help the mice?',
};

/** 2d6 total → SRD reaction band. */
export function bandForTotal(total: number): ReactionBand {
  if (total <= 2) return 'hostile';
  if (total <= 5) return 'unfriendly';
  if (total <= 8) return 'unsure';
  if (total <= 11) return 'talkative';
  return 'helpful';
}

export function rollReaction(): ReactionRollResult {
  const { dice, total } = rollDice(2, 6);
  const band = bandForTotal(total);
  return { dice: [dice[0]!, dice[1]!], total, band, guidance: REACTION_GUIDANCE[band] };
}
