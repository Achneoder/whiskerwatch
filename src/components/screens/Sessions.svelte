<script lang="ts">
  import { Plus, Pencil, Trash2 } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import Tag from '../ui/Tag.svelte';
  import Icon from '../ui/Icon.svelte';
  import Modal from '../ui/Modal.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import SessionForm from '../forms/SessionForm.svelte';
  import {
    getSessions,
    addSession,
    updateSession,
    removeSession,
    getNextSessionNumber,
    flush as flushSessions,
    type Session,
  } from '../../lib/stores/sessions.svelte';
  import { getAdventures } from '../../lib/stores/adventures.svelte';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    /**
     * A recap draft handed off from Live Session's "End Session" flow —
     * when set, the add-session modal opens automatically, prefilled via
     * `SessionForm`'s `draft` prop. Consumed once: `App.svelte` clears its
     * own state after handing it off, but we also guard against reopening
     * on an unrelated re-render by tracking whether we've already opened it.
     */
    draftRecap?: Omit<Session, 'id'> | null;
    /** Tells the parent the recap draft has been handed to the modal, so it can clear its own state and not reopen this on a later visit to Sessions. */
    onconsumeddraft?: () => void;
    onselectresult?: (result: SearchResult) => void;
    /** Set by `App.svelte` when quick-find selects a session on this screen — opens its edit modal, then `onconsumedfocus` clears it. */
    focusId?: string | undefined;
    onconsumedfocus?: () => void;
  }

  let {
    onnavigate,
    onstartsession,
    draftRecap = null,
    onconsumeddraft,
    onselectresult,
    focusId,
    onconsumedfocus,
  }: Props = $props();

  const sessions = getSessions();
  const adventures = getAdventures();

  // Single-select filter chip: "All" (null), one chip per adventure, plus
  // "Unassigned" (the UNASSIGNED sentinel) for sessions with no adventureId
  // at all — including every session logged before this field existed, per
  // the roadmap's "no backfill needed" ruling. Only shown once at least one
  // adventure exists; with zero adventures there's nothing to filter by.
  const UNASSIGNED = '__unassigned__';
  let adventureFilter = $state<string | null>(null);

  const sorted = $derived(
    [...sessions]
      .filter((s) => {
        if (adventureFilter === null) return true;
        if (adventureFilter === UNASSIGNED) return !s.adventureId;
        return s.adventureId === adventureFilter;
      })
      .sort((a, b) => b.number - a.number),
  );

  function adventureTitleFor(id: string | null | undefined): string | null {
    if (!id) return null;
    return adventures.find((a) => a.id === id)?.title ?? null;
  }

  let sessionModal = $state<{ mode: 'add'; draft?: Omit<Session, 'id'> } | { mode: 'edit'; session: Session } | null>(
    draftRecap ? { mode: 'add', draft: draftRecap } : null,
  );
  let deleteTarget = $state<Session | null>(null);

  $effect(() => {
    if (draftRecap) onconsumeddraft?.();
  });

  // Quick-find hand-off — see the equivalent note in Roster.svelte. A
  // `focusId` matching no session (deleted in another tab) is a quiet no-op.
  $effect(() => {
    if (!focusId) return;
    const session = sessions.find((s) => s.id === focusId);
    if (session) sessionModal = { mode: 'edit', session };
    onconsumedfocus?.();
  });

  // Awaits `flush()` after the mutation so a GM who refreshes right after
  // saving/deleting never loses the change — see the equivalent note in
  // Roster.svelte.
  async function saveSession(data: Omit<Session, 'id'>) {
    if (sessionModal?.mode === 'edit') updateSession(sessionModal.session.id, data);
    else addSession(data);
    await flushSessions();
    sessionModal = null;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    removeSession(deleteTarget.id);
    await flushSessions();
    deleteTarget = null;
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="sessions" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-end justify-between gap-[var(--sp-4)] flex-wrap">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('sessions.eyebrow')}</div>
        <h1 class="text-[length:var(--text-h1)] mt-1">{$_('sessions.title')}</h1>
      </div>
      <Button variant="secondary" size="sm" onclick={() => (sessionModal = { mode: 'add' })}>
        {#snippet icon()}
          <Icon icon={Plus} />
        {/snippet}
        {$_('sessions.log')}
      </Button>
    </header>

    {#if adventures.length > 0}
      <div class="flex gap-2 overflow-x-auto pb-1" data-testid="session-adventure-filters">
        <Tag tone={adventureFilter === null ? 'accent' : 'default'} onclick={() => (adventureFilter = null)}>
          {$_('sessions.filterAll')}
        </Tag>
        {#each adventures as adventure (adventure.id)}
          <Tag tone={adventureFilter === adventure.id ? 'accent' : 'default'} onclick={() => (adventureFilter = adventure.id)}>
            {adventure.title}
          </Tag>
        {/each}
        <Tag tone={adventureFilter === UNASSIGNED ? 'accent' : 'default'} onclick={() => (adventureFilter = UNASSIGNED)}>
          {$_('sessions.filterUnassigned')}
        </Tag>
      </div>
    {/if}

    <div class="flex flex-col gap-[var(--sp-4)]">
      {#each sorted as session (session.id)}
        <Card>
          {#snippet actions()}
            <div class="flex gap-1 shrink-0">
              <button
                type="button"
                aria-label={$_('roster.edit')}
                onclick={() => (sessionModal = { mode: 'edit', session })}
                class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer"
              >
                <Icon icon={Pencil} />
              </button>
              <button
                type="button"
                aria-label={$_('roster.delete')}
                onclick={() => (deleteTarget = session)}
                class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
              >
                <Icon icon={Trash2} />
              </button>
            </div>
          {/snippet}
          <div class="flex items-center gap-[var(--sp-3)] flex-wrap">
            <Tag tone="accent">#{session.number}</Tag>
            {#if adventureTitleFor(session.adventureId)}
              <Tag size="sm">{adventureTitleFor(session.adventureId)}</Tag>
            {/if}
            <span class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{session.date}</span>
          </div>
          <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)] mt-1">
            {session.title}
          </div>
          {#if session.summary}
            <p class="mt-1 text-[var(--text-secondary)] text-[length:var(--text-body)]">{session.summary}</p>
          {/if}
        </Card>
      {/each}
      {#if sorted.length === 0}
        <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('sessions.empty')}</p>
      {/if}
    </div>
  </main>
</div>

<Modal
  open={sessionModal !== null}
  title={sessionModal?.mode === 'edit' ? $_('sessions.editTitle') : $_('sessions.addTitle')}
  onclose={() => (sessionModal = null)}
>
  {#if sessionModal}
    <SessionForm
      initial={sessionModal.mode === 'edit' ? sessionModal.session : undefined}
      draft={sessionModal.mode === 'add' ? sessionModal.draft : undefined}
      defaultNumber={getNextSessionNumber()}
      onsave={saveSession}
      oncancel={() => (sessionModal = null)}
    />
  {/if}
</Modal>

<ConfirmDialog
  open={deleteTarget !== null}
  title={$_('sessions.deleteTitle')}
  message={$_('sessions.deleteMessage', { values: { title: deleteTarget?.title ?? '' } })}
  confirmLabel={$_('roster.delete')}
  cancelLabel={$_('roster.form.cancel')}
  danger
  onconfirm={confirmDelete}
  oncancel={() => (deleteTarget = null)}
/>
