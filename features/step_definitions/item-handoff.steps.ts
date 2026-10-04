import { Then, When } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import type { WhiskerwatchWorld } from '../support/world';

/** The Live Session inventory modal, wherever it's currently open to. */
function inventoryModal(page: Page) {
  return page.getByRole('dialog');
}

/** Closes whatever inventory modal is currently open, if any — lets a later step reopen a different mouse's bag without the overlay intercepting the click. */
async function closeModalIfOpen(page: Page): Promise<void> {
  const dialog = inventoryModal(page);
  if (await dialog.count()) {
    await dialog.getByRole('button', { name: 'Close' }).click();
  }
}

async function openBag(page: Page, name: string): Promise<void> {
  await closeModalIfOpen(page);
  await page
    .getByTestId(`mouse-card-${name}`)
    .getByRole('button', { name: /^Open .*'s bag/ })
    .click();
}

When('the GM taps the move control on {string}', async function (this: WhiskerwatchWorld, itemName: string) {
  await inventoryModal(this.page)
    .getByRole('button', { name: `Move ${itemName}` })
    .click();
});

When('the GM hands the item to {string}', async function (this: WhiskerwatchWorld, recipientName: string) {
  await inventoryModal(this.page)
    .getByRole('button', { name: new RegExp(recipientName) })
    .click();
});

When('the GM backs out of the move picker', async function (this: WhiskerwatchWorld) {
  await inventoryModal(this.page).getByRole('button', { name: 'Back' }).click();
});

Then(
  "the GM should see the encumbered warning next to {string}",
  async function (this: WhiskerwatchWorld, recipientName: string) {
    const row = inventoryModal(this.page).getByRole('button', { name: new RegExp(recipientName) });
    await row.getByText('will be encumbered').waitFor({ state: 'visible' });
  },
);

Then('the bag should show {string}', async function (this: WhiskerwatchWorld, itemName: string) {
  await inventoryModal(this.page).getByText(itemName, { exact: true }).waitFor({ state: 'visible' });
});

Then("{string}'s bag should show {string}", async function (this: WhiskerwatchWorld, name: string, itemName: string) {
  await openBag(this.page, name);
  await inventoryModal(this.page).getByText(itemName, { exact: true }).waitFor({ state: 'visible' });
});

Then(
  "{string}'s bag should not show {string}",
  async function (this: WhiskerwatchWorld, name: string, itemName: string) {
    await openBag(this.page, name);
    const count = await inventoryModal(this.page).getByText(itemName, { exact: true }).count();
    if (count !== 0) throw new Error(`expected ${name}'s bag not to show ${itemName}`);
  },
);
