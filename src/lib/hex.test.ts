import { describe, expect, it } from 'vitest';
import {
  axialToPixel,
  hexPolygonPoints,
  hexKey,
  gridCoords,
  gridViewBox,
  hexLabel,
  neighbors,
  GRID_BOUNDS,
  HEX_SIZE,
} from './hex';

describe('hex math', () => {
  it('places the origin at (0, 0)', () => {
    const p = axialToPixel(0, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
  });

  it('converts flat-top axial coordinates to pixels', () => {
    const east = axialToPixel(1, 0);
    expect(east.x).toBeCloseTo(HEX_SIZE * 1.5);
    expect(east.y).toBeCloseTo(HEX_SIZE * Math.sqrt(3) * 0.5);

    const south = axialToPixel(0, 1);
    expect(south.x).toBeCloseTo(0);
    expect(south.y).toBeCloseTo(HEX_SIZE * Math.sqrt(3));
  });

  it('produces six corner points for a hex', () => {
    const points = hexPolygonPoints(0, 0).split(' ');
    expect(points).toHaveLength(6);
    for (const pair of points) {
      expect(pair.split(',')).toHaveLength(2);
    }
  });

  it('builds a stable coordinate key', () => {
    expect(hexKey(2, -1)).toBe('2,-1');
  });

  it('enumerates the whole bounded grid with unique keys covering the seed', () => {
    const coords = gridCoords();
    const cols = GRID_BOUNDS.qMax - GRID_BOUNDS.qMin + 1;
    const rows = GRID_BOUNDS.rMax - GRID_BOUNDS.rMin + 1;
    expect(coords).toHaveLength(cols * rows);

    const keys = new Set(coords.map((c) => hexKey(c.q, c.r)));
    expect(keys.size).toBe(coords.length);

    // Every seed coordinate must fall inside the rendered grid.
    const seed: [number, number][] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [1, -1],
      [2, 0],
    ];
    for (const [q, r] of seed) {
      expect(keys.has(hexKey(q, r))).toBe(true);
    }
  });

  it('returns a viewBox with positive width and height', () => {
    const [minX, minY, width, height] = gridViewBox().split(' ').map(Number);
    expect(Number.isFinite(minX)).toBe(true);
    expect(Number.isFinite(minY)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('labels coordinates as column letter + row number', () => {
    // origin: column = 0 - (-2) = 2 → 'C'; row = 0 - (-2) + 1 = 3
    expect(hexLabel(0, 0)).toBe('C3');
    expect(hexLabel(GRID_BOUNDS.qMin, GRID_BOUNDS.rMin)).toBe('A1');
  });

  it('returns the 6 axial neighbors in a fixed, stable order', () => {
    expect(neighbors(0, 0)).toEqual([
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ]);
  });

  it('offsets neighbors relative to a non-origin coordinate', () => {
    expect(neighbors(2, -1)).toEqual([
      { q: 3, r: -1 },
      { q: 3, r: -2 },
      { q: 2, r: -2 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ]);
  });
});
