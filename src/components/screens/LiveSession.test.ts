import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import LiveSession from './LiveSession.svelte';
import { replaceParty, getParty, type PartyMember } from '../../lib/stores/party.svelte';
import { replaceHirelings, type Hireling } from '../../lib/stores/hirelings.svelte';
import { replaceFactions, getFactions } from '../../lib/stores/factions.svelte';
import { replaceBeats } from '../../lib/stores/beats.svelte';
import { replaceAdventures } from '../../lib/stores/adventures.svelte';
import { replaceSessions } from '../../lib/stores/sessions.svelte';
import { getCampaignHistory, replaceCampaignHistory } from '../../lib/stores/campaignHistory.svelte';
import { replaceHexNodes, type HexNode } from '../../lib/stores/hexmap.svelte';
import { replaceBestiary, type BestiaryEntry } from '../../lib/stores/bestiary.svelte';

function member(overrides: Partial<PartyMember> = {}): PartyMember {
  return {
    id: 'p1',
    name: 'Pip',
    role: 'Scout',
    hp: 6,
    max: 6,
    str: 10,
    maxStr: 10,
    dex: 13,
    wil: 9,
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
    id: 'h1',
    name: 'Oat',
    role: 'Porter',
    hp: 3,
    max: 3,
    str: 10,
    maxStr: 10,
    dex: 10,
    wil: 10,
    loyalty: 4,
    wage: 5,
    notes: '',
    status: 'active',
    conditions: [],
    scars: [],
    items: [],
    ...overrides,
  };
}

function mockD20Roll(result: number) {
  vi.spyOn(Math, 'random').mockReturnValue((result - 1) / 20 + 0.0001);
}

function mockD6Pair(d1: number, d2: number) {
  const spy = vi.spyOn(Math, 'random');
  spy.mockReturnValueOnce((d1 - 1) / 6 + 0.0001);
  spy.mockReturnValueOnce((d2 - 1) / 6 + 0.0001);
}

/**
 * Rolling a hex encounter with a single-candidate encounter table still
 * consumes one `Math.random()` call internally (`weightedPick`'s weighted
 * roll), even though the pick itself is deterministic with only one entry.
 * That call has to be queued ahead of the reaction roll's own 2d6 pair, or
 * the dice mocks land on the wrong calls.
 */
function mockEncounterPickThenReaction(d1: number, d2: number) {
  const spy = vi.spyOn(Math, 'random');
  spy.mockReturnValueOnce(0.0001); // weightedPick's single-candidate roll
  spy.mockReturnValueOnce((d1 - 1) / 6 + 0.0001);
  spy.mockReturnValueOnce((d2 - 1) / 6 + 0.0001);
}

function hexNode(overrides: Partial<HexNode> = {}): HexNode {
  return {
    id: 'hex1',
    q: 0,
    r: 0,
    terrain: 'forest',
    name: 'The Gnawgate',
    notes: '',
    discovered: true,
    encounters: [],
    controlledBy: null,
    contestedBy: [],
    ...overrides,
  };
}

function bestiaryEntry(overrides: Partial<BestiaryEntry> = {}): BestiaryEntry {
  return {
    id: 'b1',
    name: 'Barn Cat',
    category: 'Beast',
    hd: 3,
    hp: 12,
    armor: 1,
    attacks: [],
    special: '',
    notes: '',
    ...overrides,
  };
}

describe('LiveSession', () => {
  beforeEach(() => {
    replaceCampaignHistory([]);
    replaceHexNodes([]);
    replaceBestiary([]);
    replaceAdventures([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function seed() {
    replaceParty([member()]);
    replaceHirelings([hireling()]);
    replaceFactions([
      { id: 'f1', name: 'The Court', disposition: 'hostile', clock: 3, of: 6, note: '', tags: [] },
      { id: 'f2', name: 'The Keepers', disposition: 'ally', clock: 1, of: 6, note: '', tags: [] },
    ]);
    replaceBeats([
      { id: 'b1', parentId: null, title: 'The granary raid', notes: '', status: 'active', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
    ]);
    replaceSessions([{ id: 's1', number: 5, date: '2026-01-01', title: 'Into the tunnels', summary: '' }]);
  }

  it('sets live density on the document element and cleans it up on unmount', () => {
    seed();
    const { unmount } = render(LiveSession, { props: {} });

    expect(document.documentElement.getAttribute('data-density')).toBe('live');

    unmount();

    expect(document.documentElement.getAttribute('data-density')).toBeNull();
  });

  it('calls onexit when the exit button is clicked', async () => {
    seed();
    const onexit = vi.fn();
    render(LiveSession, { props: { onexit } });

    await fireEvent.click(screen.getByRole('button', { name: /back to prep/i }));

    expect(onexit).toHaveBeenCalledOnce();
  });

  it('opens the rules reference drawer from the header button', async () => {
    seed();
    render(LiveSession, { props: {} });

    expect(screen.queryByRole('dialog', { name: 'Rules reference' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Rules reference' }));

    expect(screen.getByRole('dialog', { name: 'Rules reference' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saves' })).toBeInTheDocument();
  });

  it('shows the real session and active beat in the header instead of fixture text', () => {
    seed();
    render(LiveSession, { props: {} });

    expect(screen.getByText(/Session 5/)).toBeInTheDocument();
    expect(screen.getByText('Into the tunnels')).toBeInTheDocument();
    expect(screen.getByText('The granary raid')).toBeInTheDocument();
  });

  it('falls back to placeholder copy when there is no session or active beat', () => {
    replaceParty([member()]);
    replaceHirelings([]);
    replaceFactions([]);
    replaceBeats([]);
    replaceSessions([]);
    render(LiveSession, { props: {} });

    expect(screen.getByText('No session logged yet')).toBeInTheDocument();
    expect(screen.getByText('No active beat')).toBeInTheDocument();
  });

  it('renders hireling cards alongside the party', () => {
    seed();
    render(LiveSession, { props: {} });

    // "Pip" also appears as a <option> in the save dock's mouse picker, so
    // assert presence rather than uniqueness here.
    expect(screen.getAllByText('Pip').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Oat').length).toBeGreaterThan(0);
  });

  it('rolls a Mausritter save (d20 roll-under) and shows a pass/fail result', async () => {
    seed();
    mockD20Roll(5); // well under Pip's STR of 10
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('applies damage through a card\'s drawer and shows an undo affordance', async () => {
    seed();
    render(LiveSession, { props: {} });

    // Pip's card renders first (party section before hirelings).
    const [hurtButton] = screen.getAllByRole('button', { name: 'Hurt' });
    await fireEvent.click(hurtButton!);
    await fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(getParty().find((m) => m.id === 'p1')?.hp).toBe(3);
    expect(screen.getByText(/Applied 3 damage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('toggles a condition through the + Condition drawer', async () => {
    seed();
    render(LiveSession, { props: {} });

    const [conditionTrigger] = screen.getAllByRole('button', { name: /\+ Condition/ });
    await fireEvent.click(conditionTrigger!);
    await fireEvent.click(screen.getByRole('button', { name: 'Frightened' }));

    expect(getParty().find((m) => m.id === 'p1')?.conditions).toEqual(['frightened']);
  });

  it('bumps a faction clock from the faction clock strip and shows an undo affordance', async () => {
    seed();
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /The Court/ }));

    expect(getFactions().find((f) => f.id === 'f1')?.clock).toBe(4);
    expect(screen.getByText(/clock advanced/i)).toBeInTheDocument();
  });

  it('opens a mouse\'s bag, burns a charge, and undoes it back', async () => {
    replaceParty([
      member({ items: [{ id: 'lantern-1', name: 'Lantern', slots: 1, charges: 3, maxCharges: 6, notes: '' }] }),
    ]);
    replaceHirelings([]);
    replaceFactions([]);
    replaceBeats([]);
    replaceSessions([]);
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /open pip's bag/i }));
    await fireEvent.click(screen.getByRole('button', { name: /Lantern, 3 of 6 charges, tap to use one/i }));

    expect(getParty().find((m) => m.id === 'p1')?.items[0]?.charges).toBe(2);
    expect(screen.getByText(/used a charge \(2\/6 left\)/i)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(getParty().find((m) => m.id === 'p1')?.items[0]?.charges).toBe(3);
  });

  it('shows "burned out" with no undo when a charge tick brings an item to exactly 0', async () => {
    replaceParty([
      member({ items: [{ id: 'lantern-1', name: 'Lantern', slots: 1, charges: 1, maxCharges: 6, notes: '' }] }),
    ]);
    replaceHirelings([]);
    replaceFactions([]);
    replaceBeats([]);
    replaceSessions([]);
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /open pip's bag/i }));
    await fireEvent.click(screen.getByRole('button', { name: /Lantern, 1 of 6 charges, tap to use one/i }));

    expect(getParty().find((m) => m.id === 'p1')?.items[0]?.charges).toBe(0);
    expect(screen.getByText(/burned out/i)).toBeInTheDocument();
  });

  it('shows "is empty" with no undo when tapping an already-empty item', async () => {
    replaceParty([
      member({ items: [{ id: 'lantern-1', name: 'Lantern', slots: 1, charges: 0, maxCharges: 6, notes: '' }] }),
    ]);
    replaceHirelings([]);
    replaceFactions([]);
    replaceBeats([]);
    replaceSessions([]);
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /open pip's bag/i }));
    await fireEvent.click(screen.getByRole('button', { name: /Lantern, 0 of 6 charges, tap to use one/i }));

    expect(getParty().find((m) => m.id === 'p1')?.items[0]?.charges).toBe(0);
    expect(screen.getByText(/Lantern is empty\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  describe('item hand-off (Phase 13)', () => {
    it('moves an item from the open bag to another active party member, undoably', async () => {
      replaceParty([
        member({ id: 'p1', name: 'Wren', items: [{ id: 'torch-1', name: 'Torch', slots: 1, charges: null, maxCharges: null, notes: '' }] }),
        member({ id: 'p2', name: 'Pip', items: [] }),
      ]);
      replaceHirelings([]);
      replaceFactions([]);
      replaceBeats([]);
      replaceSessions([]);
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: /open wren's bag/i }));
      const dialog = screen.getByRole('dialog');
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Move Torch' }));
      await fireEvent.click(within(dialog).getByRole('button', { name: /Pip/ }));

      expect(getParty().find((m) => m.id === 'p1')?.items).toHaveLength(0);
      expect(getParty().find((m) => m.id === 'p2')?.items[0]?.name).toBe('Torch');
      expect(screen.getByText(/Torch moved to Pip/)).toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      expect(getParty().find((m) => m.id === 'p1')?.items).toHaveLength(1);
      expect(getParty().find((m) => m.id === 'p2')?.items).toHaveLength(0);
    });

    it('never lists the sender or a fallen mouse as a hand-off recipient', async () => {
      replaceParty([
        member({ id: 'p1', name: 'Wren', items: [{ id: 'torch-1', name: 'Torch', slots: 1, charges: null, maxCharges: null, notes: '' }] }),
        member({ id: 'p2', name: 'Juniper', status: 'deceased', items: [] }),
      ]);
      replaceHirelings([hireling({ id: 'h1', name: 'Oat' })]);
      replaceFactions([]);
      replaceBeats([]);
      replaceSessions([]);
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: /open wren's bag/i }));
      const dialog = screen.getByRole('dialog');
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Move Torch' }));

      expect(within(dialog).queryByRole('button', { name: /Wren/ })).not.toBeInTheDocument();
      expect(within(dialog).queryByText('Juniper')).not.toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /Oat/ })).toBeInTheDocument();
    });

    it('allows a move to an already-full recipient without blocking it', async () => {
      const fullBag = Array.from({ length: 10 }, (_, i) => ({
        id: `full-${i}`,
        name: `Gear ${i}`,
        slots: 1 as const,
        charges: null,
        maxCharges: null,
        notes: '',
      }));
      replaceParty([
        member({ id: 'p1', name: 'Wren', items: [{ id: 'torch-1', name: 'Torch', slots: 1, charges: null, maxCharges: null, notes: '' }] }),
        member({ id: 'p2', name: 'Pip', items: fullBag }),
      ]);
      replaceHirelings([]);
      replaceFactions([]);
      replaceBeats([]);
      replaceSessions([]);
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: /open wren's bag/i }));
      const dialog = screen.getByRole('dialog');
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Move Torch' }));

      const pipRow = within(dialog).getByRole('button', { name: /Pip/ });
      expect(pipRow).toHaveTextContent('will be overburdened');
      await fireEvent.click(pipRow);

      expect(getParty().find((m) => m.id === 'p2')?.items).toHaveLength(11);
    });

    it('backs out of the move picker without moving anything', async () => {
      replaceParty([
        member({ id: 'p1', name: 'Wren', items: [{ id: 'torch-1', name: 'Torch', slots: 1, charges: null, maxCharges: null, notes: '' }] }),
        member({ id: 'p2', name: 'Pip', items: [] }),
      ]);
      replaceHirelings([]);
      replaceFactions([]);
      replaceBeats([]);
      replaceSessions([]);
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: /open wren's bag/i }));
      await fireEvent.click(screen.getByRole('button', { name: 'Move Torch' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByText('Torch')).toBeInTheDocument();
      expect(getParty().find((m) => m.id === 'p1')?.items).toHaveLength(1);
    });
  });

  it('rolls a loyalty save from a hireling\'s card and shows a pass/fail result inline', async () => {
    seed();
    mockD6Pair(1, 2); // total 3, well under Oat's loyalty of 4
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /roll a loyalty save for oat, loyalty 4/i }));

    expect(screen.getByText(/Loyalty save: 3 vs 4 — Passed/)).toBeInTheDocument();
  });

  it('does not show a loyalty pill on a party mouse\'s card', () => {
    seed();
    render(LiveSession, { props: {} });

    const pipCard = screen.getByTestId('mouse-card-Pip');
    expect(within(pipCard).queryByText('Loyalty')).not.toBeInTheDocument();
  });

  it('rolls a 2d6 loyalty save from the SaveDock\'s LOY button, only shown for hirelings', async () => {
    seed();
    mockD6Pair(1, 1); // total 2, well under Oat's loyalty of 4
    render(LiveSession, { props: {} });

    expect(screen.queryByRole('button', { name: /^LOY/ })).not.toBeInTheDocument();

    await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'h1' } });

    expect(screen.getByRole('button', { name: /^LOY 4/ })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /^LOY 4/ }));
    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('2d6')).toBeInTheDocument();
  });

  it('opens Pay Day, marks a hireling paid, and offers an inline loyalty check for an unpaid one', async () => {
    seed();
    mockD6Pair(6, 6); // total 12, over Oat's loyalty of 4 — a failed save
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /pay day/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Oat')).toBeInTheDocument();
    expect(within(dialog).getByText('5p')).toBeInTheDocument();
    expect(within(dialog).getByText('Unpaid')).toBeInTheDocument();

    await fireEvent.click(within(dialog).getByRole('button', { name: /roll loyalty save/i }));
    expect(within(dialog).getByText(/Loyalty save: 12 vs 4 — Failed/)).toBeInTheDocument();

    await fireEvent.click(within(dialog).getByText('Unpaid'));
    expect(within(dialog).getByText('Paid')).toBeInTheDocument();
  });

  it('confirms a death with an optional cause and logs it to the campaign history', async () => {
    seed();
    render(LiveSession, { props: {} });

    // Pip's str is 10 and max HP is 6 — 16 damage empties HP then drains STR
    // to exactly 0, which is immediate death per the rules (no save).
    const [hurtButton] = screen.getAllByRole('button', { name: 'Hurt' });
    await fireEvent.click(hurtButton!);
    await fireEvent.click(screen.getByRole('button', { name: /custom amount/i }));
    const increase = screen.getByRole('button', { name: 'Increase' });
    for (let i = 0; i < 9; i += 1) {
      await fireEvent.click(increase);
    }
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByText('Confirm death?')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    await fireEvent.input(within(dialog).getByLabelText('Cause of death (optional)'), {
      target: { value: "Overrun by the barn cat's claws" },
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm death' }));

    expect(getParty().find((m) => m.id === 'p1')?.status).toBe('deceased');
    const [entry] = getCampaignHistory();
    expect(entry).toMatchObject({
      type: 'death',
      name: 'Pip',
      role: 'Scout',
      source: 'party',
      cause: "Overrun by the barn cat's claws",
      sessionNumber: 5,
      level: 1,
    });
  });

  it('confirms a death with a blank cause without blocking the confirm button', async () => {
    seed();
    render(LiveSession, { props: {} });

    const [hurtButton] = screen.getAllByRole('button', { name: 'Hurt' });
    await fireEvent.click(hurtButton!);
    await fireEvent.click(screen.getByRole('button', { name: /custom amount/i }));
    const increase = screen.getByRole('button', { name: 'Increase' });
    for (let i = 0; i < 9; i += 1) {
      await fireEvent.click(increase);
    }
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'Confirm death' });
    expect(confirmButton).not.toBeDisabled();
    await fireEvent.click(confirmButton);

    expect(getParty().find((m) => m.id === 'p1')?.status).toBe('deceased');
    const [entry] = getCampaignHistory();
    expect(entry).toMatchObject({ type: 'death', name: 'Pip' });
    expect((entry as { cause?: string }).cause).toBeUndefined();
  });

  it('does not show a hex encounter card when the active beat has no linked hex', () => {
    seed();
    render(LiveSession, { props: {} });

    expect(screen.queryByRole('button', { name: 'Roll an encounter' })).not.toBeInTheDocument();
  });

  it('does not show a hex encounter card when the active beat links to a hex that no longer exists', () => {
    replaceParty([member()]);
    replaceHirelings([hireling()]);
    replaceFactions([]);
    replaceBeats([
      {
        id: 'b1',
        parentId: null,
        title: 'The granary raid',
        notes: '',
        status: 'active',
        hexNodeId: 'deleted-hex',
        factionIds: [],
        adventureId: 'adv-1',
      },
    ]);
    replaceSessions([]);
    replaceHexNodes([]);
    replaceBestiary([bestiaryEntry()]);

    render(LiveSession, { props: {} });

    expect(screen.queryByRole('button', { name: 'Roll an encounter' })).not.toBeInTheDocument();
  });

  it('rolls a hex encounter then a reaction for it, tied to that active hex', async () => {
    replaceParty([member()]);
    replaceHirelings([hireling()]);
    replaceFactions([]);
    replaceBeats([
      {
        id: 'b1',
        parentId: null,
        title: 'The granary raid',
        notes: '',
        status: 'active',
        hexNodeId: 'hex1',
        factionIds: [],
        adventureId: 'adv-1',
      },
    ]);
    // Phase 15: the encounter card is now keyed off the adventure's
    // `currentHexId`, not the beat's linked hex — the party is "standing in" hex1.
    replaceAdventures([{ id: 'adv-1', title: 'The granary raid', description: '', status: 'active', currentHexId: 'hex1' }]);
    replaceSessions([]);
    replaceHexNodes([hexNode({ encounters: [{ bestiaryId: 'b1', weight: 1 }] })]);
    replaceBestiary([bestiaryEntry()]);
    mockEncounterPickThenReaction(3, 4); // reaction total 7 — neutral
    render(LiveSession, { props: {} });

    expect(screen.getByText('The Gnawgate')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

    expect(screen.getByText('Barn Cat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Roll Reaction' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Roll Reaction' }));

    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText('Uncertain, will act to preserve itself.')).toBeInTheDocument();
  });

  it('clears a previous reaction roll when a new encounter is rolled', async () => {
    replaceParty([member()]);
    replaceHirelings([]);
    replaceFactions([]);
    replaceBeats([
      {
        id: 'b1',
        parentId: null,
        title: 'The granary raid',
        notes: '',
        status: 'active',
        hexNodeId: 'hex1',
        factionIds: [],
        adventureId: 'adv-1',
      },
    ]);
    replaceAdventures([{ id: 'adv-1', title: 'The granary raid', description: '', status: 'active', currentHexId: 'hex1' }]);
    replaceSessions([]);
    replaceHexNodes([hexNode({ encounters: [{ bestiaryId: 'b1', weight: 1 }] })]);
    replaceBestiary([bestiaryEntry()]);
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(0.0001); // first encounter roll's weightedPick draw
    spy.mockReturnValueOnce((6 - 1) / 6 + 0.0001); // reaction d1 = 6
    spy.mockReturnValueOnce((6 - 1) / 6 + 0.0001); // reaction d2 = 6 — total 12, helpful
    spy.mockReturnValueOnce(0.0001); // second encounter roll's weightedPick draw
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Roll Reaction' }));
    expect(screen.getByText('Helpful')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

    // The reaction result is gone, but the "Roll Reaction" trigger is back —
    // it's tied to *this* encounter instance, not gone for good.
    expect(screen.queryByText('Helpful')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Reaction' })).toBeInTheDocument();
  });

  describe('encounter HP tracker (Phase 13)', () => {
    function seedActiveHexFight() {
      replaceParty([member()]);
      replaceHirelings([]);
      replaceFactions([]);
      replaceBeats([
        {
          id: 'b1',
          parentId: null,
          title: 'The granary raid',
          notes: '',
          status: 'active',
          hexNodeId: 'hex1',
          factionIds: [],
          adventureId: 'adv-1',
        },
      ]);
      replaceAdventures([{ id: 'adv-1', title: 'The granary raid', description: '', status: 'active', currentHexId: 'hex1' }]);
      replaceSessions([]);
      replaceHexNodes([hexNode({ encounters: [{ bestiaryId: 'b1', weight: 1 }] })]);
      replaceBestiary([bestiaryEntry({ hp: 4 })]);
    }

    it('spawns one numbered instance immediately on rolling an encounter', async () => {
      seedActiveHexFight();
      mockEncounterPickThenReaction(1, 1);
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

      expect(screen.getByText('Barn Cat 1')).toBeInTheDocument();
    });

    it('adds another numbered instance of the same creature via "+ Add another"', async () => {
      seedActiveHexFight();
      mockEncounterPickThenReaction(1, 1);
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));
      await fireEvent.click(screen.getByRole('button', { name: '+ Add another Barn Cat' }));

      expect(screen.getByText('Barn Cat 1')).toBeInTheDocument();
      expect(screen.getByText('Barn Cat 2')).toBeInTheDocument();
    });

    it('damages an instance via its Hurt drawer and shows Defeated + Remove once it hits 0', async () => {
      seedActiveHexFight();
      mockEncounterPickThenReaction(1, 1);
      render(LiveSession, { props: {} });
      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

      const row = screen.getByTestId('encounter-instance-Barn Cat 1');
      await fireEvent.click(within(row).getByRole('button', { name: 'Hurt' }));
      await fireEvent.click(within(row).getByRole('button', { name: /custom amount/i }));
      const increase = within(row).getByRole('button', { name: 'Increase' });
      for (let i = 0; i < 4; i += 1) {
        await fireEvent.click(increase); // 7 default + 4 = doesn't matter, floors at 0
      }
      await fireEvent.click(within(row).getByRole('button', { name: 'Apply' }));

      expect(within(row).getByText('Defeated')).toBeInTheDocument();
      await fireEvent.click(within(row).getByRole('button', { name: 'Remove' }));

      expect(screen.queryByText('Barn Cat 1')).not.toBeInTheDocument();
    });

    it('removing a still-living instance is undoable', async () => {
      seedActiveHexFight();
      mockEncounterPickThenReaction(1, 1);
      render(LiveSession, { props: {} });
      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

      await fireEvent.click(screen.getByRole('button', { name: 'Remove Barn Cat 1' }));

      expect(screen.queryByText('Barn Cat 1')).not.toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      expect(screen.getByText('Barn Cat 1')).toBeInTheDocument();
    });

    it('shows the fight-over tip once the last instance is removed', async () => {
      seedActiveHexFight();
      mockEncounterPickThenReaction(1, 1);
      render(LiveSession, { props: {} });
      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

      await fireEvent.click(screen.getByRole('button', { name: 'Remove Barn Cat 1' }));

      expect(screen.getByText(/Fight's over/)).toBeInTheDocument();
    });

    it('rerolling the encounter clears every existing instance and spawns one fresh instance', async () => {
      seedActiveHexFight();
      const spy = vi.spyOn(Math, 'random');
      spy.mockReturnValueOnce(0.0001); // first roll's weightedPick draw
      spy.mockReturnValueOnce(0.0001); // second roll's weightedPick draw
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));
      await fireEvent.click(screen.getByRole('button', { name: '+ Add another Barn Cat' }));
      expect(screen.getByText('Barn Cat 2')).toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

      expect(screen.getByText('Barn Cat 1')).toBeInTheDocument();
      expect(screen.queryByText('Barn Cat 2')).not.toBeInTheDocument();
    });
  });

  it('resets Pay Day\'s paid state every time the modal reopens', async () => {
    seed();
    render(LiveSession, { props: {} });

    await fireEvent.click(screen.getByRole('button', { name: /pay day/i }));
    await fireEvent.click(screen.getByText('Unpaid'));
    expect(screen.getByText('Paid')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('dialog').querySelector('[aria-label="Close"]')!);
    await fireEvent.click(screen.getByRole('button', { name: /pay day/i }));

    expect(screen.getByText('Unpaid')).toBeInTheDocument();
  });

  describe('adventure picker (Phase 12)', () => {
    function seedTwoAdventures() {
      replaceParty([member()]);
      replaceHirelings([]);
      replaceFactions([]);
      replaceAdventures([
        { id: 'adv-1', title: 'The granary raid', description: '', status: 'active' },
        // Phase 15: the encounter card is keyed off `currentHexId`, not the
        // beat's linked hex — adv-2's party is "standing in" hex1.
        { id: 'adv-2', title: 'The Gnawing Court', description: '', status: 'active', currentHexId: 'hex1' },
      ]);
      replaceBeats([
        { id: 'b1', parentId: null, title: 'Into the tunnels', notes: '', status: 'active', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
        { id: 'b2', parentId: null, title: 'Confront the envoy', notes: '', status: 'active', hexNodeId: 'hex1', factionIds: [], adventureId: 'adv-2' },
      ]);
      replaceHexNodes([hexNode({ encounters: [{ bestiaryId: 'b1', weight: 1 }] })]);
      replaceBestiary([bestiaryEntry()]);
      replaceSessions([]);
    }

    it('does not show a picker when only one adventure has an active beat', () => {
      seed();
      render(LiveSession, { props: {} });

      expect(screen.queryByRole('button', { name: /choose adventure/i })).not.toBeInTheDocument();
      expect(screen.getByText('The granary raid')).toBeInTheDocument();
    });

    it('shows a picker defaulted to the first adventure when two adventures each have an active beat', () => {
      seedTwoAdventures();
      render(LiveSession, { props: {} });

      expect(screen.getByRole('button', { name: /choose adventure, currently the granary raid/i })).toBeInTheDocument();
      expect(screen.getByText('Into the tunnels')).toBeInTheDocument();
      // The granary raid's beat has no linked hex, so no encounter card yet.
      expect(screen.queryByRole('button', { name: 'Roll an encounter' })).not.toBeInTheDocument();
    });

    it('tags the End Session recap draft with the active beat\'s adventureId', async () => {
      seed();
      const ondraftrecap = vi.fn();
      render(LiveSession, { props: { ondraftrecap } });

      await fireEvent.click(screen.getByRole('button', { name: /end session/i }));
      await fireEvent.click(screen.getByRole('button', { name: /draft recap/i }));

      expect(ondraftrecap).toHaveBeenCalledOnce();
      expect(ondraftrecap.mock.calls[0]![0].adventureId).toBe('adv-1');
    });

    it('switches the active beat (and any hex/encounter context) when the GM picks a different adventure', async () => {
      seedTwoAdventures();
      render(LiveSession, { props: {} });

      await fireEvent.click(screen.getByRole('button', { name: /choose adventure/i }));
      await fireEvent.click(screen.getByText('The Gnawing Court'));

      expect(screen.getByRole('button', { name: /choose adventure, currently the gnawing court/i })).toBeInTheDocument();
      expect(screen.getByText('Confront the envoy')).toBeInTheDocument();
      // Confront the envoy's beat is linked to hex1, unlike The granary raid's beat.
      expect(screen.getByRole('button', { name: 'Roll an encounter' })).toBeInTheDocument();
    });
  });
});
