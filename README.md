# Whiskerwatch

A campaign manager for game masters running [**Mausritter**](https://mausritter.com/).
Prep adventures, track factions and the hex crawl, manage the warband and its
hirelings, improvise at the table with generators, run the live session — and
capture the recap afterwards.

![The Whiskerwatch dashboard](docs/manual/01-dashboard.png)

- **No account, no server.** Open it and start. Your campaign lives entirely in
  your browser (IndexedDB), works offline as an installable PWA, and moves
  between devices via export/import.
- **Built for the table.** Works from phone width up to desktop, so it can sit
  next to the dice and minis as well as on your laptop during prep.
- **Rules-accurate.** Saves, the HP → STR damage spiral, conditions, the
  10-slot inventory, hireling loyalty and wages, reaction rolls and the
  hex-crawl watch clock follow the Mausritter rules.
- **English and German.** Switch in Settings; the sample campaign follows along.

## Features

| Screen | What it's for |
| --- | --- |
| **Overview** | Campaign at a glance, plus a session-prep checklist and backup reminder. |
| **Warband** | Player mice and hirelings: stats, HP, conditions, inventory, scars, XP. |
| **Adventure** | Several adventures in parallel, each planned as a tree of beats. |
| **Bestiary** | Mausritter stat blocks for creatures and NPCs. |
| **Factions** | Factions, their relationships as a graph, and faction clocks. |
| **Hex Map** | The hex crawl, with per-hex notes, encounters and faction territory. |
| **Generators** | Dice roller and random encounters, reactions, items and NPCs. |
| **Live Session** | The at-the-table view: saves, damage, encounters, watches, pay day. |
| **Sessions / Timeline** | Session logs with drafted recaps, and a running campaign history. |
| **Settings** | Theme, language, export/import, reset, and restoring the sample campaign. |

See the [user manual](docs/manual/MANUAL.md) for a walkthrough of each screen.

## Running it

### With Docker

Release images are published to GitHub Container Registry:

```sh
docker run -d -p 8080:80 ghcr.io/achneoder/whiskerwatch:latest
```

Then open <http://localhost:8080>. There is nothing to configure — no
environment variables, database or secrets. For pinned versions, reverse proxy
setups and static hosting, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### From source

Requires Node.js 24 and [pnpm](https://pnpm.io/).

```sh
pnpm install
pnpm dev          # dev server
pnpm build        # production build into dist/
pnpm preview      # serve the production build
```

## Development

Svelte 5 (runes) + TypeScript on plain Vite, styled with Tailwind CSS, i18n via
`svelte-i18n`. There is deliberately no backend and no SvelteKit.

```
src/
  components/
    screens/   one component per app screen
    forms/     one form per editable entity
    layout/    shared app chrome (sidebar)
    ui/        presentational primitives
  lib/
    stores/    persisted state (IndexedDB-backed lists, localStorage settings)
    generators/  dice, encounter, item and NPC tables
    i18n/      en.json / de.json
features/      Cucumber feature files and Playwright step definitions
```

### Checks

```sh
pnpm typecheck    # svelte-check
pnpm test:run     # unit/component tests (Vitest + Testing Library)
pnpm coverage     # unit tests with coverage
pnpm test:e2e     # builds, then runs the Cucumber + Playwright scenarios
```

Before the first end-to-end run, install the browser:
`pnpm exec playwright install chromium`.

New features come with both a unit test and a Gherkin scenario describing the
GM workflow, and `pnpm typecheck` must stay clean. [CLAUDE.md](CLAUDE.md) has
the full conventions; [ROADMAP.md](ROADMAP.md) has what's shipped and what's next.

### Commits and releases

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
semantic-release reads them on every push to `main`: `feat` cuts a minor
release, `fix`/`perf` a patch, a breaking change a major — each with a
versioned Docker image. Details in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#releases).

## Acknowledgements

Mausritter is written by Isaac Williams and published by Losing Games.
Whiskerwatch is an independent fan project and is not affiliated with them.
