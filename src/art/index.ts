// Registers every generated texture with Phaser once, at boot.
import Phaser from 'phaser';
import { chibi, Dir, LOOKS } from './characters';
import * as M from './monsters';
import * as Ob from './objects';
import { hash, Pix, sheet, single } from './pixel';

/** Character sheet frame index: dir*4 + frame (dir: down 0, up 1, side 2). */
export const DIRS: Dir[] = ['down', 'up', 'side'];
export const cframe = (dir: Dir, f: number) => DIRS.indexOf(dir) * 4 + f;

function radial(scene: Phaser.Scene, key: string, size: number, stops: [number, string][]) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, size, size)!;
  const ctx = t.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  t.refresh();
}

/** Seamless star and nebula tiles for the parallax sky behind the islands. */
function skyTextures(scene: Phaser.Scene) {
  const S = 256;
  const stars = scene.textures.createCanvas('stars', S, S)!;
  let ctx = stars.getContext();
  const cols = ['#ffffff', '#d4fdff', '#ffe9c4', '#c8b4f0', '#8fb8ff'];
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(hash(i, 1, 77) * S), y = Math.floor(hash(i, 2, 77) * S);
    const v = hash(i, 3, 77);
    ctx.globalAlpha = 0.25 + v * 0.75;
    ctx.fillStyle = cols[Math.floor(hash(i, 4, 77) * cols.length)];
    ctx.fillRect(x, y, 1, 1);
    if (v > 0.93) { ctx.globalAlpha = 0.5; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
  }
  stars.refresh();
  // nebula: periodic waves quantised into dithered pixel bands
  const N = 512;
  const neb = scene.textures.createCanvas('nebula', N, N)!;
  ctx = neb.getContext();
  const img = ctx.createImageData(N, N);
  const TAU = Math.PI * 2;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const bx = x >> 1, by = y >> 1;
      const u = (bx * 2) / N, v = (by * 2) / N;
      const a = Math.sin(TAU * (u + 2 * v) + 1.3) + Math.sin(TAU * (3 * u - v)) * 0.7 + Math.sin(TAU * (2 * u + 3 * v) + 4) * 0.5 + Math.sin(TAU * (5 * u + v) + 2) * 0.25;
      const b = Math.sin(TAU * (2 * u - v) + 0.4) + Math.sin(TAU * (u + 3 * v) + 2.2) * 0.6;
      let k = (a + 2.45) / 4.9; // 0..1
      k = Math.max(0, k - 0.5) * 2;
      const dither = ((bx + by) % 2) * 0.06;
      const lvl = Math.floor((k + dither) * 5) / 5;
      const i = (y * N + x) * 4;
      const teal = b > 0;
      img.data[i] = teal ? 30 : 110; img.data[i + 1] = teal ? 120 : 60; img.data[i + 2] = teal ? 150 : 190;
      img.data[i + 3] = Math.round(lvl * 95);
    }
  ctx.putImageData(img, 0, 0);
  neb.refresh();
}

export function buildArt(scene: Phaser.Scene) {
  if (scene.textures.exists('px')) return; // already built (textures are global)
  for (const [id, look] of Object.entries(LOOKS)) {
    const frames: Pix[] = [];
    for (const d of DIRS) for (let f = 0; f < 4; f++) frames.push(chibi(look, d, f));
    sheet(scene, `ch-${id}`, frames);
  }
  // trees & flora
  single(scene, 'tree-green', Ob.tree('green', 4));
  single(scene, 'tree-green2', Ob.tree('green', 11));
  single(scene, 'tree-violet', Ob.tree('violet', 7));
  single(scene, 'tree-dark', Ob.tree('dark', 9));
  single(scene, 'tree-dark2', Ob.tree('dark', 21));
  single(scene, 'tree-gold', Ob.tree('gold', 13));
  single(scene, 'bush', Ob.bush(2));
  single(scene, 'bush-cut', Ob.bush(2, true));
  single(scene, 'rock', Ob.rock(3));
  sheet(scene, 'mushroom', Ob.mushroom());
  single(scene, 'fence', Ob.fence());
  single(scene, 'sign', Ob.sign());
  sheet(scene, 'lamp', Ob.lamp());
  single(scene, 'chest', Ob.chest(false));
  single(scene, 'chest-open', Ob.chest(true));
  single(scene, 'bigchest', Ob.chest(false, true));
  single(scene, 'bigchest-open', Ob.chest(true, true));
  single(scene, 'pot', Ob.pot());
  single(scene, 'pot-broken', Ob.pot(true));
  single(scene, 'crate', Ob.crate());
  single(scene, 'barrel', Ob.barrel());
  single(scene, 'house-red', Ob.house(0xc8464f, 0xd6dcec, 5));
  single(scene, 'house-teal', Ob.house(0x2f8f8a, 0xdce4e8, 6));
  single(scene, 'house-violet', Ob.house(0x6a4fb0, 0xd8d6ee, 7));
  single(scene, 'house-gold', Ob.house(0xd08a2a, 0xe4dcd0, 8));
  single(scene, 'library', Ob.library());
  single(scene, 'beacon', Ob.beacon(false));
  single(scene, 'beacon-lit', Ob.beacon(true));
  single(scene, 'stall-red', Ob.stall(0xc8464f));
  single(scene, 'stall-blue', Ob.stall(0x3a6fc8));
  single(scene, 'well', Ob.well());
  single(scene, 'archive-gate', Ob.archiveGate());
  single(scene, 'statue-gold', Ob.statue(true));
  single(scene, 'statue-stone', Ob.statue(false));
  single(scene, 'drawer', Ob.drawer(false));
  single(scene, 'drawer-open', Ob.drawer(true));
  sheet(scene, 'torch', Ob.torch());
  single(scene, 'door-locked', Ob.door('locked'));
  single(scene, 'door-boss', Ob.door('boss'));
  single(scene, 'pillar', Ob.pillar());
  single(scene, 'bridge-ghost', Ob.bridgeGhost());
  single(scene, 'keycap-e', Ob.keycap('E'));
  single(scene, 'guide-arrow', Ob.guideArrow());
  single(scene, 'planet', Ob.planet());
  skyTextures(scene);
  sheet(scene, 'beetle-blue', Ob.beetle(0x3a8ae0));
  sheet(scene, 'beetle-gold', Ob.beetle(0xe8b030));
  sheet(scene, 'beetle-red', Ob.beetle(0xd8384f));
  sheet(scene, 'beetle-green', Ob.beetle(0x4fbf5a));

  // creatures
  sheet(scene, 'glimmerling', M.glimmerling());
  sheet(scene, 'glimmerling-pink', M.glimmerling(0xff7ac8));
  sheet(scene, 'noisebat', M.noisebat());
  sheet(scene, 'pagewing', M.pagewing());
  sheet(scene, 'nullwisp', M.nullwisp());
  sheet(scene, 'curator', M.curator());
  sheet(scene, 'coin', M.coin());
  sheet(scene, 'drone', M.drone());

  // pickups, items, fx
  sheet(scene, 'shard', M.shard());
  single(scene, 'heart-full', M.heart('full'));
  single(scene, 'heart-half', M.heart('half'));
  single(scene, 'heart-empty', M.heart('empty'));
  single(scene, 'heart-big', M.heart('full', true));
  single(scene, 'heart-piece', M.heartPiece());
  single(scene, 'key', M.key());
  single(scene, 'bigkey', M.key(true));
  single(scene, 'lantern', M.lanternItem(true));
  single(scene, 'lantern-off', M.lanternItem(false));
  single(scene, 'sword', M.swordItem());
  single(scene, 'potion', M.potion());
  single(scene, 'blade', M.blade());
  single(scene, 'slash', M.slash());
  sheet(scene, 'puff', M.puff());
  single(scene, 'sparkle', M.sparkle());

  radial(scene, 'shadow', 32, [[0, 'rgba(10,6,24,0.42)'], [0.6, 'rgba(10,6,24,0.3)'], [1, 'rgba(10,6,24,0)']]);
  radial(scene, 'glow', 128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  radial(scene, 'softglow', 64, [[0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  // darkness with a soft round hole (for dungeons / lantern light)
  if (!scene.textures.exists('darkness')) {
    const S = 512;
    const t = scene.textures.createCanvas('darkness', S, S)!;
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(5,3,14,0)');
    g.addColorStop(0.3, 'rgba(5,3,14,0.03)');
    g.addColorStop(0.6, 'rgba(5,3,14,0.38)');
    g.addColorStop(0.85, 'rgba(5,3,14,0.64)');
    g.addColorStop(1, 'rgba(5,3,14,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    t.refresh();
  }
  if (!scene.textures.exists('px')) {
    const t = scene.textures.createCanvas('px', 2, 2)!;
    const ctx = t.getContext();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 2, 2);
    t.refresh();
  }
}
