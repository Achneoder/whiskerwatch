<script lang="ts">
  import { ScrollText, CheckCircle2, Swords, Skull } from 'lucide-svelte';
  import { _, locale } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Icon from '../ui/Icon.svelte';
  import Tag from '../ui/Tag.svelte';
  import StatusPill from '../ui/StatusPill.svelte';
  import { getCampaignHistory, type CampaignHistoryEntry } from '../../lib/stores/campaignHistory.svelte';
  import { getHexNodes } from '../../lib/stores/hexmap.svelte';
  import { getFactions } from '../../lib/stores/factions.svelte';
  import { getAdventures } from '../../lib/stores/adventures.svelte';
  import { getSessions } from '../../lib/stores/sessions.svelte';
  import { hexLabel } from '../../lib/hex';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    onselectresult?: (result: SearchResult) => void;
  }

  let { onnavigate, onstartsession, onselectresult }: Props = $props();

  type FilterKind = 'session' | 'beatCompleted' | 'clockChanged' | 'death';

  let activeFilters = $state<Set<FilterKind>>(new Set(['session', 'beatCompleted', 'clockChanged', 'death']));

  function toggleFilter(kind: FilterKind) {
    const next = new Set(activeFilters);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    activeFilters = next;
  }

  const history = getCampaignHistory();
  const hexNodes = getHexNodes();
  const factions = getFactions();
  const adventures = getAdventures();
  const sessions = getSessions();

  // Optional/additive per Phase 12: only `Session` carries an `adventureId`
  // (beats/factions/deaths don't, and this phase doesn't add one) — so this
  // filter only narrows down `session`-type rows. Every other entry kind
  // keeps showing regardless of which adventure is selected here; the
  // existing type checkboxes above are still how a GM hides those.
  const UNASSIGNED = '__unassigned__';
  let adventureFilter = $state<string | null>(null);

  function adventureIdForSession(sessionId: string): string | null {
    return sessions.find((s) => s.id === sessionId)?.adventureId ?? null;
  }

  function matchesAdventureFilter(entry: CampaignHistoryEntry): boolean {
    if (adventureFilter === null) return true;
    if (entry.type !== 'session') return true;
    const id = adventureIdForSession(entry.sessionId);
    return adventureFilter === UNASSIGNED ? !id : id === adventureFilter;
  }

  function hexNameFor(hexNodeId: string | null | undefined): string | null {
    if (!hexNodeId) return null;
    const node = hexNodes.find((h) => h.id === hexNodeId);
    return node ? node.name || hexLabel(node.q, node.r) : null;
  }

  function factionNamesFor(factionIds: string[] | undefined): string[] {
    if (!factionIds) return [];
    return factionIds.map((id) => factions.find((f) => f.id === id)?.name).filter((name): name is string => !!name);
  }

  const sorted = $derived(
    [...history]
      .filter((entry) => activeFilters.has(entry.type) && matchesAdventureFilter(entry))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  );

  function dayKey(timestamp: string): string {
    return timestamp.slice(0, 10);
  }

  interface DayGroup {
    key: string;
    date: Date;
    entries: CampaignHistoryEntry[];
  }

  const groups = $derived.by((): DayGroup[] => {
    const map = new Map<string, DayGroup>();
    for (const entry of sorted) {
      const key = dayKey(entry.timestamp);
      let group = map.get(key);
      if (!group) {
        group = { key, date: new Date(entry.timestamp), entries: [] };
        map.set(key, group);
      }
      group.entries.push(entry);
    }
    return [...map.values()];
  });

  const dayFormatter = $derived(new Intl.DateTimeFormat($locale ?? 'en', { weekday: 'long', month: 'long', day: 'numeric' }));
  const timeFormatter = $derived(new Intl.DateTimeFormat($locale ?? 'en', { hour: 'numeric', minute: '2-digit' }));

  function formatDay(date: Date): string {
    return dayFormatter.format(date);
  }

  function formatTime(timestamp: string): string {
    return timeFormatter.format(new Date(timestamp));
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="timeline" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)] min-w-0">
    <header>
      <div class="ww-label text-[var(--accent)]">{$_('timeline.eyebrow')}</div>
      <h1 class="text-[length:var(--text-h1)] mt-1">{$_('timeline.title')}</h1>
    </header>

    <div class="flex gap-2 overflow-x-auto pb-1" data-testid="timeline-filters">
      <Tag
        tone={activeFilters.has('session') ? 'accent' : 'default'}
        onclick={() => toggleFilter('session')}
      >
        {$_('timeline.filter.sessions')}
      </Tag>
      <Tag
        tone={activeFilters.has('beatCompleted') ? 'success' : 'default'}
        onclick={() => toggleFilter('beatCompleted')}
      >
        {$_('timeline.filter.beats')}
      </Tag>
      <Tag
        tone={activeFilters.has('clockChanged') ? 'clock' : 'default'}
        onclick={() => toggleFilter('clockChanged')}
      >
        {$_('timeline.filter.clocks')}
      </Tag>
      <Tag
        tone={activeFilters.has('death') ? 'danger' : 'default'}
        onclick={() => toggleFilter('death')}
      >
        {$_('timeline.filter.deaths')}
      </Tag>
    </div>

    {#if adventures.length > 0}
      <div class="flex gap-2 overflow-x-auto pb-1" data-testid="timeline-adventure-filters">
        <Tag tone={adventureFilter === null ? 'accent' : 'default'} onclick={() => (adventureFilter = null)}>
          {$_('timeline.adventureFilterAll')}
        </Tag>
        {#each adventures as adventure (adventure.id)}
          <Tag tone={adventureFilter === adventure.id ? 'accent' : 'default'} onclick={() => (adventureFilter = adventure.id)}>
            {adventure.title}
          </Tag>
        {/each}
        <Tag tone={adventureFilter === UNASSIGNED ? 'accent' : 'default'} onclick={() => (adventureFilter = UNASSIGNED)}>
          {$_('timeline.adventureFilterUnassigned')}
        </Tag>
      </div>
    {/if}

    {#if groups.length === 0}
      <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('timeline.empty')}</p>
    {:else}
      <div class="flex flex-col gap-[var(--sp-5)]">
        {#each groups as group (group.key)}
          <section class="flex flex-col">
            <div class="ww-label pb-2 mb-1 border-b border-[var(--border)]">{formatDay(group.date)}</div>
            <div class="flex flex-col">
              {#each group.entries as entry (entry.id)}
                <div
                  class="flex items-center gap-3 py-2.5 px-2.5 md:px-3 rounded-[var(--radius-md)] hover:bg-[var(--surface-raised)] flex-wrap"
                >
                  {#if entry.type === 'session'}
                    <span class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--accent-tint)] text-[var(--accent)]">
                      <Icon icon={ScrollText} />
                    </span>
                    <span class="flex-1 min-w-0 truncate text-[length:var(--text-body)]">
                      {$_('timeline.session', { values: { number: entry.number, title: entry.title } })}
                    </span>
                  {:else if entry.type === 'beatCompleted'}
                    <span class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--success-tint)] text-[var(--success)]">
                      <Icon icon={CheckCircle2} />
                    </span>
                    <span class="flex-1 min-w-0 truncate text-[length:var(--text-body)]">
                      {$_('timeline.beatCompleted', { values: { title: entry.title } })}
                    </span>
                    {#if hexNameFor(entry.hexNodeId) || factionNamesFor(entry.factionIds).length > 0}
                      <div class="flex gap-1 flex-wrap shrink-0">
                        {#if hexNameFor(entry.hexNodeId)}
                          <Tag size="sm">{hexNameFor(entry.hexNodeId)}</Tag>
                        {/if}
                        {#each factionNamesFor(entry.factionIds) as name (name)}
                          <Tag size="sm" tone="accent">{name}</Tag>
                        {/each}
                      </div>
                    {/if}
                  {:else if entry.type === 'clockChanged'}
                    <span class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--clock-tint)] text-[var(--clock)]">
                      <Icon icon={Swords} />
                    </span>
                    <span class="flex-1 min-w-0 truncate text-[length:var(--text-body)]">
                      {$_('timeline.clockChanged', { values: { name: entry.factionName, from: entry.from, to: entry.to } })}
                    </span>
                    <StatusPill tone="clock" dot={false} size="sm">{entry.to}/{entry.max}</StatusPill>
                  {:else}
                    <span class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--danger-tint)] text-[var(--danger)]">
                      <Icon icon={Skull} />
                    </span>
                    <span class="flex-1 min-w-0 truncate text-[length:var(--text-body)]">
                      {entry.cause
                        ? $_('timeline.diedWithCause', { values: { name: entry.name, cause: entry.cause } })
                        : $_('timeline.died', { values: { name: entry.name } })}
                    </span>
                  {/if}
                  <span class="hidden md:inline text-[length:var(--text-caption)] text-[var(--text-muted)] shrink-0 ml-auto">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </main>
</div>
