import { strict as assert } from 'node:assert';
import { Then, When } from '@cucumber/cucumber';
import type { WhiskerwatchWorld } from '../support/world';

// "the GM rolls an encounter" is already defined in hex-bestiary.steps.ts and
// reused here (including for the reroll) rather than redefined, to avoid an
// ambiguous step match.

When('the GM rolls a reaction for the encounter', async function (this: WhiskerwatchWorld) {
  await this.page.getByRole('button', { name: 'Roll Reaction' }).click();
});

Then('I should see a reaction result showing a band and its guidance sentence', async function (this: WhiskerwatchWorld) {
  await this.page
    .getByText(/Hostile|Unfriendly|Unsure|Talkative|Helpful/)
    .first()
    .waitFor({ state: 'visible' });
  await this.page
    .getByText(
      /How have the mice angered them\?|How can they be appeased\?|What could win them over\?|What could they trade\?|How can they help the mice\?/,
    )
    .first()
    .waitFor({ state: 'visible' });
});

Then(
  'the "Roll Reaction" button should be visible again with no reaction result showing',
  async function (this: WhiskerwatchWorld) {
    await this.page.getByRole('button', { name: 'Roll Reaction' }).waitFor({ state: 'visible' });
    // The band words double as headline text for the reaction result — none
    // of them should still be on screen once a fresh encounter clears it.
    const bandCount = await this.page.getByText(/^(Hostile|Unfriendly|Unsure|Talkative|Helpful)$/).count();
    assert.equal(bandCount, 0, 'expected no leftover reaction band label after rolling a new encounter');
  },
);
