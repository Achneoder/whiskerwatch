<script lang="ts">
  import { _ } from 'svelte-i18n';

  interface Props {
    open: boolean;
    onclose?: () => void;
  }

  let { open, onclose }: Props = $props();

  type SectionId = 'saves' | 'damage' | 'conditions' | 'inventory' | 'reaction' | 'advancement' | 'hirelings';

  const sectionIds: SectionId[] = ['saves', 'damage', 'conditions', 'inventory', 'reaction', 'advancement', 'hirelings'];

  const conditionIds = ['exhausted', 'frightened', 'hungryThirsty', 'injured', 'incapacitated', 'unconscious'] as const;
  const reactionBandIds = ['hostile', 'unfriendly', 'unsure', 'talkative', 'helpful'] as const;

  // Plain (non-reactive) DOM ref bag — scrollIntoView is imperative, so these
  // don't need to be part of the reactivity graph like $state would.
  const sectionEls: Partial<Record<SectionId, HTMLElement>> = {};

  function jumpTo(id: SectionId) {
    sectionEls[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onclose?.();
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<div
  onclick={onclose}
  aria-hidden="true"
  class="fixed inset-0 z-100 bg-[color-mix(in_srgb,#1d130a_62%,transparent)] backdrop-blur-[2px] transition-opacity duration-[calc(var(--dur)*1ms)] ease-[var(--ease)] {open
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none'}"
></div>

<div
  role="dialog"
  aria-modal="true"
  aria-label={$_('rulesDrawer.title')}
  aria-hidden={!open}
  inert={!open}
  class="fixed inset-y-0 right-0 z-101 flex w-full sm:w-[420px] flex-col bg-[var(--surface-raised)] border-l border-[var(--border-strong)] shadow-[var(--shadow-modal)] transition-transform duration-[calc(var(--dur-slow)*1ms)] ease-[var(--ease)] {open
    ? 'translate-x-0'
    : 'translate-x-full'}"
>
  <!--
    Content only mounts while open — the outer panel above still slides via
    the transform classes (visible during the transition), but the static
    reference text doesn't need to sit in the DOM (and collide with
    getByText queries on the host screen) while the drawer is closed.
  -->
  {#if open}
  <div class="flex items-start justify-between gap-[var(--sp-3)] pt-[var(--sp-5)] px-[var(--sp-5)] pb-[var(--sp-3)]">
    <h2 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h2)] text-[var(--accent)]">
      {$_('rulesDrawer.title')}
    </h2>
    <button
      onclick={onclose}
      aria-label={$_('rulesDrawer.close')}
      class="shrink-0 min-w-[var(--tap)] min-h-[var(--tap)] grid place-items-center cursor-pointer bg-transparent border-none rounded-[var(--radius-md)] text-[var(--text-muted)] text-[22px] leading-none"
    >
      &times;
    </button>
  </div>

  <div class="sticky top-0 z-1 flex gap-[var(--sp-2)] overflow-x-auto px-[var(--sp-5)] pb-[var(--sp-3)] bg-[var(--surface-raised)]">
    {#each sectionIds as id (id)}
      <button
        type="button"
        onclick={() => jumpTo(id)}
        class="shrink-0 whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-[var(--surface-sunk)] px-[var(--sp-3)] py-1 text-[length:var(--text-caption)] font-bold uppercase tracking-[var(--ls-caption)] text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]"
      >
        {$_(`rulesDrawer.jump.${id}`)}
      </button>
    {/each}
  </div>

  <div class="flex-1 overflow-y-auto px-[var(--sp-5)] pb-[var(--sp-6)] flex flex-col">
    <!-- Saves -->
    <section bind:this={sectionEls.saves} class="pt-[var(--sp-4)]">
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.saves.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)]">{$_('rulesDrawer.saves.body')}</p>
      <p class="text-[length:var(--text-sm)] text-[var(--text-muted)] mt-2 italic">{$_('rulesDrawer.saves.note')}</p>
    </section>

    <hr class="border-t border-[var(--border)] my-[var(--sp-4)]" />

    <!-- Damage & death spiral -->
    <section bind:this={sectionEls.damage}>
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.damage.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)]">{$_('rulesDrawer.damage.body')}</p>
      <p class="text-[length:var(--text-sm)] text-[var(--text-muted)] mt-2 italic">{$_('rulesDrawer.damage.note')}</p>
    </section>

    <hr class="border-t border-[var(--border)] my-[var(--sp-4)]" />

    <!-- Conditions -->
    <section bind:this={sectionEls.conditions}>
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.conditions.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] mb-2">{$_('rulesDrawer.conditions.intro')}</p>
      <ul class="list-disc pl-5 flex flex-col gap-1.5">
        {#each conditionIds as conditionId (conditionId)}
          <li class="text-[length:var(--text-body)] text-[var(--text-secondary)]">
            <span class="font-bold text-[var(--text)]">{$_(`rulesDrawer.conditions.list.${conditionId}.label`)}</span>
            — {$_(`rulesDrawer.conditions.list.${conditionId}.note`)}
          </li>
        {/each}
      </ul>
    </section>

    <hr class="border-t border-[var(--border)] my-[var(--sp-4)]" />

    <!-- Inventory & slots -->
    <section bind:this={sectionEls.inventory}>
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.inventory.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)]">{$_('rulesDrawer.inventory.body')}</p>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] mt-2">{$_('rulesDrawer.inventory.usage')}</p>
    </section>

    <hr class="border-t border-[var(--border)] my-[var(--sp-4)]" />

    <!-- Reaction roll -->
    <section bind:this={sectionEls.reaction}>
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.reaction.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] mb-2">{$_('rulesDrawer.reaction.intro')}</p>
      <ul class="list-disc pl-5 flex flex-col gap-1.5">
        {#each reactionBandIds as bandId (bandId)}
          <li class="text-[length:var(--text-body)] text-[var(--text-secondary)]">
            <span class="font-bold text-[var(--text)]"
              >{$_(`rulesDrawer.reaction.range.${bandId}`)}—{$_(`reaction.band.${bandId}`)}:</span
            >
            {$_(`reaction.guidance.${bandId}`)}
          </li>
        {/each}
      </ul>
    </section>

    <hr class="border-t border-[var(--border)] my-[var(--sp-4)]" />

    <!-- Advancement -->
    <section bind:this={sectionEls.advancement}>
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.advancement.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)]">{$_('rulesDrawer.advancement.body')}</p>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] mt-2">{$_('rulesDrawer.advancement.rate')}</p>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] mt-1">{$_('rulesDrawer.advancement.thresholds')}</p>
    </section>

    <hr class="border-t border-[var(--border)] my-[var(--sp-4)]" />

    <!-- Hirelings -->
    <section bind:this={sectionEls.hirelings}>
      <h3 class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-h3)] text-[var(--accent)] mb-2">
        {$_('rulesDrawer.hirelings.heading')}
      </h3>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)]">{$_('rulesDrawer.hirelings.morale')}</p>
      <p class="text-[length:var(--text-body)] text-[var(--text-secondary)] mt-2">{$_('rulesDrawer.hirelings.body')}</p>
    </section>
  </div>
  {/if}
</div>
