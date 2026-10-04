import { describe, expect, it, vi } from 'vitest';
import { DEMO_BESTIARY, DEMO_FACTIONS, relocalizeDemoRecords } from './demoCampaign';
import type { Faction } from './stores/factions.svelte';

function faction(overrides: Partial<Faction>): Faction {
  return { id: 'f1', ...DEMO_FACTIONS[0]!.en, disposition: 'hostile', clock: 3, of: 6, ...overrides };
}

describe('relocalizeDemoRecords', () => {
  it('translates an untouched demo record', () => {
    const update = vi.fn();
    relocalizeDemoRecords([faction({})], DEMO_FACTIONS, 'name', 'de', update);
    expect(update).toHaveBeenCalledWith('f1', DEMO_FACTIONS[0]!.de);
  });

  it('keeps text the GM has rewritten, while translating the rest', () => {
    const update = vi.fn();
    relocalizeDemoRecords([faction({ note: 'My own note' })], DEMO_FACTIONS, 'name', 'de', update);
    expect(update).toHaveBeenCalledWith('f1', { name: DEMO_FACTIONS[0]!.de.name, tags: DEMO_FACTIONS[0]!.de.tags });
  });

  it('translates back to English', () => {
    const update = vi.fn();
    relocalizeDemoRecords([faction(DEMO_FACTIONS[0]!.de)], DEMO_FACTIONS, 'name', 'en', update);
    expect(update).toHaveBeenCalledWith('f1', DEMO_FACTIONS[0]!.en);
  });

  it('leaves records the GM created, renamed, or already in the target language alone', () => {
    const update = vi.fn();
    relocalizeDemoRecords(
      [faction({ id: 'mine', name: 'The Thorn Pact' }), faction({ id: 'de', ...DEMO_FACTIONS[1]!.de })],
      DEMO_FACTIONS,
      'name',
      'de',
      update,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('hands out copies, so editing a translated record never alters the demo text', () => {
    const update = vi.fn();
    const entry = { id: 'b1', ...DEMO_BESTIARY[0]!.en, category: 'Vermin' as const, hd: 2, hp: 4, armor: 1 };
    relocalizeDemoRecords([entry], DEMO_BESTIARY, 'name', 'de', update);
    const patch = update.mock.calls[0]![1];
    expect(patch.attacks).toEqual(DEMO_BESTIARY[0]!.de.attacks);
    expect(patch.attacks).not.toBe(DEMO_BESTIARY[0]!.de.attacks);
  });

  it('has a German version of every demo text field', () => {
    for (const demo of [DEMO_FACTIONS, DEMO_BESTIARY]) {
      for (const entry of demo) expect(Object.keys(entry.de).sort()).toEqual(Object.keys(entry.en).sort());
    }
  });
});
