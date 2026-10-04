# The hex-crawl turn: watches, travel, foraging, "we are here" — interaction spec (Phase 15)

**Mode: live play, almost entirely.** Watches only advance while a GM is
actually running the table — this is the single at-table control the
roadmap calls for, and it has to survive kids talking over each other and a
phone held in one hand. The one piece that *isn't* live-play is the initial
"place the party on the map" action, which reasonably happens during prep
(setting up for session 1 of a new hex crawl) — that gets its own small,
low-frequency prep-mode affordance on Hex Map, called out separately below.
Nothing here touches recap; the existing "what happened" recap flow doesn't
need a watch-by-watch travel log, only the notable events it already
captures (deaths, condition changes, faction clocks).

Read before writing this spec: `LiveSession.svelte`, `LiveSessionHeader.svelte`,
`LiveSessionEncounterCard.svelte`, `LiveSessionCard.svelte`, `HexCanvas.svelte`,
`HexMap.svelte`, `lib/conditions.ts`, `lib/items.ts`, `lib/hex.ts`,
`lib/generators/reaction.ts`, `lib/stores/adventures.svelte.ts`, and
`docs/design/phase-13-encounter-tracker-and-item-handoff.md` (the
`HurtHealDrawer`/notice-and-undo idiom this spec reuses throughout).

---

## The one shared interaction, stated up front

The roadmap is explicit that watch-advance and move-to-adjacent-hex must be
**one tap, not a form**. The design that satisfies this: a single row of
equally-weighted chips reading *"This watch, the party…"* — **Stays put**,
**Forages**, or **Moves to [a specific neighboring hex]**. Every chip in
that row does the same underlying thing (advance one watch, run the SRD
encounter check if this watch requires one) and differs only in its one
side effect (nothing / roll rations / change position). There is no second
screen, no confirmation dialog, no multi-field form — tapping a chip *is*
the action, fully resolved in that tap. This is the mechanism both Phase 15
bullets ("advance one watch" and "move to adjacent hex") share, per the
roadmap's explicit ask.

---

## Data model — what's new, where it lives

### `Adventure` gains hex-crawl fields (persisted, not view-state)

```ts
// lib/stores/adventures.svelte.ts
export interface Adventure {
  id: string;
  title: string;
  description: string;
  status: AdventureStatus;
  /** New Phase 15 fields — all optional so every existing stored Adventure
   * (including ones from before this phase) reads back with sane defaults
   * rather than crashing on a missing field. */
  day?: number; // 1-based, defaults to 1
  watch?: 1 | 2 | 3 | 4; // which watch of `day` the party is currently in, defaults to 1
  restedThisDay?: boolean; // true once any watch this day was a "Stay put" watch; reset false at each new day
  currentHexId?: string | null; // the hex the party currently occupies, or null if never placed
}
```

Why this lives on `Adventure` and not a separate ephemeral store: Phase 12
already established that concurrent adventures each have their own beat
tree and their own place/time — a watch counter and a position are exactly
as adventure-scoped as that. It also answers "is this view-state or real
data" cleanly: a GM who closes the app mid-crawl and reopens next week must
still see "Day 3, Watch 2, standing in the Hedgerow Hollow" — that's not
something a screen can afford to forget on refresh, so it persists through
the same `createPersistedList` IndexedDB path every other `Adventure` field
already uses. It is deliberately *not* promoted to a bigger structure (no
separate `watchLog`/`travelHistory` table) — three scalars and one id is
the entire footprint, matching the roadmap's explicit "no bespoke hunger
meter" restraint applied to the whole feature, not just rations.

Defensive read: any `day`/`watch` read as `undefined`, `0`, out of
`1..4`, or otherwise malformed is treated as `{ day: 1, watch: 1,
restedThisDay: false }` — a corrupted watch counter degrades to "start of a
fresh day," never a crash, per `CLAUDE.md`'s storage-resilience rule.

### New pure-logic module: `src/lib/watchTime.ts`

Mirrors `lib/hex.ts`/`lib/combat.ts`'s existing style: pure functions, no
rune state, fully unit-testable in isolation from any store or component.

```ts
export const WATCH_LABELS = ['Morning', 'Midday', 'Evening', 'Night'] as const;
export type Watch = 1 | 2 | 3 | 4;

/** SRD: the encounter check happens only at the watch that *starts*
 * Morning (watch 1) and the watch that *starts* Evening (watch 3) — not
 * every watch. */
export function isEncounterCheckWatch(watch: Watch): boolean {
  return watch === 1 || watch === 3;
}

export interface AdvancedTime {
  day: number;
  watch: Watch;
  /** true the moment `watch` wraps 4 → 1, i.e. a new day has begun */
  crossedIntoNewDay: boolean;
}

/** Advances exactly one watch, wrapping the day boundary. */
export function advanceOneWatch(day: number, watch: Watch): AdvancedTime {
  if (watch === 4) return { day: day + 1, watch: 1, crossedIntoNewDay: true };
  return { day, watch: (watch + 1) as Watch, crossedIntoNewDay: false };
}

/** SRD: 1 hex per watch on foot, 2 watches for difficult terrain
 * (forest/hills — physically obstructed ground). Ruins are a
 * point-of-interest type, not difficult ground, so they cost 1 watch like
 * everything else non-obstructed. Water is not a valid move destination on
 * foot at all (see `isPassableOnFoot` below) — this function is never
 * called for it. */
export function travelCost(terrain: HexTerrain): 1 | 2 {
  return terrain === 'forest' || terrain === 'hills' ? 2 : 1;
}

/** SRD: no boat mechanic is modeled, so water hexes can't be moved into on
 * foot — same "don't invent a rule that isn't there" restraint the roadmap
 * already applies to getting-lost. */
export function isPassableOnFoot(terrain: HexTerrain): boolean {
  return terrain !== 'water';
}
```

**Confirmed by `gm-product-owner`:** forest/hills are the only 2-watch
difficult terrain (physical obstruction); ruins are a location type, not
difficult ground, and cost 1 watch like meadow/hedgerow/settlement. Water
stays disabled as a move destination, surfaced with an explicit "no boat"
reason rather than a generic "invalid."

### `lib/hex.ts` gains one addition (engineer-only, no design judgment needed)

```ts
/** The 6 axial neighbors of a flat-top hex, in a fixed, stable order (used
 * to build the move-chip row deterministically — same neighbor always
 * renders in the same chip position run to run). */
export function neighbors(q: number, r: number): Axial[] {
  return [
    { q: q + 1, r }, { q: q + 1, r: r - 1 }, { q, r: r - 1 },
    { q: q - 1, r }, { q: q - 1, r: r + 1 }, { q, r: r + 1 },
  ];
}
```

Neighbor chips are labeled by the destination hex's existing `hexLabel()`
(e.g. "C3") plus its terrain, **not** by compass direction — flat-top hex
adjacency doesn't map cleanly onto N/S/E/W the way a GM would expect, and
`hexLabel` is already the app's established "a GM can say this out loud"
convention (`hexLabel`'s own doc comment says exactly that). Reusing it
here avoids inventing a second, potentially-wrong spatial vocabulary.

---

## The Watch card — where it lives, and its states

**New component: `src/components/screens/LiveSessionWatchCard.svelte`**,
placed in `LiveSession.svelte` directly above the existing
`LiveSessionEncounterCard` (which only renders once `activeHex` resolves —
the Watch card is the thing that *establishes* where the party is, so it
belongs first in reading order, immediately after `FactionClockStrip`).
Same `Card` shell every other Live Session surface uses, same
`min-h-[var(--tap)]`/`size="live"` button convention.

```ts
// LiveSessionWatchCard.svelte props
interface NeighborOption {
  q: number;
  r: number;
  label: string; // hexLabel(q, r)
  terrain: HexTerrain | null; // null ⇒ no HexNode record exists there yet
  cost: 1 | 2 | null; // null when terrain is null (nothing to move to) or 'water' (no valid move)
}

interface Props {
  day: number;
  watch: 1 | 2 | 3 | 4;
  restedThisDay: boolean;
  currentHex: { id: string; name: string; terrain: HexTerrain } | null;
  neighbors: NeighborOption[]; // always 6 entries, some disabled
  /** Suggested starting hex when currentHex is null — the active beat's
   * linked hex, if it has one. */
  suggestedStartHex: { id: string; name: string; terrain: HexTerrain } | null;
  /** Set once an encounter-check watch has just resolved with no hit, so
   * the card can show "check clear" for a beat before the next tap
   * overwrites it. Null the rest of the time. */
  lastCheckResult: { roll: number; hit: boolean } | null;
  exhaustedPending: boolean; // crossedIntoNewDay && !restedThisDay from the watch just completed
  onstay: () => void;
  onforage: () => void;
  onmove: (hexId: string) => void;
  onsetstart: (hexId: string) => void; // suggestedStartHex → currentHex
  onapplyexhausted: () => void; // bulk-apply to active party + hirelings
  ondismissexhausted: () => void;
}
```

### State 1 — no position set yet (onboarding)

```
┌─ WATCH ──────────────────────────────────┐
│ Day 1 · Watch 1 (Morning)                │
│                                           │
│  Where does the party start?             │
│  [ Start at The Hedgerow Hollow ]        │  <- only if activeBeat has a linked hex
│  or place them on the Hex Map screen.    │
└───────────────────────────────────────────┘
```
If the active beat has no linked hex either, the second line becomes a
plain `Button variant="ghost"` reading "Open Hex Map" that calls
`onnavigate('hexMap')` (the same nav callback every screen already
threads) — no dead end, but no chip row rendered until a real hex exists
to move relative to.

### State 2 — steady state, no check pending this watch

```
┌─ WATCH ──────────────────────────────────┐
│ Day 2 · Watch 2 (Midday)                 │
│ Standing in: The Hedgerow Hollow (Hedgerow)│
│                                           │
│ This watch, the party:                   │
│ [ Stay put ] [ Forage ]                  │
│ [ B3·Meadow ] [ C2·Forest ×2 ] [ — ]      │
│ [ A2·Hills ×2 ] [ — ] [ — ]               │
└───────────────────────────────────────────┘
```
`[ — ]` chips are disabled/greyed neighbor slots — no `HexNode` recorded
there yet ("not mapped" — a GM makes those in Hex Map during prep, this
screen never creates one on the fly, matching the "extend, don't reinvent"
house rule). Water-terrain neighbors render disabled the same way, with a
`title`/`aria-label` of "No path across water" rather than a cost badge.

### State 3 — an encounter-check watch (visual weight, not a blocking gate)

```
┌─ WATCH ──────────────────────────────────┐
│ Day 2 · Watch 3 (Evening)  ⚠ Encounter check│
│ Standing in: The Hedgerow Hollow (Hedgerow)│
│                                           │
│ This watch, the party:                   │
│ [ Stay put ] [ Forage ]                  │
│ [ B3·Meadow ] [ C2·Forest ×2 ] [ — ]      │
└───────────────────────────────────────────┘
```
The only difference from State 2 is the `⚠ Encounter check` `Tag`
(`tone="warning"`, matching `CONDITIONS` tone vocabulary) next to the
day/watch line — a heads-up, not a different set of chips. The GM taps
whichever chip fits the fiction exactly as they would any other watch; the
check happens automatically as part of that tap, per the "one shared
interaction" rule above.

### After a tap — inline result, folded into the existing flow

- **`onstay`/neighbor tap on a non-check watch:** the header line updates
  (`Day 2 · Watch 3` → `Day 2 · Watch 4 (Night)`), and that's the entire
  visible change — no roll, no dialog.
- **On a check watch:** a `DiceRoll` (`dice={[roll]}`, `notation="d6"`)
  appears inline under the day/watch line for a few seconds (same
  ephemeral-then-settles treatment `DiceRoll` already has). SRD: a roll of
  `1` is a hit.
  - **No hit (roll 2–6):** `DiceRoll` shows `outcome="success"` styling
    with a small "No encounter" caption; nothing else happens.
  - **Hit (roll 1):** `DiceRoll` shows `outcome="fail"` styling ("Encounter!"),
    and in the same tap, `LiveSession.svelte` calls the *existing*
    `rollHexEncounter()` machinery — reusing `generateEncounterFor`,
    `encounterResult`, `encounterInstances` exactly as the manual "Roll
    Encounter" button in `LiveSessionEncounterCard` does today — but keyed
    off `currentHexId` rather than the active beat's linked hex, since the
    party's *actual* location (which may have wandered off-beat) is what
    should determine the encounter table now that position tracking
    exists. `LiveSessionEncounterCard` re-renders below the Watch card with
    the new encounter already populated — the GM's eye moves straight to a
    stat block, no separate "now go roll it" step. The reaction roll button
    inside that card is untouched — the GM still taps it manually when
    they're ready, exactly as today.
  - **Moving 2 watches at once (difficult terrain):** the two watches are
    resolved in sequence internally (each can independently be a check
    watch), but if the first one hits, the second is **not** also checked
    — one encounter is enough table-time for one tap, and stacking two
    fights from a single chip press would violate the "single tap, fully
    resolved" promise as much as a form would. The Watch card's caption
    footnotes this once, the first time it happens in a session: *"Two
    watches pass — one encounter check already made."*

### Foraging

`onforage` (SRD: spend a watch, roll d3 rations) is its own chip in the
same row, not a separate control — it's exactly as much "what happens this
watch" as staying or moving. On tap:
1. Watch advances exactly as any other chip (including the encounter-check
   logic above — foraging doesn't exempt the party from danger).
2. A `DiceRoll` (`dice={[roll]}`, `notation="d3"`) appears with the
   rations rolled.
3. A **recipient row** appears directly under it — reusing the exact
   avatar-row-of-chips pattern `LiveSessionInventoryModal`'s item-move
   picker already established (one row, active party + hirelings only,
   `min-h-[var(--tap)]` rows), labeled *"Add to:"*. Tapping a name creates
   that many ordinary `Item` records (`{ name: 'Rations', slots: 1, charges:
   null, maxCharges: null, notes: '' }`) via the existing
   `addMemberItem`/`addHirelingItem` calls and appends them to that mouse's
   bag — respecting the same **non-blocking** overburden warning Phase 13's
   item hand-off already established (a full bag doesn't block foraging,
   it just warns).
4. This is a deliberate two-tap flow (Forage, then pick a recipient) rather
   than one — the roadmap's "no form" rule is about not making the GM
   *fill out fields*, and choosing which mouse eats isn't a field, it's the
   same one-tap chip-picker idiom already shipped and already proven fast
   at the table.

**No hunger meter, by design.** Nothing here tracks whether a mouse has
*eaten* a Rations item or how many watches since — that's the explicit
roadmap exclusion. "Going without a ration" stays exactly what it is today:
the GM narrates it and taps the already-existing `Hungry & Thirsty` chip on
that mouse's card (`LiveSessionCard`'s condition drawer, unchanged). This
phase's only job is making sure rations *exist* in a bag to be spent — not
building a second accounting system on top of the first.

### Exhausted from skipping rest

Tracked via `restedThisDay`, set to `true` the moment any `onstay` tap
happens (that's the definition of "the party rested this day" for this
feature — see the rules-flag note below), reset to `false` every time
`crossedIntoNewDay` fires. When a day boundary crosses and the day just
completed never saw a `Stay put` tap, the Watch card surfaces one more
inline banner — same `notice`-with-action shape as everywhere else in Live
Session, not a popup:

```
┌─ WATCH ──────────────────────────────────┐
│ Day 3 · Watch 1 (Morning)  ⚠ Encounter check│
│ …                                        │
│ ⚠ No rest yesterday — apply Exhausted    │
│   to the party?          [ Apply ]  [ × ]│
└───────────────────────────────────────────┘
```
`[ Apply ]` calls `onapplyexhausted`, which adds the existing `exhausted`
condition to every currently-active party member and hireling in one bulk
action (each `addCondition`/`addHirelingCondition` call, same as any other
condition toggle) and logs one `conditionGained` event per mouse for recap
— the "1 mouse hurt = 1 log entry" convention already used for STR-drain
and death events extends naturally to a party-wide condition. `[ × ]`
(`ondismissexhausted`) just clears the banner without applying anything —
a GM might reasonably decide the fiction didn't call for it even though no
`Stay` tap happened (e.g., the party pushed hard on purpose and the GM
wants to narrate the consequence differently). Never auto-applied — this
follows the same "GM confirms, app never silently mutates a mouse's
conditions" precedent every other Live Session condition change already
sets (STR-save failures are the closest analog: the app tells the GM what's
at stake, the GM's tap is what actually changes state).

**Rules-content flag for `gm-product-owner`:** "the party rested" is
modeled here as *any* watch where the GM tapped "Stay put," not a stricter
SRD "full night's rest" gate — the roadmap only asked for "skipping a full
day with no rest watch triggers Exhausted," and this is the simplest
faithful reading given the data this app already tracks. Worth a quick
confirm, not a blocker.

---

## Position marker on `HexCanvas`

`HexCanvas` gains one new optional prop:

```ts
interface Props {
  hexes: HexNode[];
  selected?: { q: number; r: number } | null;
  factions?: Faction[];
  /** New: the active adventure's current position, or null if unset/not applicable
   * (e.g. viewing Hex Map with no adventure selected). Read-only here —
   * HexCanvas never mutates it; movement only happens from Live Session's
   * Watch card, or the one prep-mode placement action below. */
  currentHex?: { q: number; r: number } | null;
  onselect: (q: number, r: number) => void;
}
```

Visual treatment: drawn as an overlay on top of the terrain polygon and
territory rings (last, so it's never occluded) — a small paw-print glyph
(reuse the app's existing mouse/paw iconography rather than inventing a
generic "pin" marker, keeping the Mausritter tone) in `var(--accent)`,
inside a filled circle sized independent of hex terrain color so it reads
against any terrain fill, plus a **pulsing ring** (`animate-pulse` or an
explicit `<animate>` on the SVG circle's `r`/`opacity`) so it's findable at
a glance on a busy 36-hex board — motion used here to *locate*, not
decorate, consistent with CLAUDE.md's "motion clarifies" rule. The hex's
`aria-label` (`ariaFor()`) gets one appended sentence when it's the current
hex: *"Party is here."* — text-and-icon together, never color/icon alone,
per the app's existing accessibility rule (`territoryRings`' own
disposition color already sets this precedent).

```
     ╱‾‾╲
    │ 🐾 │   <- paw glyph, var(--accent) fill, white/bg-contrast ring
    │ ◌  │   <- pulsing outer ring, 1.4s ease-in-out, subtle (not distracting mid-game)
     ╲__╱
```

One marker, one adventure, exactly as scoped — `HexCanvas` has no concept
of multiple markers and this spec doesn't add one.

### Prep-mode placement action (Hex Map screen only)

The chicken-and-egg problem: the Watch card's neighbor-move chips need an
existing `currentHexId` to compute neighbors *from*. Rather than force
every GM through Live Session's onboarding chip the very first time, the
existing hex detail modal (`HexMap.svelte`'s edit-mode modal) gets one more
row, **only when exactly one adventure is `active`** (ambiguous with 2+
active adventures — matching `needsPicker`'s existing threshold in
`LiveSession.svelte`, so this doesn't have to invent a second
adventure-picker UI):

```
┌─ Edit Hex: The Hedgerow Hollow ──────────┐
│  … existing terrain/name/notes fields …  │
│                                           │
│  🐾 Party is here          [ Set here ]  │  <- or "Here now" tag + [ Clear ] if already set
└───────────────────────────────────────────┘
```
A single `Button variant="ghost" size="sm"` row, same visual weight as the
existing "Clear" hex-delete action already in that modal — not a new
prominent feature, just an escape hatch for initial setup and manual GM
correction (e.g., "actually we teleported/skipped ahead"). This is prep-mode
appropriate density: one more row in an already information-dense modal,
gated behind an existing single-adventure context so it never asks "which
adventure" as a separate decision.

---

## Move-to-adjacent-hex — the mechanics, precisely

- **Adjacency** is computed from `lib/hex.ts`'s new `neighbors(q, r)`
  against the fixed grid, filtered to only the ones with an existing
  `HexNode` record (see State 2/3 mockups — unmapped neighbors render
  disabled, not hidden, so the GM always sees "there are 6 directions, 3 of
  them aren't mapped yet" rather than a shifting 2-or-3-chip row that looks
  like a bug).
- **Tapping a neighbor chip** in the same motion: advances the watch
  (running the check-watch logic above) **and** sets
  `currentHexId`/`(q, r)` to that neighbor, via one store call —
  `advanceAdventureWatch(adventureId, { move: hexId })` (see Files section)
  so this is genuinely one state transition, not two separate mutations a
  GM could interrupt between.
- **Terrain cost is informational, not a second confirmation step** — the
  `×2` badge tells the GM this hex normally costs 2 watches, but the app
  doesn't force a "confirm 2 watches" dialog; it just advances 2 watches
  in the same tap (see the difficult-terrain paragraph above for how
  check-watch logic behaves across 2 watches). A GM who didn't want to
  spend 2 watches simply doesn't tap that chip — no additional gate needed
  since the cost is visible on the chip itself before the tap.
- **No freeform dragging, no arbitrary "click any hex to teleport"** during
  Live Session — only the fixed 6-neighbor chip set is offered, matching
  the roadmap's explicit "no freeform token-dragging" exclusion. The prep-
  mode "Set here"/"Clear" action above is the only way to set position
  outside of stepping to an adjacent hex, and it's deliberately a manual
  correction tool, not a second travel mechanic.

---

## Responsiveness

- **Phone (≤480px):** Watch card's chip row wraps to 2–3 lines
  (`flex flex-wrap gap-2`); each chip is `min-h-[var(--tap)]` (44px) with
  enough horizontal padding that a thumb doesn't need precision. The
  day/watch header line and "Standing in" line never truncate below one
  line each — if a hex name is long, it truncates with `…` the same way
  `HexCanvas`'s node labels already do (`truncate()`), not the terrain
  name (terrain is the more decision-relevant word at a glance).
- **Tablet/desktop:** same card, same chip row, simply more chips per line
  before wrapping — no separate desktop layout, since prep-mode density
  doesn't apply here (this card is live-play-shaped regardless of screen
  size, per the brief's "don't strip a prep screen down / don't let live
  density leak" rule working in the other direction too: a live-mode
  screen stays live-mode-shaped even on a laptop).
- **`HexCanvas`'s marker** scales with the existing `HEX_SIZE`-relative
  math already in `hex.ts` — no separate breakpoint logic, it's drawn in
  the same `viewBox` units as everything else on the SVG.

## Accessibility checklist

- Every chip in the Watch card's action row is a real `<button>`,
  `min-h-[var(--tap)]`/`min-w-[var(--tap)]`, exactly like every other
  chip-picker in Live Session (`Tag`/`StatusPill` conventions already
  established).
- Disabled neighbor chips (unmapped or water) are real `disabled` buttons
  with an `aria-label`/`title` explaining *why* ("Not mapped yet" / "No
  path across water"), not just visually greyed — a screen-reader GM
  shouldn't hit a mystery dead button.
- The `⚠ Encounter check` tag and the `×2` terrain-cost badge both pair an
  icon/color with literal text, never color alone — consistent with every
  existing tone-carrying element in the app (`CONDITIONS`, `StatusPill`,
  territory rings).
- The position marker's pulsing ring respects `prefers-reduced-motion`
  (falls back to a static ring, no animation) — the first animated,
  always-on-screen (not transient) motion this app has added, so this is
  the one place that guard is load-bearing rather than a nicety.
- `DiceRoll`'s existing settle-in transition is unaffected/reused as-is;
  no new animation vocabulary introduced for the encounter-check roll or
  the forage roll.

---

## Explicitly out of scope (matching ROADMAP.md's own exclusions)

- **Getting-lost mechanic** — not modeled, per the SRD check already done.
- **Weather generation** — the Watch card has no "poor weather" toggle in
  this pass; ROADMAP.md flags a manual "poor weather this watch" flag
  (STR-save trigger) as a reasonable future add, but it's not in this spec
  since it wasn't asked for by name in the Must-have bullets — worth a
  one-line follow-up note to `gm-product-owner`, not built here.
- **Multi-token/multi-party tracking** — one marker, one adventure, as
  built above.
- **Auto-pathfinding** — the neighbor-chip row is the entire "movement UI";
  there's no route planner, no multi-hex queued move.
- **A persisted watch-by-watch travel log** — `day`/`watch`/
  `restedThisDay`/`currentHexId` are the only new persisted fields; no
  history of *past* positions/watches is kept (the recap/Timeline log
  already captures the events worth remembering — deaths, conditions,
  faction shifts — not "which hex were we in on watch 11").

---

## Files a frontend engineer will touch

- `src/lib/hex.ts` — add `neighbors(q, r)`.
- `src/lib/watchTime.ts` (new) — `WATCH_LABELS`, `isEncounterCheckWatch`,
  `advanceOneWatch`, `travelCost`, fully unit-tested pure functions.
- `src/lib/stores/adventures.svelte.ts` — extend `Adventure` with
  `day?`/`watch?`/`restedThisDay?`/`currentHexId?` (all optional,
  defensively defaulted on read); add `advanceAdventureWatch(id, { move?:
  string })` that composes `advanceOneWatch`/`travelCost`/
  `isEncounterCheckWatch` and returns enough detail
  (`{ day, watch, checkRolled, checkHit, crossedIntoNewDay }`) for
  `LiveSession.svelte` to drive the rest of the flow (encounter spawn,
  exhausted banner).
- `src/components/screens/LiveSessionWatchCard.svelte` (new) — the card
  itself, per the prop shape and states above.
- `src/components/screens/LiveSession.svelte` — mounts
  `LiveSessionWatchCard` above `LiveSessionEncounterCard`; wires
  `onstay`/`onforage`/`onmove`/`onsetstart` to `advanceAdventureWatch` +
  the existing `rollHexEncounter`-style machinery (now keyed off
  `currentHexId` rather than `activeBeat.hexNodeId` — a small but real
  change to which hex determines the encounter table); wires
  `onapplyexhausted` to bulk `addCondition`/`addHirelingCondition` calls +
  `logEvent`.
- `src/components/screens/HexCanvas.svelte` — new `currentHex` prop, paw
  marker + pulsing ring drawn last (on top), `ariaFor()` gains the "Party
  is here" sentence, `prefers-reduced-motion` fallback.
- `src/components/screens/HexMap.svelte` — passes `currentHex` through to
  `HexCanvas` (reading the single active adventure, if exactly one);
  hex-detail modal gains the "Party is here" `Set here`/`Clear` row, gated
  on the same single-active-adventure condition.
- `src/lib/i18n/en.json` / `de.json` — new `liveSession.watch.*` keys
  (day/watch labels, chip labels, encounter-check tag, exhausted banner
  copy, forage copy) and `hexMap.partyIsHere`/`hexMap.setHere`/
  `hexMap.clearHere`.
- Tests: `watchTime.test.ts` (new, pure-function coverage — day wrap,
  check-watch timing, terrain cost), extended `adventures.test.ts`
  (`advanceAdventureWatch` behavior including the "difficult terrain skips
  the second check" rule), `LiveSessionWatchCard.test.ts` (new — all three
  card states, forage recipient flow, exhausted banner apply/dismiss),
  extended `LiveSession.test.ts` (encounter check hit spawns an instance
  keyed off `currentHexId`), extended `HexCanvas.test.ts` (marker renders
  at the right hex, `aria-label` includes "Party is here"), extended
  `HexMap.test.ts` (Set here/Clear row, gated on single active adventure),
  and a `features/hex-crawl-watch.feature` Gherkin scenario ("Given the
  party is in a Meadow hex on Watch 3 of Day 2, When the GM taps 'Stay
  put,' Then Watch becomes 4 and an encounter check is rolled because Watch
  3 starts Evening").
