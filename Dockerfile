# Production image for Whiskerwatch.
#
# Whiskerwatch is a fully client-side app — there is no server, no API and no
# database (see CLAUDE.md). So the "deployment" is just a static bundle plus a
# web server that knows two things: serve the SPA fallback, and get the cache
# headers right so the service worker can actually update.
#
# Image: ghcr.io/achneoder/whiskerwatch
# Build: docker build -t whiskerwatch --build-arg APP_VERSION=1.0.0 .
# Run:   docker run --rm -p 8080:80 whiskerwatch

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Keep in step with the packageManager field in package.json.
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

WORKDIR /app

# NODE_ENV is deliberately NOT set to production here: vite, svelte and
# tailwind are devDependencies, and pnpm would skip them.
# `vite build` puts itself in production mode regardless.

# Dependency layer — cached until the manifests change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Source layer.
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/

RUN pnpm build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM nginx:1.31-alpine AS runtime

# Stamped into /version.txt so a deployed instance can be identified without
# guessing from asset hashes. Purely informational — the app never reads it.
ARG APP_VERSION=""

# curl is used by the health check below; nginx:alpine does not ship it.
RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf '%s\n' "${APP_VERSION:-unknown}" > /usr/share/nginx/html/version.txt

EXPOSE 80

# Declared on the image so `docker run` and Compose both get a health signal
# without repeating it. The Ansible rolling deploy waits on exactly this.
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=5s \
  CMD curl -fsS http://localhost/ -o /dev/null || exit 1
