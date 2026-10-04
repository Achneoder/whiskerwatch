import { afterEach, describe, expect, it } from 'vitest';
import { changeLanguage } from './demoLocale';
import { getParty } from './party.svelte';
import { getFactions, updateFaction } from './factions.svelte';
import { getHexNodes } from './hexmap.svelte';
import { getSessions } from './sessions.svelte';

describe('changeLanguage', () => {
  afterEach(() => changeLanguage('en'));

  it('brings the seeded demo campaign into German and back', () => {
    changeLanguage('de');
    expect(getFactions().map((f) => f.name)).toContain('Der Nagehof');
    expect(getHexNodes().map((n) => n.name)).toContain('Brombeerwacht');
    expect(getParty().find((m) => m.name === 'Pip')?.role).toBe('Späher');
    expect(getSessions()[0]?.title).toBe('Hinab in die Kanalisation');

    changeLanguage('en');
    expect(getFactions().map((f) => f.name)).toContain('The Gnawing Court');
    expect(getParty().find((m) => m.name === 'Pip')?.role).toBe('Scout');
  });

  it('never overwrites a faction the GM renamed', () => {
    const court = getFactions().find((f) => f.name === 'The Gnawing Court')!;
    updateFaction(court.id, { name: 'The Rat King' });
    changeLanguage('de');
    expect(getFactions().find((f) => f.id === court.id)?.name).toBe('The Rat King');
  });
});
