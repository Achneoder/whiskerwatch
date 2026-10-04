<script lang="ts">
  import { PawPrint } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Button from '../ui/Button.svelte';
  import Modal from '../ui/Modal.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Tag from '../ui/Tag.svelte';
  import Icon from '../ui/Icon.svelte';
  import HexNodeForm from '../forms/HexNodeForm.svelte';
  import HexCanvas from './HexCanvas.svelte';
  import {
    getHexNodes,
    getHexNodeAt,
    addHexNode,
    updateHexNode,
    removeHexNode,
    terrainFill,
    TERRAINS,
    flush as flushHexNodes,
    type HexNode,
  } from '../../lib/stores/hexmap.svelte';
  import { getBeats } from '../../lib/stores/beats.svelte';
  import { getBestiary } from '../../lib/stores/bestiary.svelte';
  import { getFactions, dispositionTagTone } from '../../lib/stores/factions.svelte';
  import { getAdventures, updateAdventure } from '../../lib/stores/adventures.svelte';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    onselectresult?: (result: SearchResult) => void;
    /** Set by `App.svelte` when quick-find selects a hex node on this screen — selects and opens that hex's detail modal, then `onconsumedfocus` clears it. */
    focusId?: string | undefined;
    onconsumedfocus?: () => void;
  }

  let { onnavigate, onstartsession, onselectresult, focusId, onconsumedfocus }: Props = $props();

  const hexes = getHexNodes();
  const beats = getBeats();
  const bestiary = getBestiary();
  const factions = getFactions();
  const adventures = getAdventures();

  // The "Party is here" prep-mode placement action only makes sense when
  // there's exactly one adventure to place — with 2+ active adventures it's
  // ambiguous which one's position this would set, and this screen doesn't
  // want to invent a second adventure-picker UI (mirrors the "ambiguous with
  // 2+" threshold `LiveSession.svelte`'s `needsPicker` already established).
  const singleActiveAdventure = $derived.by(() => {
    const active = adventures.filter((a) => a.status === 'active');
    return active.length === 1 ? active[0]! : null;
  });

  const currentHexCoord = $derived.by((): { q: number; r: number } | null => {
    const hexId = singleActiveAdventure?.currentHexId;
    if (!hexId) return null;
    const hex = hexes.find((h) => h.id === hexId);
    return hex ? { q: hex.q, r: hex.r } : null;
  });

  function bestiaryName(bestiaryId: string): string {
    return bestiary.find((b) => b.id === bestiaryId)?.name ?? '—';
  }

  function factionFor(factionId: string) {
    return factions.find((f) => f.id === factionId);
  }

  function beatsFor(hexNodeId: string) {
    return beats.filter((b) => b.hexNodeId === hexNodeId);
  }

  let selected = $state<{ q: number; r: number } | null>(null);
  let hexModal = $state<{ mode: 'add'; q: number; r: number } | { mode: 'edit'; node: HexNode } | null>(null);
  let deleteTarget = $state<HexNode | null>(null);

  function selectHex(q: number, r: number) {
    selected = { q, r };
    const node = getHexNodeAt(q, r);
    hexModal = node ? { mode: 'edit', node } : { mode: 'add', q, r };
  }

  // Quick-find hand-off — see the equivalent note in Roster.svelte. Reuses
  // `selectHex` so search lands on exactly the same selected/open state a
  // manual tap on the hex would produce. A `focusId` matching no hex node
  // (deleted in another tab) is a quiet no-op.
  $effect(() => {
    if (!focusId) return;
    const node = hexes.find((h) => h.id === focusId);
    if (node) selectHex(node.q, node.r);
    onconsumedfocus?.();
  });

  // Awaits `flush()` after the mutation so a GM who refreshes right after
  // saving/clearing a hex never loses the change — see the equivalent note
  // in Roster.svelte.
  async function saveHex(data: Omit<HexNode, 'id' | 'q' | 'r'>) {
    if (hexModal?.mode === 'edit') {
      updateHexNode(hexModal.node.id, data);
    } else if (hexModal?.mode === 'add') {
      addHexNode({ ...data, q: hexModal.q, r: hexModal.r });
    }
    await flushHexNodes();
    hexModal = null;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    removeHexNode(deleteTarget.id);
    await flushHexNodes();
    deleteTarget = null;
    selected = null;
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="hexMap" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-end justify-between gap-[var(--sp-4)] flex-wrap">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('hexMap.eyebrow')}</div>
        <h1 class="text-[length:var(--text-h1)] mt-1">{$_('hexMap.title')}</h1>
      </div>
    </header>

    <div class="flex flex-wrap gap-x-[var(--sp-4)] gap-y-1.5 text-[length:var(--text-caption)] text-[var(--text-muted)]">
      {#each TERRAINS as terrain (terrain)}
        <span class="inline-flex items-center gap-1.5">
          <span
            class="inline-block w-3.5 h-3.5 rounded-[3px] border border-[var(--border)]"
            style:background={terrainFill[terrain]}
          ></span>
          {$_(`hexMap.terrain.${terrain}`)}
        </span>
      {/each}
    </div>

    {#if hexes.length === 0}
      <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('hexMap.empty')}</p>
    {/if}

    <HexCanvas {hexes} {selected} {factions} currentHex={currentHexCoord} onselect={selectHex} />
  </main>
</div>

<Modal
  open={hexModal !== null}
  title={hexModal?.mode === 'edit' ? $_('hexMap.editTitle') : $_('hexMap.addTitle')}
  onclose={() => (hexModal = null)}
>
  {#if hexModal}
    {#if hexModal.mode === 'edit'}
      {@const node = hexModal.node}
      <div class="flex justify-end mb-[var(--sp-2)]">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
            deleteTarget = node;
            hexModal = null;
          }}
        >
          {$_('hexMap.clear')}
        </Button>
      </div>
      {#if singleActiveAdventure}
        <div
          class="flex items-center justify-between gap-2 mb-[var(--sp-4)] min-h-[var(--tap)]"
          data-testid="party-is-here-row"
        >
          <span class="flex items-center gap-2">
            <Icon icon={PawPrint} />
            <span class="ww-label">{$_('hexMap.partyIsHere')}</span>
          </span>
          {#if singleActiveAdventure.currentHexId === node.id}
            <div class="flex items-center gap-2">
              <Tag tone="accent" size="sm">{$_('hexMap.hereNow')}</Tag>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => updateAdventure(singleActiveAdventure!.id, { currentHexId: null })}
              >
                {$_('hexMap.clearHere')}
              </Button>
            </div>
          {:else}
            <Button
              variant="ghost"
              size="sm"
              onclick={() => updateAdventure(singleActiveAdventure!.id, { currentHexId: node.id })}
            >
              {$_('hexMap.setHere')}
            </Button>
          {/if}
        </div>
      {/if}
      {#if node.controlledBy || node.contestedBy.length > 0}
        <div class="flex flex-col gap-[var(--sp-2)] mb-[var(--sp-4)]">
          {#if node.controlledBy && factionFor(node.controlledBy)}
            {@const controller = factionFor(node.controlledBy)!}
            <div class="flex flex-col gap-1.5">
              <span class="ww-label">{$_('hexMap.controlledBy')}</span>
              <Tag size="sm" tone={dispositionTagTone[controller.disposition]}>{controller.name}</Tag>
            </div>
          {/if}
          {#if node.contestedBy.length > 0}
            <div class="flex flex-col gap-1.5">
              <span class="ww-label">{$_('hexMap.contestedBy')}</span>
              <div class="flex gap-1.5 flex-wrap">
                {#each node.contestedBy as factionId (factionId)}
                  {@const faction = factionFor(factionId)}
                  {#if faction}
                    <Tag size="sm" tone={dispositionTagTone[faction.disposition]}>{faction.name}</Tag>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
      {#if node.encounters.length > 0}
        <div class="flex flex-col gap-1.5 mb-[var(--sp-4)]">
          <span class="ww-label">{$_('hexMap.encountersHere')}</span>
          <div class="flex gap-1.5 flex-wrap">
            {#each node.encounters as encounter (encounter.bestiaryId)}
              <Tag size="sm">{bestiaryName(encounter.bestiaryId)} ×{encounter.weight}</Tag>
            {/each}
          </div>
        </div>
      {/if}
      {#if beatsFor(node.id).length > 0}
        <div class="flex flex-col gap-1.5 mb-[var(--sp-4)]">
          <span class="ww-label">{$_('hexMap.beatsTouching')}</span>
          <div class="flex gap-1.5 flex-wrap">
            {#each beatsFor(node.id) as beat (beat.id)}
              <Tag size="sm">{beat.title}</Tag>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    <HexNodeForm
      initial={hexModal.mode === 'edit' ? hexModal.node : undefined}
      bestiary={getBestiary()}
      {factions}
      onsave={saveHex}
      oncancel={() => (hexModal = null)}
    />
  {/if}
</Modal>

<ConfirmDialog
  open={deleteTarget !== null}
  title={$_('hexMap.deleteTitle')}
  message={$_('hexMap.deleteMessage', { values: { name: deleteTarget?.name || deleteTarget?.terrain || '' } })}
  confirmLabel={$_('hexMap.clear')}
  cancelLabel={$_('roster.form.cancel')}
  danger
  onconfirm={confirmDelete}
  oncancel={() => (deleteTarget = null)}
/>
