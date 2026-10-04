# Whiskerwatch — GM's Manual

Whiskerwatch is a campaign companion for game masters running **Mausritter**. It replaces the
stack of notebooks and spreadsheets most GMs cobble together — warband HP, faction clocks,
hex-crawl notes, a bestiary, session recaps — with a single app that lives entirely in your
browser. No account, no server, no signup: open it and start prepping.

- 📶 **Works offline** — all data stored on-device
- 📱 **Table-ready** — phone, tablet, or laptop
- 🐭 **Rules-accurate** to Mausritter stat blocks
- 🇬🇧 🇩🇪 **English & German**
- ❓ **Rules help built in** — tap the small `?` next to any rules-heavy field

Screenshots below use the app's built-in sample campaign ("My Campaign") to show each screen
with real content.

## Contents

- [Dashboard](#dashboard)
- [Roster](#roster)
- [Adventure](#adventure)
- [Bestiary](#bestiary)
- [Factions](#factions)
- [Hex map](#hex-map)
- [Generators](#generators)
- [Live session](#live-session)
- [Sessions](#sessions)
- [Timeline](#timeline)
- [Settings & your data](#settings--your-data)
- [Finding things & getting help](#finding-things--getting-help)
- [At the table, on a phone](#at-the-table-on-a-phone)

---

## Dashboard

*Prep mode · Overview*

Your campaign's home base. One glance tells you where the warband stands, which factions are
close to boiling over, and what needs attention before your next session.

![Whiskerwatch dashboard showing warband status, pips banked, active clocks, session prep checklist, and faction clock summaries](01-dashboard.png)

- The four stat cards (**Warband**, **Pips banked**, **Active clocks**, **Session**) update
  automatically as you play — nothing here is manually tallied.
- **Session Prep** is a checklist built from your actual data: beats in play, hexes with
  encounters ready, hirelings on wages, and clocks about to trigger. Work down this list before
  you sit down to run.
- The **Factions & Clocks** panel on the right mirrors the Factions screen so you can check clock
  progress without leaving the dashboard.
- Click **Start session** (bottom of the sidebar) any time you're ready to move into Live Session
  mode.
- A **Data Safety** card appears once you've logged 2+ sessions or gone 14+ days without exporting
  — with an **Export now** button right on the card. Export regularly and you'll never see it;
  there's no dismiss button because it disappears by itself the moment you back up.
- Click the pencil next to the campaign name to rename it in place — handy the first time you set
  up a campaign, or whenever the adventure outgrows "My Campaign."

## Roster

*Prep mode · Warband*

Every player mouse and hireling, with HP, conditions, and scars tracked in one place — the same
data the Dashboard and Live Session screens read from.

![Whiskerwatch roster screen listing player mice Pip, Wren, Bram, and Sedge, plus hireling Oat, with HP bars and conditions](02-roster.png)

- Use **Add mouse** or **Add hireling** to bring in a new party member — a birth mouse or
  replacement after a death, or an NPC hired mid-adventure.
- Conditions like `Frightened` or `Hungry & Thirsty` and permanent **Scars** show inline, so you
  don't need to flip to a character sheet mid-scene.
- **Inventory follows the rulebook.** A mouse has 10 slots — 2 paw, 2 body, 6 pack — and a
  hireling has 6 (2 paw, 2 body, 2 pack). Armour and two-handed weapons take 2 slots. Carry more
  than you have room for and the form flags the mouse as **encumbered** (no running,
  Disadvantage on every save); it warns but never stops you adding items.
- **Hirelings** have a daily wage, a **WIL** score, and a **Loyal or well-paid** toggle. Their
  morale saves roll against WIL, with Advantage when that toggle is on — the Roster row shows a
  **Morale** pill with their WIL and a **Loyal** tag.
- **Export campaign** / **Import campaign** (top right) save or restore your entire campaign as
  one JSON file — the same controls also live on the Settings screen.

## Adventure

*Prep mode · Adventure*

Run more than one adventure at once — a main plotline and a side job the party picked up along
the way, say — each with its own card and its own beat outline underneath it. Break each one into
beats: a lightweight outline for planning what happens next, not a rigid script.

![Whiskerwatch adventure screen showing two concurrent active adventures, 'The granary raid' and 'The tunnel widow's bargain', each with its own beat outline, and a collapsed 'Completed (1)' section below them](03-adventure.png)

- **Add adventure** starts a new thread without disturbing the others — every adventure keeps its
  own title, description, status, and beat outline, so juggling a main plot and a side job never
  means losing track of either one's beats.
- **Add beat** builds out one adventure's outline: a beat can be a scene, a decision point, or a
  consequence you're anticipating.
- Beats you mark complete feed the **Timeline** screen automatically, so your campaign's history
  writes itself as you play.
- Once an adventure wraps up, mark it **Completed** — it drops out of the active list and into a
  collapsed **Completed (N)** section at the bottom, so wrapped-up plotlines stop competing for
  space with what's still live.
- The Dashboard's Session Prep checklist counts beats currently in play across every active
  adventure — keeping outlines current keeps that checklist honest.

## Bestiary

*Prep mode · Bestiary*

Monsters and NPCs as Mausritter-accurate stat blocks — HD, HP, Armor, attack, and a special rule
or two — ready to drop into a scene without reaching for a book.

![Whiskerwatch bestiary screen with five creature cards: Gnawing Court Ratling, Tunnel Widow, Rat Court Enforcer, Sewer Owl, and The Granary Rot](04-bestiary.png)

- Each card holds a full stat block plus a flavor line in italics — enough to run the creature
  cold, at the table, with no lookup.
- Tag creatures by type (`Vermin`, `Beast`, `Bird of Prey`, `Aberration`…) so the **Generators**
  screen can pull sensible random encounters.
- Click **Add creature** to homebrew a new stat block, or the pencil icon on any card to adjust
  one mid-campaign.

## Factions

*Prep mode · Factions*

Track every faction's clock, disposition, and relationships to the others — and see it all at
once in a relationship graph.

![Whiskerwatch factions screen listing five factions with clocks and a relationship graph showing ally, enemy, and rival links](05-factions.png)

- **Clocks** — each faction card carries a clock (e.g. `3/6`) that fills as the faction's agenda
  advances — tick it up as the party's actions push events forward.
- **Relationships** — Ally, Enemy, and Rival links between factions render live in the graph on
  the right, so you can spot who's caught in the middle before the party wanders in.
- When a clock fills, the faction's description tells you exactly what happens — write your
  triggers into that text while you're prepping, not mid-session.
- **Add faction** to introduce a new player into the setting; the graph reflows automatically.

## Hex map

*Prep mode · Hex map*

A hex-crawl map with per-hex terrain and content — the same map that feeds the Generators
screen's "random encounter by hex" roll.

![Whiskerwatch hex map screen showing a hex grid with several named, colored hexes for terrain like meadow, hedgerow, and water](06-hexmap.png)

- Click any hex to open it and record terrain, points of interest, and prepped encounters.
- Use the terrain legend checkboxes at the top to filter the map down to one terrain type when
  you're prepping a specific region.
- A hex with an encounter prepped shows up in the Dashboard's Session Prep checklist as "hexes
  with encounters ready." Each prepped creature has a **weight** — weight 3 comes up three times as
  often as weight 1.
- **Party is here** — open a hex and tap **Set here** to place the party on the map before a
  hex crawl starts. A paw-print marker shows where they are; from then on the party moves from the
  Watch card in Live Session. (Shown only when exactly one adventure is active.)
- Terrain sets travel speed: crossing a hex takes 1 watch on foot, or 2 through forest or hills.
  Water hexes can't be entered on foot.

## Generators

*Improvise · Generators*

Four quick tools for improvising at the table: a dice roller, and random rollers for encounters,
items, and NPCs — all pulling from your own Bestiary and hex data, not generic tables.

![Whiskerwatch generators screen with a dice roller and buttons to roll a random encounter, item, or NPC](07-generators.png)

- The dice roller supports any combination of dice, sides, and modifier — set it once for a save
  (e.g. 1d20) or damage (e.g. 2d6+1) and reroll with one click.
- **Roll an encounter** can be scoped to a specific hex or left as "any hex" to pull from the
  whole bestiary — handy when the party goes somewhere you didn't fully prep.

## Live session

*Live · At the table*

The screen you run the actual game from: party HP and conditions, hireling status, faction
clocks, and a docked dice roller for ability saves — all one tap away, no scrolling to find
things.

![Whiskerwatch live session screen with faction clocks at the top, party member HP cards, hireling cards, and a docked save-roll widget at the bottom](11-livesession.png)

> 🎲 The docked roller at the bottom stays available while you scroll — pick a mouse, hit the
> highlighted ability score, and **Roll save**. No need to leave the HP tracker to make a check.

- Hit **Hurt** on any party or hireling card to log damage against their current HP in one tap.
- **Encounters you can fight.** **Roll an encounter** draws from the party's current hex and puts
  a tracked copy of the creature on the card with its own HP — **Hurt**/**Heal** it just like a
  mouse, and mark it **Defeated** or **Remove** it when it's done. Facing a group? Tap
  **+ Add another** for each extra creature. **Roll Reaction** sets how they greet the party.
- **Hand items over.** Tap a mouse's **Bag**, pick an item, and **Move** it to another mouse or
  hireling — post-fight loot or "Wren hands Pip the rope." Each row shows the recipient's slots
  (10 for a mouse, 6 for a hireling); if the item would leave them encumbered you get a warning,
  never a block.
- **Hireling morale.** When a hireling is stressed, unpaid or unfed, or ordered into more danger
  than they signed on for, tap the **Morale** pill on their card (or **Morale** in the docked
  roller). It rolls a d20 WIL save — 2d20 keep-lowest for a loyal or well-paid hireling — and
  tells you whether they **stay** or **flee**. **Pay day** lists every hireling's wage, lets you
  tick off who's been paid, and offers the same morale save for anyone left unpaid.
- **Reaction rolls** use the rulebook's results — Hostile, Unfriendly, Unsure, Talkative,
  Helpful — each with the question to answer at the table ("What could win them over?").
- **Watch card (hex crawl).** Tracks the day and which of the four watches it is. Each tap spends
  one watch: **Stay put**, **Forage** (rolls d3 rations and lets you pick whose bag they go into),
  or move to a neighbouring hex — forest and hills take two watches. Morning and evening watches
  roll an encounter check automatically, and a hit feeds straight into the Encounter card. Go a full
  day without resting and the card offers to apply **Exhausted** to the party; it never does this
  without asking.
- Faction clocks pinned to this adventure's active factions sit at the top, so a triggering clock
  is never a surprise.
- **End Session** (top right) closes out the session and can hand off directly into drafting a
  recap on the Sessions screen.
- Running two adventures with an active beat at the same time? A chip under the session title
  lets you pick which one is "live" for the table right now — tap it to see both adventures and
  their current beat, then choose. With zero or one active beat, nothing changes: the beat title
  just shows underneath the session name as usual.

![Whiskerwatch live session header with the adventure picker open, showing 'The granary raid' and 'The tunnel widow's bargain' as choices, each with its own active beat listed underneath](11b-livesession-picker.png)

## Sessions

*Recap mode · Sessions*

A running log of what actually happened, session by session — the record you'll thank yourself
for three months into the campaign when you can't remember why a faction hates the party.

![Whiskerwatch sessions screen showing a logged session titled 'Into the sewers' with a summary paragraph](08-sessions.png)

- **Log session** to write up a recap from scratch, or finish one that was drafted for you
  automatically when you ended a Live Session.
- Recaps here are what populate the **Sessions** entries on the Timeline.

## Timeline

*Prep mode · Timeline*

Your campaign's history, assembled automatically from sessions logged, beats completed, clocks
triggered, and mice lost — filterable by type.

![Whiskerwatch timeline screen with filter chips for Sessions, Beats, Clocks, and Deaths, currently showing no recorded events](09-timeline.png)

- You never write timeline entries by hand — they're derived from the Adventure, Sessions, and
  Factions screens, so the history stays accurate without extra bookkeeping.
- Use the `Sessions` / `Beats` / `Clocks` / `Deaths` chips to isolate one thread — useful when you
  need to recall exactly when a faction's clock filled.

## Settings & your data

*Prep mode · Settings*

Whiskerwatch has no account and no server — your campaign lives only in this browser. This
screen is where you back it up.

![Whiskerwatch settings screen with appearance toggle, language toggle, and campaign data export, import, and reset controls](10-settings.png)

> ⚠️ Clearing your browser's site data, using a private/incognito window, or switching devices
> will lose your campaign. **Export a backup after every session.**

- **Export** saves one JSON file with everything: parties, hirelings, adventures, bestiary,
  factions, hex map, session logs, and the timeline. On a phone or tablet it opens the share menu
  (AirDrop, Nearby Share, messaging apps…) so you can send the campaign straight to another
  device; elsewhere it downloads the file.
- **Import** restores from that file — useful for moving to a new device or browser. Before
  anything is replaced you get a preview of what's in the file (campaign, export date, sessions,
  mice, adventures), plus a warning if the file is *older* than what's already on this device.
  Importing replaces everything currently in the app, so export first if you want to keep the
  current state as well.
- Exporting or importing both count as a backup, which clears the Dashboard's Data Safety card.
- **Reset everything** wipes the campaign and starts fresh. This can't be undone.
- Appearance (light/dark "burrow") and language (English/Deutsch) apply immediately across the
  whole app.

## Finding things & getting help

*Anywhere · Quick-find and help tips*

- **Quick-find** — tap **Search campaign** (top of the sidebar, or the search icon in the phone
  top bar) and type part of a name. It searches mice, hirelings, beats, bestiary entries,
  factions, hexes, and sessions. Tap a result to jump to it with its edit form already open. On a
  desktop, press `/` to open it from anywhere. With nothing typed, it offers shortcuts to every
  screen.
- **Help tips** — a small `?` sits next to fields and cards where Mausritter rules matter: HP,
  Pips, hireling Wage, WIL and the Loyal toggle, creature Armor, inventory slots and usage, faction disposition
  and clocks, hex terrain and encounter weights, the Watch card, reaction rolls, and the Data
  Safety card. Tap it for a one- or two-sentence reminder; tap again, tap elsewhere, or press
  Escape to close it. On a laptop, hovering or tabbing onto the `?` shows it too. For the fuller
  picture, open the **Rules reference** drawer (book icon in the Live Session header and on the
  Generators screen). It covers saves, damage and death, conditions, inventory and usage dots,
  reaction rolls, advancement (XP from treasure brought to safety), and hirelings.

## At the table, on a phone

*Responsive · At the table*

Every screen in Whiskerwatch is built to work from phone width up, since it's as likely to be
propped next to your dice as open on a laptop during prep. The sidebar collapses into a top bar
with a horizontally scrolling nav strip.

<img src="12-mobile-dashboard.png" alt="Whiskerwatch dashboard on a phone-width screen, with a compact top nav bar and stacked cards" width="360" />

- Tap the app name's row icons (settings, language, theme, start session) directly from the
  mobile top bar — no need to hunt through a menu.
- The horizontally scrolling nav strip below the top bar holds every screen from the desktop
  sidebar, in the same order.

---

Whiskerwatch — a campaign companion for Mausritter game masters. All data stays on your device;
there's nothing to sign into and nothing to lose track of but the mice themselves.
