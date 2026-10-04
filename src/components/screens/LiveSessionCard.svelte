<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Card from '../ui/Card.svelte';
  import Tag from '../ui/Tag.svelte';
  import StatusPill from '../ui/StatusPill.svelte';
  import HpBar from '../ui/HpBar.svelte';
  import Button from '../ui/Button.svelte';
  import HurtHealDrawer from '../ui/HurtHealDrawer.svelte';
  import { CONDITIONS, type ConditionName, conditionLabelKey } from '../../lib/conditions';
  import { MAX_SLOTS, usedSlots, type Item } from '../../lib/items';

  export interface LiveSessionCardMember {
    id: string;
    name: string;
    role: string;
    hp: number;
    max: number;
    str: number;
    maxStr: number;
    conditions: ConditionName[];
    items: Item[];
    /** Total inventory slots — defaults to a player mouse's 10; hirelings have 6. */
    slotCapacity?: number;
    /** Only set for hirelings — mice don't make morale saves, so this pill doesn't render for them. */
    morale?: { wil: number; advantage: boolean };
  }

  interface Notice {
    text: string;
    undo?: (() => void) | undefined;
  }

  interface Props {
    member: LiveSessionCardMember;
    drawer: 'damage' | 'condition' | null;
    notice: Notice | null;
    /** The mouse's post-damage STR to save against, or `null` if no save is pending. */
    pendingStrSave: number | null;
    ondamage: (amount: number) => void;
    onheal: (amount: number) => void;
    ontoggledrawer: (kind: 'damage' | 'condition') => void;
    ontogglecondition: (condition: ConditionName) => void;
    onresolvestrsave: () => void;
    onrequestdeath: () => void;
    ondismissnotice: () => void;
    oninventoryopen: () => void;
    onrollmoralesave?: () => void;
  }

  let {
    member,
    drawer,
    notice,
    pendingStrSave,
    ondamage,
    onheal,
    ontoggledrawer,
    ontogglecondition,
    onresolvestrsave,
    onrequestdeath,
    ondismissnotice,
    oninventoryopen,
    onrollmoralesave,
  }: Props = $props();

  const fatal = $derived(member.str === 0);
  const showStrBar = $derived(member.hp === 0 || member.str < member.maxStr);
  const chips = [1, 2, 3, 4, 5, 6];
  const usedItemSlots = $derived(usedSlots(member.items));
  const slotCapacity = $derived(member.slotCapacity ?? MAX_SLOTS);
  const bagAria = $derived($_('liveSession.bagAria', { values: { name: member.name, used: usedItemSlots, max: slotCapacity } }));
  const moraleAria = $derived(
    member.morale != null
      ? $_(member.morale.advantage ? 'liveSession.moraleSaveAriaAdv' : 'liveSession.moraleSaveAria', {
          values: { name: member.name, wil: member.morale.wil },
        })
      : undefined,
  );

  let mode = $state<'hurt' | 'heal'>('hurt');
  let customOpen = $state(false);
  let customAmount = $state(7);

  function applyChip(amount: number) {
    if (mode === 'hurt') ondamage(amount);
    else onheal(amount);
  }

  function applyCustom() {
    applyChip(customAmount);
  }

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

<!--
  `data-testid` is a deliberate, minimal concession for Playwright: the
  Live Session screen renders several structurally-identical cards (one per
  mouse/hireling), and this is the only stable hook to scope interactions
  ("click Hurt on Wren's card, not Pip's") without fragile DOM traversal.
  Keyed on name rather than id since fixture/seed ids are random UUIDs.
-->
<div data-testid={`mouse-card-${member.name}`}>
  <Card style={fatal ? 'border: 2px solid var(--danger)' : undefined} footer={notice ? noticeFooter : undefined}>
  <div class="flex items-center gap-2 flex-wrap">
    <div class="font-[family-name:var(--font-display)] font-extrabold text-[length:var(--text-h3)]">
      {member.name}
    </div>
    <Tag size="sm">{member.role}</Tag>
    <div class="min-h-[var(--tap)] flex items-center">
      <StatusPill size="sm" count={usedItemSlots} of={slotCapacity} onclick={oninventoryopen} ariaLabel={bagAria}>
        {$_('liveSession.bag')}
      </StatusPill>
    </div>
    {#if member.morale != null}
      <div class="min-h-[var(--tap)] flex items-center">
        <StatusPill
          tone="accent"
          size="sm"
          count={member.morale.wil}
          onclick={() => onrollmoralesave?.()}
          ariaLabel={moraleAria}
        >
          {$_('liveSession.morale')}
        </StatusPill>
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-1.5 mt-2">
    {#each member.conditions as cond (cond)}
      <StatusPill tone={CONDITIONS[cond].tone} size="sm" onclick={() => ontogglecondition(cond)}>
        {$_(conditionLabelKey(cond))}
      </StatusPill>
    {/each}
    <Tag onclick={() => ontoggledrawer('condition')}>+ {$_('liveSession.condition')}</Tag>
  </div>

  <div class="mt-3">
    <HpBar value={member.hp} max={member.max} label={$_('liveSession.hp')} tone="hp" size="live" />
  </div>
  {#if showStrBar}
    <div class="mt-2">
      <HpBar value={member.str} max={member.maxStr} label={$_('liveSession.str')} tone="auto" size="live" />
    </div>
  {/if}

  {#if pendingStrSave != null}
    <div
      class="mt-3 flex items-center justify-between gap-2 flex-wrap rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-tint)] p-3"
    >
      <span class="text-[length:var(--text-sm)] font-bold text-[var(--danger-hover)]">
        {$_('liveSession.strSaveRequired', { values: { str: pendingStrSave } })}
      </span>
      <Button variant="danger" size="sm" onclick={onresolvestrsave}>{$_('liveSession.rollStrSave')}</Button>
    </div>
  {/if}

  <div class="mt-3">
    {#if fatal}
      <Button variant="danger" size="live" block onclick={onrequestdeath}>
        {$_('liveSession.confirmDeathAction')}
      </Button>
    {:else}
      <Button variant="danger" size="md" onclick={() => ontoggledrawer('damage')}>{$_('liveSession.hurt')}</Button>
    {/if}
  </div>

  {#if drawer === 'condition'}
    <div class="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
      {#each Object.entries(CONDITIONS) as [key, info] (key)}
        {@const name = key as ConditionName}
        <Tag tone={info.tone} solid={member.conditions.includes(name)} onclick={() => ontogglecondition(name)}>
          {$_(conditionLabelKey(name))}
        </Tag>
      {/each}
    </div>
  {/if}

  {#if drawer === 'damage'}
    <div class="mt-3 border-t border-[var(--border)] pt-3">
      <HurtHealDrawer
        {mode}
        {chips}
        {customOpen}
        bind:customAmount
        onmode={(m) => (mode = m)}
        onchip={applyChip}
        oncustomtoggle={() => (customOpen = true)}
        onapplycustom={applyCustom}
      />
    </div>
  {/if}
  </Card>
</div>
