import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ReactionResult from './ReactionResult.svelte';
import type { ReactionRollResult } from '../../lib/generators/reaction';

function result(overrides: Partial<ReactionRollResult> = {}): ReactionRollResult {
  return {
    dice: [1, 1],
    total: 2,
    band: 'hostile',
    guidance: 'How have the mice angered them?',
    ...overrides,
  };
}

describe('ReactionResult', () => {
  it('shows the band name as a label and the SRD guidance sentence', () => {
    render(ReactionResult, { props: { result: result() } });

    expect(screen.getByText('Hostile')).toBeInTheDocument();
    expect(screen.getByText('How have the mice angered them?')).toBeInTheDocument();
  });

  it('shows the dice faces and total', () => {
    render(ReactionResult, { props: { result: result({ dice: [3, 4], total: 7, band: 'unsure' }) } });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it.each([
    ['unfriendly', 'Unfriendly'],
    ['talkative', 'Talkative'],
    ['helpful', 'Helpful'],
  ] as const)('renders the %s band label as %s', (band, label) => {
    render(ReactionResult, { props: { result: result({ band }) } });

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
