# Global quick-find + Dashboard backup reminder — interaction spec (Phase 14)

Two independent, small features, bundled only because ROADMAP.md deferred
them together out of Phase 13. They don't share code and don't need to ship
in the same PR. Each gets its own mode statement below because they sit at
opposite ends of the density spectrum this app has to serve.

---

## Part 1 — Global quick-find search

**Mode: primarily live play, but the trigger has to live everywhere.** The
brief is explicit: "needs to work well on a phone at a physical table —
one-handed, no fumbling." That's the hardest constraint in the app, so this
feature is designed to that bar even though a GM will *also* reach for it
during prep (finding a hex note) and recap (finding which session mentioned
a name). Rather than build three different search UIs for three modes, one
interaction — big touch targets, autofocus, no typing required to see
something useful — satisfies all three; prep and recap use on a laptop is a
strictly easier version of the same screen, not a different one.

### The gap

Nothing today lets a GM ask "where's Wren" or "which hex is that ruins one"
without knowing which of seven screens the answer lives on. Roster,
Adventure, Bestiary, Factions, Hex Map, Sessions, and Timeline are all
independently-scrolled lists — Phase 9 linked their *data* together
(beats↔hexes↔factions) but there's still no single place to type a name and
land on it.

### What's searchable, and the field each entity matches on

Read directly from the stores rather than assumed:

| Entity | Store | Matched fields | Secondary line shown |
|---|---|---|---|
| Party member | `party.svelte.ts` | `name`, `role` | role + HP (`4/6 HP`) |
| Hireling | `hirelings.svelte.ts` | `name`, `role`, `notes` | role + status |
| Beat | `beats.svelte.ts` | `title`, `notes` | parent adventure title + status |
| Bestiary entry | `bestiary.svelte.ts` | `name`, `special`, `notes` | category (`Vermin`, `Beast`, …) |
| Faction | `factions.svelte.ts` | `name`, `note`, `tags[]` | disposition + clock (`7/10`) |
| Hex node | `hexmap.svelte.ts` | `name`, `notes` | terrain + coords (`hills · 1,-1`) |
| Session | `sessions.svelte.ts` | `title`, `summary` | `#4 · 6 days ago` |

Deliberately excluded: `Adventure` records themselves (they're containers,
not content a GM "looks up" mid-table — their beats are already
individually searchable and route to the same Adventure screen) and
`CampaignHistory`/Timeline entries (they're derived records of the same
sessions/beats/factions already indexed above — indexing them too would
just produce duplicate hits for the same fact). Hex nodes with an empty
`name` (the two blank seed hexes) are only reachable by `notes` match or not
at all until the GM names them — that's correct, not a bug: an unnamed,
empty hex has nothing to find.

### Entry point

- **Desktop/tablet sidebar** (`AppSidebar`'s `md:flex` column): a `Search`
  icon button directly under the "Whiskerwatch" wordmark, above the nav
  list — the first thing after the logo, because on a laptop mid-prep this
  is reached for constantly.
- **Phone/tablet-portrait top bar**: a `Search` icon button in the same
  icon row as Settings/Locale/Theme/Play (`flex items-center gap-1.5`),
  `w-9 h-9` matching its siblings exactly — no new icon-button size to
  introduce.
- **Keyboard shortcut** (desktop only, prep-mode convenience): `/` opens
  quick-find from anywhere a text input doesn't already have focus, mirroring
  the well-known "press slash to search" convention. Never bound on
  touch-only viewports (no keyboard to type the shortcut on, and `/` is a
  real character the GM might need in a text field on a phone anyway).

### Layout — full-screen sheet on phone, anchored palette on desktop

This deliberately does **not** reuse `Modal.svelte` as-is: `Modal` centers a
fixed-width card, which on a 375px phone leaves cramped margins around a
component whose whole job is fast typing + fast scanning. Two presentations
of the same component, split at the existing `md:` breakpoint (`768px`,
matching `AppSidebar`'s own sidebar/top-bar split so the two responsive
behaviors change at the same point the GM already experiences elsewhere):

**Phone / tablet-portrait (`<768px`):**
```
┌────────────────────────────────────┐
│ ←  [ Search mice, beats, hexes…  ] │  <- input, autofocus, 44px min-h
├────────────────────────────────────┤
│ WARBAND                             │
│ 🐭 Wren                    [Mouse]  │
│    Tinker · 2/6 HP                  │
├────────────────────────────────────┤
│ BEATS                               │
│ 📋 The granary raid        [Beat]   │
│    The Reclamation · active         │
├────────────────────────────────────┤
│ HEXES                               │
│ 🗺 The Gnawgate            [Hex]    │
│    ruins · 1,0                      │
└────────────────────────────────────┘
```
Full viewport height and width, slides down from the top (`translateY`,
same easing tokens as `Modal`'s `ww-rise` keyframe), a plain `←` back
arrow (not an "×") in the header next to the input — consistent with the
Phase 13 item-move picker's "`← Back` is a real labeled button" precedent,
and appropriate here too since search is a place you back out of, not a
dialog you dismiss.

**Tablet-landscape / desktop (`≥768px`):** an anchored palette, not a
full-bleed sheet — `position: fixed`, centered horizontally, `top: 12vh`
(near the top of the viewport, command-palette convention), `width: 560px`,
`max-height: 60vh` with the result list scrolling internally under a
sticky input. Same scrim as `Modal` (click-outside or Escape closes).

Both presentations share one internal component; only the outer
positioning/sizing branches on breakpoint — the result list, row markup,
and keyboard handling are identical, so there's exactly one interaction to
test twice at two viewport sizes, not two interactions.

### Empty-query state — useful before typing, not blank

Rather than an empty white sheet the instant it opens, the empty-query
state shows the same seven entity-type destinations as quick-nav shortcuts
(icon + label, reusing `AppSidebar`'s exact nav icon set: `Users` for
Warband, `ListTree` for Adventure, `PawPrint` for Bestiary, `Swords` for
Factions, `Map` for Hex Map, `ScrollText` for Sessions, `History` for
Timeline). Tapping one closes quick-find and navigates there directly —
this costs nothing to add (it's the existing `nav` array from
`AppSidebar`, reused) and means opening quick-find is never a dead end even
if the GM forgot they wanted to type something and just wanted to jump
screens instead.

```
┌────────────────────────────────────┐
│ ←  [ Search mice, beats, hexes…  ] │
├────────────────────────────────────┤
│  Jump to:                           │
│  👥 Warband      📋 Adventure       │
│  🐾 Bestiary     ⚔ Factions        │
│  🗺 Hex Map      📜 Sessions        │
│  🕐 Timeline                        │
└────────────────────────────────────┘
```

### Matching, ranking, and result shape

- Case-insensitive substring match, no fuzzy/typo-tolerant matching — the
  GM knows the name they're typing, and a plain substring match is fast,
  predictable, and trivial to reason about with a few dozen entities per
  list (no need for a search-index library at this data volume).
- **Debounced 150ms** on keystroke before re-filtering — cheap insurance
  against re-scanning seven arrays on every single keypress on an older
  tablet, imperceptible to the GM.
- **Minimum 1 character** — no results shown for an empty string (the
  jump-to shortcuts above cover that case instead).
- **Per-category cap of 5 rows**, sorted: exact-match-first, then
  match-starts-the-field, then alphabetical — with a `+N more` text row
  (not a button — tapping it does nothing useful; it's a hint to keep
  typing to narrow further) if a category exceeds 5. This keeps the phone
  sheet scannable without an unbounded scroll for a common short query like
  "the" matching a dozen beat notes.
- Matched substring is **bolded** within the label/secondary line (`<mark>`
  styled with `background: transparent; color: var(--accent); font-weight:
  700` — a color+weight cue, not a highlighted background block, so it
  reads as emphasis rather than looking like a form validation error).
- Each row: entity-type icon in a small tinted circle (same treatment as
  `Dashboard`'s `PrepRow` icon chip — `w-8 h-8 rounded-full
  bg-[var(--surface-sunk)]`), label + secondary line stacked left, a small
  `Tag` on the right naming the entity type (`Mouse`, `Hireling`, `Beat`,
  `Creature`, `Faction`, `Hex`, `Session`) so a GM scanning a mixed list
  never has to infer type from the icon alone — text always accompanies the
  icon, per the accessibility rule the rest of the app already follows
  (`StatusPill`'s defeated state, `HexNode` territory rings).
- **Full-width row, `min-h-[var(--tap)]` (44px)** — a real `<button>`, not a
  div with a click handler, exactly like every other list-of-choices
  pattern already shipped (Phase 12's adventure picker rows, Phase 13's
  recipient rows, Pay Day's hireling rows).

### Selecting a result — navigate and open, don't just switch screens

Tapping a row does two things in one tap, matching how the rest of the app
treats "go look at a thing" (e.g. Dashboard's faction cards navigate *and*
land the GM looking right at faction content, not a bare list):

1. Navigates to the entity's screen (`navScreen` in the table above).
2. Opens that entity's **existing** edit/detail surface — the same modal
   the GM would reach by tapping "Edit" on that row today. No new detail
   view is invented; quick-find's job is routing to a surface that already
   exists, per every prior phase's "extend, don't reinvent" precedent
   (Phase 13's `HurtHealDrawer` extraction is the clearest example of this
   house style).

| Entity | What opens |
|---|---|
| Party member / Hireling | `Roster`'s existing `memberModal`/`hirelingModal` in edit mode |
| Beat | `Adventure`'s existing beat-edit modal, with the beat's ancestor chain in the tree auto-expanded so a nested beat isn't hidden under a collapsed parent |
| Bestiary entry | `Bestiary`'s existing edit modal |
| Faction | `Factions`' existing edit modal |
| Hex node | `HexMap`'s existing hex detail modal, panned/centered on that hex |
| Session | `Sessions`' existing edit modal |

**Engineering shape (mirrors an already-shipped pattern, not a new one):**
`App.svelte` already threads one-shot cross-screen payloads this way —
`pendingRecapDraft` is set by `LiveSession`, handed to `Sessions` as a prop,
and cleared via `onconsumeddraft` once `Sessions` has used it. Quick-find's
selection uses the identical shape:

```ts
// App.svelte — new state, same pattern as pendingRecapDraft
let pendingFocus = $state<{ screen: NavScreen; entityId: string } | null>(null);

function selectSearchResult(result: SearchResult) {
  pendingFocus = { screen: result.navScreen, entityId: result.id };
  navigate(result.navScreen);
}
```

Each target screen gains one optional prop (`focusId?: string`) and one
`$effect` that, on mount or on `focusId` change, opens its existing local
modal state (`memberModal`, `hirelingModal`, the beat-edit equivalent,
etc.) for the matching id, then calls a new `onconsumedfocus?.()` so
`App.svelte` clears `pendingFocus` — exactly the consume-then-clear
lifecycle `Sessions`/`draftRecap` already has. This is six small, mechanical
edits (one per target screen) rather than a new cross-cutting mechanism.
**Scope note for the frontend engineer:** confirm each screen's actual local
modal-state variable name before wiring this (Roster's is `memberModal`/
`hirelingModal` per the code read for this spec; the others weren't
individually re-verified here but follow the same `edit`-mode-modal shape
throughout the app).

**If the entity no longer exists by the time it's tapped** (rare — deleted
in another browser tab, or between typing and tapping): the screen still
navigates, `focusId` simply matches nothing, and no modal opens — a quiet
no-op, not an error. This is the same "dangling id degrades gracefully"
rule Phase 9/11's referential-integrity audit established everywhere else
in the app.

### Zero-result state

```
┌────────────────────────────────────┐
│ ←  [ ratlign                     ] │
├────────────────────────────────────┤
│                                     │
│         🔍  No matches              │
│    Nothing found for "ratlign."     │
│    Check the spelling, or try a     │
│    shorter word.                    │
│                                     │
└────────────────────────────────────┘
```
Centered, `text-[var(--text-muted)]`, same tone as every other empty state
in the app (`factions.empty`, Dashboard's zero-warband case) — reassuring,
plain language, no dead-end styling (red text, error icon). The jump-to
shortcuts from the empty-query state are **not** repeated here — a GM who
typed something specific and got nothing is looking for a spelling
correction, not a screen to browse; repeating the shortcuts would bury the
"try again" message.

### Zero entities in the whole campaign

Not really reachable in practice — every store ships non-empty seed data
and nothing in the app lets a GM delete every single entity across all
seven lists simultaneously. If it ever happened, quick-find would just show
the empty-query jump-to shortcuts (still useful — they're pure navigation)
and every query would hit the zero-result state above. No special-case
code needed.

### State — fully transient, no store

```ts
// New: src/components/ui/QuickFind.svelte
let query = $state('');
let open = $state(false);
```
Search results are a `$derived` computed live from the same store getters
already used elsewhere (`getParty()`, `getHirelings()`, `getBeats()`,
`getBestiary()`, `getFactions()`, `getHexNodes()`, `getSessions()`) — no
caching, no index built ahead of time, no persistence. At this app's actual
data volume (tens of entities per list, not thousands), scanning every
array on each debounced keystroke is trivially fast and keeps the feature
free of a sync-with-storage bug class entirely. Closing quick-find (Escape,
backdrop tap, `←`, or a successful selection) resets `query` to `''` so
reopening it always starts clean, matching `Modal`'s existing
open/close-resets-nothing-else behavior elsewhere in the app.

### Responsiveness

- **Phone (≤480px)**: full-screen sheet as specified above; the entity-type
  icon chip shrinks to `w-7 h-7` only if needed to keep a row from
  wrapping to a third line — verify against the longest real category tag
  ("Hireling") at 375px width before shipping.
- **Tablet portrait (481–767px)**: same full-screen sheet as phone (this is
  the `<768px` branch, matching `AppSidebar`'s own breakpoint).
- **Tablet landscape / desktop (≥768px)**: anchored palette, `560px` wide,
  `top: 12vh`, internally scrolling result list under a sticky input.
- All interactive rows and the trigger button are `min-h-[var(--tap)]`
  (44px) / `min-w-[var(--tap)]`, no exceptions.

### Accessibility checklist

- The trigger button has `aria-label="Search campaign"` (icon-only on
  mobile) and, where a visible label exists (none currently — icon-only in
  both the sidebar and top bar per the existing icon-button convention),
  the label stays consistent with `aria-label`.
- The overlay uses `role="dialog"` `aria-modal="true"` like `Modal`
  (behavior, not the component itself, is being reused — see layout note
  above for why the component itself differs).
- The input has `role="combobox"`, `aria-expanded`, `aria-controls`
  pointing at the results container (`role="listbox"`), and each result row
  is `role="option"` — the exact same ARIA shape Phase 12's
  `LiveSessionHeader` adventure picker already established
  (`aria-haspopup="listbox"` / `role="listbox"`/`role="option"`), reused
  rather than inventing a second combobox pattern in the same codebase.
- **Keyboard (desktop):** `↓`/`↑` move a highlighted-row cursor through
  results (visually: `bg-[var(--accent-tint)]` on the focused row, not
  color alone — a left accent bar `border-l-2 border-[var(--accent)]` is
  added too), `Enter` selects the highlighted row, `Escape` closes and
  returns focus to the trigger button that opened it (never leaves focus
  lost in a closed overlay).
- Entity type is always communicated by the `Tag` text, never by icon or
  color alone, per the rule the rest of the app already follows.
- `<mark>`-style match-bolding is a weight/color change, not a background
  highlight — passes contrast on both themes without a separate
  light/dark override.

---

## Part 2 — Dashboard data-safety export reminder

**Mode: prep.** Lives exclusively on the Dashboard, which the brief already
frames as "GM alone, probably a laptop, information-dense is fine" — and
per the brief, this reuses Phase 11's Session Prep checklist pattern
(`dashboard.prepChecklist`) rather than inventing a new visual language,
exactly as that feature reused Roster's "Fallen mice" collapse pattern
before it. Never appears in Live Session or anywhere else — a data-safety
nudge mid-fight would be actively unwelcome noise in the mode where GM
attention is most contested.

### The gap

`exportCampaign()` (`src/lib/campaignExport.ts`) exists and works, but
nothing in the app tracks whether — or when — a GM has actually used it. A
campaign that's never been exported is one browser-storage-clearing away
from gone, and the app currently gives zero signal that this risk exists
until it's too late to do anything about it.

### Design decision: track backups, not just exports

A GM who just **imported** a campaign (e.g. onto a new device, or after
restoring from a prior export) is not at risk — the file that would restore
their data already exists on disk, they're holding it. Treating only
`exportCampaign()` as "backed up" would nag a GM who just imported a fresh
file moments ago, which is exactly the false-alarm behavior the brief warns
against ("shouldn't see a scary banner every session"). So both
`exportCampaign()` and a successful `importCampaign()` mark the campaign as
backed up — the actual risk being tracked is "does an external copy of this
data exist that isn't only in this browser," and both actions satisfy that.

### Persistence — localStorage, one key, one string

```ts
// New: src/lib/stores/backupTracking.svelte.ts
const STORAGE_KEY = 'whiskerwatch:lastBackupAt';

export function getLastBackupAt(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function markBackedUp(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}
```
This is a single small preference-shaped value, not structured campaign
data — it belongs on `localStorage` per `CLAUDE.md`'s own storage guidance,
the same tier as `theme.svelte.ts`'s theme flag and `campaign.svelte.ts`'s
campaign name, not IndexedDB. `campaignExport.ts`'s `exportCampaign()` and
`importCampaign()` each call `markBackedUp()` once their work completes
successfully (`importCampaign` already `await`s every store's `flush()`
before it can be considered done — `markBackedUp()` is called after that,
so a failed/interrupted import never falsely marks the campaign safe).

### Risk heuristic — cadence-aware, not calendar-only

The brief's core ask is "non-nagging... a GM who exports regularly
shouldn't see a scary banner every session." A pure calendar threshold
("14 days since last export") both nags a GM who plays monthly with no new
data at risk, and under-warns a GM running three sessions a week. Session
cadence is the better signal, since it's a direct proxy for "how much would
actually be lost" — so the reminder combines both, and only fires when
**there is a session played that isn't yet covered by a backup**:

```ts
// Dashboard.svelte — read-only, computed from existing store data, no new store
const lastBackupAt = getLastBackupAt();
const sessions = getSessions();
const sessionsSinceBackup = $derived(
  sessions.filter((s) => !lastBackupAt || new Date(s.date) > new Date(lastBackupAt)).length
);
const daysSinceBackup = $derived(lastBackupAt ? daysSince(lastBackupAt) : null);

// Only ever surfaces once there's a real session on record — see rationale below.
const atRisk = $derived(
  sessions.length > 0 &&
    (lastBackupAt === null || sessionsSinceBackup >= 2 || (daysSinceBackup !== null && daysSinceBackup >= 14))
);
```

- **Gated on `sessions.length > 0`**: a brand-new campaign running on
  nothing but seed data has nothing irreplaceable to lose yet. The first
  logged session is the app's existing signal for "this campaign is
  actually being played" (`Dashboard` already treats `getLastSession()`
  this way for the header's "days since last session" line) — reusing it
  here means the reminder never fires on install day, before a GM has
  anything real invested.
- **`sessionsSinceBackup >= 2`**: two sessions' worth of unbacked-up
  progress is the point where losing it would sting — after one session
  it's a nudge that would feel premature.
- **`daysSinceBackup >= 14`**: a calendar floor for slower-cadence tables
  (once a month, say) where the session count alone wouldn't trip for a
  long time, so a long-idle-but-unbacked-up campaign still eventually
  surfaces the nudge.
- **A GM who exports after every session never sees this at all** —
  `sessionsSinceBackup` resets to 0 the moment `markBackedUp()` runs, so
  the "regular exporter" case the brief explicitly protects is satisfied by
  construction, not by a special case.

### Layout — same `Card`, same row treatment, as Session Prep

Placed directly below the existing "Session Prep" `Card` in `Dashboard.svelte`
(same `!rounded-[var(--radius-md)]` treatment, same column). A **separate
card**, not a fifth Session Prep row — the two are different categories of
concern (Session Prep is "what's ready for the next session," this is
"is the campaign itself safe") and conflating them under one eyebrow would
blur that distinction for no layout benefit; both are single small `Card`s
stacked in the same column, so the visual cost of a second card is nearly
zero.

**At-risk state** — single tappable row, identical shape to a `PrepRow`
(icon chip, bold lead + muted trailing text, trailing chevron,
`min-h-11`/44px, `active:bg-[var(--surface-sunk)]`), just one row instead of
four since there's only one thing to report:

```
┌─ DATA SAFETY ────────────────────────────┐
│ Back up your campaign                    │
│                                           │
│ 🛡  3 sessions since your last export   ›│
│    A quick export keeps this campaign    │
│    safe from a browser wipe.             │
└───────────────────────────────────────────┘
```

Two copy variants depending on whether a backup has ever happened:

- **Never backed up:** *"You've never exported this campaign"* /
  *"N sessions logged — a browser wipe would lose all of it."*
- **Stale backup:** *"N sessions since your last export"* /
  *"Last exported D days ago — a quick export keeps this campaign safe."*

**All-clear state** — collapses to the exact one-line reassurance pattern
`allClear` already established (`flex items-center justify-center gap-2
py-6 text-[var(--text-muted)]`), swapping `PawPrint` for `ShieldCheck` (the
icon should say "safety," matching the card's own subject, rather than
reusing Session Prep's mascot icon verbatim):

```
┌─ DATA SAFETY ────────────────────────────┐
│ Back up your campaign                    │
│                                           │
│        🛡✓  Backed up — you're covered.  │
└───────────────────────────────────────────┘
```

### Two ways to act — navigate, or export inline

Every other Dashboard checklist row navigates to where the underlying thing
lives (beats → Adventure, hexes → Hex Map, etc.) and this row is no
exception: **tapping the row navigates to Settings**, where the existing
Export control already lives (`settings.data.export`) — same one gesture
the GM has already learned from Session Prep, no new interaction to teach.

But unlike the other four rows, the actual fix here is a single
already-built, zero-input action (`exportCampaign()` — no form, no
decision to make), so making the GM navigate away just to press one more
button is friction Session Prep's other rows don't have (checking "active
beats," for instance, genuinely does require going to the Adventure
screen — there's judgment to apply there; exporting has none). So the card
also gets a lightweight **"Export now"** quick action in the `Card`'s
`actions` slot (top-right, next to the eyebrow — the same slot Warband's
card uses for its "Manage" link), calling `exportCampaign()` directly from
the Dashboard:

```svelte
<Card eyebrow={$_('dashboard.backupCard.eyebrow')} title={$_('dashboard.backupCard.title')}>
  {#snippet actions()}
    {#if atRisk}
      <Button variant="ghost" size="sm" onclick={handleExportNow}>
        {$_('dashboard.backupCard.exportNow')}
      </Button>
    {/if}
  {/snippet}
  <!-- row or all-clear line as above -->
</Card>
```

```ts
let justExported = $state(false);

function handleExportNow() {
  exportCampaign(); // also calls markBackedUp() internally, per Part 2's design decision
  justExported = true;
}
```

On success, the row content is replaced in place with a brief confirmation
(`role="status"`, reusing `Settings.svelte`'s existing
`settings.data.exportDone` copy/pattern: `text-[length:var(--text-sm)]
text-[var(--success)]`) for a few seconds before the card naturally
recomputes to its all-clear state on next reactive read of
`getLastBackupAt()` — no manual timer needed since `atRisk`/`allClear` are
derived from the same store the export just updated.

This is deliberately **not** the sole way to export — the `Settings` screen
keeps its own full Export/Import section unchanged; Dashboard's button is a
convenience for the specific "I'm being nudged, let me just do it" moment,
not a replacement surface.

### Non-negotiables from the brief

- **Never a blocking modal or auto-popup.** The reminder is a passive `Card`
  read only when the GM is already looking at the Dashboard — nothing
  interrupts, nothing appears on app boot, nothing appears mid-session.
- **Never appears twice in the same visit for the same state** — it's a
  single `$derived` read of store state, not an event/notification with its
  own dismiss-and-remember state, so there's no separate "dismissed" flag
  to design or persist (simpler than a dismissible-banner pattern, and
  avoids the "I dismissed it and now I'll never see it again" trap those
  patterns invite).
- **No new persisted structured data** — one `localStorage` string, reusing
  the same tier as `theme`/`campaign name`, per `CLAUDE.md`.

### Responsiveness

No new breakpoint behavior — this is one more `Card` in `Dashboard.svelte`'s
existing single-column `flex flex-col gap-[var(--sp-5)]` main column, which
already reflows correctly from phone through desktop (verified by Session
Prep's existing card sitting in the same position). The `actions` slot's
"Export now" button sits inline with the eyebrow/title on all widths, same
as `Card`'s existing header layout — no separate mobile treatment needed.

### Accessibility checklist

- The row (at-risk state) is a real `<button>`, `min-h-11` (44px), same as
  every `PrepRow`.
- "Export now" is a real `Button` component — keyboard-operable for free.
- The confirmation message uses `role="status"` so it's announced without
  stealing focus, matching `Settings.svelte`'s existing export-confirmation
  pattern exactly (no new announcement mechanism).
- Icon-only signal (`ShieldCheck` vs. the warning-tinted chip) is always
  paired with the literal text ("Backed up — you're covered" /
  "N sessions since your last export") — never color/icon alone.

---

## i18n keys (add to `en.json` / `de.json`)

```json
"search": {
  "trigger": "Search campaign",
  "placeholder": "Search mice, beats, hexes…",
  "back": "Back",
  "jumpTo": "Jump to:",
  "noResults": "No matches",
  "noResultsHint": "Nothing found for \"{query}.\" Check the spelling, or try a shorter word.",
  "moreResults": "+{n} more — keep typing to narrow it down",
  "types": {
    "party": "Mouse",
    "hireling": "Hireling",
    "beat": "Beat",
    "bestiary": "Creature",
    "faction": "Faction",
    "hex": "Hex",
    "session": "Session"
  }
},
"dashboard": {
  "backupCard": {
    "eyebrow": "Data Safety",
    "title": "Back up your campaign",
    "exportNow": "Export now",
    "neverBackedUp": "You've never exported this campaign",
    "neverBackedUpTrailing": "{count} sessions logged — a browser wipe would lose all of it.",
    "staleBackup": "{count} sessions since your last export",
    "staleBackupTrailing": "Last exported {days} days ago — a quick export keeps this campaign safe.",
    "allClear": "Backed up — you're covered."
  }
}
```

## Explicitly out of scope for Phase 14

- **Fuzzy/typo-tolerant search or a search-index library** — plain
  substring matching over a few dozen entities per list is fast enough with
  no dependency; revisit only if a campaign's data volume grows enough to
  make that untrue (no evidence of that today).
- **Search history / recent searches** — the empty-query jump-to shortcuts
  already cover "I don't know what I'm looking for yet" cheaply; a
  persisted recent-searches list is a second small state machine for a
  marginal convenience the brief didn't ask for.
- **Cross-referencing search results** (e.g. showing a beat's linked hex
  inline in its search row) — Phase 9 already surfaces those links on each
  entity's own screen; repeating them in a search result row would clutter
  a component whose job is getting the GM *to* that screen quickly, not
  replacing it.
- **Automatic/scheduled export** (e.g. a background download every N days)
  — browsers can't silently write files to disk without a user gesture, and
  a recurring "Save As" prompt the GM didn't ask for would itself become
  the annoyance the brief is trying to avoid. The nudge-and-one-tap-export
  pattern here is the correct ceiling for a client-only app.
- **A dismiss/snooze control on the backup reminder** — deliberately
  omitted per the "non-negotiables" note above; the cadence heuristic
  already self-resolves the moment the GM exports, which is a better UX
  than a snooze a GM could set once and forget forever.
- **Tracking *what* changed since the last backup** (a diff/changelog) —
  the reminder only needs to answer "should I export," not "what exactly is
  at risk"; a diff view is a materially bigger feature nobody asked for.

## Files a frontend engineer will touch

**Quick-find:**
- `src/components/ui/QuickFind.svelte` (new) — the overlay itself: input,
  debounced `$derived` result computation across all seven stores, the
  phone-sheet/desktop-palette responsive split, keyboard nav.
- `src/components/layout/AppSidebar.svelte` — new trigger button in both
  the desktop sidebar and mobile top bar; new `/`-key `svelte:window`
  listener (desktop only).
- `src/App.svelte` — `pendingFocus` state and `selectSearchResult`, mirrors
  `pendingRecapDraft`/`draftRecap` exactly; threads `focusId`/
  `onconsumedfocus` to each target screen.
- `src/components/screens/Roster.svelte`, `Adventure.svelte`,
  `Bestiary.svelte`, `Factions.svelte`, `HexMap.svelte`, `Sessions.svelte`
  — each gains `focusId?: string` prop + one `$effect` opening its existing
  edit modal for a matching id, then `onconsumedfocus?.()`.
- `src/lib/i18n/en.json` / `de.json` — `search.*` keys above.
- Tests: `QuickFind.test.ts` (new — matching across mixed entity types,
  empty-query shortcuts, zero-result copy, per-category cap/`+N more`),
  updated tests on each of the six target screens for the new `focusId`
  effect, plus `features/quick-find.feature` ("Given a hex named 'The
  Gnawgate,' When the GM searches 'gnaw,' Then it appears under Hexes and
  tapping it opens the hex detail modal on Hex Map").

**Backup reminder:**
- `src/lib/stores/backupTracking.svelte.ts` (new) — `getLastBackupAt`/
  `markBackedUp`, `localStorage`-backed per the storage-tier rule above.
- `src/lib/campaignExport.ts` — `exportCampaign()` and `importCampaign()`
  each call `markBackedUp()` on success.
- `src/components/screens/Dashboard.svelte` — new "Data Safety" `Card`,
  `atRisk`/`sessionsSinceBackup`/`daysSinceBackup` derived values, "Export
  now" action.
- `src/lib/i18n/en.json` / `de.json` — `dashboard.backupCard.*` keys above.
- Tests: `backupTracking.test.ts` (new), extended `Dashboard.test.ts`
  (never-backed-up copy, stale-backup copy, all-clear collapse, "Export
  now" calling `exportCampaign`/updating `getLastBackupAt`), extended
  `campaignExport.test.ts` (both `exportCampaign`/`importCampaign` call
  `markBackedUp`), and a `features/dashboard.feature` scenario extension
  ("Given the GM has never exported and has 2 sessions logged, When they
  view the Dashboard, Then a backup reminder is shown; When they tap
  'Export now,' Then it collapses to the all-clear line").
