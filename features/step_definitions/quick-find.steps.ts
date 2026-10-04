import { Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

When('the GM opens quick-find', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Search campaign' }).first().click();
});

When('the GM searches for {string}', async function (this: WhiskerwatchWorld, query: string) {
  await this.page.getByRole('combobox').fill(query);
  // Debounced 150ms (see `QuickFind.svelte`) before results re-filter.
  await this.page.waitForTimeout(250);
});

Then(
  'the GM should see {string} under the {string} quick-find category',
  async function (this: WhiskerwatchWorld, resultLabel: string, category: string) {
    const listbox = this.page.getByRole('listbox');
    await listbox.getByText(category, { exact: true }).waitFor({ state: 'visible' });
    await listbox.getByRole('option', { name: new RegExp(resultLabel) }).waitFor({ state: 'visible' });
  },
);

When('the GM selects {string} from the quick-find results', async function (this: WhiskerwatchWorld, resultLabel: string) {
  await this.page.getByRole('option', { name: new RegExp(resultLabel) }).click();
});

Then('the GM should see the quick-find jump-to shortcuts', async function (this: WhiskerwatchWorld) {
  await this.page.getByText('Jump to:').waitFor({ state: 'visible' });
});

When('the GM jumps to {string} from quick-find', async function (this: WhiskerwatchWorld, screenLabel: string) {
  await this.page.getByRole('option', { name: screenLabel }).click();
});

Then('I should see the {string} screen', async function (this: WhiskerwatchWorld, screenTitle: string) {
  await this.page.getByRole('heading', { name: screenTitle, level: 1 }).waitFor({ state: 'visible' });
});

Then('I should see {string} in the hex detail', async function (this: WhiskerwatchWorld, name: string) {
  const dialog = this.page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  const nameField = dialog.getByLabel('Name', { exact: true });
  await nameField.waitFor({ state: 'visible' });
  const value = await nameField.inputValue();
  if (value !== name) {
    throw new Error(`Expected the hex detail's Name field to be ${JSON.stringify(name)}, got ${JSON.stringify(value)}`);
  }
});
