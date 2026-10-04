<script lang="ts">
  import { PawPrint } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Card from '../ui/Card.svelte';
  import Button from '../ui/Button.svelte';
  import Tag from '../ui/Tag.svelte';
  import Icon from '../ui/Icon.svelte';
  import DiceRoll from '../ui/DiceRoll.svelte';
  import { isEncounterCheckWatch, type Watch } from '../../lib/watchTime';
  import type { HexTerrain } from '../../lib/stores/hexmap.svelte';

  export interface WatchNeighborOption {
    q: number;
    r: number;
    label: string; // hexLabel(q, r) — a GM can say this out loud
    terrain: HexTerrain | null; // null ⇒ no HexNode record exists there yet
    cost: 1 | 2 | null; // null when terrain is null (nothing to move to) or 'water' (no valid move)
    /** The destination hex's id, present whenever `terrain` is non-null.
     * Not part of the original design sketch's `NeighborOption` shape, but
     * `onmove(hexId)`'s signature needs it to resolve a chip tap to a hex. */
    id?: string;
  }

  export interface WatchRecipient {
    id: string;
    name: string;
    kind: 'party' | 'hireling';
  }

  interface HexRef {
    id: string;
    name: string;
    terrain: HexTerrain;
  }

  interface Notice {
    text: string;
    undo?: (() => void) | undefined;
  }

  interface Props {
    day: number;
    watch: Watch;
    restedThisDay: boolean;
    currentHex: HexRef | null;
    neighbors: WatchNeighborOption[];
    /** Suggested starting hex when currentHex is null — the active beat's linked hex, if it has one. */
    suggestedStartHex: HexRef | null;
    /** Set once an encounter-check watch has just resolved, so the card can
     * show the roll for a beat before the next tap overwrites it. Null the
     * rest of the time. */
    lastCheckResult: { roll: number; hit: boolean } | null;
    /** crossedIntoNewDay && !restedThisDay from the watch just completed. */
    exhaustedPending: boolean;
    /** Every active party member/hireling — the forage recipient row's picker list. */
    recipients: WatchRecipient[];
    /** Set immediately after a Forage tap; cleared by the next chip tap. */
    forageResult: { rations: number } | null;
    /** True only right after the first 2-watch difficult-terrain move this
     * session — teaches the GM the "one check per tap" rule once, not every time. */
    showTwoWatchNote: boolean;
    /** The last "rations added to X's bag" confirmation — mirrors every
     * other Live Session surface's inline notice-with-undo footer. Foraging
     * has no undo (adding rations isn't the kind of mistake worth reversing
     * the way damage/heal/item-move are), so `undo` is always absent here. */
    notice?: Notice | null;
    onstay: () => void;
    onforage: () => void;
    onmove: (hexId: string) => void;
    onsetstart: (hexId: string) => void;
    onaddforagerecipient: (recipientId: string) => void;
    onapplyexhausted: () => void;
    ondismissexhausted: () => void;
    ondismissnotice?: () => void;
    onnavigate: () => void;
  }

  let {
    day,
    watch,
    restedThisDay,
    currentHex,
    neighbors,
    suggestedStartHex,
    lastCheckResult,
    exhaustedPending,
    recipients,
    forageResult,
    showTwoWatchNote,
    notice = null,
    onstay,
    onforage,
    onmove,
    onsetstart,
    onaddforagerecipient,
    onapplyexhausted,
    ondismissexhausted,
    ondismissnotice,
    onnavigate,
  }: Props = $props();

  const watchLabelKeys = ['morning', 'midday', 'evening', 'night'] as const;
  const watchLabel = $derived($_(`liveSession.watch.labels.${watchLabelKeys[watch - 1]}`));
  const isCheckWatch = $derived(isEncounterCheckWatch(watch));

  function terrainLabel(terrain: HexTerrain): string {
    return $_(`hexMap.terrain.${terrain}`);
  }

  function neighborLabel(n: WatchNeighborOption): string {
    if (!n.terrain) return '—';
    return n.cost === 2 ? `${n.label}·${terrainLabel(n.terrain)} ×2` : `${n.label}·${terrainLabel(n.terrain)}`;
  }

  function neighborAria(n: WatchNeighborOption): string {
    if (!n.terrain) return $_('liveSession.watch.notMapped', { values: { label: n.label } });
    if (n.terrain === 'water') return $_('liveSession.watch.noWaterPath', { values: { label: n.label } });
    return n.cost === 2
      ? $_('liveSession.watch.moveCostAria', { values: { label: n.label, terrain: terrainLabel(n.terrain) } })
      : `${n.label}·${terrainLabel(n.terrain)}`;
  }
  function undoNotice() {
    notice?.undo?.();
    ondismissnotice?.();
  }
</script>

{#snippet noticeFooter()}
  {#if notice}
    <div class="flex items-center justify-between gap-2">
      <span class="text-[length:var(--text-sm)] text-[var(--text-secondary)]">{notice.text}</span>
      {#if notice.undo}
        <button
          type="button"
          onclick={undoNotice}
          class="font-bold text-[var(--accent)] text-[length:var(--text-sm)] cursor-pointer bg-none border-none"
        >
          {$_('liveSession.undo')}
        </button>
      {/if}
    </div>
  {/if}
{/snippet}

<Card eyebrow={$_('liveSession.watch.eyebrow')} eyebrowHelp={$_('help.watch')} footer={notice ? noticeFooter : undefined}>
  <div class="flex flex-col gap-[var(--sp-3)]">
    <div class="flex items-center gap-2 flex-wrap">
      <span class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
        {$_('liveSession.watch.dayWatch', { values: { day, watch, label: watchLabel } })}
      </span>
      {#if isCheckWatch}
        <Tag tone="warning">{$_('liveSession.watch.checkTag')}</Tag>
      {/if}
      {#if currentHex && restedThisDay}
        <Tag tone="success" size="sm">{$_('liveSession.watch.restedToday')}</Tag>
      {/if}
    </div>

    {#if !currentHex}
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)]">{$_('liveSession.watch.onboardingPrompt')}</p>
      {#if suggestedStartHex}
        <Button variant="secondary" size="live" onclick={() => onsetstart(suggestedStartHex!.id)}>
          {$_('liveSession.watch.startAt', { values: { name: suggestedStartHex.name } })}
        </Button>
      {:else}
        <Button variant="ghost" size="live" onclick={onnavigate}>{$_('liveSession.watch.openHexMap')}</Button>
      {/if}
    {:else}
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] truncate">
        {$_('liveSession.watch.standingIn', { values: { name: currentHex.name, terrain: terrainLabel(currentHex.terrain) } })}
      </p>

      {#if lastCheckResult}
        <div class="flex flex-col items-center gap-2">
          <DiceRoll dice={[lastCheckResult.roll]} notation="d6" outcome={lastCheckResult.hit ? 'fail' : 'success'} size="live" />
          <span class="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            {lastCheckResult.hit ? $_('liveSession.watch.checkHit') : $_('liveSession.watch.checkClear')}
          </span>
        </div>
      {/if}

      {#if showTwoWatchNote}
        <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('liveSession.watch.twoWatchNote')}</p>
      {/if}

      {#if exhaustedPending}
        <div class="flex items-center justify-between gap-2 flex-wrap bg-[var(--warning-tint)] rounded-[var(--radius-md)] p-[var(--sp-3)]">
          <span class="text-[length:var(--text-sm)] text-[var(--text)]">{$_('liveSession.watch.exhaustedBanner')}</span>
          <div class="flex items-center gap-2">
            <Button variant="secondary" size="sm" onclick={onapplyexhausted}>{$_('liveSession.watch.applyExhausted')}</Button>
            <button
              type="button"
              onclick={ondismissexhausted}
              aria-label={$_('liveSession.watch.dismissExhausted')}
              class="shrink-0 w-[var(--tap)] h-[var(--tap)] min-w-[34px] min-h-[34px] grid place-items-center cursor-pointer bg-transparent border-none rounded-[var(--radius-md)] text-[var(--text-muted)] text-[22px] leading-none"
            >
              ×
            </button>
          </div>
        </div>
      {/if}

      <div class="ww-label">{$_('liveSession.watch.prompt')}</div>
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" size="live" onclick={onstay}>{$_('liveSession.watch.stay')}</Button>
        <Button variant="secondary" size="live" onclick={onforage}>{$_('liveSession.watch.forage')}</Button>
        {#each neighbors as n (n.label)}
          {#if n.terrain && n.cost !== null && n.id}
            <Button variant="secondary" size="live" onclick={() => onmove(n.id!)}>
              {neighborLabel(n)}
            </Button>
          {:else}
            <button
              type="button"
              disabled
              aria-label={neighborAria(n)}
              title={neighborAria(n)}
              class="min-h-[var(--tap)] min-w-[var(--tap)] gap-2.5 py-[var(--sp-4)] px-[var(--sp-6)] text-[length:var(--text-title)] inline-flex items-center justify-center rounded-[var(--radius-md)] font-[family-name:var(--font-display)] font-semibold bg-[var(--surface-raised)] text-[var(--text-faint)] border border-[var(--border)] opacity-45 cursor-not-allowed"
            >
              —
            </button>
          {/if}
        {/each}
      </div>

      {#if forageResult}
        <div class="flex flex-col gap-2">
          <DiceRoll dice={[forageResult.rations]} notation="d3" outcome="neutral" size="live" />
          <span class="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            {$_('liveSession.watch.rationsRolled', { values: { count: forageResult.rations } })}
          </span>
          <div class="ww-label">{$_('liveSession.watch.addTo')}</div>
          <div class="flex flex-col gap-2">
            {#each recipients as recipient (recipient.id)}
              <button
                type="button"
                onclick={() => onaddforagerecipient(recipient.id)}
                class="min-h-[var(--tap)] w-full flex items-center justify-between gap-2 px-[var(--sp-3)] py-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer"
              >
                <span class="flex items-center gap-2">
                  <Icon icon={PawPrint} />
                  <span class="font-bold text-[length:var(--text-body)]">{recipient.name}</span>
                  {#if recipient.kind === 'hireling'}
                    <Tag size="sm">{$_('liveSession.hirelingTag')}</Tag>
                  {/if}
                </span>
              </button>
            {/each}
            {#if recipients.length === 0}
              <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('inventory.noRecipients')}</p>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</Card>
