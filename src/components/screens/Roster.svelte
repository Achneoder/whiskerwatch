<script lang="ts">
  import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import HpBar from '../ui/HpBar.svelte';
  import StatusPill from '../ui/StatusPill.svelte';
  import Tag from '../ui/Tag.svelte';
  import Modal from '../ui/Modal.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Icon from '../ui/Icon.svelte';
  import ScarRow from '../ui/ScarRow.svelte';
  import PartyForm from '../forms/PartyForm.svelte';
  import HirelingForm from '../forms/HirelingForm.svelte';
  import ScarForm from '../forms/ScarForm.svelte';
  import {
    getParty,
    addMember,
    updateMember,
    removeMember,
    addScar,
    flush as flushParty,
    type PartyMember,
  } from '../../lib/stores/party.svelte';
  import {
    getHirelings,
    addHireling,
    updateHireling,
    removeHireling,
    addHirelingScar,
    flush as flushHirelings,
    type Hireling,
  } from '../../lib/stores/hirelings.svelte';
  import { CONDITIONS, type Scar } from '../../lib/conditions';
  import { exportCampaign, importCampaign } from '../../lib/campaignExport';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    onselectresult?: (result: SearchResult) => void;
    /** Set by `App.svelte` when quick-find selects a party member or hireling on this screen — opens the matching edit modal, then `onconsumedfocus` clears it. */
    focusId?: string | undefined;
    onconsumedfocus?: () => void;
  }

  let { onnavigate, onstartsession, onselectresult, focusId, onconsumedfocus }: Props = $props();

  const party = getParty();
  const hirelings = getHirelings();

  const activeParty = $derived(party.filter((m) => m.status === 'active'));
  const fallenParty = $derived(party.filter((m) => m.status === 'deceased'));
  const activeHirelings = $derived(hirelings.filter((h) => h.status === 'active'));
  const fallenHirelings = $derived(hirelings.filter((h) => h.status === 'deceased'));

  // Retainer limit (Mausritter core): each mouse's WIL score is how many
  // hirelings it can individually command, but this is tracked as a single
  // collective capacity across the whole party rather than assigning specific
  // hirelings to specific mice — there's no UI for that assignment, just a
  // live "are we over capacity" fact that recomputes as the roster changes.
  const partyWilCapacity = $derived(activeParty.reduce((sum, m) => sum + m.wil, 0));
  const overHirelingLimit = $derived(activeHirelings.length > partyWilCapacity);

  let memberModal = $state<{ mode: 'add' } | { mode: 'edit'; member: PartyMember } | null>(null);
  let hirelingModal = $state<{ mode: 'add' } | { mode: 'edit'; hireling: Hireling } | null>(null);
  let deleteMemberTarget = $state<PartyMember | null>(null);
  let deleteHirelingTarget = $state<Hireling | null>(null);
  let importError = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | undefined>(undefined);

  // Scar-adding is a fully separate, manual flow from editing — see the
  // roadmap's Scars & death ledger ruling. Keyed on source so the same
  // handler/modal serve both the Warband and Hirelings cards.
  let scarTarget = $state<{ source: 'party'; member: PartyMember } | { source: 'hireling'; hireling: Hireling } | null>(
    null,
  );

  // Quick-find hand-off: opens the matching party member's or hireling's
  // edit modal once, then tells `App.svelte` the focus request has been
  // used. A `focusId` that matches neither list (deleted in another tab
  // between typing and tapping) is a quiet no-op — see App.svelte's
  // `selectSearchResult` doc comment for the "dangling id degrades
  // gracefully" rule this follows.
  $effect(() => {
    if (!focusId) return;
    const member = party.find((m) => m.id === focusId);
    const hireling = hirelings.find((h) => h.id === focusId);
    if (member) memberModal = { mode: 'edit', member };
    else if (hireling) hirelingModal = { mode: 'edit', hireling };
    onconsumedfocus?.();
  });

  // Each handler below awaits its store's `flush()` right after the mutation:
  // the mutation itself is already applied synchronously (optimistic
  // in-memory update, per `persistedList.svelte.ts`), so this doesn't delay
  // what the GM sees — it just means the modal/dialog doesn't close (and the
  // "done" state doesn't set in) until the write is durably saved to
  // IndexedDB, so a GM who immediately refreshes right after saving never
  // loses the edit (see CLAUDE.md's "loses no data on refresh").
  async function saveScar(scar: Scar) {
    if (!scarTarget) return;
    if (scarTarget.source === 'party') {
      addScar(scarTarget.member.id, scar);
      await flushParty();
    } else {
      addHirelingScar(scarTarget.hireling.id, scar);
      await flushHirelings();
    }
    scarTarget = null;
  }

  async function saveMember(data: Omit<PartyMember, 'id'>) {
    if (memberModal?.mode === 'edit') updateMember(memberModal.member.id, data);
    else addMember(data);
    await flushParty();
    memberModal = null;
  }

  async function saveHireling(data: Omit<Hireling, 'id'>) {
    if (hirelingModal?.mode === 'edit') updateHireling(hirelingModal.hireling.id, data);
    else addHireling(data);
    await flushHirelings();
    hirelingModal = null;
  }

  async function confirmDeleteMember() {
    if (!deleteMemberTarget) return;
    removeMember(deleteMemberTarget.id);
    await flushParty();
    deleteMemberTarget = null;
  }

  async function confirmDeleteHireling() {
    if (!deleteHirelingTarget) return;
    removeHireling(deleteHirelingTarget.id);
    await flushHirelings();
    deleteHirelingTarget = null;
  }

  function triggerImport() {
    importError = null;
    fileInput?.click();
  }

  async function handleImportFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await importCampaign(file);
      importError = null;
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error);
    }
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="warband" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-end justify-between gap-[var(--sp-4)] flex-wrap">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('roster.eyebrow')}</div>
        <h1 class="text-[length:var(--text-h1)] mt-1">{$_('roster.title')}</h1>
      </div>
      <div class="flex gap-[var(--gap-inline)]">
        <Button variant="secondary" size="sm" onclick={exportCampaign}>
          {#snippet icon()}
            <Icon icon={Download} />
          {/snippet}
          {$_('roster.export')}
        </Button>
        <Button variant="secondary" size="sm" onclick={triggerImport}>
          {#snippet icon()}
            <Icon icon={Upload} />
          {/snippet}
          {$_('roster.import')}
        </Button>
        <input bind:this={fileInput} type="file" accept="application/json" class="hidden" onchange={handleImportFile} />
      </div>
    </header>

    {#if importError}
      <div
        class="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-tint)] text-[var(--danger-hover)] px-[var(--sp-4)] py-[var(--sp-3)] text-[length:var(--text-body)]"
      >
        {importError}
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-[var(--sp-5)] items-start">
      <!-- Warband -->
      <Card eyebrow={$_('roster.warband.eyebrow')} title={$_('roster.warband.title')}>
        {#snippet actions()}
          <Button variant="secondary" size="sm" onclick={() => (memberModal = { mode: 'add' })}>
            {#snippet icon()}
              <Icon icon={Plus} />
            {/snippet}
            {$_('roster.warband.add')}
          </Button>
        {/snippet}
        <div class="flex flex-col gap-[var(--sp-3)]">
          {#each activeParty as member (member.id)}
            <!-- data-testid: same minimal Playwright concession as LiveSessionCard — a stable hook to scope "delete Pip's row, not Wren's" without fragile DOM traversal. -->
            <div
              data-testid={`party-row-${member.name}`}
              class="flex flex-wrap items-center gap-x-[var(--sp-4)] gap-y-2 py-2 border-b border-[var(--border)]"
            >
              <div class="min-w-23 flex flex-col gap-1">
                <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
                  {member.name}
                </div>
                <div class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{member.role}</div>
                <ScarRow name={member.name} scars={member.scars} onaddscar={() => (scarTarget = { source: 'party', member })} />
              </div>
              <div class="flex-1 min-w-35"><HpBar value={member.hp} max={member.max} label={$_('roster.form.hp')} size="sm" /></div>
              <div class="flex gap-1.5 shrink-0">
                {#each member.conditions as cond (cond)}
                  <StatusPill tone={CONDITIONS[cond].tone} size="sm">{CONDITIONS[cond].label}</StatusPill>
                {/each}
              </div>
              <div class="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={$_('roster.edit')}
                  onclick={() => (memberModal = { mode: 'edit', member })}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer"
                >
                  <Icon icon={Pencil} />
                </button>
                <button
                  type="button"
                  aria-label={$_('roster.delete')}
                  onclick={() => (deleteMemberTarget = member)}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
                >
                  <Icon icon={Trash2} />
                </button>
              </div>
            </div>
          {/each}
          {#if activeParty.length === 0}
            <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('roster.warband.empty')}</p>
          {/if}
          {#if fallenParty.length > 0}
            <details>
              <summary class="ww-label cursor-pointer py-1">
                {$_('roster.fallen', { values: { count: fallenParty.length } })}
              </summary>
              <div class="flex flex-col gap-[var(--sp-3)] mt-2">
                {#each fallenParty as member (member.id)}
                  <div class="flex flex-wrap items-center gap-x-[var(--sp-4)] gap-y-2 py-2 border-b border-[var(--border)]">
                    <div class="min-w-23 flex flex-col gap-1">
                      <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
                        {member.name}
                      </div>
                      <div class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{member.role}</div>
                      <ScarRow
                        name={member.name}
                        scars={member.scars}
                        onaddscar={() => (scarTarget = { source: 'party', member })}
                      />
                    </div>
                    <div class="flex-1 min-w-35">
                      <StatusPill tone="danger" dot={false} size="sm">{$_('roster.deceased')}</StatusPill>
                    </div>
                    <div class="flex gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={$_('roster.delete')}
                        onclick={() => (deleteMemberTarget = member)}
                        class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
                      >
                        <Icon icon={Trash2} />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        </div>
      </Card>

      <!-- Hirelings -->
      <Card eyebrow={$_('roster.hirelings.eyebrow')} title={$_('roster.hirelings.title')}>
        {#snippet actions()}
          <Button variant="secondary" size="sm" onclick={() => (hirelingModal = { mode: 'add' })}>
            {#snippet icon()}
              <Icon icon={Plus} />
            {/snippet}
            {$_('roster.hirelings.add')}
          </Button>
        {/snippet}
        <div class="flex flex-col gap-[var(--sp-3)]">
          {#if overHirelingLimit}
            <div
              class="rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-tint)] text-[var(--warning-hover)] px-[var(--sp-4)] py-[var(--sp-3)] text-[length:var(--text-body)]"
            >
              {$_('roster.hirelings.hirelingLimitWarning')}
            </div>
          {/if}
          {#each activeHirelings as hireling (hireling.id)}
            <div class="flex flex-wrap items-center gap-x-[var(--sp-4)] gap-y-2 py-2 border-b border-[var(--border)]">
              <div class="min-w-23 flex flex-col gap-1">
                <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
                  {hireling.name}
                </div>
                <div class="flex items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--text-muted)]">
                  <span>{hireling.role}</span>
                  {#if hireling.wage > 0}
                    <Tag size="sm">{hireling.wage}p/day</Tag>
                  {/if}
                </div>
                <ScarRow
                  name={hireling.name}
                  scars={hireling.scars}
                  onaddscar={() => (scarTarget = { source: 'hireling', hireling })}
                />
              </div>
              <div class="flex-1 min-w-35"><HpBar value={hireling.hp} max={hireling.max} label={$_('roster.form.hp')} size="sm" /></div>
              <div class="shrink-0">
                <StatusPill tone="accent" size="sm" count={hireling.loyalty}>{$_('roster.form.loyalty')}</StatusPill>
              </div>
              <div class="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={$_('roster.edit')}
                  onclick={() => (hirelingModal = { mode: 'edit', hireling })}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer"
                >
                  <Icon icon={Pencil} />
                </button>
                <button
                  type="button"
                  aria-label={$_('roster.delete')}
                  onclick={() => (deleteHirelingTarget = hireling)}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
                >
                  <Icon icon={Trash2} />
                </button>
              </div>
            </div>
          {/each}
          {#if activeHirelings.length === 0}
            <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('roster.hirelings.empty')}</p>
          {/if}
          {#if fallenHirelings.length > 0}
            <details>
              <summary class="ww-label cursor-pointer py-1">
                {$_('roster.fallen', { values: { count: fallenHirelings.length } })}
              </summary>
              <div class="flex flex-col gap-[var(--sp-3)] mt-2">
                {#each fallenHirelings as hireling (hireling.id)}
                  <div class="flex flex-wrap items-center gap-x-[var(--sp-4)] gap-y-2 py-2 border-b border-[var(--border)]">
                    <div class="min-w-23 flex flex-col gap-1">
                      <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
                        {hireling.name}
                      </div>
                      <div class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{hireling.role}</div>
                      <ScarRow
                        name={hireling.name}
                        scars={hireling.scars}
                        onaddscar={() => (scarTarget = { source: 'hireling', hireling })}
                      />
                    </div>
                    <div class="flex-1 min-w-35">
                      <StatusPill tone="danger" dot={false} size="sm">{$_('roster.deceased')}</StatusPill>
                    </div>
                    <div class="flex gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={$_('roster.delete')}
                        onclick={() => (deleteHirelingTarget = hireling)}
                        class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
                      >
                        <Icon icon={Trash2} />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        </div>
      </Card>
    </div>
  </main>
</div>

<Modal
  open={memberModal !== null}
  title={memberModal?.mode === 'edit' ? $_('roster.warband.editTitle') : $_('roster.warband.addTitle')}
  onclose={() => (memberModal = null)}
>
  {#if memberModal}
    <PartyForm
      initial={memberModal.mode === 'edit' ? memberModal.member : undefined}
      onsave={saveMember}
      oncancel={() => (memberModal = null)}
    />
  {/if}
</Modal>

<Modal
  open={hirelingModal !== null}
  title={hirelingModal?.mode === 'edit' ? $_('roster.hirelings.editTitle') : $_('roster.hirelings.addTitle')}
  onclose={() => (hirelingModal = null)}
>
  {#if hirelingModal}
    <HirelingForm
      initial={hirelingModal.mode === 'edit' ? hirelingModal.hireling : undefined}
      onsave={saveHireling}
      oncancel={() => (hirelingModal = null)}
    />
  {/if}
</Modal>

<ConfirmDialog
  open={deleteMemberTarget !== null}
  title={$_('roster.warband.deleteTitle')}
  message={$_('roster.warband.deleteMessage', { values: { name: deleteMemberTarget?.name ?? '' } })}
  confirmLabel={$_('roster.delete')}
  cancelLabel={$_('roster.form.cancel')}
  danger
  onconfirm={confirmDeleteMember}
  oncancel={() => (deleteMemberTarget = null)}
/>

<ConfirmDialog
  open={deleteHirelingTarget !== null}
  title={$_('roster.hirelings.deleteTitle')}
  message={$_('roster.hirelings.deleteMessage', { values: { name: deleteHirelingTarget?.name ?? '' } })}
  confirmLabel={$_('roster.delete')}
  cancelLabel={$_('roster.form.cancel')}
  danger
  onconfirm={confirmDeleteHireling}
  oncancel={() => (deleteHirelingTarget = null)}
/>

<Modal
  open={scarTarget !== null}
  eyebrow={scarTarget ? (scarTarget.source === 'party' ? scarTarget.member.name : scarTarget.hireling.name) : undefined}
  title={$_('roster.scars.addTitle')}
  onclose={() => (scarTarget = null)}
>
  {#if scarTarget}
    <ScarForm onsave={saveScar} oncancel={() => (scarTarget = null)} />
  {/if}
</Modal>
