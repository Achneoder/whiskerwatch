<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { tick } from 'svelte';

  interface Props {
    /** The help text shown in the bubble. */
    text: string;
    /** What the tip explains (e.g. "Pips") — used for the button's accessible name. */
    label: string;
  }

  let { text, label }: Props = $props();

  // Toggletip, not a hover-only tooltip: the app is used one-handed on phones
  // at the table, where hover doesn't exist. Tap/click toggles; hover and
  // keyboard focus also open it on devices that have them.
  let open = $state(false);
  let pinned = $state(false);
  let suppressFocusOpen = false;
  let button: HTMLButtonElement | undefined = $state();
  let bubble: HTMLDivElement | undefined = $state();
  let pos = $state({ top: 0, left: 0 });

  const GUTTER = 16;
  const GAP = 6;
  // $props.id() rather than Math.random(): tests that queue dice rolls via a
  // mocked Math.random must not have values consumed by rendering a tip.
  const uid = $props.id();
  const bubbleId = `helptip-${uid}`;

  // Fixed positioning, clamped to the viewport, so the bubble escapes Modal's
  // scrolling body and never causes a horizontal page scroll at phone width.
  async function place() {
    await tick();
    if (!button || !bubble) return;
    const b = button.getBoundingClientRect();
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    const maxLeft = window.innerWidth - w - GUTTER;
    const left = Math.max(GUTTER, Math.min(b.left + b.width / 2 - w / 2, maxLeft));
    const below = b.bottom + GAP;
    const top = below + h > window.innerHeight - GUTTER ? Math.max(GUTTER, b.top - GAP - h) : below;
    pos = { top, left };
  }

  // Render the bubble under <body>: a transformed ancestor (a hovered
  // interactive Card, Modal's entrance animation) would otherwise become the
  // containing block for `position: fixed` and misplace it.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  function show() {
    open = true;
    place();
  }

  function hide() {
    open = false;
    pinned = false;
  }

  function toggle(event: MouseEvent) {
    // Forms put tips next to labels; never let the tap submit or toggle anything.
    event.preventDefault();
    event.stopPropagation();
    if (pinned) hide();
    else {
      pinned = true;
      show();
    }
  }

  function onWindowPointerDown(event: PointerEvent) {
    const target = event.target as Node;
    if (button?.contains(target) || bubble?.contains(target)) return;
    hide();
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    // Close only the tip — not the Modal it may be sitting in.
    event.stopImmediatePropagation();
    hide();
    // Return focus to the trigger without its focus handler reopening the tip.
    suppressFocusOpen = true;
    button?.focus();
    suppressFocusOpen = false;
  }

  // Capture phase: Escape must be seen before Modal's own window listener, and
  // scroll events (which don't bubble) from any scrolling container count.
  $effect(() => {
    if (!open) return;
    window.addEventListener('pointerdown', onWindowPointerDown);
    window.addEventListener('keydown', onWindowKeydown, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('pointerdown', onWindowPointerDown);
      window.removeEventListener('keydown', onWindowKeydown, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  });
</script>

<button
  bind:this={button}
  type="button"
  aria-label={$_('help.ariaLabel', { values: { label } })}
  aria-expanded={open}
  aria-describedby={open ? bubbleId : undefined}
  onclick={toggle}
  onmouseenter={() => !pinned && show()}
  onmouseleave={() => !pinned && (open = false)}
  onfocus={() => !pinned && !suppressFocusOpen && show()}
  onblur={() => !pinned && (open = false)}
  class="relative inline-grid place-items-center shrink-0 size-[18px] rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)] font-[family-name:var(--font-body)] font-bold text-[11px] leading-none normal-case tracking-normal cursor-help align-middle transition-colors duration-[calc(var(--dur-fast)*1ms)] ease-[var(--ease)] hover:text-[var(--accent)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] before:absolute before:-inset-[13px] before:content-['']"
>
  ?
</button>

{#if open}
  <div
    bind:this={bubble}
    use:portal
    id={bubbleId}
    role="tooltip"
    class="fixed z-120 w-max max-w-[min(18rem,calc(100vw-2rem))] px-[var(--sp-3)] py-[var(--sp-2)] rounded-[var(--radius-md)] bg-[var(--text)] text-[var(--surface-raised)] shadow-[var(--shadow-modal)] text-[length:var(--text-sm)] leading-[var(--lh-body)] font-[family-name:var(--font-body)] font-normal normal-case tracking-normal text-left whitespace-normal"
    style:top="{pos.top}px"
    style:left="{pos.left}px"
  >
    {text}
  </div>
{/if}
