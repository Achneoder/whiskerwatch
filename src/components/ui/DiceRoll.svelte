<script lang="ts">
  interface Props {
    dice?: number[];
    notation?: string;
    total?: number | null;
    outcome?: 'success' | 'fail' | 'partial' | 'neutral' | 'hostile' | 'unfriendly' | 'unsure' | 'talkative' | 'helpful';
    label?: string;
    size?: 'md' | 'live';
  }

  let { dice = [], notation = '', total = null, outcome = 'neutral', label, size = 'md' }: Props = $props();

  let settled = $state(false);
  $effect(() => {
    // re-run the settle-in transition whenever a new roll comes in
    void dice;
    void total;
    settled = false;
    const t = setTimeout(() => (settled = true), 20);
    return () => clearTimeout(t);
  });

  const sum = $derived(total != null ? total : dice.reduce((a, b) => a + b, 0));

  const skins = {
    success: { fg: 'var(--success)', bg: 'var(--success-tint)', word: 'Success' },
    fail: { fg: 'var(--danger-hover)', bg: 'var(--danger-tint)', word: 'Failure' },
    partial: { fg: 'var(--warning)', bg: 'var(--warning-tint)', word: 'Partial' },
    neutral: { fg: 'var(--text-secondary)', bg: 'var(--surface-sunk)', word: null },
    // Reaction-roll bands (see `rollReaction`/`ReactionResult.svelte`) — five
    // SRD tones rather than pass/fail, so each band gets its own skin. Hostile
    // reuses the "fail" danger tone, helpful reuses "success", unfriendly
    // reuses "partial"'s warning tone; talkative is the one genuinely new tone
    // (accent), and unsure shares the existing neutral skin.
    hostile: { fg: 'var(--danger-hover)', bg: 'var(--danger-tint)', word: null },
    unfriendly: { fg: 'var(--warning)', bg: 'var(--warning-tint)', word: null },
    unsure: { fg: 'var(--text-secondary)', bg: 'var(--surface-sunk)', word: null },
    talkative: { fg: 'var(--accent)', bg: 'var(--accent-tint)', word: null },
    helpful: { fg: 'var(--success)', bg: 'var(--success-tint)', word: null },
  } as const;

  const skin = $derived(skins[outcome]);
  const faceSz = $derived(size === 'live' ? 52 : 40);
</script>

<div
  class="inline-flex flex-col gap-[var(--sp-3)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] text-center {size ===
  'live'
    ? 'p-[var(--sp-5)] min-w-60'
    : 'p-[var(--sp-4)] min-w-45'}"
>
  {#if label}
    <div class="ww-label">{label}</div>
  {/if}

  <div class="flex gap-2 justify-center flex-wrap">
    {#each dice as d, i (i)}
      <div
        class="ww-num grid place-items-center font-bold text-[var(--text)] bg-[var(--surface-sunk)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-inset)] transition-all duration-[calc(var(--dur-slow)*1ms)] ease-[var(--ease)]"
        style:width="{faceSz}px"
        style:height="{faceSz}px"
        style:font-size="{faceSz * 0.42}px"
        style:opacity={settled ? 1 : 0}
        style:transform={settled ? 'none' : 'translateY(6px)'}
        style:transition-delay="{i * 60}ms"
      >
        {d}
      </div>
    {/each}
  </div>

  <div
    class="flex items-baseline justify-center gap-2 transition-transform duration-[calc(var(--dur-slow)*1ms)] ease-[var(--dice-bounce)] delay-120"
    style:transform={settled ? 'scale(1)' : 'scale(0.7)'}
  >
    <span
      class="ww-num font-bold leading-none"
      style:font-size={size === 'live' ? 'var(--stat-lg)' : 'var(--stat-md)'}
      style:color={skin.fg}
    >
      {sum}
    </span>
    {#if notation}
      <span class="ww-num text-[length:var(--text-sm)] text-[var(--text-faint)]">{notation}</span>
    {/if}
  </div>

  {#if skin.word}
    <div
      class="self-center py-1 px-3 rounded-[var(--radius-pill)] font-[family-name:var(--font-display)] font-bold text-[length:var(--text-sm)] tracking-[0.02em]"
      style:background={skin.bg}
      style:color={skin.fg}
    >
      {skin.word}
    </div>
  {/if}
</div>
