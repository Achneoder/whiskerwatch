import { AfterAll, BeforeAll, After, Before, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { spawn, type ChildProcess } from 'node:child_process';
import type { WhiskerwatchWorld } from './world';

setDefaultTimeout(30_000);

// A base URL supplied from outside (e.g. CI already serving a production build)
// takes precedence and we never spawn our own dev server.
const EXTERNAL_BASE = process.env.WW_BASE_URL;

let server: ChildProcess | undefined;

async function waitForServer(url: string, timeoutMs = 40_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Dev server never became reachable at ${url}`);
}

/**
 * Serve the production build with `vite preview` (NOT the dev server): the dev
 * server's dependency optimizer and HMR trigger full-page reloads that detach
 * elements mid-interaction and make the suite flaky. Preview serves static
 * files with none of that. `test:e2e` runs `vite build` first so dist/ is fresh.
 *
 * We do NOT pin the port with --strictPort: if the preferred port is taken
 * (e.g. a leftover server), Vite picks the next free one and prints it, and we
 * parse that. This keeps the suite from wedging on port collisions.
 */
function startPreviewServer(): Promise<string> {
  // Strip NODE_OPTIONS so the spawned Vite doesn't inherit the tsx ESM loader
  // this test process runs under.
  const { NODE_OPTIONS: _drop, ...childEnv } = process.env;
  server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', String(process.env.WW_PORT ?? 4173)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnv,
  });

  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Vite never printed a Local URL')), 45_000);
    const onData = (chunk: Buffer) => {
      // Strip ANSI escapes: with CI set, Vite colours its output and wraps the
      // port in bold codes, which would otherwise break the URL match.
      buffer += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
      const match = buffer.match(/https?:\/\/localhost:(\d+)\//);
      if (match) {
        clearTimeout(timer);
        resolve(`http://localhost:${match[1]}`);
      }
    };
    server?.stdout?.on('data', onData);
    server?.stderr?.on('data', onData);
    server?.on('exit', (code) => reject(new Error(`Vite exited early (code ${code})`)));
  });
}

BeforeAll({ timeout: 60_000 }, async function () {
  if (EXTERNAL_BASE) {
    await waitForServer(EXTERNAL_BASE);
    return;
  }
  const base = await startPreviewServer();
  // Expose the resolved URL to the World (its baseURL getter reads this).
  process.env.WW_BASE_URL = base;
  await waitForServer(base);
});

AfterAll(async function () {
  server?.kill('SIGTERM');
});

Before(async function (this: WhiskerwatchWorld) {
  await this.openBrowser();
});

After(async function (this: WhiskerwatchWorld, { result, pickle }) {
  if (result?.status === Status.FAILED && this.page) {
    const shot = await this.page.screenshot();
    this.attach(shot, 'image/png');
    if (process.env.WW_SHOT_DIR) {
      const { writeFileSync } = await import('node:fs');
      const safe = pickle.name.replace(/[^a-z0-9]+/gi, '-');
      writeFileSync(`${process.env.WW_SHOT_DIR}/${safe}.png`, shot);
    }
  }
  await this.closeBrowser();
});
