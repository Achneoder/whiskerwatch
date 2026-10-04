import { describe, expect, it, vi } from 'vitest';
import { render, within, screen, fireEvent } from '@testing-library/svelte';
import AppSidebar from './AppSidebar.svelte';

// The component renders two parallel navs (a desktop <aside> and a mobile
// <header>, toggled purely via CSS breakpoints) so both exist in the DOM at
// once in jsdom, which has no layout engine to apply `hidden`/`md:flex`.
// Scope queries to the desktop <aside> to avoid ambiguous duplicate matches.
function getDesktopNav(container: HTMLElement) {
  const aside = container.querySelector('aside');
  if (!aside) throw new Error('Expected an <aside> element');
  return within(aside);
}

describe('AppSidebar', () => {
  it('calls onnavigate when an enabled nav item is clicked', async () => {
    const onnavigate = vi.fn();
    const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate } });

    await getDesktopNav(container).getByRole('button', { name: /warband/i }).click();

    expect(onnavigate).toHaveBeenCalledWith('warband');
  });

  it('navigates to factions and the hex map now that both screens are enabled', async () => {
    const onnavigate = vi.fn();
    const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate } });
    const nav = getDesktopNav(container);

    const factionsButton = nav.getByRole('button', { name: /factions/i });
    expect(factionsButton).not.toBeDisabled();
    await factionsButton.click();
    expect(onnavigate).toHaveBeenCalledWith('factions');

    await nav.getByRole('button', { name: /hex map/i }).click();
    expect(onnavigate).toHaveBeenCalledWith('hexMap');
  });

  it('navigates to settings from the sidebar', async () => {
    const onnavigate = vi.fn();
    const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate } });

    await getDesktopNav(container).getByRole('button', { name: /settings/i }).click();

    expect(onnavigate).toHaveBeenCalledWith('settings');
  });

  it('marks the settings entry as the current page when active', () => {
    const { container } = render(AppSidebar, { props: { active: 'settings', onnavigate: vi.fn() } });

    expect(getDesktopNav(container).getByRole('button', { name: /settings/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('only renders the start session button when onstartsession is provided', () => {
    const { container, rerender } = render(AppSidebar, { props: { active: 'overview', onnavigate: vi.fn() } });
    expect(getDesktopNav(container).queryByRole('button', { name: /start session/i })).not.toBeInTheDocument();

    rerender({ active: 'overview', onnavigate: vi.fn(), onstartsession: vi.fn() });
    expect(getDesktopNav(container).getByRole('button', { name: /start session/i })).toBeInTheDocument();
  });

  describe('quick-find', () => {
    it('opens quick-find from the desktop sidebar trigger', async () => {
      const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate: vi.fn() } });

      await getDesktopNav(container).getByRole('button', { name: 'Search campaign' }).click();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens quick-find from the mobile top bar trigger', async () => {
      const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate: vi.fn() } });
      const header = container.querySelector('header');
      if (!header) throw new Error('Expected a <header> element');

      await within(header).getByRole('button', { name: 'Search campaign' }).click();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens quick-find with the "/" keyboard shortcut', async () => {
      render(AppSidebar, { props: { active: 'overview', onnavigate: vi.fn() } });

      await fireEvent.keyDown(window, { key: '/' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not steal "/" from a focused text input', async () => {
      render(AppSidebar, { props: { active: 'overview', onnavigate: vi.fn() } });
      const decoyInput = document.createElement('input');
      document.body.appendChild(decoyInput);
      decoyInput.focus();

      await fireEvent.keyDown(decoyInput, { key: '/' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      document.body.removeChild(decoyInput);
    });

    it('navigates via a jump-to shortcut selected from quick-find', async () => {
      const onnavigate = vi.fn();
      const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate } });

      await getDesktopNav(container).getByRole('button', { name: 'Search campaign' }).click();
      await fireEvent.click(screen.getByRole('option', { name: 'Factions' }));

      expect(onnavigate).toHaveBeenCalledWith('factions');
    });

    it('bubbles a quick-find entity selection up through onselectresult', async () => {
      const { replaceFactions } = await import('../../lib/stores/factions.svelte');
      replaceFactions([{ id: 'f1', name: 'The Gnawing Court', disposition: 'hostile', clock: 3, of: 6, note: '', tags: [] }]);
      const onselectresult = vi.fn();
      const { container } = render(AppSidebar, { props: { active: 'overview', onnavigate: vi.fn(), onselectresult } });

      await getDesktopNav(container).getByRole('button', { name: 'Search campaign' }).click();
      await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'gnawing' } });
      await new Promise((resolve) => setTimeout(resolve, 200));
      await fireEvent.click(screen.getByRole('option', { name: /The Gnawing Court/ }));

      expect(onselectresult).toHaveBeenCalledWith(expect.objectContaining({ id: 'f1', navScreen: 'factions' }));
    });
  });
});
