<script lang="ts">
  import { X } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Textarea from '../ui/Textarea.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import type { BestiaryEntry, BestiaryCategory, BestiaryAttack } from '../../lib/stores/bestiary.svelte';

  interface Props {
    initial?: BestiaryEntry | undefined;
    onsave: (data: Omit<BestiaryEntry, 'id'>) => void;
    oncancel: () => void;
  }

  let { initial, onsave, oncancel }: Props = $props();

  const categories: BestiaryCategory[] = ['Vermin', 'Beast', 'Bird of Prey', 'Humanoid', 'Aberration'];

  let name = $state(initial?.name ?? '');
  let category = $state<BestiaryCategory>(initial?.category ?? 'Vermin');
  let hd = $state(initial?.hd ?? 1);
  let hp = $state(initial?.hp ?? 2);
  let armor = $state(initial?.armor ?? 0);
  let attacks = $state<BestiaryAttack[]>(initial ? initial.attacks.map((a) => ({ ...a })) : []);
  let special = $state(initial?.special ?? '');
  let notes = $state(initial?.notes ?? '');

  let newAttackName = $state('');
  let newAttackDamage = $state('');

  function addAttack() {
    const attackName = newAttackName.trim();
    const damage = newAttackDamage.trim();
    if (!attackName || !damage) return;
    attacks.push({ name: attackName, damage });
    newAttackName = '';
    newAttackDamage = '';
  }

  function removeAttack(index: number) {
    attacks.splice(index, 1);
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onsave({ name: name.trim(), category, hd, hp, armor, attacks, special: special.trim(), notes: notes.trim() });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--sp-4)]">
  <Input label={$_('bestiary.form.name')} bind:value={name} required />

  <div class="flex flex-col gap-1.5">
    <span class="ww-label">{$_('bestiary.form.category')}</span>
    <select
      bind:value={category}
      class="h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)] w-fit"
    >
      {#each categories as c (c)}
        <option value={c}>{$_(`bestiary.category.${c}`)}</option>
      {/each}
    </select>
  </div>

  <div class="flex gap-[var(--sp-5)] flex-wrap">
    <Stepper label={$_('bestiary.form.hd')} value={hd} min={1} max={20} size="md" onchange={(v) => (hd = v)} />
    <Stepper label={$_('bestiary.form.hp')} value={hp} min={1} max={99} size="md" onchange={(v) => (hp = v)} />
    <Stepper label={$_('bestiary.form.armor')} help={$_('help.armor')} value={armor} min={0} max={9} size="md" onchange={(v) => (armor = v)} />
  </div>

  <div class="flex flex-col gap-2">
    <span class="ww-label">{$_('bestiary.form.attacks')}</span>
    {#if attacks.length > 0}
      <ul class="flex flex-col gap-1.5">
        {#each attacks as attack, i (attack.name + i)}
          <li
            class="flex items-center justify-between gap-2 py-1.5 px-3 bg-[var(--surface-sunk)] rounded-[var(--radius-md)] text-[length:var(--text-sm)]"
          >
            <span><strong class="font-semibold">{attack.name}</strong> ({attack.damage})</span>
            <button
              type="button"
              aria-label={$_('roster.delete')}
              onclick={() => removeAttack(i)}
              class="grid place-items-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
            >
              <Icon icon={X} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex gap-2 flex-wrap">
      <div class="flex-1 min-w-32">
        <Input bind:value={newAttackName} size="sm" placeholder={$_('bestiary.form.attackNamePlaceholder')} />
      </div>
      <div class="flex-1 min-w-32">
        <Input bind:value={newAttackDamage} size="sm" placeholder={$_('bestiary.form.attackDamagePlaceholder')} />
      </div>
      <Button type="button" variant="secondary" size="sm" onclick={addAttack}>{$_('roster.form.addCondition')}</Button>
    </div>
  </div>

  <Textarea label={$_('bestiary.form.special')} bind:value={special} rows={3} />
  <Textarea label={$_('bestiary.form.notes')} bind:value={notes} rows={2} />

  <div class="flex justify-end gap-[var(--gap-inline)] pt-[var(--sp-2)]">
    <Button type="button" variant="ghost" onclick={oncancel}>{$_('roster.form.cancel')}</Button>
    <Button type="submit" variant="primary">{$_('roster.form.save')}</Button>
  </div>
</form>
