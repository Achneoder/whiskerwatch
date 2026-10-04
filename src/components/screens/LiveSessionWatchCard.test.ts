import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LiveSessionWatchCard, { type WatchNeighborOption, type WatchRecipient } from './LiveSessionWatchCard.svelte';

const meadowNeighbor: WatchNeighborOption = { q: -1, r: 0, label: 'B3', terrain: 'meadow', cost: 1, id: 'meadow1' };
const forestNeighbor: WatchNeighborOption = { q: 0, r: -1, label: 'C2', terrain: 'forest', cost: 2, id: 'forest1' };
const waterNeighbor: WatchNeighborOption = { q: 0, r: 1, label: 'C4', terrain: 'water', cost: null };
const unmappedNeighbor: WatchNeighborOption = { q: 1, r: -1, label: 'D2', terrain: null, cost: null };

const sixNeighbors: WatchNeighborOption[] = [
  { q: 1, r: 0, label: 'D3', terrain: null, cost: null },
  forestNeighbor,
  unmappedNeighbor,
  meadowNeighbor,
  waterNeighbor,
  { q: 0, r: 1, label: 'C4b', terrain: null, cost: null },
];

const recipients: WatchRecipient[] = [
  { id: 'p1', name: 'Wren', kind: 'party' },
  { id: 'h1', name: 'Oat', kind: 'hireling' },
];

function baseProps() {
  return {
    day: 2,
    watch: 2 as const,
    restedThisDay: false,
    currentHex: { id: 'hex1', name: 'The Hedgerow Hollow', terrain: 'hedgerow' as const },
    neighbors: sixNeighbors,
    suggestedStartHex: null,
    lastCheckResult: null,
    exhaustedPending: false,
    recipients,
    forageResult: null,
    showTwoWatchNote: false,
    onstay: vi.fn(),
    onforage: vi.fn(),
    onmove: vi.fn(),
    onsetstart: vi.fn(),
    onaddforagerecipient: vi.fn(),
    onapplyexhausted: vi.fn(),
    ondismissexhausted: vi.fn(),
    onnavigate: vi.fn(),
  };
}

describe('LiveSessionWatchCard', () => {
  describe('state 1 — no position set yet', () => {
    it('offers to start at the suggested beat-linked hex when there is one', () => {
      const onsetstart = vi.fn();
      render(LiveSessionWatchCard, {
        props: {
          ...baseProps(),
          currentHex: null,
          suggestedStartHex: { id: 'hex1', name: 'The Hedgerow Hollow', terrain: 'hedgerow' },
          onsetstart,
        },
      });

      expect(screen.getByText('Where does the party start?')).toBeInTheDocument();
      const startButton = screen.getByRole('button', { name: 'Start at The Hedgerow Hollow' });
      expect(startButton).toBeInTheDocument();

      fireEvent.click(startButton);
      expect(onsetstart).toHaveBeenCalledWith('hex1');
    });

    it('falls back to an Open Hex Map ghost button when there is no suggested hex', () => {
      const onnavigate = vi.fn();
      render(LiveSessionWatchCard, { props: { ...baseProps(), currentHex: null, suggestedStartHex: null, onnavigate } });

      expect(screen.queryByRole('button', { name: /Start at/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Open Hex Map' }));
      expect(onnavigate).toHaveBeenCalledOnce();
    });

    it('renders no chip row while position is unset', () => {
      render(LiveSessionWatchCard, { props: { ...baseProps(), currentHex: null } });

      expect(screen.queryByRole('button', { name: 'Stay put' })).not.toBeInTheDocument();
    });
  });

  describe('state 2 — steady state', () => {
    it('shows the day/watch header and current hex', () => {
      render(LiveSessionWatchCard, { props: baseProps() });

      expect(screen.getByText('Day 2 · Watch 2 (Midday)')).toBeInTheDocument();
      expect(screen.getByText('Standing in: The Hedgerow Hollow (Hedgerow)')).toBeInTheDocument();
    });

    it('does not show the encounter-check tag on a non-check watch', () => {
      render(LiveSessionWatchCard, { props: baseProps() });

      expect(screen.queryByText('Encounter check')).not.toBeInTheDocument();
    });

    it('renders Stay put and Forage chips that call their handlers', async () => {
      const onstay = vi.fn();
      const onforage = vi.fn();
      render(LiveSessionWatchCard, { props: { ...baseProps(), onstay, onforage } });

      await fireEvent.click(screen.getByRole('button', { name: 'Stay put' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Forage' }));

      expect(onstay).toHaveBeenCalledOnce();
      expect(onforage).toHaveBeenCalledOnce();
    });

    it('renders a chip per resolvable neighbor labeled by hex label and terrain, with a ×2 badge for difficult terrain', () => {
      render(LiveSessionWatchCard, { props: baseProps() });

      expect(screen.getByRole('button', { name: 'B3·Meadow' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'C2·Forest ×2' })).toBeInTheDocument();
    });

    it('calls onmove with the destination hex id when a neighbor chip is tapped', async () => {
      const onmove = vi.fn();
      render(LiveSessionWatchCard, { props: { ...baseProps(), onmove } });

      await fireEvent.click(screen.getByRole('button', { name: 'B3·Meadow' }));

      expect(onmove).toHaveBeenCalledWith('meadow1');
    });

    it('renders disabled dash chips for unmapped and water neighbors with a reason in the accessible name', () => {
      render(LiveSessionWatchCard, { props: baseProps() });

      const unmapped = screen.getByRole('button', { name: 'D2: Not mapped yet' });
      expect(unmapped).toBeDisabled();
      expect(unmapped).toHaveTextContent('—');

      const water = screen.getByRole('button', { name: 'C4: No path across water' });
      expect(water).toBeDisabled();
      expect(water).toHaveTextContent('—');
    });

    it('shows a Rested today tag once the day has seen a Stay put watch', () => {
      render(LiveSessionWatchCard, { props: { ...baseProps(), restedThisDay: true } });

      expect(screen.getByText('Rested today')).toBeInTheDocument();
    });
  });

  describe('state 3 — an encounter-check watch', () => {
    it('shows the encounter-check tag alongside the same chip row', () => {
      render(LiveSessionWatchCard, { props: { ...baseProps(), watch: 3 } });

      expect(screen.getByText('Encounter check')).toBeInTheDocument();
      expect(screen.getByText('Day 2 · Watch 3 (Evening)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Stay put' })).toBeInTheDocument();
    });
  });

  describe('after a tap — inline check result', () => {
    it('shows a success-styled roll and "No encounter" caption on a miss', () => {
      render(LiveSessionWatchCard, { props: { ...baseProps(), lastCheckResult: { roll: 4, hit: false } } });

      expect(screen.getByText('No encounter')).toBeInTheDocument();
    });

    it('shows a fail-styled roll and "Encounter!" caption on a hit', () => {
      render(LiveSessionWatchCard, { props: { ...baseProps(), lastCheckResult: { roll: 1, hit: true } } });

      expect(screen.getByText('Encounter!')).toBeInTheDocument();
    });

    it('shows the two-watch footnote only when flagged', () => {
      const { rerender } = render(LiveSessionWatchCard, { props: { ...baseProps(), showTwoWatchNote: false } });
      expect(screen.queryByText(/Two watches pass/)).not.toBeInTheDocument();

      rerender({ ...baseProps(), showTwoWatchNote: true });
      expect(screen.getByText(/Two watches pass — one encounter check already made\./)).toBeInTheDocument();
    });
  });

  describe('forage recipient flow', () => {
    it('shows the rolled rations and a recipient row, and calls onaddforagerecipient on tap', async () => {
      const onaddforagerecipient = vi.fn();
      render(LiveSessionWatchCard, {
        props: { ...baseProps(), forageResult: { rations: 3 }, onaddforagerecipient },
      });

      expect(screen.getByText('3 Rations rolled')).toBeInTheDocument();
      expect(screen.getByText('Add to:')).toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: /Wren/ }));
      expect(onaddforagerecipient).toHaveBeenCalledWith('p1');
    });

    it('tags hireling recipients distinctly from party recipients', () => {
      render(LiveSessionWatchCard, { props: { ...baseProps(), forageResult: { rations: 1 } } });

      const oatRow = screen.getByRole('button', { name: /Oat/ });
      expect(oatRow).toHaveTextContent('Hireling');
    });

    it('renders no forage section when forageResult is null', () => {
      render(LiveSessionWatchCard, { props: baseProps() });

      expect(screen.queryByText('Add to:')).not.toBeInTheDocument();
    });

    it('shows the "rations added" confirmation footer once a recipient is chosen', () => {
      render(LiveSessionWatchCard, {
        props: { ...baseProps(), notice: { text: "3 Rations added to Wren's bag" } },
      });

      expect(screen.getByText("3 Rations added to Wren's bag")).toBeInTheDocument();
    });
  });

  describe('exhausted banner', () => {
    it('shows the banner and calls onapplyexhausted/ondismissexhausted', async () => {
      const onapplyexhausted = vi.fn();
      const ondismissexhausted = vi.fn();
      render(LiveSessionWatchCard, {
        props: { ...baseProps(), exhaustedPending: true, onapplyexhausted, ondismissexhausted },
      });

      expect(screen.getByText('No rest yesterday — apply Exhausted to the party?')).toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(onapplyexhausted).toHaveBeenCalledOnce();

      await fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(ondismissexhausted).toHaveBeenCalledOnce();
    });

    it('renders no banner when exhaustedPending is false', () => {
      render(LiveSessionWatchCard, { props: baseProps() });

      expect(screen.queryByText(/apply Exhausted/)).not.toBeInTheDocument();
    });
  });
});
