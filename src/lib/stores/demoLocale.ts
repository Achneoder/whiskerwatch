import { setLocale, type SupportedLocale } from '../i18n';
import {
  DEMO_ADVENTURES,
  DEMO_BEATS,
  DEMO_BESTIARY,
  DEMO_FACTIONS,
  DEMO_HEX_NODES,
  DEMO_HIRELINGS,
  DEMO_PARTY,
  DEMO_SESSIONS,
  relocalizeDemoRecords,
} from '../demoCampaign';
import { getParty, updateMember } from './party.svelte';
import { getHirelings, updateHireling } from './hirelings.svelte';
import { getBestiary, updateBestiaryEntry } from './bestiary.svelte';
import { getFactions, updateFaction } from './factions.svelte';
import { getHexNodes, updateHexNode } from './hexmap.svelte';
import { getBeats, updateBeat } from './beats.svelte';
import { getAdventures, updateAdventure } from './adventures.svelte';
import { getSessions, updateSession } from './sessions.svelte';

/**
 * Switches the untouched parts of the demo campaign to `locale`. Runs once at
 * boot (so a campaign seeded before the language was picked catches up) and
 * on every language switch. Text the GM has edited is never overwritten.
 */
export function relocalizeDemoCampaign(locale: SupportedLocale): void {
  relocalizeDemoRecords(getParty(), DEMO_PARTY, 'name', locale, updateMember);
  relocalizeDemoRecords(getHirelings(), DEMO_HIRELINGS, 'name', locale, updateHireling);
  relocalizeDemoRecords(getBestiary(), DEMO_BESTIARY, 'name', locale, updateBestiaryEntry);
  relocalizeDemoRecords(getFactions(), DEMO_FACTIONS, 'name', locale, updateFaction);
  relocalizeDemoRecords(getHexNodes(), DEMO_HEX_NODES, 'name', locale, updateHexNode);
  relocalizeDemoRecords(getAdventures(), DEMO_ADVENTURES, 'title', locale, updateAdventure);
  relocalizeDemoRecords(getBeats(), DEMO_BEATS, 'title', locale, updateBeat);
  relocalizeDemoRecords(getSessions(), DEMO_SESSIONS, 'title', locale, updateSession);
}

/** Switches the app language and brings the untouched demo campaign along with it. */
export function changeLanguage(next: SupportedLocale): void {
  setLocale(next);
  relocalizeDemoCampaign(next);
}
