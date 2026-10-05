import { strict as assert } from 'node:assert';
import { Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';
import { NPC_NAMES } from '../../src/lib/generators/tables';

When('the GM rolls an NPC', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Roll an NPC' }).click();
  this.lastRolledNpcName = await this.page.getByTestId('npc-name').innerText();
});

When('the GM saves the rolled NPC to the Roster', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Save to Roster' }).click();
  await this.page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
});

When('the GM saves the rolled NPC to the Bestiary', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Save to Bestiary' }).click();
  await this.page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
});

When('the GM undoes the last generator action', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Undo' }).click();
});

Then('the GM should see a {string} button', async function (this: WhiskerwatchWorld, label: string) {
  await this.page.getByRole('button', { name: label }).waitFor({ state: 'visible' });
});

Then('the GM should see the rolled NPC listed among the hirelings', async function (this: WhiskerwatchWorld) {
  assert.ok(this.lastRolledNpcName, 'expected a rolled NPC name to have been captured');
  await this.page.getByText(this.lastRolledNpcName!, { exact: true }).first().waitFor({ state: 'visible' });
});

Then('the GM should not see the rolled NPC listed among the hirelings', async function (this: WhiskerwatchWorld) {
  assert.ok(this.lastRolledNpcName, 'expected a rolled NPC name to have been captured');
  assert.equal(await this.page.getByText(this.lastRolledNpcName!, { exact: true }).count(), 0);
});

Then('the GM should see the rolled NPC listed in the bestiary', async function (this: WhiskerwatchWorld) {
  assert.ok(this.lastRolledNpcName, 'expected a rolled NPC name to have been captured');
  await this.page.getByText(this.lastRolledNpcName!, { exact: true }).first().waitFor({ state: 'visible' });
});

Then('the rolled NPC is one of the German generator NPCs', async function (this: WhiskerwatchWorld) {
  const name = (await this.page.getByTestId('npc-name').innerText()).trim();
  assert.ok(NPC_NAMES.de.includes(name), `expected a German NPC name, got "${name}"`);
});
