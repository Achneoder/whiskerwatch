import type { SupportedLocale } from './i18n';
import type { PartyMember } from './stores/party.svelte';
import type { Hireling } from './stores/hirelings.svelte';
import type { BestiaryEntry } from './stores/bestiary.svelte';
import type { Faction } from './stores/factions.svelte';
import type { HexNode } from './stores/hexmap.svelte';
import type { Beat } from './stores/beats.svelte';
import type { Session } from './stores/sessions.svelte';

/**
 * The demo campaign's player-facing text, in every supported language. Each
 * store builds its seed from the English variant; `relocalizeDemoRecords`
 * swaps a record over to another language later, as long as the GM hasn't
 * edited that text (see its docs).
 *
 * Proper mouse names stay the same in every language — they're names, and
 * they also serve as the stable key that finds a party member again.
 */
type DemoText<T, K extends keyof T> = Record<SupportedLocale, Pick<T, K>>;

export const DEMO_PARTY: DemoText<PartyMember, 'name' | 'role'>[] = [
  { en: { name: 'Pip', role: 'Scout' }, de: { name: 'Pip', role: 'Späher' } },
  { en: { name: 'Wren', role: 'Tinker' }, de: { name: 'Wren', role: 'Tüftler' } },
  { en: { name: 'Bram', role: 'Warden' }, de: { name: 'Bram', role: 'Wächter' } },
  { en: { name: 'Sedge', role: 'Sage' }, de: { name: 'Sedge', role: 'Weiser' } },
];

export const DEMO_HIRELINGS: DemoText<Hireling, 'name' | 'role' | 'notes'>[] = [
  {
    en: { name: 'Oat', role: 'Porter', notes: 'Carries the spare rope and two rations. Paid 5p/day.' },
    de: { name: 'Oat', role: 'Träger', notes: 'Trägt das Ersatzseil und zwei Rationen. Lohn: 5 Pips/Tag.' },
  },
];

export const DEMO_BESTIARY: DemoText<BestiaryEntry, 'name' | 'attacks' | 'special' | 'notes'>[] = [
  {
    en: {
      name: 'Gnawing Court Ratling',
      attacks: [{ name: 'Rusty blade', damage: 'd6' }],
      special: 'Pack tactics: +1 to hit when two or more ratlings attack the same target.',
      notes: 'Cowardly alone, bold in numbers.',
    },
    de: {
      name: 'Ratling des Nagehofs',
      attacks: [{ name: 'Rostige Klinge', damage: 'd6' }],
      special: 'Rudeltaktik: +1 auf Treffer, wenn zwei oder mehr Ratlinge dasselbe Ziel angreifen.',
      notes: 'Allein feige, in der Überzahl dreist.',
    },
  },
  {
    en: {
      name: 'Tunnel Widow',
      attacks: [{ name: 'Venomous bite', damage: 'd6' }],
      special: 'On a hit, the target must pass a STR save or become Weakened (-1 to STR checks) until they next rest.',
      notes: 'Waits motionless in web-choked side tunnels.',
    },
    de: {
      name: 'Tunnelwitwe',
      attacks: [{ name: 'Giftbiss', damage: 'd6' }],
      special:
        'Bei einem Treffer muss das Ziel einen STR-Rettungswurf bestehen oder ist bis zur nächsten Rast geschwächt (-1 auf STR-Proben).',
      notes: 'Lauert regungslos in spinnwebverhangenen Seitentunneln.',
    },
  },
  {
    en: {
      name: 'Rat Court Enforcer',
      attacks: [{ name: 'Cleaver', damage: 'd8' }],
      special: 'Once per fight, can push a mouse back two squares on a hit.',
      notes: "Reports directly to the Gnawing Court's leadership.",
    },
    de: {
      name: 'Vollstrecker des Rattenhofs',
      attacks: [{ name: 'Hackbeil', damage: 'd8' }],
      special: 'Kann einmal pro Kampf bei einem Treffer eine Maus zwei Felder zurückstoßen.',
      notes: 'Erstattet der Führung des Nagehofs direkt Bericht.',
    },
  },
  {
    en: {
      name: 'Sewer Owl',
      attacks: [{ name: 'Talons', damage: 'd6+1' }],
      special: "Silent flight: the owl's first attack in a fight is a critical hit (double damage) if it went unseen.",
      notes: 'More interested in tribute than territory — see Owl Bridge Toll.',
    },
    de: {
      name: 'Kanaleule',
      attacks: [{ name: 'Krallen', damage: 'd6+1' }],
      special:
        'Lautloser Flug: Der erste Angriff der Eule in einem Kampf ist ein kritischer Treffer (doppelter Schaden), wenn sie unbemerkt blieb.',
      notes: 'Mehr an Tribut als an Revier interessiert — siehe Eulenbrückenzoll.',
    },
  },
  {
    en: {
      name: 'The Granary Rot',
      attacks: [{ name: 'Rotting slam', damage: 'd6' }],
      special: 'Spores: anyone ending their turn adjacent must pass a STR save or gain a level of Exhausted.',
      notes: "Grows larger the longer the Gnawing Court's tunnels go unchecked.",
    },
    de: {
      name: 'Die Kornfäule',
      attacks: [{ name: 'Fauliger Hieb', damage: 'd6' }],
      special:
        'Sporen: Wer seinen Zug angrenzend beendet, muss einen STR-Rettungswurf bestehen oder wird Erschöpft.',
      notes: 'Wächst, je länger die Tunnel des Nagehofs unbehelligt bleiben.',
    },
  },
];

export const DEMO_FACTIONS: DemoText<Faction, 'name' | 'note' | 'tags'>[] = [
  {
    en: {
      name: 'The Gnawing Court',
      note: "Rats tunnelling beneath the granary — when the clock fills they breach the grain cellars and raid Bramblewatch's food stores.",
      tags: ['Hostile', 'Sewers'],
    },
    de: {
      name: 'Der Nagehof',
      note: 'Ratten graben Tunnel unter dem Kornspeicher — ist die Uhr voll, brechen sie in die Kornkeller ein und plündern die Vorräte von Brombeerwacht.',
      tags: ['Feindlich', 'Kanalisation'],
    },
  },
  {
    en: {
      name: 'Owl Bridge Toll',
      note: 'A barn owl in the old millhouse demands a pip toll to cross Millrace Creek — when it fills she starts snatching mice who cross for free.',
      tags: ['Neutral', 'Toll'],
    },
    de: {
      name: 'Eulenbrückenzoll',
      note: 'Eine Schleiereule in der alten Mühle verlangt einen Pip als Zoll für den Weg über den Mühlbach — ist die Uhr voll, schnappt sie sich Mäuse, die nicht zahlen.',
      tags: ['Neutral', 'Zoll'],
    },
  },
  {
    en: {
      name: 'The Seed-Keepers',
      note: 'Field mice hoarding winter stores in the meadow burrows — when it fills, allies get first pick of provisions before the frost.',
      tags: ['Ally', 'Meadow'],
    },
    de: {
      name: 'Die Samenhüter',
      note: 'Feldmäuse horten Wintervorräte in den Wiesenbauten — ist die Uhr voll, dürfen Verbündete vor dem Frost als Erste Proviant wählen.',
      tags: ['Verbündet', 'Wiese'],
    },
  },
  {
    en: {
      name: "Granary Reeve's Guild",
      note: 'The merchant council running the granary, weighing whether to pay the Court "protection" — when it fills they secretly funnel grain to the rats.',
      tags: ['Neutral', 'Trade'],
    },
    de: {
      name: 'Gilde des Kornvogts',
      note: 'Der Händlerrat des Kornspeichers überlegt, dem Hof „Schutzgeld“ zu zahlen — ist die Uhr voll, schleust er heimlich Korn zu den Ratten.',
      tags: ['Neutral', 'Handel'],
    },
  },
  {
    en: {
      name: 'Bramblewatch Militia',
      note: "Hedgerow defenders drilling in secret — when it fills they muster to seal the Court's tunnels for good.",
      tags: ['Ally', 'Defense'],
    },
    de: {
      name: 'Miliz von Brombeerwacht',
      note: 'Heckenverteidiger, die im Geheimen üben — ist die Uhr voll, rücken sie aus, um die Tunnel des Hofs für immer zu versiegeln.',
      tags: ['Verbündet', 'Verteidigung'],
    },
  },
];

export const DEMO_HEX_NODES: DemoText<HexNode, 'name' | 'notes'>[] = [
  {
    en: {
      name: 'Bramblewatch',
      notes: "Home warren & market on stilts; the Reeve's Granary feeds the valley, but something gnaws the support beams at night.",
    },
    de: {
      name: 'Brombeerwacht',
      notes: 'Heimatbau & Markt auf Stelzen; der Kornspeicher des Vogts ernährt das Tal, doch nachts nagt etwas an den Stützbalken.',
    },
  },
  {
    en: {
      name: 'The Gnawgate',
      notes: "A collapsed silo hides the Gnawing Court's tunnel entrance; bored Ratling sentries watch in shifts.",
    },
    de: {
      name: 'Das Nagetor',
      notes: 'Ein eingestürztes Silo verbirgt den Tunneleingang des Nagehofs; gelangweilte Ratling-Wachen halten schichtweise Ausschau.',
    },
  },
  {
    en: {
      name: 'Owl Bridge',
      notes: 'A single-plank crossing over Millrace Creek; a barn owl roosts in the rafters and demands a toll pip.',
    },
    de: {
      name: 'Eulenbrücke',
      notes: 'Ein einzelnes Brett über den Mühlbach; im Gebälk hockt eine Schleiereule und verlangt einen Pip Zoll.',
    },
  },
  {
    en: {
      name: 'Sunwarp Meadow',
      notes: "The Seed-Keepers' storage burrows hide beneath a fallen log at the meadow's heart.",
    },
    de: {
      name: 'Sonnenwirbelwiese',
      notes: 'Die Vorratsbauten der Samenhüter liegen versteckt unter einem umgestürzten Stamm mitten auf der Wiese.',
    },
  },
  {
    en: {
      name: 'Thistlewood Edge',
      notes: 'A screened clearing where the Bramblewatch Militia drills, away from prying eyes.',
    },
    de: {
      name: 'Distelwaldrand',
      notes: 'Eine verborgene Lichtung, auf der die Miliz von Brombeerwacht fern neugieriger Blicke übt.',
    },
  },
  {
    en: {
      name: 'The Drowned Barrow',
      notes: "A half-sunk mouse-lord's barrow; legend says a cursed hoard still glitters inside — and something guards it.",
    },
    de: {
      name: 'Das versunkene Hügelgrab',
      notes: 'Das halb versunkene Grab eines Mäusefürsten; der Legende nach glitzert darin noch ein verfluchter Hort — und etwas bewacht ihn.',
    },
  },
];

export const DEMO_BEATS: DemoText<Beat, 'title' | 'notes'>[] = [
  {
    en: {
      title: 'The granary raid',
      notes: 'The Gnawing Court is tunnelling under Old Miller’s granary. The warband needs to get in, find out how far the tunnels reach, and decide what to do about it.',
    },
    de: {
      title: 'Der Überfall auf den Kornspeicher',
      notes: 'Der Nagehof gräbt Tunnel unter dem Kornspeicher des alten Müllers. Die Gruppe muss hinein, herausfinden, wie weit die Tunnel reichen, und entscheiden, was dagegen zu tun ist.',
    },
  },
];

export const DEMO_SESSIONS: DemoText<Session, 'title' | 'summary'>[] = [
  {
    en: {
      title: 'Into the sewers',
      summary:
        'The warband tracked the Gnawing Court’s scouts down into the sewers beneath the granary and found the first tunnel entrance.',
    },
    de: {
      title: 'Hinab in die Kanalisation',
      summary:
        'Die Gruppe folgte den Spähern des Nagehofs hinab in die Kanalisation unter dem Kornspeicher und fand den ersten Tunneleingang.',
    },
  },
];

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Moves demo records over to `to`'s wording. A record counts as a demo record
 * when its `keyField` (its name or title) still matches a demo entry in some
 * other language; then each text field that still holds that language's demo
 * text is replaced. Anything the GM has rewritten — or any record they
 * created themselves — is left exactly as it is.
 */
export function relocalizeDemoRecords<T extends { id: string }, K extends keyof T>(
  items: T[],
  demo: DemoText<T, K>[],
  keyField: K,
  to: SupportedLocale,
  update: (id: string, patch: Partial<Pick<T, K>>) => void,
): void {
  for (const item of items) {
    for (const entry of demo) {
      const from = (Object.keys(entry) as SupportedLocale[]).find(
        (locale) => locale !== to && entry[locale][keyField] && same(item[keyField], entry[locale][keyField]),
      );
      if (!from) continue;
      const patch: Partial<Pick<T, K>> = {};
      for (const field of Object.keys(entry[from]) as K[]) {
        if (same(item[field], entry[from][field]) && !same(item[field], entry[to][field])) patch[field] = structuredClone(entry[to][field]);
      }
      if (Object.keys(patch).length > 0) update(item.id, patch);
      break;
    }
  }
}
