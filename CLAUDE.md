# Whiskerwatch

Whiskerwatch is a campaign-management app for game masters running **Mausritter**. It helps a GM prep adventures, track factions and hex-crawl state, manage rosters and hirelings, generate encounters/items/NPCs, and run live sessions at the table — then capture recaps afterward.

## Tech stack

- **Svelte 5** (plain Vite + Svelte, not SvelteKit) — use runes (`$state`, `$derived`, `$effect`, `$props`, snippets) for all new code. Do not write Svelte 4 patterns (`export let`, reactive `$:` statements, slots) in new components.
  - SvelteKit is intentionally not used: this app has no server, no SSR, and no need for file-based routing/adapters — it's a single-page app that switches between screens via in-app state, so plain Vite keeps the build simple. Don't introduce SvelteKit or `@sveltejs/kit` without a real reason to revisit this.
- **Tailwind CSS** — all styling. No component-scoped CSS files or ad hoc `<style>` blocks unless Tailwind genuinely cannot express something.
- **No backend, no auth.** This is a fully client-side app. There is no server to talk to and no user accounts — a GM opens the app and starts managing a campaign immediately, with zero signup or login friction. Do not introduce a backend, API layer, or auth flow.

## Data & persistence

All campaign data (parties, hirelings, factions, hex maps, bestiary entries, adventures/beats, session logs, settings) lives entirely in the browser. Use browser-native persistence (e.g. IndexedDB for structured campaign data, localStorage for small settings/preferences) — never assume a network round-trip for reads or writes. Treat "loses no data on refresh, needs no server" as a hard requirement for every feature that stores state.

Because there's no server-side validation layer, defensive parsing/validation of data read back out of browser storage matters more than usual — a corrupted or stale local record should degrade gracefully, not crash the app.

## Core domain concepts

- **Dashboard** — GM's home base / campaign overview.
- **Roster** — parties, player mice, hirelings.
- **Adventure** — adventures broken into beats (a beat tree/outline for planning sessions).
- **Bestiary** — monsters and NPCs, rules-accurate to Mausritter stat blocks.
- **Factions** — factions, their relationships/links, visualized as a graph, tracking faction clocks.
- **Hex Map** — hex-crawl map with per-hex nodes/content.
- **Generators** — dice roller, encounter/item/NPC generators for improvising at the table.
- **Live Session** — the in-session view used while actually running the game.
- **Settings** — app preferences, including i18n (English/German via `svelte-i18n`).

## Component organization

- `src/components/ui/` — small presentational primitives (Button, Card, Modal, HpBar, StatusPill, Tag, DiceRoll, Input, Stepper, Icon, ConfirmDialog, etc.). No business logic.
- `src/components/forms/` — one form component per editable entity (e.g. `PartyForm`, `HirelingForm`, `FactionForm`, `HexNodeForm`, `SessionForm`, `BeatForm`, `BestiaryForm`).
- `src/components/layout/` — app-shell chrome shared across multiple screens (e.g. `AppSidebar`), as opposed to a single screen's own layout.
- `src/components/screens/` — one component per app screen (Dashboard, Roster, Adventure, Bestiary, Factions, HexMap, Generators, LiveSession, Settings), selected via in-app navigation state in the root `App.svelte`. Screens compose `ui/`, `forms/`, and `layout/` components; they own data-loading, not low-level rendering.
- `src/lib/stores/` — persisted app state (`.svelte.ts` modules using runes + `createPersistedList` from `persistedList.svelte.ts` for entity CRUD), backed by `src/lib/storage.ts`'s localStorage helpers.

Keep this separation strict: a screen file should read like an outline of what's on it, not a wall of markup and logic.

## Responsiveness

Whiskerwatch gets used at a physical table — often on a phone or tablet balanced next to dice and minis, alongside laptop use during prep. Every screen must work from phone width up through desktop. Verify layouts at multiple breakpoints, not just a slightly resized browser window.

## Testing

- **Unit/component tests** — Vitest + `@testing-library/svelte`, colocated as `ComponentName.test.ts` next to the component.
- **End-to-end tests** — Playwright driven by Cucumber (Gherkin `.feature` files + step definitions), written as behavior-driven scenarios in plain Given/When/Then language describing actual GM workflows, not implementation detail.
- A feature isn't done until both levels of test exist and pass, and `pnpm typecheck` is clean.

## Commands

- `pnpm dev` — start dev server
- `pnpm build` / `pnpm preview` — production build / preview
- `pnpm typecheck` — svelte-check
- `pnpm test` / `pnpm test:run` — unit tests (watch / single run)
- `pnpm coverage` — unit test coverage

## Commits & releases

Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, …) — they are not just style: semantic-release reads them on every push to `main` to decide the next version and whether a Docker image is published (`feat` → minor, `fix`/`perf` → patch, `!`/`BREAKING CHANGE:` → major, anything else → no release). See `docs/DEPLOYMENT.md#releases`.

## Subagents

This project has three specialized subagents (`.claude/agents/`) — prefer delegating to the right one instead of doing all the work in the main thread:

- **gm-product-owner** — product direction, feature prioritization, and rules-accurate Mausritter content (bestiary, NPCs, factions, beats). Consult for "what should this feature do" and "is this content correct."
- **ux-ui-designer** — look & feel, layout, interaction design, mockups. Consult before building any new screen or nontrivial UI change.
- **svelte-frontend-engineer** — implementation: Svelte 5 components, responsiveness, and the test suite (Vitest + Playwright/Cucumber). Consult for actually writing and testing code.
