import { Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

function mouseCard(world: WhiskerwatchWorld, name: string) {
  return world.page.getByTestId(`mouse-card-${name}`);
}

When('the GM rolls a morale save for {string}', async function (this: WhiskerwatchWorld, name: string) {
  await mouseCard(this, name)
    .getByRole('button', { name: /roll a morale save for/i })
    .click();
});

Then('I should see a morale save result showing whether they stay or flee', async function (this: WhiskerwatchWorld) {
  await this.page.getByText(/Morale save: \d+ vs WIL \d+ — (Stays|Flees)/).waitFor({ state: 'visible' });
});

Then('{string} should not show a morale pill', async function (this: WhiskerwatchWorld, name: string) {
  await mouseCard(this, name)
    .getByRole('button', { name: /roll a morale save for/i })
    .waitFor({ state: 'hidden' });
});

When('the GM opens Pay Day', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Pay day' }).click();
});

function payDayModal(world: WhiskerwatchWorld) {
  return world.page.getByRole('dialog');
}

Then(
  'Pay Day should show {string} owed {string} and marked {string}',
  async function (this: WhiskerwatchWorld, name: string, wage: string, status: string) {
    const modal = payDayModal(this);
    await modal.getByText(name, { exact: true }).waitFor({ state: 'visible' });
    await modal.getByText(wage, { exact: true }).waitFor({ state: 'visible' });
    await modal.getByText(status, { exact: true }).waitFor({ state: 'visible' });
  },
);

When('the GM marks {string} paid in Pay Day', async function (this: WhiskerwatchWorld, _name: string) {
  await payDayModal(this).getByText('Unpaid', { exact: true }).click();
});

Then('Pay Day should show {string} marked {string}', async function (this: WhiskerwatchWorld, _name: string, status: string) {
  await payDayModal(this).getByText(status, { exact: true }).waitFor({ state: 'visible' });
});

When('the GM rolls the inline morale save for {string} in Pay Day', async function (this: WhiskerwatchWorld, _name: string) {
  await payDayModal(this).getByRole('button', { name: /roll morale save/i }).click();
});

Then('Pay Day should show a morale save result for {string}', async function (this: WhiskerwatchWorld, _name: string) {
  await payDayModal(this)
    .getByText(/Morale save: \d+ vs WIL \d+ — (Stays|Flees)/)
    .waitFor({ state: 'visible' });
});
