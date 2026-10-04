import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/svelte';
import LiveSessionInventoryModal from './LiveSessionInventoryModal.svelte';
import type { Item } from '../../lib/items';

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

interface Recipient {
  id: string;
  name: string;
  kind: 'party' | 'hireling';
  items: Item[];
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Pip',
    items: [] as Item[],
    open: true,
    recipients: [] as Recipient[],
    movingItemId: null as string | null,
    onburn: vi.fn(),
    onclose: vi.fn(),
    onrequestmove: vi.fn(),
    onmove: vi.fn(),
    oncancelmove: vi.fn(),
    ...overrides,
  };
}

describe('LiveSessionInventoryModal', () => {
  it('renders nothing when closed', () => {
    render(LiveSessionInventoryModal, { props: baseProps({ open: false }) });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the mouse name and the used/max slots line', () => {
    render(LiveSessionInventoryModal, {
      props: baseProps({ items: [makeItem({ id: 'a', slots: 2 })] }),
    });

    expect(screen.getByText('Pip')).toBeInTheDocument();
    expect(screen.getByText('2 / 10 slots used')).toBeInTheDocument();
  });

  it('renders a non-chargeable item as static in the main zone (no burn tap affordance)', () => {
    render(LiveSessionInventoryModal, {
      props: baseProps({ items: [makeItem({ id: 'a', name: 'Rope', charges: null, maxCharges: null })] }),
    });

    expect(screen.getByText('Rope')).toBeInTheDocument();
    // The only button touching "Rope" should be the move strip, not a burn target.
    expect(screen.getByRole('button', { name: 'Move Rope' })).toBeInTheDocument();
  });

  it('renders a chargeable item as a tap target that calls onburn with its id', async () => {
    const onburn = vi.fn();
    render(LiveSessionInventoryModal, {
      props: baseProps({ items: [makeItem({ id: 'lantern-1', name: 'Lantern', charges: 4, maxCharges: 6 })], onburn }),
    });

    const cell = screen.getByRole('button', { name: /^Lantern, 4 of 6 charges, tap to use one/i });
    await fireEvent.click(cell);

    expect(onburn).toHaveBeenCalledWith('lantern-1');
  });

  it('renders the charge dots reflecting current vs max', () => {
    render(LiveSessionInventoryModal, {
      props: baseProps({ items: [makeItem({ id: 'a', name: 'Lantern', charges: 2, maxCharges: 4 })] }),
    });

    expect(screen.getByText('●●○○')).toBeInTheDocument();
  });

  it('stays open after a tap (parent controls `open`, not this component)', async () => {
    render(LiveSessionInventoryModal, {
      props: baseProps({ items: [makeItem({ id: 'a', name: 'Lantern', charges: 4, maxCharges: 6 })] }),
    });

    await fireEvent.click(screen.getByRole('button', { name: /^Lantern,/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a notice with an undo affordance and wires it up', async () => {
    const undo = vi.fn();
    const ondismissnotice = vi.fn();
    render(LiveSessionInventoryModal, {
      props: baseProps({ notice: { text: 'Lantern used a charge (2/6 left)', undo }, ondismissnotice }),
    });

    expect(screen.getByText('Lantern used a charge (2/6 left)')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(undo).toHaveBeenCalledOnce();
    expect(ondismissnotice).toHaveBeenCalledOnce();
  });

  it('closes via the close callback', async () => {
    const onclose = vi.fn();
    render(LiveSessionInventoryModal, { props: baseProps({ onclose }) });

    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onclose).toHaveBeenCalledOnce();
  });

  describe('item hand-off (Phase 13)', () => {
    it('has a separate, non-overlapping move strip alongside the burn zone for a chargeable item', async () => {
      const onrequestmove = vi.fn();
      const onburn = vi.fn();
      render(LiveSessionInventoryModal, {
        props: baseProps({
          items: [makeItem({ id: 'lantern-1', name: 'Lantern', charges: 4, maxCharges: 6 })],
          onrequestmove,
          onburn,
        }),
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Move Lantern' }));

      expect(onrequestmove).toHaveBeenCalledWith('lantern-1');
      expect(onburn).not.toHaveBeenCalled();
    });

    it('swaps to the recipient picker showing "Move {item} to:" and lists every recipient with their slot usage', () => {
      render(LiveSessionInventoryModal, {
        props: baseProps({
          items: [makeItem({ id: 'torch-1', name: 'Torch' })],
          movingItemId: 'torch-1',
          recipients: [
            { id: 'r1', name: 'Pip', kind: 'party', items: [makeItem({ id: 'x', slots: 1 })] },
            { id: 'r2', name: 'Sables', kind: 'hireling', items: [] },
          ],
        }),
      });

      expect(screen.getByText('Move Torch to:')).toBeInTheDocument();
      const pipRow = screen.getByRole('button', { name: /Pip/ });
      expect(pipRow).toHaveTextContent('1/10');
      const hirelingRow = screen.getByRole('button', { name: /Sables/ });
      expect(hirelingRow).toHaveTextContent('Hireling');
      expect(hirelingRow).toHaveTextContent('0/6');
    });

    it('executes the move immediately on tapping a recipient row, no confirm step', async () => {
      const onmove = vi.fn();
      render(LiveSessionInventoryModal, {
        props: baseProps({
          items: [makeItem({ id: 'torch-1', name: 'Torch' })],
          movingItemId: 'torch-1',
          recipients: [{ id: 'r1', name: 'Pip', kind: 'party', items: [] }],
          onmove,
        }),
      });

      await fireEvent.click(screen.getByRole('button', { name: /Pip/ }));

      expect(onmove).toHaveBeenCalledWith('torch-1', 'r1');
    });

    it('shows a non-blocking encumbered warning when a recipient would exceed the slot cap, but the row stays tappable', async () => {
      const onmove = vi.fn();
      render(LiveSessionInventoryModal, {
        props: baseProps({
          items: [makeItem({ id: 'torch-1', name: 'Torch', slots: 1 })],
          movingItemId: 'torch-1',
          recipients: [
            {
              id: 'r1',
              name: 'Sables',
              kind: 'hireling',
              items: Array.from({ length: 6 }, (_, i) => makeItem({ id: `full-${i}`, slots: 1 })),
            },
          ],
          onmove,
        }),
      });

      const row = screen.getByRole('button', { name: /Sables/ });
      expect(row).toHaveTextContent('will be encumbered');
      expect(row).not.toBeDisabled();

      await fireEvent.click(row);

      expect(onmove).toHaveBeenCalledWith('torch-1', 'r1');
    });

    it('goes back to the item grid without moving anything via ← Back', async () => {
      const oncancelmove = vi.fn();
      render(LiveSessionInventoryModal, {
        props: baseProps({
          items: [makeItem({ id: 'torch-1', name: 'Torch' })],
          movingItemId: 'torch-1',
          recipients: [{ id: 'r1', name: 'Pip', kind: 'party', items: [] }],
          oncancelmove,
        }),
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(oncancelmove).toHaveBeenCalledOnce();
    });

    it('shows a plain message instead of an empty list when there is no one else to hand off to', () => {
      render(LiveSessionInventoryModal, {
        props: baseProps({
          items: [makeItem({ id: 'torch-1', name: 'Torch' })],
          movingItemId: 'torch-1',
          recipients: [],
        }),
      });

      expect(screen.getByText('No one else to hand this off to.')).toBeInTheDocument();
    });
  });
});
