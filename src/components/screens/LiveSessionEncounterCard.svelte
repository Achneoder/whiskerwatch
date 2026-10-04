<script lang="ts">
  import HelpTip from '../ui/HelpTip.svelte';
  import { Swords } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Card from '../ui/Card.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import StatBlock from '../ui/StatBlock.svelte';
  import ReactionResult from '../ui/ReactionResult.svelte';
  import LiveSessionEncounterInstance, { type EncounterInstance } from './LiveSessionEncounterInstance.svelte';
  import type { BestiaryEntry } from '../../lib/stores/bestiary.svelte';
  import type { ReactionRollResult } from '../../lib/generators/reaction';

  interface Notice {
    text: string;
    undo?: (() => void) | undefined;
  }

  interface Props {
    hexName: string;
    hasBestiary: boolean;
    encounterResult: BestiaryEntry | null;
    reactionResult: ReactionRollResult | null;
    instances: EncounterInstance[];
    /** The instance id whose Hurt/Heal drawer is open, or `null` — shares
     * `LiveSession.svelte`'s single `openDrawer` state with the party/
     * hireling cards rather than a second "one thing open" machine. */
    openDrawerId: string | null;
    /** Whether this card has ever held at least one instance — drives the
     * post-fight "hand off any loot" tip once the list empties back out. */
    hadInstances: boolean;
    /** The last damage/heal/remove notice for *any* instance on this card —
     * `LiveSession.svelte` scopes it in by id prefix, same as it does for
     * the faction clock strip and the mouse/hireling cards. */
    notice: Notice | null;
    onrollencounter: () => void;
    onrollreaction: () => void;
    onaddanother: () => void;
    ontoggledrawer: (id: string) => void;
    onhurtinstance: (id: string, amount: number) => void;
    onhealinstance: (id: string, amount: number) => void;
    onremoveinstance: (id: string) => void;
    ondismissnotice: () => void;
  }

  let {
    hexName,
    hasBestiary,
    encounterResult,
    reactionResult,
    instances,
    openDrawerId,
    hadInstances,
    notice,
    onrollencounter,
    onrollreaction,
    onaddanother,
    ontoggledrawer,
    onhurtinstance,
    onhealinstance,
    onremoveinstance,
    ondismissnotice,
  }: Props = $props();

  function undoNotice() {
    notice?.undo?.();
    ondismissnotice();
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

<Card eyebrow={$_('liveSession.encounter.eyebrow')} title={hexName} footer={notice ? noticeFooter : undefined}>
  <div class="flex flex-col gap-[var(--sp-3)]">
    {#if !hasBestiary}
      <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('generators.encounter.noBestiary')}</p>
    {:else}
      <Button variant="secondary" size="live" onclick={onrollencounter}>
        {#snippet icon()}
          <Icon icon={Swords} />
        {/snippet}
        {$_('liveSession.encounter.roll')}
      </Button>
      {#if encounterResult}
        <div class="bg-[var(--surface-sunk)] rounded-[var(--radius-md)] p-[var(--sp-3)] flex flex-col gap-[var(--sp-3)]">
          <StatBlock entry={encounterResult} statGap="var(--sp-3)" />

          <Button variant="secondary" size="sm" onclick={onaddanother}>
            {$_('liveSession.encounter.addAnother', { values: { name: encounterResult.name } })}
          </Button>

          {#if instances.length > 0}
            <div class="flex flex-col gap-2">
              {#each instances as instance (instance.id)}
                <LiveSessionEncounterInstance
                  {instance}
                  drawerOpen={openDrawerId === instance.id}
                  {ontoggledrawer}
                  onhurt={onhurtinstance}
                  onheal={onhealinstance}
                  onremove={onremoveinstance}
                />
              {/each}
            </div>
          {:else if hadInstances}
            <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">
              {$_('liveSession.encounter.fightOverTip')}
            </p>
          {/if}

          <div class="flex items-center gap-[var(--sp-2)]">
            <div class="flex-1 min-w-0 flex flex-col">
              <Button variant="primary" size="live" onclick={onrollreaction}>
                {$_('liveSession.reaction.roll')}
              </Button>
            </div>
            <HelpTip text={$_('help.reaction')} label={$_('help.reactionLabel')} />
          </div>
          {#if reactionResult}
            <ReactionResult result={reactionResult} size="live" />
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</Card>
