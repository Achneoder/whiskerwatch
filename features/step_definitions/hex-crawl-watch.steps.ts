import { Given, Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

Given('the GM places the party here', async function (this: WhiskerwatchWorld) {
  await this.page.getByTestId('party-is-here-row').getByRole('button', { name: 'Set here' }).click();
});

// "the GM taps {string}" (a Watch card chip — "Stay put", "Forage", or a
// labeled neighbor like "C3·Settlement") is already defined in
// dashboard.steps.ts and reused here rather than redefined, to avoid an
// ambiguous step match — every chip tap is one shared action per the design
// spec regardless of which screen/card it lives on.

Given(
  'the GM has tapped {string} {int} times',
  async function (this: WhiskerwatchWorld, label: string, times: number) {
    const button = this.page.getByRole('button', { name: label });
    for (let i = 0; i < times; i += 1) {
      await button.click();
    }
  },
);

Then('the GM should see a rolled encounter check', async function (this: WhiskerwatchWorld) {
  // The whole scenario runs with every roll forced to fail (see
  // `common.steps.ts`'s "the GM has forced every roll to fail" in the
  // Background) — a d6 encounter check under that pin always lands on 6,
  // never the SRD's hit-on-1, so "No encounter" is the deterministic result.
  await this.page.getByText('No encounter').waitFor({ state: 'visible' });
});

Then('the GM should see the rations roll and a recipient row', async function (this: WhiskerwatchWorld) {
  await this.page.getByText(/Rations rolled/).waitFor({ state: 'visible' });
  await this.page.getByText('Add to:').waitFor({ state: 'visible' });
});

When('the GM adds the foraged rations to {string}', async function (this: WhiskerwatchWorld, name: string) {
  await this.page.getByRole('button', { name: new RegExp(`^${name}$`) }).click();
});

Then(
  '{string} should have {string} in their bag',
  async function (this: WhiskerwatchWorld, mouseName: string, itemName: string) {
    await this.page
      .getByRole('button', { name: new RegExp(`^Open ${mouseName}'s bag`) })
      .click();
    await this.page.getByRole('dialog').getByText(itemName, { exact: true }).first().waitFor({ state: 'visible' });
  },
);
