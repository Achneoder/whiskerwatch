# Deploying Whiskerwatch

Whiskerwatch is a single-page app with **no backend, no database and no accounts**.
Every campaign lives in the browser of whoever opens it (localStorage + IndexedDB).
That makes hosting unusually simple: you are serving a folder of static files.

It also means two things worth saying out loud before you deploy:

- **Nothing is synced.** A GM's campaign exists only in the browser profile they
  opened the app in. Two devices are two separate campaigns. Use the campaign
  export/import in Settings to move data between them.
- **The server never sees campaign data.** There is nothing to back up server-side,
  and nothing about a hosted instance that needs securing beyond the static files
  themselves.

## Option 1: The published container image

Images are published to GitHub Container Registry for every release. Releases
are cut automatically by [semantic-release](https://semantic-release.gitbook.io/)
whenever a push to `main` contains a release-worthy commit (see
[Releases](#releases)), so every image carries a semantic version:

```
ghcr.io/achneoder/whiskerwatch:1.2.3       # exact release (pin this)
ghcr.io/achneoder/whiskerwatch:1.2         # newest 1.2.x
ghcr.io/achneoder/whiskerwatch:1           # newest 1.x.y
ghcr.io/achneoder/whiskerwatch:latest      # newest release
ghcr.io/achneoder/whiskerwatch:sha-abc1234 # the commit a release was built from
```

```sh
docker run -d --name whiskerwatch -p 8080:80 ghcr.io/achneoder/whiskerwatch:1.2.3
```

Then open <http://localhost:8080>.

Or with the `docker-compose.yml` in the repository root:

```sh
docker compose up -d
```

**Pin a version for anything real.** `latest`, `1` and `1.2` move with every
release; an explicit `X.Y.Z` tag is what makes a deploy reproducible and a
rollback possible. The release notes for each version are on the repository's
GitHub Releases page.

The image is `linux/amd64` only.

### What the image actually is

An nginx container serving the Vite build. The only interesting part is
[`nginx.conf`](../nginx.conf), which handles three things you would otherwise get
wrong:

| Concern | What it does |
| --- | --- |
| Service worker | `sw.js` and `index.html` are served `Cache-Control: no-cache`. Whiskerwatch registers a service worker with a stale-while-revalidate strategy — if the SW or the app shell get cached, a GM can be pinned to an old build indefinitely, offline, with no way to notice. |
| Client-side routes | Unknown paths return the app shell so in-app navigation resolves them. Missing files under `/assets/` still return a real 404 rather than HTML. |
| Content-Security-Policy | The app loads no third-party anything and makes no network requests, so the CSP is strict: `default-src 'self'`, no `unsafe-eval`, `frame-ancestors 'none'`. |

Fingerprinted files under `/assets/` (bundles, CSS and the bundled webfonts) are
cached for a year as `immutable`.

`GET /version.txt` returns the version the image was built with — handy for
confirming what is actually live.

### Health check

The image declares its own `HEALTHCHECK` (`curl` against `/`), so Docker, Compose
and most orchestrators get a readiness signal with no extra configuration. If you
need an explicit URL to probe, use `/` — it is a static file and always 200 once
nginx is up.

## Option 2: Behind a reverse proxy

The container listens on port 80 and terminates nothing. Put a TLS-terminating
proxy in front of it and forward to that port. Nothing needs to be passed in:
there are no environment variables, no build-time configuration and no secrets —
one image runs identically everywhere.

Two things to get right at the proxy:

- **Do not add caching for `/` or `/sw.js`.** The image sets `no-cache` on both for
  the reason described above; a proxy that overrides it undoes the protection.
- **Do not rewrite or strip paths.** The app is served from the domain root and
  assumes `/` as its base.

For a rolling update, run the new image alongside the old one, wait for its health
check to pass, then drop the old container. The app is stateless, so there is
nothing to drain or migrate.

## Option 3: Any static host

You do not need Docker at all. `pnpm build` writes a self-contained bundle to
`dist/`, which you can upload to any static host (GitHub Pages, Netlify, S3 +
CDN, or a plain nginx/Caddy vhost):

```sh
pnpm install --frozen-lockfile
pnpm build
# → dist/
```

If you go this route you own the two things the container image was handling for
you. Configure your host to:

1. Serve `index.html` for unknown paths (SPA fallback).
2. Send `Cache-Control: no-cache` for `index.html` and `sw.js`, while caching
   `/assets/*` long.

Skipping (2) is the failure mode that bites later, not immediately: the app works
fine on first load and then quietly refuses to update.

Serving from a subpath is not supported out of the box — `vite.config.ts` has no
`base` set, and the service worker and manifest both assume scope `/`.

## Building the image yourself

```sh
docker build -t whiskerwatch --build-arg APP_VERSION=dev .
docker run --rm -p 8080:80 whiskerwatch
```

`APP_VERSION` is only stamped into `/version.txt`; the app does not read it.

## CI

- `.github/workflows/ci.yml` — typecheck, unit tests, production build, and the
  Cucumber/Playwright feature suite. Runs on pushes to `main` and on PRs.
- `.github/workflows/docker-build.yml` — on a push to `main` with something to
  release: works out the next version, builds the image, starts it, asserts the
  served response (cache headers, MIME types, SPA fallback, CSP), runs the feature
  suite **against the running container**, and only then tags the release and
  pushes to GHCR.

That last point is deliberate. The feature suite in `ci.yml` runs under
`vite preview`, which knows nothing about the SPA fallback, the MIME table or the
CSP — so a broken `nginx.conf` would otherwise stay invisible until it was live.

## Releases

Versions come from commit messages, which follow
[Conventional Commits](https://www.conventionalcommits.org/). On every push to
`main`, semantic-release looks at the commits since the last `vX.Y.Z` tag:

| Commit | Release |
| --- | --- |
| `fix: ...`, `perf: ...` | patch — 1.2.3 → 1.2.4 |
| `feat: ...` | minor — 1.2.3 → 1.3.0 |
| `feat!: ...` or a `BREAKING CHANGE:` footer | major — 1.2.3 → 2.0.0 |
| `docs:`, `chore:`, `test:`, `refactor:`, `ci:`, ... | no release, no image |

A release tags the commit, publishes a GitHub Release with generated notes and
pushes the image. The tag is only created after the image has passed its tests,
and the image is only pushed once the tag exists, so a version never exists
without its image or the other way round.

Configuration lives in [`.releaserc.json`](../.releaserc.json). The `version` in
`package.json` is not updated; the git tags are the source of truth.

To rebuild an existing release (e.g. to pick up a patched nginx base image), run
the workflow by hand from its tag (`v1.2.3`) in the Actions tab. That re-pushes
`1.2.3` and `sha-<short>` but leaves `latest`, `1` and `1.2` alone.
