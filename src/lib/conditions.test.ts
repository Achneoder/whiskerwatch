import { describe, expect, it } from 'vitest';
import en from './i18n/en.json';
import de from './i18n/de.json';
import { CONDITIONS, conditionLabelKey, type ConditionName } from './conditions';

function lookup(messages: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
}

describe('conditionLabelKey', () => {
  it.each(Object.keys(CONDITIONS) as ConditionName[])('has an English and German label for %s', (name) => {
    const key = conditionLabelKey(name);
    expect(lookup(en, key)).toBe(CONDITIONS[name].label);
    expect(typeof lookup(de, key)).toBe('string');
    expect(lookup(de, key)).not.toBe(CONDITIONS[name].label);
  });
});
