<script lang="ts" module>
  export type SearchEntityType = 'party' | 'hireling' | 'beat' | 'bestiary' | 'faction' | 'hex' | 'session';

  export interface SearchResult {
    id: string;
    type: SearchEntityType;
    label: string;
    secondary: string;
    navScreen: NavScreen;
  }
</script>

<script lang="ts">
  import { ArrowLeft, Search, Users, UserPlus, ListTree, PawPrint, Swords, Map, ScrollText, History } from 'lucide-svelte';
  import type { ComponentType, SvelteComponent } from 'svelte';
  import type { IconProps } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Icon from './Icon.svelte';
  import Tag from './Tag.svelte';
  import type { NavScreen } from '../layout/AppSidebar.svelte';
  import { getParty } from '../../lib/stores/party.svelte';
  import { getHirelings } from '../../lib/stores/hirelings.svelte';
  import { getBeats } from '../../lib/stores/beats.svelte';
  import { getAdventures } from '../../lib/stores/adventures.svelte';
  import { getBestiary } from '../../lib/stores/bestiary.svelte';
  import { getFactions } from '../../lib/stores/factions.svelte';
  import { getHexNodes } from '../../lib/stores/hexmap.svelte';
  import { getSessions } from '../../lib/stores/sessions.svelte';
  import { daysSince } from '../../lib/date';

  interface Props {
    open: boolean;
    onclose: () => void;
    /** A real entity was selected — the caller should navigate *and* open that entity's existing edit surface (see `pendingFocus` in `App.svelte`). */
    onselect: (result: SearchResult) => void;
    /** One of the empty-query "jump to" shortcuts was tapped — plain navigation, no entity to focus. */
    onjump: (screen: NavScreen) => void;
  }

  let { open, onclose, onselect, onjump }: Props = $props();

  let query = $state('');
  let debouncedQuery = $state('');
  let highlightedIndex = $state(0);
  let inputEl = $state<HTMLInputElement | undefined>(undefined);

  // Debounced 150ms per spec — cheap insurance against re-scanning seven
  // arrays on every keystroke. Clearing back to empty is instant (no results
  // to compute for an empty string anyway, see `results` below).
  $effect(() => {
    const q = query;
    if (q.length === 0) {
      debouncedQuery = '';
      return;
    }
    const timer = setTimeout(() => {
      debouncedQuery = q;
    }, 150);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (open) {
      query = '';
      debouncedQuery = '';
      highlightedIndex = 0;
      // Autofocus the moment the overlay opens.
      queueMicrotask(() => inputEl?.focus());
    }
  });

  const TYPE_ICON: Record<SearchEntityType, ComponentType<SvelteComponent<IconProps>>> = {
    party: Users,
    hireling: UserPlus,
    beat: ListTree,
    bestiary: PawPrint,
    faction: Swords,
    hex: Map,
    session: ScrollText,
  };

  const JUMP_TARGETS: { screen: NavScreen; labelKey: string; icon: ComponentType<SvelteComponent<IconProps>> }[] = [
    { screen: 'warband', labelKey: 'nav.warband', icon: Users },
    { screen: 'adventure', labelKey: 'nav.adventure', icon: ListTree },
    { screen: 'bestiary', labelKey: 'nav.bestiary', icon: PawPrint },
    { screen: 'factions', labelKey: 'nav.factions', icon: Swords },
    { screen: 'hexMap', labelKey: 'nav.hexMap', icon: Map },
    { screen: 'sessions', labelKey: 'nav.sessions', icon: ScrollText },
    { screen: 'timeline', labelKey: 'nav.timeline', icon: History },
  ];

  interface ScoredMatch<T> {
    item: T;
    score: number;
  }

  /** Lower is better: 0 = a field is an exact (case-insensitive) match, 1 = a field starts with the query, 2 = the query merely occurs somewhere in a field. Returns `null` when no field matches at all. */
  function scoreMatch(fields: string[], query: string): number | null {
    let best: number | null = null;
    for (const raw of fields) {
      const field = raw.toLowerCase();
      if (!field || !field.includes(query)) continue;
      const score = field === query ? 0 : field.startsWith(query) ? 1 : 2;
      if (best === null || score < best) best = score;
    }
    return best;
  }

  function rankAndCap<T>(items: T[], fields: (item: T) => string[], labelOf: (item: T) => string, query: string): T[] {
    const scored: ScoredMatch<T>[] = [];
    for (const item of items) {
      const score = scoreMatch(fields(item), query);
      if (score !== null) scored.push({ item, score });
    }
    scored.sort((a, b) => a.score - b.score || labelOf(a.item).localeCompare(labelOf(b.item)));
    return scored.map((s) => s.item);
  }

  const RESULT_CAP = 5;

  interface ResultGroup {
    type: SearchEntityType;
    typeLabelKey: string;
    categoryKey: string;
    results: SearchResult[];
    totalMatches: number;
  }

  const groups = $derived.by((): ResultGroup[] => {
    const raw = debouncedQuery.trim();
    if (!raw) return [];
    const q = raw.toLowerCase();
    const out: ResultGroup[] = [];

    const adventures = getAdventures();

    const party = rankAndCap(
      getParty(),
      (m) => [m.name, m.role],
      (m) => m.name,
      q,
    ).map((m) => ({
      id: m.id,
      type: 'party' as const,
      label: m.name,
      secondary: `${m.role} · ${m.hp}/${m.max} HP`,
      navScreen: 'warband' as NavScreen,
    }));
    if (party.length > 0) {
      out.push({
        type: 'party',
        typeLabelKey: 'search.types.party',
        categoryKey: 'search.categories.party',
        results: party.slice(0, RESULT_CAP),
        totalMatches: party.length,
      });
    }

    const hirelingMatches = rankAndCap(
      getHirelings(),
      (h) => [h.name, h.role, h.notes],
      (h) => h.name,
      q,
    ).map((h) => ({
      id: h.id,
      type: 'hireling' as const,
      label: h.name,
      secondary: `${h.role} · ${$_(`search.status.${h.status}`)}`,
      navScreen: 'warband' as NavScreen,
    }));
    if (hirelingMatches.length > 0) {
      out.push({
        type: 'hireling',
        typeLabelKey: 'search.types.hireling',
        categoryKey: 'search.categories.hireling',
        results: hirelingMatches.slice(0, RESULT_CAP),
        totalMatches: hirelingMatches.length,
      });
    }

    const beatMatches = rankAndCap(
      getBeats(),
      (b) => [b.title, b.notes],
      (b) => b.title,
      q,
    ).map((b) => {
      const adventureTitle = adventures.find((a) => a.id === b.adventureId)?.title ?? '';
      return {
        id: b.id,
        type: 'beat' as const,
        label: b.title,
        secondary: adventureTitle ? `${adventureTitle} · ${$_(`adventure.status.${b.status}`)}` : $_(`adventure.status.${b.status}`),
        navScreen: 'adventure' as NavScreen,
      };
    });
    if (beatMatches.length > 0) {
      out.push({
        type: 'beat',
        typeLabelKey: 'search.types.beat',
        categoryKey: 'search.categories.beat',
        results: beatMatches.slice(0, RESULT_CAP),
        totalMatches: beatMatches.length,
      });
    }

    const bestiaryMatches = rankAndCap(
      getBestiary(),
      (b) => [b.name, b.special, b.notes],
      (b) => b.name,
      q,
    ).map((b) => ({
      id: b.id,
      type: 'bestiary' as const,
      label: b.name,
      secondary: $_(`bestiary.category.${b.category}`),
      navScreen: 'bestiary' as NavScreen,
    }));
    if (bestiaryMatches.length > 0) {
      out.push({
        type: 'bestiary',
        typeLabelKey: 'search.types.bestiary',
        categoryKey: 'search.categories.bestiary',
        results: bestiaryMatches.slice(0, RESULT_CAP),
        totalMatches: bestiaryMatches.length,
      });
    }

    const factionMatches = rankAndCap(
      getFactions(),
      (f) => [f.name, f.note, ...f.tags],
      (f) => f.name,
      q,
    ).map((f) => ({
      id: f.id,
      type: 'faction' as const,
      label: f.name,
      secondary: `${$_(`factions.disposition.${f.disposition}`)} · ${f.clock}/${f.of}`,
      navScreen: 'factions' as NavScreen,
    }));
    if (factionMatches.length > 0) {
      out.push({
        type: 'faction',
        typeLabelKey: 'search.types.faction',
        categoryKey: 'search.categories.faction',
        results: factionMatches.slice(0, RESULT_CAP),
        totalMatches: factionMatches.length,
      });
    }

    const hexMatches = rankAndCap(
      getHexNodes(),
      (h) => [h.name, h.notes],
      (h) => h.name,
      q,
    ).map((h) => ({
      id: h.id,
      type: 'hex' as const,
      label: h.name,
      secondary: `${$_(`hexMap.terrain.${h.terrain}`)} · ${h.q},${h.r}`,
      navScreen: 'hexMap' as NavScreen,
    }));
    if (hexMatches.length > 0) {
      out.push({
        type: 'hex',
        typeLabelKey: 'search.types.hex',
        categoryKey: 'search.categories.hex',
        results: hexMatches.slice(0, RESULT_CAP),
        totalMatches: hexMatches.length,
      });
    }

    const sessionMatches = rankAndCap(
      getSessions(),
      (s) => [s.title, s.summary],
      (s) => s.title,
      q,
    ).map((s) => ({
      id: s.id,
      type: 'session' as const,
      label: s.title,
      secondary: $_('search.sessionSecondary', { values: { number: s.number, days: daysSince(s.date) } }),
      navScreen: 'sessions' as NavScreen,
    }));
    if (sessionMatches.length > 0) {
      out.push({
        type: 'session',
        typeLabelKey: 'search.types.session',
        categoryKey: 'search.categories.session',
        results: sessionMatches.slice(0, RESULT_CAP),
        totalMatches: sessionMatches.length,
      });
    }

    return out;
  });

  const hasQuery = $derived(debouncedQuery.trim().length > 0);
  const flatResults = $derived(groups.flatMap((g) => g.results));
  const totalResultCount = $derived(flatResults.length);

  // Keyboard cursor moves through whichever flat list is currently on screen
  // — the jump-to shortcuts before typing, the result rows after.
  const cursorCount = $derived(hasQuery ? flatResults.length : JUMP_TARGETS.length);

  $effect(() => {
    // Reset the cursor whenever the visible list changes shape so it never
    // points past the end of a shorter result set.
    if (highlightedIndex >= cursorCount) highlightedIndex = 0;
  });

  function highlightSegments(text: string, query: string): { text: string; match: boolean }[] {
    if (!query) return [{ text, match: false }];
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return [{ text, match: false }];
    const segments: { text: string; match: boolean }[] = [];
    if (idx > 0) segments.push({ text: text.slice(0, idx), match: false });
    segments.push({ text: text.slice(idx, idx + query.length), match: true });
    if (idx + query.length < text.length) segments.push({ text: text.slice(idx + query.length), match: false });
    return segments;
  }

  function close() {
    query = '';
    debouncedQuery = '';
    onclose();
  }

  function selectResult(result: SearchResult) {
    onselect(result);
    close();
  }

  function selectJump(screen: NavScreen) {
    onjump(screen);
    close();
  }

  function activateHighlighted() {
    if (hasQuery) {
      const result = flatResults[highlightedIndex];
      if (result) selectResult(result);
    } else {
      const target = JUMP_TARGETS[highlightedIndex];
      if (target) selectJump(target.screen);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (cursorCount > 0) highlightedIndex = (highlightedIndex + 1) % cursorCount;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (cursorCount > 0) highlightedIndex = (highlightedIndex - 1 + cursorCount) % cursorCount;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activateHighlighted();
    }
  }
</script>

{#if open}
  <div
    onclick={(e) => {
      if (e.target === e.currentTarget) close();
    }}
    role="presentation"
    class="fixed inset-0 z-100 flex justify-center items-stretch md:items-start bg-[color-mix(in_srgb,#1d130a_62%,transparent)] md:backdrop-blur-[2px] motion-safe:animate-[ww-qf-fade_calc(var(--dur)*1ms)_var(--ease)]"
  >
    <div
      role="dialog"
      aria-modal="true"
      class="w-full h-full md:h-auto md:mt-[12vh] md:w-[560px] md:max-h-[60vh] flex flex-col bg-[var(--surface-raised)] md:border md:border-[var(--border-strong)] md:rounded-[var(--radius-lg)] md:shadow-[var(--shadow-modal)] overflow-hidden motion-safe:animate-[ww-qf-rise_calc(var(--dur-slow)*1ms)_var(--ease)]"
    >
      <div
        class="flex items-center gap-2 p-[var(--sp-3)] border-b border-[var(--border)] shrink-0 md:sticky md:top-0 md:bg-[var(--surface-raised)] md:z-10"
      >
        <button
          type="button"
          onclick={close}
          class="grid place-items-center shrink-0 w-[var(--tap)] h-[var(--tap)] rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer"
          aria-label={$_('search.back')}
        >
          <Icon icon={ArrowLeft} />
        </button>
        <div class="flex-1 flex items-center gap-2 min-h-[var(--tap)] px-[var(--pad-control-x)] bg-[var(--surface)] border border-[var(--border-strong)] rounded-[var(--radius-md)]">
          <span class="text-[var(--text-muted)] shrink-0"><Icon icon={Search} /></span>
          <input
            bind:this={inputEl}
            bind:value={query}
            onkeydown={handleKeydown}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="quickfind-listbox"
            aria-autocomplete="list"
            aria-label={$_('search.trigger')}
            placeholder={$_('search.placeholder')}
            class="ww-no-native-ring flex-1 min-w-0 border-none outline-none bg-transparent py-[var(--pad-control-y)] text-[length:var(--text-body)] text-[var(--text)] font-[family-name:var(--font-body)]"
          />
        </div>
      </div>

      <div id="quickfind-listbox" role="listbox" aria-label={$_('search.trigger')} class="flex-1 overflow-y-auto">
        {#if !hasQuery}
          <div class="p-[var(--sp-4)]">
            <div class="ww-label mb-2">{$_('search.jumpTo')}</div>
            <div class="grid grid-cols-2 gap-2">
              {#each JUMP_TARGETS as target, i (target.screen)}
                <button
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === i}
                  onclick={() => selectJump(target.screen)}
                  class="flex items-center gap-2.5 min-h-[var(--tap)] px-[var(--sp-3)] py-2 rounded-[var(--radius-md)] text-left cursor-pointer border-l-2 {highlightedIndex ===
                  i
                    ? 'bg-[var(--accent-tint)] border-[var(--accent)]'
                    : 'border-transparent hover:bg-[var(--surface-sunk)]'}"
                >
                  <Icon icon={target.icon} />
                  <span class="text-[length:var(--text-body)] font-medium">{$_(target.labelKey)}</span>
                </button>
              {/each}
            </div>
          </div>
        {:else if totalResultCount === 0}
          <div class="flex flex-col items-center justify-center gap-2 py-[var(--sp-6)] px-[var(--sp-4)] text-center text-[var(--text-muted)]">
            <Icon icon={Search} />
            <p class="font-bold text-[length:var(--text-body)]">{$_('search.noResults')}</p>
            <p class="text-[length:var(--text-sm)]">{$_('search.noResultsHint', { values: { query: debouncedQuery } })}</p>
          </div>
        {:else}
          {#each groups as group (group.type)}
            {@const startIndex = groups
              .slice(0, groups.indexOf(group))
              .reduce((sum, g) => sum + g.results.length, 0)}
            <div class="border-b border-[var(--border)] last:border-b-0">
              <div class="ww-label px-[var(--sp-4)] pt-[var(--sp-3)] pb-1">{$_(group.categoryKey)}</div>
              {#each group.results as result, i (result.id)}
                {@const flatIndex = startIndex + i}
                <button
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === flatIndex}
                  onclick={() => selectResult(result)}
                  class="w-full min-h-[var(--tap)] flex items-center gap-3 px-[var(--sp-4)] py-2 text-left cursor-pointer border-l-2 {highlightedIndex ===
                  flatIndex
                    ? 'bg-[var(--accent-tint)] border-[var(--accent)]'
                    : 'border-transparent hover:bg-[var(--surface-sunk)]'}"
                >
                  <span class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--surface-sunk)] text-[var(--text-secondary)]">
                    <Icon icon={TYPE_ICON[result.type]} />
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-[length:var(--text-body)] font-bold truncate">
                      {#each highlightSegments(result.label, debouncedQuery) as seg, si (si)}
                        {#if seg.match}<mark class="bg-transparent text-[var(--accent)] font-bold">{seg.text}</mark>{:else}{seg.text}{/if}
                      {/each}
                    </span>
                    <span class="block text-[length:var(--text-sm)] text-[var(--text-muted)] truncate">
                      {#each highlightSegments(result.secondary, debouncedQuery) as seg, si (si)}
                        {#if seg.match}<mark class="bg-transparent text-[var(--accent)] font-bold">{seg.text}</mark>{:else}{seg.text}{/if}
                      {/each}
                    </span>
                  </span>
                  <Tag size="sm">{$_(group.typeLabelKey)}</Tag>
                </button>
              {/each}
              {#if group.totalMatches > RESULT_CAP}
                <div class="px-[var(--sp-4)] py-1.5 text-[length:var(--text-sm)] text-[var(--text-muted)]">
                  {$_('search.moreResults', { values: { n: group.totalMatches - RESULT_CAP } })}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes ww-qf-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes ww-qf-rise {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
