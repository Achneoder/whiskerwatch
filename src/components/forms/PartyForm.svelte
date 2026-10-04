<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Button from '../ui/Button.svelte';
  import ItemSlotGrid from './ItemSlotGrid.svelte';
  import { CONDITIONS, type ConditionName, conditionLabelKey } from '../../lib/conditions';
  import { addItem, removeItem, updateItem, type Item } from '../../lib/items';
  import type { PartyMember } from '../../lib/stores/party.svelte';

  interface Props {
    initial?: PartyMember | undefined;
    onsave: (data: Omit<PartyMember, 'id'>) => void;
    oncancel: () => void;
  }

  let { initial, onsave, oncancel }: Props = $props();

  let name = $state(initial?.name ?? '');
  let role = $state(initial?.role ?? '');
  let hp = $state(initial?.hp ?? 6);
  let max = $state(initial?.max ?? 6);
  let pips = $state(initial?.pips ?? 0);
  let conditions = $state<ConditionName[]>(initial ? [...initial.conditions] : []);
  let items = $state<Item[]>(initial ? [...initial.items] : []);

  // STR/DEX/WIL, XP/level, status, and scars aren't editable from this form
  // yet (that's a follow-up pass) — an edit carries the member's existing
  // values forward unchanged, and a new member starts with placeholder
  // starting scores until character-creation-style stat entry exists.
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
      ? {
          str: initial.str,
          maxStr: initial.maxStr,
          dex: initial.dex,
          wil: initial.wil,
          xp: initial.xp,
          level: initial.level,
          status: initial.status,
          scars: initial.scars,
        }
      : { str: 10, maxStr: 10, dex: 10, wil: 10, xp: 0, level: 1, status: 'active' as const, scars: [] };
    onsave({ name: name.trim(), role: role.trim(), hp, max, pips, conditions, items, ...attributes });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--sp-4)]">
  <Input label={$_('roster.form.name')} bind:value={name} required />
  <Input label={$_('roster.form.role')} bind:value={role} />

  <div class="flex gap-[var(--sp-5)] flex-wrap">
    <Stepper label={$_('roster.form.hp')} help={$_('help.hp')} value={hp} min={0} max={max} size="md" onchange={(v) => (hp = v)} />
    <Stepper label={$_('roster.form.maxHp')} value={max} min={1} max={12} size="md" onchange={(v) => (max = v)} />
    <Stepper label={$_('roster.form.pips')} help={$_('help.pips')} value={pips} min={0} max={9999} step={5} size="md" onchange={(v) => (pips = v)} />
  </div>

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
          {$_(conditionLabelKey(condition))}
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
