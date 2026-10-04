import { Then, When } from '@cucumber/cucumber';
import type { Locator, Page } from 'playwright';
import type { WhiskerwatchWorld } from '../support/world';

/** The beat row containing a given title — used to scope the status-cycle click to the right row. */
function beatRow(page: Page, title: string): Locator {
  return page.getByText(title, { exact: true }).locator('xpath=../..');
}

When('the GM completes the {string} beat', async function (this: WhiskerwatchWorld, title: string) {
  // The row's status pill is the first button in the row and cycles Planned → Active →
  // Done on tap; a single tap only reaches "Done" from "Active", so the beat must be
  // created active first (see "the GM adds an active beat titled ...").
  await beatRow(this.page, title).getByRole('button').first().click();
});

When('the GM exits the live session', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Back to prep' }).click();
});

Then('I should see {string} in the timeline', async function (this: WhiskerwatchWorld, text: string) {
  await this.page.getByText(text, { exact: false }).first().waitFor({ state: 'visible' });
});
