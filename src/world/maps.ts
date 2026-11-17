// Area layouts. Maps are built with a few drawing helpers instead of
// hand-typed ASCII, so they stay easy to edit and always rectangular.
import { Dir } from '../art/characters';
import { hash } from '../art/pixel';

export interface Placed { kind: string; x: number; y: number; id?: string; data?: Record<string, unknown> }
export interface NpcDef { id: string; look: string; x: number; y: number; dir?: Dir; wander?: number; behind?: boolean; flip?: boolean }
export interface EnemyDef { kind: string; x: number; y: number; id?: string }
export interface WarpDef { x: number; y: number; w: number; h: number; to: string; spawn: string }
export interface AreaDef {
  id: string;
  name: string;
  music: string;
  theme: 'day' | 'woods' | 'dungeon';
  dark?: boolean;
  seed: number;
  rows: string[];
  w: number;
  h: number;
  spawns: Record<string, [number, number, Dir]>;
  objects: Placed[];
  npcs: NpcDef[];
  enemies: EnemyDef[];
  warps: WarpDef[];
  /** Dungeons are shown one room at a time (tile rectangles). */
  rooms?: { x: number; y: number; w: number; h: number }[];
}

class MapBuilder {
  g: string[][];
  constructor(public w: number, public h: number, fill: string) {
    this.g = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }
  set(x: number, y: number, c: string) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.g[y][x] : '#'; }
  rect(c: string, x: number, y: number, w: number, h: number) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  blob(c: string, cx: number, cy: number, rx: number, ry: number, seed = 1, only?: string) {
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++)
      for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        const wob = (hash(x, y, seed) - 0.5) * 0.35;
        if (dx * dx + dy * dy <= 1 + wob && (!only || only.includes(this.get(x, y)))) this.set(x, y, c);
      }
  }
  /** Thick polyline (for paths and streams). */
  line(c: string, pts: [number, number][], width = 2, only?: string) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
        for (let j = 0; j < width; j++) for (let i2 = 0; i2 < width; i2++) if (!only || only.includes(this.get(x + i2, y + j))) this.set(x + i2, y + j, c);
      }
    }
  }
  scatter(c: string, x: number, y: number, w: number, h: number, density: number, seed: number, only = '.') {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (only.includes(this.get(x + i, y + j)) && hash(x + i, y + j, seed) < density) this.set(x + i, y + j, c);
  }
  rows() { return this.g.map((r) => r.join('')); }
}

// ======================================================================
// HAVEN — a small colony on a floating island, around the Index Beacon
// ======================================================================
function haven(): AreaDef {
  const W = 44, H = 34;
  const b = new MapBuilder(W, H, '^');
  b.blob('.', 22, 19, 17.5, 10.5, 3); // main island
  b.blob('.', 34, 24, 6, 4.5, 4); // south-east lobe with the pond
  b.blob(',', 31, 22.5, 3.5, 2, 6, '.');
  b.blob(',', 12, 23, 3, 2, 8, '.');
  b.rect('.', 20, 8, 4, 3); b.rect('.', 20, 27, 4, 3);
  // plaza and roads
  b.rect(':', 15, 13, 14, 9);
  b.rect('=', 21, 9, 2, 4);
  b.rect('=', 8, 17, 7, 2);
  b.rect('=', 29, 17, 6, 2);
  b.rect('=', 21, 22, 2, 8);
  // bridges: north to the woods, south a broken stub (next chapter)
  b.rect('_', 21, 0, 2, 9);
  b.rect('_', 21, 30, 2, 2);
  // starwater pond that spills over the island's edge
  b.blob('~', 35, 25, 3, 2, 7);
  b.line('~', [[37, 26], [38, 27], [38, 29]], 2);
  // flora
  const plant = (x: number, y: number, c: string) => { if ('.,'.includes(b.get(x, y))) b.set(x, y, c); };
  for (const [x, y, c] of [
    [6, 13, 'D'], [11, 11, 'T'], [14, 10, 'D'], [17, 9, 'Y'], [26, 9, 'D'], [29, 10, 'T'], [33, 12, 'D'], [38, 15, 'Y'],
    [5, 20, 'T'], [7, 23, 'D'], [16, 27, 'D'], [18, 28, 'T'], [26, 28, 'D'], [28, 27, 'Y'], [39, 22, 'D'], [31, 27, 'T'],
  ] as [number, number, string][]) plant(x, y, c);
  b.scatter('b', 4, 9, 36, 20, 0.035, 11, '.');
  b.scatter('m', 4, 9, 36, 20, 0.012, 12, '.,');
  // bushes hide the chest on the eastern tip
  for (const [x, y] of [[37, 18], [37, 19], [38, 20]]) plant(x, y, 'b');
  // keep the spots where people stand free
  for (const [x, y] of [[31, 22], [30, 22], [32, 22], [19, 11], [24, 11], [20, 10], [23, 10], [23, 28], [38, 19], [39, 19]]) if ('bm'.includes(b.get(x, y))) b.set(x, y, '.');

  return {
    id: 'haven', name: 'Haven', music: 'haven', theme: 'day', seed: 101, rows: b.rows(), w: W, h: H,
    spawns: {
      start: [22, 21.2, 'up'],
      north: [22, 2.4, 'down'],
      fromArchive: [22, 21.2, 'up'],
    },
    objects: [
      { kind: 'house-red', x: 9, y: 17, id: 'house-nova' },
      { kind: 'house-teal', x: 35.5, y: 17, id: 'house-mo' },
      { kind: 'library', x: 12, y: 26.4, id: 'library' },
      { kind: 'beacon', x: 22, y: 18.4, id: 'beacon' },
      { kind: 'stall-red', x: 17.5, y: 14.4, id: 'stall-zib' },
      { kind: 'stall-blue', x: 26.5, y: 14.4, id: 'stall-gloss' },
      { kind: 'lamp', x: 15.5, y: 22 }, { kind: 'lamp', x: 28.5, y: 22 },
      { kind: 'lamp', x: 20.5, y: 9.8 }, { kind: 'lamp', x: 23.5, y: 9.8 },
      { kind: 'sign', x: 19.5, y: 12, id: 'sign-woods' },
      { kind: 'sign', x: 23.5, y: 29, id: 'sign-canyon' },
      { kind: 'crate', x: 30.5, y: 14 }, { kind: 'barrel', x: 31.5, y: 14 },
      { kind: 'pot', x: 11.5, y: 17 }, { kind: 'pot', x: 6.5, y: 18 }, { kind: 'pot', x: 33, y: 18 }, { kind: 'pot', x: 13.5, y: 14 },
      { kind: 'chest', x: 38.5, y: 19.6, id: 'chest-haven-garden', data: { shards: 20 } },
    ],
    npcs: [
      { id: 'mo', look: 'mo', x: 19.5, y: 19.6, dir: 'down' },
      { id: 'pip', look: 'pip', x: 31, y: 22.6, dir: 'down', wander: 1.5 },
      { id: 'gloss', look: 'gloss', x: 26.5, y: 13.6, dir: 'down', behind: true },
      { id: 'zib', look: 'zib', x: 17.5, y: 13.6, dir: 'down', behind: true },
      { id: 'dusty', look: 'dusty', x: 25.5, y: 20, dir: 'side', wander: 2 },
    ],
    enemies: [],
    warps: [
      { x: 21, y: 0, w: 2, h: 1, to: 'woods', spawn: 'south' },
    ],
  };
}

// ======================================================================
// WHISPERING WOODS
// ======================================================================
function woods(): AreaDef {
  const W = 58, H = 46;
  const b = new MapBuilder(W, H, 'D');
  // carve the forest floor
  b.blob('.', 29, 36, 12, 7, 21);
  b.blob('.', 29, 22, 15, 9, 22);
  b.blob('.', 14, 12, 11, 7, 23);
  b.blob('.', 45, 10, 9, 6, 24);
  b.blob('.', 9, 30, 6, 6, 25);
  b.blob('.', 48, 32, 7, 6, 26);
  b.blob(',', 30, 22, 5, 3, 27, '.');
  b.blob(',', 46, 33, 3, 2, 28, '.');
  // pond in the central clearing, stream to the east
  b.blob('~', 36, 24, 4, 3, 29);
  b.line('~', [[38, 25], [44, 24], [48, 20], [52, 16], [57, 15]], 2);
  b.rect('_', 47, 20, 2, 2);
  // winding path: south entrance -> clearing -> archive gate (north-west)
  b.line('=', [[28, 46], [28, 40], [25, 35], [27, 29], [24, 24], [20, 19], [15, 15], [12, 11]], 2);
  b.line('=', [[28, 32], [36, 32], [44, 33], [48, 33]], 2, '.,D');
  b.line('=', [[26, 23], [33, 19], [40, 14], [46, 12]], 2, '.,');
  b.line('.', [[9, 30], [16, 27], [22, 24]], 3, 'D');
  b.rect('.', 26, 40, 5, 3);
  b.rect('=', 28, 40, 2, 3);
  // rocky outcrops
  b.rect('.', 17, 6, 10, 4);
  b.rect('#', 17, 3, 11, 3);
  // bushes & rocks
  b.scatter('b', 1, 1, W - 2, H - 2, 0.06, 31, '.');
  b.scatter('o', 1, 1, W - 2, H - 2, 0.015, 32, '.');
  b.scatter('m', 1, 1, W - 2, H - 2, 0.014, 33, '.,');
  // hidden grove: a bush wall in the west clearing guards a heart piece
  b.rect('.', 6, 27, 7, 7);
  for (const [x, y] of [[6, 27], [7, 27], [8, 27], [9, 27], [10, 27], [11, 27], [12, 27], [12, 28], [12, 29], [12, 30], [12, 31], [12, 32], [12, 33], [6, 33], [7, 33], [8, 33], [9, 33], [10, 33], [11, 33], [6, 28], [6, 29], [6, 30], [6, 31], [6, 32]]) b.set(x, y, 'b');
  b.blob('.', 13, 30, 2, 2.5, 40, 'D');
  for (const [x, y] of [[8, 29], [10, 29], [8, 31], [10, 31], [7, 30], [11, 30]]) b.set(x, y, 'm');
  // keep path tiles clear of scatter
  b.line('=', [[28, 46], [28, 40], [25, 35], [27, 29], [24, 24], [20, 19], [15, 15], [12, 11]], 2, 'bom');
  // sprinkle golden and violet trees in the forest mass
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (b.get(x, y) === 'D' && hash(x, y, 41) < 0.08) b.set(x, y, hash(x, y, 42) < 0.5 ? 'Y' : 'T');
  for (const [x, y] of [[34, 15], [22, 28], [44, 7], [50, 37]]) b.set(x, y, 'T');
  // the woods are an island too: a ragged rim of open sky, and a bridge home
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (edge < 1 + hash(x >> 1, y >> 1, 77) * 2.2 && !'=_~'.includes(b.get(x, y))) b.set(x, y, '^');
  }
  b.rect('^', 0, 43, W, 3);
  b.rect('_', 28, 43, 2, 3);
  return {
    id: 'woods', name: 'Whispering Woods', music: 'woods', theme: 'woods', seed: 202, rows: b.rows(), w: W, h: H,
    spawns: {
      south: [29, 44, 'up'],
      gate: [12, 10.6, 'down'],
    },
    objects: [
      { kind: 'archive-gate', x: 12.5, y: 9, id: 'archive-gate' },
      { kind: 'sign', x: 31.5, y: 41, id: 'sign-woods-south' },
      { kind: 'sign', x: 15.5, y: 12, id: 'sign-archive' },
      { kind: 'beetle-gold', x: 49.5, y: 36, id: 'beetle-gold' },
      { kind: 'beetle-red', x: 13.5, y: 30.5, id: 'beetle-red' },
      { kind: 'beetle-green', x: 51.5, y: 9, id: 'beetle-green' },
      { kind: 'heart-piece', x: 9, y: 30.5, id: 'hp-woods' },
      { kind: 'chest', x: 21.5, y: 8, id: 'chest-woods-ledge', data: { shards: 30 } },
      { kind: 'rock', x: 45.5, y: 30 }, { kind: 'rock', x: 30.5, y: 27 },
      { kind: 'pot', x: 10.5, y: 9.4 }, { kind: 'pot', x: 14.5, y: 9.4 },
    ],
    npcs: [
      { id: 'quill', look: 'quill', x: 47, y: 11, dir: 'down' },
    ],
    enemies: [
      { kind: 'glimmerling', x: 27, y: 35 }, { kind: 'glimmerling', x: 31, y: 37 },
      { kind: 'glimmerling', x: 24, y: 21 }, { kind: 'glimmerling-pink', x: 32, y: 19 },
      { kind: 'glimmerling', x: 44, y: 32 }, { kind: 'glimmerling-pink', x: 50, y: 31 },
      { kind: 'glimmerling', x: 16, y: 13 }, { kind: 'noisebat', x: 20, y: 22 },
      { kind: 'noisebat', x: 42, y: 11 }, { kind: 'noisebat', x: 9, y: 14 },
    ],
    warps: [
      { x: 28, y: 45, w: 2, h: 1, to: 'haven', spawn: 'north' },
      { x: 12, y: 8, w: 1, h: 1, to: 'archive', spawn: 'entrance' },
    ],
  };
}

// ======================================================================
// THE ARCHIVE OF DRAWERS — dungeon 1
// ======================================================================
function archive(): AreaDef {
  const W = 44, H = 58;
  const b = new MapBuilder(W, H, 'W');
  const room = (x: number, y: number, w: number, h: number) => b.rect('+', x, y, w, h);
  // entrance A, west B, east C, lantern room D, void hall E, boss arena G
  room(16, 46, 12, 9); room(2, 46, 11, 9); room(31, 46, 11, 9);
  room(16, 34, 12, 9);
  room(8, 16, 28, 15);
  room(12, 2, 20, 11);
  // corridors
  b.rect('+', 21, 55, 2, 3); // entrance from the woods
  b.rect('+', 13, 49, 3, 2); b.rect('+', 28, 49, 3, 2);
  b.rect('+', 21, 43, 2, 3); // locked door corridor
  b.rect('+', 21, 31, 2, 3);
  b.rect('+', 21, 13, 2, 3); // boss door corridor
  // carpets
  b.rect('R', 21, 47, 2, 8); b.rect('R', 19, 36, 6, 5); b.rect('R', 16, 5, 12, 5);
  // the void hall: ledges north and south, void in between
  b.rect(' ', 8, 19, 28, 9);
  // hidden bridge path (visible start)
  b.rect('B', 21, 27, 2, 1);
  const bridge: [number, number, number, number][] = [
    [21, 25, 2, 2], [13, 24, 10, 2], [13, 22, 2, 2], [13, 20, 18, 2], [29, 19, 2, 1],
  ];
  for (const [x, y, w, h] of bridge) b.rect('h', x, y, w, h);
  // a floating island with a chest on the east side
  b.rect('+', 32, 22, 3, 3);
  b.rect('h', 30, 22, 2, 1);
  // pillars in the boss arena are objects; wall stubs as decoration
  return {
    id: 'archive', name: 'The Archive of Drawers', music: 'archive', theme: 'dungeon', dark: true, seed: 303, rows: b.rows(), w: W, h: H,
    spawns: {
      entrance: [22, 56, 'up'],
      lanternRoom: [22, 40, 'down'],
      boss: [22, 11, 'up'],
    },
    objects: [
      // entrance hall
      { kind: 'torch', x: 18.5, y: 46 }, { kind: 'torch', x: 25.5, y: 46 },
      { kind: 'pot', x: 16.5, y: 47 }, { kind: 'pot', x: 17.5, y: 47 }, { kind: 'pot', x: 27.5, y: 54 }, { kind: 'pot', x: 16.5, y: 54 },
      { kind: 'sign', x: 19.5, y: 53, id: 'sign-archive-in' },
      { kind: 'door-locked', x: 22, y: 46, id: 'door-a' },
      // west room: key chest + a drawer
      { kind: 'chest', x: 4.5, y: 48, id: 'chest-key', data: { key: 'archive' } },
      { kind: 'drawer', x: 10.5, y: 47.4, id: 'drawer-1' },
      { kind: 'torch', x: 7.5, y: 46 },
      { kind: 'pot', x: 2.5, y: 54 }, { kind: 'pot', x: 3.5, y: 54 }, { kind: 'crate', x: 12.5, y: 54 },
      // east room: two drawers in the dark
      { kind: 'drawer', x: 33.5, y: 47.4, id: 'drawer-2' },
      { kind: 'drawer', x: 39.5, y: 47.4, id: 'drawer-3' },
      { kind: 'torch', x: 36.5, y: 46 },
      { kind: 'pillar', x: 34.5, y: 52 }, { kind: 'pillar', x: 38.5, y: 52 },
      // lantern room
      { kind: 'bigchest', x: 22, y: 38.6, id: 'chest-lantern' },
      { kind: 'torch', x: 17.5, y: 34 }, { kind: 'torch', x: 26.5, y: 34 },
      { kind: 'pillar', x: 17.5, y: 41 }, { kind: 'pillar', x: 26.5, y: 41 },
      // void hall
      { kind: 'drawer', x: 10.5, y: 17.4, id: 'drawer-4' },
      { kind: 'chest', x: 33.5, y: 24, id: 'chest-island', data: { shards: 50 } },
      { kind: 'torch', x: 14.5, y: 16 }, { kind: 'torch', x: 29.5, y: 16 },
      { kind: 'sign', x: 25.5, y: 29.4, id: 'sign-void' },
      { kind: 'door-boss', x: 22, y: 16, id: 'door-boss' },
      // boss arena
      { kind: 'pillar', x: 13.5, y: 4 }, { kind: 'pillar', x: 30.5, y: 4 }, { kind: 'pillar', x: 13.5, y: 12 }, { kind: 'pillar', x: 30.5, y: 12 },
      { kind: 'torch', x: 17.5, y: 2 }, { kind: 'torch', x: 26.5, y: 2 },
    ],
    npcs: [],
    enemies: [
      { kind: 'glimmerling', x: 19, y: 50 }, { kind: 'glimmerling-pink', x: 25, y: 51 },
      { kind: 'pagewing', x: 6, y: 50 }, { kind: 'pagewing', x: 9, y: 52 },
      { kind: 'glimmerling', x: 35, y: 50 }, { kind: 'pagewing', x: 38, y: 49 }, { kind: 'glimmerling-pink', x: 37, y: 53 },
      { kind: 'pagewing', x: 19, y: 37 }, { kind: 'pagewing', x: 25, y: 37 },
      { kind: 'pagewing', x: 12, y: 29 }, { kind: 'pagewing', x: 31, y: 29 },
      { kind: 'curator', x: 22, y: 6, id: 'boss' },
    ],
    warps: [
      { x: 21, y: 57, w: 2, h: 1, to: 'woods', spawn: 'gate' },
    ],
    rooms: [
      { x: 14, y: 45, w: 16, h: 13 }, // A entrance hall
      { x: 1, y: 45, w: 13, h: 11 }, // B west room
      { x: 30, y: 45, w: 13, h: 11 }, // C east room
      { x: 15, y: 33, w: 14, h: 12 }, // D lantern room
      { x: 7, y: 15, w: 30, h: 18 }, // E void hall
      { x: 11, y: 1, w: 22, h: 14 }, // G boss arena
    ],
  };
}

export const AREAS: Record<string, AreaDef> = { haven: haven(), woods: woods(), archive: archive() };
