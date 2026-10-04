import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SaveDock from './SaveDock.svelte';

const members = [
  { id: 'p1', name: 'Pip', str: 10, dex: 13, wil: 9 },
  { id: 'p2', name: 'Wren', str: 8, dex: 10, wil: 12 },
];

function mockD20Roll(result: number) {
  vi.spyOn(Math, 'random').mockReturnValue((result - 1) / 20 + 0.0001);
}

describe('SaveDock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a message instead of the picker when there is no one to save', () => {
    render(SaveDock, { props: { members: [] } });

    expect(screen.getByText(/add a mouse or hireling/i)).toBeInTheDocument();
  });

  it('rolls a save for the selected mouse and attribute, showing a pass', async () => {
    mockD20Roll(5); // well under Pip's STR of 10
    render(SaveDock, { props: { members } });

    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('shows a failed save when the roll is over the attribute score', async () => {
    mockD20Roll(20); // well over Pip's STR of 10
    render(SaveDock, { props: { members } });

    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  it('lets the GM switch attribute before rolling', async () => {
    mockD20Roll(11); // fails Pip's STR (10) and WIL (9), but passes Pip's DEX (13)
    render(SaveDock, { props: { members } });

    await fireEvent.click(screen.getByRole('button', { name: /^DEX/ }));
    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    // Pip's DEX is 13, so an 11 passes.
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('does not show a Morale button for a party mouse', () => {
    render(SaveDock, { props: { members } });

    expect(screen.queryByRole('button', { name: /^Morale/ })).not.toBeInTheDocument();
  });

  it('shows a Morale button for a hireling and rolls a d20 WIL save on tap', async () => {
    const membersWithHireling = [...members, { id: 'h1', name: 'Oat', str: 10, dex: 10, wil: 9, loyal: false }];
    mockD20Roll(5); // under Oat's WIL of 9
    render(SaveDock, { props: { members: membersWithHireling } });

    await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'h1' } });
    await fireEvent.click(screen.getByRole('button', { name: /^Morale 9$/ }));
    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('d20')).toBeInTheDocument();
  });

  it('rolls a loyal hireling\'s morale save with Advantage (2d20, lowest)', async () => {
    const membersWithHireling = [...members, { id: 'h1', name: 'Oat', str: 10, dex: 10, wil: 9, loyal: true }];
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(19 / 20 + 0.0001).mockReturnValueOnce(2 / 20 + 0.0001); // 20 and 3
    render(SaveDock, { props: { members: membersWithHireling } });

    await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'h1' } });
    await fireEvent.click(screen.getByRole('button', { name: /^Morale 9 · Adv$/ }));
    await fireEvent.click(screen.getByRole('button', { name: /roll save/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('2d20 (Adv)')).toBeInTheDocument();
  });
});
