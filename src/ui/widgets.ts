import Phaser from 'phaser';
import { audio } from '../core/audio';
import { button, C, H, hex, panel, txt, W } from './theme';

/** Horizontal slider. Returns a handle with get/set. */
export function slider(
  scene: Phaser.Scene, x: number, y: number, w: number, min: number, max: number, value: number,
  onChange: (v: number) => void, opts: { step?: number; color?: number } = {},
) {
  const step = opts.step ?? 1;
  const color = opts.color ?? C.cyan;
  const track = scene.add.graphics();
  const fill = scene.add.graphics();
  const knob = scene.add.circle(0, y, 13, 0xffffff).setStrokeStyle(4, color).setInteractive({ useHandCursor: true, draggable: true });
  const hit = scene.add.zone(x + w / 2, y, w + 30, 40).setInteractive({ useHandCursor: true });
  track.fillStyle(0x26305f, 1).fillRoundedRect(x, y - 5, w, 10, 5);
  let v = value;
  const draw = () => {
    const t = (v - min) / (max - min);
    knob.x = x + t * w;
    fill.clear().fillStyle(color, 1).fillRoundedRect(x, y - 5, Math.max(10, t * w), 10, 5);
  };
  const setFromX = (px: number) => {
    const t = Phaser.Math.Clamp((px - x) / w, 0, 1);
    const nv = Math.round((min + t * (max - min)) / step) * step;
    if (nv !== v) { v = nv; draw(); onChange(v); audio.sfx('type'); }
  };
  knob.on('drag', (_p: Phaser.Input.Pointer, dx: number) => setFromX(dx));
  hit.on('pointerdown', (p: Phaser.Input.Pointer) => setFromX(p.x));
  hit.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) setFromX(p.x); });
  draw();
  const objs = [track, fill, hit, knob];
  return {
    objs,
    get: () => v,
    set: (nv: number) => { v = nv; draw(); onChange(v); },
    destroy: () => objs.forEach((o) => o.destroy()),
    setEnabled: (on: boolean) => { if (on) { knob.setInteractive(); hit.setInteractive(); } else { knob.disableInteractive(); hit.disableInteractive(); } },
  };
}

/**
 * Multiple-choice card. Resolves with true when the first pick was right.
 * Wrong picks shake and turn red; the right one is then highlighted.
 */
export function choice(scene: Phaser.Scene, question: string, options: string[], correct: number, explain?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const layer = scene.add.container(0, 0).setDepth(5500).setScrollFactor(0);
    const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    const ph = 130 + options.length * 58 + (explain ? 30 : 0);
    const py = H / 2 - ph / 2;
    layer.add([dim, panel(scene, W / 2 - 330, py, 660, ph, C.violet)]);
    layer.add(scene.add.text(W / 2, py + 24, 'Kurzer Check', txt(14, C.violet)).setOrigin(0.5, 0));
    layer.add(scene.add.text(W / 2, py + 46, question, txt(20, C.text, { wordWrap: { width: 600 }, align: 'center' })).setOrigin(0.5, 0));
    let answered = false;
    const btns: Phaser.GameObjects.Container[] = [];
    options.forEach((o, i) => {
      const b = button(scene, W / 2, py + 120 + i * 58, o, () => {
        if (answered) return;
        answered = true;
        const ok = i === correct;
        audio.sfx(ok ? 'success' : 'fail');
        const paint = (bt: Phaser.GameObjects.Container, col: number) => {
          const g = bt.list[0] as Phaser.GameObjects.Graphics;
          g.clear().fillStyle(col, 1).fillRoundedRect(-280, -22, 560, 44, 12);
        };
        paint(btns[correct], C.ok);
        if (!ok) { paint(b, C.sig); scene.tweens.add({ targets: b, x: b.x + 6, duration: 50, yoyo: true, repeat: 3 }); }
        if (explain) layer.add(scene.add.text(W / 2, py + ph - 34, explain, txt(15, ok ? C.ok : C.warn, { wordWrap: { width: 600 }, align: 'center' })).setOrigin(0.5));
        scene.time.delayedCall(explain ? 2600 : 1300, () => { layer.destroy(); resolve(ok); });
      }, { w: 560, h: 44, fill: 0x26305f, size: 17 });
      btns.push(b);
      layer.add(b);
    });
    // automated playtests answer instantly (see tests/e2e)
    const bot = (window as unknown as { __bot?: 'right' | 'wrong' }).__bot;
    if (bot) scene.time.delayedCall(250, () => (btns[bot === 'right' ? correct : (correct + 1) % options.length].getData('zone') as Phaser.GameObjects.Zone).emit('pointerdown'));
  });
}

/** Big floating text feedback (e.g. "+100"). */
export function floatText(scene: Phaser.Scene, x: number, y: number, s: string, color = C.gold, size = 22) {
  const t = scene.add.text(x, y, s, txt(size, color, { stroke: '#070b1a', strokeThickness: 5 })).setOrigin(0.5).setDepth(4500);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1100, ease: 'Cubic.out', onComplete: () => t.destroy() });
  return t;
}

export function label(scene: Phaser.Scene, x: number, y: number, s: string, color = C.dim, size = 14) {
  return scene.add.text(x, y, s, txt(size, color));
}

export { hex };
