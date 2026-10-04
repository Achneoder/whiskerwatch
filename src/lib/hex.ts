/**
 * Pure hex-grid math for the Hex Map screen.
 *
 * Flat-top hexes on an axial (`q`, `r`) coordinate system — the classic
 * wilderness hex-crawl look, and coordinates a GM can say out loud. All
 * orientation-dependent math lives here so the grid can be retuned in one
 * place; the store, keys and screen never touch trigonometry.
 */

export interface Axial {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GridBounds {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
}

/** Circumradius (hex centre → corner) in SVG units. */
export const HEX_SIZE = 40;

/**
 * Bounded axial range rendered by the canvas. Comfortably covers the seed
 * hexes (q ∈ [-1, 2], r ∈ [-1, 1]) with room to grow around them.
 */
export const GRID_BOUNDS: GridBounds = { qMin: -2, qMax: 3, rMin: -2, rMax: 3 };

/** Flat-top axial → pixel centre. */
export function axialToPixel(q: number, r: number, size = HEX_SIZE): Point {
  return {
    x: size * (3 / 2) * q,
    y: size * Math.sqrt(3) * (r + q / 2),
  };
}

/** Six corner points of a flat-top hex centred at (cx, cy), as an SVG points string. */
export function hexPolygonPoints(cx: number, cy: number, size = HEX_SIZE): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');
}

/**
 * Hex outline scaled down around its own centre — used to draw the
 * controlled/contested-territory rings inset from the outer terrain
 * polygon and selection stroke so they read as concentric bands.
 */
export function insetHexPoints(cx: number, cy: number, scale: number, size = HEX_SIZE): string {
  return hexPolygonPoints(cx, cy, size * scale);
}

/** Stable string key for a coordinate, for Map lookups and `{#each}` keys. */
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/**
 * The 6 axial neighbors of a flat-top hex, in a fixed, stable order (used to
 * build the Watch card's move-chip row deterministically — the same
 * neighbor always renders in the same chip position, run to run).
 */
export function neighbors(q: number, r: number): Axial[] {
  return [
    { q: q + 1, r },
    { q: q + 1, r: r - 1 },
    { q, r: r - 1 },
    { q: q - 1, r },
    { q: q - 1, r: r + 1 },
    { q, r: r + 1 },
  ];
}

/** Every coordinate in the bounded grid, row-major. */
export function gridCoords(bounds: GridBounds = GRID_BOUNDS): Axial[] {
  const out: Axial[] = [];
  for (let q = bounds.qMin; q <= bounds.qMax; q++) {
    for (let r = bounds.rMin; r <= bounds.rMax; r++) {
      out.push({ q, r });
    }
  }
  return out;
}

/** SVG viewBox string enclosing the whole grid, padded by one hex. */
export function gridViewBox(bounds: GridBounds = GRID_BOUNDS, size = HEX_SIZE): string {
  const points = gridCoords(bounds).map(({ q, r }) => axialToPixel(q, r, size));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - size;
  const minY = Math.min(...ys) - size;
  const width = Math.max(...xs) + size - minX;
  const height = Math.max(...ys) + size - minY;
  return `${minX} ${minY} ${width} ${height}`;
}

/**
 * Human-readable coordinate (column letter + row number) for aria labels and
 * the detail view — e.g. a GM can say "the party is on C3". Deterministic
 * relative to {@link GRID_BOUNDS}.
 */
export function hexLabel(q: number, r: number, bounds: GridBounds = GRID_BOUNDS): string {
  const column = String.fromCharCode(65 + (q - bounds.qMin));
  const row = r - bounds.rMin + 1;
  return `${column}${row}`;
}
