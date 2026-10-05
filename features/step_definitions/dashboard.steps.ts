import { Given, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

When('the GM taps the {string} row in Session Prep', async function (this: WhiskerwatchWorld, leadSubstring: string) {
  await this.page.getByRole('button', { name: new RegExp(leadSubstring) }).click();
});

// Used by the Data Safety card's backup-reminder scenario — logs a session
// via the Sessions screen's existing "Log session" form, the same one
// `session-recap.steps.ts`'s "the GM saves the session" step drives.
Given('the GM logs a session titled {string}', async function (this: WhiskerwatchWorld, title: string) {
  await this.page.getByRole('button', { name: 'Sessions' }).first().click();
  await this.page.getByRole('button', { name: 'Log session' }).click();
  await this.page.getByLabel('Title').fill(title);
  await this.page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
});

When('the GM taps {string}', async function (this: WhiskerwatchWorld, label: string) {
  await this.page.getByRole('button', { name: label }).click();
});

// Exact match: a plain substring "Roll" would also hit other buttons.
When('the GM taps the {string} button on the overview', async function (this: WhiskerwatchWorld, label: string) {
  await this.page.getByRole('button', { name: label, exact: true }).click();
});
