import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import QuickFind, { type SearchResult } from './QuickFind.svelte';
import { replaceParty } from '../../lib/stores/party.svelte';
import { replaceHirelings } from '../../lib/stores/hirelings.svelte';
import { replaceAdventures } from '../../lib/stores/adventures.svelte';
import { replaceBeats } from '../../lib/stores/beats.svelte';
import { replaceBestiary } from '../../lib/stores/bestiary.svelte';
import { replaceFactions } from '../../lib/stores/factions.svelte';
import { replaceHexNodes } from '../../lib/stores/hexmap.svelte';
import { replaceSessions } from '../../lib/stores/sessions.svelte';

async function typeQuery(input: HTMLElement, value: string) {
  await fireEvent.input(input, { target: { value } });
  // Debounced 150ms — wait past it before asserting on filtered results.
  await new Promise((resolve) => setTimeout(resolve, 200));
}

describe('QuickFind', () => {
  beforeEach(() => {
    replaceParty([]);
    replaceHirelings([]);
    replaceAdventures([]);
    replaceBeats([]);
    replaceBestiary([]);
    replaceFactions([]);
    replaceHexNodes([]);
    replaceSessions([]);
  });

  it('shows the jump-to shortcuts before anything is typed, and tapping one navigates', async () => {
    const onjump = vi.fn();
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect: vi.fn(), onjump } });

    expect(screen.getByText('Jump to:')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('option', { name: 'Hex map' }));

    expect(onjump).toHaveBeenCalledWith('hexMap');
  });

  it('closes (clearing the query) when a jump-to shortcut is tapped', async () => {
    const onclose = vi.fn();
    render(QuickFind, { props: { open: true, onclose, onselect: vi.fn(), onjump: vi.fn() } });

    await fireEvent.click(screen.getByRole('option', { name: 'Warband' }));

    expect(onclose).toHaveBeenCalledOnce();
  });

  it('finds a hex node by name and surfaces it under the Hexes category', async () => {
    replaceHexNodes([
      {
        id: 'hex-1',
        q: 1,
        r: 0,
        terrain: 'ruins',
        name: 'The Gnawgate',
        notes: '',
        discovered: false,
        encounters: [],
        controlledBy: null,
        contestedBy: [],
      },
    ]);
    const onselect = vi.fn();
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect, onjump: vi.fn() } });

    await typeQuery(screen.getByRole('combobox'), 'gnaw');

    expect(screen.getByText('Hexes')).toBeInTheDocument();
    expect(screen.getByText('Hex')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('option', { name: /The Gnawgate/ }));

    expect(onselect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hex-1', type: 'hex', navScreen: 'hexMap' } satisfies Partial<SearchResult>),
    );
  });

  it('matches across mixed entity types for the same query', async () => {
    replaceParty([
      {
        id: 'p1',
        name: 'Wrenlet',
        role: 'Tinker',
        hp: 2,
        max: 6,
        str: 8,
        maxStr: 8,
        dex: 10,
        wil: 12,
        pips: 0,
        xp: 0,
        level: 1,
        status: 'active',
        conditions: [],
        scars: [],
        items: [],
      },
    ]);
    replaceAdventures([{ id: 'adv-1', title: 'The Reclamation', description: '', status: 'active' }]);
    replaceBeats([
      {
        id: 'b1',
        parentId: null,
        title: 'Wren finds the entrance',
        notes: '',
        status: 'active',
        hexNodeId: null,
        factionIds: [],
        adventureId: 'adv-1',
      },
    ]);
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect: vi.fn(), onjump: vi.fn() } });

    await typeQuery(screen.getByRole('combobox'), 'wren');

    expect(screen.getByText('Warband')).toBeInTheDocument();
    expect(screen.getByText('Beats')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Wrenlet/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Wren finds the entrance/ })).toBeInTheDocument();
  });

  it('shows the zero-result state with the typed query when nothing matches', async () => {
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect: vi.fn(), onjump: vi.fn() } });

    await typeQuery(screen.getByRole('combobox'), 'ratlign');

    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(screen.getByText(/ratlign/)).toBeInTheDocument();
    expect(screen.queryByText('Jump to:')).not.toBeInTheDocument();
  });

  it('caps each category at 5 rows and shows a "+N more" hint beyond that', async () => {
    replaceBestiary(
      Array.from({ length: 7 }, (_, i) => ({
        id: `b${i}`,
        name: `Ratling ${i}`,
        category: 'Vermin' as const,
        hd: 1,
        hp: 2,
        armor: 0,
        attacks: [],
        special: '',
        notes: '',
      })),
    );
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect: vi.fn(), onjump: vi.fn() } });

    await typeQuery(screen.getByRole('combobox'), 'ratling');

    expect(screen.getAllByRole('option').filter((el) => el.textContent?.includes('Ratling'))).toHaveLength(5);
    expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onclose = vi.fn();
    render(QuickFind, { props: { open: true, onclose, onselect: vi.fn(), onjump: vi.fn() } });

    await fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

    expect(onclose).toHaveBeenCalledOnce();
  });

  it('renders nothing when closed', () => {
    render(QuickFind, { props: { open: false, onclose: vi.fn(), onselect: vi.fn(), onjump: vi.fn() } });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('selecting a result closes the overlay too', async () => {
    replaceFactions([{ id: 'f1', name: 'The Gnawing Court', disposition: 'hostile', clock: 3, of: 6, note: '', tags: [] }]);
    const onclose = vi.fn();
    render(QuickFind, { props: { open: true, onclose, onselect: vi.fn(), onjump: vi.fn() } });

    await typeQuery(screen.getByRole('combobox'), 'gnawing');
    await fireEvent.click(screen.getByRole('option', { name: /The Gnawing Court/ }));

    expect(onclose).toHaveBeenCalledOnce();
  });

  it('bolds the matched substring within a result label', async () => {
    replaceSessions([{ id: 's1', number: 4, date: '2026-01-01', title: 'Into the sewers', summary: '' }]);
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect: vi.fn(), onjump: vi.fn() } });

    await typeQuery(screen.getByRole('combobox'), 'sewers');

    const option = screen.getByRole('option', { name: /Into the sewers/ });
    expect(within(option).getByText('sewers', { selector: 'mark' })).toBeInTheDocument();
  });

  it('waits for the debounce before filtering (no results immediately after typing)', async () => {
    replaceSessions([{ id: 's1', number: 1, date: '2026-01-01', title: 'Into the sewers', summary: '' }]);
    render(QuickFind, { props: { open: true, onclose: vi.fn(), onselect: vi.fn(), onjump: vi.fn() } });

    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'sewers' } });
    // Immediately after typing (before the 150ms debounce elapses) the
    // previous jump-to shortcuts are still showing, not the new results.
    expect(screen.getByText('Jump to:')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Sessions')).toBeInTheDocument());
  });
});
