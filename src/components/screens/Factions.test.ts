import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import Factions from './Factions.svelte';
import { replaceFactions, type Faction } from '../../lib/stores/factions.svelte';
import { replaceFactionEdges } from '../../lib/stores/factionEdges.svelte';
import { replaceBeats } from '../../lib/stores/beats.svelte';

const court: Faction = {
  id: '1',
  name: 'The Court',
  disposition: 'hostile',
  clock: 3,
  of: 6,
  note: 'Rats below',
  tags: ['Sewers'],
};

describe('Factions', () => {
  beforeEach(() => {
    replaceFactions([]);
    replaceFactionEdges([]);
    replaceBeats([]);
  });

  it('adds a new faction', async () => {
    render(Factions, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Add faction' }));
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Owlkin' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getAllByText('Owlkin').length).toBeGreaterThan(0);
  });

  it('edits a faction', async () => {
    replaceFactions([court]);
    render(Factions, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const input = screen.getByLabelText('Name');
    await fireEvent.input(input, { target: { value: 'The High Court' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getAllByText('The High Court').length).toBeGreaterThan(0);
  });

  it('deletes a faction after confirming', async () => {
    replaceFactions([court]);
    render(Factions, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('The Court')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no factions', () => {
    render(Factions, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText(/No factions yet/)).toBeInTheDocument();
  });

  it('shows a beat linked to a faction as a tag on its card', () => {
    replaceFactions([court]);
    replaceBeats([
      { id: 'b1', parentId: null, title: 'The granary raid', notes: '', status: 'active', hexNodeId: null, factionIds: ['1'], adventureId: 'adv-1' },
    ]);
    render(Factions, { props: { onnavigate: vi.fn() } });

    expect(screen.getByText(/The granary raid/)).toBeInTheDocument();
  });

  describe('quick-find focus hand-off', () => {
    it('opens the matching faction edit modal and consumes the focus request', () => {
      replaceFactions([court]);
      const onconsumedfocus = vi.fn();
      render(Factions, { props: { onnavigate: vi.fn(), focusId: '1', onconsumedfocus } });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByDisplayValue('The Court')).toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });

    it('is a quiet no-op when focusId matches no faction', () => {
      replaceFactions([court]);
      const onconsumedfocus = vi.fn();
      render(Factions, { props: { onnavigate: vi.fn(), focusId: 'missing', onconsumedfocus } });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });
  });
});
