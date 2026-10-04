<script lang="ts">
  import HelpTip from './HelpTip.svelte';

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    /** Optional explanation shown in a HelpTip next to the label. */
    help?: string;
    tone?: 'accent' | 'hp';
    size?: 'sm' | 'md' | 'live';
    onchange?: (value: number) => void;
  }

  let { value = 0, min = 0, max = 99, step = 1, label, help, tone = 'accent', size = 'live', onchange }: Props = $props();

  function clamp(v: number) {
    return Math.max(min, Math.min(max, v));
  }

  function bump(sign: 1 | -1) {
    if (sign < 0 && value <= min) return;
    if (sign > 0 && value >= max) return;
    onchange?.(clamp(value + sign * step));
  }

  const color = $derived(tone === 'hp' ? 'var(--hp)' : 'var(--accent)');
  const btnSz = $derived(size === 'live' ? 56 : size === 'sm' ? 28 : 40);
  const valSz = $derived(size === 'live' ? 'var(--stat-lg)' : size === 'sm' ? 'var(--text-sm)' : 'var(--stat-md)');
  const gapClass = $derived(size === 'sm' ? 'gap-1.5' : 'gap-[var(--sp-4)]');
</script>

<div class="flex flex-col gap-1.5 items-center">
  {#if label && help}
    <span class="flex items-center gap-1.5">
      <span class="ww-label">{label}</span>
      <HelpTip text={help} {label} />
    </span>
  {:else if label}
    <span class="ww-label">{label}</span>
  {/if}
  <div class="flex items-center {gapClass}">
    <button
      type="button"
      onclick={() => bump(-1)}
      disabled={value <= min}
      aria-label="Decrease"
      class="shrink-0 grid place-items-center font-bold leading-none font-[family-name:var(--font-display)] bg-[var(--surface-raised)] rounded-[var(--radius-md)] transition-transform duration-[calc(var(--dur-fast)*1ms)] ease-[var(--ease)] active:scale-[0.92] disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
      style:width="{btnSz}px"
      style:height="{btnSz}px"
      style:font-size="{btnSz * 0.5}px"
      style:color={value <= min ? 'var(--text-faint)' : color}
      style:border="2px solid {value <= min ? 'var(--border)' : color}"
      style:box-shadow={value <= min ? 'none' : 'var(--shadow-sm)'}
    >
      &minus;
    </button>
    <span
      class="ww-num text-center font-bold text-[var(--text)] leading-none"
      style:min-width="{size === 'live' ? 64 : size === 'sm' ? 22 : 44}px"
      style:font-size={valSz}
    >
      {value}
    </span>
    <button
      type="button"
      onclick={() => bump(1)}
      disabled={value >= max}
      aria-label="Increase"
      class="shrink-0 grid place-items-center font-bold leading-none font-[family-name:var(--font-display)] bg-[var(--surface-raised)] rounded-[var(--radius-md)] transition-transform duration-[calc(var(--dur-fast)*1ms)] ease-[var(--ease)] active:scale-[0.92] disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
      style:width="{btnSz}px"
      style:height="{btnSz}px"
      style:font-size="{btnSz * 0.5}px"
      style:color={value >= max ? 'var(--text-faint)' : color}
      style:border="2px solid {value >= max ? 'var(--border)' : color}"
      style:box-shadow={value >= max ? 'none' : 'var(--shadow-sm)'}
    >
      +
    </button>
  </div>
</div>
