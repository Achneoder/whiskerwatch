import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ItemSlotGrid from './ItemSlotGrid.svelte';
import type { Item } from '../../lib/items';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    name: 'Rope',
    slots: 1,
    charges: null,
    maxCharges: null,
    notes: '',
    ...overrides,
  };
}

describe('ItemSlotGrid', () => {
  it('renders empty slots when there are no items', () => {
    render(ItemSlotGrid, { props: { items: [], onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn() } });

    // 4 paws + 6 body = 10 empty slots
    expect(screen.getAllByRole('button', { name: 'Empty slot, add item' })).toHaveLength(10);
  });

  it('renders a filled slot for a carried item with a descriptive aria-label', () => {
    render(ItemSlotGrid, {
      props: { items: [makeItem({ name: 'Rope', slots: 1 })], onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn() },
    });

    expect(screen.getByRole('button', { name: 'Rope, 1 slot, edit item' })).toBeInTheDocument();
    // One slot is now taken, so only 9 empty slots remain.
    expect(screen.getAllByRole('button', { name: 'Empty slot, add item' })).toHaveLength(9);
  });

  it('renders a 2-slot item spanning two grid columns', () => {
    render(ItemSlotGrid, {
      props: {
        items: [makeItem({ name: 'Lantern & Oil', slots: 2 })],
        onadd: vi.fn(),
        onremove: vi.fn(),
        onupdate: vi.fn(),
      },
    });

    const slot = screen.getByRole('button', { name: 'Lantern & Oil, 2 slots, edit item' });
    expect(slot.className).toContain('col-span-2');
  });

  it('opens an inline editor from an empty slot and adds an item', async () => {
    const onadd = vi.fn();
    render(ItemSlotGrid, { props: { items: [], onadd, onremove: vi.fn(), onupdate: vi.fn() } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'Empty slot, add item' })[0]!);

    expect(screen.getByText('Editing slot')).toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Torch' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onadd).toHaveBeenCalledOnce();
    expect(onadd).toHaveBeenCalledWith({ name: 'Torch', slots: 1, charges: null, maxCharges: null, notes: '' });
  });

  it('does not add an item when the name is left blank', async () => {
    const onadd = vi.fn();
    render(ItemSlotGrid, { props: { items: [], onadd, onremove: vi.fn(), onupdate: vi.fn() } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'Empty slot, add item' })[0]!);
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onadd).not.toHaveBeenCalled();
  });

  it('opens an inline editor pre-filled from a filled slot and saves an update', async () => {
    const onupdate = vi.fn();
    const item = makeItem({ id: 'rope-1', name: 'Rope' });
    render(ItemSlotGrid, { props: { items: [item], onadd: vi.fn(), onremove: vi.fn(), onupdate } });

    await fireEvent.click(screen.getByRole('button', { name: 'Rope, 1 slot, edit item' }));

    expect(screen.getByDisplayValue('Rope')).toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Rope (frayed)' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onupdate).toHaveBeenCalledWith('rope-1', {
      name: 'Rope (frayed)',
      slots: 1,
      charges: null,
      maxCharges: null,
      notes: '',
    });
  });

  it('removes an item from the inline editor', async () => {
    const onremove = vi.fn();
    const item = makeItem({ id: 'rope-1', name: 'Rope' });
    render(ItemSlotGrid, { props: { items: [item], onadd: vi.fn(), onremove, onupdate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Rope, 1 slot, edit item' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Remove item' }));

    expect(onremove).toHaveBeenCalledWith('rope-1');
  });

  it('sets slots and charges from the editor controls', async () => {
    const onadd = vi.fn();
    render(ItemSlotGrid, { props: { items: [], onadd, onremove: vi.fn(), onupdate: vi.fn() } });

    await fireEvent.click(screen.getAllByRole('button', { name: 'Empty slot, add item' })[0]!);
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Lantern & Oil' } });
    await fireEvent.click(screen.getByRole('button', { name: '2' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Increase' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onadd).toHaveBeenCalledWith({
      name: 'Lantern & Oil',
      slots: 2,
      charges: 2,
      maxCharges: 2,
      notes: '',
    });
  });

  it('gives the charge-pip row a words-based aria-label', () => {
    render(ItemSlotGrid, {
      props: {
        items: [makeItem({ name: 'Lantern', charges: 3, maxCharges: 6 })],
        onadd: vi.fn(),
        onremove: vi.fn(),
        onupdate: vi.fn(),
      },
    });

    expect(screen.getByRole('img', { name: '3 of 6 charges remaining' })).toBeInTheDocument();
  });

  it('shows no Encumbered warning at exactly the 10-slot cap', () => {
    const items = Array.from({ length: 10 }, (_, i) => makeItem({ id: `i${i}`, name: `Item ${i}`, slots: 1 }));
    render(ItemSlotGrid, { props: { items, onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn() } });

    expect(screen.queryByText('Encumbered.')).not.toBeInTheDocument();
  });

  it('shows the Encumbered warning once over the 10-slot cap, without dropping or blocking anything', () => {
    const items = Array.from({ length: 11 }, (_, i) => makeItem({ id: `i${i}`, name: `Item ${i}`, slots: 1 }));
    render(ItemSlotGrid, { props: { items, onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn() } });

    expect(screen.getByText('Encumbered.')).toBeInTheDocument();
    // Nothing is hidden or dropped — all 11 items still render as filled, tappable slots.
    for (const item of items) {
      expect(screen.getByRole('button', { name: `${item.name}, 1 slot, edit item` })).toBeInTheDocument();
    }
    // And an "Add item" affordance is still available — over capacity never blocks adding more.
    expect(screen.getAllByRole('button', { name: 'Empty slot, add item' }).length).toBeGreaterThan(0);
  });
});
