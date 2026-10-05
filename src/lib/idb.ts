/**
 * Thin promise-based wrapper around the native IndexedDB API, backing every
 * `createPersistedList` store (see `stores/persistedList.svelte.ts`).
 *
 * All of a campaign's persisted lists share a single `items` object store,
 * keyed by `${listKey}::${id}` with a non-unique index on `listKey` — this
 * mirrors the old one-key-per-list localStorage model (one logical "list" per
 * caller) while letting a single fixed schema serve every store, including
 * ad hoc keys used only in tests, without a database version bump per store.
 *
 * A separate `meta` object store tracks, per list key, whether that list has
 * ever been initialized — this is what lets a deliberately-emptied list
 * (e.g. "reset all campaign data") stay empty on the next load instead of
 * silently reseeding with demo data, which a plain "is the store empty?"
 * check could not distinguish from "never touched yet".
 */

const DB_NAME = 'whiskerwatch';
const DB_VERSION = 1;
const ITEMS_STORE = 'items';
const META_STORE = 'meta';

export interface Identified {
  id: string;
}

interface StoredRecord {
  key: string;
  listKey: string;
  id: string;
  value: unknown;
}

interface MetaRecord {
  key: string;
  value: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ITEMS_STORE)) {
        const store = db.createObjectStore(ITEMS_STORE, { keyPath: 'key' });
        store.createIndex('listKey', 'listKey', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB open request was blocked.'));
  });

  // Don't cache a rejection forever — a transient failure shouldn't
  // permanently wedge every future call into the same failed promise.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function recordKey(listKey: string, id: string): string {
  return `${listKey}::${id}`;
}

/** Reads every item currently stored under `listKey`. */
export async function idbGetAll<T extends Identified>(listKey: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(ITEMS_STORE, 'readonly');
  const index = tx.objectStore(ITEMS_STORE).index('listKey');
  const records = await promisifyRequest<StoredRecord[]>(index.getAll(IDBKeyRange.only(listKey)));
  return records.map((r) => r.value as T);
}

/**
 * Overwrites the entire contents of `listKey`: looks up every existing
 * primary key under `listKey` (via a single `getAllKeys` on the index) and
 * deletes them, then puts the new items — all in one transaction. Avoids a
 * long-lived cursor's delete-then-continue chain, which is more sensitive to
 * losing the transaction's "active" window under real event-loop scheduling.
 */
export async function idbReplaceAll<T extends Identified>(listKey: string, items: T[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, 'readwrite');
    const store = tx.objectStore(ITEMS_STORE);
    const index = store.index('listKey');
    const keysReq = index.getAllKeys(IDBKeyRange.only(listKey));

    keysReq.onsuccess = () => {
      for (const key of keysReq.result) {
        store.delete(key);
      }
      for (const item of items) {
        const record: StoredRecord = { key: recordKey(listKey, item.id), listKey, id: item.id, value: item };
        store.put(record);
      }
    };
    keysReq.onerror = () => reject(keysReq.error ?? new Error('IndexedDB key lookup failed.'));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

async function getMeta(key: string): Promise<unknown> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readonly');
  const record = await promisifyRequest<MetaRecord | undefined>(tx.objectStore(META_STORE).get(key));
  return record?.value;
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({ key, value } satisfies MetaRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB meta write failed.'));
  });
}

async function deleteMeta(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB meta delete failed.'));
  });
}

function initializedMetaKey(listKey: string): string {
  return `initialized:${listKey}`;
}

/**
 * Reads a legacy localStorage key's raw array contents, if any — deliberately
 * untyped (`unknown[]`) since a pre-migration record may predate fields this
 * app's current schema (or even an `id`) assumes exist; callers are
 * responsible for sanitizing before treating these as real entities.
 */
function readLegacyLocalStorage(listKey: string): unknown[] | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(listKey);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface HydrateResult {
  /** Untyped on purpose — the caller (`persistedList.svelte.ts`) sanitizes this before use. */
  raw: unknown;
  /**
   * True the first time this list key has ever been seen (fresh install, or
   * IndexedDB genuinely has nothing under this key yet). The caller is
   * responsible for sanitizing `raw` and then calling `finalizeFirstBoot`
   * with the *sanitized* (id-guaranteed) result — this function deliberately
   * does not write anything to IndexedDB itself, so a legacy pre-id record
   * never gets persisted under a colliding synthetic key.
   */
  isFirstBoot: boolean;
}

/**
 * Determines the initial contents for a persisted list: whatever's already
 * in IndexedDB if this list has been initialized before, otherwise whatever
 * a legacy localStorage key of the same name holds (or `seed`, on a genuine
 * first-ever boot).
 *
 * Idempotent by design: once a list has been initialized (tracked in the
 * `meta` store), this always returns whatever IndexedDB currently holds —
 * even an empty array — so a deliberate reset-to-empty never silently
 * reseeds on the next load, and running migration twice never duplicates
 * data.
 *
 * Degrades gracefully if IndexedDB itself is unavailable or throws: falls
 * back to any legacy localStorage data, or `seed`, and reports
 * `isFirstBoot: false` so the caller doesn't try to write anything back to
 * the (evidently broken) database — the list simply stays in-memory-only
 * for this session, matching `createPersistedList`'s fire-and-forget
 * persistence, which will likewise fail silently on every later mutation.
 */
export async function hydrateList<T extends Identified>(listKey: string, seed: T[]): Promise<HydrateResult> {
  try {
    const alreadyInitialized = await getMeta(initializedMetaKey(listKey));
    if (alreadyInitialized) {
      return { raw: await idbGetAll<T>(listKey), isFirstBoot: false };
    }
    const legacy = readLegacyLocalStorage(listKey);
    return { raw: legacy ?? seed, isFirstBoot: true };
  } catch (err) {
    console.error(`Failed to hydrate "${listKey}" from IndexedDB; falling back to local data for this session.`, err);
    return { raw: readLegacyLocalStorage(listKey) ?? seed, isFirstBoot: false };
  }
}

/**
 * Completes a first-ever boot for `listKey`: persists the already-sanitized
 * (id-guaranteed) `items` to IndexedDB, marks the list initialized, and
 * drops the now-migrated legacy localStorage key (if any) so it can't be
 * confused for a still-live source of truth.
 */
export async function finalizeFirstBoot<T extends Identified>(listKey: string, items: T[]): Promise<void> {
  await idbReplaceAll(listKey, items);
  await setMeta(initializedMetaKey(listKey), true);
  try {
    localStorage.removeItem(listKey);
  } catch {
    // Non-fatal — the old key just lingers unused.
  }
}

/** Fire-and-forget-friendly persistence: overwrites `listKey`'s IndexedDB contents with `items`. */
export async function persistList<T extends Identified>(listKey: string, items: T[]): Promise<void> {
  await idbReplaceAll(listKey, items);
}

/**
 * Clears a persisted list's IndexedDB contents (used by "reset all campaign
 * data"). Marks the list as initialized so it doesn't reseed with demo data
 * on the next load.
 */
export async function clearList(listKey: string): Promise<void> {
  await idbReplaceAll(listKey, []);
  await setMeta(initializedMetaKey(listKey), true);
}

/**
 * Clears a persisted list *and* forgets that it was ever initialized (used by
 * "restore sample campaign"), so the next load treats it as a first-ever boot
 * and reseeds it with the store's demo data — the inverse of `clearList`.
 */
export async function resetListToSeed(listKey: string): Promise<void> {
  await idbReplaceAll(listKey, []);
  await deleteMeta(initializedMetaKey(listKey));
}
