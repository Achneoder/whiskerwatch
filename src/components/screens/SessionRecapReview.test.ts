import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import SessionRecapReview from './SessionRecapReview.svelte';
import type { LiveSessionEvent } from '../../lib/stores/liveSessionLog.svelte';

const events: LiveSessionEvent[] = [
  { id: 'e1', kind: 'beatStatusChanged', beatId: 'b1', title: 'The granary raid', from: 'active', to: 'done' },
  { id: 'e2', kind: 'factionClockChanged', factionId: 'f1', name: 'The Court', from: 3, to: 4, max: 6 },
  { id: 'e3', kind: 'strDrained', name: 'Pip', role: 'party', newStr: 4 },
  { id: 'e4', kind: 'scarGained', name: 'Pip', role: 'party', scarLabel: 'Missing an eye', scarNote: '-1 ranged' },
  { id: 'e5', kind: 'moraleFailed', name: 'Oat' },
];

describe('SessionRecapReview', () => {
  it('groups events under Beats / Factions / Party / Hirelings headers', () => {
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, onback: vi.fn(), ondraft: vi.fn() },
    });

    expect(screen.getByText('Beats')).toBeInTheDocument();
    expect(screen.getByText('Factions')).toBeInTheDocument();
    expect(screen.getByText('Party')).toBeInTheDocument();
    expect(screen.getByText('Hirelings')).toBeInTheDocument();

    expect(screen.getByText("Resolved: 'The granary raid'")).toBeInTheDocument();
    expect(screen.getByText('The Court clock 3/6 → 4/6')).toBeInTheDocument();
    expect(screen.getByText("Pip's STR drained to 4")).toBeInTheDocument();
    expect(screen.getByText("Pip gained the scar 'Missing an eye' — -1 ranged")).toBeInTheDocument();
    expect(screen.getByText('Oat failed a morale save')).toBeInTheDocument();
  });

  it('pre-checks every event checkbox', () => {
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, onback: vi.fn(), ondraft: vi.fn() },
    });

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeChecked();
    }
  });

  it('shows the empty state when there is nothing logged', () => {
    render(SessionRecapReview, {
      props: { events: [], defaultNumber: 1, onback: vi.fn(), ondraft: vi.fn() },
    });

    expect(screen.getByText(/nothing notable was logged/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('calls onback when the back button is clicked', async () => {
    const onback = vi.fn();
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, onback, ondraft: vi.fn() },
    });

    await fireEvent.click(screen.getAllByRole('button', { name: /back to session/i })[0]!);

    expect(onback).toHaveBeenCalledOnce();
  });

  it('drafts a recap with all checked bullets, in display (section) order, with a trailing blank line', async () => {
    const ondraft = vi.fn();
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, onback: vi.fn(), ondraft },
    });

    await fireEvent.click(screen.getByRole('button', { name: /draft recap/i }));

    expect(ondraft).toHaveBeenCalledOnce();
    const draft = ondraft.mock.calls[0]![0];
    expect(draft.number).toBe(6);
    expect(draft.title).toBe('');
    expect(draft.summary).toBe(
      [
        "• Resolved: 'The granary raid'",
        '• The Court clock 3/6 → 4/6',
        "• Pip's STR drained to 4",
        "• Pip gained the scar 'Missing an eye' — -1 ranged",
        '• Oat failed a morale save',
        '',
      ].join('\n'),
    );
  });

  it('excludes unchecked events from the drafted summary', async () => {
    const ondraft = vi.fn();
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, onback: vi.fn(), ondraft },
    });

    const strRow = screen.getByText("Pip's STR drained to 4").closest('label')!;
    await fireEvent.click(within(strRow).getByRole('checkbox'));

    await fireEvent.click(screen.getByRole('button', { name: /draft recap/i }));

    const draft = ondraft.mock.calls[0]![0];
    expect(draft.summary).not.toContain('STR drained');
  });

  it('tags the drafted session with defaultAdventureId when passed (Phase 12)', async () => {
    const ondraft = vi.fn();
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, defaultAdventureId: 'adv-1', onback: vi.fn(), ondraft },
    });

    await fireEvent.click(screen.getByRole('button', { name: /draft recap/i }));

    expect(ondraft.mock.calls[0]![0].adventureId).toBe('adv-1');
  });

  it('leaves the draft untagged when there is no active-beat adventure to default to', async () => {
    const ondraft = vi.fn();
    render(SessionRecapReview, {
      props: { events, defaultNumber: 6, onback: vi.fn(), ondraft },
    });

    await fireEvent.click(screen.getByRole('button', { name: /draft recap/i }));

    expect(ondraft.mock.calls[0]![0].adventureId).toBeNull();
  });
});
