import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import HelpTip from './HelpTip.svelte';
import Stepper from './Stepper.svelte';
import Input from './Input.svelte';

const props = { text: 'Mausritter currency.', label: 'Pips' };

describe('HelpTip', () => {
  it('renders a labelled help button with the tip hidden', () => {
    render(HelpTip, { props });

    const button = screen.getByRole('button', { name: 'Help: Pips' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggles the tip open and closed on tap', async () => {
    render(HelpTip, { props });
    const button = screen.getByRole('button', { name: 'Help: Pips' });

    await fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Mausritter currency.');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);

    await fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on hover and hides on mouse leave when not pinned', async () => {
    render(HelpTip, { props });
    const button = screen.getByRole('button', { name: 'Help: Pips' });

    await fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('stays open after mouse leave once tapped', async () => {
    render(HelpTip, { props });
    const button = screen.getByRole('button', { name: 'Help: Pips' });

    await fireEvent.click(button);
    await fireEvent.mouseLeave(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes on Escape without letting the key reach other window listeners', async () => {
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    render(HelpTip, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'Help: Pips' }));
    await fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(outer).not.toHaveBeenCalled();
    window.removeEventListener('keydown', outer);
  });

  it('closes when tapping elsewhere', async () => {
    render(HelpTip, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'Help: Pips' }));
    await fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not submit the surrounding form', async () => {
    const onsubmit = vi.fn((e: Event) => e.preventDefault());
    const form = document.createElement('form');
    form.addEventListener('submit', onsubmit);
    document.body.appendChild(form);
    render(HelpTip, { props, target: form });

    await fireEvent.click(screen.getByRole('button', { name: 'Help: Pips' }));

    expect(onsubmit).not.toHaveBeenCalled();
    form.remove();
  });
});

describe('help prop on form primitives', () => {
  it('Stepper shows a help button next to its label only when help is given', () => {
    const { unmount } = render(Stepper, { props: { label: 'Pips', value: 0 } });
    expect(screen.queryByRole('button', { name: 'Help: Pips' })).not.toBeInTheDocument();
    unmount();

    render(Stepper, { props: { label: 'Pips', value: 0, help: 'Mausritter currency.' } });
    expect(screen.getByRole('button', { name: 'Help: Pips' })).toBeInTheDocument();
  });

  it('Input keeps its label associated with the field when help is given', () => {
    render(Input, { props: { label: 'Wage', help: 'Pips per day.' } });

    expect(screen.getByLabelText('Wage')).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByRole('button', { name: 'Help: Wage' })).toBeInTheDocument();
  });
});
