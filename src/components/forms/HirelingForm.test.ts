import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import HirelingForm from './HirelingForm.svelte';

describe('HirelingForm', () => {
  it('saves a new hireling with the entered name', async () => {
    const onsave = vi.fn();
    render(HirelingForm, { props: { onsave, oncancel: vi.fn() } });

    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Oat' } });
    await fireEvent.input(screen.getByLabelText('Role'), { target: { value: 'Porter' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onsave).toHaveBeenCalledOnce();
    const saved = onsave.mock.calls[0]![0];
    expect(saved.name).toBe('Oat');
    expect(saved.role).toBe('Porter');
  });

  it('does not save when the name is blank', async () => {
    const onsave = vi.fn();
    render(HirelingForm, { props: { onsave, oncancel: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onsave).not.toHaveBeenCalled();
  });

  it('pre-fills fields from an initial hireling', () => {
    render(HirelingForm, {
      props: {
        initial: {
          id: '1',
          name: 'Oat',
          role: 'Porter',
          hp: 3,
          max: 3,
          str: 10,
          maxStr: 10,
          dex: 10,
          wil: 10,
          loyal: false,
          wage: 5,
          notes: 'Reliable.',
          status: 'active',
          conditions: [],
          scars: [],
          items: [],
        },
        onsave: vi.fn(),
        oncancel: vi.fn(),
      },
    });

    expect(screen.getByDisplayValue('Oat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Reliable.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('defaults WIL to 7 (2d6 average), not loyal, and wage 0 for a new hireling', async () => {
    const onsave = vi.fn();
    render(HirelingForm, { props: { onsave, oncancel: vi.fn() } });

    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Clover' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const saved = onsave.mock.calls[0]![0];
    expect(saved.wil).toBe(7);
    expect(saved.loyal).toBe(false);
    expect(saved.wage).toBe(0);
  });

  it('saves a GM-entered wage as a plain number', async () => {
    const onsave = vi.fn();
    render(HirelingForm, { props: { onsave, oncancel: vi.fn() } });

    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Clover' } });
    await fireEvent.input(screen.getByLabelText('Wage'), { target: { value: '8' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onsave.mock.calls[0]![0].wage).toBe(8);
  });

  it('calls oncancel when Cancel is clicked', async () => {
    const oncancel = vi.fn();
    render(HirelingForm, { props: { onsave: vi.fn(), oncancel } });

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(oncancel).toHaveBeenCalledOnce();
  });

  it('saves the Loyal or well-paid toggle and an edited WIL', async () => {
    const onsave = vi.fn();
    render(HirelingForm, { props: { onsave, oncancel: vi.fn() } });

    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Clover' } });
    await fireEvent.click(screen.getByLabelText('Loyal or well-paid'));
    const wilStepper = screen.getByText('WIL').closest('.flex-col')!;
    await fireEvent.click(within(wilStepper as HTMLElement).getByRole('button', { name: 'Increase' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const saved = onsave.mock.calls[0]![0];
    expect(saved.loyal).toBe(true);
    expect(saved.wil).toBe(8);
  });

  it('shows a 6-slot hireling inventory: 2 paws, 2 body, 2 pack', () => {
    render(HirelingForm, { props: { onsave: vi.fn(), oncancel: vi.fn() } });

    expect(screen.getByText('0 / 6 slots used')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Empty slot, add item' })).toHaveLength(6);
  });
});
