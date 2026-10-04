<script lang="ts">
  import { ArrowLeftRight } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Modal from '../ui/Modal.svelte';
  import Icon from '../ui/Icon.svelte';
  import Button from '../ui/Button.svelte';
  import Tag from '../ui/Tag.svelte';
  import {
    MOUSE_LAYOUT,
    HIRELING_LAYOUT,
    capacity,
    usedSlots,
    splitSections,
    type InventoryLayout,
    type Item,
  } from '../../lib/items';

  interface Notice {
    text: string;
    undo?: (() => void) | undefined;
  }

  /** A possible hand-off target — every other active party member/hireling, never the sender. */
  interface Recipient {
    id: string;
    name: string;
    kind: 'party' | 'hireling';
    items: Item[];
  }

  interface Props {
    name: string;
    items: Item[];
    /** The bag owner's slot layout — a player mouse's unless this is a hireling's bag. */
    layout?: InventoryLayout;
    open: boolean;
    notice?: Notice | null;
    /** Every other active party member/hireling this item could be handed off to — computed by `LiveSession.svelte`, this modal never reaches into the stores itself. */
    recipients: Recipient[];
    /** The id of the item currently mid-move, or `null` when showing the plain item grid. */
    movingItemId: string | null;
    onburn: (itemId: string) => void;
    onclose: () => void;
    ondismissnotice?: () => void;
    onrequestmove: (itemId: string) => void;
    onmove: (itemId: string, recipientId: string) => void;
    oncancelmove: () => void;
  }

  let {
    name,
    items,
    layout = MOUSE_LAYOUT,
    open,
    notice = null,
    recipients,
    movingItemId,
    onburn,
    onclose,
    ondismissnotice,
    onrequestmove,
    onmove,
    oncancelmove,
  }: Props = $props();

  function undoNotice() {
    notice?.undo?.();
    ondismissnotice?.();
  }

  type CellEntry = { type: 'item'; item: Item } | { type: 'empty'; key: string };

  /**
   * Static counterpart to `ItemSlotGrid`'s `buildCells` — pads a section's
   * items out to its nominal slot budget with empty placeholder cells, but
   * (unlike the roster editor) never guarantees a minimum of one: this
   * modal has no add affordance, so an encumbered section with zero
   * spare capacity legitimately renders no empties at all.
   */
  function buildCells(sectionItems: Item[], sectionSlots: number, prefix: string): CellEntry[] {
    const cells: CellEntry[] = sectionItems.map((item) => ({ type: 'item', item }));
    const used = sectionItems.reduce((total, item) => total + item.slots, 0);
    const emptyCount = Math.max(0, sectionSlots - used);
    for (let i = 0; i < emptyCount; i += 1) {
      cells.push({ type: 'empty', key: `${prefix}-empty-${i}` });
    }
    return cells;
  }

  const split = $derived(splitSections(items, layout));
  const sections = $derived(
    (['paws', 'body', 'pack'] as const).map((id) => ({ id, cells: buildCells(split[id], layout[id], id) })),
  );
  const used = $derived(usedSlots(items));
  const max = $derived(capacity(layout));

  const movingItem = $derived(movingItemId ? (items.find((i) => i.id === movingItemId) ?? null) : null);

  function chargeCellAria(item: Item): string {
    return $_('liveSession.chargeCellAria', {
      values: { name: item.name, current: item.charges ?? 0, max: item.maxCharges ?? 0 },
    });
  }
</script>

{#snippet chargeDots(item: Item)}
  <span
    role="img"
    aria-label={$_('inventory.chargesAria', { values: { current: item.charges ?? 0, max: item.maxCharges ?? 0 } })}
    class="font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--text-muted)] tracking-wide"
  >
    {#each Array(item.maxCharges ?? 0) as _pip, i (i)}{i < (item.charges ?? 0) ? '●' : '○'}{/each}
  </span>
{/snippet}

{#snippet cell(item: Item)}
  <div
    class="min-h-19 flex items-stretch rounded-[var(--radius-md)] border border-[var(--border-strong)] overflow-hidden"
  >
    {#if item.maxCharges != null}
      <button
        type="button"
        onclick={() => onburn(item.id)}
        aria-label={chargeCellAria(item)}
        class="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-[var(--sp-2)] text-center cursor-pointer bg-[var(--surface)] border-none"
      >
        <span class="text-[length:var(--text-sm)] font-bold leading-tight truncate w-full">{item.name}</span>
        {@render chargeDots(item)}
      </button>
    {:else}
      <div class="flex-1 min-w-0 flex items-center justify-center p-[var(--sp-2)] text-center bg-[var(--surface)]">
        <span class="text-[length:var(--text-sm)] font-bold leading-tight truncate w-full">{item.name}</span>
      </div>
    {/if}
    <button
      type="button"
      onclick={() => onrequestmove(item.id)}
      aria-label={$_('inventory.moveAria', { values: { name: item.name } })}
      class="w-11 min-w-[var(--tap)] shrink-0 flex items-center justify-center border-l border-[var(--border)] bg-[var(--surface-sunk)] text-[var(--accent)] cursor-pointer"
    >
      <Icon icon={ArrowLeftRight} size="prep" />
    </button>
  </div>
{/snippet}

{#snippet empty()}
  <div
    class="min-h-19 flex items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-strong)] text-[var(--text-faint)] p-[var(--sp-2)]"
  ></div>
{/snippet}

<Modal {open} title={name} eyebrow={$_('inventory.heading')} {onclose}>
  <div class="flex flex-col gap-[var(--gap-stack)] pb-[var(--sp-5)]">
    {#if movingItem}
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="font-bold text-[length:var(--text-body)]">
          {$_('inventory.moveTo', { values: { item: movingItem.name } })}
        </span>
        <Button variant="ghost" size="sm" onclick={oncancelmove}>{$_('inventory.back')}</Button>
      </div>

      <div class="flex flex-col gap-2">
        {#each recipients as recipient (recipient.id)}
          {@const recipientUsed = usedSlots(recipient.items)}
          {@const recipientMax = capacity(recipient.kind === 'hireling' ? HIRELING_LAYOUT : MOUSE_LAYOUT)}
          {@const wouldEncumber = recipientUsed + movingItem.slots > recipientMax}
          <button
            type="button"
            onclick={() => onmove(movingItem.id, recipient.id)}
            class="min-h-[var(--tap)] w-full flex items-center justify-between gap-2 px-[var(--sp-3)] py-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer"
          >
            <span class="flex items-center gap-2">
              <span class="font-bold text-[length:var(--text-body)]">{recipient.name}</span>
              {#if recipient.kind === 'hireling'}
                <Tag size="sm">{$_('liveSession.hirelingTag')}</Tag>
              {/if}
            </span>
            <span
              class="ww-num text-[length:var(--text-sm)] {wouldEncumber ? 'text-[var(--warning)]' : ''}"
            >
              {recipientUsed}/{recipientMax}
              {#if wouldEncumber}<span class="ww-label ml-1">{$_('inventory.willEncumber')}</span>{/if}
            </span>
          </button>
        {/each}
        {#if recipients.length === 0}
          <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('inventory.noRecipients')}</p>
        {/if}
      </div>
    {:else}
      <div class="font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--text-secondary)]">
        {$_('inventory.slotsUsed', { values: { used, max } })}
      </div>

      {#each sections as section (section.id)}
        <div>
          <div class="ww-label text-[length:var(--text-caption)] mb-1.5">{$_(`inventory.${section.id}`)}</div>
          <div class="grid grid-cols-2 gap-2">
            {#each section.cells as entry (entry.type === 'item' ? entry.item.id : entry.key)}
              {#if entry.type === 'item'}
                {@render cell(entry.item)}
              {:else}
                {@render empty()}
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    {/if}

    {#if notice}
      <div class="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
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
  </div>
</Modal>
