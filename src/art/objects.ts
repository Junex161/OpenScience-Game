// Procedural pixel-art props: trees, houses, chests, dungeon furniture...
// Every painter returns an outlined Pix; animated ones return frame arrays.
import { OUTLINE } from './characters';
import { hash, Pix, RGB, rng, shade } from './pixel';

const O = OUTLINE;

function canopy(p: Pix, blobs: [number, number, number][], cols: RGB[], seed: number) {
  // cols: [dark, mid, light, highlight]
  const r = rng(seed);
  for (const [cx, cy, rad] of blobs)
    p.ellipse(cx, cy, rad, rad * 0.9, (dx, dy) => {
      const l = -dx * 0.6 - dy * 0.8;
      return l > 0.75 ? cols[3] : l > 0.2 ? cols[2] : l > -0.45 ? cols[1] : cols[0];
    });
  // leafy texture: little clusters of light / dark pixels
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * p.w), y = Math.floor(r() * p.h);
    const v = p.get(x, y);
    if (v === cols[1] && p.get(x + 1, y) === cols[1]) { p.set(x, y, cols[2]); p.set(x + 1, y, cols[2]); p.set(x, y + 1, cols[0]); }
    if (v === cols[2] && r() < 0.5) { p.set(x, y, cols[3]); }
    if (v === cols[0] && r() < 0.6) { p.set(x, y, shade(cols[0], -0.25)); }
  }
}

/**
 * Alien flora of Lumen. 'teal' and 'violet' are giant glowcaps (mushroom
 * trees with luminous gills), 'dark' is a tiered spire tree that makes up
 * the deep forest, 'gold' a rare amber glowcap.
 */
export function tree(kind: 'green' | 'violet' | 'dark' | 'gold', seed = 1): Pix {
  return kind === 'dark' ? spire(seed) : glowcap(kind, seed);
}

function glowcap(kind: 'green' | 'violet' | 'gold', seed: number): Pix {
  const p = new Pix(32, 40);
  const r = rng(seed);
  const stalk = [0x4d4874, 0x7d78a8, 0xb8b2de];
  const lean = (r() - 0.5) * 2.4;
  for (let y = 15; y < 38; y++) {
    const w = y > 34 ? 4 : y > 28 ? 3.5 : 3;
    const cx = 16 + Math.sin((y - 15) * 0.13) * lean;
    for (let x = Math.round(cx - w); x < Math.round(cx + w); x++) {
      const rel = (x - cx) / w;
      p.set(x, y, rel < -0.4 ? stalk[2] : rel > 0.35 ? stalk[0] : stalk[1]);
    }
  }
  p.rect(11, 37, 3, 1, stalk[1]); p.rect(19, 37, 3, 1, stalk[0]);
  p.rect(15, 24, 1, 2, stalk[0]); p.rect(17, 30, 1, 2, stalk[0]);
  const cols: Record<string, RGB[]> = {
    green: [0x0f3348, 0x17566c, 0x2488a0, 0x6fe0d8],
    violet: [0x2a1a56, 0x452a84, 0x7046b8, 0xbf98f4],
    gold: [0x5a2a1c, 0x9a4a20, 0xd8822e, 0xffcf6a],
  };
  const gill: Record<string, RGB[]> = {
    green: [0x7af3ff, 0xd4fdff], violet: [0xff8fe0, 0xffd4f6], gold: [0xfff0a8, 0xffffff],
  };
  const c = cols[kind], gl = gill[kind];
  p.ellipse(16, 14, 14.6, 11, (dx, dy) => {
    if (dy > 0.42) return -1;
    if (dy > 0.24) return Math.abs(Math.round(dx * 14.6)) % 2 ? gl[0] : gl[1]; // glowing gills
    const l = -dx * 0.55 - dy * 0.9;
    return l > 0.9 ? c[3] : l > 0.4 ? c[2] : l > -0.1 ? c[1] : c[0];
  });
  // pale spots on the cap
  for (let i = 0; i < 5; i++) {
    const x = 6 + Math.floor(r() * 20), y = 5 + Math.floor(r() * 8);
    if (p.get(x, y) === c[1] || p.get(x, y) === c[2]) { p.set(x, y, c[3]); p.set(x + 1, y, c[3]); p.set(x, y + 1, c[2]); }
  }
  // spores drifting below the gills
  for (let i = 0; i < 3; i++) p.set(5 + Math.floor(r() * 22), 21 + Math.floor(r() * 4), gl[0]);
  return p.outline(O);
}

function spire(seed: number): Pix {
  const p = new Pix(32, 40);
  const r = rng(seed);
  const c = [0x091727, 0x0f2638, 0x17394f, 0x2a6072];
  p.rect(14, 31, 4, 7, 0x1e1734); p.rect(14, 31, 1, 7, 0x322850);
  const tiers = 3;
  for (let t = tiers - 1; t >= 0; t--) {
    const apex = 1 + t * 8, hgt = 15, hw = 6.5 + t * 3;
    for (let y = apex; y < apex + hgt; y++) {
      const half = ((y - apex + 1) / hgt) * hw;
      for (let x = Math.round(16 - half); x < Math.round(16 + half); x++) {
        const rel = (x - 16) / Math.max(1, half);
        let col = rel < -0.55 ? c[2] : rel > 0.3 ? c[0] : c[1];
        if (y >= apex + hgt - 2) col = hash(x, t, seed) < 0.5 ? c[0] : -1 as unknown as number; // ragged hem
        if (rel < -0.8 && y < apex + hgt - 2) col = c[3];
        if (col !== -1) p.set(x, y, col);
      }
    }
  }
  // a few glow-moths resting on the branches
  for (let i = 0; i < 3; i++) {
    const x = 8 + Math.floor(r() * 16), y = 10 + Math.floor(r() * 20);
    if (p.get(x, y) !== -1) p.set(x, y, i % 2 ? 0x7af3ff : 0xbf98f4);
  }
  p.set(16, 0, 0xd4fdff);
  return p.outline(O);
}

export function bush(seed = 2, cut = false): Pix {
  const p = new Pix(16, 16);
  if (cut) {
    p.rect(5, 11, 6, 3, 0x18495c); p.rect(6, 10, 4, 1, 0x257078); p.set(7, 12, 0x0f2e40); p.set(9, 11, 0x0f2e40);
    return p.outline(O);
  }
  canopy(p, [[8, 9, 6.6], [5, 10, 4.5], [11, 10, 4.5], [8, 6.5, 4.5]], [0x0f2e40, 0x18495c, 0x257078, 0x4fb8a8], seed);
  const r = rng(seed);
  for (let i = 0; i < 3; i++) { const x = 4 + Math.floor(r() * 8), y = 5 + Math.floor(r() * 6); p.set(x, y, 0xb8ffe6); }
  return p.outline(O);
}

export function rock(seed = 3): Pix {
  const p = new Pix(16, 16);
  p.ellipse(8, 9.5, 6.8, 5.5, (dx, dy) => {
    const l = -dx * 0.5 - dy * 0.9;
    return l > 0.6 ? 0xc0b6d8 : l > 0 ? 0x9a8fb8 : l > -0.6 ? 0x766b95 : 0x564c73;
  });
  const r = rng(seed);
  p.set(6 + Math.floor(r() * 3), 10, 0x564c73); p.set(7 + Math.floor(r() * 3), 11, 0x564c73);
  p.set(10, 7, 0x766b95);
  // moss
  p.set(4, 7, 0x2e7676); p.set(5, 6, 0x2e7676); p.set(6, 6, 0x56b89c);
  return p.outline(O);
}

export function mushroom(): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(16, 16);
    const cap = f ? 0x7af3ff : 0x52d8f0;
    p.rect(4, 10, 2, 4, 0xe9e2ff); p.ellipse(5, 9, 3.2, 2.2, cap); p.set(4, 8, 0xe8ffff);
    p.rect(10, 9, 2, 5, 0xe9e2ff); p.ellipse(11, 8, 3.6, 2.6, f ? 0xd38bff : 0xb36ff0); p.set(10, 7, 0xf6e1ff);
    p.rect(7, 12, 1, 2, 0xe9e2ff); p.ellipse(7.5, 11.5, 2, 1.4, cap);
    return p.outline(O);
  });
}

export function fence(): Pix {
  const p = new Pix(16, 16);
  const w = 0xb07a48, d = 0x7c5232, l = 0xd49a5c;
  p.rect(2, 5, 3, 9, w); p.set(2, 5, l); p.rect(4, 6, 1, 8, d);
  p.rect(11, 5, 3, 9, w); p.set(11, 5, l); p.rect(13, 6, 1, 8, d);
  p.rect(0, 7, 16, 2, w); p.rect(0, 7, 16, 1, l);
  p.rect(0, 11, 16, 2, w); p.rect(0, 12, 16, 1, d);
  return p.outline(O);
}

export function sign(): Pix {
  const p = new Pix(16, 16);
  p.rect(7, 9, 2, 6, 0x6b4630);
  p.rect(2, 3, 12, 7, 0xc29257); p.rect(2, 3, 12, 1, 0xe0b67a); p.rect(2, 9, 12, 1, 0x7c5232);
  for (let x = 4; x < 12; x += 2) p.set(x, 5, 0x5e3a24);
  p.rect(4, 7, 6, 1, 0x5e3a24);
  return p.outline(O);
}

export function lamp(): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(16, 32);
    p.rect(7, 10, 2, 20, 0x3a3555); p.set(7, 10, 0x5e5880);
    p.rect(5, 29, 6, 2, 0x2b2742);
    p.rect(4, 4, 8, 7, 0x3a3555);
    p.rect(5, 5, 6, 5, f ? 0xfff2a8 : 0xffe07a);
    p.rect(6, 6, 2, 2, 0xffffff);
    p.rect(3, 3, 10, 1, 0x5e5880); p.rect(6, 2, 4, 1, 0x5e5880);
    return p.outline(O);
  });
}

export function chest(open: boolean, big = false): Pix {
  const s = big ? 24 : 16;
  const p = new Pix(s, s);
  const w = big ? 20 : 12, x0 = (s - w) / 2, y0 = big ? 6 : 4, hgt = big ? 14 : 10;
  const wood = big ? 0x4a3a8a : 0xa0703f, woodD = big ? 0x2e2460 : 0x6b4630, woodL = big ? 0x6a5ac0 : 0xc29257;
  const metal = big ? 0xf2cd6b : 0xd9a441, metalD = big ? 0xb07a20 : 0x8a6a2a;
  if (open) {
    p.rect(x0, y0 - 2, w, 4, woodD); p.rect(x0, y0 - 2, w, 1, wood);
    p.rect(x0, y0 + 2, w, hgt - 2, wood);
    p.rect(x0 + 1, y0 + 2, w - 2, 2, 0x1a1326);
    p.rect(x0, y0 + hgt - 2, w, 2, woodD);
  } else {
    p.rect(x0, y0, w, hgt, wood);
    p.rect(x0, y0, w, 2, woodL);
    p.rect(x0, y0 + 4, w, 1, woodD);
    p.rect(x0, y0 + hgt - 2, w, 2, woodD);
    p.rect(x0 + w / 2 - 1, y0 + 3, 2, 3, metal); p.set(x0 + w / 2 - 1, y0 + 5, metalD);
  }
  p.rect(x0 + 1, y0 + (open ? 2 : 0), 1, hgt - (open ? 2 : 0), metal);
  p.rect(x0 + w - 2, y0 + (open ? 2 : 0), 1, hgt - (open ? 2 : 0), metalD);
  return p.outline(O);
}

export function pot(broken = false): Pix {
  const p = new Pix(16, 16);
  if (broken) {
    p.rect(4, 12, 3, 2, 0xb0603a); p.rect(9, 13, 4, 1, 0x8a4a2a); p.set(7, 11, 0xd9875a);
    return p.outline(O);
  }
  p.ellipse(8, 10, 5, 4.5, (dx, dy) => (dx < -0.3 && dy < 0 ? 0xe39a6a : dx > 0.4 ? 0x8a4a2a : 0xb8673e));
  p.rect(5, 4, 6, 2, 0xb8673e); p.rect(5, 4, 6, 1, 0xe39a6a);
  p.rect(4, 9, 8, 1, 0xf2cd6b);
  return p.outline(O);
}

export function crate(): Pix {
  const p = new Pix(16, 16);
  p.rect(2, 3, 12, 11, 0xa0703f); p.rect(2, 3, 12, 1, 0xc29257);
  p.rect(2, 13, 12, 1, 0x6b4630); p.rect(2, 3, 1, 11, 0xc29257); p.rect(13, 3, 1, 11, 0x6b4630);
  for (let i = 0; i < 10; i++) p.set(3 + i, 4 + i * 0.9, 0x7c5232);
  return p.outline(O);
}

export function barrel(): Pix {
  const p = new Pix(16, 16);
  p.ellipse(8, 9, 5.5, 5.5, (dx) => (dx < -0.4 ? 0xc29257 : dx > 0.45 ? 0x6b4630 : 0xa0703f));
  p.rect(3, 6, 10, 1, 0x4a4a66); p.rect(3, 11, 10, 1, 0x4a4a66);
  p.ellipse(8, 4.5, 4.5, 1.6, 0x7c5232);
  return p.outline(O);
}

/** Habitat pod of the Haven colony: panelled walls, portholes, a scaled dome. 64x64 */
export function house(roof: RGB, wall = 0xd6dcec, seed = 5): Pix {
  const p = new Pix(64, 64);
  void seed;
  const wallD = shade(wall, -0.2), wallDD = shade(wall, -0.4), wallL = shade(wall, 0.3);
  p.rect(8, 34, 48, 26, wall);
  p.rect(46, 34, 10, 26, wallD);
  p.rect(8, 34, 2, 26, wallL);
  for (const x of [20, 43]) p.rect(x, 36, 1, 20, wallD);
  p.rect(8, 55, 48, 2, shade(roof, -0.25));
  p.rect(8, 57, 48, 3, wallDD);
  // portholes with warm light
  for (const cx of [18, 46]) {
    p.ellipse(cx, 44.5, 5.6, 5.6, 0x2a2f4a);
    p.ellipse(cx, 44.5, 4.2, 4.2, (dx, dy) => (dx < -0.2 && dy < -0.2 ? 0xfff2c4 : dy > 0.4 ? 0xf0b85a : 0xffd77a));
  }
  // sliding hatch with a light strip
  p.rect(25, 41, 14, 18, 0x2a2f4a);
  p.rect(27, 43, 10, 16, 0x7f89ad); p.rect(27, 43, 10, 1, 0xa9b3d4); p.rect(35, 43, 2, 16, 0x626c92);
  p.rect(32, 43, 1, 16, 0x4a5278);
  p.rect(27, 41, 10, 1, 0x5ef0ff);
  p.set(30, 51, 0x5ef0ff);
  // dome
  const roofD = shade(roof, -0.3), roofL = shade(roof, 0.25), roofDD = shade(roof, -0.5);
  for (let y = 5; y < 36; y++)
    for (let x = 2; x < 62; x++) {
      const dx = (x + 0.5 - 32) / 30, dy = (y + 0.5 - 35) / 30;
      if (dx * dx + dy * dy > 1) continue;
      const row = Math.floor((y - 5) / 5);
      const sx = (x + (row % 2) * 4) % 8;
      let c = roof;
      if (sx === 0 || (y - 5) % 5 === 4) c = roofD;
      if (dx < -0.3 && dy < -0.35 && c === roof) c = roofL;
      if (dx > 0.45) c = c === roofD ? roofDD : roofD;
      if (y >= 33) c = roofDD;
      p.set(x, y, c);
    }
  // skylight and antenna
  p.ellipse(32, 20, 4.4, 4.4, 0x2a2f4a); p.ellipse(32, 20, 3.2, 3.2, 0x9ee8ff); p.set(31, 19, 0xffffff);
  p.rect(48, 3, 1, 11, 0x8e88a8); p.set(48, 2, 0xff5c7a); p.rect(50, 8, 4, 1, 0xb7b2cd); p.rect(49, 9, 2, 1, 0x8e88a8);
  return p.outline(O);
}

/** Big library building with a crystal dome (Lena's Index library). 96x80 */
export function library(): Pix {
  const p = new Pix(96, 80);
  const wall = 0xd8d2e8, wallD = 0xb1a9c9;
  // crystal dome
  p.ellipse(48, 36, 30, 26, (dx, dy) => {
    if (dy > 0) return -1;
    const facet = (Math.floor((dx + 1) * 6) + Math.floor((dy + 1) * 4)) % 3;
    const l = -dx * 0.5 - dy * 0.6;
    return l > 0.7 ? 0xe4fbff : facet === 0 ? 0x5ec8e8 : facet === 1 ? 0x3a9ac8 : 0x2a6fa8;
  });
  p.rect(6, 40, 84, 36, wall); p.rect(76, 40, 14, 36, wallD); p.rect(6, 74, 84, 2, 0x8e88a8);
  for (let x = 10; x < 88; x += 12) { p.rect(x, 40, 4, 34, 0xf0ecf8); p.rect(x + 3, 40, 1, 34, wallD); }
  p.rect(4, 36, 88, 5, 0x6a5aa0); p.rect(4, 36, 88, 1, 0x8f7fd0);
  // big door
  p.rect(38, 52, 20, 22, 0x3a2f57); p.ellipse(48, 53, 10, 6, 0x3a2f57);
  p.rect(40, 54, 16, 20, 0x5e3a24); p.ellipse(48, 55, 8, 5, 0x5e3a24); p.rect(47, 50, 2, 24, 0x3e2418);
  p.rect(40, 70, 16, 1, 0x3e2418);
  // windows
  for (const wx of [16, 26, 64, 74]) { p.rect(wx, 48, 6, 14, 0x3a2f57); p.rect(wx + 1, 49, 4, 12, 0x9ee8ff); p.rect(wx + 1, 49, 2, 4, 0xe4fbff); }
  p.rect(46, 4, 4, 8, 0xf2cd6b); p.ellipse(48, 4, 3, 3, 0xffe9a0);
  return p.outline(O);
}

/** Crystal obelisk at the plaza: the Index Beacon. lit 0..1 brightness */
export function beacon(lit: boolean): Pix {
  const p = new Pix(32, 64);
  // pedestal
  p.rect(4, 54, 24, 8, 0x8e88a8); p.rect(4, 54, 24, 2, 0xb7b2cd); p.rect(22, 56, 6, 6, 0x6c6684);
  p.rect(8, 50, 16, 4, 0xa49ebd); p.rect(8, 50, 16, 1, 0xd2cde2);
  // crystal
  const a = lit ? [0x2bb7d6, 0x5ef0ff, 0xb8fbff, 0xffffff] : [0x2a2f55, 0x3d4a7a, 0x5a6aa0, 0x8a9ac8];
  for (let y = 4; y < 50; y++) {
    const half = y < 14 ? (y - 4) * 0.8 : y < 40 ? 8 : 8 - (y - 40) * 0.3;
    for (let x = Math.round(16 - half); x < Math.round(16 + half); x++) {
      const rel = (x - 16) / Math.max(1, half);
      let c = rel < -0.5 ? a[2] : rel < 0 ? a[1] : rel < 0.6 ? a[0] : shade(a[0], -0.3);
      if ((y + Math.floor(x / 3)) % 11 === 0) c = a[2];
      p.set(x, y, c);
    }
  }
  p.rect(11, 16, 2, 14, a[3]);
  p.set(12, 12, a[3]);
  return p.outline(O);
}

export function stall(awning: RGB): Pix {
  const p = new Pix(48, 40);
  // posts
  p.rect(4, 12, 2, 26, 0x6b4630); p.rect(42, 12, 2, 26, 0x4a2f22);
  // counter
  p.rect(2, 26, 44, 12, 0xa0703f); p.rect(2, 26, 44, 2, 0xc29257); p.rect(2, 36, 44, 2, 0x6b4630);
  for (let x = 6; x < 44; x += 8) p.rect(x, 29, 1, 7, 0x7c5232);
  // goods
  const goods = [0xff6b7a, 0xffe27a, 0x5ef0ff, 0x86d27e, 0xd38bff];
  for (let i = 0; i < 6; i++) { p.ellipse(8 + i * 6.5, 24, 2.5, 2.2, goods[i % goods.length]); p.set(7 + i * 6.5, 23, 0xffffff); }
  // striped awning
  for (let y = 4; y < 14; y++)
    for (let x = 0; x < 48; x++) {
      const stripe = Math.floor(x / 6) % 2;
      let c = stripe ? awning : 0xf4efe6;
      if (y >= 11) c = stripe ? shade(awning, -0.25) : 0xd6cfc2;
      if (y === 4) c = shade(c, 0.2);
      p.set(x, y, c);
    }
  for (let x = 0; x < 48; x += 6) p.ellipse(x + 3, 14, 3, 1.5, Math.floor(x / 6) % 2 ? shade(awning, -0.25) : 0xd6cfc2);
  return p.outline(O);
}

export function well(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 22, 12, 7, (dx, dy) => (dy < -0.2 ? 0xb7b2cd : dx > 0.4 ? 0x6c6684 : 0x8e88a8));
  p.ellipse(16, 20, 8.5, 4, 0x1a3a73); p.ellipse(15, 19.5, 5, 2, 0x3270bf);
  p.rect(5, 6, 2, 16, 0x6b4630); p.rect(25, 6, 2, 16, 0x4a2f22);
  p.rect(3, 4, 26, 3, 0xb8394d); p.rect(3, 4, 26, 1, 0xe05a6e);
  p.rect(15, 7, 1, 8, 0x8e88a8); p.rect(14, 14, 3, 3, 0x7c5232);
  return p.outline(O);
}

/** Overworld entrance of the Archive: stone facade with drawers motif. 80x64 */
export function archiveGate(): Pix {
  const p = new Pix(80, 64);
  const s = [0x4d3e6b, 0x67578a, 0x8f7fb2, 0xb4a6d4];
  // massive stone block
  for (let y = 8; y < 62; y++)
    for (let x = 4; x < 76; x++) {
      const bx = Math.floor((x + (Math.floor(y / 8) % 2) * 6) / 12), by = Math.floor(y / 8);
      const edge = (x + (Math.floor(y / 8) % 2) * 6) % 12 === 0 || y % 8 === 0;
      const v = hash(bx, by, 4);
      p.set(x, y, edge ? s[0] : x > 66 ? s[1] : v < 0.5 ? s[2] : s[1]);
    }
  // roof slab
  p.rect(0, 4, 80, 6, s[3]); p.rect(0, 9, 80, 2, s[0]); p.rect(2, 2, 76, 2, s[2]);
  // drawers carved into facade
  for (const [dx, dy] of [[8, 16], [8, 32], [62, 16], [62, 32]]) {
    p.rect(dx, dy, 10, 10, 0x5e3a24); p.rect(dx + 1, dy + 1, 8, 8, 0x8c5f40); p.rect(dx + 1, dy + 1, 8, 1, 0xa0703f);
    p.rect(dx + 3, dy + 5, 4, 1, 0xf2cd6b);
  }
  // doorway
  p.rect(28, 26, 24, 36, 0x07050f);
  p.ellipse(40, 27, 12, 8, 0x07050f);
  for (let y = 22; y < 62; y++) { p.set(27, y, s[3]); p.set(52, y, s[0]); }
  // keystone with eye-of-lantern glyph
  p.rect(36, 12, 8, 8, s[3]); p.rect(38, 14, 4, 4, 0x2bb7d6); p.set(39, 15, 0xb8fbff);
  return p.outline(O);
}

export function statue(gilded: boolean): Pix {
  const p = new Pix(24, 32);
  const c = gilded ? [0x8a5a12, 0xc68a22, 0xf2c14e, 0xfff0a8] : [0x4d4766, 0x6c6684, 0x8e88a8, 0xb7b2cd];
  p.rect(3, 24, 18, 7, c[1]); p.rect(3, 24, 18, 2, c[2]); p.rect(17, 26, 4, 5, c[0]);
  // bird-ish figure on pedestal
  p.ellipse(12, 15, 6, 7, (dx, dy) => (dx < -0.3 && dy < 0 ? c[3] : dx > 0.4 ? c[0] : c[2]));
  p.ellipse(12, 7, 4, 4, (dx) => (dx < -0.2 ? c[3] : c[2]));
  p.rect(15, 7, 4, 2, c[1]);
  p.set(11, 6, c[0]);
  return p.outline(O);
}

export function drawer(open: boolean): Pix {
  const p = new Pix(16, 24);
  const w = [0x3e2418, 0x5e3a24, 0x7c5232, 0xa0703f];
  p.rect(1, 2, 14, 21, w[1]); p.rect(1, 2, 14, 2, w[3]); p.rect(13, 4, 2, 19, w[0]);
  for (let i = 0; i < 3; i++) {
    const y = 5 + i * 6;
    if (open && i === 1) {
      p.rect(2, y - 1, 12, 6, w[2]); p.rect(3, y, 10, 3, 0x07050f); p.rect(2, y + 4, 12, 1, w[0]);
    } else {
      p.rect(2, y, 11, 5, w[2]); p.rect(2, y, 11, 1, w[3]); p.rect(6, y + 2, 3, 1, 0xd9a441);
    }
  }
  return p.outline(O);
}

export function torch(): Pix[] {
  return [0, 1, 2].map((f) => {
    const p = new Pix(16, 16);
    p.rect(7, 8, 2, 6, 0x5e3a24); p.rect(5, 7, 6, 2, 0x8e88a8);
    const fl = [0xff6b2a, 0xffb33d, 0xfff2a8];
    const h = [6, 7, 5][f];
    for (let y = 0; y < h; y++) {
      const wdt = Math.max(1, Math.round((h - y) * 0.6));
      for (let x = 8 - wdt; x < 8 + wdt; x++) p.set(x + (y > h - 3 ? (f - 1) : 0), 7 - y, y < 2 ? fl[0] : y < h - 2 ? fl[1] : fl[2]);
    }
    return p.outline(O);
  });
}

export function door(kind: 'locked' | 'boss' | 'open'): Pix {
  const p = new Pix(32, 32);
  const fr = [0x2b2242, 0x3a2f57, 0x564b7a];
  p.rect(0, 0, 32, 32, fr[1]); p.rect(0, 0, 32, 3, fr[2]); p.rect(28, 0, 4, 32, fr[0]);
  if (kind === 'open') { p.rect(6, 6, 20, 26, 0x07050f); return p; }
  if (kind === 'locked') {
    p.rect(6, 6, 20, 26, 0x5e3a24); p.rect(6, 6, 20, 2, 0x8c5f40); p.rect(15, 6, 2, 26, 0x3e2418);
    p.rect(11, 15, 10, 9, 0xd9a441); p.rect(11, 15, 10, 2, 0xf2cd6b); p.rect(15, 18, 2, 4, 0x3e2418);
  } else {
    p.rect(6, 6, 20, 26, 0x6b4a12);
    for (let y = 6; y < 32; y++) for (let x = 6; x < 26; x++) if ((x + y) % 5 === 0) p.set(x, y, 0xb07a20);
    p.ellipse(16, 18, 7, 7, (dx, dy) => (dx < -0.2 && dy < 0 ? 0xfff0a8 : 0xf2c14e));
    p.ellipse(16, 18, 3.5, 3.5, 0xb8394d); p.set(15, 17, 0xff8fa0);
  }
  return p;
}

export function pillar(): Pix {
  const p = new Pix(16, 32);
  p.rect(2, 26, 12, 5, 0x564b7a); p.rect(2, 26, 12, 1, 0x6e6296);
  p.rect(4, 6, 8, 20, 0x463c66); p.rect(4, 6, 3, 20, 0x6e6296); p.rect(10, 6, 2, 20, 0x2e2645);
  p.rect(2, 2, 12, 5, 0x564b7a); p.rect(2, 2, 12, 1, 0x8478b0);
  return p.outline(O);
}

/** Single-tile pickups and small things (no outline where it looks better). */
export function beetle(col: RGB): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(12, 12);
    p.ellipse(6, 6.5, 3.6, 4, (dx) => (dx < -0.3 ? shade(col, 0.35) : dx > 0.3 ? shade(col, -0.3) : col));
    p.rect(6, 3, 1, 7, shade(col, -0.45));
    p.rect(5, 1, 3, 2, 0x2b1b3a);
    const legs = f ? [[2, 4], [9, 5], [2, 8], [9, 9]] : [[2, 5], [9, 4], [2, 9], [9, 8]];
    for (const [x, y] of legs) p.set(x, y, 0x2b1b3a);
    p.set(4, 4, 0xffffff);
    return p.outline(O);
  });
}

export function bridgeGhost(): Pix {
  const p = new Pix(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = x % 4 === 3 ? 0x2bb7d6 : (y === 0 || y === 15) ? 0x5ef0ff : 0x9ff4ff;
    p.set(x, y, c);
  }
  return p;
}

/** Little keyboard key shown above things you can interact with. */
export function keycap(letter: 'E'): Pix {
  const p = new Pix(11, 12);
  p.rect(1, 1, 9, 9, 0xf4efff); p.rect(1, 9, 9, 2, 0xa79bd0); p.rect(1, 1, 9, 1, 0xffffff);
  const glyph: Record<string, string[]> = { E: ['###', '#..', '##.', '#..', '###'] };
  glyph[letter].forEach((row, y) => { for (let x = 0; x < 3; x++) if (row[x] === '#') p.set(4 + x, 3 + y, 0x2b1b5a); });
  return p.outline(O);
}

/** Arrow that points to the current objective. Points right; rotate in engine. */
export function guideArrow(): Pix {
  const p = new Pix(15, 15);
  for (let y = 0; y < 13; y++) {
    const w = y <= 6 ? y + 1 : 13 - y;
    for (let x = 0; x < w * 1.6; x++) p.set(2 + x, 1 + y, y < 5 ? 0xfff0a8 : y < 9 ? 0xf2c14e : 0xd89a2a);
  }
  return p.outline(O, true);
}

/** The ringed gas giant that hangs in Lumen's sky. */
export function planet(): Pix {
  const p = new Pix(150, 110);
  const bands = [0x2a2a6a, 0x3a3488, 0x5546a8, 0x7b5cc0, 0x4a3c98, 0x2f6a9a, 0x3a3488, 0x241f58];
  const ring = (front: boolean) => {
    for (let a = 0; a < Math.PI * 2; a += 0.004) {
      const isFront = Math.sin(a) > 0;
      if (isFront !== front) continue;
      for (let rr = 56; rr <= 72; rr += 1) {
        if (rr > 62 && rr < 65) continue;
        const x = 75 + Math.cos(a) * rr, y = 55 + Math.sin(a) * rr * 0.26 + Math.cos(a) * rr * 0.12;
        p.set(x, y, rr > 68 ? 0x5a4d8c : rr > 64 ? 0x9a86d8 : (rr % 2 ? 0xc8b4f0 : 0x8f7fd0));
      }
    }
  };
  ring(false);
  p.ellipse(75, 55, 40, 40, (dx, dy) => {
    const lit = -dx * 0.6 - dy * 0.55;
    const b = bands[Math.max(0, Math.min(bands.length - 1, Math.floor((dy + 1 + Math.sin(dx * 3) * 0.04) * 4)))];
    if (lit < -0.55) return 0x0c0a24;
    if (lit < -0.3) return shade(b, -0.55);
    if (lit < 0) return shade(b, -0.25);
    return lit > 0.75 ? shade(b, 0.2) : b;
  });
  ring(true);
  return p;
}
