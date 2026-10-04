<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import HelpTip from './HelpTip.svelte';

  interface Props extends Omit<HTMLInputAttributes, 'size' | 'prefix'> {
    label?: string;
    hint?: string;
    /** Optional explanation shown in a HelpTip next to the label. */
    help?: string;
    error?: string;
    prefix?: Snippet;
    suffix?: Snippet;
    size?: 'sm' | 'md' | 'live';
    value?: string;
  }

  let {
    label,
    hint,
    help,
    error,
    prefix,
    suffix,
    size = 'md',
    id,
    value = $bindable(''),
    ...rest
  }: Props = $props();

  const generatedId = `input-${Math.random().toString(36).slice(2, 9)}`;
  const rid = $derived(id ?? generatedId);
  let focused = $state(false);

  const dims = {
    sm: { py: 'py-1.5', px: 'px-2.5', font: 'text-[length:var(--text-sm)]', min: 'min-h-8' },
    md: {
      py: 'py-[var(--pad-control-y)]',
      px: 'px-[var(--pad-control-x)]',
      font: 'text-[length:var(--text-body)]',
      min: 'min-h-[var(--tap)]',
    },
    live: { py: 'py-[var(--sp-4)]', px: 'px-[var(--sp-4)]', font: 'text-[length:var(--text-title)]', min: 'min-h-[var(--tap)]' },
  } as const;

  const d = $derived(dims[size]);
  const ringColor = $derived(error ? 'var(--danger)' : 'var(--accent)');
  const borderColor = $derived(error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border-strong)');
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label && help}
    <div class="flex items-center gap-1.5">
      <label for={rid} class="ww-label">{label}</label>
      <HelpTip text={help} {label} />
    </div>
  {:else if label}
    <label for={rid} class="ww-label">{label}</label>
  {/if}
  <div
    class="flex items-center gap-2 {d.min} {d.px} bg-[var(--surface-raised)] rounded-[var(--radius-md)] transition-[border-color,box-shadow] duration-[calc(var(--dur-fast)*1ms)] ease-[var(--ease)]"
    style:border="1px solid {borderColor}"
    style:box-shadow={focused
      ? `var(--shadow-inset), 0 0 0 3px color-mix(in srgb, ${ringColor} 32%, transparent)`
      : 'var(--shadow-inset)'}
  >
    {#if prefix}
      <span class="text-[var(--text-muted)] inline-flex shrink-0">{@render prefix()}</span>
    {/if}
    <input
      id={rid}
      bind:value
      onfocus={() => (focused = true)}
      onblur={() => (focused = false)}
      class="ww-no-native-ring flex-1 min-w-0 border-none outline-none bg-transparent {d.py} {d.font} text-[var(--text)] leading-[var(--lh-body)] font-[family-name:var(--font-body)]"
      {...rest}
    />
    {#if suffix}
      <span class="text-[var(--text-muted)] inline-flex shrink-0">{@render suffix()}</span>
    {/if}
  </div>
  {#if hint || error}
    <span
      class="text-[length:var(--text-sm)] font-[family-name:var(--font-body)]"
      style:color={error ? 'var(--danger-hover)' : 'var(--text-muted)'}
    >
      {error || hint}
    </span>
  {/if}
</div>
