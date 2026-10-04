import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import HexMap from './HexMap.svelte';
import { replaceHexNodes, type HexNode } from '../../lib/stores/hexmap.svelte';
import { replaceBeats } from '../../lib/stores/beats.svelte';
import { replaceBestiary, type BestiaryEntry } from '../../lib/stores/bestiary.svelte';
import { replaceFactions, type Faction } from '../../lib/stores/factions.svelte';
import { replaceAdventures, getAdventures } from '../../lib/stores/adventures.svelte';

const home: HexNode = {
  id: '1',
  q: 0,
  r: 0,
  terrain: 'settlement',
  name: 'Bramblewatch',
  notes: 'Home warren',
  discovered: true,
  encounters: [],
  controlledBy: null,
  contestedBy: [],
};

describe('HexMap', () => {
  beforeEach(() => {
    replaceHexNodes([]);
    replaceBeats([]);
    replaceBestiary([]);
    replaceFactions([]);
    replaceAdventures([]);
  });

  it('renders a seeded content hex by its accessible label', () => {
    replaceHexNodes([home]);
    render(HexMap, { props: { onnavigate: vi.fn() } });

    expect(screen.getByRole('button', { name: /Bramblewatch/ })).toBeInTheDocument();
  });

  it('opens the add editor when an empty hex is tapped', async () => {
    render(HexMap, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'C3' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Describe hex')).toBeInTheDocument();
  });

  it('opens the edit editor prefilled when a content hex is tapped', async () => {
    replaceHexNodes([home]);
    render(HexMap, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

    expect(screen.getByDisplayValue('Bramblewatch')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Home warren')).toBeInTheDocument();
  });

  it('shows the empty state when there are no hexes', () => {
    render(HexMap, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText(/No hexes charted yet/)).toBeInTheDocument();
  });

  it('shows beats touching a hex in its detail modal', async () => {
    replaceHexNodes([home]);
    replaceBeats([
      { id: 'b1', parentId: null, title: 'The granary raid', notes: '', status: 'active', hexNodeId: '1', factionIds: [], adventureId: 'adv-1' },
    ]);
    render(HexMap, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

    expect(screen.getByText('Beats touching this hex')).toBeInTheDocument();
    expect(screen.getByText('The granary raid')).toBeInTheDocument();
  });

  it('shows encounters linked to a hex in its detail modal', async () => {
    const ratling: BestiaryEntry = {
      id: 'r1',
      name: 'Gnawing Court Ratling',
      category: 'Vermin',
      hd: 2,
      hp: 4,
      armor: 1,
      attacks: [],
      special: '',
      notes: '',
    };
    replaceBestiary([ratling]);
    replaceHexNodes([{ ...home, encounters: [{ bestiaryId: 'r1', weight: 3 }] }]);
    render(HexMap, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

    expect(screen.getByText('Encounters here')).toBeInTheDocument();
    expect(screen.getByText('Gnawing Court Ratling ×3')).toBeInTheDocument();
  });

  it('shows territory tags for a controlled and contested hex in its detail modal', async () => {
    const gnawingCourt: Faction = {
      id: 'f1',
      name: 'The Gnawing Court',
      disposition: 'hostile',
      clock: 3,
      of: 6,
      note: '',
      tags: [],
    };
    const seedKeepers: Faction = {
      id: 'f2',
      name: 'The Seed-Keepers',
      disposition: 'ally',
      clock: 1,
      of: 6,
      note: '',
      tags: [],
    };
    replaceFactions([gnawingCourt, seedKeepers]);
    replaceHexNodes([{ ...home, controlledBy: 'f1', contestedBy: ['f2'] }]);
    render(HexMap, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

    // "Controlled by"/"Contested by" and faction names also appear in the Territory
    // form fields below the read-only block, so scope to `span` (the Tag/label
    // elements) rather than the `<option>`s inside the form's `<select>`s.
    expect(screen.getAllByText('Controlled by', { selector: 'span' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Gnawing Court', { selector: 'span' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contested by', { selector: 'span' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Seed-Keepers', { selector: 'span' }).length).toBeGreaterThan(0);
  });

  describe('quick-find focus hand-off', () => {
    it('selects and opens the matching hex detail modal, then consumes the focus request', () => {
      replaceHexNodes([home]);
      const onconsumedfocus = vi.fn();
      render(HexMap, { props: { onnavigate: vi.fn(), focusId: '1', onconsumedfocus } });

      expect(screen.getByDisplayValue('Bramblewatch')).toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });

    it('is a quiet no-op when focusId matches no hex node', () => {
      replaceHexNodes([home]);
      const onconsumedfocus = vi.fn();
      render(HexMap, { props: { onnavigate: vi.fn(), focusId: 'missing', onconsumedfocus } });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });
  });

  describe('"Party is here" placement (Phase 15)', () => {
    it('shows no row when there is no active adventure', async () => {
      replaceHexNodes([home]);
      render(HexMap, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

      expect(screen.queryByTestId('party-is-here-row')).not.toBeInTheDocument();
    });

    it('shows no row when 2+ adventures are active — ambiguous which one to place', async () => {
      replaceHexNodes([home]);
      replaceAdventures([
        { id: 'adv-1', title: 'The granary raid', description: '', status: 'active' },
        { id: 'adv-2', title: 'The Gnawing Court', description: '', status: 'active' },
      ]);
      render(HexMap, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

      expect(screen.queryByTestId('party-is-here-row')).not.toBeInTheDocument();
    });

    it('shows a Set here action when exactly one adventure is active and not yet placed here', async () => {
      replaceHexNodes([home]);
      replaceAdventures([{ id: 'adv-1', title: 'The granary raid', description: '', status: 'active' }]);
      render(HexMap, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

      const row = screen.getByTestId('party-is-here-row');
      expect(within(row).getByRole('button', { name: 'Set here' })).toBeInTheDocument();
      expect(within(row).queryByText('Here now')).not.toBeInTheDocument();
    });

    it('sets the single active adventure\'s currentHexId when Set here is tapped', async () => {
      replaceHexNodes([home]);
      replaceAdventures([{ id: 'adv-1', title: 'The granary raid', description: '', status: 'active' }]);
      render(HexMap, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));
      await fireEvent.click(within(screen.getByTestId('party-is-here-row')).getByRole('button', { name: 'Set here' }));

      expect(getAdventures().find((a) => a.id === 'adv-1')?.currentHexId).toBe('1');
    });

    it('shows a Here now tag and Clear action once this hex is the active adventure\'s position', async () => {
      replaceHexNodes([home]);
      replaceAdventures([
        { id: 'adv-1', title: 'The granary raid', description: '', status: 'active', currentHexId: '1' },
      ]);
      render(HexMap, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));

      const row = screen.getByTestId('party-is-here-row');
      expect(within(row).getByText('Here now')).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });

    it('clears the position when Clear is tapped', async () => {
      replaceHexNodes([home]);
      replaceAdventures([
        { id: 'adv-1', title: 'The granary raid', description: '', status: 'active', currentHexId: '1' },
      ]);
      render(HexMap, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: /Bramblewatch/ }));
      await fireEvent.click(within(screen.getByTestId('party-is-here-row')).getByRole('button', { name: 'Clear' }));

      expect(getAdventures().find((a) => a.id === 'adv-1')?.currentHexId).toBeNull();
    });
  });
});
