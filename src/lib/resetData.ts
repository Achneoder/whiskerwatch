import { clearList } from './idb';

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
 * Clears all campaign data from IndexedDB, resetting the app to a fresh
 * state. Preserves user preferences (theme and locale, still on
 * localStorage) and does not touch `whiskerwatch:campaignHistory` — the
 * history ledger is deliberately left out of "start fresh" here, matching
 * the app's pre-IndexedDB reset behavior.
 */
export async function resetAllCampaignData(): Promise<void> {
  // `clearList` empties a store's IndexedDB contents *and* marks it
  // initialized, so a cleared list stays empty on reload instead of
  // silently reseeding with demo data (see `idb.ts`'s hydration docs).
  await Promise.all(CAMPAIGN_KEYS.map((key) => clearList(key)));

  // Also drop any pre-migration localStorage remnant for these keys, in
  // case the app is reset before a store has ever hydrated (and therefore
  // never ran its one-time localStorage → IndexedDB migration).
  CAMPAIGN_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Non-fatal — the reload below is what actually matters.
    }
  });

  // Reload the page so all stores reinitialize from the now-empty state.
  window.location.reload();
}
