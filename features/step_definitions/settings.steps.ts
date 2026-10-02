import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import type { WhiskerwatchWorld } from '../support/world';

When('I switch the language to German', async function (this: WhiskerwatchWorld) {
  // Scope to the Language segmented control so we don't collide with the
  // sidebar's own language toggle.
  await this.page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Deutsch' }).click();
});

When('I switch the theme to {word}', async function (this: WhiskerwatchWorld, theme: string) {
  const label = theme === 'dark' ? 'Dark burrow' : 'Light burrow';
  // Scope to the Appearance segmented control so we don't collide with the
  // sidebar's own theme toggle button.
  await this.page.getByRole('group', { name: 'Appearance' }).getByRole('button', { name: label }).click();
});

Then('the app uses the {string} theme', async function (this: WhiskerwatchWorld, theme: string) {
  await this.page.waitForFunction(
    (expected) => document.documentElement.getAttribute('data-theme') === expected,
    theme,
  );
  const actual = await this.page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert.equal(actual, theme);
});

When('I choose an invalid file to import', async function (this: WhiskerwatchWorld) {
  // Set the file directly on the hidden input — this fires the same change
  // handler the styled "Import campaign" button triggers, without opening a
  // native OS file chooser that the test would then have to intercept.
  await this.page.locator('input[type="file"]').setInputFiles({
    name: 'not-a-campaign.json',
    mimeType: 'application/json',
    buffer: Buffer.from('this is not json'),
  });
});

When('I export the campaign', async function (this: WhiskerwatchWorld) {
  // Headless desktop Chromium has no file share sheet, so the export falls
  // back to a download — the same file a phone would hand to AirDrop etc.
  const [download] = await Promise.all([
    this.page.waitForEvent('download'),
    this.page.getByRole('button', { name: 'Export campaign' }).click(),
  ]);
  const path = await download.path();
  // Read it now: the download's temp file is deleted with its browser context.
  this.exportedCampaign = { name: download.suggestedFilename(), buffer: readFileSync(path) };
  await this.page.getByRole('status').filter({ hasText: 'Saved to your downloads.' }).waitFor();
});

When('I pick up my other device', async function (this: WhiskerwatchWorld) {
  await this.switchToNewDevice();
  await this.goto('/');
});

When('I import the exported campaign', async function (this: WhiskerwatchWorld) {
  assert.ok(this.exportedCampaign, 'No campaign has been exported in this scenario yet');
  await this.page.locator('input[type="file"]').setInputFiles({
    name: this.exportedCampaign.name,
    mimeType: 'application/json',
    buffer: this.exportedCampaign.buffer,
  });
});

Then('the import preview shows {int} timeline entry/entries', async function (this: WhiskerwatchWorld, count: number) {
  const dialog = this.page.getByRole('dialog');
  await dialog.getByText('Replace campaign data?').waitFor();
  const value = dialog.getByText('Timeline entries', { exact: true }).locator('xpath=following-sibling::dd[1]');
  assert.equal((await value.textContent())?.trim(), String(count));
});

When('I confirm the import', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('dialog').getByRole('button', { name: 'Import and replace' }).click();
  await this.page.getByRole('status').filter({ hasText: 'Campaign restored.' }).waitFor();
});
