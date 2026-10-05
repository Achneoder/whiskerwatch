import { afterEach, describe, expect, it, vi } from 'vitest';

const clearList = vi.fn(async (_key: string) => {});
vi.mock('./idb', () => ({ clearList: (key: string) => clearList(key) }));

import { resetAllCampaignData } from './resetData';

describe('resetAllCampaignData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearList.mockClear();
  });

  it('clears every campaign store, including adventures', async () => {
    vi.stubGlobal('location', { reload: vi.fn() });

    await resetAllCampaignData();

    const cleared = clearList.mock.calls.map(([key]) => key);
    expect(cleared).toEqual(
      expect.arrayContaining([
        'whiskerwatch:party',
        'whiskerwatch:adventures',
        'whiskerwatch:beats',
        'whiskerwatch:hexmap',
        'whiskerwatch:factions',
        'whiskerwatch:hirelings',
        'whiskerwatch:sessions',
        'whiskerwatch:factionEdges',
        'whiskerwatch:bestiary',
      ]),
    );
    expect(window.location.reload).toHaveBeenCalledOnce();
  });
});
