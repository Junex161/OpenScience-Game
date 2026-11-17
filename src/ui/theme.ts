import Phaser from 'phaser';

export const W = 960;
export const H = 540;

/** Space palette: deep blues with neon accents. */
export const C = {
  void: 0x070b1a,
  night: 0x0d1330,
  deep: 0x161d45,
  panel: 0x101735,
  panelEdge: 0x3b4a8c,
  ink: 0x0d1330,
  text: 0xe8ecff,
  dim: 0x8c96c8,
  paper: 0xf4f1ff,
  cyan: 0x4cf2ff,
  magenta: 0xff4fd8,
  violet: 0x9b5cff,
  gold: 0xffd166,
  sig: 0xff5c7a, // "significant" / danger
  ok: 0x3dffa8,
  warn: 0xffd166,
  blue: 0x3a86ff,
  grey: 0x7a83b0,
  planets: [0xff8a5b, 0x8d6e63, 0x4cc9f0, 0x9b5cff, 0x3dffa8, 0xff4fd8, 0xffd166],
};

export const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export const FONT = 'Fredoka, sans-serif';

export function txt(size: number, color = C.text, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color: hex(color), fontStyle: '600', ...extra };
}

/** Glassy sci-fi panel. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, edge = C.panelEdge, alpha = 0.92): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 6, w, h, 16);
  g.fillStyle(C.panel, alpha).fillRoundedRect(x, y, w, h, 16);
  g.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 2, y + 2, w - 4, h * 0.35, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.lineStyle(2, edge, 1).strokeRoundedRect(x, y, w, h, 16);
  return g;
}

/** A rounded neon button with hover feedback. */
export function button(
  scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void,
  opts: { w?: number; h?: number; fill?: number; color?: number; size?: number } = {},
): Phaser.GameObjects.Container {
  const w = opts.w ?? 200;
  const h = opts.h ?? 44;
  const fill = opts.fill ?? C.blue;
  const g = scene.add.graphics();
  const draw = (f: number, lift: number) => {
    g.clear();
    g.fillStyle(f, 0.25).fillRoundedRect(-w / 2 - 4, -h / 2 - 4 - lift, w + 8, h + 8, 16);
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 12);
    g.fillStyle(f, 1).fillRoundedRect(-w / 2, -h / 2 - lift, w, h, 12);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 3, -h / 2 - lift + 3, w - 6, h * 0.4, 9);
  };
  draw(fill, 0);
  const t = scene.add.text(0, 0, label, txt(opts.size ?? 18, opts.color ?? 0xffffff)).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  const cont = scene.add.container(x, y, [g, t, zone]).setSize(w, h);
  zone.on('pointerover', () => { draw(Phaser.Display.Color.IntegerToColor(fill).lighten(12).color, 2); t.y = -2; });
  zone.on('pointerout', () => { draw(fill, 0); t.y = 0; });
  zone.on('pointerdown', () => onClick());
  cont.setData('zone', zone);
  return cont;
}

export function fadeTo(scene: Phaser.Scene, key: string, data?: object) {
  scene.cameras.main.fadeOut(350, 7, 11, 26);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((r) => scene.time.delayedCall(ms, r));
}
