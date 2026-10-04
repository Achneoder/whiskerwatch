/**
 * Mausritter's fixed condition vocabulary, shared between `PartyMember` and
 * `Hireling` (both can carry the same conditions and appear side by side in
 * Live Session). Free-text `{tone, label}` conditions are no longer allowed —
 * every condition a mouse carries must be one of these.
 */
export type ConditionName =
  | 'exhausted'
  | 'frightened'
  | 'hungry-thirsty'
  | 'injured'
  | 'incapacitated'
  | 'unconscious';

export interface ConditionInfo {
  label: string;
  tone: 'danger' | 'warning';
  note: string;
}

/** Lookup table for display (label/tone) and the mechanical note behind each condition. */
export const CONDITIONS: Record<ConditionName, ConditionInfo> = {
  exhausted: {
    label: 'Exhausted',
    tone: 'warning',
    note: 'Disadvantage on STR and DEX saves. Cleared by a full rest.',
  },
  frightened: {
    label: 'Frightened',
    tone: 'danger',
    note: 'Must pass a WIL save to approach the source of the fear. Cleared by a short rest away from danger.',
  },
  'hungry-thirsty': {
    label: 'Hungry & Thirsty',
    tone: 'warning',
    note: 'Save penalty until fed and watered. Cleared by eating a proper meal.',
  },
  injured: {
    label: 'Injured',
    tone: 'danger',
    note: 'Disadvantage on STR and DEX saves. Cleared by a full rest.',
  },
  incapacitated: {
    label: 'Incapacitated',
    tone: 'danger',
    note: 'Out of the fight — from a failed STR save. Cleared once tended or stabilized, not by resting alone.',
  },
  unconscious: {
    label: 'Unconscious',
    tone: 'danger',
    note: 'Out cold and unable to act. Cleared by tending or rest.',
  },
};

/** A permanent, roster-visible mark from a past Fatal Wound — separate from `conditions`, never auto-cleared. */
export interface Scar {
  label: string;
  note: string;
}

/**
 * Best-effort migration from the old free-text `{tone, label}` condition
 * shape (and passthrough of already-migrated `ConditionName[]` values) to
 * the fixed vocabulary above. Unrecognized labels are dropped rather than
 * guessed at — a stale/corrupted record should degrade gracefully, not
 * crash or invent a condition that doesn't exist in the rules.
 */
const LEGACY_LABEL_TO_CONDITION: Record<string, ConditionName> = {
  exhausted: 'exhausted',
  frightened: 'frightened',
  scared: 'frightened',
  afraid: 'frightened',
  hungry: 'hungry-thirsty',
  thirsty: 'hungry-thirsty',
  'hungry & thirsty': 'hungry-thirsty',
  'hungry and thirsty': 'hungry-thirsty',
  injured: 'injured',
  incapacitated: 'incapacitated',
  unconscious: 'unconscious',
};

function isConditionName(value: unknown): value is ConditionName {
  return typeof value === 'string' && value in CONDITIONS;
}

export function migrateConditions(raw: unknown): ConditionName[] {
  if (!Array.isArray(raw)) return [];
  const result: ConditionName[] = [];
  for (const entry of raw) {
    let mapped: ConditionName | undefined;
    if (isConditionName(entry)) {
      mapped = entry;
    } else if (entry && typeof entry === 'object' && 'label' in entry) {
      const label = String((entry as { label?: unknown }).label ?? '')
        .trim()
        .toLowerCase();
      mapped = LEGACY_LABEL_TO_CONDITION[label];
    }
    if (mapped && !result.includes(mapped)) result.push(mapped);
  }
  return result;
}
