import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RulesDrawer from './RulesDrawer.svelte';

describe('RulesDrawer', () => {
  it('renders all seven sections with their headings', () => {
    render(RulesDrawer, { props: { open: true } });

    expect(screen.getByRole('heading', { name: 'Saves' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Damage & the death spiral' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Conditions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inventory & slots' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reaction roll' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Advancement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hirelings' })).toBeInTheDocument();
  });

  it('lists all six of the standardized conditions from lib/conditions.ts', () => {
    render(RulesDrawer, { props: { open: true } });

    expect(screen.getByText('Exhausted')).toBeInTheDocument();
    expect(screen.getByText('Frightened')).toBeInTheDocument();
    expect(screen.getByText('Hungry & Thirsty')).toBeInTheDocument();
    expect(screen.getByText('Injured')).toBeInTheDocument();
    expect(screen.getByText('Incapacitated')).toBeInTheDocument();
    expect(screen.getByText('Unconscious')).toBeInTheDocument();
  });

  it('shows the dialog with an accessible label', () => {
    render(RulesDrawer, { props: { open: true } });

    expect(screen.getByRole('dialog', { name: 'Rules reference' })).toBeInTheDocument();
  });

  it('jumping to a section scrolls it into view', async () => {
    render(RulesDrawer, { props: { open: true } });
    const scrollIntoView = vi.fn();
    const heading = screen.getByRole('heading', { name: 'Advancement' });
    const section = heading.closest('section')!;
    section.scrollIntoView = scrollIntoView;

    await fireEvent.click(screen.getByRole('button', { name: 'Advancement' }));

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('calls onclose when the close button is clicked', async () => {
    const onclose = vi.fn();
    render(RulesDrawer, { props: { open: true, onclose } });

    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onclose).toHaveBeenCalledOnce();
  });

  it('calls onclose when the scrim is clicked', async () => {
    const onclose = vi.fn();
    const { container } = render(RulesDrawer, { props: { open: true, onclose } });
    const scrim = container.querySelector('[aria-hidden="true"]')!;

    await fireEvent.click(scrim);

    expect(onclose).toHaveBeenCalledOnce();
  });

  it('calls onclose on Escape when open', async () => {
    const onclose = vi.fn();
    render(RulesDrawer, { props: { open: true, onclose } });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onclose).toHaveBeenCalledOnce();
  });

  it('does not call onclose on Escape when closed', async () => {
    const onclose = vi.fn();
    render(RulesDrawer, { props: { open: false, onclose } });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onclose).not.toHaveBeenCalled();
  });
});
