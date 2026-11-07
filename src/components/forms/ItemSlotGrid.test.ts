import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
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
    expect(onadd).toHaveBeenCalledWith({ name: 'Torch', slots: 1, charges: null, maxCharges: null, notes: '', section: 'paws' });
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
      section: 'paws',
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

  it('adds a new item to the section of the empty slot that was picked (pack, not paws)', async () => {
    const onadd = vi.fn();
    render(ItemSlotGrid, { props: { items: [], onadd, onremove: vi.fn(), onupdate: vi.fn() } });

    const pack = screen.getByText('Pack').parentElement!;
    await fireEvent.click(within(pack).getAllByRole('button', { name: 'Empty slot, add item' })[0]!);
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Rations' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onadd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rations', section: 'pack' }));
  });

  it('renders an item in the section it was placed in', () => {
    render(ItemSlotGrid, {
      props: { items: [makeItem({ name: 'Rations', section: 'pack' })], onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn() },
    });

    const pack = screen.getByText('Pack').parentElement!;
    const paws = screen.getByText('Paws').parentElement!;
    expect(within(pack).getByRole('button', { name: 'Rations, 1 slot, edit item' })).toBeInTheDocument();
    expect(within(paws).queryByRole('button', { name: /Rations/ })).not.toBeInTheDocument();
  });

  describe('drag and drop', () => {
    // jsdom has no layout, so point `elementFromPoint` at whichever element the test "hovers".
    let hovered: Element | null = null;
    beforeEach(() => {
      hovered = null;
      document.elementFromPoint = vi.fn(() => hovered);
    });

    async function dragOnto(source: HTMLElement, target: Element) {
      await fireEvent.pointerDown(source, { button: 0, isPrimary: true, pointerId: 1, pointerType: 'mouse', clientX: 0, clientY: 0 });
      hovered = target;
      await fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 40 });
      await fireEvent.pointerMove(window, { pointerId: 1, clientX: 80, clientY: 80 });
      await fireEvent.pointerUp(window, { pointerId: 1, clientX: 80, clientY: 80 });
    }

    it('moves an item onto an empty slot in another section', async () => {
      const onarrange = vi.fn();
      const rope = makeItem({ id: 'rope', name: 'Rope' });
      render(ItemSlotGrid, { props: { items: [rope], onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn(), onarrange } });

      const pack = screen.getByText('Pack').parentElement!;
      await dragOnto(
        screen.getByRole('button', { name: 'Rope, 1 slot, edit item' }),
        within(pack).getAllByRole('button', { name: 'Empty slot, add item' })[0]!,
      );

      expect(onarrange).toHaveBeenCalledWith([{ ...rope, section: 'pack' }]);
      // The drag must not also open the item editor.
      expect(screen.queryByTestId('item-editor')).not.toBeInTheDocument();
    });

    it('swaps two items when one is dropped onto the other', async () => {
      const onarrange = vi.fn();
      const sword = makeItem({ id: 'sword', name: 'Needle', section: 'paws' });
      const rations = makeItem({ id: 'rations', name: 'Rations', section: 'pack' });
      render(ItemSlotGrid, {
        props: { items: [sword, rations], onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn(), onarrange },
      });

      await dragOnto(
        screen.getByRole('button', { name: 'Rations, 1 slot, edit item' }),
        screen.getByRole('button', { name: 'Needle, 1 slot, edit item' }),
      );

      expect(onarrange).toHaveBeenCalledWith([
        { ...rations, section: 'paws' },
        { ...sword, section: 'pack' },
      ]);
    });

    it('refuses a drop that does not fit and says so', async () => {
      const onarrange = vi.fn();
      const items = [
        makeItem({ id: 'a', name: 'Needle', section: 'paws' }),
        makeItem({ id: 'b', name: 'Torch', section: 'paws' }),
        makeItem({ id: 'c', name: 'Spear', slots: 2, section: 'pack' }),
      ];
      render(ItemSlotGrid, { props: { items, onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn(), onarrange } });

      // A 2-slot spear can't trade places with one paw item while the other paw is taken.
      await dragOnto(
        screen.getByRole('button', { name: 'Spear, 2 slots, edit item' }),
        screen.getByRole('button', { name: 'Needle, 1 slot, edit item' }),
      );

      expect(onarrange).not.toHaveBeenCalled();
      expect(screen.getByText('Spear doesn’t fit there.')).toBeInTheDocument();
    });

    it('still opens the editor on a plain click without movement', async () => {
      const item = makeItem({ id: 'rope', name: 'Rope' });
      render(ItemSlotGrid, { props: { items: [item], onadd: vi.fn(), onremove: vi.fn(), onupdate: vi.fn(), onarrange: vi.fn() } });

      const slot = screen.getByRole('button', { name: 'Rope, 1 slot, edit item' });
      await fireEvent.pointerDown(slot, { button: 0, isPrimary: true, pointerId: 1, pointerType: 'mouse' });
      await fireEvent.pointerUp(window, { pointerId: 1 });
      await fireEvent.click(slot);

      expect(screen.getByTestId('item-editor')).toBeInTheDocument();
    });
  });
});
