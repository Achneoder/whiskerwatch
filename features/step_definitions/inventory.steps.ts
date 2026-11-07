import { Given, Then, When } from '@cucumber/cucumber';
import type { Locator, Page } from 'playwright';
import type { WhiskerwatchWorld } from '../support/world';

/** The roster row for a named mouse/hireling — used to scope the Edit click to the right row. */
function rosterRow(page: Page, name: string): Locator {
  return page.getByText(name, { exact: true }).locator('xpath=../..');
}

function itemEditor(page: Page): Locator {
  return page.getByTestId('item-editor');
}

Given('the GM opens {string} to edit', async function (this: WhiskerwatchWorld, name: string) {
  await rosterRow(this.page, name).getByRole('button', { name: 'Edit' }).click();
});

/** Fills and saves the inline item editor from an already-open empty slot / filled slot. */
async function saveItemDraft(page: Page, name: string): Promise<void> {
  const editor = itemEditor(page);
  await editor.getByLabel('Name').fill(name);
  await editor.getByRole('button', { name: 'Save' }).click();
}

When('the GM adds {string} to an empty inventory slot', async function (this: WhiskerwatchWorld, itemName: string) {
  await this.page.getByRole('button', { name: 'Empty slot, add item' }).first().click();
  await saveItemDraft(this.page, itemName);
});

When(
  'the GM adds {string} with {int} charges to an empty inventory slot',
  async function (this: WhiskerwatchWorld, itemName: string, charges: number) {
    await this.page.getByRole('button', { name: 'Empty slot, add item' }).first().click();
    const editor = itemEditor(this.page);
    await editor.getByLabel('Name').fill(itemName);
    // The Charges stepper starts at 0 and has no direct-entry field, so
    // charges are set by clicking Increase the requested number of times —
    // same idiom `live-session.steps.ts` uses for the damage Stepper.
    const increase = editor.getByRole('button', { name: 'Increase' });
    for (let i = 0; i < charges; i += 1) {
      await increase.click();
    }
    await editor.getByRole('button', { name: 'Save' }).click();
  },
);

When('the GM adds {int} items to the inventory', async function (this: WhiskerwatchWorld, count: number) {
  for (let i = 1; i <= count; i += 1) {
    await this.page.getByRole('button', { name: 'Empty slot, add item' }).first().click();
    await saveItemDraft(this.page, `Item ${i}`);
  }
});

When('the GM saves the mouse', async function (this: WhiskerwatchWorld) {
  const dialog = this.page.getByRole('dialog');
  // Scoped to the dialog's own Save button (not any leftover item-editor Save).
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  // Saving now awaits an IndexedDB write before the modal closes (see
  // Roster.svelte's saveMember) — wait for that close so a later step (e.g.
  // reloading the app) can't race ahead of the write actually completing.
  // This mirrors what a real GM would see: the dialog closing is the signal
  // the save is done.
  await dialog.waitFor({ state: 'hidden' });
});

Then("the mouse's inventory should show {string}", async function (this: WhiskerwatchWorld, itemName: string) {
  await this.page
    .getByRole('dialog')
    .getByRole('button', { name: new RegExp(`^${itemName}, `) })
    .waitFor({ state: 'visible' });
});

Then('the GM should see the Encumbered warning', async function (this: WhiskerwatchWorld) {
  await this.page.getByText('Encumbered.').waitFor({ state: 'visible' });
});

Then('the GM can still add another item to the inventory', async function (this: WhiskerwatchWorld) {
  const addButton = this.page.getByRole('button', { name: 'Empty slot, add item' }).first();
  await addButton.waitFor({ state: 'visible' });
  await addButton.click();
  await saveItemDraft(this.page, 'One more thing');
  await itemEditor(this.page).waitFor({ state: 'hidden' });
});

Then('the inventory should show {string}', async function (this: WhiskerwatchWorld, text: string) {
  await this.page.getByRole('dialog').getByText(text, { exact: true }).waitFor({ state: 'visible' });
});

Then(
  'the inventory should have sections {string}, {string} and {string}',
  async function (this: WhiskerwatchWorld, first: string, second: string, third: string) {
    for (const section of [first, second, third]) {
      await this.page.getByRole('dialog').getByText(section, { exact: true }).waitFor({ state: 'visible' });
    }
  },
);

/** One inventory section ("Paws", "Body", "Pack") inside the open form: its label plus its slot grid. */
function inventorySection(page: Page, label: string): Locator {
  return page.getByRole('dialog').getByText(label, { exact: true }).locator('..');
}

function filledSlot(page: Page, itemName: string): Locator {
  return page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${itemName}, `) });
}

/** Drags with real mouse moves (pointer events), the way a GM would with a mouse or trackpad. */
async function dragTo(page: Page, source: Locator, target: Locator): Promise<void> {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag source or target is not visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
}

When(
  'the GM adds {string} to an empty slot in the {string} section',
  async function (this: WhiskerwatchWorld, itemName: string, section: string) {
    await inventorySection(this.page, section).getByRole('button', { name: 'Empty slot, add item' }).first().click();
    await saveItemDraft(this.page, itemName);
    await itemEditor(this.page).waitFor({ state: 'hidden' });
  },
);

When(
  'the GM drags {string} onto an empty slot in the {string} section',
  async function (this: WhiskerwatchWorld, itemName: string, section: string) {
    const target = inventorySection(this.page, section).getByRole('button', { name: 'Empty slot, add item' }).first();
    await dragTo(this.page, filledSlot(this.page, itemName), target);
  },
);

When('the GM drags {string} onto {string}', async function (this: WhiskerwatchWorld, itemName: string, otherName: string) {
  await dragTo(this.page, filledSlot(this.page, itemName), filledSlot(this.page, otherName));
});

Then(
  'the {string} section should hold {string}',
  async function (this: WhiskerwatchWorld, section: string, itemName: string) {
    await inventorySection(this.page, section)
      .getByRole('button', { name: new RegExp(`^${itemName}, `) })
      .waitFor({ state: 'visible' });
  },
);

Then(
  'the {string} section should not hold {string}',
  async function (this: WhiskerwatchWorld, section: string, itemName: string) {
    await inventorySection(this.page, section)
      .getByRole('button', { name: new RegExp(`^${itemName}, `) })
      .waitFor({ state: 'detached' });
  },
);
