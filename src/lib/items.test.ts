import { describe, expect, it } from 'vitest';
import {
  tickCharge,
  splitSections,
  isOverCapacity,
  capacity,
  addItem,
  pinSections,
  moveItemToSection,
  swapItems,
  sanitizeSection,
  withoutSection,
  MOUSE_LAYOUT,
  HIRELING_LAYOUT,
  type Item,
} from './items';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    name: 'Torch',
    slots: 1,
    charges: null,
    maxCharges: null,
    notes: '',
    ...overrides,
  };
}

describe('tickCharge', () => {
  it('decrements charges by 1', () => {
    const items = [makeItem({ id: 'a', charges: 3, maxCharges: 6 })];

    const result = tickCharge(items, 'a');

    expect(result[0]?.charges).toBe(2);
  });

  it('floors at 0 rather than going negative', () => {
    const items = [makeItem({ id: 'a', charges: 0, maxCharges: 6 })];

    const result = tickCharge(items, 'a');

    expect(result[0]?.charges).toBe(0);
  });

  it('is a no-op for a non-chargeable item (charges/maxCharges null)', () => {
    const items = [makeItem({ id: 'a', charges: null, maxCharges: null })];

    const result = tickCharge(items, 'a');

    expect(result[0]?.charges).toBeNull();
  });

  it('is a no-op when the item id is not found', () => {
    const items = [makeItem({ id: 'a', charges: 3, maxCharges: 6 })];

    const result = tickCharge(items, 'missing');

    expect(result).toEqual(items);
    expect(result).not.toBe(items[0]);
  });

  it('does not mutate the original array or item', () => {
    const original = makeItem({ id: 'a', charges: 3, maxCharges: 6 });
    const items = [original];

    const result = tickCharge(items, 'a');

    expect(original.charges).toBe(3);
    expect(result).not.toBe(items);
  });

  it('only touches the matching item, leaving others untouched', () => {
    const items = [
      makeItem({ id: 'a', charges: 3, maxCharges: 6 }),
      makeItem({ id: 'b', charges: 5, maxCharges: 6 }),
    ];

    const result = tickCharge(items, 'b');

    expect(result[0]?.charges).toBe(3);
    expect(result[1]?.charges).toBe(4);
  });
});

describe('splitSections', () => {
  it('packs a mouse into 2 paws, then 2 body, then the pack', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => makeItem({ id, slots: 1 }));

    const { paws, body, pack } = splitSections(items);

    expect(paws.map((i) => i.id)).toEqual(['a', 'b']);
    expect(body.map((i) => i.id)).toEqual(['c', 'd']);
    expect(pack.map((i) => i.id)).toEqual(['e']);
  });

  it('never splits a 2-slot item across sections', () => {
    // One paw slot left, so the 2-slot item skips paws and goes to body.
    const items = [makeItem({ id: 'a', slots: 1 }), makeItem({ id: 'b', slots: 2 }), makeItem({ id: 'c', slots: 1 })];

    const { paws, body } = splitSections(items);

    expect(paws.map((i) => i.id)).toEqual(['a', 'c']);
    expect(body.map((i) => i.id)).toEqual(['b']);
  });

  it('puts encumbered overflow in the pack instead of dropping it', () => {
    const items = Array.from({ length: 8 }, (_, i) => makeItem({ id: `i${i}`, slots: 1 }));

    const { pack } = splitSections(items, HIRELING_LAYOUT);

    expect(pack).toHaveLength(4);
    expect(isOverCapacity(items, HIRELING_LAYOUT)).toBe(true);
    expect(isOverCapacity(items)).toBe(false);
  });

  it('returns empty sections for an empty list', () => {
    expect(splitSections([])).toEqual({ paws: [], body: [], pack: [] });
  });
});

describe('layouts', () => {
  it('match the SRD: mice 10 slots, hirelings 6', () => {
    expect(capacity(MOUSE_LAYOUT)).toBe(10);
    expect(capacity(HIRELING_LAYOUT)).toBe(6);
  });
});

describe('explicit item placement', () => {
  it('puts an item with a section in that section, even when the paws are free', () => {
    const { paws, pack } = splitSections([makeItem({ id: 'a', section: 'pack' })]);

    expect(paws).toEqual([]);
    expect(pack.map((i) => i.id)).toEqual(['a']);
  });

  it('packs unplaced items around placed ones', () => {
    const items = [
      makeItem({ id: 'old1' }),
      makeItem({ id: 'old2' }),
      makeItem({ id: 'new', section: 'paws' }),
    ];

    const { paws, body } = splitSections(items);

    expect(paws.map((i) => i.id)).toEqual(['old1', 'new']);
    expect(body.map((i) => i.id)).toEqual(['old2']);
  });

  it('falls back to the first free slot when its section is full, instead of dropping it', () => {
    const items = [
      makeItem({ id: 'a', section: 'paws' }),
      makeItem({ id: 'b', section: 'paws' }),
      makeItem({ id: 'c', section: 'paws' }),
    ];

    expect(splitSections(items).body.map((i) => i.id)).toEqual(['c']);
  });

  it('ignores an unknown section value', () => {
    const items = [makeItem({ id: 'a', section: 'tail' as never })];

    expect(splitSections(items).paws.map((i) => i.id)).toEqual(['a']);
    expect(sanitizeSection(items[0]!)).not.toHaveProperty('section');
  });
});

describe('addItem with a section', () => {
  it('adds the item to the chosen section without moving the existing items', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];

    const next = addItem(items, { name: 'Rations', slots: 1, charges: null, maxCharges: null, notes: '', section: 'pack' });

    const { paws, pack } = splitSections(next);
    expect(paws.map((i) => i.id)).toEqual(['a', 'b']);
    expect(pack.map((i) => i.name)).toEqual(['Rations']);
  });

  it('does not let a new paw item shove an older paw item away', () => {
    const items = [makeItem({ id: 'a' })];

    const next = addItem(items, { name: 'Needle', slots: 1, charges: null, maxCharges: null, notes: '', section: 'paws' });

    expect(splitSections(next).paws.map((i) => i.name)).toEqual(['Torch', 'Needle']);
  });
});

describe('pinSections', () => {
  it('stamps each item with the section it renders in', () => {
    const items = ['a', 'b', 'c'].map((id) => makeItem({ id }));

    expect(pinSections(items).map((i) => i.section)).toEqual(['paws', 'paws', 'body']);
  });
});

describe('moveItemToSection', () => {
  it('moves an item into another section and leaves the rest in place', () => {
    const items = ['a', 'b', 'c'].map((id) => makeItem({ id }));

    const next = moveItemToSection(items, 'a', 'pack')!;

    const { paws, body, pack } = splitSections(next);
    expect(paws.map((i) => i.id)).toEqual(['b']);
    expect(body.map((i) => i.id)).toEqual(['c']);
    expect(pack.map((i) => i.id)).toEqual(['a']);
  });

  it('refuses a move into a section without room', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c', section: 'pack' })];

    expect(moveItemToSection(items, 'c', 'paws')).toBeNull();
  });

  it('refuses a 2-slot item into a section with only one free slot', () => {
    const items = [makeItem({ id: 'a', section: 'paws' }), makeItem({ id: 'big', slots: 2, section: 'pack' })];

    expect(moveItemToSection(items, 'big', 'paws')).toBeNull();
  });

  it('always lets an item into the pack, even when encumbered', () => {
    const items = Array.from({ length: 11 }, (_, i) => makeItem({ id: `i${i}` }));

    expect(moveItemToSection(items, 'i0', 'pack')).not.toBeNull();
  });

  it('returns null for an unknown item', () => {
    expect(moveItemToSection([], 'missing', 'pack')).toBeNull();
  });
});

describe('swapItems', () => {
  it('swaps section and order of two items', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c', section: 'pack' })];

    const next = swapItems(items, 'a', 'c')!;

    const { paws, pack } = splitSections(next);
    expect(paws.map((i) => i.id)).toEqual(['c', 'b']);
    expect(pack.map((i) => i.id)).toEqual(['a']);
  });

  it('swaps a 2-slot item with a 2-slot item across sections', () => {
    const items = [makeItem({ id: 'big1', slots: 2, section: 'paws' }), makeItem({ id: 'big2', slots: 2, section: 'body' })];

    const next = swapItems(items, 'big1', 'big2')!;

    expect(splitSections(next).paws.map((i) => i.id)).toEqual(['big2']);
    expect(splitSections(next).body.map((i) => i.id)).toEqual(['big1']);
  });

  it('refuses a swap that would overfill a section', () => {
    const items = [
      makeItem({ id: 'a', section: 'paws' }),
      makeItem({ id: 'b', section: 'paws' }),
      makeItem({ id: 'big', slots: 2, section: 'pack' }),
    ];

    expect(swapItems(items, 'big', 'a')).toBeNull();
  });

  it('returns null for the same item or an unknown id', () => {
    const items = [makeItem({ id: 'a' })];

    expect(swapItems(items, 'a', 'a')).toBeNull();
    expect(swapItems(items, 'a', 'missing')).toBeNull();
  });
});

describe('withoutSection', () => {
  it('strips the placement so a handed-off item fills the first free slot', () => {
    expect(withoutSection(makeItem({ section: 'pack' }))).not.toHaveProperty('section');
  });
});
