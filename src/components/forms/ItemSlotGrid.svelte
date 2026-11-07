<script lang="ts">
  import HelpTip from '../ui/HelpTip.svelte';
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Button from '../ui/Button.svelte';
  import {
    MOUSE_LAYOUT,
    capacity,
    usedSlots,
    isOverCapacity,
    splitSections,
    moveItemToSection,
    swapItems,
    type InventoryLayout,
    type InventorySection,
    type Item,
  } from '../../lib/items';

  interface Props {
    items: Item[];
    onadd: (input: Omit<Item, 'id'>) => void;
    onremove: (itemId: string) => void;
    onupdate: (itemId: string, patch: Partial<Omit<Item, 'id'>>) => void;
    /**
     * Called with the whole rearranged list after a drag and drop (move to
     * another section, or swap two items). Leave it out and items can't be
     * dragged.
     */
    onarrange?: (items: Item[]) => void;
    /** Slot layout — defaults to a player mouse's; hirelings pass `HIRELING_LAYOUT`. */
    layout?: InventoryLayout;
  }

  let { items, onadd, onremove, onupdate, onarrange, layout = MOUSE_LAYOUT }: Props = $props();

  const slotChoices: (1 | 2)[] = [1, 2];

  type CellEntry = { type: 'item'; item: Item } | { type: 'empty'; key: string };

  type EditingState =
    | { kind: 'add'; section: InventorySection; key: string }
    | { kind: 'edit'; itemId: string }
    | null;

  let editing = $state<EditingState>(null);
  let draftName = $state('');
  let draftSlots = $state<1 | 2>(1);
  let draftChargeTrack = $state(0);
  let draftNotes = $state('');

  function buildCells(sectionItems: Item[], sectionSlots: number, prefix: string, minEmpty: number): CellEntry[] {
    const cells: CellEntry[] = sectionItems.map((item) => ({ type: 'item', item }));
    const used = sectionItems.reduce((total, item) => total + item.slots, 0);
    const emptyCount = Math.max(minEmpty, sectionSlots - used);
    for (let i = 0; i < emptyCount; i += 1) {
      cells.push({ type: 'empty', key: `${prefix}-empty-${i}` });
    }
    return cells;
  }

  const split = $derived(splitSections(items, layout));
  // Encumbered is a soft warning, never a block (see items.ts) — so the pack
  // always keeps at least one "add" affordance, rather than the grid running
  // out of empty cells to tap once the GM is over capacity. (New items are
  // appended and packed in order, so the pack's add cell works for any section.)
  const sections = $derived(
    (['paws', 'body', 'pack'] as const).map((id) => ({
      id,
      cells: buildCells(split[id], layout[id], id, id === 'pack' ? 1 : 0),
    })),
  );
  const used = $derived(usedSlots(items));
  const max = $derived(capacity(layout));
  const encumbered = $derived(isOverCapacity(items, layout));

  function startAdd(section: InventorySection, key: string) {
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
    else if (editing?.kind === 'add') onadd({ ...patch, section: editing.section });
    editing = null;
  }

  function removeDraft() {
    if (editing?.kind === 'edit') onremove(editing.itemId);
    editing = null;
  }

  // ---- Drag and drop -------------------------------------------------------
  // Pointer events rather than the HTML5 drag API, because the latter does
  // nothing on most phone/tablet browsers and this grid gets used at the
  // table. A mouse/pen drag starts after a few pixels of movement; a finger
  // drag starts after a short long-press, so a normal swipe still scrolls
  // the form. A plain tap/click still opens the editor.

  // `key` is set when the pointer is over one particular empty cell (so only that cell lights up),
  // and absent when it is over the section's free space around the cells.
  type DropTarget = { kind: 'item'; itemId: string } | { kind: 'section'; section: InventorySection; key?: string };

  interface DragState {
    item: Item;
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
    target: DropTarget | null;
  }

  const MOUSE_DRAG_THRESHOLD = 6;
  const TOUCH_SCROLL_TOLERANCE = 10;
  const LONG_PRESS_MS = 300;

  let drag = $state<DragState | null>(null);
  let dropMessage = $state('');
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  // The click that follows a finished drag's pointerup must not open the editor.
  let suppressClick = false;

  function arrange(target: DropTarget, itemId: string): Item[] | null {
    return target.kind === 'item'
      ? swapItems(items, itemId, target.itemId, layout)
      : moveItemToSection(items, itemId, target.section, layout);
  }

  const dropAllowed = $derived(drag?.active && drag.target ? arrange(drag.target, drag.item.id) !== null : false);

  function targetAt(x: number, y: number): DropTarget | null {
    const el = document.elementFromPoint?.(x, y)?.closest<HTMLElement>('[data-drop-item], [data-drop-section]');
    if (!el) return null;
    const itemId = el.dataset.dropItem;
    if (itemId) return { kind: 'item', itemId };
    const section = el.dataset.dropSection as InventorySection | undefined;
    if (!section) return null;
    const key = el.dataset.dropKey;
    return key ? { kind: 'section', section, key } : { kind: 'section', section };
  }

  function isTargeted(target: DropTarget): boolean {
    const current = drag?.active ? drag.target : null;
    if (!current) return false;
    if (current.kind === 'item' || target.kind === 'item') {
      return current.kind === 'item' && target.kind === 'item' && current.itemId === target.itemId;
    }
    return current.section === target.section && current.key === target.key;
  }

  function activateDrag() {
    if (!drag) return;
    drag.active = true;
    dropMessage = '';
    drag.target = targetAt(drag.x, drag.y);
  }

  function endDrag() {
    clearTimeout(longPressTimer);
    drag = null;
  }

  function onSlotPointerDown(event: PointerEvent, item: Item) {
    if (!onarrange || editing || event.button !== 0 || !event.isPrimary) return;
    drag = {
      item,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
      target: null,
    };
    if (event.pointerType === 'touch') {
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(activateDrag, LONG_PRESS_MS);
    }
  }

  function onWindowPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active) {
      if (drag.pointerType === 'touch') {
        // Finger moved before the long-press fired: it's a scroll, not a drag.
        if (distance > TOUCH_SCROLL_TOLERANCE) endDrag();
        return;
      }
      if (distance < MOUSE_DRAG_THRESHOLD) return;
      activateDrag();
      return;
    }
    drag.target = targetAt(event.clientX, event.clientY);
  }

  function onWindowPointerUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { active, target, item } = drag;
    endDrag();
    if (!active) return;
    suppressClick = true;
    // Clear the flag if no click follows (e.g. the pointer was released over another element).
    setTimeout(() => (suppressClick = false), 0);
    if (!target || (target.kind === 'item' && target.itemId === item.id)) return;
    const next = arrange(target, item.id);
    if (next) {
      onarrange?.(next);
      dropMessage = '';
    } else {
      dropMessage = $_('inventory.dropDoesNotFit', { values: { name: item.name } });
    }
  }

  function onSlotClick(item: Item) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    startEdit(item);
  }

  $effect(() => {
    if (!drag) return;
    // While a finger drag is active, stop the page from scrolling under it.
    // Must be a non-passive listener for preventDefault to take effect.
    const blockScroll = (event: TouchEvent) => {
      if (drag?.active) event.preventDefault();
    };
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('touchmove', blockScroll);
    };
  });

  $effect(() => () => clearTimeout(longPressTimer));

  function dropHighlight(target: DropTarget): string {
    if (!isTargeted(target)) return '';
    return dropAllowed
      ? 'outline-2 outline-offset-2 outline-[var(--accent)]'
      : 'outline-2 outline-offset-2 outline-dashed outline-[var(--warning)]';
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

{#snippet emptySlot(section: InventorySection, key: string)}
  <button
    type="button"
    onclick={() => startAdd(section, key)}
    aria-label={$_('inventory.emptySlotAria')}
    data-drop-section={section}
    data-drop-key={key}
    class="{dropHighlight({ kind: 'section', section, key })} min-h-19 flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-strong)] text-[var(--text-faint)] cursor-pointer p-[var(--sp-2)] text-center"
  >
    <span class="text-[length:var(--text-title)] font-bold leading-none" aria-hidden="true">+</span>
    <span class="text-[length:var(--text-sm)]">{$_('inventory.addItem')}</span>
  </button>
{/snippet}

{#snippet filledSlot(item: Item)}
  <button
    type="button"
    onclick={() => onSlotClick(item)}
    onpointerdown={(event) => onSlotPointerDown(event, item)}
    oncontextmenu={(event) => {
      // A long-press on touch would otherwise open the browser's context menu mid-drag.
      if (drag?.pointerType === 'touch') event.preventDefault();
    }}
    aria-label={filledAria(item)}
    data-drop-item={item.id}
    class="{dropHighlight({ kind: 'item', itemId: item.id })} {drag?.active && drag.item.id === item.id
      ? 'opacity-40'
      : ''} {onarrange ? 'select-none [-webkit-touch-callout:none]' : ''} relative min-h-19 {item.slots === 2
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
      {$_('inventory.slotsUsed', { values: { used, max } })}
    </span>
  </div>

  {#if encumbered}
    <div
      class="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-tint)] px-[var(--sp-4)] py-[var(--sp-3)] text-[length:var(--text-sm)] text-[var(--warning)]"
    >
      <span aria-hidden="true">⚠️</span>
      <span><b>{$_('inventory.encumberedTitle')}</b> {$_('inventory.encumberedMessage')}</span>
    </div>
  {/if}

  {#if onarrange && items.length > 0}
    <p class="text-[length:var(--text-caption)] text-[var(--text-faint)]">{$_('inventory.dragHint')}</p>
  {/if}

  <p aria-live="polite" class="text-[length:var(--text-sm)] text-[var(--warning)] empty:hidden">{dropMessage}</p>

  {#each sections as section (section.id)}
    <div data-drop-section={section.id} class="{dropHighlight({ kind: 'section', section: section.id })} rounded-[var(--radius-md)]">
      <div class="ww-label text-[length:var(--text-caption)] mb-1.5">{$_(`inventory.${section.id}`)}</div>
      <div class="grid grid-cols-2 {section.id === 'pack' ? 'min-[600px]:grid-cols-3' : ''} gap-2">
        {#each section.cells as cell (cell.type === 'item' ? cell.item.id : cell.key)}
          {#if editing?.kind === 'edit' && cell.type === 'item' && editing.itemId === cell.item.id}
            {@render editor()}
          {:else if editing?.kind === 'add' && cell.type === 'empty' && editing.section === section.id && editing.key === cell.key}
            {@render editor()}
          {:else if cell.type === 'item'}
            {@render filledSlot(cell.item)}
          {:else}
            {@render emptySlot(section.id, cell.key)}
          {/if}
        {/each}
      </div>
    </div>
  {/each}
</div>

{#if drag?.active}
  <!-- Floating "ghost" of the dragged item that follows the pointer. -->
  <div
    aria-hidden="true"
    class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-md)] border-2 border-[var(--accent)] bg-[var(--surface-raised)] px-[var(--sp-3)] py-[var(--sp-2)] text-[length:var(--text-sm)] font-bold shadow-lg"
    style="left: {drag.x}px; top: {drag.y}px;"
  >
    {drag.item.name}
  </div>
{/if}
