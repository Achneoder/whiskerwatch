import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  ITEM_TABLE,
  NPC_NAMES,
  NPC_ROLES,
  NPC_QUIRKS,
  NPC_WANTS,
  entryAt,
  generateFrom,
  generateNpc,
  resolveNpc,
  rollNpc,
  type LocalizedTable,
} from './tables';

const TABLES: Record<string, LocalizedTable> = { ITEM_TABLE, NPC_NAMES, NPC_ROLES, NPC_QUIRKS, NPC_WANTS };

describe('generator tables', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(Object.entries(TABLES))('%s has the same number of entries in every locale', (_name, table) => {
    expect(table.de).toHaveLength(table.en.length);
  });

  it('generateFrom works for the item table', () => {
    expect(ITEM_TABLE.en).toContain(generateFrom(ITEM_TABLE));
    expect(ITEM_TABLE.de).toContain(generateFrom(ITEM_TABLE, 'de'));
  });

  it('generateNpc returns one value from each category', () => {
    const npc = generateNpc();

    expect(NPC_NAMES.en).toContain(npc.name);
    expect(NPC_ROLES.en).toContain(npc.role);
    expect(NPC_QUIRKS.en).toContain(npc.quirk);
    expect(NPC_WANTS.en).toContain(npc.want);
  });

  it('resolves the same rolled NPC in either language', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const roll = rollNpc();

    expect(resolveNpc(roll, 'en').name).toBe('Thistle');
    expect(resolveNpc(roll, 'de').name).toBe('Distel');
    expect(resolveNpc(roll, 'de').role).toBe(NPC_ROLES.de[0]);
  });

  it('falls back to English for an unknown locale or missing locale', () => {
    expect(entryAt(NPC_NAMES, 1, 'fr')).toBe('Bramble');
    expect(entryAt(NPC_NAMES, 1, null)).toBe('Bramble');
  });
});
