import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DiceRoll from './DiceRoll.svelte';

describe('DiceRoll', () => {
  it('renders each die face and the total', () => {
    render(DiceRoll, { props: { dice: [3, 4], total: 7 } });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows a Success word pill for the success outcome', () => {
    render(DiceRoll, { props: { dice: [5], total: 5, outcome: 'success' } });

    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('shows a Failure word pill for the fail outcome', () => {
    render(DiceRoll, { props: { dice: [15], total: 15, outcome: 'fail' } });

    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  it('renders a label when provided', () => {
    render(DiceRoll, { props: { dice: [1, 1], total: 2, outcome: 'hostile', label: 'Hostile' } });

    expect(screen.getByText('Hostile')).toBeInTheDocument();
  });

  it.each(['hostile', 'unfriendly', 'unsure', 'talkative', 'helpful'] as const)(
    'renders without a word pill for the %s reaction band skin',
    (outcome) => {
      const { container } = render(DiceRoll, { props: { dice: [3, 3], total: 6, outcome, label: outcome } });

      // Band skins carry no bottom "word" pill (unlike success/fail/partial) —
      // the band name is conveyed via the top label instead.
      expect(container.querySelectorAll('.rounded-\\[var\\(--radius-pill\\)\\]')).toHaveLength(0);
    },
  );
});
