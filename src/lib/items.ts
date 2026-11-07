/**
 * The item/slot-inventory model shared between `PartyMember` and
 * `Hireling`. Both use one flat list of items; the paw/body/pack split is a
 * UI convention over that single array, sized by an `InventoryLayout`
 * (SRD: mice 2/2/6 = 10 slots, hirelings 2/2/2 = 6). This module is deliberately narrow,
 * mirroring `combat.ts`: pure types + pure list-transform helpers, no
 * top-level rune state. The per-store `addMemberItem`/`addHirelingItem`
 * (etc.) wrappers in `party.svelte.ts`/`hirelings.svelte.ts` call these
 * and persist the result.
 */
export interface Item {
  id: string;
  name: string;
  /** Bulky items (heavy armor, two-handed weapons, big treasure) take 2. A
   * rare few (worn clothes, natural claws/teeth) take 0 — allowed, but not
   * special-cased anywhere. */
  slots: 1 | 2;
  /** Current charges on a 6-pip wear track, or `null` for non-chargeable items. */
  charges: number | null;
  /** Max charges on the wear track, or `null` for non-chargeable items. */
  maxCharges: number | null;
  /** Free-text field for damage dice, armor rating, or any other flavor/rules note. */
  notes: string;
  /**
   * Which section the GM put this item in (picked empty slot, or a drag and
   * drop). Optional: records from before this field existed, and items added
   * without a target (e.g. a forage ration, a hand-off), have none and are
   * packed into whatever space is left — see `splitSections`.
   */
  section?: InventorySection;
}

/** How many paw, body and pack slots an inventory has (SRD "Inventory slots" / "Hirelings"). */
export interface InventoryLayout {
  paws: number;
  body: number;
  pack: number;
}

export const MOUSE_LAYOUT: InventoryLayout = { paws: 2, body: 2, pack: 6 };
export const HIRELING_LAYOUT: InventoryLayout = { paws: 2, body: 2, pack: 2 };

export function capacity(layout: InventoryLayout): number {
  return layout.paws + layout.body + layout.pack;
}

/** A player mouse's slot total — the default for every capacity check. */
export const MAX_SLOTS = capacity(MOUSE_LAYOUT);

/** Sum of `slots` across every item carried — the number the cap is checked against. */
export function usedSlots(items: Item[]): number {
  return items.reduce((total, item) => total + item.slots, 0);
}

/**
 * Whether this list exceeds the layout's slots, i.e. the carrier is
 * *encumbered* (SRD: can't run, Disadvantage on all saves). Informational
 * only (a UI warning banner) — the SRD allows carrying more, so nothing in
 * this module or its callers should ever use this to block adding an item.
 */
export function isOverCapacity(items: Item[], layout: InventoryLayout = MOUSE_LAYOUT): boolean {
  return usedSlots(items) > capacity(layout);
}

/**
 * Appends a new item. When the input names a `section`, every existing item
 * is pinned to the section it currently renders in first (`pinSections`),
 * so the new item lands where the GM put it without shoving an older,
 * unpinned item somewhere else.
 */
export function addItem(items: Item[], input: Omit<Item, 'id'>, layout: InventoryLayout = MOUSE_LAYOUT): Item[] {
  const base = input.section ? pinSections(items, layout) : items;
  return [...base, { ...input, id: crypto.randomUUID() }];
}

export function removeItem(items: Item[], itemId: string): Item[] {
  return items.filter((item) => item.id !== itemId);
}

export function updateItem(items: Item[], itemId: string, patch: Partial<Omit<Item, 'id'>>): Item[] {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

/**
 * Ticks one charge off a chargeable item's wear track, floored at 0. A
 * no-op (returns the same `charges` value) if the item isn't found, isn't
 * chargeable (`charges`/`maxCharges` is `null`), or is already at 0 — the
 * caller (Live Session) is responsible for telling the GM "already empty"
 * in that last case rather than this function signaling it.
 */
export function tickCharge(items: Item[], itemId: string): Item[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    if (item.charges === null || item.maxCharges === null) return item;
    return { ...item, charges: Math.max(0, item.charges - 1) };
  });
}

export type InventorySection = 'paws' | 'body' | 'pack';

const SECTIONS: readonly InventorySection[] = ['paws', 'body', 'pack'];

export function isInventorySection(value: unknown): value is InventorySection {
  return typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);
}

/**
 * Splits the one flat `items` array into the three visual sections shared
 * by `ItemSlotGrid` (roster prep editor) and `LiveSessionInventoryModal`
 * (live table view) — one source of truth for the packing rule so both stay
 * in sync.
 *
 * Items with an explicit `section` go there first, as long as it has room
 * (the pack always has room). Items without one (or whose section is full)
 * are then walked in order and packed into paws, then body, until each
 * budget is full; everything else goes in the pack. A 2-slot item is never
 * split across sections. Within a section, items keep their array order. If
 * the carrier is encumbered, the overflow just renders as extra filled pack
 * cells beyond its nominal size — nothing is ever hidden or dropped.
 */
export function splitSections(
  items: Item[],
  layout: InventoryLayout = MOUSE_LAYOUT,
): Record<InventorySection, Item[]> {
  const used: Record<InventorySection, number> = { paws: 0, body: 0, pack: 0 };
  const placed = new Map<string, InventorySection>();
  const fits = (section: 'paws' | 'body', item: Item) => used[section] + item.slots <= layout[section];

  // Pass 1: honour explicit placements.
  for (const item of items) {
    const wanted = isInventorySection(item.section) ? item.section : null;
    if (wanted === 'pack') {
      placed.set(item.id, 'pack');
    } else if (wanted && fits(wanted, item)) {
      placed.set(item.id, wanted);
      used[wanted] += item.slots;
    }
  }
  // Pass 2: pack everything else into the space that is left.
  for (const item of items) {
    if (placed.has(item.id)) continue;
    const section: InventorySection = fits('paws', item) ? 'paws' : fits('body', item) ? 'body' : 'pack';
    placed.set(item.id, section);
    used[section] += item.slots;
  }

  const result: Record<InventorySection, Item[]> = { paws: [], body: [], pack: [] };
  for (const item of items) result[placed.get(item.id) ?? 'pack'].push(item);
  return result;
}

/** Drops a `section` value that isn't one of the three known sections (corrupt/stale storage). */
export function sanitizeSection(item: Item): Item {
  if (item.section === undefined || isInventorySection(item.section)) return item;
  const { section: _ignored, ...rest } = item;
  return rest;
}

/** Strips the placement so the item fills the first free slot wherever it goes next (e.g. a hand-off to another mouse). */
export function withoutSection(item: Item): Item {
  if (item.section === undefined) return item;
  const { section: _ignored, ...rest } = item;
  return rest;
}

/** Stamps every item with the section it currently renders in, so a later move can't reshuffle the others. */
export function pinSections(items: Item[], layout: InventoryLayout = MOUSE_LAYOUT): Item[] {
  const split = splitSections(items, layout);
  const sectionOf = new Map<string, InventorySection>();
  for (const section of SECTIONS) for (const item of split[section]) sectionOf.set(item.id, section);
  return items.map((item) => {
    const section = sectionOf.get(item.id) ?? 'pack';
    return item.section === section ? item : { ...item, section };
  });
}

/** True when every item renders in the section it is pinned to — i.e. the arrangement fits. */
function honoursPlacement(items: Item[], layout: InventoryLayout): boolean {
  const split = splitSections(items, layout);
  return SECTIONS.every((section) => split[section].every((item) => item.section === section));
}

/**
 * Drag and drop onto an empty slot: moves one item into `section` (at the
 * end of that section). Returns `null` when the item isn't found or doesn't
 * fit there (e.g. a 2-slot item into a paw with only one free slot), so the
 * caller can simply ignore the drop. The pack always fits.
 */
export function moveItemToSection(
  items: Item[],
  itemId: string,
  section: InventorySection,
  layout: InventoryLayout = MOUSE_LAYOUT,
): Item[] | null {
  const pinned = pinSections(items, layout);
  const item = pinned.find((i) => i.id === itemId);
  if (!item) return null;
  const next = [...pinned.filter((i) => i.id !== itemId), { ...item, section }];
  return honoursPlacement(next, layout) ? next : null;
}

/**
 * Drag and drop onto another item: the two trade places (section and
 * position). Returns `null` when either id is missing, they are the same
 * item, or the swap doesn't fit (e.g. a 2-slot pack item onto a single paw
 * item while the other paw is taken).
 */
export function swapItems(
  items: Item[],
  firstId: string,
  secondId: string,
  layout: InventoryLayout = MOUSE_LAYOUT,
): Item[] | null {
  if (firstId === secondId) return null;
  const pinned = pinSections(items, layout);
  const a = pinned.findIndex((i) => i.id === firstId);
  const b = pinned.findIndex((i) => i.id === secondId);
  if (a < 0 || b < 0) return null;
  const first = pinned[a]!;
  const second = pinned[b]!;
  const next = [...pinned];
  next[a] = { ...second, section: first.section ?? 'pack' };
  next[b] = { ...first, section: second.section ?? 'pack' };
  return honoursPlacement(next, layout) ? next : null;
}
