import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  buildCampaignExport,
  parseCampaignExport,
  importCampaign,
  readCampaignFile,
  summarizeCampaignExport,
  campaignExportFileName,
  shareCampaign,
} from './campaignExport';
import { getCampaignName, setCampaignName, DEFAULT_CAMPAIGN_NAME } from './stores/campaign.svelte';
import { getParty } from './stores/party.svelte';
import { getHirelings } from './stores/hirelings.svelte';
import { getAdventures, replaceAdventures } from './stores/adventures.svelte';
import { getBeats, replaceBeats } from './stores/beats.svelte';
import { getSessions } from './stores/sessions.svelte';
import { getBestiary } from './stores/bestiary.svelte';
import { getFactions } from './stores/factions.svelte';
import { getFactionEdges } from './stores/factionEdges.svelte';
import { getHexNodes } from './stores/hexmap.svelte';
import { getCampaignHistory, replaceCampaignHistory, type CampaignHistoryEntry } from './stores/campaignHistory.svelte';

const historyEntries: CampaignHistoryEntry[] = [
  { id: 'h1', type: 'session', timestamp: '2026-09-01T19:00:00.000Z', sessionId: 's1', number: 1, title: 'Into the granary' },
  {
    id: 'h2',
    type: 'clockChanged',
    timestamp: '2026-09-01T20:00:00.000Z',
    factionId: 'f1',
    factionName: 'The Gnawing Court',
    from: 3,
    to: 4,
    max: 6,
  },
];

describe('campaignExport', () => {
  beforeEach(() => {
    localStorage.clear();
    setCampaignName(DEFAULT_CAMPAIGN_NAME);
  });

  it('builds an export containing the current party, hirelings, adventures, beats, sessions, bestiary, factions and hexes', () => {
    const data = buildCampaignExport();

    expect(data.version).toBe(2);
    expect(data.campaignName).toBe(DEFAULT_CAMPAIGN_NAME);
    expect(data.party).toEqual(getParty());
    expect(data.hirelings).toEqual(getHirelings());
    expect(data.adventures).toEqual(getAdventures());
    expect(data.beats).toEqual(getBeats());
    expect(data.sessions).toEqual(getSessions());
    expect(data.bestiary).toEqual(getBestiary());
    expect(data.factions).toEqual(getFactions());
    expect(data.factionEdges).toEqual(getFactionEdges());
    expect(data.hexNodes).toEqual(getHexNodes());
    expect(data.campaignHistory).toEqual(getCampaignHistory());
    expect(typeof data.exportedAt).toBe('string');
  });

  it('round-trips through JSON', () => {
    setCampaignName('The Gnawing Court Rises');
    replaceCampaignHistory(historyEntries);
    const data = buildCampaignExport();
    const parsed = parseCampaignExport(JSON.stringify(data));

    expect(parsed.campaignName).toBe('The Gnawing Court Rises');
    expect(parsed.party).toEqual(data.party);
    expect(parsed.hirelings).toEqual(data.hirelings);
    expect(parsed.adventures).toEqual(data.adventures);
    expect(parsed.beats).toEqual(data.beats);
    expect(parsed.sessions).toEqual(data.sessions);
    expect(parsed.bestiary).toEqual(data.bestiary);
    expect(parsed.factions).toEqual(data.factions);
    expect(parsed.factionEdges).toEqual(data.factionEdges);
    expect(parsed.hexNodes).toEqual(data.hexNodes);
    expect(parsed.campaignHistory).toEqual(historyEntries);
  });

  it('treats missing collections as empty arrays for backward compatibility with older exports', () => {
    const legacy = JSON.stringify({ version: 1, exportedAt: '2026-01-01T00:00:00.000Z', party: [], hirelings: [] });
    const parsed = parseCampaignExport(legacy);

    expect(parsed.adventures).toEqual([]);
    expect(parsed.beats).toEqual([]);
    expect(parsed.sessions).toEqual([]);
    expect(parsed.bestiary).toEqual([]);
    expect(parsed.factions).toEqual([]);
    expect(parsed.factionEdges).toEqual([]);
    expect(parsed.hexNodes).toEqual([]);
    expect(parsed.campaignName).toBeUndefined();
    expect(parsed.campaignHistory).toBeUndefined();
  });

  it('imports the timeline so campaign progress moves to another device', async () => {
    replaceCampaignHistory([]);
    const file = new File(
      [JSON.stringify({ version: 2, exportedAt: '2026-09-02T00:00:00.000Z', party: [], hirelings: [], campaignHistory: historyEntries })],
      'campaign.json',
      { type: 'application/json' },
    );

    await importCampaign(file);

    expect(getCampaignHistory()).toEqual(historyEntries);
  });

  it("keeps this device's timeline when importing a v1 export that has none", async () => {
    replaceCampaignHistory(historyEntries);
    const legacy = new File(
      [JSON.stringify({ version: 1, exportedAt: '2026-01-01T00:00:00.000Z', party: [], hirelings: [] })],
      'legacy.json',
      { type: 'application/json' },
    );

    await importCampaign(legacy);

    expect(getCampaignHistory()).toEqual(historyEntries);
  });

  it('rejects a timeline entry with an unknown type or missing fields', () => {
    const base = { version: 2, exportedAt: '2026-01-01T00:00:00.000Z', party: [], hirelings: [] };
    expect(() =>
      parseCampaignExport(JSON.stringify({ ...base, campaignHistory: [{ id: 'x', type: 'mystery', timestamp: '2026-01-01' }] })),
    ).toThrow();
    expect(() =>
      parseCampaignExport(JSON.stringify({ ...base, campaignHistory: [{ id: 'x', type: 'session', timestamp: '2026-01-01' }] })),
    ).toThrow();
  });

  it('reads a shared .txt copy of an export just like a .json file', async () => {
    const data = buildCampaignExport();
    const file = new File([JSON.stringify(data)], 'whiskerwatch.txt', { type: 'text/plain' });

    const parsed = await readCampaignFile(file);

    expect(parsed.party).toEqual(data.party);
  });

  it('summarizes a file for the import preview', () => {
    const summary = summarizeCampaignExport({
      ...buildCampaignExport(),
      campaignName: 'Owl Bridge',
      exportedAt: '2026-09-02T10:00:00.000Z',
      sessions: [
        { id: 'a', number: 2, date: '2026-08-01', title: 'Two' },
        { id: 'b', number: 5, date: '2026-09-01', title: 'Five' },
      ] as never,
      campaignHistory: historyEntries,
    });

    expect(summary).toMatchObject({
      campaignName: 'Owl Bridge',
      exportedAt: '2026-09-02T10:00:00.000Z',
      sessions: 2,
      latestSessionNumber: 5,
      timelineEntries: 2,
    });
  });

  it('names the file after the campaign and export date', () => {
    expect(campaignExportFileName({ campaignName: 'Die Höhle der Eule!', exportedAt: '2026-10-02T08:00:00.000Z' })).toBe(
      'whiskerwatch-die-hohle-der-eule-2026-10-02.json',
    );
    expect(campaignExportFileName({ exportedAt: '2026-10-02T08:00:00.000Z' }, 'txt')).toBe('whiskerwatch-2026-10-02.txt');
  });

  describe('shareCampaign', () => {
    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;
    let click: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      URL.createObjectURL = vi.fn(() => 'blob:test');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      click.mockRestore();
      Object.assign(navigator, { share: originalShare, canShare: originalCanShare });
    });

    it('falls back to a download when the browser cannot share files', async () => {
      Object.assign(navigator, { share: undefined, canShare: undefined });

      await expect(shareCampaign()).resolves.toBe('downloaded');
      expect(click).toHaveBeenCalledOnce();
    });

    it('opens the share sheet with the JSON file when supported', async () => {
      const share = vi.fn(async () => {});
      Object.assign(navigator, { share, canShare: () => true });

      await expect(shareCampaign()).resolves.toBe('shared');
      const files = (share.mock.calls[0] as unknown as [ShareData])[0].files!;
      expect(files[0]!.name).toMatch(/\.json$/);
      expect(click).not.toHaveBeenCalled();
    });

    it('shares a .txt copy where only plain text files can be shared (Chrome on Android)', async () => {
      const share = vi.fn(async () => {});
      Object.assign(navigator, {
        share,
        canShare: (data: ShareData) => data.files?.[0]?.type === 'text/plain',
      });

      await expect(shareCampaign()).resolves.toBe('shared');
      const files = (share.mock.calls[0] as unknown as [ShareData])[0].files!;
      expect(files[0]!.name).toMatch(/\.txt$/);
    });

    it('does nothing more when the GM closes the share sheet', async () => {
      Object.assign(navigator, {
        share: vi.fn(async () => {
          throw new DOMException('closed', 'AbortError');
        }),
        canShare: () => true,
      });

      await expect(shareCampaign()).resolves.toBe('cancelled');
      expect(click).not.toHaveBeenCalled();
    });

    it('still downloads the file when sharing fails for another reason', async () => {
      Object.assign(navigator, {
        share: vi.fn(async () => {
          throw new DOMException('nope', 'NotAllowedError');
        }),
        canShare: () => true,
      });

      await expect(shareCampaign()).resolves.toBe('downloaded');
      expect(click).toHaveBeenCalledOnce();
    });
  });

  it('imports an older export without a campaignName by keeping the current campaign name', async () => {
    setCampaignName('My Ongoing Campaign');
    const legacy = new File(
      [JSON.stringify({ version: 1, exportedAt: '2026-01-01T00:00:00.000Z', party: [], hirelings: [] })],
      'legacy.json',
      { type: 'application/json' },
    );

    await importCampaign(legacy);

    expect(getCampaignName()).toBe('My Ongoing Campaign');
  });

  it('imports a campaign name from a newer export', async () => {
    setCampaignName('Old Name');
    const file = new File(
      [
        JSON.stringify({
          version: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          campaignName: 'The Salt Marsh Expedition',
          party: [],
          hirelings: [],
        }),
      ],
      'export.json',
      { type: 'application/json' },
    );

    await importCampaign(file);

    expect(getCampaignName()).toBe('The Salt Marsh Expedition');
  });

  it('rejects an adventure entry missing required fields', () => {
    const bad = JSON.stringify({ party: [], hirelings: [], adventures: [{ id: '1' }] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('accepts an adventure entry with all required fields', () => {
    const ok = JSON.stringify({
      party: [],
      hirelings: [],
      adventures: [{ id: '1', title: 'The granary raid', description: 'Tunnels', status: 'active' }],
    });
    const parsed = parseCampaignExport(ok);
    expect(parsed.adventures).toHaveLength(1);
  });

  it('rejects a faction entry missing required fields', () => {
    const bad = JSON.stringify({ party: [], hirelings: [], factions: [{ id: '1' }] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('rejects a hex node missing required fields', () => {
    const bad = JSON.stringify({ party: [], hirelings: [], hexNodes: [{ id: '1' }] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('rejects a bestiary entry missing required fields', () => {
    const bad = JSON.stringify({ party: [], hirelings: [], beats: [], sessions: [], bestiary: [{ id: '1' }] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('rejects a beat entry missing required fields', () => {
    const bad = JSON.stringify({ party: [], hirelings: [], beats: [{ id: '1' }], sessions: [] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('rejects a beat entry with a malformed factionIds field', () => {
    const bad = JSON.stringify({
      party: [],
      hirelings: [],
      beats: [{ id: '1', parentId: null, title: 'Beat', status: 'planned', factionIds: 'not-an-array' }],
      sessions: [],
    });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('accepts a beat entry with hexNodeId and factionIds', () => {
    const ok = JSON.stringify({
      party: [],
      hirelings: [],
      beats: [{ id: '1', parentId: null, title: 'Beat', status: 'planned', hexNodeId: 'hex-1', factionIds: ['fac-1'] }],
      sessions: [],
    });
    const parsed = parseCampaignExport(ok);
    expect(parsed.beats).toHaveLength(1);
  });

  it('rejects a session entry missing required fields', () => {
    const bad = JSON.stringify({ party: [], hirelings: [], beats: [], sessions: [{ id: '1' }] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseCampaignExport('not json')).toThrow(/not valid JSON/);
  });

  it('rejects JSON that is not a campaign export', () => {
    expect(() => parseCampaignExport(JSON.stringify({ hello: 'world' }))).toThrow(/does not look like/);
  });

  it('rejects a party entry missing required fields', () => {
    const bad = JSON.stringify({ party: [{ id: '1' }], hirelings: [] });
    expect(() => parseCampaignExport(bad)).toThrow(/does not look like/);
  });

  describe('importing a legacy (pre-Adventures) export', () => {
    it('migrates a legacy root beat into a real Adventure instead of losing the beat tree', async () => {
      replaceAdventures([]);
      replaceBeats([]);

      const legacy = {
        version: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        party: [],
        hirelings: [],
        // No `adventures`, and the root beat has no `adventureId` — exactly
        // what an export made before this feature existed looks like.
        beats: [
          { id: 'root', parentId: null, title: 'The granary raid', notes: 'Tunnels below.', status: 'active', hexNodeId: null, factionIds: [] },
          { id: 'child', parentId: 'root', title: 'Find the entrance', notes: '', status: 'planned', hexNodeId: null, factionIds: [] },
        ],
      };
      const file = new File([JSON.stringify(legacy)], 'legacy.json', { type: 'application/json' });

      await importCampaign(file);

      expect(getAdventures()).toHaveLength(1);
      expect(getAdventures()[0]).toMatchObject({
        title: 'The granary raid',
        description: 'Tunnels below.',
        status: 'active',
      });
      const adventureId = getAdventures()[0]!.id;

      expect(getBeats()).toHaveLength(1);
      expect(getBeats()[0]).toMatchObject({ id: 'child', parentId: null, adventureId });
    });

    it('leaves a modern export (with adventures and adventureId already set) unchanged', async () => {
      replaceAdventures([]);
      replaceBeats([]);

      const modern = {
        version: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        party: [],
        hirelings: [],
        adventures: [{ id: 'adv-1', title: 'The granary raid', description: 'Tunnels below.', status: 'active' }],
        beats: [
          { id: 'b1', parentId: null, title: 'Find the entrance', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
        ],
      };
      const file = new File([JSON.stringify(modern)], 'modern.json', { type: 'application/json' });

      await importCampaign(file);

      expect(getAdventures()).toHaveLength(1);
      expect(getAdventures()[0]?.id).toBe('adv-1');
      expect(getBeats()).toHaveLength(1);
      expect(getBeats()[0]).toMatchObject({ id: 'b1', adventureId: 'adv-1' });
    });
  });
});
