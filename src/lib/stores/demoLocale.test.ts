import { afterEach, describe, expect, it } from 'vitest';
import { changeLanguage } from './demoLocale';
import { getParty } from './party.svelte';
import { getFactions, updateFaction } from './factions.svelte';
import { getHexNodes } from './hexmap.svelte';
import { getSessions } from './sessions.svelte';
import { getAdventures } from './adventures.svelte';

describe('changeLanguage', () => {
  afterEach(() => changeLanguage('en'));

  it('brings the seeded demo campaign into German and back', () => {
    changeLanguage('de');
    expect(getFactions().map((f) => f.name)).toContain('Der Nagehof');
    expect(getHexNodes().map((n) => n.name)).toContain('Brombeerwacht');
    expect(getParty().find((m) => m.name === 'Pip')?.role).toBe('Späher');
    expect(getSessions()[0]?.title).toBe('Hinab in die Kanalisation');
    expect(getAdventures().map((a) => a.title)).toContain('Der Überfall auf den Kornspeicher');
    expect(getAdventures().find((a) => a.title === 'Der Überfall auf den Kornspeicher')?.description).toMatch(/^Der Nagehof gräbt/);

    changeLanguage('en');
    expect(getFactions().map((f) => f.name)).toContain('The Gnawing Court');
    expect(getParty().find((m) => m.name === 'Pip')?.role).toBe('Scout');
    expect(getAdventures().map((a) => a.title)).toContain('The granary raid');
  });

  it('never overwrites a faction the GM renamed', () => {
    const court = getFactions().find((f) => f.name === 'The Gnawing Court')!;
    updateFaction(court.id, { name: 'The Rat King' });
    changeLanguage('de');
    expect(getFactions().find((f) => f.id === court.id)?.name).toBe('The Rat King');
  });
});
