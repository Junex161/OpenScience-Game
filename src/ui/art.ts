// Procedural space art: every texture is painted on a canvas at boot.
import Phaser from 'phaser';
import { C, H, W } from './theme';

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  return { tex, ctx: tex.getContext() };
}

function radial(scene: Phaser.Scene, key: string, size: number, color: number, stops: [number, number][]) {
  const { tex, ctx } = canvas(scene, key, size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) g.addColorStop(o, css(color, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export type PlanetStyle = 'rocky' | 'gas' | 'ice' | 'lava' | 'ocean' | 'metal' | 'jungle' | 'crystal';

export function makePlanet(scene: Phaser.Scene, key: string, r: number, base: number, style: PlanetStyle, seed: number, ring = false) {
  const pad = ring ? r * 0.9 : r * 0.35;
  const size = Math.ceil((r + pad) * 2);
  const { tex, ctx } = canvas(scene, key, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const rnd = mulberry(seed);
  const col = Phaser.Display.Color.IntegerToColor(base);
  const light = col.clone().lighten(25).color;
  const dark = col.clone().darken(35).color;

  // atmosphere glow
  const atm = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.32);
  atm.addColorStop(0, css(light, 0.45));
  atm.addColorStop(1, css(light, 0));
  ctx.fillStyle = atm;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.32, 0, Math.PI * 2);
  ctx.fill();

  const drawRing = (front: boolean) => {
    if (!ring) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    if (front) ctx.rect(-r * 2, 0, r * 4, r * 2);
    else ctx.rect(-r * 2, -r * 2, r * 4, r * 2);
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = css(i % 2 ? light : 0xffffff, 0.25 + 0.1 * (i % 3));
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.3 + i * 0.08), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawRing(false);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const body = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
  body.addColorStop(0, css(light));
  body.addColorStop(0.6, css(base));
  body.addColorStop(1, css(dark));
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);

  if (style === 'gas') {
    for (let i = 0; i < 14; i++) {
      const y = cy - r + (i / 14) * 2 * r + rnd() * 6;
      ctx.fillStyle = css(i % 2 ? light : dark, 0.25 + rnd() * 0.2);
      ctx.beginPath();
      ctx.ellipse(cx, y, r * 1.2, r * (0.04 + rnd() * 0.06), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = css(0xffffff, 0.25);
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.3, cy + r * 0.25, r * 0.18, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style === 'rocky' || style === 'metal') {
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * r * 0.9;
      const cr = r * (0.05 + rnd() * 0.14);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      ctx.fillStyle = css(dark, 0.55);
      ctx.beginPath();
      ctx.arc(x, y, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(light, 0.5);
      ctx.lineWidth = Math.max(1, cr * 0.18);
      ctx.beginPath();
      ctx.arc(x - cr * 0.1, y - cr * 0.1, cr, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();
    }
    if (style === 'metal') {
      ctx.strokeStyle = css(0x4cf2ff, 0.55);
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        let x = cx - r + rnd() * 2 * r;
        let y = cy - r + rnd() * 2 * r;
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          if (k % 2) x += (rnd() - 0.5) * r * 0.8; else y += (rnd() - 0.5) * r * 0.8;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  if (style === 'ocean' || style === 'jungle') {
    const land = style === 'ocean' ? 0x7bd389 : 0x2d6a4f;
    for (let i = 0; i < 9; i++) {
      const x = cx + (rnd() - 0.5) * r * 1.6;
      const y = cy + (rnd() - 0.5) * r * 1.6;
      ctx.fillStyle = css(land, 0.85);
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const rr = r * (0.12 + rnd() * 0.2);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = css(0xffffff, 0.35);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + (rnd() - 0.5) * r * 1.6, cy + (rnd() - 0.5) * r * 1.6, r * 0.3, r * 0.05, rnd(), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (style === 'lava') {
    // dark basalt plates with glowing magma seams
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = css(0x3a0f0a, 0.35 + rnd() * 0.3);
      ctx.beginPath();
      ctx.ellipse(cx + (rnd() - 0.5) * r * 1.7, cy + (rnd() - 0.5) * r * 1.7, r * (0.15 + rnd() * 0.25), r * (0.1 + rnd() * 0.2), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    ctx.shadowColor = css(0xff6b35, 1);
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = css(rnd() < 0.5 ? 0xffd166 : 0xff8a3d, 0.9);
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1 + rnd() * 2.5;
      ctx.beginPath();
      let x = cx + (rnd() - 0.5) * r * 1.8;
      let y = cy + (rnd() - 0.5) * r * 1.8;
      let a = rnd() * Math.PI * 2;
      ctx.moveTo(x, y);
      for (let k = 0; k < 10; k++) {
        a += (rnd() - 0.5) * 1.2;
        x += Math.cos(a) * r * 0.08;
        y += Math.sin(a) * r * 0.08;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  if (style === 'ice' || style === 'crystal') {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = css(0xffffff, 0.15 + rnd() * 0.3);
      const x = cx + (rnd() - 0.5) * r * 1.8;
      const y = cy + (rnd() - 0.5) * r * 1.8;
      const s = r * (0.08 + rnd() * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.6, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  // terminator shadow
  const sh = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.6, cx - r * 0.2, cy - r * 0.2, r * 1.6);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,10,0.75)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, size, size);
  // rim light
  ctx.strokeStyle = css(0xffffff, 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
  drawRing(true);
  tex.refresh();
}

function makeShip(scene: Phaser.Scene, key: string, hull: number, accent: number) {
  const { tex, ctx } = canvas(scene, key, 72, 48);
  ctx.translate(36, 24);
  // wings
  ctx.fillStyle = css(Phaser.Display.Color.IntegerToColor(hull).darken(30).color);
  ctx.beginPath();
  ctx.moveTo(-6, -6); ctx.lineTo(-22, -22); ctx.lineTo(-14, -6); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 6); ctx.lineTo(-22, 22); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();
  // hull
  const g = ctx.createLinearGradient(0, -12, 0, 12);
  g.addColorStop(0, css(0xffffff));
  g.addColorStop(0.45, css(hull));
  g.addColorStop(1, css(Phaser.Display.Color.IntegerToColor(hull).darken(40).color));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.quadraticCurveTo(10, -13, -20, -9);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-20, 9);
  ctx.quadraticCurveTo(10, 13, 30, 0);
  ctx.fill();
  // accent stripe
  ctx.strokeStyle = css(accent);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(6, 0);
  ctx.stroke();
  // cockpit
  const cg = ctx.createRadialGradient(12, -3, 1, 12, 0, 9);
  cg.addColorStop(0, css(0xffffff));
  cg.addColorStop(0.4, css(accent));
  cg.addColorStop(1, css(0x0d1330));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(12, 0, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // engine
  ctx.fillStyle = css(accent);
  ctx.fillRect(-26, -4, 4, 8);
  tex.refresh();
}

function makeNebula(scene: Phaser.Scene, key: string, colors: number[], seed: number) {
  const size = 512;
  const { tex, ctx } = canvas(scene, key, size, size);
  const rnd = mulberry(seed);
  for (let i = 0; i < 26; i++) {
    const x = size / 2 + (rnd() - 0.5) * size * 0.6;
    const y = size / 2 + (rnd() - 0.5) * size * 0.6;
    const r = size * (0.1 + rnd() * 0.25);
    const c = colors[i % colors.length];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(c, 0.22));
    g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  tex.refresh();
}

/** Paint all shared textures once. */
export function makeTextures(scene: Phaser.Scene) {
  radial(scene, 'dot', 16, 0xffffff, [[0, 1], [0.35, 0.8], [1, 0]]);
  radial(scene, 'glow', 128, 0xffffff, [[0, 0.9], [0.2, 0.5], [1, 0]]);
  radial(scene, 'spark', 24, 0xffffff, [[0, 1], [0.5, 0.6], [1, 0]]);
  makeNebula(scene, 'nebula-violet', [0x9b5cff, 0xff4fd8, 0x3a86ff], 3);
  makeNebula(scene, 'nebula-teal', [0x4cf2ff, 0x3dffa8, 0x3a86ff], 9);
  makeNebula(scene, 'nebula-ember', [0xff8a5b, 0xff4fd8, 0xffd166], 17);
  makeShip(scene, 'ship', 0xdfe7ff, C.cyan);
  makeShip(scene, 'ship-ally', 0xffe6a7, C.gold);
  makeShip(scene, 'ship-enemy', 0x3a2b5c, C.magenta);
  makePlanet(scene, 'p-forge', 70, 0xff6b35, 'lava', 11);
  makePlanet(scene, 'p-archive', 58, 0x9c8f80, 'rocky', 22);
  makePlanet(scene, 'p-power', 80, 0x4cc9f0, 'gas', 33, true);
  makePlanet(scene, 'p-vault', 60, 0x8892b0, 'metal', 44);
  makePlanet(scene, 'p-lab', 66, 0x3dffa8, 'ocean', 55);
  makePlanet(scene, 'p-press', 56, 0xf4c2ff, 'ice', 66, true);
  makePlanet(scene, 'p-citizen', 74, 0x52b788, 'jungle', 77);
  makePlanet(scene, 'p-finale', 90, 0xff4fd8, 'crystal', 88, true);
  makePlanet(scene, 'p-small1', 26, 0xffd166, 'rocky', 5);
  makePlanet(scene, 'p-small2', 18, 0x4cc9f0, 'ice', 6);
  // a single "finding" star used in the prologue
  radial(scene, 'finding', 64, 0xfff3b0, [[0, 1], [0.15, 0.95], [0.4, 0.35], [1, 0]]);
  // crystal collectible
  const { tex, ctx } = canvas(scene, 'crystal', 28, 36);
  const g = ctx.createLinearGradient(0, 0, 28, 36);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#4cf2ff');
  g.addColorStop(1, '#9b5cff');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(28, 12); ctx.lineTo(14, 36); ctx.lineTo(0, 12); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 12); ctx.lineTo(28, 12); ctx.moveTo(14, 0); ctx.lineTo(9, 12); ctx.lineTo(14, 36); ctx.lineTo(19, 12); ctx.closePath();
  ctx.stroke();
  tex.refresh();
}

export interface SpaceBg {
  layers: Phaser.GameObjects.Image[];
  update: (dt: number) => void;
}

/**
 * Layered space backdrop: gradient, drifting nebulae, three parallax star
 * layers. worldW/worldH > screen for scrolling scenes.
 */
export function spaceBackground(scene: Phaser.Scene, opts: { nebula?: string[]; worldW?: number; worldH?: number; seed?: number; tint?: number } = {}): SpaceBg {
  const ww = opts.worldW ?? W;
  const wh = opts.worldH ?? H;
  const rnd = mulberry(opts.seed ?? 1);
  const key = `bg-grad-${opts.tint ?? 0}`;
  if (!scene.textures.exists(key)) {
    const { tex, ctx } = canvas(scene, key, 8, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, css(C.void));
    g.addColorStop(0.6, css(opts.tint ?? C.night));
    g.addColorStop(1, css(C.deep));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
    tex.refresh();
  }
  scene.add.image(0, 0, key).setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(-100);
  const layers: Phaser.GameObjects.Image[] = [];
  const neb = opts.nebula ?? ['nebula-violet', 'nebula-teal'];
  neb.forEach((k, i) => {
    const img = scene.add.image(W * (0.25 + 0.5 * i) + (rnd() - 0.5) * 200, H * (0.3 + 0.4 * rnd()), k)
      .setScale(1.6 + rnd()).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(0.05).setDepth(-90);
    img.setData('drift', (rnd() - 0.5) * 0.01);
    layers.push(img);
  });
  const stars: Phaser.GameObjects.Image[] = [];
  const depthFactors = [0.15, 0.35, 0.7];
  depthFactors.forEach((sf, li) => {
    const n = Math.round(((ww * wh) / (W * H)) * [110, 60, 25][li] * Math.max(0.4, sf));
    const spanW = W + (ww - W) * sf;
    const spanH = H + (wh - H) * sf;
    for (let i = 0; i < n; i++) {
      const s = scene.add.image(rnd() * spanW, rnd() * spanH, 'dot')
        .setScale([0.18, 0.28, 0.42][li] * (0.6 + rnd()))
        .setAlpha(0.4 + rnd() * 0.6)
        .setTint(rnd() < 0.15 ? 0xb8c8ff : rnd() < 0.1 ? 0xffe1a8 : 0xffffff)
        .setScrollFactor(sf).setDepth(-80 + li);
      if (rnd() < 0.25) scene.tweens.add({ targets: s, alpha: 0.15, duration: 600 + rnd() * 1600, yoyo: true, repeat: -1 });
      stars.push(s);
    }
  });
  return {
    layers,
    update: (dt: number) => {
      for (const l of layers) l.rotation += (l.getData('drift') as number) * dt * 0.01;
    },
  };
}

/** Shooting star flourish. */
export function shootingStar(scene: Phaser.Scene) {
  const x = Phaser.Math.Between(100, W);
  const y = Phaser.Math.Between(0, H / 2);
  const s = scene.add.image(x, y, 'spark').setScale(0.7).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(0).setDepth(-70);
  const trail = scene.add.particles(0, 0, 'spark', {
    follow: s, lifespan: 400, scale: { start: 0.4, end: 0 }, alpha: { start: 0.7, end: 0 }, frequency: 16, blendMode: 'ADD',
  }).setScrollFactor(0).setDepth(-71);
  scene.tweens.add({
    targets: s, x: x - 300, y: y + 160, alpha: 0, duration: 900, ease: 'Quad.in',
    onComplete: () => { s.destroy(); scene.time.delayedCall(500, () => trail.destroy()); },
  });
}
