<script lang="ts">
  import { HardDrive, Sun, Moon, Share2, Upload, RotateCcw } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import Card from '../ui/Card.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import CampaignImportPreview from './CampaignImportPreview.svelte';
  import { getTheme, setTheme, type Theme } from '../../lib/stores/theme.svelte';
  import { locale, setLocale, type SupportedLocale } from '../../lib/i18n';
  import {
    shareCampaign,
    readCampaignFile,
    applyCampaignImport,
    summarizeCampaignExport,
    latestSessionNumber,
    type CampaignExport,
    type ShareOutcome,
  } from '../../lib/campaignExport';
  import { getSessions } from '../../lib/stores/sessions.svelte';
  import { resetAllCampaignData } from '../../lib/resetData';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
  }

  let { onnavigate, onstartsession }: Props = $props();

  let exported = $state<Exclude<ShareOutcome, 'cancelled'> | null>(null);
  let exporting = $state(false);
  let imported = $state(false);
  let importError = $state<string | null>(null);
  let pendingImport = $state<CampaignExport | null>(null);
  const pendingSummary = $derived(pendingImport ? summarizeCampaignExport(pendingImport) : null);
  let fileInput = $state<HTMLInputElement>();
  let pendingReset = $state(false);

  const themeOptions: { value: Theme; icon: typeof Sun; key: string }[] = [
    { value: 'light', icon: Sun, key: 'settings.appearance.light' },
    { value: 'dark', icon: Moon, key: 'settings.appearance.dark' },
  ];

  const localeOptions: { value: SupportedLocale; key: string }[] = [
    { value: 'en', key: 'settings.language.en' },
    { value: 'de', key: 'settings.language.de' },
  ];

  function chooseTheme(theme: Theme) {
    setTheme(theme);
  }

  function chooseLocale(next: SupportedLocale) {
    setLocale(next);
  }

  async function handleExport() {
    if (exporting) return;
    exporting = true;
    imported = false;
    importError = null;
    try {
      const outcome = await shareCampaign();
      exported = outcome === 'cancelled' ? null : outcome;
    } finally {
      exporting = false;
    }
  }

  function pickImportFile() {
    importError = null;
    fileInput?.click();
  }

  async function handleFileChosen(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    importError = null;
    imported = false;
    exported = null;
    // Validate up front so an unreadable file fails right away, and so the
    // confirm dialog can show what's actually in the file before it
    // overwrites everything on this device.
    try {
      pendingImport = await readCampaignFile(file);
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error);
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const data = pendingImport;
    pendingImport = null;
    try {
      await applyCampaignImport(data);
      imported = true;
      importError = null;
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error);
      imported = false;
    }
  }

  function cancelImport() {
    pendingImport = null;
  }

  function initiateReset() {
    pendingReset = true;
  }

  async function confirmReset() {
    pendingReset = false;
    await resetAllCampaignData();
  }

  function cancelReset() {
    pendingReset = false;
  }

  const segmentBase =
    'flex-1 flex items-center justify-center gap-1.5 min-h-[var(--tap)] px-3 rounded-[var(--radius-pill)] font-semibold text-[length:var(--text-body)] cursor-pointer transition-[background,color] duration-[calc(var(--dur-fast)*1ms)] ease-[var(--ease)]';
  const segmentActive = 'bg-[var(--surface-raised)] text-[var(--accent)] shadow-[var(--shadow-sm)]';
  const segmentIdle = 'text-[var(--text-secondary)] hover:text-[var(--text)]';
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="settings" {onnavigate} {onstartsession} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header>
      <div class="ww-label text-[var(--accent)]">{$_('settings.eyebrow')}</div>
      <h1 class="text-[length:var(--text-h1)] mt-1">{$_('settings.title')}</h1>
    </header>

    <!-- Data-durability notice: a fact about the app, framed calmly (accent, not warning). -->
    <div
      class="flex gap-[var(--sp-3)] items-start p-[var(--pad-card)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--accent-tint)]"
    >
      <span class="shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden="true"><Icon icon={HardDrive} /></span>
      <div class="max-w-[60ch]">
        <p class="font-bold text-[length:var(--text-body)] text-[var(--text)]">{$_('settings.notice.title')}</p>
        <p class="mt-1 text-[length:var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
          {$_('settings.notice.body')}
        </p>
      </div>
    </div>

    <!-- Appearance + Language: lowest-stakes settings, side by side on wider screens. -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-[var(--sp-5)] items-start">
      <Card title={$_('settings.appearance.title')}>
        <div class="flex rounded-[var(--radius-pill)] bg-[var(--surface-sunk)] p-1 gap-1" role="group" aria-label={$_('settings.appearance.title')}>
          {#each themeOptions as option (option.value)}
            {@const selected = getTheme() === option.value}
            <button
              type="button"
              aria-pressed={selected}
              onclick={() => chooseTheme(option.value)}
              class="{segmentBase} {selected ? segmentActive : segmentIdle}"
            >
              <Icon icon={option.icon} />
              {$_(option.key)}
            </button>
          {/each}
        </div>
        <p class="mt-2 text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('settings.appearance.hint')}</p>
      </Card>

      <Card title={$_('settings.language.title')}>
        <div class="flex rounded-[var(--radius-pill)] bg-[var(--surface-sunk)] p-1 gap-1" role="group" aria-label={$_('settings.language.title')}>
          {#each localeOptions as option (option.value)}
            {@const selected = $locale === option.value}
            <button
              type="button"
              aria-pressed={selected}
              onclick={() => chooseLocale(option.value)}
              class="{segmentBase} {selected ? segmentActive : segmentIdle}"
            >
              {$_(option.key)}
            </button>
          {/each}
        </div>
        <p class="mt-2 text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('settings.language.hint')}</p>
      </Card>
    </div>

    <!-- Campaign data: the most consequential control, so it comes last. -->
    <Card title={$_('settings.data.title')}>
      {#snippet footer()}
        <p class="text-[length:var(--text-caption)] text-[var(--text-muted)]">{$_('settings.data.footer')}</p>
      {/snippet}
      <p class="text-[length:var(--text-sm)] text-[var(--text-secondary)]">{$_('settings.data.intro')}</p>
      <div class="mt-[var(--sp-4)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--sp-4)]">
        <div class="border border-[var(--border)] rounded-[var(--radius-md)] p-[var(--sp-4)] flex flex-col gap-[var(--sp-2)]">
          <div class="font-bold flex items-center gap-1.5"><Icon icon={Share2} />{$_('settings.data.exportHeading')}</div>
          <p class="text-[length:var(--text-sm)] text-[var(--text-muted)] flex-1">{$_('settings.data.exportHint')}</p>
          <Button variant="primary" block disabled={exporting} onclick={handleExport}>
            {#snippet icon()}
              <Icon icon={Share2} />
            {/snippet}
            {$_('settings.data.export')}
          </Button>
          {#if exported === 'shared'}
            <p class="text-[length:var(--text-sm)] text-[var(--success)]" role="status">{$_('settings.data.exportShared')}</p>
          {:else if exported === 'downloaded'}
            <p class="text-[length:var(--text-sm)] text-[var(--success)]" role="status">{$_('settings.data.exportDone')}</p>
          {/if}
        </div>

        <div class="border border-[var(--border)] rounded-[var(--radius-md)] p-[var(--sp-4)] flex flex-col gap-[var(--sp-2)]">
          <div class="font-bold flex items-center gap-1.5"><Icon icon={Upload} />{$_('settings.data.importHeading')}</div>
          <p class="text-[length:var(--text-sm)] text-[var(--text-muted)] flex-1">{$_('settings.data.importHint')}</p>
          <Button variant="secondary" block onclick={pickImportFile}>
            {#snippet icon()}
              <Icon icon={Upload} />
            {/snippet}
            {$_('settings.data.import')}
          </Button>
          <input
            bind:this={fileInput}
            type="file"
            accept="application/json,.json,text/plain,.txt"
            class="sr-only"
            aria-hidden="true"
            tabindex="-1"
            onchange={handleFileChosen}
          />
          {#if importError}
            <p class="text-[length:var(--text-sm)]" style:color="var(--danger-hover)" role="alert">{importError}</p>
          {/if}
          {#if imported}
            <p class="text-[length:var(--text-sm)] text-[var(--success)]" role="status">{$_('settings.data.importDone')}</p>
          {/if}
        </div>

        <div class="border border-[var(--border)] rounded-[var(--radius-md)] p-[var(--sp-4)] flex flex-col gap-[var(--sp-2)]">
          <div class="font-bold flex items-center gap-1.5"><Icon icon={RotateCcw} />{$_('settings.data.resetHeading')}</div>
          <p class="text-[length:var(--text-sm)] text-[var(--text-muted)] flex-1">{$_('settings.data.resetHint')}</p>
          <Button variant="secondary" block onclick={initiateReset}>
            {#snippet icon()}
              <Icon icon={RotateCcw} />
            {/snippet}
            {$_('settings.data.reset')}
          </Button>
        </div>
      </div>
    </Card>
  </main>
</div>

<ConfirmDialog
  open={pendingImport !== null}
  title={$_('settings.data.confirmTitle')}
  confirmLabel={$_('settings.data.confirmAction')}
  cancelLabel={$_('settings.data.cancel')}
  danger
  onconfirm={confirmImport}
  oncancel={cancelImport}
>
  {#if pendingSummary}
    <CampaignImportPreview summary={pendingSummary} localLatestSessionNumber={latestSessionNumber(getSessions())} />
  {/if}
</ConfirmDialog>

<ConfirmDialog
  open={pendingReset}
  title={$_('settings.data.resetConfirmTitle')}
  message={$_('settings.data.resetConfirmMessage')}
  confirmLabel={$_('settings.data.resetConfirmAction')}
  cancelLabel={$_('settings.data.cancel')}
  danger
  onconfirm={confirmReset}
  oncancel={cancelReset}
/>
