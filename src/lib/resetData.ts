import { clearList, resetListToSeed } from './idb';

const CAMPAIGN_KEYS = [
  'whiskerwatch:party',
  'whiskerwatch:adventures',
  'whiskerwatch:beats',
  'whiskerwatch:hexmap',
  'whiskerwatch:factions',
  'whiskerwatch:hirelings',
  'whiskerwatch:sessions',
  'whiskerwatch:factionEdges',
  'whiskerwatch:bestiary',
];

/**
 * Applies `wipe` to every campaign list, drops any pre-migration
 * localStorage remnant, then reloads so every store reinitializes. Preserves
 * user preferences (theme and locale, still on localStorage) and does not
 * touch `whiskerwatch:campaignHistory` — the history ledger is deliberately
 * left out of "start fresh" here, matching the app's pre-IndexedDB reset
 * behavior.
 */
async function wipeCampaignAndReload(wipe: (key: string) => Promise<void>): Promise<void> {
  await Promise.all(CAMPAIGN_KEYS.map((key) => wipe(key)));

  // Also drop any pre-migration localStorage remnant for these keys, in
  // case the app is reset before a store has ever hydrated (and therefore
  // never ran its one-time localStorage → IndexedDB migration) — otherwise
  // it would be "migrated" back in on the next load.
  CAMPAIGN_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Non-fatal — the reload below is what actually matters.
    }
  });

  // Reload the page so all stores reinitialize from the new state.
  window.location.reload();
}

/**
 * Clears all campaign data, resetting the app to an empty campaign.
 * `clearList` marks each list initialized, so it stays empty on reload
 * instead of silently reseeding with demo data (see `idb.ts`'s hydration docs).
 */
export async function resetAllCampaignData(): Promise<void> {
  await wipeCampaignAndReload(clearList);
}

/**
 * Replaces all campaign data with the sample campaign. `resetListToSeed`
 * makes each list look never-initialized, so on reload every store seeds
 * itself exactly as on a fresh install — and boot's demo relocalization
 * (`main.ts`) brings it into the current language.
 */
export async function restoreSampleCampaign(): Promise<void> {
  await wipeCampaignAndReload(resetListToSeed);
}
