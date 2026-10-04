<script lang="ts">
  import HelpTip from '../ui/HelpTip.svelte';
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Button from '../ui/Button.svelte';
  import {
    MAX_SLOTS,
    PAWS_SLOTS,
    BODY_SLOTS,
    usedSlots,
    isOverCapacity,
    splitSections,
    type Item,
  } from '../../lib/items';

  interface Props {
    items: Item[];
    onadd: (input: Omit<Item, 'id'>) => void;
    onremove: (itemId: string) => void;
    onupdate: (itemId: string, patch: Partial<Omit<Item, 'id'>>) => void;
  }

  let { items, onadd, onremove, onupdate }: Props = $props();

  const slotChoices: (1 | 2)[] = [1, 2];

  type CellEntry = { type: 'item'; item: Item } | { type: 'empty'; key: string };

  type EditingState =
    | { kind: 'add'; section: 'paws' | 'body'; key: string }
    | { kind: 'edit'; itemId: string }
    | null;

  let editing = $state<EditingState>(null);
  let draftName = $state('');
  let draftSlots = $state<1 | 2>(1);
  let draftChargeTrack = $state(0);
  let draftNotes = $state('');

  function buildCells(sectionItems: Item[], sectionSlots: number, prefix: string): CellEntry[] {
    const cells: CellEntry[] = sectionItems.map((item) => ({ type: 'item', item }));
    const used = sectionItems.reduce((total, item) => total + item.slots, 0);
    // Overburdened is a soft warning, never a block (see items.ts) — so even
    // a section that's already at or past its nominal budget always keeps at
    // least one "add" affordance, rather than the grid running out of empty
    // cells to tap once the GM is over capacity.
    const emptyCount = Math.max(1, sectionSlots - used);
    for (let i = 0; i < emptyCount; i += 1) {
      cells.push({ type: 'empty', key: `${prefix}-empty-${i}` });
    }
    return cells;
  }

  const sections = $derived(splitSections(items));
  const pawsCells = $derived(buildCells(sections.paws, PAWS_SLOTS, 'paws'));
  const bodyCells = $derived(buildCells(sections.body, BODY_SLOTS, 'body'));
  const used = $derived(usedSlots(items));
  const overburdened = $derived(isOverCapacity(items));

  function startAdd(section: 'paws' | 'body', key: string) {
    editing = { kind: 'add', section, key };
    draftName = '';
    draftSlots = 1;
    draftChargeTrack = 0;
    draftNotes = '';
  }

  function startEdit(item: Item) {
    editing = { kind: 'edit', itemId: item.id };
    draftName = item.name;
    draftSlots = item.slots;
    draftChargeTrack = item.maxCharges ?? 0;
    draftNotes = item.notes;
  }

  function cancelEdit() {
    editing = null;
  }

  function saveDraft() {
    const name = draftName.trim();
    if (!name) return;
    const charges = draftChargeTrack === 0 ? null : draftChargeTrack;
    const maxCharges = draftChargeTrack === 0 ? null : draftChargeTrack;
    const patch = { name, slots: draftSlots, charges, maxCharges, notes: draftNotes.trim() };
    if (editing?.kind === 'edit') onupdate(editing.itemId, patch);
    else if (editing?.kind === 'add') onadd(patch);
    editing = null;
  }

  function removeDraft() {
    if (editing?.kind === 'edit') onremove(editing.itemId);
    editing = null;
  }

  function filledAria(item: Item): string {
    const slotWord = item.slots === 1 ? $_('inventory.slotSingular') : $_('inventory.slotPlural');
    return $_('inventory.filledSlotAria', { values: { name: item.name, slots: item.slots, slotWord } });
  }

  function chargesAria(item: Item): string {
    return $_('inventory.chargesAria', { values: { current: item.charges ?? 0, max: item.maxCharges ?? 0 } });
  }
</script>

{#snippet editor()}
  <!--
    `data-testid` here is the same deliberate, minimal concession used by
    LiveSessionCard's drawers: the item Name/Save/Cancel labels intentionally
    match the outer form's own Name/Save/Cancel (reusing this app's shared
    form vocabulary), so Playwright needs one stable hook to scope into "the
    item editor" rather than the whole form.
  -->
  <div
    data-testid="item-editor"
    class="col-span-full flex flex-col gap-[var(--gap-stack)] rounded-[var(--radius-md)] border-2 border-[var(--accent)] bg-[var(--accent-tint)] p-[var(--pad-card)]"
  >
    <span class="ww-label">{$_('inventory.form.editingSlot')}</span>
    <Input label={$_('inventory.form.name')} bind:value={draftName} required />
    <div class="flex gap-[var(--sp-5)] flex-wrap items-end">
      <div class="flex flex-col gap-1.5">
        <span class="flex items-center gap-1.5">
          <span class="ww-label">{$_('inventory.form.slots')}</span>
          <HelpTip text={$_('help.slots')} label={$_('inventory.form.slots')} />
        </span>
        <div class="inline-flex rounded-[var(--radius-md)] border border-[var(--border-strong)] overflow-hidden">
          {#each slotChoices as n (n)}
            <button
              type="button"
              onclick={() => (draftSlots = n)}
              class="min-h-[var(--tap)] px-[var(--pad-control-x)] font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] font-bold cursor-pointer {draftSlots ===
              n
                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}"
            >
              {n}
            </button>
          {/each}
        </div>
      </div>
      <Stepper label={$_('inventory.form.charges')} help={$_('help.charges')} value={draftChargeTrack} min={0} max={6} onchange={(v) => (draftChargeTrack = v)} />
    </div>
    <Input
      label={$_('inventory.form.notes')}
      bind:value={draftNotes}
      placeholder={$_('inventory.form.notesPlaceholder')}
    />
    <div class="flex items-center justify-between gap-2 flex-wrap">
      {#if editing?.kind === 'edit'}
        <Button type="button" variant="ghost" onclick={removeDraft}>{$_('inventory.removeItem')}</Button>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-[var(--gap-inline)]">
        <Button type="button" variant="ghost" onclick={cancelEdit}>{$_('roster.form.cancel')}</Button>
        <Button type="button" variant="primary" onclick={saveDraft}>{$_('roster.form.save')}</Button>
      </div>
    </div>
  </div>
{/snippet}

{#snippet emptySlot(section: 'paws' | 'body', key: string)}
  <button
    type="button"
    onclick={() => startAdd(section, key)}
    aria-label={$_('inventory.emptySlotAria')}
    class="min-h-19 flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-strong)] text-[var(--text-faint)] cursor-pointer p-[var(--sp-2)] text-center"
  >
    <span class="text-[length:var(--text-title)] font-bold leading-none" aria-hidden="true">+</span>
    <span class="text-[length:var(--text-sm)]">{$_('inventory.addItem')}</span>
  </button>
{/snippet}

{#snippet filledSlot(item: Item)}
  <button
    type="button"
    onclick={() => startEdit(item)}
    aria-label={filledAria(item)}
    class="relative min-h-19 {item.slots === 2
      ? 'col-span-2'
      : ''} flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer p-[var(--sp-2)] text-center"
  >
    <span class="text-[length:var(--text-sm)] font-bold leading-tight">{item.name}</span>
    {#if item.maxCharges}
      <span role="img" aria-label={chargesAria(item)} class="font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--text-muted)] tracking-wide">
        {#each Array(item.maxCharges) as _pip, i (i)}{i < (item.charges ?? 0) ? '●' : '○'}{/each}
      </span>
    {/if}
    {#if item.slots === 2}
      <span class="absolute bottom-1.5 right-2 text-[length:var(--text-caption)] text-[var(--text-faint)] font-[family-name:var(--font-mono)]">
        {$_('inventory.slotPlural')}
      </span>
    {/if}
  </button>
{/snippet}

<div class="flex flex-col gap-[var(--gap-stack)]">
  <div class="flex items-center justify-between gap-2 flex-wrap">
    <span class="flex items-center gap-1.5">
      <span class="ww-label">{$_('inventory.heading')}</span>
      <HelpTip text={$_('help.inventory')} label={$_('inventory.heading')} />
    </span>
    <span class="font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--text-secondary)]">
      {$_('inventory.slotsUsed', { values: { used, max: MAX_SLOTS } })}
    </span>
  </div>

  {#if overburdened}
    <div
      class="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-tint)] px-[var(--sp-4)] py-[var(--sp-3)] text-[length:var(--text-sm)] text-[var(--warning)]"
    >
      <span aria-hidden="true">⚠️</span>
      <span><b>{$_('inventory.overburdenedTitle')}</b> {$_('inventory.overburdenedMessage')}</span>
    </div>
  {/if}

  <div>
    <div class="ww-label text-[length:var(--text-caption)] mb-1.5">{$_('inventory.paws')}</div>
    <div class="grid grid-cols-2 gap-2">
      {#each pawsCells as cell (cell.type === 'item' ? cell.item.id : cell.key)}
        {#if editing?.kind === 'edit' && cell.type === 'item' && editing.itemId === cell.item.id}
          {@render editor()}
        {:else if editing?.kind === 'add' && cell.type === 'empty' && editing.section === 'paws' && editing.key === cell.key}
          {@render editor()}
        {:else if cell.type === 'item'}
          {@render filledSlot(cell.item)}
        {:else}
          {@render emptySlot('paws', cell.key)}
        {/if}
      {/each}
    </div>
  </div>

  <div>
    <div class="ww-label text-[length:var(--text-caption)] mb-1.5 mt-1">{$_('inventory.body')}</div>
    <div class="grid grid-cols-2 min-[600px]:grid-cols-3 min-[960px]:grid-cols-4 gap-2">
      {#each bodyCells as cell (cell.type === 'item' ? cell.item.id : cell.key)}
        {#if editing?.kind === 'edit' && cell.type === 'item' && editing.itemId === cell.item.id}
          {@render editor()}
        {:else if editing?.kind === 'add' && cell.type === 'empty' && editing.section === 'body' && editing.key === cell.key}
          {@render editor()}
        {:else if cell.type === 'item'}
          {@render filledSlot(cell.item)}
        {:else}
          {@render emptySlot('body', cell.key)}
        {/if}
      {/each}
    </div>
  </div>
</div>
