import { describe, expect, it } from 'vitest';
import { tickCharge, splitSections, isOverCapacity, capacity, MOUSE_LAYOUT, HIRELING_LAYOUT, type Item } from './items';

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
