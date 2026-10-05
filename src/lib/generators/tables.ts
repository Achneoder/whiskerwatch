import type { SupportedLocale } from '../i18n';

/**
 * A generator table, one parallel list per locale — index `i` must mean the
 * same entry in every language. Rolls store the index (not the text) so a
 * result already on screen re-renders in the new language when the GM
 * switches locale, instead of staying stuck in whichever one it was rolled in.
 */
export type LocalizedTable = Record<SupportedLocale, string[]>;

export const ITEM_TABLE: LocalizedTable = {
  en: [
    'A dented thimble, useful as a helmet (light armor, 1 slot).',
    "Three acorns' worth of pips knotted in a cloth.",
    'A sliver of broken mirror — reflects light, could blind a foe once.',
    "A spool of the Tunnel Widow's silk thread, strong as rope.",
    'A single waterproofed match, still good for one fire.',
    'A rat-court signet carved from a button — proof of rank if flashed.',
    'A vial of owl pellet oil — foul-smelling, but masks scent from vermin for an hour.',
    'A cracked acorn-cap flask, half full of blackberry wine.',
  ],
  de: [
    'Ein verbeulter Fingerhut, brauchbar als Helm (leichte Rüstung, 1 Feld).',
    'Pips im Wert von drei Eicheln, in ein Tuch geknotet.',
    'Ein Splitter eines zerbrochenen Spiegels — wirft Licht zurück, könnte einen Feind einmal blenden.',
    'Eine Spule Seidenfaden der Tunnelwitwe, so stark wie ein Seil.',
    'Ein einzelnes wasserfestes Streichholz, noch gut für ein Feuer.',
    'Ein aus einem Knopf geschnitzter Siegelring des Rattenhofs — Rangnachweis, wenn man ihn vorzeigt.',
    'Ein Fläschchen Eulengewöll-Öl — übelriechend, überdeckt aber eine Stunde lang den Geruch vor Ungeziefer.',
    'Eine gesprungene Eichelhut-Flasche, halb voll mit Brombeerwein.',
  ],
};

export const NPC_NAMES: LocalizedTable = {
  en: ['Thistle', 'Bramble', 'Acorn', 'Clover', 'Nettle', 'Barley', 'Hazel', 'Fern', 'Moss', 'Wick'],
  de: ['Distel', 'Brombeer', 'Eichel', 'Klee', 'Nessel', 'Gerste', 'Hasel', 'Farn', 'Moos', 'Docht'],
};

export const NPC_ROLES: LocalizedTable = {
  en: [
    'Grain merchant',
    'Tunnel scout',
    'Sewer-toll collector',
    'Retired soldier',
    'Seed-Keeper forager',
    'Gnawing Court defector',
    "Miller's apprentice",
    'Owl Bridge toll-keeper',
    'Wandering minstrel',
    'Granary watchmouse',
  ],
  de: [
    'Kornhändler',
    'Tunnelkundschafter',
    'Kanalzolleintreiber',
    'Altgedienter Soldat',
    'Sammler der Samenhüter',
    'Überläufer des Nagehofs',
    'Müllerlehrling',
    'Zöllner an der Eulenbrücke',
    'Fahrender Spielmann',
    'Wachmaus des Kornspeichers',
  ],
};

export const NPC_QUIRKS: LocalizedTable = {
  en: [
    'Never removes their hat',
    'Speaks only in questions',
    'Collects lost buttons',
    'Terrified of owls',
    'Constantly hungry',
    'Hums while thinking',
    'Distrusts anyone taller',
    'Keeps a diary of grudges',
    'Overly formal',
    'Flinches at loud noises',
  ],
  de: [
    'Nimmt nie den Hut ab',
    'Spricht nur in Fragen',
    'Sammelt verlorene Knöpfe',
    'Hat panische Angst vor Eulen',
    'Ständig hungrig',
    'Summt beim Nachdenken',
    'Misstraut allen, die größer sind',
    'Führt ein Tagebuch voller Groll',
    'Übertrieben förmlich',
    'Zuckt bei lauten Geräuschen zusammen',
  ],
};

export const NPC_WANTS: LocalizedTable = {
  en: [
    'A safe way past the Gnawing Court',
    'Revenge on whoever wronged them',
    'To be taken seriously',
    "A share of the granary's grain",
    'To leave the sewers for good',
    'Proof their family is still alive',
    'A trade deal with the Seed-Keepers',
    'To retire somewhere quiet',
    'Forgiveness for a past betrayal',
    'An audience with Owl Bridge Toll',
  ],
  de: [
    'Einen sicheren Weg am Nagehof vorbei',
    'Rache an dem, der ihnen Unrecht getan hat',
    'Ernst genommen zu werden',
    'Einen Anteil am Korn des Speichers',
    'Die Kanäle für immer zu verlassen',
    'Einen Beweis, dass ihre Familie noch lebt',
    'Ein Handelsabkommen mit den Samenhütern',
    'Sich an einem ruhigen Ort zur Ruhe zu setzen',
    'Vergebung für einen früheren Verrat',
    'Eine Audienz beim Eulenbrückenzoll',
  ],
};

function pickIndex(table: LocalizedTable): number {
  return Math.floor(Math.random() * table.en.length);
}

/**
 * Resolves a rolled index against a table in the given locale, falling back
 * to English for any locale/index the table doesn't cover.
 */
export function entryAt(table: LocalizedTable, index: number, locale: string | null | undefined): string {
  const list = (locale && table[locale as SupportedLocale]) || table.en;
  return list[index] ?? table.en[index] ?? '';
}

export interface NpcRoll {
  name: number;
  role: number;
  quirk: number;
  want: number;
}

export interface GeneratedNpc {
  name: string;
  role: string;
  quirk: string;
  want: string;
}

export function rollNpc(): NpcRoll {
  return {
    name: pickIndex(NPC_NAMES),
    role: pickIndex(NPC_ROLES),
    quirk: pickIndex(NPC_QUIRKS),
    want: pickIndex(NPC_WANTS),
  };
}

export function resolveNpc(roll: NpcRoll, locale: string | null | undefined): GeneratedNpc {
  return {
    name: entryAt(NPC_NAMES, roll.name, locale),
    role: entryAt(NPC_ROLES, roll.role, locale),
    quirk: entryAt(NPC_QUIRKS, roll.quirk, locale),
    want: entryAt(NPC_WANTS, roll.want, locale),
  };
}

export function generateNpc(locale: string | null | undefined = 'en'): GeneratedNpc {
  return resolveNpc(rollNpc(), locale);
}

export function rollFrom(table: LocalizedTable): number {
  return pickIndex(table);
}

export function generateFrom(table: LocalizedTable, locale: string | null | undefined = 'en'): string {
  return entryAt(table, rollFrom(table), locale);
}
