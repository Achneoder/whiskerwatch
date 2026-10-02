import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { existsSync } from 'node:fs';

// In the managed web environment Chromium is pre-installed here and the bundled
// Playwright build may not match; launching with an explicit executablePath
// avoids a "run npx playwright install" failure. On a normal dev machine the
// path won't exist and we fall back to Playwright's own resolution.
const PREINSTALLED_CHROMIUM = process.env.WW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

export class WhiskerwatchWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  /** Remembers the name of the most recently rolled Generators NPC across steps, so a later step can look it up on the Roster/Bestiary screen. */
  lastRolledNpcName?: string;
  /** The campaign file from the most recent export, kept in memory so it survives switching to a fresh browser context ("my other device"). */
  exportedCampaign?: { name: string; buffer: Buffer };

  constructor(options: IWorldOptions) {
    super(options);
  }

  get baseURL(): string {
    return process.env.WW_BASE_URL ?? 'http://localhost:5174';
  }

  async openBrowser(): Promise<void> {
    this.browser = await chromium.launch(
      existsSync(PREINSTALLED_CHROMIUM) ? { executablePath: PREINSTALLED_CHROMIUM } : {},
    );
    // Fresh context per scenario → empty localStorage/IndexedDB, so the app
    // starts from its seed state every time.
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    if (process.env.WW_DEBUG) {
      this.page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          process.stderr.write(`[browser:${msg.type()}] ${msg.text()}\n`);
        }
      });
      this.page.on('pageerror', (err) => process.stderr.write(`[pageerror] ${err.message}\n`));
    }
  }

  /** Swaps in a brand-new browser context — empty IndexedDB/localStorage, like opening the app on a second device. */
  async switchToNewDevice(): Promise<void> {
    await this.context.close();
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async closeBrowser(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(new URL(path, this.baseURL).href);
  }
}

setWorldConstructor(WhiskerwatchWorld);
