<script lang="ts">
  import { Plus, Pencil, Trash2 } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import Icon from '../ui/Icon.svelte';
  import StatBlock from '../ui/StatBlock.svelte';
  import Modal from '../ui/Modal.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import BestiaryForm from '../forms/BestiaryForm.svelte';
  import {
    getBestiary,
    addBestiaryEntry,
    updateBestiaryEntry,
    removeBestiaryEntry,
    flush as flushBestiary,
    type BestiaryEntry,
  } from '../../lib/stores/bestiary.svelte';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    onselectresult?: (result: SearchResult) => void;
    /** Set by `App.svelte` when quick-find selects a bestiary entry on this screen — opens its edit modal, then `onconsumedfocus` clears it. */
    focusId?: string | undefined;
    onconsumedfocus?: () => void;
  }

  let { onnavigate, onstartsession, onselectresult, focusId, onconsumedfocus }: Props = $props();

  const bestiary = getBestiary();

  let entryModal = $state<{ mode: 'add' } | { mode: 'edit'; entry: BestiaryEntry } | null>(null);
  let deleteTarget = $state<BestiaryEntry | null>(null);

  // Quick-find hand-off — see the equivalent note in Roster.svelte. A
  // `focusId` matching no entry is a quiet no-op.
  $effect(() => {
    if (!focusId) return;
    const entry = bestiary.find((e) => e.id === focusId);
    if (entry) entryModal = { mode: 'edit', entry };
    onconsumedfocus?.();
  });

  // Awaits `flush()` after the mutation so a GM who refreshes right after
  // saving/deleting never loses the change — see the equivalent note in
  // Roster.svelte.
  async function saveEntry(data: Omit<BestiaryEntry, 'id'>) {
    if (entryModal?.mode === 'edit') updateBestiaryEntry(entryModal.entry.id, data);
    else addBestiaryEntry(data);
    await flushBestiary();
    entryModal = null;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    removeBestiaryEntry(deleteTarget.id);
    await flushBestiary();
    deleteTarget = null;
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="bestiary" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-end justify-between gap-[var(--sp-4)] flex-wrap">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('bestiary.eyebrow')}</div>
        <h1 class="text-[length:var(--text-h1)] mt-1">{$_('bestiary.title')}</h1>
      </div>
      <Button variant="secondary" size="sm" onclick={() => (entryModal = { mode: 'add' })}>
        {#snippet icon()}
          <Icon icon={Plus} />
        {/snippet}
        {$_('bestiary.add')}
      </Button>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-[var(--sp-4)]">
      {#each bestiary as entry (entry.id)}
        <Card>
          {#snippet actions()}
            <div class="flex gap-1 shrink-0">
              <button
                type="button"
                aria-label={$_('roster.edit')}
                onclick={() => (entryModal = { mode: 'edit', entry })}
                class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer"
              >
                <Icon icon={Pencil} />
              </button>
              <button
                type="button"
                aria-label={$_('roster.delete')}
                onclick={() => (deleteTarget = entry)}
                class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
              >
                <Icon icon={Trash2} />
              </button>
            </div>
          {/snippet}
          <StatBlock {entry} />
        </Card>
      {/each}
      {#if bestiary.length === 0}
        <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('bestiary.empty')}</p>
      {/if}
    </div>
  </main>
</div>

<Modal
  open={entryModal !== null}
  title={entryModal?.mode === 'edit' ? $_('bestiary.editTitle') : $_('bestiary.addTitle')}
  onclose={() => (entryModal = null)}
>
  {#if entryModal}
    <BestiaryForm
      initial={entryModal.mode === 'edit' ? entryModal.entry : undefined}
      onsave={saveEntry}
      oncancel={() => (entryModal = null)}
    />
  {/if}
</Modal>

<ConfirmDialog
  open={deleteTarget !== null}
  title={$_('bestiary.deleteTitle')}
  message={$_('bestiary.deleteMessage', { values: { name: deleteTarget?.name ?? '' } })}
  confirmLabel={$_('roster.delete')}
  cancelLabel={$_('roster.form.cancel')}
  danger
  onconfirm={confirmDelete}
  oncancel={() => (deleteTarget = null)}
/>
