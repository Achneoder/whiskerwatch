<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import type { CampaignExportSummary } from '../../lib/campaignExport';

  interface Props {
    summary: CampaignExportSummary;
    /** Highest session number already on this device — used to warn before importing an older state. */
    localLatestSessionNumber: number;
  }

  let { summary, localLatestSessionNumber }: Props = $props();

  const exportedAt = $derived.by(() => {
    const date = new Date(summary.exportedAt);
    if (Number.isNaN(date.getTime())) return summary.exportedAt;
    return new Intl.DateTimeFormat($locale ?? 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  });

  const isBehind = $derived(summary.latestSessionNumber < localLatestSessionNumber);
</script>

<div class="flex flex-col gap-[var(--sp-3)]">
  <p class="text-[var(--text-secondary)] text-[length:var(--text-body)]">{$_('settings.data.confirmMessage')}</p>

  <dl
    class="grid grid-cols-[auto_1fr] gap-x-[var(--sp-3)] gap-y-1 p-[var(--sp-3)] rounded-[var(--radius-md)] bg-[var(--surface-sunk)] text-[length:var(--text-sm)]"
    aria-label={$_('settings.data.preview.label')}
  >
    {#if summary.campaignName}
      <dt class="text-[var(--text-muted)]">{$_('settings.data.preview.campaign')}</dt>
      <dd class="font-bold break-words">{summary.campaignName}</dd>
    {/if}
    <dt class="text-[var(--text-muted)]">{$_('settings.data.preview.exportedAt')}</dt>
    <dd>{exportedAt}</dd>
    <dt class="text-[var(--text-muted)]">{$_('settings.data.preview.sessions')}</dt>
    <dd>
      {summary.sessions}
      {#if summary.latestSessionNumber > 0}
        <span class="text-[var(--text-muted)]">({$_('settings.data.preview.latestSession', { values: { number: summary.latestSessionNumber } })})</span>
      {/if}
    </dd>
    <dt class="text-[var(--text-muted)]">{$_('settings.data.preview.party')}</dt>
    <dd>{summary.party}</dd>
    <dt class="text-[var(--text-muted)]">{$_('settings.data.preview.adventures')}</dt>
    <dd>{summary.adventures}</dd>
    <dt class="text-[var(--text-muted)]">{$_('settings.data.preview.timeline')}</dt>
    <dd>
      {summary.timelineEntries ?? $_('settings.data.preview.timelineKept')}
    </dd>
  </dl>

  {#if isBehind}
    <p class="text-[length:var(--text-sm)] font-semibold" style:color="var(--danger-hover)" role="alert">
      {$_('settings.data.preview.olderWarning', {
        values: { file: summary.latestSessionNumber, local: localLatestSessionNumber },
      })}
    </p>
  {/if}
</div>
