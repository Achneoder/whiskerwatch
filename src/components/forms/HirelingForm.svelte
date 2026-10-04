<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Button from '../ui/Button.svelte';
  import ItemSlotGrid from './ItemSlotGrid.svelte';
  import { CONDITIONS, type ConditionName } from '../../lib/conditions';
  import { addItem, removeItem, updateItem, type Item } from '../../lib/items';
  import type { Hireling } from '../../lib/stores/hirelings.svelte';

  interface Props {
    initial?: Hireling | undefined;
    onsave: (data: Omit<Hireling, 'id'>) => void;
    oncancel: () => void;
  }

  let { initial, onsave, oncancel }: Props = $props();

  let name = $state(initial?.name ?? '');
  let role = $state(initial?.role ?? '');
  let hp = $state(initial?.hp ?? 3);
  let max = $state(initial?.max ?? 3);
  // 2d6 average — new hirelings start at a plausible mid-band Loyalty
  // instead of an arbitrary low number now that the real 2–12 scale is used.
  let loyalty = $state(initial?.loyalty ?? 7);
  // Plain GM-entered number, kept as text while editing (converted on
  // submit) so the field behaves like a normal text input rather than a
  // Stepper — wage isn't bumped mid-encounter the way HP/loyalty are.
  let wageInput = $state(String(initial?.wage ?? 0));
  let notes = $state(initial?.notes ?? '');
  let conditions = $state<ConditionName[]>(initial ? [...initial.conditions] : []);
  let items = $state<Item[]>(initial ? [...initial.items] : []);

  // STR/DEX/WIL and status/scars aren't editable from this form yet (that's
  // a follow-up pass) — an edit carries the hireling's existing values
  // forward unchanged, and a new hireling starts with placeholder scores.
  const conditionNames = Object.keys(CONDITIONS) as ConditionName[];

  $effect(() => {
    if (hp > max) hp = max;
  });

  function toggleCondition(condition: ConditionName) {
    conditions = conditions.includes(condition)
      ? conditions.filter((c) => c !== condition)
      : [...conditions, condition];
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const attributes = initial
      ? { str: initial.str, maxStr: initial.maxStr, dex: initial.dex, wil: initial.wil, status: initial.status, scars: initial.scars }
      : { str: 10, maxStr: 10, dex: 10, wil: 10, status: 'active' as const, scars: [] };
    const wage = Math.max(0, Number(wageInput) || 0);
    onsave({ name: name.trim(), role: role.trim(), hp, max, loyalty, wage, notes: notes.trim(), conditions, items, ...attributes });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--sp-4)]">
  <Input label={$_('roster.form.name')} bind:value={name} required />
  <div class="flex gap-[var(--sp-4)] flex-wrap">
    <div class="flex-1 min-w-40"><Input label={$_('roster.form.role')} bind:value={role} /></div>
    <div class="flex-1 min-w-32">
      <Input label={$_('roster.form.wage')} help={$_('help.wage')} type="number" min="0" bind:value={wageInput} />
    </div>
  </div>

  <div class="flex gap-[var(--sp-5)] flex-wrap">
    <Stepper label={$_('roster.form.hp')} help={$_('help.hp')} value={hp} min={0} max={max} size="md" onchange={(v) => (hp = v)} />
    <Stepper label={$_('roster.form.maxHp')} value={max} min={1} max={12} size="md" onchange={(v) => (max = v)} />
    <Stepper
      label={$_('roster.form.loyalty')}
      help={$_('help.loyalty')}
      value={loyalty}
      min={2}
      max={18}
      size="md"
      onchange={(v) => (loyalty = v)}
    />
  </div>

  <Input label={$_('roster.form.notes')} bind:value={notes} placeholder={$_('roster.form.notesPlaceholder')} />

  <div class="flex flex-col gap-2">
    <span class="ww-label">{$_('roster.form.conditions')}</span>
    <div class="flex gap-x-4 gap-y-2 flex-wrap">
      {#each conditionNames as condition (condition)}
        <label class="inline-flex items-center gap-1.5 text-[length:var(--text-sm)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={conditions.includes(condition)}
            onchange={() => toggleCondition(condition)}
          />
          {CONDITIONS[condition].label}
        </label>
      {/each}
    </div>
  </div>

  <ItemSlotGrid
    {items}
    onadd={(input) => (items = addItem(items, input))}
    onremove={(itemId) => (items = removeItem(items, itemId))}
    onupdate={(itemId, patch) => (items = updateItem(items, itemId, patch))}
  />

  <div class="flex justify-end gap-[var(--gap-inline)] pt-[var(--sp-2)]">
    <Button type="button" variant="ghost" onclick={oncancel}>{$_('roster.form.cancel')}</Button>
    <Button type="submit" variant="primary">{$_('roster.form.save')}</Button>
  </div>
</form>
