import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HexCanvas from './HexCanvas.svelte';
import type { HexNode } from '../../lib/stores/hexmap.svelte';

function hexNode(overrides: Partial<HexNode> = {}): HexNode {
  return {
    id: '1',
    q: 0,
    r: 0,
    terrain: 'settlement',
    name: 'Bramblewatch',
    notes: '',
    discovered: true,
    encounters: [],
    controlledBy: null,
    contestedBy: [],
    ...overrides,
  };
}

/** The paw-print glyph's path data — a stable fingerprint for "the marker rendered." */
const PAW_PATH_D = 'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z';

describe('HexCanvas', () => {
  it('renders no position marker when currentHex is null', () => {
    const { container } = render(HexCanvas, { props: { hexes: [hexNode()], onselect: vi.fn() } });

    expect(container.querySelector(`path[d="${PAW_PATH_D}"]`)).not.toBeInTheDocument();
  });

  it('renders the paw-print position marker at the current hex', () => {
    const { container } = render(HexCanvas, {
      props: { hexes: [hexNode()], currentHex: { q: 0, r: 0 }, onselect: vi.fn() },
    });

    expect(container.querySelector(`path[d="${PAW_PATH_D}"]`)).toBeInTheDocument();
  });

  it('appends "Party is here." to the current hex\'s accessible label', () => {
    render(HexCanvas, { props: { hexes: [hexNode()], currentHex: { q: 0, r: 0 }, onselect: vi.fn() } });

    expect(screen.getByRole('button', { name: /Bramblewatch, Settlement Party is here\./ })).toBeInTheDocument();
  });

  it('does not append "Party is here." to a different hex\'s accessible label', () => {
    const other = hexNode({ id: '2', q: 1, r: 0, name: 'The Gnawgate', terrain: 'ruins' });
    render(HexCanvas, {
      props: { hexes: [hexNode(), other], currentHex: { q: 0, r: 0 }, onselect: vi.fn() },
    });

    const otherButton = screen.getByRole('button', { name: /The Gnawgate/ });
    expect(otherButton).not.toHaveAccessibleName(/Party is here/);
  });

  it('renders every hex as an accessible button labeled by its coordinate even with no marker', () => {
    render(HexCanvas, { props: { hexes: [], onselect: vi.fn() } });

    expect(screen.getByRole('button', { name: 'C3' })).toBeInTheDocument();
  });
});
