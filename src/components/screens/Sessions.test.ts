import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import Sessions from './Sessions.svelte';
import { replaceSessions } from '../../lib/stores/sessions.svelte';
import { replaceAdventures } from '../../lib/stores/adventures.svelte';

describe('Sessions', () => {
  beforeEach(() => {
    replaceSessions([]);
    replaceAdventures([]);
  });

  it('logs a new session', async () => {
    render(Sessions, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Log session' }));
    // Deliberately not "The granary raid" — that title also exists as a
    // seeded `Adventure`, and would collide with the Phase 12 adventure
    // filter chip/session tag that now render that same text elsewhere on
    // this screen.
    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Into the sewers, part two' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Into the sewers, part two')).toBeInTheDocument();
  });

  it('lists sessions newest-first', () => {
    replaceSessions([
      { id: '1', number: 1, date: '2026-01-01', title: 'First', summary: '' },
      { id: '2', number: 3, date: '2026-01-15', title: 'Third', summary: '' },
      { id: '3', number: 2, date: '2026-01-08', title: 'Second', summary: '' },
    ]);
    render(Sessions, { props: { onnavigate: vi.fn() } });

    const titles = screen.getAllByText(/First|Second|Third/).map((el) => el.textContent);
    expect(titles).toEqual(['Third', 'Second', 'First']);
  });

  it('deletes a session after confirming', async () => {
    replaceSessions([{ id: '1', number: 1, date: '2026-01-01', title: 'First', summary: '' }]);
    render(Sessions, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });

  it('opens the add-session modal pre-filled when handed a recap draft', () => {
    const onconsumeddraft = vi.fn();
    render(Sessions, {
      props: {
        onnavigate: vi.fn(),
        draftRecap: { number: 6, date: '2026-07-07', title: '', summary: "• Resolved: 'The raid'\n" },
        onconsumeddraft,
      },
    });

    expect(screen.getByDisplayValue(/Resolved: 'The raid'/)).toBeInTheDocument();
    expect(onconsumeddraft).toHaveBeenCalledOnce();
  });

  describe('adventure filter chips (Phase 12)', () => {
    beforeEach(() => {
      replaceAdventures([
        { id: 'adv-1', title: 'The granary raid', description: '', status: 'active' },
        { id: 'adv-2', title: 'The Gnawing Court', description: '', status: 'active' },
      ]);
      replaceSessions([
        { id: 's1', number: 1, date: '2026-01-01', title: 'Into the tunnels', summary: '', adventureId: 'adv-1' },
        { id: 's2', number: 2, date: '2026-01-08', title: 'Confront the envoy', summary: '', adventureId: 'adv-2' },
        { id: 's3', number: 3, date: '2026-01-15', title: 'A quiet week', summary: '' },
      ]);
    });

    it('shows no filter chips when there are no adventures', () => {
      replaceAdventures([]);
      render(Sessions, { props: { onnavigate: vi.fn() } });

      expect(screen.queryByTestId('session-adventure-filters')).not.toBeInTheDocument();
    });

    it('shows every session by default, tagged with its adventure where one is set', () => {
      render(Sessions, { props: { onnavigate: vi.fn() } });

      expect(screen.getByText('Into the tunnels')).toBeInTheDocument();
      expect(screen.getByText('Confront the envoy')).toBeInTheDocument();
      expect(screen.getByText('A quiet week')).toBeInTheDocument();
    });

    it('filters sessions down to the selected adventure', async () => {
      render(Sessions, { props: { onnavigate: vi.fn() } });

      const filters = within(screen.getByTestId('session-adventure-filters'));
      await fireEvent.click(filters.getByText('The Gnawing Court'));

      expect(screen.getByText('Confront the envoy')).toBeInTheDocument();
      expect(screen.queryByText('Into the tunnels')).not.toBeInTheDocument();
      expect(screen.queryByText('A quiet week')).not.toBeInTheDocument();
    });

    it('filters down to sessions with no adventure tag via the Unassigned chip', async () => {
      render(Sessions, { props: { onnavigate: vi.fn() } });

      const filters = within(screen.getByTestId('session-adventure-filters'));
      await fireEvent.click(filters.getByText('Unassigned'));

      expect(screen.getByText('A quiet week')).toBeInTheDocument();
      expect(screen.queryByText('Into the tunnels')).not.toBeInTheDocument();
      expect(screen.queryByText('Confront the envoy')).not.toBeInTheDocument();
    });
  });

  describe('quick-find focus hand-off', () => {
    it('opens the matching session edit modal and consumes the focus request', () => {
      replaceSessions([{ id: 's1', number: 1, date: '2026-01-01', title: 'Into the sewers', summary: '' }]);
      const onconsumedfocus = vi.fn();
      render(Sessions, { props: { onnavigate: vi.fn(), focusId: 's1', onconsumedfocus } });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByDisplayValue('Into the sewers')).toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });

    it('is a quiet no-op when focusId matches no session', () => {
      replaceSessions([{ id: 's1', number: 1, date: '2026-01-01', title: 'Into the sewers', summary: '' }]);
      const onconsumedfocus = vi.fn();
      render(Sessions, { props: { onnavigate: vi.fn(), focusId: 'missing', onconsumedfocus } });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onconsumedfocus).toHaveBeenCalledOnce();
    });
  });
});
