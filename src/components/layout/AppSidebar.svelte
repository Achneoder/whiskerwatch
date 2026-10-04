<script lang="ts">
  import {
    LayoutDashboard,
    Users,
    ListTree,
    PawPrint,
    Swords,
    Map,
    WandSparkles,
    ScrollText,
    History,
    Moon,
    Sun,
    Play,
    Languages,
    Settings,
    Search,
  } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import QuickFind, { type SearchResult } from '../ui/QuickFind.svelte';
  import { getTheme, toggleTheme, initTheme } from '../../lib/stores/theme.svelte';
  import { locale, setLocale, type SupportedLocale } from '../../lib/i18n';

  export type NavScreen =
    | 'overview'
    | 'warband'
    | 'adventure'
    | 'bestiary'
    | 'factions'
    | 'hexMap'
    | 'generators'
    | 'sessions'
    | 'timeline'
    | 'settings';

  interface Props {
    active: NavScreen;
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: (() => void) | undefined;
    /**
     * Bubbles a quick-find entity selection up to `App.svelte`, which sets
     * `pendingFocus` and navigates — see `App.svelte`'s `selectSearchResult`.
     * Every screen forwards this through unchanged from its own prop of the
     * same name (the same pass-through shape `onnavigate`/`onstartsession`
     * already use everywhere), since `AppSidebar` — and so the search
     * trigger — is shared chrome present on every screen, not just the six
     * screens that know how to consume a `focusId`.
     */
    onselectresult?: ((result: SearchResult) => void) | undefined;
  }

  let { active, onnavigate, onstartsession, onselectresult }: Props = $props();

  $effect(() => {
    initTheme();
  });

  let quickFindOpen = $state(false);
  let quickFindTrigger: HTMLElement | null = null;

  function openQuickFind(event: MouseEvent) {
    quickFindTrigger = event.currentTarget as HTMLElement;
    quickFindOpen = true;
  }

  function closeQuickFind() {
    quickFindOpen = false;
    quickFindTrigger?.focus();
  }

  function handleQuickFindSelect(result: SearchResult) {
    onselectresult?.(result);
  }

  function handleQuickFindJump(screen: NavScreen) {
    onnavigate(screen);
  }

  /**
   * `/` opens quick-find from anywhere a text input doesn't already have
   * focus — desktop only (prep-mode convenience), never bound on
   * touch-only viewports (no physical keyboard to type the shortcut on, and
   * `/` is a real character the GM might need in a text field on a phone).
   * `matchMedia` isn't implemented in this project's jsdom test environment
   * (see AppSidebar.test.ts), so it's treated as "desktop" whenever the API
   * itself is unavailable rather than silently disabling the shortcut under
   * test.
   */
  function isDesktopViewport(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key !== '/' || quickFindOpen || !isDesktopViewport()) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    event.preventDefault();
    quickFindTrigger = null;
    quickFindOpen = true;
  }

  const nav: { screen: NavScreen; icon: typeof LayoutDashboard; key: string; enabled: boolean }[] = [
    { screen: 'overview', icon: LayoutDashboard, key: 'nav.overview', enabled: true },
    { screen: 'warband', icon: Users, key: 'nav.warband', enabled: true },
    { screen: 'adventure', icon: ListTree, key: 'nav.adventure', enabled: true },
    { screen: 'bestiary', icon: PawPrint, key: 'nav.bestiary', enabled: true },
    { screen: 'factions', icon: Swords, key: 'nav.factions', enabled: true },
    { screen: 'hexMap', icon: Map, key: 'nav.hexMap', enabled: true },
    { screen: 'generators', icon: WandSparkles, key: 'nav.generators', enabled: true },
    { screen: 'sessions', icon: ScrollText, key: 'nav.sessions', enabled: true },
    { screen: 'timeline', icon: History, key: 'nav.timeline', enabled: true },
  ];

  function toggleLocale() {
    const next: SupportedLocale = $locale === 'en' ? 'de' : 'en';
    setLocale(next);
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<QuickFind open={quickFindOpen} onclose={closeQuickFind} onselect={handleQuickFindSelect} onjump={handleQuickFindJump} />

<!-- Desktop / tablet-landscape sidebar -->
<aside
  class="hidden md:flex md:w-[var(--sidebar-w)] md:sticky md:top-0 md:h-dvh md:overflow-y-auto shrink-0 border-r border-[var(--border)] bg-[var(--surface)] py-[var(--sp-5)] px-[var(--sp-4)] flex-col gap-[var(--sp-5)]"
>
  <div class="font-[family-name:var(--font-display)] font-extrabold text-[22px] tracking-[-0.02em]">
    Whisker<span class="text-[var(--accent)]">watch</span>
  </div>
  <button
    type="button"
    onclick={openQuickFind}
    aria-label={$_('search.trigger')}
    class="flex items-center gap-2.5 min-h-[var(--tap)] py-2 px-2.5 rounded-[var(--radius-md)] text-[length:var(--text-body)] text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--surface-raised)]"
  >
    <Icon icon={Search} />
    {$_('search.trigger')}
  </button>
  <nav class="flex flex-col gap-0.5">
    {#each nav as item (item.key)}
      <button
        type="button"
        onclick={() => item.enabled && onnavigate(item.screen)}
        disabled={!item.enabled}
        title={item.enabled ? undefined : $_('nav.comingSoon')}
        class="flex items-center gap-2.5 py-2 px-2.5 rounded-[var(--radius-md)] text-[length:var(--text-body)] text-left {active ===
        item.screen
          ? 'font-bold text-[var(--accent)] bg-[var(--accent-tint)] cursor-default'
          : item.enabled
            ? 'font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--surface-raised)]'
            : 'font-medium text-[var(--text-secondary)] cursor-not-allowed opacity-60'}"
      >
        <Icon icon={item.icon} />
        {$_(item.key)}
      </button>
    {/each}
  </nav>
  <div class="mt-auto flex flex-col gap-2.5">
    <button
      type="button"
      aria-current={active === 'settings' ? 'page' : undefined}
      onclick={() => onnavigate('settings')}
      class="flex items-center gap-2.5 py-2 px-2.5 rounded-[var(--radius-md)] text-[length:var(--text-body)] text-left border-t border-[var(--border)] pt-3 {active ===
      'settings'
        ? 'font-bold text-[var(--accent)] bg-[var(--accent-tint)] cursor-default'
        : 'font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--surface-raised)]'}"
    >
      <Icon icon={Settings} />
      {$_('nav.settings')}
    </button>
    <Button variant="secondary" size="sm" block onclick={toggleLocale}>
      {#snippet icon()}
        <Icon icon={Languages} />
      {/snippet}
      {$_('locale.label')}: {$locale === 'en' ? 'EN' : 'DE'}
    </Button>
    <Button variant="secondary" size="sm" block onclick={toggleTheme}>
      {#snippet icon()}
        <Icon icon={getTheme() === 'light' ? Moon : Sun} />
      {/snippet}
      {getTheme() === 'light' ? $_('theme.dark') : $_('theme.light')}
    </Button>
    {#if onstartsession}
      <Button variant="primary" block onclick={onstartsession}>
        {#snippet icon()}
          <Icon icon={Play} />
        {/snippet}
        {$_('dashboard.startSession')}
      </Button>
    {/if}
  </div>
</aside>

<!-- Mobile / tablet-portrait top bar -->
<header class="flex md:hidden flex-col sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] w-full">
  <div class="flex items-center justify-between gap-[var(--sp-3)] px-[var(--sp-4)] py-[var(--sp-3)]">
    <div class="font-[family-name:var(--font-display)] font-extrabold text-[18px] tracking-[-0.02em] shrink-0">
      Whisker<span class="text-[var(--accent)]">watch</span>
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        aria-label={$_('search.trigger')}
        onclick={openQuickFind}
        class="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] cursor-pointer"
      >
        <Icon icon={Search} />
      </button>
      <button
        type="button"
        aria-label={$_('nav.settings')}
        aria-current={active === 'settings' ? 'page' : undefined}
        onclick={() => onnavigate('settings')}
        class="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] cursor-pointer {active === 'settings'
          ? 'text-[var(--accent)] bg-[var(--accent-tint)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}"
      >
        <Icon icon={Settings} />
      </button>
      <button
        type="button"
        aria-label={$_('locale.label')}
        onclick={toggleLocale}
        class="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] cursor-pointer"
      >
        <Icon icon={Languages} />
      </button>
      <button
        type="button"
        aria-label={getTheme() === 'light' ? $_('theme.dark') : $_('theme.light')}
        onclick={toggleTheme}
        class="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] cursor-pointer"
      >
        <Icon icon={getTheme() === 'light' ? Moon : Sun} />
      </button>
      {#if onstartsession}
        <button
          type="button"
          aria-label={$_('dashboard.startSession')}
          onclick={onstartsession}
          class="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--on-accent)] cursor-pointer"
        >
          <Icon icon={Play} />
        </button>
      {/if}
    </div>
  </div>
  <nav class="flex overflow-x-auto gap-1 px-[var(--sp-2)] pb-[var(--sp-2)]">
    {#each nav as item (item.key)}
      <button
        type="button"
        onclick={() => item.enabled && onnavigate(item.screen)}
        disabled={!item.enabled}
        title={item.enabled ? undefined : $_('nav.comingSoon')}
        class="flex flex-col items-center gap-0.5 shrink-0 py-1.5 px-3 rounded-[var(--radius-md)] text-[length:var(--text-caption)] whitespace-nowrap {active ===
        item.screen
          ? 'font-bold text-[var(--accent)] bg-[var(--accent-tint)] cursor-default'
          : item.enabled
            ? 'font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--surface-raised)]'
            : 'font-medium text-[var(--text-secondary)] cursor-not-allowed opacity-60'}"
      >
        <Icon icon={item.icon} />
        {$_(item.key)}
      </button>
    {/each}
  </nav>
</header>
