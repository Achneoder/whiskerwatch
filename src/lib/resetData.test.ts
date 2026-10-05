import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clearList = vi.fn(async (_key: string) => {});
const resetListToSeed = vi.fn(async (_key: string) => {});
vi.mock('./idb', () => ({
  clearList: (key: string) => clearList(key),
  resetListToSeed: (key: string) => resetListToSeed(key),
}));

import { resetAllCampaignData, restoreSampleCampaign } from './resetData';

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

describe('resetData', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearList.mockClear();
    resetListToSeed.mockClear();
  });

  it('resetAllCampaignData clears every campaign store, including adventures', async () => {
    await resetAllCampaignData();

    expect(clearList.mock.calls.map(([key]) => key)).toEqual(expect.arrayContaining(CAMPAIGN_KEYS));
    expect(resetListToSeed).not.toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalledOnce();
  });

  it('restoreSampleCampaign reseeds every campaign store and reloads', async () => {
    localStorage.setItem('whiskerwatch:party', '[]');

    await restoreSampleCampaign();

    expect(resetListToSeed.mock.calls.map(([key]) => key)).toEqual(expect.arrayContaining(CAMPAIGN_KEYS));
    expect(clearList).not.toHaveBeenCalled();
    expect(localStorage.getItem('whiskerwatch:party')).toBeNull();
    expect(window.location.reload).toHaveBeenCalledOnce();
  });
});
