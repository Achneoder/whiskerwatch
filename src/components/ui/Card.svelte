<script lang="ts">
  import HelpTip from './HelpTip.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    eyebrow?: string;
    /** Optional explanation shown in a HelpTip next to the eyebrow. */
    eyebrowHelp?: string;
    actions?: Snippet;
    footer?: Snippet | undefined;
    interactive?: boolean;
    onclick?: (event: MouseEvent) => void;
    class?: string;
    style?: string | undefined;
    children: Snippet;
  }

  let {
    title,
    eyebrow,
    eyebrowHelp,
    actions,
    footer,
    interactive = false,
    onclick,
    class: className = '',
    style,
    children,
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (!interactive || !onclick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onclick(event as unknown as MouseEvent);
    }
  }
</script>

<!--
  When interactive, this div is given role="button", keyboard handling, and a
  focusable tabindex together — a self-consistent button. svelte-check can't see
  through the conditional role to know the tabindex is on an interactive element.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  {onclick}
  onkeydown={interactive ? handleKeydown : undefined}
  {style}
  role={interactive ? 'button' : undefined}
  tabindex={interactive ? 0 : undefined}
  class="flex flex-col bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden transition-[box-shadow,transform] duration-[calc(var(--dur)*1ms)] ease-[var(--ease)] {interactive
    ? 'cursor-pointer hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5'
    : ''} {className}"
>
  {#if title || eyebrow || actions}
    <div class="flex items-start justify-between gap-[var(--sp-3)] pt-[var(--pad-card)] px-[var(--pad-card)]">
      <div class="min-w-0">
        {#if eyebrow}
          {#if eyebrowHelp}
            <div class="flex items-center gap-1.5 mb-1">
              <span class="ww-label">{eyebrow}</span>
              <HelpTip text={eyebrowHelp} label={eyebrow} />
            </div>
          {:else}
            <div class="ww-label mb-1">{eyebrow}</div>
          {/if}
        {/if}
        {#if title}
          <div
            class="font-[family-name:var(--font-display)] text-[length:var(--text-title)] font-bold text-[var(--text)] leading-[var(--lh-heading)]"
          >
            {title}
          </div>
        {/if}
      </div>
      {#if actions}
        <div class="flex shrink-0 gap-[var(--gap-inline)]">{@render actions()}</div>
      {/if}
    </div>
  {/if}
  <div class="p-[var(--pad-card)] flex-1">{@render children()}</div>
  {#if footer}
    <div
      class="px-[var(--pad-card)] py-[var(--sp-3)] border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-sunk)_45%,transparent)]"
    >
      {@render footer()}
    </div>
  {/if}
</div>
