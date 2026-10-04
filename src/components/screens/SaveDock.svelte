<script lang="ts">
  import { Dices } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Button from '../ui/Button.svelte';
  import DiceRoll from '../ui/DiceRoll.svelte';
  import Icon from '../ui/Icon.svelte';
  import { rollSave, rollMoraleSave } from '../../lib/generators/save';

  export interface Saveable {
    id: string;
    name: string;
    str: number;
    dex: number;
    wil: number;
    /** Only set for hirelings (true = loyal/well-paid, Advantage) — mice don't make morale saves, so the Morale button doesn't render for them. */
    loyal?: boolean;
  }

  type Attribute = 'str' | 'dex' | 'wil' | 'morale';

  interface Props {
    members: Saveable[];
  }

  let { members }: Props = $props();

  let selectedId = $state<string | null>(null);
  let attribute = $state<Attribute>('str');
  let result = $state<{
    name: string;
    attribute: Attribute;
    dice: number[];
    notation: string;
    roll: number;
    passed: boolean;
  } | null>(null);

  // Keep the selection valid as the roster changes (a member dies, is
  // removed, or this is the first render) without forcing the caller to
  // manage selection state.
  $effect(() => {
    if (selectedId && members.some((m) => m.id === selectedId)) return;
    selectedId = members[0]?.id ?? null;
  });

  const selected = $derived(members.find((m) => m.id === selectedId) ?? null);

  const attributes: Exclude<Attribute, 'morale'>[] = ['str', 'dex', 'wil'];

  // Switching to a mouse (no morale saves) while Morale is selected would
  // strand the dock on an attribute with nothing to roll — fall back to STR.
  $effect(() => {
    if (attribute === 'morale' && selected?.loyal == null) attribute = 'str';
  });

  function roll() {
    if (!selected) return;
    if (attribute === 'morale') {
      if (selected.loyal == null) return;
      const outcome = rollMoraleSave(selected.wil, selected.loyal);
      result = {
        name: selected.name,
        attribute,
        dice: outcome.dice,
        notation: outcome.advantage ? '2d20 (Adv)' : 'd20',
        roll: outcome.roll,
        passed: outcome.passed,
      };
      return;
    }
    const outcome = rollSave(selected[attribute]);
    result = { name: selected.name, attribute, dice: [outcome.roll], notation: 'd20', roll: outcome.roll, passed: outcome.passed };
  }
</script>

<div
  class="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] p-[var(--sp-5)] flex flex-col items-center gap-[var(--sp-4)] shadow-[var(--shadow-lg)]"
>
  {#if result}
    <DiceRoll
      dice={result.dice}
      notation={result.notation}
      total={result.roll}
      outcome={result.passed ? 'success' : 'fail'}
      label={$_('liveSession.saveResultLabel', {
        values: { name: result.name, attribute: result.attribute === 'morale' ? $_('liveSession.morale') : result.attribute.toUpperCase() },
      })}
      size="live"
    />
  {/if}

  {#if members.length === 0}
    <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('liveSession.noSaveable')}</p>
  {:else}
    <div class="flex gap-[var(--sp-3)] w-full max-w-160 flex-wrap items-center justify-center">
      <label class="flex items-center gap-2 min-h-[var(--tap)]">
        <span class="ww-label">{$_('liveSession.pickMouse')}</span>
        <select
          bind:value={selectedId}
          class="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] py-2 px-3 text-[length:var(--text-body)] min-h-[var(--tap)]"
        >
          {#each members as member (member.id)}
            <option value={member.id}>{member.name}</option>
          {/each}
        </select>
      </label>
      <div class="flex gap-2 flex-wrap">
        {#each attributes as attr (attr)}
          <Button variant={attribute === attr ? 'primary' : 'ghost'} size="md" onclick={() => (attribute = attr)}>
            {attr.toUpperCase()}{selected ? ` ${selected[attr]}` : ''}
          </Button>
        {/each}
        {#if selected?.loyal != null}
          <button
            type="button"
            onclick={() => (attribute = 'morale')}
            class="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-[family-name:var(--font-display)] font-semibold leading-none cursor-pointer min-h-[var(--tap)] py-[var(--pad-control-y)] px-[var(--pad-control-x)] text-[length:var(--text-body)] transition-[background,transform,border-color] duration-[calc(var(--dur-fast)*1ms)] ease-[var(--ease)] active:translate-y-px {attribute ===
            'morale'
              ? 'bg-[var(--accent)] text-[var(--on-accent)] border border-[var(--accent)] shadow-[var(--shadow-sm)]'
              : 'bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent)]'}"
          >
            {$_('liveSession.morale')} {selected.wil}{selected.loyal ? ' · Adv' : ''}
          </button>
        {/if}
      </div>
    </div>
    <div class="flex gap-[var(--sp-3)] w-full max-w-160">
      <Button variant="primary" size="live" block disabled={!selected} onclick={roll}>
        {#snippet icon()}
          <Icon icon={Dices} size="live" />
        {/snippet}
        {$_('liveSession.rollSave')}
      </Button>
    </div>
  {/if}
</div>
