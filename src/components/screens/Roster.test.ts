import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import Roster from './Roster.svelte';
import { replaceParty, getParty, type PartyMember } from '../../lib/stores/party.svelte';
import { replaceHirelings, getHirelings, type Hireling } from '../../lib/stores/hirelings.svelte';

function member(overrides: Partial<PartyMember> = {}): PartyMember {
  return {
    id: '1',
    name: 'Pip',
    role: 'Scout',
    hp: 4,
    max: 6,
    str: 10,
    maxStr: 10,
    dex: 10,
    wil: 10,
    pips: 0,
    xp: 0,
    level: 1,
    status: 'active',
    conditions: [],
    scars: [],
    items: [],
    ...overrides,
  };
}

function hireling(overrides: Partial<Hireling> = {}): Hireling {
  return {
    id: '1',
    name: 'Oat',
    role: 'Porter',
    hp: 3,
    max: 3,
    str: 10,
    maxStr: 10,
    dex: 10,
    wil: 10,
    loyalty: 9,
    wage: 0,
    notes: '',
    status: 'active',
    conditions: [],
    scars: [],
    items: [],
    ...overrides,
  };
}

describe('Roster', () => {
  beforeEach(() => {
    replaceParty([]);
    replaceHirelings([]);
  });

  it('adds a new party member through the modal form', async () => {
    render(Roster, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Add mouse' }));
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Juniper' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Juniper')).toBeInTheDocument();
  });

  it('deletes a party member after confirming', async () => {
    replaceParty([
      {
        id: '1',
        name: 'Pip',
        role: 'Scout',
        hp: 4,
        max: 6,
        str: 10,
        maxStr: 10,
        dex: 10,
        wil: 10,
        pips: 0,
        xp: 0,
        level: 1,
        status: 'active',
        conditions: [],
        scars: [],
        items: [],
      },
    ]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('Pip')).not.toBeInTheDocument();
  });

  it('adds a new hireling through the modal form', async () => {
    render(Roster, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Add hireling' }));
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Oat' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Oat')).toBeInTheDocument();
  });

  it('shows a hireling\'s loyalty as a pill and their wage as a tag when set', () => {
    replaceHirelings([
      {
        id: '1',
        name: 'Oat',
        role: 'Porter',
        hp: 3,
        max: 3,
        str: 10,
        maxStr: 10,
        dex: 10,
        wil: 10,
        loyalty: 9,
        wage: 5,
        notes: '',
        status: 'active',
        conditions: [],
        scars: [],
        items: [],
      },
    ]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText('Loyalty')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('5p/day')).toBeInTheDocument();
  });

  it('hides the wage tag when a hireling has no wage set', () => {
    replaceHirelings([
      {
        id: '1',
        name: 'Oat',
        role: 'Porter',
        hp: 3,
        max: 3,
        str: 10,
        maxStr: 10,
        dex: 10,
        wil: 10,
        loyalty: 9,
        wage: 0,
        notes: '',
        status: 'active',
        conditions: [],
        scars: [],
        items: [],
      },
    ]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByText(/p\/day/)).not.toBeInTheDocument();
  });

  it('imports a campaign file and replaces the roster', async () => {
    render(Roster, { props: { onnavigate: vi.fn() } });

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      party: [{ id: 'x', name: 'Clover', role: 'Sage', hp: 6, max: 6, pips: 0, conditions: [] }],
      hirelings: [],
    };
    const file = new File([JSON.stringify(data)], 'campaign.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Clover')).toBeInTheDocument();
  });

  it('shows an error when the imported file is not valid JSON', async () => {
    render(Roster, { props: { onnavigate: vi.fn() } });

    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/not valid JSON/)).toBeInTheDocument();
  });

  it("shows a party member's scars on their roster row", () => {
    replaceParty([member({ scars: [{ label: 'Lost an eye', note: '' }] })]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText('Lost an eye')).toBeInTheDocument();
  });

  it('adds a scar to a living party member through the Add Scar flow', async () => {
    replaceParty([member()]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: /add a scar for pip/i }));
    await fireEvent.click(screen.getByRole('button', { name: 'Lost an eye' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add Scar' }));

    expect(getParty().find((m) => m.id === '1')?.scars).toEqual([{ label: 'Lost an eye', note: '' }]);
    // Saving now awaits the store's IndexedDB flush before closing the
    // modal (see Roster.svelte's saveScar) — `findBy*` waits past that
    // instant instead of failing on transient duplicate matches.
    expect(await screen.findByText('Lost an eye')).toBeInTheDocument();
  });

  it('adds a scar to a hireling through the Add Scar flow', async () => {
    replaceHirelings([hireling()]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: /add a scar for oat/i }));
    await fireEvent.click(screen.getByRole('button', { name: 'Tremor in the paw' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add Scar' }));

    expect(getHirelings().find((h) => h.id === '1')?.scars).toEqual([{ label: 'Tremor in the paw', note: '' }]);
  });

  it('shows deceased party members and hirelings collapsed under a Fallen section', () => {
    replaceParty([member({ id: '1', name: 'Pip' }), member({ id: '2', name: 'Wren', status: 'deceased' })]);
    replaceHirelings([hireling({ id: '1', name: 'Oat' }), hireling({ id: '2', name: 'Reed', status: 'deceased' })]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText('Pip')).toBeInTheDocument();
    expect(screen.getByText('Oat')).toBeInTheDocument();
    // Both fallen rows start collapsed inside a <details> — the names are
    // present in the DOM (details content isn't unmounted) but the section
    // headers should show the right counts.
    const fallenSummaries = screen.getAllByText('Fallen (1)');
    expect(fallenSummaries).toHaveLength(2);
    expect(screen.getByText('Wren')).toBeInTheDocument();
    expect(screen.getByText('Reed')).toBeInTheDocument();
    expect(screen.getAllByText('Deceased').length).toBe(2);
  });

  it('only shows a delete button (no edit) on a fallen roster row', () => {
    replaceParty([member({ status: 'deceased' })]);
    replaceHirelings([]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  const limitWarning = 'This party has more hirelings than its mice can command';

  it('shows the WIL-limit warning when active hirelings outnumber the party\'s summed WIL', () => {
    replaceParty([member({ id: '1', name: 'Pip', wil: 4 })]);
    replaceHirelings([
      hireling({ id: '1', name: 'Oat' }),
      hireling({ id: '2', name: 'Reed' }),
      hireling({ id: '3', name: 'Fen' }),
      hireling({ id: '4', name: 'Sable' }),
      hireling({ id: '5', name: 'Basil' }),
    ]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText(new RegExp(limitWarning))).toBeInTheDocument();
  });

  it('does not show the WIL-limit warning when hirelings are within the party\'s summed WIL', () => {
    replaceParty([member({ id: '1', name: 'Pip', wil: 10 })]);
    replaceHirelings([hireling({ id: '1', name: 'Oat' }), hireling({ id: '2', name: 'Reed' })]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByText(new RegExp(limitWarning))).not.toBeInTheDocument();
  });

  it('does not show the WIL-limit warning right at the boundary (hirelings equal to summed WIL)', () => {
    replaceParty([member({ id: '1', name: 'Pip', wil: 5 })]);
    replaceHirelings([
      hireling({ id: '1', name: 'Oat' }),
      hireling({ id: '2', name: 'Reed' }),
      hireling({ id: '3', name: 'Fen' }),
      hireling({ id: '4', name: 'Sable' }),
      hireling({ id: '5', name: 'Basil' }),
    ]);
    // 5 hirelings === 5 WIL is exactly at capacity, not over it.
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByText(new RegExp(limitWarning))).not.toBeInTheDocument();
  });

  it('reappears when a hireling is added past the WIL limit and disappears again once removed', async () => {
    replaceParty([member({ id: '1', name: 'Pip', wil: 1 })]);
    replaceHirelings([hireling({ id: '1', name: 'Oat' })]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByText(new RegExp(limitWarning))).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Add hireling' }));
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Reed' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Saving now awaits the store's IndexedDB flush before closing the
    // modal (see Roster.svelte's saveHireling) — wait for that close before
    // interacting with a *different* dialog (the delete confirmation
    // below), so there's never more than one `role="dialog"` on screen.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(new RegExp(limitWarning))).toBeInTheDocument();

    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]!);
    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText(new RegExp(limitWarning))).not.toBeInTheDocument();
  });

  it('ignores deceased hirelings and deceased mice when computing the WIL limit', () => {
    replaceParty([
      member({ id: '1', name: 'Pip', wil: 10 }),
      member({ id: '2', name: 'Wren', wil: 10, status: 'deceased' }),
    ]);
    replaceHirelings([
      hireling({ id: '1', name: 'Oat', status: 'deceased' }),
      hireling({ id: '2', name: 'Reed', status: 'deceased' }),
    ]);
    render(Roster, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByText(new RegExp(limitWarning))).not.toBeInTheDocument();
  });

  describe('quick-find focus hand-off', () => {
    it('opens the matching party member edit modal and consumes the focus request', () => {
      replaceParty([member({ id: 'wren', name: 'Wren' })]);
      const onconsumedfocus = vi.fn();
      render(Roster, { props: { onnavigate: vi.fn(), focusId: 'wren', onconsumedfocus } });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByDisplayValue('Wren')).toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });

    it('opens the matching hireling edit modal and consumes the focus request', () => {
      replaceHirelings([hireling({ id: 'oat', name: 'Oat' })]);
      const onconsumedfocus = vi.fn();
      render(Roster, { props: { onnavigate: vi.fn(), focusId: 'oat', onconsumedfocus } });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByDisplayValue('Oat')).toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });

    it('is a quiet no-op when focusId matches neither a party member nor a hireling', () => {
      replaceParty([member({ id: 'wren', name: 'Wren' })]);
      const onconsumedfocus = vi.fn();
      render(Roster, { props: { onnavigate: vi.fn(), focusId: 'missing', onconsumedfocus } });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });
  });
});
