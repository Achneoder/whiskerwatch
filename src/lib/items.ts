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

export function addItem(items: Item[], input: Omit<Item, 'id'>): Item[] {
  return [...items, { ...input, id: crypto.randomUUID() }];
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

/**
 * Splits the one flat `items` array into the three visual sections shared
 * by `ItemSlotGrid` (roster prep editor) and `LiveSessionInventoryModal`
 * (live table view) — one source of truth for the packing rule so both stay
 * in sync. Items are walked in order and packed into paws, then body, until
 * each budget is full; everything else goes in the pack. A 2-slot item is
 * never split across sections. If the carrier is encumbered, the overflow
 * just renders as extra filled pack cells beyond its nominal size —
 * nothing is ever hidden or dropped.
 */
export function splitSections(
  items: Item[],
  layout: InventoryLayout = MOUSE_LAYOUT,
): Record<InventorySection, Item[]> {
  const paws: Item[] = [];
  const body: Item[] = [];
  const pack: Item[] = [];
  let pawsUsed = 0;
  let bodyUsed = 0;
  for (const item of items) {
    if (pawsUsed + item.slots <= layout.paws) {
      paws.push(item);
      pawsUsed += item.slots;
    } else if (bodyUsed + item.slots <= layout.body) {
      body.push(item);
      bodyUsed += item.slots;
    } else {
      pack.push(item);
    }
  }
  return { paws, body, pack };
}
