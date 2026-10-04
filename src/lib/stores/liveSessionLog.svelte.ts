/**
 * A session-scoped, in-memory (never persisted) log of notable things that
 * happen during Live Session — the raw material for the auto-recap draft
 * offered when the GM ends the session. Unlike every other store in
 * `lib/stores/`, this one deliberately does NOT go through
 * `persistedList.svelte.ts`/`storage.ts`: it should NOT survive a refresh or
 * carry over between sittings, so it's cleared whenever Live Session is
 * entered (see `LiveSession.svelte`'s mount effect) or the recap is drafted.
 */

export type LiveSessionEventRole = 'party' | 'hireling';

export type LiveSessionEvent =
  | { id: string; kind: 'beatStatusChanged'; beatId: string; title: string; from: string; to: string }
  | { id: string; kind: 'factionClockChanged'; factionId: string; name: string; from: number; to: number; max: number }
  | { id: string; kind: 'death'; name: string; role: LiveSessionEventRole }
  | { id: string; kind: 'scarGained'; name: string; role: LiveSessionEventRole; scarLabel: string; scarNote: string }
  | { id: string; kind: 'conditionGained'; name: string; role: LiveSessionEventRole; condition: string }
  | { id: string; kind: 'strDrained'; name: string; role: LiveSessionEventRole; newStr: number }
  | { id: string; kind: 'advancement'; name: string; role: LiveSessionEventRole; newLevel: number }
  | { id: string; kind: 'moraleFailed'; name: string };

// Plain `Omit<Union, 'id'>` doesn't distribute over a discriminated union —
// `keyof` on a union only sees the members' *common* keys, so it collapses
// each variant's own fields (e.g. `name`, `factionId`) and TS rejects them
// at every call site. Distributing the `Omit` per-member keeps each
// variant's shape intact.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Fields the caller provides — `id` is always assigned here so every event has a stable checklist key. */
export type LiveSessionEventInput = DistributiveOmit<LiveSessionEvent, 'id'>;

// A stable array reference (mutated via push/splice, never reassigned) so
// every caller of `getLiveSessionEvents()` sees the same reactive proxy,
// mirroring `persistedList.svelte.ts`'s `items`.
const events = $state<LiveSessionEvent[]>([]);

export function getLiveSessionEvents(): LiveSessionEvent[] {
  return events;
}

export function logEvent(input: LiveSessionEventInput): void {
  events.push({ ...input, id: crypto.randomUUID() } as LiveSessionEvent);
}

export function clearLog(): void {
  events.splice(0, events.length);
}

/**
 * Rules-accurate one-line wording for a recap bullet, per the
 * gm-product-owner-reviewed phrasing in the roadmap ("reached level N" not
 * "leveled up", "STR drained to N" not "took damage", etc). The `• ` prefix
 * is added by the caller when compiling the checked lines, not here, so
 * this stays reusable for the on-screen checklist row too.
 */
export function describeEvent(event: LiveSessionEvent): string {
  switch (event.kind) {
    case 'beatStatusChanged':
      return event.to === 'done'
        ? `Resolved: '${event.title}'`
        : `Advanced: '${event.title}' (${event.from} → ${event.to})`;
    case 'factionClockChanged':
      return `${event.name} clock ${event.from}/${event.max} → ${event.to}/${event.max}`;
    case 'death':
      return `${event.name} died`;
    case 'scarGained':
      return `${event.name} gained the scar '${event.scarLabel}' — ${event.scarNote}`;
    case 'conditionGained':
      return `${event.name} gained the ${event.condition} condition`;
    case 'strDrained':
      return `${event.name}'s STR drained to ${event.newStr}`;
    case 'advancement':
      return `${event.name} reached level ${event.newLevel}`;
    case 'moraleFailed':
      return `${event.name} failed a morale save`;
  }
}

/** Which recap section (Beats / Factions / Party / Hirelings) an event belongs under. */
export function groupForEvent(event: LiveSessionEvent): 'beats' | 'factions' | 'party' | 'hirelings' {
  switch (event.kind) {
    case 'beatStatusChanged':
      return 'beats';
    case 'factionClockChanged':
      return 'factions';
    case 'moraleFailed':
      return 'hirelings';
    default:
      return event.role === 'hireling' ? 'hirelings' : 'party';
  }
}
