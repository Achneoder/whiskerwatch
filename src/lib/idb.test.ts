import { describe, expect, it, beforeEach } from 'vitest';
import { idbGetAll, idbReplaceAll, hydrateList, finalizeFirstBoot, persistList, clearList, resetListToSeed } from './idb';

interface Thing {
  id: string;
  label: string;
}

describe('idb', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('idbReplaceAll / idbGetAll', () => {
    it('writes items and reads them back', async () => {
      await idbReplaceAll<Thing>('idb-test:basic', [
        { id: '1', label: 'a' },
        { id: '2', label: 'b' },
      ]);

      expect(await idbGetAll<Thing>('idb-test:basic')).toEqual([
        { id: '1', label: 'a' },
        { id: '2', label: 'b' },
      ]);
    });

    it('overwrites the previous contents entirely on the next call', async () => {
      await idbReplaceAll<Thing>('idb-test:overwrite', [{ id: '1', label: 'a' }]);
      await idbReplaceAll<Thing>('idb-test:overwrite', [{ id: '2', label: 'b' }]);

      expect(await idbGetAll<Thing>('idb-test:overwrite')).toEqual([{ id: '2', label: 'b' }]);
    });

    it('keeps separate list keys from colliding', async () => {
      await idbReplaceAll<Thing>('idb-test:list-a', [{ id: '1', label: 'in a' }]);
      await idbReplaceAll<Thing>('idb-test:list-b', [{ id: '1', label: 'in b' }]);

      expect(await idbGetAll<Thing>('idb-test:list-a')).toEqual([{ id: '1', label: 'in a' }]);
      expect(await idbGetAll<Thing>('idb-test:list-b')).toEqual([{ id: '1', label: 'in b' }]);
    });

    it('reads back an empty array for a list key that was never written', async () => {
      expect(await idbGetAll<Thing>('idb-test:never-written')).toEqual([]);
    });
  });

  describe('hydrateList / finalizeFirstBoot — migration from localStorage', () => {
    it('reports a first boot and returns legacy localStorage data, without writing to IndexedDB yet', async () => {
      localStorage.setItem('idb-test:legacy', JSON.stringify([{ id: '1', label: 'from-localstorage' }]));

      const result = await hydrateList<Thing>('idb-test:legacy', [{ id: 'seed', label: 'unused' }]);

      expect(result.isFirstBoot).toBe(true);
      expect(result.raw).toEqual([{ id: '1', label: 'from-localstorage' }]);
      // Not migrated into IndexedDB until the caller sanitizes and calls
      // finalizeFirstBoot — hydrateList itself never writes.
      expect(await idbGetAll('idb-test:legacy')).toEqual([]);
    });

    it('falls back to the seed when there is no legacy localStorage data', async () => {
      const seed: Thing[] = [{ id: 'seed', label: 'demo' }];
      const result = await hydrateList<Thing>('idb-test:fresh', seed);

      expect(result.isFirstBoot).toBe(true);
      expect(result.raw).toEqual(seed);
    });

    it('finalizeFirstBoot persists data, marks the list initialized, and clears the legacy key', async () => {
      localStorage.setItem('idb-test:finalize', JSON.stringify([{ id: '1', label: 'from-localstorage' }]));

      const { raw } = await hydrateList<Thing>('idb-test:finalize', []);
      await finalizeFirstBoot('idb-test:finalize', raw as Thing[]);

      expect(await idbGetAll<Thing>('idb-test:finalize')).toEqual([{ id: '1', label: 'from-localstorage' }]);
      expect(localStorage.getItem('idb-test:finalize')).toBeNull();
    });

    it('is idempotent: a second hydrateList call reads IndexedDB, not localStorage, and never duplicates data', async () => {
      localStorage.setItem('idb-test:idempotent', JSON.stringify([{ id: '1', label: 'original' }]));

      const first = await hydrateList<Thing>('idb-test:idempotent', []);
      await finalizeFirstBoot('idb-test:idempotent', first.raw as Thing[]);

      // Simulate a stale/reintroduced localStorage key from an old backup —
      // it must be ignored now that this list has been initialized.
      localStorage.setItem('idb-test:idempotent', JSON.stringify([{ id: '2', label: 'should be ignored' }]));

      const second = await hydrateList<Thing>('idb-test:idempotent', []);

      expect(second.isFirstBoot).toBe(false);
      expect(second.raw).toEqual([{ id: '1', label: 'original' }]);
      expect(await idbGetAll<Thing>('idb-test:idempotent')).toEqual([{ id: '1', label: 'original' }]);
    });

    it('never loses items to key collisions when legacy records share no real id', async () => {
      // A genuinely pre-id legacy record (simulating data saved before an
      // `id` field existed at all) — sanitizing this is the caller's job,
      // but hydrateList/finalizeFirstBoot must not silently collapse two
      // distinct records into one just because the id-less migration step
      // saw them at the same moment.
      localStorage.setItem('idb-test:pre-id', JSON.stringify([{ label: 'a' }, { label: 'b' }]));

      const { raw } = await hydrateList<Thing>('idb-test:pre-id', []);
      const sanitized = (raw as { label: string }[]).map((item, i) => ({ id: `generated-${i}`, label: item.label }));
      await finalizeFirstBoot('idb-test:pre-id', sanitized);

      expect(await idbGetAll<Thing>('idb-test:pre-id')).toHaveLength(2);
    });
  });

  describe('clearList', () => {
    it('empties a list and marks it initialized so it does not reseed', async () => {
      await idbReplaceAll<Thing>('idb-test:clear', [{ id: '1', label: 'a' }]);

      await clearList('idb-test:clear');

      expect(await idbGetAll<Thing>('idb-test:clear')).toEqual([]);
      const seed: Thing[] = [{ id: 'seed', label: 'demo' }];
      const result = await hydrateList<Thing>('idb-test:clear', seed);
      expect(result.isFirstBoot).toBe(false);
      expect(result.raw).toEqual([]);
    });
  });

  describe('resetListToSeed', () => {
    it('empties a list and forgets it was initialized so the next load reseeds it', async () => {
      await finalizeFirstBoot<Thing>('idb-test:reseed', [{ id: '1', label: 'edited' }]);

      await resetListToSeed('idb-test:reseed');

      expect(await idbGetAll<Thing>('idb-test:reseed')).toEqual([]);
      const seed: Thing[] = [{ id: 'seed', label: 'demo' }];
      const result = await hydrateList<Thing>('idb-test:reseed', seed);
      expect(result.isFirstBoot).toBe(true);
      expect(result.raw).toEqual(seed);
    });

    it('also reseeds a list that was previously reset to empty', async () => {
      await clearList('idb-test:reseed-cleared');

      await resetListToSeed('idb-test:reseed-cleared');

      const seed: Thing[] = [{ id: 'seed', label: 'demo' }];
      expect((await hydrateList<Thing>('idb-test:reseed-cleared', seed)).raw).toEqual(seed);
    });
  });

  describe('persistList', () => {
    it('overwrites a list key (equivalent to idbReplaceAll, used for fire-and-forget writes)', async () => {
      await persistList<Thing>('idb-test:persist', [{ id: '1', label: 'a' }]);
      expect(await idbGetAll<Thing>('idb-test:persist')).toEqual([{ id: '1', label: 'a' }]);
    });
  });

  describe('graceful degradation when IndexedDB is unavailable', () => {
    it('hydrateList falls back to legacy localStorage data (or seed) instead of throwing', async () => {
      const originalIndexedDb = globalThis.indexedDB;
      // @ts-expect-error simulating an environment without IndexedDB support
      delete globalThis.indexedDB;

      try {
        // A fresh module instance so its cached DB-connection promise (from
        // earlier tests in this file, using the real fake-indexeddb) can't
        // paper over the simulated outage.
        const modulePath = './idb?no-indexeddb-1';
        const fresh: typeof import('./idb') = await import(/* @vite-ignore */ modulePath);

        localStorage.setItem('idb-test:broken-with-legacy', JSON.stringify([{ id: '1', label: 'still readable' }]));
        const withLegacy = await fresh.hydrateList<Thing>('idb-test:broken-with-legacy', []);
        expect(withLegacy.raw).toEqual([{ id: '1', label: 'still readable' }]);
        expect(withLegacy.isFirstBoot).toBe(false);

        const seed: Thing[] = [{ id: 'seed', label: 'demo' }];
        const withoutLegacy = await fresh.hydrateList<Thing>('idb-test:broken-no-legacy', seed);
        expect(withoutLegacy.raw).toEqual(seed);
        expect(withoutLegacy.isFirstBoot).toBe(false);
      } finally {
        globalThis.indexedDB = originalIndexedDb;
      }
    });

    it('idbReplaceAll/idbGetAll reject instead of hanging, so a fire-and-forget write fails loudly to its own .catch()', async () => {
      const originalIndexedDb = globalThis.indexedDB;
      // @ts-expect-error simulating an environment without IndexedDB support
      delete globalThis.indexedDB;

      try {
        const modulePath = './idb?no-indexeddb-2';
        const fresh: typeof import('./idb') = await import(/* @vite-ignore */ modulePath);
        await expect(fresh.idbReplaceAll<Thing>('idb-test:broken-write', [{ id: '1', label: 'a' }])).rejects.toThrow();
        await expect(fresh.idbGetAll<Thing>('idb-test:broken-write')).rejects.toThrow();
      } finally {
        globalThis.indexedDB = originalIndexedDb;
      }
    });
  });
});
