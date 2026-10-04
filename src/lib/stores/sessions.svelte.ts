import { createPersistedList } from './persistedList.svelte';
import { logSession } from './campaignHistory.svelte';
import { DEMO_SESSIONS } from '../demoCampaign';

export interface Session {
  id: string;
  number: number;
  date: string;
  title: string;
  summary: string;
  /**
   * Which `Adventure` (see `adventures.svelte.ts`) this session was mostly
   * about, if the GM (or the Live Session "End Session" flow) tagged one —
   * optional and additive per the Phase 12 roadmap: legacy sessions saved
   * before this field existed simply have it `undefined` and never match an
   * adventure filter, no backfill needed.
   */
  adventureId?: string | null;
}

const STORAGE_KEY = 'whiskerwatch:sessions';

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const seedSessions: Session[] = [
  {
    id: crypto.randomUUID(),
    number: 4,
    date: daysAgo(6),
    ...DEMO_SESSIONS[0]!.en,
  },
];

const list = createPersistedList<Session>(STORAGE_KEY, seedSessions);

/** Resolves once this store's data has been hydrated from IndexedDB. App boot awaits this (alongside every other store) before mounting `App.svelte`. */
export const ready: Promise<void> = list.ready;

/** See `PersistedList.flush` — awaited by `campaignExport.ts` after `replaceSessions` to guarantee an import is durably saved. */
export const flush: () => Promise<void> = () => list.flush();

export function getSessions(): Session[] {
  return list.items;
}

/** Converts a session's `YYYY-MM-DD` date field into an ISO timestamp for the timeline, so the
 *  entry sorts by when the session was actually played rather than when it was logged. Falls
 *  back to "now" if the date is malformed, so a bad record can't crash the timeline sort. */
function sessionDateToTimestamp(date: string): string {
  // Parsed as UTC midnight (not local time) so the resulting ISO timestamp's date
  // portion always matches the `YYYY-MM-DD` the GM entered, regardless of the
  // browser's timezone offset.
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function addSession(input: Omit<Session, 'id'>): void {
  const id = crypto.randomUUID();
  list.add({ ...input, id });
  logSession({
    timestamp: sessionDateToTimestamp(input.date),
    sessionId: id,
    number: input.number,
    title: input.title,
  });
}

export function updateSession(id: string, patch: Partial<Omit<Session, 'id'>>): void {
  list.update(id, patch);
}

export function removeSession(id: string): void {
  list.remove(id);
}

export function replaceSessions(sessions: Session[]): void {
  list.replaceAll(sessions);
}

export function getLastSession(): Session | null {
  return list.items.reduce<Session | null>((latest, s) => (!latest || s.number > latest.number ? s : latest), null);
}

export function getNextSessionNumber(): number {
  const last = getLastSession();
  return (last?.number ?? 0) + 1;
}
