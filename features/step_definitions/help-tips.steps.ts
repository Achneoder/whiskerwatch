import { Given, Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

Given('the GM is using a phone-sized screen', async function (this: WhiskerwatchWorld) {
  await this.page.setViewportSize({ width: 375, height: 740 });
});

When('the GM taps the help for {string}', async function (this: WhiskerwatchWorld, label: string) {
  await this.page.getByRole('button', { name: `Help: ${label}`, exact: true }).click();
});

Then('the GM should see a help tip mentioning {string}', async function (this: WhiskerwatchWorld, text: string) {
  await this.page.getByRole('tooltip').filter({ hasText: text }).waitFor({ state: 'visible' });
});

When('the GM presses Escape', async function (this: WhiskerwatchWorld) {
  await this.page.keyboard.press('Escape');
});

Then('no help tip should be showing', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('tooltip').waitFor({ state: 'detached' });
});

Then('the edit form should still be open', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('dialog').waitFor({ state: 'visible' });
});

Then('the help tip should fit within the screen', async function (this: WhiskerwatchWorld) {
  const box = await this.page.getByRole('tooltip').boundingBox();
  const viewport = this.page.viewportSize();
  if (!box || !viewport) throw new Error('Expected a visible help tip and a known viewport size');
  if (box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height) {
    throw new Error(`Help tip ${JSON.stringify(box)} overflows the ${viewport.width}x${viewport.height} screen`);
  }
});
