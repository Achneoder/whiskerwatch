import { getCampaignName, setCampaignName } from './stores/campaign.svelte';
import { getParty, replaceParty, flush as flushParty, type PartyMember } from './stores/party.svelte';
import { getHirelings, replaceHirelings, flush as flushHirelings, type Hireling } from './stores/hirelings.svelte';
import {
  getAdventures,
  replaceAdventures,
  flush as flushAdventures,
  type Adventure,
} from './stores/adventures.svelte';
import { getBeats, replaceBeats, flush as flushBeats, migrateLegacyBeatsToAdventures, type Beat } from './stores/beats.svelte';
import { getSessions, replaceSessions, flush as flushSessions, type Session } from './stores/sessions.svelte';
import { getBestiary, replaceBestiary, flush as flushBestiary, type BestiaryEntry } from './stores/bestiary.svelte';
import { getFactions, replaceFactions, flush as flushFactions, type Faction } from './stores/factions.svelte';
import {
  getFactionEdges,
  replaceFactionEdges,
  flush as flushFactionEdges,
  type FactionEdge,
} from './stores/factionEdges.svelte';
import { getHexNodes, replaceHexNodes, flush as flushHexNodes, type HexNode } from './stores/hexmap.svelte';
import {
  getCampaignHistory,
  replaceCampaignHistory,
  flush as flushCampaignHistory,
  type CampaignHistoryEntry,
} from './stores/campaignHistory.svelte';

/**
 * v2 added `campaignHistory` (the Timeline ledger). v1 files still import:
 * every collection added after v1 is optional in `parseCampaignExport`.
 */
export const CAMPAIGN_EXPORT_VERSION = 2;

export interface CampaignExport {
  version: typeof CAMPAIGN_EXPORT_VERSION;
  exportedAt: string;
  /** Optional so older exports (before campaign naming existed) still parse — see `parseCampaignExport`. */
  campaignName?: string;
  party: PartyMember[];
  hirelings: Hireling[];
  adventures: Adventure[];
  beats: Beat[];
  sessions: Session[];
  bestiary: BestiaryEntry[];
  factions: Faction[];
  factionEdges: FactionEdge[];
  hexNodes: HexNode[];
  /**
   * Optional so v1 exports (made before the Timeline was exported) still
   * parse — `applyCampaignImport` leaves the local history alone when it's
   * missing instead of wiping it.
   */
  campaignHistory?: CampaignHistoryEntry[];
}

export function buildCampaignExport(): CampaignExport {
  return {
    version: CAMPAIGN_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    campaignName: getCampaignName(),
    party: getParty(),
    hirelings: getHirelings(),
    adventures: getAdventures(),
    beats: getBeats(),
    sessions: getSessions(),
    bestiary: getBestiary(),
    factions: getFactions(),
    factionEdges: getFactionEdges(),
    hexNodes: getHexNodes(),
    campaignHistory: getCampaignHistory(),
  };
}

function hasIdAndHp(value: unknown): value is { id: string; hp: number; max: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.hp === 'number' && typeof v.max === 'number';
}

function isPartyMember(value: unknown): value is PartyMember {
  return hasIdAndHp(value);
}

function isHireling(value: unknown): value is Hireling {
  return hasIdAndHp(value);
}

function isBeat(value: unknown): value is Beat {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    (v.parentId === null || typeof v.parentId === 'string') &&
    typeof v.title === 'string' &&
    typeof v.status === 'string' &&
    (v.hexNodeId === undefined || v.hexNodeId === null || typeof v.hexNodeId === 'string') &&
    (v.factionIds === undefined || (Array.isArray(v.factionIds) && v.factionIds.every((id) => typeof id === 'string'))) &&
    // Optional for backward compatibility — exports made before the
    // Adventures feature existed have no `adventureId` on their beats;
    // `importCampaign` runs those through `migrateLegacyBeatsToAdventures`.
    (v.adventureId === undefined || typeof v.adventureId === 'string')
  );
}

function isAdventure(value: unknown): value is Adventure {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    typeof v.status === 'string'
  );
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.number === 'number' && typeof v.date === 'string' && typeof v.title === 'string';
}

function isBestiaryEntry(value: unknown): value is BestiaryEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.category === 'string' &&
    typeof v.hd === 'number' &&
    typeof v.hp === 'number' &&
    Array.isArray(v.attacks)
  );
}

function isFaction(value: unknown): value is Faction {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.disposition === 'string' &&
    typeof v.clock === 'number' &&
    typeof v.of === 'number' &&
    Array.isArray(v.tags)
  );
}

function isFactionEdge(value: unknown): value is FactionEdge {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.sourceId === 'string' &&
    typeof v.targetId === 'string' &&
    typeof v.type === 'string'
  );
}

function isHexNode(value: unknown): value is HexNode {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.q === 'number' &&
    typeof v.r === 'number' &&
    typeof v.terrain === 'string' &&
    typeof v.name === 'string' &&
    typeof v.notes === 'string' &&
    typeof v.discovered === 'boolean'
  );
}

function isCampaignHistoryEntry(value: unknown): value is CampaignHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.timestamp !== 'string') return false;
  switch (v.type) {
    case 'session':
      return typeof v.sessionId === 'string' && typeof v.number === 'number' && typeof v.title === 'string';
    case 'beatCompleted':
      return typeof v.beatId === 'string' && typeof v.title === 'string';
    case 'clockChanged':
      return (
        typeof v.factionId === 'string' &&
        typeof v.factionName === 'string' &&
        typeof v.from === 'number' &&
        typeof v.to === 'number' &&
        typeof v.max === 'number'
      );
    case 'death':
      return typeof v.memberId === 'string' && typeof v.name === 'string';
    default:
      return false;
  }
}

export function parseCampaignExport(text: string): CampaignExport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }

  const candidate = data as Record<string, unknown>;
  if (!Array.isArray(candidate.party) || !candidate.party.every(isPartyMember)) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (!Array.isArray(candidate.hirelings) || !candidate.hirelings.every(isHireling)) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (
    candidate.adventures !== undefined &&
    (!Array.isArray(candidate.adventures) || !candidate.adventures.every(isAdventure))
  ) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (candidate.beats !== undefined && (!Array.isArray(candidate.beats) || !candidate.beats.every(isBeat))) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (candidate.sessions !== undefined && (!Array.isArray(candidate.sessions) || !candidate.sessions.every(isSession))) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (candidate.bestiary !== undefined && (!Array.isArray(candidate.bestiary) || !candidate.bestiary.every(isBestiaryEntry))) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (candidate.factions !== undefined && (!Array.isArray(candidate.factions) || !candidate.factions.every(isFaction))) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (
    candidate.factionEdges !== undefined &&
    (!Array.isArray(candidate.factionEdges) || !candidate.factionEdges.every(isFactionEdge))
  ) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (candidate.hexNodes !== undefined && (!Array.isArray(candidate.hexNodes) || !candidate.hexNodes.every(isHexNode))) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }
  if (
    candidate.campaignHistory !== undefined &&
    (!Array.isArray(candidate.campaignHistory) || !candidate.campaignHistory.every(isCampaignHistoryEntry))
  ) {
    throw new Error('That file does not look like a Whiskerwatch campaign export.');
  }

  return {
    version: CAMPAIGN_EXPORT_VERSION,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
    ...(typeof candidate.campaignName === 'string' ? { campaignName: candidate.campaignName } : {}),
    party: candidate.party,
    hirelings: candidate.hirelings,
    adventures: Array.isArray(candidate.adventures) ? candidate.adventures : [],
    beats: Array.isArray(candidate.beats) ? candidate.beats : [],
    sessions: Array.isArray(candidate.sessions) ? candidate.sessions : [],
    bestiary: Array.isArray(candidate.bestiary) ? candidate.bestiary : [],
    factions: Array.isArray(candidate.factions) ? candidate.factions : [],
    factionEdges: Array.isArray(candidate.factionEdges) ? candidate.factionEdges : [],
    hexNodes: Array.isArray(candidate.hexNodes) ? candidate.hexNodes : [],
    ...(Array.isArray(candidate.campaignHistory) ? { campaignHistory: candidate.campaignHistory } : {}),
  };
}

/** What a GM should see about a file before it overwrites everything on this device. */
export interface CampaignExportSummary {
  campaignName?: string;
  exportedAt: string;
  sessions: number;
  /** Highest session number in the file — how far the campaign has progressed. */
  latestSessionNumber: number;
  party: number;
  adventures: number;
  timelineEntries?: number;
}

export function latestSessionNumber(sessions: Pick<Session, 'number'>[]): number {
  return sessions.reduce((max, session) => Math.max(max, session.number), 0);
}

export function summarizeCampaignExport(data: CampaignExport): CampaignExportSummary {
  return {
    ...(data.campaignName !== undefined ? { campaignName: data.campaignName } : {}),
    exportedAt: data.exportedAt,
    sessions: data.sessions.length,
    latestSessionNumber: latestSessionNumber(data.sessions),
    party: data.party.length,
    adventures: data.adventures.length,
    ...(data.campaignHistory !== undefined ? { timelineEntries: data.campaignHistory.length } : {}),
  };
}

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** e.g. `whiskerwatch-the-gnawing-court-2026-10-02.json` — the campaign name tells files from different campaigns apart. */
export function campaignExportFileName(data: Pick<CampaignExport, 'campaignName' | 'exportedAt'>, extension = 'json'): string {
  const slug = data.campaignName ? slugify(data.campaignName) : '';
  return `whiskerwatch-${slug ? `${slug}-` : ''}${data.exportedAt.slice(0, 10)}.${extension}`;
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCampaign(): void {
  const data = buildCampaignExport();
  downloadFile(new File([JSON.stringify(data, null, 2)], campaignExportFileName(data), { type: 'application/json' }));
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hands the campaign to the OS share sheet (AirDrop, Nearby Share, a
 * messenger, a cloud folder…) so moving it from phone to tablet doesn't mean
 * digging through a Downloads folder. Falls back to a plain download where
 * the Web Share API can't share files (most desktop browsers).
 *
 * Chrome on Android only shares files from an extension allowlist that
 * doesn't include `.json`, so a `.txt` copy of the same JSON is tried next —
 * `importCampaign` parses content, not file names, and accepts either.
 */
export async function shareCampaign(): Promise<ShareOutcome> {
  const data = buildCampaignExport();
  const json = JSON.stringify(data, null, 2);
  const jsonFile = new File([json], campaignExportFileName(data), { type: 'application/json' });
  const candidates = [jsonFile, new File([json], campaignExportFileName(data, 'txt'), { type: 'text/plain' })];

  const shareable =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
      ? candidates.find((file) => navigator.canShare({ files: [file] }))
      : undefined;

  if (shareable) {
    try {
      await navigator.share({ files: [shareable], title: data.campaignName ?? 'Whiskerwatch' });
      return 'shared';
    } catch (error) {
      // The GM closed the share sheet — not a failure, and they didn't ask for a download.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else (e.g. NotAllowedError) falls through to a download so the export still happens.
    }
  }

  downloadFile(jsonFile);
  return 'downloaded';
}

/** Reads and validates a campaign file without touching any store — used to preview it before confirming. */
export async function readCampaignFile(file: File): Promise<CampaignExport> {
  return parseCampaignExport(await file.text());
}

export async function importCampaign(file: File): Promise<void> {
  await applyCampaignImport(await readCampaignFile(file));
}

/** Replaces every campaign store with `data` and resolves once it's durably saved. */
export async function applyCampaignImport(data: CampaignExport): Promise<void> {
  // Older exports predate campaign naming — fall back to whatever name is
  // already set (itself defaulted by the store) rather than clobbering it.
  setCampaignName(data.campaignName ?? getCampaignName());
  replaceParty(data.party);
  replaceHirelings(data.hirelings);

  // A legacy export (made before the Adventures feature existed) has no
  // `adventures` and no `adventureId` on its beats — running its beats
  // through the same migration used for pre-existing local data (see
  // `beats.svelte.ts`) turns any such legacy root beat into a real
  // Adventure instead of crashing or losing the beat tree. This is a no-op
  // for a modern export, since every beat there already carries a real
  // `adventureId`.
  const { beats: migratedBeats, adventures: migratedAdventures } = migrateLegacyBeatsToAdventures(data.beats);
  replaceAdventures([...data.adventures, ...migratedAdventures]);
  replaceBeats(migratedBeats);

  replaceSessions(data.sessions);
  replaceBestiary(data.bestiary);
  replaceFactions(data.factions);
  replaceFactionEdges(data.factionEdges);
  replaceHexNodes(data.hexNodes);
  // A v1 export carries no Timeline — keep the local one rather than wiping it.
  if (data.campaignHistory) replaceCampaignHistory(data.campaignHistory);

  // Each `replace*` above updates in-memory state immediately and fires off
  // an async IndexedDB write in the background (see `persistedList.svelte.ts`).
  // Since this function is the "import complete" signal shown to the GM,
  // wait for every one of those writes to actually settle so "import
  // complete" genuinely means the data is durably saved, not just in-memory.
  await Promise.all([
    flushParty(),
    flushHirelings(),
    flushAdventures(),
    flushBeats(),
    flushSessions(),
    flushBestiary(),
    flushFactions(),
    flushFactionEdges(),
    flushHexNodes(),
    flushCampaignHistory(),
  ]);
}
