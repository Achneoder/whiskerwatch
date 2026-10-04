import { describe, expect, it, beforeEach } from 'vitest';
import { getLastBackupAt, markBackedUp } from './backupTracking.svelte';

describe('backupTracking store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when the campaign has never been backed up', () => {
    expect(getLastBackupAt()).toBeNull();
  });

  it('records an ISO timestamp in localStorage and in-memory state when marked backed up', () => {
    markBackedUp();

    const stored = getLastBackupAt();
    expect(stored).not.toBeNull();
    expect(new Date(stored!).toString()).not.toBe('Invalid Date');
    expect(localStorage.getItem('whiskerwatch:lastBackupAt')).toBe(stored);
  });

  it('overwrites the previous timestamp on a second call', async () => {
    markBackedUp();
    const first = getLastBackupAt();

    await new Promise((resolve) => setTimeout(resolve, 5));
    markBackedUp();
    const second = getLastBackupAt();

    expect(second).not.toBe(first);
    expect(new Date(second!).getTime()).toBeGreaterThan(new Date(first!).getTime());
  });
});
