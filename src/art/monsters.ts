// Enemies, the Archive boss, projectiles, pickups and effect sprites.
import { OUTLINE } from './characters';
import { Pix, RGB, shade } from './pixel';

const O = OUTLINE;

/** Glimmerling: a glittery gold slime that loves shiny results. 4 frames. */
export function glimmerling(base: RGB = 0xf2c14e): Pix[] {
  const squash = [[6.5, 5], [6, 5.6], [5.4, 6.4], [7, 4.4]];
  return squash.map(([rx, ry], f) => {
    const p = new Pix(16, 16);
    const cy = 15 - ry;
    p.ellipse(8, cy, rx, ry, (dx, dy) => {
      const l = -dx * 0.5 - dy * 0.8;
      return l > 0.75 ? 0xfff6c8 : l > 0.15 ? shade(base, 0.25) : l > -0.5 ? base : shade(base, -0.3);
    });
    // eyes
    const ey = Math.round(cy - 0.5);
    p.set(6, ey, 0x2b1b3a); p.set(10, ey, 0x2b1b3a); p.set(6, ey - 1, 0x2b1b3a); p.set(10, ey - 1, 0x2b1b3a);
    p.set(8, ey + 2, 0x8a3a1a);
    // sparkles that move between frames
    const sp = [[4, 9], [11, 8], [9, 11], [5, 12]][f];
    p.set(sp[0], sp[1], 0xffffff);
    p.set(12 - f, 6 + f, 0xffffff);
    return p.outline(O);
  });
}

/** Noise bat: static-scrambled wings. 2 frames. */
export function noisebat(): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(16, 14);
    const wing = (x0: number, dir: number) => {
      for (let i = 0; i < 6; i++) {
        const h = f ? [3, 4, 4, 3, 2, 1][i] : [1, 2, 3, 3, 3, 2][i];
        const top = f ? 2 + i * 0.5 : 6 - (i < 3 ? 0 : 1);
        for (let j = 0; j < h; j++) p.set(x0 + dir * i, Math.round(top + j), (i + j) % 2 ? 0x5a4f80 : 0x8a82b8);
      }
    };
    wing(5, -1); wing(10, 1);
    p.ellipse(7.5, 7, 2.6, 3, 0x3a3060);
    p.set(6, 6, 0xff5c7a); p.set(9, 6, 0xff5c7a);
    p.set(6, 4, 0x3a3060); p.set(9, 4, 0x3a3060);
    p.set(7, 9, 0xffffff); p.set(8, 9, 0xffffff);
    return p.outline(O);
  });
}

/** Pagewing: a moth made of loose manuscript pages. 2 frames. */
export function pagewing(): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(16, 14);
    const wy = f ? 2 : 4;
    p.rect(2, wy, 5, 6 - (f ? 0 : 2), 0xf4efe6); p.rect(9, wy, 5, 6 - (f ? 0 : 2), 0xe0d8c8);
    for (let y = wy + 1; y < wy + 5 - (f ? 0 : 2); y += 2) { p.rect(3, y, 3, 1, 0x8a82b8); p.rect(10, y, 3, 1, 0x8a82b8); }
    p.rect(7, 4, 2, 7, 0x3a3060);
    p.set(7, 3, 0xff5c7a); p.set(8, 3, 0xff5c7a);
    p.set(6, 2, 0x3a3060); p.set(9, 2, 0x3a3060);
    return p.outline(O);
  });
}

/** Null wisp: a pale, friendly ghost of an unpublished result. 2 frames. */
export function nullwisp(): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(14, 16);
    p.ellipse(7, 6, 5, 5, (dx, dy) => (dx < -0.3 && dy < -0.2 ? 0xffffff : dx > 0.4 ? 0x9fd4ff : 0xd8f0ff));
    for (let x = 2; x < 12; x++) {
      const len = 4 + ((x + f) % 3 === 0 ? 2 : (x + f) % 3 === 1 ? 1 : 0);
      for (let y = 6; y < 6 + len; y++) p.set(x, y, x > 8 ? 0x9fd4ff : 0xd8f0ff);
    }
    p.set(5, 6, 0x2b3a6b); p.set(9, 6, 0x2b3a6b); p.set(5, 5, 0x2b3a6b); p.set(9, 5, 0x2b3a6b);
    p.rect(6, 8, 2, 1, 0x2b3a6b);
    return p.outline(0x4a6aa8);
  });
}

/** The Gilded Curator: a crowned magpie in a golden robe. 48x48, 4 frames. */
export function curator(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const p = new Pix(48, 48);
    const gold = [0x8a5a12, 0xc68a22, 0xf2c14e, 0xfff0a8];
    const black = [0x120c1e, 0x241a38, 0x3a2f57];
    // robe
    for (let y = 22; y < 44; y++) {
      const half = 7 + (y - 22) * 0.55;
      for (let x = Math.round(24 - half); x < Math.round(24 + half); x++) {
        const rel = (x - 24) / half;
        let c = rel < -0.4 ? gold[2] : rel < 0.5 ? gold[1] : gold[0];
        if ((y + x) % 6 === 0) c = gold[3];
        if (y > 40) c = gold[0];
        p.set(x, y, c);
      }
    }
    p.rect(22, 24, 4, 18, 0xb8394d);
    // wings
    const wy = f === 1 ? -4 : f === 2 ? 2 : 0;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const x = 24 + s * (10 + i);
        const top = 18 + wy + Math.abs(i - 3) * 0.6 + (f === 3 ? -6 : 0) * (i / 12);
        const len = 12 - i * 0.7;
        for (let j = 0; j < len; j++) p.set(x, Math.round(top + j), j < 2 ? black[2] : i > 7 ? 0xf4f4ff : black[1]);
      }
    }
    // head
    p.ellipse(24, 15, 8, 7.5, (dx, dy) => (dx < -0.3 && dy < -0.3 ? black[2] : black[1]));
    p.ellipse(24, 19, 5, 3, 0xf4f4ff);
    // beak
    p.rect(30, 14, 6, 3, gold[2]); p.rect(33, 16, 4, 1, gold[0]);
    // eye
    p.rect(26, 11, 3, 3, f === 3 ? 0xff5c7a : 0xffffff); p.set(27, 12, 0x120c1e);
    // crown
    p.rect(17, 5, 14, 3, gold[2]);
    for (const x of [17, 22, 27, 30]) p.rect(x, 2, 2, 3, gold[2]);
    p.set(23, 6, 0xff5c7a); p.set(19, 6, 0x5ef0ff); p.set(28, 6, 0x86d27e);
    p.rect(17, 5, 14, 1, gold[3]);
    // talons
    p.rect(18, 44, 4, 2, gold[1]); p.rect(26, 44, 4, 2, gold[1]);
    return p.outline(O);
  });
}

export function coin(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const p = new Pix(8, 8);
    const w = [3, 2, 1, 2][f];
    p.ellipse(4, 4, w + 0.5, 3.5, (dx) => (dx < 0 ? 0xfff0a8 : 0xf2c14e));
    if (w > 1) p.set(4, 4, 0xc68a22);
    return p.outline(0x6b3e0a);
  });
}

// ---------- pickups / items ----------
export function shard(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const p = new Pix(10, 12);
    const c = [0x2bb7d6, 0x5ef0ff, 0xb8fbff, 0xffffff];
    const pts = [[5, 1], [8, 5], [5, 10], [2, 5]];
    for (let y = 1; y <= 10; y++) {
      const half = y <= 5 ? (y - 1) * 0.75 : (10 - y) * 0.6;
      for (let x = Math.round(5 - half); x <= Math.round(5 + half - 0.01); x++) p.set(x, y, x < 5 ? c[1] : c[0]);
    }
    p.set(4, 3, c[3]); p.set(4, 4, c[2]);
    if (f === 1) p.set(3, 5, c[3]);
    if (f === 2) p.set(5, 7, c[3]);
    void pts;
    return p.outline(0x163a5a);
  });
}

export function heart(fill: 'full' | 'half' | 'empty', big = false): Pix {
  const p = new Pix(big ? 13 : 9, big ? 12 : 8);
  const rows = big
    ? ['.xxx...xxx.', 'xxxxx.xxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', '.xxxxxxxxx.', '..xxxxxxx..', '...xxxxx...', '....xxx....', '.....x.....']
    : ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
  const red = 0xff4d6a, redD = 0xc22a48, empty = 0x3a3060;
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] !== 'x') continue;
      let c = fill === 'empty' ? empty : red;
      if (fill === 'half' && x >= r.length / 2) c = empty;
      if (c === red && y > rows.length / 2) c = redD;
      if (c === red && y === 1 && (x === 1 || x === 2)) c = 0xffd0d8;
      p.set(x + 1, y + 1, c);
    }
  });
  return p.outline(O);
}

export function heartPiece(): Pix {
  const p = heart('full', true);
  // carve a quarter missing
  for (let y = 0; y < 7; y++) for (let x = 7; x < 13; x++) if (p.get(x, y) !== -1) p.set(x, y, 0x3a3060);
  return p;
}

export function key(big = false): Pix {
  const p = new Pix(big ? 16 : 10, big ? 16 : 14);
  const g = big ? 0xff5c7a : 0xf2c14e, d = big ? 0xb8394d : 0xc68a22;
  if (big) {
    p.ellipse(8, 5, 4, 4, g); p.ellipse(8, 5, 1.5, 1.5, -1);
    p.rect(7, 8, 2, 7, g); p.rect(9, 11, 3, 2, d); p.rect(9, 14, 2, 1, d);
  } else {
    p.ellipse(5, 3.5, 3, 3, g); p.set(5, 3, -1); p.set(4, 3, -1);
    p.rect(4, 6, 2, 7, g); p.rect(6, 9, 2, 1, d); p.rect(6, 11, 2, 1, d);
    p.set(4, 2, 0xfff0a8);
  }
  return p.outline(O);
}

export function lanternItem(lit = true): Pix {
  const p = new Pix(14, 18);
  p.rect(5, 1, 4, 2, 0x8e88a8); p.ellipse(7, 1.5, 3, 1.5, -1); p.set(6, 0, 0x8e88a8); p.set(7, 0, 0x8e88a8);
  p.rect(3, 3, 8, 2, 0x6a5aa0); p.rect(3, 3, 8, 1, 0x8f7fd0);
  p.rect(3, 5, 8, 9, lit ? 0x9ff4ff : 0x3d4a7a);
  p.rect(5, 7, 4, 5, lit ? 0xffffff : 0x5a6aa0);
  p.rect(3, 5, 1, 9, 0x6a5aa0); p.rect(10, 5, 1, 9, 0x4a3a80); p.rect(6, 5, 2, 9, lit ? 0xd4fdff : 0x5a6aa0);
  p.rect(2, 14, 10, 2, 0x6a5aa0); p.rect(2, 14, 10, 1, 0x8f7fd0);
  return p.outline(O);
}

export function swordItem(): Pix {
  const p = new Pix(16, 16);
  for (let i = 0; i < 9; i++) { p.set(4 + i, 11 - i, 0xe4f6ff); p.set(5 + i, 11 - i, 0x9ccbf0); }
  p.set(13, 2, 0xffffff);
  p.rect(2, 10, 5, 2, 0xf2c14e); p.rect(4, 8, 2, 6, 0xf2c14e);
  p.rect(1, 13, 3, 2, 0x6b4630);
  return p.outline(O);
}

export function potion(): Pix {
  const p = new Pix(12, 14);
  p.rect(4, 1, 4, 3, 0xb7b2cd); p.rect(4, 0, 4, 1, 0x8c5f40);
  p.ellipse(6, 8.5, 4.5, 4.5, (dx, dy) => (dy < -0.4 ? 0xb7b2cd : dx < -0.3 ? 0xff9fb0 : 0xff4d6a));
  p.set(4, 7, 0xffffff);
  return p.outline(O);
}

/** Sword sprites per facing: blade drawn pointing right, rotate in engine. */
export function blade(): Pix {
  const p = new Pix(16, 6);
  p.rect(5, 2, 10, 2, 0xe4f6ff); p.rect(5, 3, 10, 1, 0x9ccbf0); p.set(15, 2, 0xffffff);
  p.rect(3, 0, 2, 6, 0xf2c14e); p.set(3, 0, 0xfff0a8);
  p.rect(0, 2, 3, 2, 0x6b4630);
  return p.outline(O);
}

/** White arc used for the sword swipe trail. */
export function slash(): Pix {
  const p = new Pix(24, 24);
  for (let a = -1.2; a <= 1.2; a += 0.02) {
    for (let r = 13; r <= 17; r++) {
      const x = 12 + Math.cos(a) * r * 0.75, y = 12 + Math.sin(a) * r * 0.75;
      p.set(x, y, r > 15 ? 0xffffff : 0xb8fbff);
    }
  }
  return p;
}

export function puff(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const p = new Pix(16, 16);
    const r = 2 + f * 1.6;
    p.ellipse(8, 8, r, r, f > 1 ? 0xb4a6d4 : 0xffffff);
    if (f > 1) p.ellipse(8, 8, r - 2, r - 2, -1);
    return p;
  });
}

export function sparkle(): Pix {
  const p = new Pix(5, 5);
  p.set(2, 0, 0xffffff); p.set(2, 4, 0xffffff); p.set(0, 2, 0xffffff); p.set(4, 2, 0xffffff);
  p.set(2, 1, 0xd4fdff); p.set(2, 3, 0xd4fdff); p.set(1, 2, 0xd4fdff); p.set(3, 2, 0xd4fdff); p.set(2, 2, 0xffffff);
  return p;
}

/** ADA's little companion drone. 2 frames. */
export function drone(): Pix[] {
  return [0, 1].map((f) => {
    const p = new Pix(12, 12);
    p.ellipse(6, 6, 4.6, 4.6, (dx, dy) => (dx < -0.3 && dy < -0.3 ? 0xffffff : dx > 0.4 ? 0x8fa8c8 : 0xd8e4f4));
    p.rect(3, 5, 6, 3, 0x15222e);
    p.set(f ? 5 : 4, 6, 0x5ef0ff); p.set(f ? 7 : 6, 6, 0x5ef0ff);
    p.set(6, 0, 0x5ef0ff); p.set(6, 1, 0x8fa8c8);
    return p.outline(OUTLINE);
  });
}
