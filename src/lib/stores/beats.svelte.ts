import { createPersistedList } from './persistedList.svelte';
import { logBeatCompleted } from './campaignHistory.svelte';
import { ready as adventuresReady, getAdventures, replaceAdventures, type Adventure, type AdventureStatus } from './adventures.svelte';
import { DEMO_BEATS } from '../demoCampaign';

export type BeatStatus = 'planned' | 'active' | 'done';

export interface Beat {
  id: string;
  parentId: string | null;
  title: string;
  notes: string;
  status: BeatStatus;
  /** Hex this beat plays out at/around, if any — set from the Beat form, surfaced read-only on Hex Map. */
  hexNodeId: string | null;
  /** Factions this beat touches, if any — set from the Beat form, surfaced read-only on Factions. */
  factionIds: string[];
  /**
   * The Adventure this beat belongs to. Every beat, including root-level
   * ones, belongs to exactly one adventure. The seed beat below is
   * deliberately given the empty-string sentinel rather than a real id —
   * `migrateLegacyBeatsToAdventures` treats any falsy `adventureId` (this
   * sentinel, or an entirely missing field on data persisted before this
   * field existed) as "not yet migrated" and promotes it into a real
   * `Adventure` on first boot, so a genuinely fresh install and a
   * long-running campaign upgrading through this feature both go through
   * the exact same, idempotent code path.
   */
  adventureId: string;
}

/** Fields callers may omit when adding a beat; defaulted below so downstream code never needs optional-chaining. */
export type BeatInput = Omit<Beat, 'id' | 'hexNodeId' | 'factionIds'> & {
  hexNodeId?: string | null;
  factionIds?: string[];
};

const STORAGE_KEY = 'whiskerwatch:beats';

const seedBeats: Beat[] = [
  {
    id: crypto.randomUUID(),
    parentId: null,
    ...DEMO_BEATS[0]!.en,
    status: 'active',
    hexNodeId: null,
    factionIds: [],
    adventureId: '',
  },
];

const list = createPersistedList<Beat>(STORAGE_KEY, seedBeats);

function collectDescendantIdsIn(beats: Beat[], id: string): string[] {
  const children = beats.filter((b) => b.parentId === id);
  return children.flatMap((c) => [c.id, ...collectDescendantIdsIn(beats, c.id)]);
}

const beatStatusToAdventureStatus: Record<BeatStatus, AdventureStatus> = {
  planned: 'planned',
  active: 'active',
  done: 'completed',
};

/**
 * Promotes every legacy root-level beat (`parentId === null` with a falsy
 * `adventureId` — i.e. never migrated) into its own `Adventure`:
 *
 * - A new `Adventure` is created whose `title`/`description`/`status` are
 *   copied from the root beat's `title`/`notes`/`status` (`done` maps to
 *   `completed`).
 * - The root beat's direct children are reparented to `parentId: null` (they
 *   become the new roots within that adventure), and every descendant of the
 *   root beat (children, grandchildren, ...) is tagged with the new
 *   `adventureId`.
 * - The root beat itself is dropped — its data now lives in the `Adventure`.
 * - A root beat with no children is simply replaced by an adventure with no
 *   beats under it yet.
 *
 * Idempotent and pure: a beat that already has an `adventureId` is returned
 * untouched, and calling this again on its own output is a no-op (returns
 * the same `beats` reference and an empty `adventures` array). Shared by the
 * one-time boot migration below and by `campaignExport.ts`'s import of a
 * pre-Adventures-feature export file.
 */
export function migrateLegacyBeatsToAdventures(beats: Beat[]): { beats: Beat[]; adventures: Adventure[] } {
  const legacyRoots = beats.filter((b) => b.parentId === null && !b.adventureId);
  if (legacyRoots.length === 0) return { beats, adventures: [] };

  const newAdventures: Adventure[] = [];
  const adventureIdByRootId = new Map<string, string>();
  const descendantIdsByRootId = new Map<string, Set<string>>();

  for (const root of legacyRoots) {
    const adventureId = crypto.randomUUID();
    adventureIdByRootId.set(root.id, adventureId);
    descendantIdsByRootId.set(root.id, new Set(collectDescendantIdsIn(beats, root.id)));
    newAdventures.push({
      id: adventureId,
      title: root.title,
      description: root.notes,
      status: beatStatusToAdventureStatus[root.status],
    });
  }

  const rootIds = new Set(legacyRoots.map((r) => r.id));

  const migratedBeats = beats
    .filter((b) => !rootIds.has(b.id))
    .map((b) => {
      if (b.parentId !== null && rootIds.has(b.parentId)) {
        return { ...b, parentId: null, adventureId: adventureIdByRootId.get(b.parentId)! };
      }
      for (const [rootId, descendantIds] of descendantIdsByRootId) {
        if (descendantIds.has(b.id)) {
          return { ...b, adventureId: adventureIdByRootId.get(rootId)! };
        }
      }
      return b;
    });

  return { beats: migratedBeats, adventures: newAdventures };
}

/**
 * Resolves once this store's data has been hydrated from IndexedDB (see
 * `persistedList.svelte.ts`) and backfilled for legacy records saved before
 * `hexNodeId`/`factionIds`/`adventureId` existed, so downstream code can
 * rely on all three fields always being present. Waits on `adventures.svelte`'s
 * own `ready` too, since the `adventureId` backfill below needs to read/write
 * that store. App boot awaits this (alongside every other store) before
 * mounting `App.svelte`.
 */
export const ready: Promise<void> = Promise.all([list.ready, adventuresReady]).then(() => {
  if (list.items.some((b) => b.hexNodeId === undefined || !Array.isArray(b.factionIds))) {
    list.replaceAll(
      list.items.map((b) => ({
        ...b,
        hexNodeId: b.hexNodeId ?? null,
        factionIds: Array.isArray(b.factionIds) ? b.factionIds : [],
      }))
    );
  }

  // One-time (but safe to re-run) promotion of any pre-Adventures-feature
  // root beat into its own Adventure — see `migrateLegacyBeatsToAdventures`.
  const { beats: migratedBeats, adventures: newAdventures } = migrateLegacyBeatsToAdventures(list.items);
  if (newAdventures.length > 0) {
    replaceAdventures([...getAdventures(), ...newAdventures]);
    list.replaceAll(migratedBeats);
  }
});

/** See `PersistedList.flush` — awaited by `campaignExport.ts` after `replaceBeats` to guarantee an import is durably saved. */
export const flush: () => Promise<void> = () => list.flush();

export function getBeats(): Beat[] {
  return list.items;
}

export function addBeat(input: BeatInput): void {
  list.add({
    ...input,
    hexNodeId: input.hexNodeId ?? null,
    factionIds: input.factionIds ?? [],
    id: crypto.randomUUID(),
  });
}

export function updateBeat(id: string, patch: Partial<Omit<Beat, 'id'>>): void {
  const before = list.items.find((b) => b.id === id);
  // Snapshot the fields we need before mutating — `list.update` mutates `before` in place
  // (it's the same object reference held in the array), so reading `before.status` after
  // the update would always see the *new* status.
  const wasDone = before?.status === 'done';
  const title = before?.title;
  const hexNodeId = before?.hexNodeId;
  const factionIds = before?.factionIds;

  list.update(id, patch);

  if (before && !wasDone && patch.status === 'done') {
    logBeatCompleted({
      timestamp: new Date().toISOString(),
      beatId: before.id,
      title: title ?? '',
      hexNodeId: hexNodeId ?? null,
      factionIds: factionIds ?? [],
    });
  }
}

function collectDescendantIds(id: string): string[] {
  return collectDescendantIdsIn(list.items, id);
}

export function getDescendantCount(id: string): number {
  return collectDescendantIds(id).length;
}

export function removeBeat(id: string): void {
  const ids = new Set([id, ...collectDescendantIds(id)]);
  list.replaceAll(list.items.filter((b) => !ids.has(b.id)));
}

export function replaceBeats(beats: Beat[]): void {
  list.replaceAll(beats);
}

/** Nulls out `hexNodeId` on any beat referencing it — call when a hex node is removed. */
export function clearHexNodeFromBeats(hexNodeId: string): void {
  list.items.filter((b) => b.hexNodeId === hexNodeId).forEach((b) => list.update(b.id, { hexNodeId: null }));
}

/** Drops a faction id from every beat's `factionIds` — call when a faction is removed. */
export function removeFactionFromBeats(factionId: string): void {
  list.items
    .filter((b) => b.factionIds.includes(factionId))
    .forEach((b) => list.update(b.id, { factionIds: b.factionIds.filter((id) => id !== factionId) }));
}
