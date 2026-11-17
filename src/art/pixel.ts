// Tiny pixel-art toolkit: paint sprites pixel by pixel on a canvas,
// auto-outline them and turn them into Phaser textures.
import type Phaser from 'phaser';

export type RGB = number;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic hash noise in [0,1) for tile decoration. */
export function hash(x: number, y: number, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function shade(c: RGB, f: number): RGB {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const t = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return (t(r) << 16) | (t(g) << 8) | t(b);
}

export class Pix {
  data: Int32Array; // -1 = transparent
  constructor(public w: number, public h: number) {
    this.data = new Int32Array(w * h).fill(-1);
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return this.data[y * this.w + x];
  }
  set(x: number, y: number, c: RGB) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** Filled ellipse with optional per-pixel shading callback. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB | ((dx: number, dy: number) => RGB)) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(dx, dy) : c);
      }
  }
  /** Draw from an ASCII map with a palette. */
  ascii(rows: string[], pal: Record<string, RGB>, ox = 0, oy = 0, flip = false) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c === undefined) continue;
        this.set(ox + (flip ? row.length - 1 - x : x), oy + y, c);
      }
    });
  }
  /** Add a 1px outline around all opaque pixels. */
  outline(c: RGB, diagonal = false) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== -1) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        if (diagonal) n.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
        if (n.some(([dx, dy]) => { const v = this.get(x + dx, y + dy); return v !== -1 && v !== c; })) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  blit(src: Pix, ox: number, oy: number, flip = false) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.get(flip ? src.w - 1 - x : x, y);
        if (v !== -1) this.set(ox + x, oy + y, v);
      }
  }
  drawTo(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    const img = ctx.getImageData(ox, oy, this.w, this.h);
    for (let i = 0; i < this.data.length; i++) {
      const v = this.data[i];
      if (v === -1) continue;
      img.data[i * 4] = (v >> 16) & 255;
      img.data[i * 4 + 1] = (v >> 8) & 255;
      img.data[i * 4 + 2] = v & 255;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, ox, oy);
  }
}

/** Build a texture from a list of equally sized frames laid out in a row. */
export function sheet(scene: Phaser.Scene, key: string, frames: Pix[]) {
  const fw = frames[0].w;
  const fh = frames[0].h;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  frames.forEach((f, i) => f.drawTo(ctx, i * fw, 0));
  tex.refresh();
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
  return tex;
}

export function single(scene: Phaser.Scene, key: string, p: Pix) {
  return sheet(scene, key, [p]);
}
