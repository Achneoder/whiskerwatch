<script lang="ts">
  import { Plus, Pencil, Trash2 } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import Tag from '../ui/Tag.svelte';
  import StatusPill from '../ui/StatusPill.svelte';
  import Icon from '../ui/Icon.svelte';
  import Modal from '../ui/Modal.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import FactionForm from '../forms/FactionForm.svelte';
  import FactionGraph from './FactionGraph.svelte';
  import {
    getFactions,
    addFaction,
    updateFaction,
    removeFaction,
    dispositionTagTone,
    flush as flushFactions,
    type Faction,
  } from '../../lib/stores/factions.svelte';
  import {
    getFactionEdges,
    addFactionEdge,
    removeFactionEdge,
    flush as flushFactionEdges,
    type FactionRelationType,
  } from '../../lib/stores/factionEdges.svelte';
  import { getBeats } from '../../lib/stores/beats.svelte';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    onselectresult?: (result: SearchResult) => void;
    /** Set by `App.svelte` when quick-find selects a faction on this screen — opens its edit modal, then `onconsumedfocus` clears it. */
    focusId?: string | undefined;
    onconsumedfocus?: () => void;
  }

  let { onnavigate, onstartsession, onselectresult, focusId, onconsumedfocus }: Props = $props();

  const factions = getFactions();
  const edges = getFactionEdges();
  const beats = getBeats();

  let factionModal = $state<{ mode: 'add' } | { mode: 'edit'; entry: Faction } | null>(null);
  let deleteTarget = $state<Faction | null>(null);
  let selectedId = $state<string | null>(null);

  // Quick-find hand-off — see the equivalent note in Roster.svelte. Also
  // selects the faction (same highlight the graph/card list already use for
  // a manually-clicked faction) so it's visually obvious which one search
  // landed on. A `focusId` matching no faction is a quiet no-op.
  $effect(() => {
    if (!focusId) return;
    const faction = factions.find((f) => f.id === focusId);
    if (faction) {
      factionModal = { mode: 'edit', entry: faction };
      selectedId = faction.id;
    }
    onconsumedfocus?.();
  });

  const relationTone: Record<FactionRelationType, 'success' | 'danger' | 'warning'> = {
    ally: 'success',
    enemy: 'danger',
    rival: 'warning',
  };

  function relationsFor(id: string) {
    return edges
      .filter((e) => e.sourceId === id || e.targetId === id)
      .map((e) => {
        const otherId = e.sourceId === id ? e.targetId : e.sourceId;
        return { id: e.id, type: e.type, name: factions.find((f) => f.id === otherId)?.name ?? '—' };
      });
  }

  function beatsFor(id: string) {
    return beats.filter((b) => b.factionIds.includes(id));
  }

  // Awaits `flush()` after the mutation so a GM who refreshes right after
  // saving/deleting never loses the change — see the equivalent note in
  // Roster.svelte. Deleting a faction also cascades into `factionEdges`
  // (see `removeFaction`), so that store's flush is awaited too.
  async function saveFaction(data: Omit<Faction, 'id'>) {
    if (factionModal?.mode === 'edit') updateFaction(factionModal.entry.id, data);
    else addFaction(data);
    await flushFactions();
    factionModal = null;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    removeFaction(deleteTarget.id);
    if (selectedId === deleteTarget.id) selectedId = null;
    await Promise.all([flushFactions(), flushFactionEdges()]);
    deleteTarget = null;
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="factions" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-end justify-between gap-[var(--sp-4)] flex-wrap">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('factions.eyebrow')}</div>
        <h1 class="text-[length:var(--text-h1)] mt-1">{$_('factions.title')}</h1>
      </div>
      <Button variant="secondary" size="sm" onclick={() => (factionModal = { mode: 'add' })}>
        {#snippet icon()}
          <Icon icon={Plus} />
        {/snippet}
        {$_('factions.add')}
      </Button>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,0.7fr)] gap-[var(--sp-5)] items-start">
      <div class="flex flex-col gap-[var(--sp-4)]">
        {#each factions as faction (faction.id)}
          <Card class={selectedId === faction.id ? 'ring-2 ring-[var(--accent)]' : ''}>
            {#snippet actions()}
              <div class="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={$_('roster.edit')}
                  onclick={() => (factionModal = { mode: 'edit', entry: faction })}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer"
                >
                  <Icon icon={Pencil} />
                </button>
                <button
                  type="button"
                  aria-label={$_('roster.delete')}
                  onclick={() => (deleteTarget = faction)}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
                >
                  <Icon icon={Trash2} />
                </button>
              </div>
            {/snippet}

            {#snippet footer()}
              <div class="flex items-center justify-between gap-[var(--sp-3)] flex-wrap">
                <StatusPill tone="clock" count={faction.clock} of={faction.of}>{$_('factions.clock')}</StatusPill>
                <div class="flex gap-1.5 flex-wrap">
                  {#each faction.tags as tag (tag)}
                    <Tag tone={dispositionTagTone[faction.disposition]}>{tag}</Tag>
                  {/each}
                </div>
              </div>
            {/snippet}

            <div class="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onclick={() => (selectedId = faction.id)}
                class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)] text-left cursor-pointer hover:text-[var(--accent)]"
              >
                {faction.name}
              </button>
              <Tag tone={dispositionTagTone[faction.disposition]}>{$_(`factions.disposition.${faction.disposition}`)}</Tag>
            </div>
            {#if faction.note}
              <p class="mt-1 text-[var(--text-secondary)] text-[length:var(--text-body)]">{faction.note}</p>
            {/if}
            {#if relationsFor(faction.id).length > 0}
              <div class="flex gap-1.5 flex-wrap mt-2">
                {#each relationsFor(faction.id) as rel (rel.id)}
                  <Tag tone={relationTone[rel.type]} size="sm">{$_(`factions.relation.${rel.type}`)} · {rel.name}</Tag>
                {/each}
              </div>
            {/if}
            {#if beatsFor(faction.id).length > 0}
              <div class="flex gap-1.5 flex-wrap mt-2">
                {#each beatsFor(faction.id) as beat (beat.id)}
                  <Tag size="sm">{$_('factions.beatTagPrefix')} · {beat.title}</Tag>
                {/each}
              </div>
            {/if}
          </Card>
        {/each}
        {#if factions.length === 0}
          <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('factions.empty')}</p>
        {/if}
      </div>

      <Card eyebrow={$_('factions.graph.heading')} class="lg:sticky lg:top-[var(--sp-6)]">
        <FactionGraph {factions} {edges} {selectedId} onselect={(f) => (selectedId = f.id)} />
      </Card>
    </div>
  </main>
</div>

<Modal
  open={factionModal !== null}
  title={factionModal?.mode === 'edit' ? $_('factions.editTitle') : $_('factions.addTitle')}
  onclose={() => (factionModal = null)}
>
  {#if factionModal}
    {@const modal = factionModal}
    <FactionForm
      initial={modal.mode === 'edit' ? modal.entry : undefined}
      otherFactions={modal.mode === 'edit' ? factions.filter((f) => f.id !== modal.entry.id) : []}
      {edges}
      beats={modal.mode === 'edit' ? beatsFor(modal.entry.id) : []}
      onaddedge={(edge) => addFactionEdge(edge)}
      onremoveedge={(id) => removeFactionEdge(id)}
      onsave={saveFaction}
      oncancel={() => (factionModal = null)}
    />
  {/if}
</Modal>

<ConfirmDialog
  open={deleteTarget !== null}
  title={$_('factions.deleteTitle')}
  message={$_('factions.deleteMessage', { values: { name: deleteTarget?.name ?? '' } })}
  confirmLabel={$_('roster.delete')}
  cancelLabel={$_('roster.form.cancel')}
  danger
  onconfirm={confirmDelete}
  oncancel={() => (deleteTarget = null)}
/>
