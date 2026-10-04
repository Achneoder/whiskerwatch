import { Given, Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

Given('I open Whiskerwatch on a desktop screen', async function (this: WhiskerwatchWorld) {
  // A short desktop viewport so the seeded Overview is guaranteed to be taller than the window.
  await this.page.setViewportSize({ width: 1280, height: 600 });
  await this.goto('/');
  // Waits for the Overview's content to render and push the page past the window height.
  await this.page.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight + 200);
});

When('I scroll to the bottom of the page', async function (this: WhiskerwatchWorld) {
  await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
});

Then('the sidebar\'s {string} entry should be on screen', async function (this: WhiskerwatchWorld, label: string) {
  const entry = this.page.locator('aside').getByRole('button', { name: label, exact: true });
  const box = await entry.boundingBox();
  const viewport = this.page.viewportSize();
  if (!box || !viewport) throw new Error(`Expected a visible "${label}" sidebar entry and a known viewport size`);
  if (box.y < 0 || box.y + box.height > viewport.height) {
    throw new Error(`"${label}" sits at y=${box.y}, outside the ${viewport.height}px-tall window`);
  }
});
