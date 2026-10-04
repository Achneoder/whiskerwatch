/**
 * Tracks when the campaign was last "backed up" — either exported or
 * imported (see `campaignExport.ts`'s `exportCampaign`/`importCampaign`,
 * both of which call `markBackedUp` on success). A GM who just imported a
 * file already holds an external copy of their data, so that counts as
 * "backed up" too — see docs/design/phase-14-quickfind-and-backup-reminder.md
 * Part 2's "track backups, not just exports" design decision.
 *
 * This is a single small preference-shaped value — `localStorage`, not
 * IndexedDB, per CLAUDE.md's storage-tier guidance (same tier as
 * `theme.svelte.ts`'s theme flag). Wrapped in `$state` (like `theme.svelte.ts`)
 * so `Dashboard`'s `$derived` reads of `getLastBackupAt()` recompute
 * automatically the moment `markBackedUp()` runs — no manual refresh/timer
 * needed for the reminder to collapse right after an export.
 */
const STORAGE_KEY = 'whiskerwatch:lastBackupAt';

const state = $state<{ lastBackupAt: string | null }>({ lastBackupAt: localStorage.getItem(STORAGE_KEY) });

export function getLastBackupAt(): string | null {
  return state.lastBackupAt;
}

export function markBackedUp(): void {
  const now = new Date().toISOString();
  state.lastBackupAt = now;
  localStorage.setItem(STORAGE_KEY, now);
}
