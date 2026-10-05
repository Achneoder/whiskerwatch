import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { tick } from 'svelte';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { locale } from 'svelte-i18n';
import Generators from './Generators.svelte';
import { NPC_QUIRKS, NPC_ROLES } from '../../lib/generators/tables';
import { replaceBestiary, getBestiary, type BestiaryEntry } from '../../lib/stores/bestiary.svelte';
import { replaceHexNodes, type HexNode } from '../../lib/stores/hexmap.svelte';
import { replaceHirelings, getHirelings } from '../../lib/stores/hirelings.svelte';

const ratling: BestiaryEntry = {
  id: 'b1',
  name: 'Gnawing Court Ratling',
  category: 'Vermin',
  hd: 2,
  hp: 4,
  armor: 1,
  attacks: [{ name: 'Rusty blade', damage: 'd6' }],
  special: '',
  notes: '',
};

const owl: BestiaryEntry = {
  id: 'b2',
  name: 'Sewer Owl',
  category: 'Bird of Prey',
  hd: 3,
  hp: 6,
  armor: 0,
  attacks: [],
  special: '',
  notes: '',
};

const bramblewatch: HexNode = {
  id: 'h1',
  q: 0,
  r: 0,
  terrain: 'settlement',
  name: 'Bramblewatch',
  notes: '',
  discovered: true,
  encounters: [{ bestiaryId: 'b1', weight: 1 }],
  controlledBy: null,
  contestedBy: [],
};

describe('Generators', () => {
  beforeEach(() => {
    replaceBestiary([ratling, owl]);
    replaceHexNodes([bramblewatch]);
    replaceHirelings([]);
  });

  it('rolls dice and shows a result', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll' }));

    expect(screen.getByText(/2d6/)).toBeInTheDocument();
  });

  it('opens the rules reference drawer from the header button', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    expect(screen.queryByRole('dialog', { name: 'Rules reference' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Rules reference' }));

    expect(screen.getByRole('dialog', { name: 'Rules reference' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saves' })).toBeInTheDocument();
  });

  it('rolls an encounter from the whole bestiary by default and shows a stat block', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

    expect(screen.getByText('Rolled from the whole bestiary')).toBeInTheDocument();
    expect(screen.getByText(/Gnawing Court Ratling|Sewer Owl/)).toBeInTheDocument();
  });

  it('rolls an encounter scoped to a selected hex', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.change(screen.getByRole('combobox', { name: 'Hex' }), { target: { value: 'h1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

    expect(screen.getByText('Rolled for Bramblewatch')).toBeInTheDocument();
    expect(screen.getByText('Gnawing Court Ratling')).toBeInTheDocument();
  });

  it('disables rolling and shows a message when the bestiary is empty', () => {
    replaceBestiary([]);
    render(Generators, { props: { onnavigate: vi.fn() } });

    expect(screen.getByRole('button', { name: 'Roll an encounter' })).toBeDisabled();
    expect(screen.getByText(/No bestiary entries yet/)).toBeInTheDocument();
  });

  it('rolls a reaction for the current encounter and shows the band and SRD guidance', async () => {
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(0.0001); // Bramblewatch has one candidate — weightedPick's draw doesn't matter
    spy.mockReturnValueOnce((6 - 1) / 6 + 0.0001); // reaction d1 = 6
    spy.mockReturnValueOnce((6 - 1) / 6 + 0.0001); // reaction d2 = 6 — total 12, helpful
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.change(screen.getByRole('combobox', { name: 'Hex' }), { target: { value: 'h1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Roll Reaction' }));

    expect(screen.getByText('Helpful')).toBeInTheDocument();
    expect(screen.getByText('How can they help the mice?')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('clears a previous reaction roll when a new encounter is rolled', async () => {
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(0.0001); // first encounter roll's weightedPick draw
    spy.mockReturnValueOnce((1 - 1) / 6 + 0.0001); // reaction d1 = 1
    spy.mockReturnValueOnce((1 - 1) / 6 + 0.0001); // reaction d2 = 1 — total 2, hostile
    spy.mockReturnValueOnce(0.0001); // second encounter roll's weightedPick draw
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.change(screen.getByRole('combobox', { name: 'Hex' }), { target: { value: 'h1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Roll Reaction' }));
    expect(screen.getByText('Hostile')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an encounter' }));

    expect(screen.queryByText('Hostile')).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it('rolls an item and shows a result from the table', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an item' }));

    const paragraphs = document.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('rolls an NPC and shows name, role, quirk and want', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));

    expect(screen.getByText('Quirk:')).toBeInTheDocument();
    expect(screen.getByText('Wants:')).toBeInTheDocument();
  });

  it('shows both save buttons once an NPC is rolled', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));

    expect(screen.getByRole('button', { name: 'Save to Roster' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to Bestiary' })).toBeInTheDocument();
  });

  it('saves the rolled NPC to the roster and disables that button, with the bestiary button still active', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save to Roster' }));

    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(getHirelings().length).toBe(1);
    expect(screen.getByRole('button', { name: 'Saved to Roster' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save to Bestiary' })).toBeEnabled();
  });

  it('saves the rolled NPC to the bestiary as a Humanoid entry', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    const bestiaryCountBefore = getBestiary().length;
    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save to Bestiary' }));

    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    const updatedBestiary = getBestiary();
    expect(updatedBestiary.length).toBe(bestiaryCountBefore + 1);
    expect(updatedBestiary[updatedBestiary.length - 1]?.category).toBe('Humanoid');
    expect(screen.getByRole('button', { name: 'Saved to Bestiary' })).toBeDisabled();
  });

  it('undoing a roster save removes the created hireling and re-enables the button', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save to Roster' }));
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    expect(getHirelings().length).toBe(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(getHirelings().length).toBe(0);
    expect(screen.getByRole('button', { name: 'Save to Roster' })).toBeEnabled();
  });

  it('rolling again resets both saved-states back to active', async () => {
    render(Generators, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save to Roster' }));
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: 'Saved to Roster' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Roll an NPC' }));

    expect(screen.getByRole('button', { name: 'Save to Roster' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save to Bestiary' })).toBeEnabled();
  });

  describe('in German', () => {
    beforeEach(() => {
      locale.set('de');
    });

    afterEach(() => {
      locale.set('en');
    });

    it('rolls an NPC in German', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      render(Generators, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: 'NSC würfeln' }));

      expect(screen.getByTestId('npc-name')).toHaveTextContent('Distel');
      expect(screen.getByText(NPC_ROLES.de[0]!)).toBeInTheDocument();
      expect(screen.getByText(NPC_QUIRKS.de[0]!)).toBeInTheDocument();
      expect(screen.queryByText(NPC_ROLES.en[0]!)).not.toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it('re-renders an already rolled NPC when the language changes', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      render(Generators, { props: { onnavigate: vi.fn() } });

      await fireEvent.click(screen.getByRole('button', { name: 'NSC würfeln' }));
      vi.restoreAllMocks();
      expect(screen.getByTestId('npc-name')).toHaveTextContent('Distel');

      locale.set('en');
      await tick();

      expect(screen.getByTestId('npc-name')).toHaveTextContent('Thistle');
    });
  });
});
