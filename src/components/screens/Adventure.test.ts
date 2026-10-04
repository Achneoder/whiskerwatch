import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import Adventure from './Adventure.svelte';
import { replaceAdventures, type Adventure as AdventureEntity } from '../../lib/stores/adventures.svelte';
import { replaceBeats, getBeats } from '../../lib/stores/beats.svelte';
import { replaceHexNodes } from '../../lib/stores/hexmap.svelte';
import { replaceFactions } from '../../lib/stores/factions.svelte';

const granaryRaid: AdventureEntity = {
  id: 'adv-1',
  title: 'The granary raid',
  description: 'Tunnels under the granary.',
  status: 'active',
};

const theOwlHunt: AdventureEntity = {
  id: 'adv-2',
  title: 'The owl hunt',
  description: 'Something is hunting near the hedgerow.',
  status: 'planned',
};

describe('Adventure', () => {
  beforeEach(() => {
    replaceAdventures([]);
    replaceBeats([]);
    replaceHexNodes([]);
    replaceFactions([]);
  });

  it('shows the empty state when there are no adventures', () => {
    render(Adventure, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText(/No adventures yet/)).toBeInTheDocument();
  });

  it('renders a stacked card per adventure, each with its own beat outline', () => {
    replaceAdventures([granaryRaid, theOwlHunt]);
    replaceBeats([
      { id: 'b1', parentId: null, title: 'Find the tunnel', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
      { id: 'b2', parentId: null, title: 'Track the owl', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-2' },
    ]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText('The granary raid')).toBeInTheDocument();
    expect(screen.getByText('The owl hunt')).toBeInTheDocument();
    expect(screen.getByText('Find the tunnel')).toBeInTheDocument();
    expect(screen.getByText('Track the owl')).toBeInTheDocument();
  });

  it('adds a new adventure from the header button', async () => {
    render(Adventure, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Add adventure' }));
    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'The owl hunt' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The owl hunt')).toBeInTheDocument();
  });

  it('edits an adventure', async () => {
    replaceAdventures([granaryRaid]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const input = screen.getByLabelText('Title');
    await fireEvent.input(input, { target: { value: 'The great granary raid' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The great granary raid')).toBeInTheDocument();
  });

  it('deletes an adventure and its beats after confirming', async () => {
    replaceAdventures([granaryRaid]);
    replaceBeats([
      { id: 'b1', parentId: null, title: 'Find the tunnel', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
    ]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    // The adventure card's own delete button and the beat row's delete
    // button are both labelled "Delete" — the adventure card's is the first.
    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('The granary raid')).not.toBeInTheDocument();
    expect(screen.queryByText('Find the tunnel')).not.toBeInTheDocument();
  });

  it('adds a root beat scoped to the adventure whose "Add beat" button was clicked', async () => {
    replaceAdventures([granaryRaid, theOwlHunt]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    const addBeatButtons = screen.getAllByRole('button', { name: 'Add beat' });
    await fireEvent.click(addBeatButtons[1]!); // scoped to "The owl hunt"
    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Track the owl' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Track the owl')).toBeInTheDocument();

    const beat = getBeats().find((b) => b.title === 'Track the owl');
    expect(beat?.adventureId).toBe('adv-2');
  });

  it('adds a sub-beat that inherits its parent beat\'s adventure automatically', async () => {
    replaceAdventures([granaryRaid, theOwlHunt]);
    replaceBeats([
      { id: 'root', parentId: null, title: 'Root beat', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-2' },
    ]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Add sub-beat' }));
    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Child beat' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Child beat')).toBeInTheDocument();

    const beat = getBeats().find((b) => b.title === 'Child beat');
    expect(beat?.adventureId).toBe('adv-2');
    expect(beat?.parentId).toBe('root');
  });

  it('cycles a beat status when its pill is clicked', async () => {
    // Adventure status uses "Planned"/"Active"/"Completed" pills too, so the
    // adventure here is deliberately "completed" to avoid an ambiguous
    // "Active" match once the beat's own pill cycles forward.
    replaceAdventures([{ ...granaryRaid, status: 'completed' }]);
    replaceBeats([
      { id: 'root', parentId: null, title: 'Root beat', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
    ]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText('Planned')).toBeInTheDocument();
    await fireEvent.click(screen.getByText('Planned'));
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('deletes a beat and its sub-beats after confirming, warning about the count', async () => {
    replaceAdventures([granaryRaid]);
    replaceBeats([
      { id: 'root', parentId: null, title: 'Root beat', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
      { id: 'child', parentId: 'root', title: 'Child beat', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
    ]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    // The adventure card's own delete button and the beat row's delete
    // button are both labelled "Delete" — the beat row's is the second one.
    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]!);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/1 sub-beats/)).toBeInTheDocument();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('Root beat')).not.toBeInTheDocument();
    expect(screen.queryByText('Child beat')).not.toBeInTheDocument();
  });

  it('links a beat to a hex and a faction, and shows both as tags on the beat row', async () => {
    replaceAdventures([granaryRaid]);
    replaceHexNodes([{ id: 'hex-1', q: 0, r: 0, terrain: 'settlement', name: 'Bramblewatch', notes: '', discovered: true, encounters: [], controlledBy: null, contestedBy: [] }]);
    replaceFactions([{ id: 'fac-1', name: 'The Gnawing Court', disposition: 'hostile', clock: 3, of: 6, note: '', tags: [] }]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Add beat' }));
    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Raid the tunnels' } });
    await fireEvent.change(screen.getByLabelText('Linked hex'), { target: { value: 'hex-1' } });
    await fireEvent.change(screen.getByLabelText('Faction'), { target: { value: 'fac-1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add faction' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Saving now awaits the store's IndexedDB flush before closing the
    // modal (see Adventure.svelte's saveBeat), so the modal's own copy of
    // this text can briefly coexist with the newly-rendered beat row —
    // `findBy*` retries past that instant instead of failing on the
    // transient "multiple elements" ambiguity.
    expect(await screen.findByText('Raid the tunnels')).toBeInTheDocument();
    expect(await screen.findByText('C3')).toBeInTheDocument();
    expect(await screen.findByText('The Gnawing Court')).toBeInTheDocument();
  });

  it('collapses completed adventures under a "Completed (N)" section, mirroring Roster\'s Fallen pattern', () => {
    replaceAdventures([granaryRaid, { ...theOwlHunt, status: 'completed' }]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText('The granary raid')).toBeInTheDocument();
    // The completed adventure's title is still present in the DOM inside the
    // collapsed <details> (content isn't unmounted, just visually
    // collapsed) — same pattern Roster uses for fallen party members.
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();
    expect(screen.getByText('The owl hunt')).toBeInTheDocument();
  });

  it('does not show a Completed section when no adventures are completed', () => {
    replaceAdventures([granaryRaid, theOwlHunt]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByText(/^Completed \(/)).not.toBeInTheDocument();
  });

  it('still lets the GM edit a completed adventure from inside the collapsed section', async () => {
    replaceAdventures([{ ...theOwlHunt, status: 'completed' }]);
    render(Adventure, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const input = screen.getByLabelText('Title');
    await fireEvent.input(input, { target: { value: 'The owl hunt (wrapped up)' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The owl hunt (wrapped up)')).toBeInTheDocument();
  });

  describe('quick-find focus hand-off', () => {
    it('opens the matching beat edit modal and consumes the focus request', () => {
      replaceAdventures([granaryRaid]);
      replaceBeats([
        { id: 'b1', parentId: null, title: 'Find the tunnel', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
      ]);
      const onconsumedfocus = vi.fn();
      render(Adventure, { props: { onnavigate: vi.fn(), focusId: 'b1', onconsumedfocus } });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByDisplayValue('Find the tunnel')).toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });

    it('is a quiet no-op when focusId matches no beat', () => {
      replaceAdventures([granaryRaid]);
      replaceBeats([
        { id: 'b1', parentId: null, title: 'Find the tunnel', notes: '', status: 'planned', hexNodeId: null, factionIds: [], adventureId: 'adv-1' },
      ]);
      const onconsumedfocus = vi.fn();
      render(Adventure, { props: { onnavigate: vi.fn(), focusId: 'missing', onconsumedfocus } });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });
  });
});
