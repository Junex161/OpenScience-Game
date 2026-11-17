// Procedural characters: one generator, many looks, all directions.
// 16x24 frames: a head of about nine rows on a slim body, so figures read
// as little adventurers rather than big-headed mascots.
import { Pix, RGB, shade } from './pixel';

export const OUTLINE = 0x140f24;
export const CH_W = 16, CH_H = 24;

export interface Look {
  skin: RGB;
  hair: RGB;
  hairStyle: 'short' | 'spiky' | 'long' | 'bun' | 'bald' | 'cap';
  clothes: RGB;
  accent: RGB;
  pants: RGB;
  boots: RGB;
  extra?: 'scarf' | 'goggles' | 'labcoat' | 'antenna' | 'glasses' | 'beard';
  cape?: RGB;
  robot?: boolean;
  eye?: RGB;
}

export type Dir = 'down' | 'up' | 'side';

/**
 * One frame. frame: 0 = stand, 1/2 = stride, 3 = attack pose.
 * Side view faces right; mirror for left.
 */
export function chibi(l: Look, dir: Dir, frame: number): Pix {
  const p = new Pix(CH_W, CH_H);
  const hy = 1; // head top
  const by = 10; // shoulder row
  const legY = 17;
  const skinD = shade(l.skin, -0.2);
  const skinL = shade(l.skin, 0.15);
  const clothD = shade(l.clothes, -0.25);
  const clothL = shade(l.clothes, 0.15);
  const hairD = shade(l.hair, -0.25);
  const hairL = shade(l.hair, 0.2);
  const pantsD = shade(l.pants, -0.25);
  const eye = l.eye ?? 0x2b1b3a;
  const a = frame === 1, b = frame === 2;

  // ---- cape, behind the body ----
  if (l.cape !== undefined && dir !== 'up') {
    const c = l.cape, cd = shade(c, -0.3);
    if (dir === 'side') {
      p.rect(4, by + 1, 2, 6, c);
      p.rect(3, by + 3, 2, 6 + (a ? 1 : 0), c);
      p.rect(2, by + 5, 1, 3 + (b ? 2 : 0), cd);
      if (a) p.set(1, by + 8, cd);
    } else {
      p.rect(3, by + 1, 1, 8, cd); p.rect(12, by + 1, 1, 8, cd);
      p.rect(4, by + 7, 1, 2, c); p.rect(11, by + 7, 1, 2, cd);
    }
  }

  // ---- legs ----
  if (dir === 'side') {
    if (a) { // stride
      p.rect(5, legY, 2, 4, pantsD); p.rect(9, legY, 2, 4, l.pants);
      p.rect(4, legY + 4, 3, 2, l.boots); p.rect(9, legY + 4, 3, 2, l.boots);
    } else if (b) { // passing
      p.rect(7, legY, 2, 3, pantsD); p.rect(7, legY + 3, 3, 1, l.boots);
      p.rect(7, legY, 2, 4, l.pants); p.rect(7, legY + 4, 3, 2, l.boots);
    } else {
      p.rect(6, legY, 2, 4, pantsD); p.rect(8, legY, 2, 4, l.pants);
      p.rect(6, legY + 4, 2, 2, l.boots); p.rect(8, legY + 4, 3, 2, l.boots);
    }
  } else {
    const la = a ? 1 : 0, lb = b ? 1 : 0;
    p.rect(5, legY, 2, 4 - la, l.pants); p.rect(9, legY, 2, 4 - lb, pantsD);
    p.rect(5, legY + 4 - la, 2, 2, l.boots); p.rect(9, legY + 4 - lb, 2, 2, l.boots);
  }

  // ---- torso ----
  for (let y = by; y < by + 7; y++)
    for (let x = 5; x < 11; x++) {
      let c = l.clothes;
      if (x >= 9) c = clothD;
      if (x === 5 || y === by) c = clothL;
      p.set(x, y, c);
    }
  if (dir !== 'side') { p.set(4, by, l.clothes); p.set(11, by, clothD); }
  if (l.extra === 'labcoat') {
    for (let y = by; y < by + 9; y++) { p.set(5, y, 0xf2f2f7); p.set(10, y, 0xd6d6e3); }
    if (dir !== 'side') { p.rect(4, by + 6, 1, 3, 0xf2f2f7); p.rect(11, by + 6, 1, 3, 0xd6d6e3); }
    if (dir !== 'up') { p.set(7, by + 2, l.accent); p.set(8, by + 2, l.accent); }
  }
  if (dir !== 'up') {
    p.rect(5, by + 6, 6, 1, l.accent); // belt
    if (!l.extra || l.extra === 'scarf') { p.set(dir === 'side' ? 9 : 7, by + 3, l.accent); }
  } else p.rect(5, by + 6, 6, 1, shade(l.accent, -0.25));

  // ---- arms ----
  const swing = a ? 1 : b ? -1 : 0;
  if (dir === 'side') {
    if (frame === 3) {
      p.rect(8, by + 2, 5, 2, clothD);
      p.rect(13, by + 2, 1, 2, l.skin);
    } else {
      const ax = 7 + swing;
      p.rect(ax, by + 1, 2, 5, clothD);
      p.rect(ax, by + 6, 2, 1, l.skin);
    }
  } else {
    const ly = Math.max(0, swing), ry = Math.max(0, -swing);
    p.rect(4, by + 1 + ly, 1, 5, l.clothes); p.set(4, by + 6 + ly, l.skin);
    if (frame === 3) { p.rect(11, by + 1, 1, 3, clothD); p.rect(12, by + 3, 1, 2, clothD); p.set(12, by + 5, skinD); }
    else { p.rect(11, by + 1 + ry, 1, 5, clothD); p.set(11, by + 6 + ry, skinD); }
  }

  // ---- cape seen from behind covers the back ----
  if (l.cape !== undefined && dir === 'up') {
    const c = l.cape, cd = shade(c, -0.3), cl = shade(c, 0.18);
    p.rect(5, by + 1, 6, 8, c);
    p.rect(4, by + 3, 1, 6, cl); p.rect(11, by + 3, 1, 6, cd);
    p.rect(6, by + 2, 1, 7, cl); p.rect(8, by + 3, 1, 6, cd); p.rect(10, by + 2, 1, 7, cd);
    p.rect(5, by, 6, 1, shade(c, 0.3));
    p.set(a ? 3 : 4, by + 9, c); p.set(6, by + 9, c); p.set(9, by + 9, cd); p.set(b ? 12 : 11, by + 9, cd);
  }

  // ---- head ----
  if (l.robot) {
    for (let y = hy + 1; y < hy + 9; y++)
      for (let x = 4; x < 12; x++) p.set(x, y, x >= 10 ? shade(l.skin, -0.25) : y === hy + 1 ? shade(l.skin, 0.2) : l.skin);
    if (dir !== 'up') {
      const vx = dir === 'side' ? 7 : 5;
      const vw = dir === 'side' ? 5 : 6;
      p.rect(vx, hy + 3, vw, 4, 0x15222e);
      p.set(vx + 1, hy + 4, l.accent); p.set(vx + vw - 2, hy + 4, l.accent);
      p.set(vx + 1, hy + 5, shade(l.accent, -0.3)); p.set(vx + vw - 2, hy + 5, shade(l.accent, -0.3));
    }
    p.set(8, hy, l.accent); p.set(8, hy - 1, l.accent);
  } else {
    p.ellipse(8, hy + 4.5, 4.4, 4.4, (dx, dy) => (dx > 0.5 || dy > 0.65 ? skinD : dx < -0.5 && dy < -0.2 ? skinL : l.skin));
    if (dir === 'down') {
      p.rect(6, hy + 4, 1, 2, eye); p.rect(9, hy + 4, 1, 2, eye);
      p.set(5, hy + 6, 0xf58fa0); p.set(10, hy + 6, 0xe07f92);
      if (l.extra === 'glasses') p.rect(5, hy + 4, 6, 1, 0x2b1b3a);
      if (l.extra === 'beard') p.rect(6, hy + 7, 4, 2, l.hair);
    } else if (dir === 'side') {
      p.rect(9, hy + 4, 1, 2, eye);
      p.set(10, hy + 6, 0xe98a9c);
      p.set(12, hy + 5, l.skin); // nose
      if (l.extra === 'glasses') p.rect(8, hy + 4, 4, 1, 0x2b1b3a);
      if (l.extra === 'beard') p.rect(8, hy + 7, 3, 2, l.hair);
    }
    const hairPix = (x: number, y: number) => p.set(x, y, x >= 10 ? hairD : y <= hy + 1 && x <= 7 ? hairL : l.hair);
    if (l.hairStyle !== 'bald') {
      for (let y = hy; y <= hy + 9; y++)
        for (let x = 3; x <= 12; x++) {
          if (p.get(x, y) === -1) continue;
          const rel = y - hy;
          let on = false;
          if (dir === 'up') on = rel <= 7;
          else if (dir === 'down') {
            on = rel <= 2 || ((x <= 4 || x >= 11) && rel <= 5) || (rel === 3 && x % 3 !== 1);
            if (l.hairStyle === 'long') on = on || ((x <= 4 || x >= 11) && rel <= 8);
          } else {
            on = rel <= 2 || (x <= 6 && rel <= 6) || (rel === 3 && x < 9 && x % 2 === 0);
            if (l.hairStyle === 'long') on = on || (x <= 6 && rel <= 8);
          }
          if (l.hairStyle === 'cap') on = rel <= 2;
          if (on) hairPix(x, y);
        }
      if (l.hairStyle === 'long' && dir !== 'side') { p.rect(4, hy + 9, 1, 3, l.hair); p.rect(11, hy + 9, 1, 3, hairD); }
      if (l.hairStyle === 'long' && dir === 'up') p.rect(5, hy + 9, 6, 3, l.hair);
      if (l.hairStyle === 'long' && dir === 'side') p.rect(4, hy + 9, 2, 3, l.hair);
      if (l.hairStyle === 'spiky') {
        for (const x of [5, 8, 10]) p.set(x, hy - 1, l.hair);
        p.set(dir === 'side' ? 4 : 3, hy + 2, l.hair);
        if (dir !== 'side') p.set(12, hy + 2, hairD);
      }
      if (l.hairStyle === 'bun') p.ellipse(dir === 'side' ? 4.5 : 8, hy - 0.2, 2.2, 1.6, hairD);
      if (l.hairStyle === 'cap') {
        p.rect(4, hy, 8, 3, l.accent); p.rect(5, hy, 6, 1, shade(l.accent, 0.2));
        p.rect(dir === 'side' ? 9 : 4, hy + 3, dir === 'side' ? 5 : 8, 1, shade(l.accent, -0.3));
      }
    }
    if (l.extra === 'goggles' && dir !== 'up') {
      if (dir === 'down') { p.rect(5, hy + 2, 2, 2, 0x2ce8f5); p.rect(9, hy + 2, 2, 2, 0x2ce8f5); p.set(5, hy + 2, 0xc8fbff); p.set(9, hy + 2, 0xc8fbff); p.rect(7, hy + 2, 2, 1, 0x3a4466); }
      else { p.rect(8, hy + 2, 3, 2, 0x2ce8f5); p.set(8, hy + 2, 0xc8fbff); }
    }
    if (l.extra === 'antenna') { p.set(5, hy - 1, l.accent); p.set(10, hy - 1, l.accent); }
  }
  // scarf over the neck
  if (l.extra === 'scarf') {
    p.rect(5, by, 6, 1, l.accent);
    if (dir === 'side') { p.set(4, by, l.accent); }
    else if (dir === 'down') { p.set(4, by, l.accent); p.set(11, by, shade(l.accent, -0.2)); p.set(9, by + 1, shade(l.accent, -0.2)); }
  }
  return p.outline(OUTLINE);
}

export const LOOKS: Record<string, Look> = {
  nova: { skin: 0xf2c29b, hair: 0x4a2c5e, hairStyle: 'spiky', clothes: 0xe8eef7, accent: 0x2bd4e8, pants: 0x3a4466, boots: 0x262b44, extra: 'scarf', cape: 0xc23a52 },
  mo: { skin: 0x8fd6a5, hair: 0xf4f4f4, hairStyle: 'bun', clothes: 0xf7b32b, accent: 0x9c4f2a, pants: 0x7a4b2a, boots: 0x3d2a1e, cape: 0x6a4fb0 },
  gloss: { skin: 0xf6d2b5, hair: 0xffd23f, hairStyle: 'spiky', clothes: 0xe0e6f0, accent: 0xff4fd8, pants: 0x5a2b6b, boots: 0x2b1b3a, extra: 'labcoat' },
  pip: { skin: 0xe8b48a, hair: 0xf77622, hairStyle: 'short', clothes: 0x3b9ae1, accent: 0xfee761, pants: 0x264d7a, boots: 0x3a2a1e },
  zib: { skin: 0xc8a2e8, hair: 0x3b2a6b, hairStyle: 'cap', clothes: 0x5cb860, accent: 0xe43b44, pants: 0x3a4466, boots: 0x262b44, extra: 'beard' },
  dusty: { skin: 0xc0a378, hair: 0, hairStyle: 'bald', clothes: 0x8a6a48, accent: 0x63c74d, pants: 0x5a4632, boots: 0x3a2d22, robot: true },
  quill: { skin: 0xf0c8a0, hair: 0xd8384f, hairStyle: 'cap', clothes: 0x3a6fc8, accent: 0xf4f4ff, pants: 0x2b2f4a, boots: 0x1a1326, extra: 'goggles' },
};
