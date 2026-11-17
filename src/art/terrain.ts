// Ground renderer: turns an ASCII area map into one big pre-rendered pixel
// canvas. Soft terrains (grass, path, plaza, water) get organic jittered
// edges; cliffs, walls and void are tile-exact with 3/4 faces.
import { hash } from './pixel';

export const TILE = 16;

export type Terrain =
  | 'grass' | 'meadow' | 'path' | 'plaza' | 'water' | 'cliff' | 'bridge'
  | 'floor' | 'carpet' | 'wall' | 'void' | 'plank' | 'hidden' | 'sand' | 'sky';

/** Map characters -> terrain. Object characters sit on grass/floor. */
export const CHAR_TERRAIN: Record<string, Terrain> = {
  '.': 'grass', ',': 'meadow', '=': 'path', ':': 'plaza', '~': 'water', '#': 'cliff', '_': 'bridge', 's': 'sand',
  T: 'grass', Y: 'grass', D: 'grass', b: 'grass', o: 'grass', f: 'grass', m: 'grass', k: 'grass', '!': 'meadow',
  '^': 'sky',
  '+': 'floor', R: 'carpet', W: 'wall', ' ': 'void', B: 'plank', h: 'hidden', p: 'floor', c: 'floor', t: 'wall',
};

export const SOLID_TERRAIN = new Set<Terrain>(['water', 'cliff', 'wall', 'void', 'hidden', 'sky']);
const SOFT = new Set<Terrain>(['grass', 'meadow', 'path', 'plaza', 'water', 'sand', 'sky']);

// ---------- palette ----------
// The moon Lumen at night: teal moongrass, pale dust paths, glowing starwater.
const G = [0x0f2236, 0x143145, 0x1a4254, 0x225763, 0x2e7676, 0x56b89c];
const P = [0x34345a, 0x47476e, 0x5b5b86, 0x7573a0, 0x9896c0];
const SA = [0x45456a, 0x5a5a82, 0x70709a];
const WA = [0x0e3554, 0x125074, 0x1b7fa6, 0x3ab9d8, 0x8deaf6, 0xe6fdff];
const K = [0x141024, 0x211b38, 0x2f2850, 0x41376a, 0x5a4d8c, 0x7f70b4];
const ST = [0x25253f, 0x33335a, 0x404072, 0x4f4f88, 0x6a6aa6];
const DF = [0x221c34, 0x2e2645, 0x3a3155, 0x463c66, 0x564b7a];
const CA = [0x4f1a2c, 0x6e2438, 0x8c3046, 0xd9a441, 0xf2cd6b];
const WL = [0x150f22, 0x1f1830, 0x2b2242, 0x3a2f57];
const WOOD = [0x3e2418, 0x5e3a24, 0x7c5232, 0xa0703f, 0xc29257];
const BOOKS = [0xb8394d, 0x2f6fb5, 0xd9a441, 0x3f9a63, 0x8a4fb0, 0xd86f3c, 0x5ab6c9, 0xe8e0d0];

function smooth(t: number) { return t * t * (3 - 2 * t); }
/** Smooth value noise in [0,1). */
export function vnoise(x: number, y: number, s: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export interface GroundResult {
  canvas: HTMLCanvasElement;
  terrain: Terrain[][];
  waterPixels: [number, number][];
}

export function terrainGrid(rows: string[], w: number, h: number): Terrain[][] {
  const out: Terrain[][] = [];
  for (let y = 0; y < h; y++) {
    out.push([]);
    for (let x = 0; x < w; x++) out[y].push(CHAR_TERRAIN[rows[y]?.[x] ?? '.'] ?? 'grass');
  }
  return out;
}

export function renderGround(rows: string[], w: number, h: number, seed: number, theme: 'day' | 'woods' | 'dungeon' = 'day', shadeTiles?: Set<number>): GroundResult {
  const tg = terrainGrid(rows, w, h);
  const tAt = (tx: number, ty: number): Terrain => tg[Math.max(0, Math.min(h - 1, ty))][Math.max(0, Math.min(w - 1, tx))];
  const PW = w * TILE, PH = h * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = PW; canvas.height = PH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(PW, PH);
  const buf = new Uint32Array(img.data.buffer);
  const put = (x: number, y: number, c: number) => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return;
    buf[y * PW + x] = 0xff000000 | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255);
  };

  // ---- 1. per-pixel terrain classification with jittered soft edges ----
  const tp: Terrain[] = new Array(PW * PH);
  for (let py = 0; py < PH; py++)
    for (let px = 0; px < PW; px++) {
      const base = tAt(px >> 4, py >> 4);
      let t = base;
      if (SOFT.has(base)) {
        const jx = (vnoise(px * 0.16, py * 0.16, seed + 1) - 0.5) * 8;
        const jy = (vnoise(px * 0.16, py * 0.16, seed + 2) - 0.5) * 8;
        const s = tAt((px + jx) >> 4, (py + jy) >> 4);
        if (SOFT.has(s)) t = s;
      }
      tp[py * PW + px] = t;
    }
  const T = (x: number, y: number): Terrain => tp[Math.max(0, Math.min(PH - 1, y)) * PW + Math.max(0, Math.min(PW - 1, x))];
  const isGrass = (t: Terrain) => t === 'grass' || t === 'meadow';

  // distance (in px, up to 4) from water to land, for foam and shallows
  const wdist = new Uint8Array(PW * PH).fill(9);
  for (let py = 0; py < PH; py++)
    for (let px = 0; px < PW; px++) {
      if (T(px, py) !== 'water') continue;
      let d = 9;
      for (let r = 1; r <= 4 && d === 9; r++)
        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]])
          if (T(px + dx, py + dy) !== 'water' && T(px + dx, py + dy) !== 'bridge') { d = r; break; }
      wdist[py * PW + px] = d;
    }

  const grassTone = (px: number, py: number, dim = 0) => {
    const n = vnoise(px * 0.06, py * 0.06, seed + 3);
    const m = vnoise(px * 0.25, py * 0.25, seed + 4);
    let i = n < 0.26 ? 1 : n > 0.76 ? 3 : 2;
    if (m > 0.86) i = Math.min(4, i + 1);
    if (m < 0.1) i = Math.max(0, i - 1);
    const hh = hash(px, py, seed);
    if (hh < 0.04) i = Math.min(5, i + 1);
    else if (hh > 0.965) i = Math.max(0, i - 1);
    if (theme === 'woods') i = Math.max(0, i - 1);
    return G[Math.max(0, i - dim)];
  };

  // ---- 2. colour pass ----
  const waterPixels: [number, number][] = [];
  for (let py = 0; py < PH; py++)
    for (let px = 0; px < PW; px++) {
      const t = T(px, py);
      const tx = px >> 4, ty = py >> 4, lx = px & 15, ly = py & 15;
      let c = 0;
      switch (t) {
        case 'grass':
        case 'meadow': {
          c = grassTone(px, py);
          // light rim where grass overhangs path / plaza
          const below = T(px, py + 1), above = T(px, py - 1);
          if (!isGrass(below) && (below === 'path' || below === 'plaza' || below === 'sand')) c = G[4];
          else if (!isGrass(above) && (above === 'path' || above === 'plaza' || above === 'sand')) c = G[1];
          else if ((T(px - 1, py) === 'path' || T(px + 1, py) === 'path')) c = G[3];
          break;
        }
        case 'path':
        case 'sand': {
          const pal = t === 'sand' ? [SA[0], SA[0], SA[1], SA[2], SA[2]] : P;
          const n = vnoise(px * 0.09, py * 0.09, seed + 5);
          let i = n < 0.3 ? 1 : n > 0.7 ? 3 : 2;
          const hh = hash(px, py, seed + 9);
          if (hh < 0.05) i = 1;
          if (hh > 0.985) i = 4;
          // pebbles
          const pb = hash(px >> 2, py >> 2, seed + 7);
          if (pb > 0.93 && (px & 3) < 2 && (py & 3) < 2) i = (py & 3) === 0 ? 4 : 1;
          if (isGrass(T(px, py - 1)) || isGrass(T(px, py - 2))) i = 0; // grass shadow on the path
          else if (isGrass(T(px - 1, py)) || isGrass(T(px + 1, py)) || isGrass(T(px, py + 1))) i = 1;
          if (T(px, py - 1) === 'water' || T(px, py + 1) === 'water') i = 1;
          c = pal[i];
          break;
        }
        case 'plaza': {
          const row = Math.floor(py / 6);
          const off = row % 2 ? 4 : 0;
          const col = Math.floor((px + off) / 8);
          const sx = (px + off) % 8, sy = py % 6;
          if (sx === 7 || sy === 5) c = ST[0];
          else {
            const v = hash(col, row, seed + 11);
            c = v < 0.33 ? ST[1] : v < 0.8 ? ST[2] : ST[3];
            if (sx === 0 || sy === 0) c = ST[Math.min(4, (v < 0.33 ? 1 : v < 0.8 ? 2 : 3) + 1)];
            if (sx === 6 || sy === 4) c = ST[Math.max(0, (v < 0.33 ? 1 : v < 0.8 ? 2 : 3) - 1)];
          }
          if (hash(col, row, seed + 12) > 0.94 && sx >= 2 && sx <= 4 && sy >= 1 && sy <= 3) c = sx === 3 && sy === 2 ? 0xd4fdff : 0x3fd8f0;
          if (isGrass(T(px, py - 1))) c = ST[0];
          break;
        }
        case 'water': {
          const d = wdist[py * PW + px];
          const n = vnoise(px * 0.05, py * 0.12, seed + 13);
          c = n < 0.35 ? WA[0] : WA[1];
          const wave = Math.sin(px * 0.35 + vnoise(px * 0.04, py * 0.04, seed + 14) * 12 + py * 1.7);
          if (wave > 0.93 && (py % 5 === 0)) c = WA[2];
          if (d === 1) c = WA[5];
          else if (d === 2) c = WA[3];
          else if (d <= 4) c = WA[2];
          // shoreline shadow below land
          if (T(px, py - 1) !== 'water' && T(px, py - 1) !== 'bridge') c = WA[4];
          if (d > 4 && hash(px, py, seed + 15) > 0.995) waterPixels.push([px, py]);
          break;
        }
        case 'bridge':
        case 'plank': {
          const plank = Math.floor(px / 4);
          const v = hash(plank, ty, seed + 17);
          c = lx % 4 === 3 ? WOOD[0] : v < 0.4 ? WOOD[2] : v < 0.85 ? WOOD[3] : WOOD[4];
          if (ly === 0 || ly === 15) c = WOOD[1];
          if ((ly === 4 || ly === 11) && lx % 4 === 1) c = WOOD[1]; // nails
          const gap = (q: Terrain) => (t === 'bridge' ? q === 'water' || q === 'sky' : q === 'void');
          if (gap(T(px, py + 1)) && !gap(T(px, py - 1))) c = WOOD[0];
          if (t === 'bridge') {
            // hand rails where the bridge borders the open sky
            if ((gap(tAt(tx - 1, ty)) && lx < 2) || (gap(tAt(tx + 1, ty)) && lx > 13)) c = lx === 0 || lx === 15 ? WOOD[0] : ly % 8 < 2 ? WOOD[4] : WOOD[1];
            if ((gap(tAt(tx, ty - 1)) && ly < 2)) c = ly === 0 ? WOOD[0] : lx % 8 < 2 ? WOOD[4] : WOOD[1];
            if (theme !== 'dungeon') c = night(c);
          }
          break;
        }
        case 'cliff': {
          const belowT = tAt(tx, ty + 1);
          const faceTile = belowT !== 'cliff';
          const upperFace = !faceTile && tAt(tx, ty + 2) !== 'cliff' && tAt(tx, ty - 1) === 'cliff';
          const topLeft = tAt(tx - 1, ty) !== 'cliff', topRight = tAt(tx + 1, ty) !== 'cliff';
          if (upperFace && ly >= 6 || faceTile) {
            const fy = upperFace ? ly - 6 : ly + 10; // 0 = top rim of the face
            const colV = hash(px, 0, seed + 19);
            const band = vnoise(px * 0.3, py * 0.15, seed + 20);
            c = band < 0.45 ? K[2] : K[3];
            if (colV > 0.8) c = K[1];
            if (colV < 0.12) c = K[4];
            if ((py + Math.floor(hash(px >> 3, ty, seed) * 4)) % 7 === 0) c = K[1];
            if (fy === 0) c = K[5];
            if (fy === 1) c = K[4];
            if (fy > 14 && (px + py) % 2 === 0) c = K[1];
            if (!upperFace && ly >= 14) c = K[0];
            if ((topLeft && lx === 0) || (topRight && lx === 15)) c = K[0];
          } else {
            // grassy plateau top
            c = grassTone(px, py, 1);
            if (tAt(tx, ty - 1) !== 'cliff' && ly <= 1) c = ly === 0 ? K[1] : K[3];
            if (topLeft && lx <= 1) c = lx === 0 ? K[1] : K[3];
            if (topRight && lx >= 14) c = lx === 15 ? K[1] : K[2];
            if (upperFace && ly === 5) c = G[4];
          }
          break;
        }
        case 'sky': {
          // open space. Below land hangs the rocky underside of the island;
          // below starwater, a thin glowing waterfall.
          c = -1;
          for (let d = 1; d <= 56 && py - d >= 0; d++) {
            const u = T(px, py - d);
            if (u === 'sky') continue;
            if (u === 'water') {
              const streak = hash(px, 0, seed + 64);
              if (streak > 0.3 && hash(px, py >> 1, seed + 65) > (d / 56) * 0.95) c = streak > 0.85 ? WA[5] : streak > 0.55 ? WA[4] : WA[3];
            } else if (u === 'bridge') {
              if (d <= 2) c = night(WOOD[0]);
            } else {
              const depth = 10 + Math.floor(vnoise(px * 0.09, 3, seed + 60) * 16 + hash(px >> 1, 7, seed + 61) * 7);
              if (d <= depth) {
                const k = d / depth;
                let i = k < 0.14 ? 4 : k < 0.45 ? 3 : k < 0.8 ? 2 : 1;
                if (hash(px >> 2, py >> 2, seed + 62) > 0.78) i = Math.max(0, i - 1);
                if (hash(px, 0, seed + 63) > 0.86) i = Math.max(0, i - 1);
                c = K[i];
                if (d === 1) c = K[0];
                if (k > 0.3 && hash(px >> 1, py >> 1, seed + 66) > 0.988) c = 0x5ef0ff;
              }
            }
            break;
          }
          break;
        }
        case 'floor': {
          const sx = px % 16, sy = py % 16;
          const slab = (sx < 8 ? 0 : 1) + (sy < 8 ? 0 : 2);
          const v = hash(tx * 4 + slab, ty, seed + 21);
          let i = v < 0.5 ? 2 : v < 0.85 ? 3 : 1;
          const lx8 = sx % 8, ly8 = sy % 8;
          if (lx8 === 7 || ly8 === 7) i = 0;
          else if (lx8 === 0 || ly8 === 0) i = Math.min(4, i + 1);
          if (hash(px, py, seed + 22) > 0.97) i = Math.max(0, i - 1);
          c = DF[i];
          break;
        }
        case 'carpet': {
          const edgeL = tAt(tx - 1, ty) !== 'carpet', edgeR = tAt(tx + 1, ty) !== 'carpet';
          const edgeU = tAt(tx, ty - 1) !== 'carpet', edgeD = tAt(tx, ty + 1) !== 'carpet';
          c = (px + py) % 8 === 0 || (px - py) % 8 === 0 ? CA[2] : CA[1];
          if ((edgeL && lx <= 2) || (edgeR && lx >= 13) || (edgeU && ly <= 2) || (edgeD && ly >= 13)) {
            c = CA[3];
            if ((edgeL && lx === 0) || (edgeR && lx === 15) || (edgeU && ly === 0) || (edgeD && ly === 15)) c = CA[0];
            if ((edgeL && lx === 1) || (edgeU && ly === 1)) c = CA[4];
          }
          break;
        }
        case 'wall': {
          const belowT = tAt(tx, ty + 1);
          const face = belowT !== 'wall';
          if (face) {
            // bookshelf face
            if (ly < 2) c = WL[3];
            else if (lx === 0 || lx === 15 || ly === 2 || ly === 8 || ly === 9 || ly === 15) c = WOOD[ly === 15 ? 0 : 1];
            else {
              const shelf = ly < 8 ? 0 : 1;
              const bw = 2 + Math.floor(hash(tx * 8 + Math.floor(lx / 2), ty * 2 + shelf, seed + 23) * 2);
              const book = Math.floor((lx - 1) / bw);
              const bv = hash(tx * 16 + book, ty * 2 + shelf, seed + 24);
              const top = shelf === 0 ? 3 + Math.floor(bv * 2) : 10 + Math.floor(bv * 2);
              if (ly < top) c = WL[0];
              else {
                c = BOOKS[Math.floor(bv * BOOKS.length)];
                if ((lx - 1) % bw === 0) c = 0x1b1426;
                else if (ly === top + 1 && bv > 0.4) c = 0xf2cd6b; // gilded band
              }
            }
          } else {
            const v = vnoise(px * 0.2, py * 0.2, seed + 25);
            c = v < 0.5 ? WL[1] : WL[2];
            if (tAt(tx, ty - 1) !== 'wall' && ly === 0) c = WL[3];
            if (tAt(tx - 1, ty) !== 'wall' && lx === 0) c = WL[3];
            if (tAt(tx + 1, ty) !== 'wall' && lx === 15) c = WL[0];
          }
          break;
        }
        case 'void':
        case 'hidden': {
          c = 0x07050f;
          const hs = hash(px, py, seed + 27);
          if (hs > 0.996) c = 0x8f88c8; else if (hs > 0.992) c = 0x3d3770;
          // ledge face under floor
          const above = tAt(tx, ty - 1);
          if (above !== 'void' && above !== 'hidden' && above !== 'wall') {
            if (ly < 5) c = ly === 0 ? DF[4] : ly < 4 ? (hash(px, ty, 3) > 0.7 ? DF[1] : DF[2]) : DF[0];
          }
          break;
        }
      }
      if (shadeTiles?.has(ty * w + tx) && (t === 'grass' || t === 'meadow')) {
        const v = vnoise(px * 0.12, py * 0.12, seed + 50);
        c = v < 0.4 ? 0x0a1a2c : v < 0.75 ? 0x0c2032 : 0x0f283a;
      }
      // soft shadow cast by cliffs/walls onto the tile below
      if (t !== 'cliff' && t !== 'wall' && t !== 'void' && t !== 'hidden' && t !== 'sky') {
        const aboveT = tAt(tx, ty - 1);
        if ((aboveT === 'cliff' || aboveT === 'wall') && ly < 3 && (px + ly) % 2 === 0) c = darken(c);
      }
      // the island's edge against open space
      if (t !== 'sky' && t !== 'bridge' && t !== 'void' && t !== 'hidden' && t !== 'wall') {
        if (T(px, py + 1) === 'sky') c = t === 'water' ? WA[4] : isGrass(t) ? G[4] : P[3];
        else if (T(px, py - 1) === 'sky' || T(px - 1, py) === 'sky' || T(px + 1, py) === 'sky') c = t === 'water' ? WA[2] : K[1];
      }
      if (c >= 0) put(px, py, c);
    }

  // ---- 3. decoration stamps ----
  const stampOK = (x: number, y: number) => isGrass(T(x, y)) && isGrass(T(x + 3, y + 3)) && isGrass(T(x - 2, y)) && tAt(x >> 4, y >> 4) !== 'cliff' && !shadeTiles?.has((y >> 4) * w + (x >> 4));
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      const t = tg[ty][tx];
      if (t !== 'grass' && t !== 'meadow') continue;
      const meadow = t === 'meadow';
      for (let k = 0; k < (meadow ? 4 : 2); k++) {
        const r = hash(tx * 7 + k, ty * 13, seed + 31);
        const x = tx * 16 + Math.floor(hash(tx, ty * 3 + k, seed + 32) * 13);
        const y = ty * 16 + Math.floor(hash(tx * 5 + k, ty, seed + 33) * 13);
        if (!stampOK(x, y)) continue;
        if (r < (meadow ? 0.55 : 0.22)) tuft(put, x, y, theme);
        else if (r < (meadow ? 0.85 : 0.27)) flower(put, x, y, hash(x, y, 5));
      }
    }

  ctx.putImageData(img, 0, 0);
  return { canvas, terrain: tg, waterPixels };
}

/** Cools a warm daylight colour down to moonlight. */
export function night(c: number) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.round(r * 0.55) << 16) | (Math.round(g * 0.6) << 8) | Math.round(b * 0.85);
}

function darken(c: number) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.round(r * 0.72) << 16) | (Math.round(g * 0.72) << 8) | Math.round(b * 0.8);
}

type Put = (x: number, y: number, c: number) => void;

function tuft(put: Put, x: number, y: number, theme: string) {
  const hi = theme === 'woods' ? G[3] : G[4];
  const lo = G[1];
  put(x, y + 1, hi); put(x, y + 2, hi);
  put(x + 2, y, hi); put(x + 2, y + 1, hi); put(x + 2, y + 2, hi);
  put(x + 4, y + 1, hi); put(x + 4, y + 2, hi);
  put(x + 1, y + 3, lo); put(x + 3, y + 3, lo); put(x + 2, y + 3, lo);
}

function flower(put: Put, x: number, y: number, v: number) {
  const cols = [[0xff9fd0, 0xb85a9e], [0xf4f4ff, 0x9aa4d6], [0x8ff0ff, 0x3fa8c8], [0xc69bff, 0x7a55c8], [0x9dffd8, 0x3fae96]];
  const [a, b] = cols[Math.floor(v * cols.length)];
  put(x + 1, y, a); put(x, y + 1, a); put(x + 2, y + 1, a); put(x + 1, y + 2, b);
  put(x + 1, y + 1, 0xffffff);
  put(x + 1, y + 3, G[1]);
}
