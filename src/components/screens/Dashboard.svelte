<script lang="ts">
  import {
    Dice5,
    Plus,
    Pencil,
    ListChecks,
    MapPinned,
    Coins,
    AlarmClockCheck,
    ChevronRight,
    PawPrint,
    ShieldAlert,
    ShieldCheck,
  } from 'lucide-svelte';
  import type { IconProps } from 'lucide-svelte';
  import type { ComponentType, SvelteComponent } from 'svelte';
  import { _ } from 'svelte-i18n';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import HpBar from '../ui/HpBar.svelte';
  import StatusPill from '../ui/StatusPill.svelte';
  import Tag from '../ui/Tag.svelte';
  import Icon from '../ui/Icon.svelte';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import { getParty } from '../../lib/stores/party.svelte';
  import { getHirelings } from '../../lib/stores/hirelings.svelte';
  import { getLastSession, getNextSessionNumber, getSessions } from '../../lib/stores/sessions.svelte';
  import { getFactions, dispositionTagTone } from '../../lib/stores/factions.svelte';
  import { getBeats } from '../../lib/stores/beats.svelte';
  import { getHexNodes } from '../../lib/stores/hexmap.svelte';
  import { getCampaignName, setCampaignName } from '../../lib/stores/campaign.svelte';
  import { getLastBackupAt } from '../../lib/stores/backupTracking.svelte';
  import { exportCampaign } from '../../lib/campaignExport';
  import { CONDITIONS } from '../../lib/conditions';
  import { daysSince } from '../../lib/date';

  interface Props {
    onstartsession?: () => void;
    onnavigate: (screen: NavScreen) => void;
    onselectresult?: (result: SearchResult) => void;
  }

  let { onstartsession, onnavigate, onselectresult }: Props = $props();

  const party = getParty();
  const wounded = $derived(party.filter((m) => m.hp < m.max).length);
  const pipsTotal = $derived(party.reduce((sum, m) => sum + m.pips, 0));

  const nextSessionNumber = $derived(getNextSessionNumber());
  const lastSession = $derived(getLastSession());

  const factions = getFactions();
  const activeClocks = $derived(factions.length);
  const nearFull = $derived(factions.filter((f) => f.of > 0 && f.clock >= f.of - 1).length);

  // -- Session prep checklist -----------------------------------------------
  // Read-only counts pulled from stores that already exist elsewhere on this
  // screen/app — no new persisted data. See ROADMAP.md Phase 11's "Session
  // prep checklist" for the exact spec these four rows implement.
  const beats = getBeats();
  const hexNodes = getHexNodes();
  const hirelings = getHirelings();

  const activeBeatsCount = $derived(beats.filter((b) => b.status === 'active').length);
  const hexesWithEncountersCount = $derived(hexNodes.filter((h) => h.encounters.length > 0).length);
  const wagedHirelingsCount = $derived(hirelings.filter((h) => h.status === 'active' && h.wage > 0).length);
  // `nearFull` above is the exact same faction-clock-near-full threshold Live
  // Session uses to decide which clocks are tappable at the table — reused
  // here rather than reimplemented so the two surfaces can never disagree.

  interface PrepRow {
    key: string;
    icon: ComponentType<SvelteComponent<IconProps>>;
    count: number;
    leadKey: string;
    trailingKey: string;
    target: NavScreen;
  }

  const prepRows = $derived<PrepRow[]>([
    {
      key: 'beats',
      icon: ListChecks,
      count: activeBeatsCount,
      leadKey: 'dashboard.prepChecklist.beats.lead',
      trailingKey: 'dashboard.prepChecklist.beats.trailing',
      target: 'adventure',
    },
    {
      key: 'hexes',
      icon: MapPinned,
      count: hexesWithEncountersCount,
      leadKey: 'dashboard.prepChecklist.hexes.lead',
      trailingKey: 'dashboard.prepChecklist.hexes.trailing',
      target: 'hexMap',
    },
    {
      key: 'wages',
      icon: Coins,
      count: wagedHirelingsCount,
      leadKey: 'dashboard.prepChecklist.wages.lead',
      trailingKey: 'dashboard.prepChecklist.wages.trailing',
      target: 'warband',
    },
    {
      key: 'clocks',
      icon: AlarmClockCheck,
      count: nearFull,
      leadKey: 'dashboard.prepChecklist.clocks.lead',
      trailingKey: 'dashboard.prepChecklist.clocks.trailing',
      target: 'factions',
    },
  ]);

  const allClear = $derived(prepRows.every((row) => row.count === 0));

  // -- Data safety (export reminder) -----------------------------------------
  // See ROADMAP.md Phase 14's "Dashboard data-safety export reminder" for the
  // exact cadence-aware heuristic this implements: it only ever fires once a
  // real session is on record (a brand-new campaign on seed data alone has
  // nothing irreplaceable to lose yet), and resets the moment `exportCampaign`
  // (or a successful import) calls `markBackedUp()` — no dismiss/snooze state
  // to persist, this is a pure `$derived` read of existing store data.
  const sessions = getSessions();
  const lastBackupAt = $derived(getLastBackupAt());
  const sessionsSinceBackup = $derived(
    sessions.filter((s) => !lastBackupAt || new Date(s.date) > new Date(lastBackupAt)).length,
  );
  const daysSinceBackup = $derived(lastBackupAt ? daysSince(lastBackupAt) : null);
  const atRisk = $derived(
    sessions.length > 0 &&
      (lastBackupAt === null || sessionsSinceBackup >= 2 || (daysSinceBackup !== null && daysSinceBackup >= 14)),
  );

  let justExported = $state(false);

  function handleExportNow() {
    exportCampaign(); // also calls markBackedUp() internally — see campaignExport.ts
    justExported = true;
  }

  // The confirmation is only ever meant to be a brief acknowledgement — once
  // it's had a moment to register, let the card fall through to its
  // already-recomputed `atRisk`/all-clear state (see the `justExported`
  // check in the markup below) rather than pinning the confirmation message
  // in place for the rest of the visit.
  $effect(() => {
    if (!justExported) return;
    const timer = setTimeout(() => {
      justExported = false;
    }, 2500);
    return () => clearTimeout(timer);
  });

  // -- Campaign name (inline rename) -----------------------------------------
  // Matches the pencil-icon-to-edit pattern used elsewhere (e.g. beat/faction
  // editing), but reveals a plain text field in place rather than opening a
  // modal, since renaming the campaign is a single field, not a full form.
  let editingName = $state(false);
  let nameDraft = $state('');
  let nameInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (editingName) nameInput?.focus();
  });

  function startEditName() {
    nameDraft = getCampaignName();
    editingName = true;
  }

  // Guards against the blur that fires when the input unmounts after Escape
  // (or after an Enter-triggered commit) re-invoking a save with stale state.
  function commitNameOnBlur() {
    if (!editingName) return;
    setCampaignName(nameDraft);
    editingName = false;
  }

  function onNameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      setCampaignName(nameDraft);
      editingName = false;
    } else if (event.key === 'Escape') {
      editingName = false;
    }
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="overview" {onnavigate} {onstartsession} {onselectresult} />

  <!-- Main -->
  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-end justify-between gap-[var(--sp-4)] flex-wrap">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('dashboard.prepMode')}</div>
        {#if editingName}
          <input
            bind:this={nameInput}
            type="text"
            bind:value={nameDraft}
            onblur={commitNameOnBlur}
            onkeydown={onNameKeydown}
            aria-label={$_('dashboard.editNameLabel')}
            class="ww-no-native-ring block mt-1 w-full max-w-xs bg-transparent border-b-2 border-[var(--accent)] outline-none text-[length:var(--text-h1)] font-[family-name:var(--font-display)] font-bold text-[var(--text)]"
          />
        {:else}
          <div class="flex items-center gap-1.5 mt-1">
            <h1 class="text-[length:var(--text-h1)]">{getCampaignName()}</h1>
            <button
              type="button"
              aria-label={$_('dashboard.editName')}
              onclick={startEditName}
              class="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunk)] cursor-pointer shrink-0"
            >
              <Icon icon={Pencil} />
            </button>
          </div>
        {/if}
        <p class="mt-1 text-[var(--text-muted)] text-[length:var(--text-body)]">
          {#if lastSession}
            {$_('dashboard.sessionSummary', { values: { session: nextSessionNumber, days: daysSince(lastSession.date) } })}
          {:else}
            {$_('dashboard.sessionSummaryEmpty', { values: { session: nextSessionNumber } })}
          {/if}
        </p>
      </div>
      <div class="flex gap-[var(--gap-inline)]">
        <Button variant="ghost" size="sm">
          {#snippet icon()}
            <Icon icon={Dice5} />
          {/snippet}
          {$_('dashboard.roll')}
        </Button>
        <Button variant="secondary" size="sm" onclick={() => onnavigate('factions')}>
          {#snippet icon()}
            <Icon icon={Plus} />
          {/snippet}
          {$_('dashboard.newFaction')}
        </Button>
      </div>
    </header>

    <section class="grid grid-cols-2 sm:grid-cols-4 gap-[var(--sp-3)]">
      <Card class="!rounded-[var(--radius-md)]">
        <div class="ww-label mb-1.5">{$_('dashboard.stats.warband')}</div>
        <div class="ww-num font-bold text-[length:var(--stat-md)] leading-none">
          {$_('dashboard.stats.mice', { values: { count: party.length } })}
        </div>
        <div class="text-[length:var(--text-sm)] text-[var(--text-muted)] mt-1">
          {$_('dashboard.stats.wounded', { values: { count: wounded } })}
        </div>
      </Card>
      <Card class="!rounded-[var(--radius-md)]">
        <div class="ww-label mb-1.5">{$_('dashboard.stats.pipsBanked')}</div>
        <div class="ww-num font-bold text-[length:var(--stat-md)] leading-none text-[var(--accent)]">
          {pipsTotal.toLocaleString()}
        </div>
        <div class="text-[length:var(--text-sm)] text-[var(--text-muted)] mt-1">{$_('dashboard.stats.sharedPurse')}</div>
      </Card>
      <Card class="!rounded-[var(--radius-md)]">
        <div class="ww-label mb-1.5">{$_('dashboard.stats.activeClocks')}</div>
        <div class="ww-num font-bold text-[length:var(--stat-md)] leading-none text-[var(--warning)]">
          {activeClocks}
        </div>
        <div class="text-[length:var(--text-sm)] text-[var(--text-muted)] mt-1">
          {$_('dashboard.stats.nearFull', { values: { count: nearFull } })}
        </div>
      </Card>
      <Card interactive class="!rounded-[var(--radius-md)]" onclick={() => onnavigate('sessions')}>
        <div class="ww-label mb-1.5">{$_('dashboard.stats.session')}</div>
        <div class="ww-num font-bold text-[length:var(--stat-md)] leading-none">#{nextSessionNumber}</div>
        <div class="text-[length:var(--text-sm)] text-[var(--text-muted)] mt-1">
          {lastSession ? lastSession.title : $_('dashboard.stats.noSessions')}
        </div>
      </Card>
    </section>

    <Card
      eyebrow={$_('dashboard.prepChecklist.eyebrow')}
      title={$_('dashboard.prepChecklist.title')}
      class="!rounded-[var(--radius-md)]"
    >
      {#if allClear}
        <div class="flex items-center justify-center gap-2 py-6 text-[var(--text-muted)] text-[length:var(--text-body)]">
          <Icon icon={PawPrint} />
          {$_('dashboard.prepChecklist.allClear')}
        </div>
      {:else}
        <div class="flex flex-col divide-y divide-[var(--border)]">
          {#each prepRows as row (row.key)}
            <button
              type="button"
              class="w-full min-h-11 flex items-center gap-3 py-3 px-1 text-left cursor-pointer active:bg-[var(--surface-sunk)]"
              onclick={() => onnavigate(row.target)}
            >
              <span
                class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--surface-sunk)] text-[var(--text-secondary)]"
              >
                <Icon icon={row.icon} />
              </span>
              <span class="flex-1 min-w-0 text-[length:var(--text-body)]">
                <span class="font-bold">{$_(row.leadKey, { values: { n: row.count } })}</span>
                <span class="text-[var(--text-muted)]">{$_(row.trailingKey)}</span>
              </span>
              <Icon icon={ChevronRight} class="text-[var(--text-muted)] shrink-0" />
            </button>
          {/each}
        </div>
      {/if}
    </Card>

    <Card
      eyebrow={$_('dashboard.backupCard.eyebrow')}
      eyebrowHelp={$_('help.backup')}
      title={$_('dashboard.backupCard.title')}
      class="!rounded-[var(--radius-md)]"
    >
      {#snippet actions()}
        {#if atRisk && !justExported}
          <Button variant="ghost" size="sm" onclick={handleExportNow}>
            {$_('dashboard.backupCard.exportNow')}
          </Button>
        {/if}
      {/snippet}
      {#if justExported}
        <p class="py-6 text-center text-[length:var(--text-sm)] text-[var(--success)]" role="status">
          {$_('settings.data.exportDone')}
        </p>
      {:else if atRisk}
        <button
          type="button"
          class="w-full min-h-11 flex items-center gap-3 py-3 px-1 text-left cursor-pointer active:bg-[var(--surface-sunk)]"
          onclick={() => onnavigate('settings')}
        >
          <span
            class="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-[var(--warning-tint)] text-[var(--warning)]"
          >
            <Icon icon={ShieldAlert} />
          </span>
          <span class="flex-1 min-w-0 text-[length:var(--text-body)]">
            {#if lastBackupAt === null}
              <span class="font-bold block">{$_('dashboard.backupCard.neverBackedUp')}</span>
              <span class="text-[var(--text-muted)]">
                {$_('dashboard.backupCard.neverBackedUpTrailing', { values: { count: sessions.length } })}
              </span>
            {:else}
              <span class="font-bold block">
                {$_('dashboard.backupCard.staleBackup', { values: { count: sessionsSinceBackup } })}
              </span>
              <span class="text-[var(--text-muted)]">
                {$_('dashboard.backupCard.staleBackupTrailing', { values: { days: daysSinceBackup ?? 0 } })}
              </span>
            {/if}
          </span>
          <Icon icon={ChevronRight} class="text-[var(--text-muted)] shrink-0" />
        </button>
      {:else}
        <div class="flex items-center justify-center gap-2 py-6 text-[var(--text-muted)] text-[length:var(--text-body)]">
          <Icon icon={ShieldCheck} />
          {$_('dashboard.backupCard.allClear')}
        </div>
      {/if}
    </Card>

    <div class="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-[var(--sp-5)] items-start">
      <!-- Warband -->
      <Card eyebrow={$_('dashboard.warbandCard.eyebrow')} title={$_('dashboard.warbandCard.title')}>
        {#snippet actions()}
          <Button variant="ghost" size="sm" onclick={() => onnavigate('warband')}>{$_('dashboard.warbandCard.manage')}</Button>
        {/snippet}
        <div class="flex flex-col gap-[var(--sp-3)]">
          {#each party as member (member.id)}
            <div class="flex flex-wrap items-center gap-x-[var(--sp-4)] gap-y-2 py-2 border-b border-[var(--border)]">
              <div class="min-w-23">
                <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
                  {member.name}
                </div>
                <div class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{member.role}</div>
              </div>
              <div class="flex-1 min-w-35">
                <HpBar value={member.hp} max={member.max} label={$_('dashboard.warbandCard.hp')} size="sm" />
              </div>
              <div class="flex gap-1.5 shrink-0">
                {#each member.conditions as cond (cond)}
                  <StatusPill tone={CONDITIONS[cond].tone} size="sm">{CONDITIONS[cond].label}</StatusPill>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </Card>

      <!-- Factions -->
      <div class="flex flex-col gap-[var(--sp-4)]">
        <div class="ww-label">{$_('dashboard.factionsCard.heading')}</div>
        {#each factions as faction (faction.id)}
          <Card interactive class="!rounded-[var(--radius-md)]" onclick={() => onnavigate('factions')}>
            {#snippet footer()}
              <div class="flex items-center justify-between gap-[var(--sp-3)] flex-wrap">
                <StatusPill tone="clock" count={faction.clock} of={faction.of}
                  >{$_('dashboard.factionsCard.clock')}</StatusPill
                >
                <div class="flex gap-1.5 flex-wrap">
                  {#each faction.tags as tag (tag)}
                    <Tag tone={dispositionTagTone[faction.disposition]}>{tag}</Tag>
                  {/each}
                </div>
              </div>
            {/snippet}
            <div class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]">
              {faction.name}
            </div>
            <p class="mt-1 text-[var(--text-secondary)] text-[length:var(--text-body)]">{faction.note}</p>
          </Card>
        {/each}
        {#if factions.length === 0}
          <p class="text-[var(--text-muted)] text-[length:var(--text-sm)]">{$_('factions.empty')}</p>
        {/if}
      </div>
    </div>
  </main>
</div>
