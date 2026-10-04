<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    axialToPixel,
    hexPolygonPoints,
    insetHexPoints,
    hexKey,
    gridCoords,
    gridViewBox,
    hexLabel,
    type Axial,
  } from '../../lib/hex';
  import { terrainFill, type HexNode } from '../../lib/stores/hexmap.svelte';
  import { dispositionRingColor, type Faction, type FactionDisposition } from '../../lib/stores/factions.svelte';

  interface Props {
    hexes: HexNode[];
    selected?: { q: number; r: number } | null;
    factions?: Faction[];
    /** The active adventure's current position, or `null` if unset/not
     * applicable (e.g. viewing Hex Map with no single active adventure).
     * Read-only here — `HexCanvas` never mutates it; movement only happens
     * from Live Session's Watch card, or the Hex Map prep-mode "Set here" action. */
    currentHex?: { q: number; r: number } | null;
    onselect: (q: number, r: number) => void;
  }

  let { hexes, selected = null, factions = [], currentHex = null, onselect }: Props = $props();

  const cells = gridCoords();
  const [, , viewW, viewH] = gridViewBox().split(' ').map(Number);

  // On phone/tablet widths the hex grid stays at its native pixel size so
  // tap targets never shrink below a usable size — a GM scrolls a big map
  // instead. From the `md:` breakpoint up (see HexMap.svelte's
  // `flex-col md:flex-row` for the matching desktop/mobile split) there's
  // room to spare, so the SVG is allowed to grow with its container —
  // capped at 2x native size so hexes don't balloon on an ultrawide
  // monitor. Same technique as FactionGraph.svelte: keep the `viewBox`
  // fixed and let CSS `width`/`height` override the presentation
  // attributes at the wider breakpoint.
  const maxDesktopWidth = (viewW ?? 0) * 2;

  const byKey = $derived(new Map(hexes.map((h) => [hexKey(h.q, h.r), h])));
  const factionById = $derived(new Map(factions.map((f) => [f.id, f])));

  /** Fixed outer→inner draw order for contested rings — hostile territory reads as the most urgent, drawn first (outermost). */
  const DISPOSITION_ORDER: FactionDisposition[] = ['hostile', 'neutral', 'ally'];

  interface TerritoryRing {
    scale: number;
    color: string;
    dashed: boolean;
  }

  function territoryRings(node: HexNode | undefined): TerritoryRing[] {
    if (!node) return [];
    const rings: TerritoryRing[] = [];

    const controller = node.controlledBy ? factionById.get(node.controlledBy) : undefined;
    if (controller) {
      rings.push({ scale: 0.82, color: dispositionRingColor[controller.disposition], dashed: false });
    }

    const contesterDispositions = new Set(
      node.contestedBy.map((id) => factionById.get(id)?.disposition).filter((d): d is FactionDisposition => d !== undefined),
    );
    const orderedDispositions = DISPOSITION_ORDER.filter((d) => contesterDispositions.has(d));
    const startScale = controller ? 0.72 : 0.82;
    orderedDispositions.forEach((disposition, i) => {
      rings.push({ scale: startScale - i * 0.08, color: dispositionRingColor[disposition], dashed: true });
    });

    return rings;
  }

  function ariaFor(cell: Axial, node: HexNode | undefined): string {
    const label = hexLabel(cell.q, cell.r);
    const base = !node
      ? label
      : (() => {
          const terrain = $_(`hexMap.terrain.${node.terrain}`);
          return node.name ? `${label}: ${node.name}, ${terrain}` : `${label}: ${terrain}`;
        })();
    const isCurrent = currentHex != null && currentHex.q === cell.q && currentHex.r === cell.r;
    return isCurrent ? `${base} ${$_('hexMap.partyIsHereAria')}` : base;
  }

  function truncate(text: string): string {
    return text.length > 10 ? text.slice(0, 9) + '…' : text;
  }

  function handleKeydown(event: KeyboardEvent, q: number, r: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onselect(q, r);
    }
  }
</script>

<div
  class="overflow-auto md:overflow-visible max-w-full md:max-w-[var(--hex-max-w)] rounded-[var(--radius-md)]"
  style={`touch-action: pan-x pan-y; --hex-max-w: ${maxDesktopWidth}px;`}
>
  <svg
    width={viewW}
    height={viewH}
    viewBox={gridViewBox()}
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label={$_('hexMap.title')}
    class="block max-w-none md:w-full md:h-auto md:max-w-full"
  >
    {#each cells as cell (hexKey(cell.q, cell.r))}
      {@const p = axialToPixel(cell.q, cell.r)}
      {@const node = byKey.get(hexKey(cell.q, cell.r))}
      {@const isSelected = selected != null && selected.q === cell.q && selected.r === cell.r}
      <g
        role="button"
        tabindex="0"
        aria-label={ariaFor(cell, node)}
        class="cursor-pointer"
        onclick={() => onselect(cell.q, cell.r)}
        onkeydown={(e) => handleKeydown(e, cell.q, cell.r)}
      >
        <polygon
          points={hexPolygonPoints(p.x, p.y)}
          fill={node ? terrainFill[node.terrain] : 'var(--surface-raised)'}
          fill-opacity={node && !node.discovered ? 0.5 : 1}
          stroke={isSelected ? 'var(--accent)' : 'var(--border)'}
          stroke-width={isSelected ? 3 : 1}
          stroke-dasharray={node && !node.discovered ? '4 3' : undefined}
        />
        {#each territoryRings(node) as ring, i (i)}
          <polygon
            points={insetHexPoints(p.x, p.y, ring.scale)}
            fill="none"
            stroke={ring.color}
            stroke-width={2}
            stroke-dasharray={ring.dashed ? '3 2' : undefined}
          />
        {/each}
        {#if node && node.name}
          <text
            x={p.x}
            y={p.y}
            text-anchor="middle"
            dominant-baseline="middle"
            fill="var(--text)"
            class="font-[family-name:var(--font-display)]"
            style="font-size: 11px; font-weight: 700; pointer-events: none;"
          >
            {truncate(node.name)}
          </text>
        {/if}
      </g>
    {/each}

    {#if currentHex}
      {@const p = axialToPixel(currentHex.q, currentHex.r)}
      <!--
        Drawn last, on top of every hex/ring/label above — the party's
        position marker must never be occluded on a busy board. Sized
        independent of hex terrain color (its own filled backing circle)
        so it reads against any terrain fill; the pulsing outer ring is
        motion-safe-gated, falling back to a plain static ring for
        prefers-reduced-motion (see the <style> block below).
      -->
      <g transform={`translate(${p.x - 12}, ${p.y - 12})`} aria-hidden="true" class="pointer-events-none">
        <circle
          cx="12"
          cy="12"
          r="15"
          fill="none"
          stroke="var(--accent)"
          stroke-width="2"
          opacity="0.55"
          class="motion-safe:animate-[ww-locator-pulse_1.4s_ease-in-out_infinite]"
        />
        <circle cx="12" cy="12" r="12" fill="var(--surface-raised)" stroke="var(--accent)" stroke-width="1.5" />
        <g stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <circle cx="11" cy="4" r="2" />
          <circle cx="18" cy="8" r="2" />
          <circle cx="20" cy="16" r="2" />
          <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
        </g>
      </g>
    {/if}
  </svg>
</div>

<style>
  @keyframes ww-locator-pulse {
    0%,
    100% {
      r: 15;
      opacity: 0.55;
    }
    50% {
      r: 19;
      opacity: 0.1;
    }
  }
</style>
