import Phaser from 'phaser';
import { audio } from '../core/audio';
import { C, H, W, hex, txt } from './theme';

export type Who = 'ada' | 'glanz' | 'schubi' | 'nia' | 'tick' | 'fair' | 'quill' | 'mo' | 'hype' | 'journal' | 'you';

export const CAST: Record<Who, { name: string; color: number }> = {
  ada: { name: 'ADA · Bord-KI', color: C.cyan },
  glanz: { name: 'Dr. Glanz', color: C.magenta },
  schubi: { name: 'Schubi · Archiv-Robot', color: 0xd4a373 },
  nia: { name: 'Kapitänin Nia Power', color: 0x4cc9f0 },
  tick: { name: 'Notar Tick', color: 0xc0c8e8 },
  fair: { name: 'Prof. Fair', color: C.violet },
  quill: { name: 'Quill · Redaktion', color: 0xf4c2ff },
  mo: { name: 'Bürgermeisterin Mo', color: C.ok },
  hype: { name: 'DER HYPE', color: C.sig },
  journal: { name: 'Journal of Shiny Results', color: C.gold },
  you: { name: 'Du', color: C.text },
};

export interface Line { who?: Who; text: string }

/** Small procedural portraits for each character. */
export function drawPortrait(scene: Phaser.Scene, who: Who, x = 0, y = 0, s = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setScale(s);
  const g = scene.add.graphics();
  c.add(g);
  const col = CAST[who].color;
  g.fillStyle(col, 0.15).fillCircle(0, 0, 38);
  g.lineStyle(2, col, 0.8).strokeCircle(0, 0, 38);
  switch (who) {
    case 'ada': {
      g.fillStyle(C.cyan, 0.25).fillCircle(0, 0, 26);
      g.lineStyle(3, C.cyan, 1).strokeCircle(0, 0, 24);
      g.fillStyle(C.cyan, 1).fillRoundedRect(-13, -6, 9, 12, 4).fillRoundedRect(4, -6, 9, 12, 4);
      g.lineStyle(2, C.cyan, 0.8).beginPath().arc(0, 6, 10, 0.3, Math.PI - 0.3).strokePath();
      for (let i = -2; i <= 2; i++) g.lineStyle(1, C.cyan, 0.25).lineBetween(-24, i * 9, 24, i * 9);
      const eye = scene.add.rectangle(0, 0, 50, 2, C.cyan, 0.6);
      c.add(eye);
      scene.tweens.add({ targets: eye, y: { from: -22, to: 22 }, duration: 1400, repeat: -1, yoyo: true });
      break;
    }
    case 'glanz':
      g.fillStyle(C.magenta, 1).fillRoundedRect(-22, 14, 44, 24, 10);
      g.fillStyle(0xffd6a5, 1).fillCircle(0, -2, 18);
      g.fillStyle(0xffd166, 1).fillEllipse(0, -20, 46, 22).fillEllipse(-16, -10, 14, 22).fillEllipse(16, -10, 14, 22);
      g.fillStyle(0x0d1330, 1).fillRoundedRect(-16, -6, 14, 8, 3).fillRoundedRect(2, -6, 14, 8, 3).fillRect(-2, -4, 4, 2);
      g.lineStyle(2, 0x6b2737, 1).beginPath().arc(0, 6, 6, 0.2, Math.PI - 0.2).strokePath();
      g.fillStyle(0xffffff, 1).fillCircle(12, -4, 2);
      break;
    case 'schubi':
      g.fillStyle(0xd4a373, 1).fillRoundedRect(-22, -22, 44, 46, 6);
      g.fillStyle(0xa47148, 1).fillRect(-18, 2, 36, 18);
      g.fillStyle(0x6b4423, 1).fillRect(-6, 9, 12, 4);
      g.fillStyle(0x0d1330, 1).fillRoundedRect(-16, -16, 32, 14, 5);
      g.fillStyle(C.ok, 1).fillCircle(-7, -9, 3.5).fillCircle(7, -9, 3.5);
      g.lineStyle(2, 0xd4a373, 1).lineBetween(0, -22, 0, -30);
      g.fillStyle(C.sig, 1).fillCircle(0, -31, 3);
      break;
    case 'nia':
      g.fillStyle(0x4cc9f0, 0.35).fillCircle(0, -2, 27);
      g.lineStyle(3, 0xdfe7ff, 1).strokeCircle(0, -2, 27);
      g.fillStyle(0x8d5524, 1).fillCircle(0, 0, 17);
      g.fillStyle(0x1b1b1b, 1).fillEllipse(0, -14, 36, 14);
      g.fillStyle(0xffffff, 1).fillCircle(-6, 0, 3).fillCircle(6, 0, 3);
      g.fillStyle(0x0d1330, 1).fillCircle(-6, 0, 1.6).fillCircle(6, 0, 1.6);
      g.lineStyle(2, 0x3d1f0f, 1).lineBetween(-5, 9, 5, 9);
      g.fillStyle(C.gold, 1).fillTriangle(16, 16, 24, 16, 20, 8);
      break;
    case 'tick':
      g.fillStyle(0xc0c8e8, 1).fillCircle(0, 0, 25);
      g.fillStyle(0xffffff, 1).fillCircle(0, 0, 20);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillStyle(0x0d1330, 1).fillCircle(Math.cos(a) * 16, Math.sin(a) * 16, i % 3 ? 1 : 2);
      }
      g.lineStyle(3, 0x0d1330, 1).lineBetween(0, 0, 0, -12).lineBetween(0, 0, 9, 4);
      g.fillStyle(C.sig, 1).fillCircle(0, 0, 3);
      g.fillStyle(0xc0c8e8, 1).fillRect(-4, -32, 8, 8);
      break;
    case 'fair':
      g.fillStyle(C.violet, 1);
      for (let i = 0; i < 4; i++) {
        const x = -18 + i * 12;
        g.fillRoundedRect(x - 4, 8, 8, 26, 4);
      }
      g.fillCircle(0, -6, 22);
      g.fillStyle(0xffffff, 1).fillCircle(-8, -8, 7).fillCircle(8, -8, 7);
      g.fillStyle(0x0d1330, 1).fillCircle(-7, -7, 3.5).fillCircle(9, -7, 3.5);
      g.lineStyle(2, 0xffffff, 1).strokeCircle(-8, -8, 9).strokeCircle(8, -8, 9);
      g.fillStyle(0xffd166, 1).fillTriangle(-10, -26, 10, -26, 0, -36);
      break;
    case 'quill':
      g.fillStyle(0xf4c2ff, 1).fillCircle(0, 2, 22);
      g.fillStyle(0xffd166, 1).fillTriangle(10, 0, 30, 5, 10, 10);
      g.fillStyle(0xffffff, 1).fillCircle(-2, -4, 7);
      g.fillStyle(0x0d1330, 1).fillCircle(0, -4, 3.5);
      g.fillStyle(0xb5179e, 1).fillTriangle(-8, -18, -2, -34, 4, -18).fillTriangle(-2, -18, 8, -32, 10, -16);
      g.lineStyle(2, 0x0d1330, 1).strokeRect(-14, 12, 12, 10);
      break;
    case 'mo':
      g.fillStyle(C.ok, 1).fillEllipse(0, 6, 50, 44);
      g.fillStyle(0xffffff, 1).fillCircle(-9, 0, 7).fillCircle(9, 0, 7);
      g.fillStyle(0x0d1330, 1).fillCircle(-8, 1, 3.5).fillCircle(10, 1, 3.5);
      g.lineStyle(3, 0x0d1330, 1).beginPath().arc(0, 10, 8, 0.2, Math.PI - 0.2).strokePath();
      g.fillStyle(C.gold, 1).fillRect(-12, -26, 24, 10).fillTriangle(-12, -26, -6, -34, 0, -26).fillTriangle(0, -26, 6, -34, 12, -26);
      break;
    case 'hype':
      g.fillStyle(C.sig, 0.3).fillCircle(0, 0, 30);
      g.fillStyle(C.magenta, 1).fillTriangle(-24, 18, 0, -28, 24, 18);
      g.fillStyle(0xffffff, 1).fillCircle(-7, 0, 6).fillCircle(7, 0, 6);
      g.fillStyle(C.sig, 1).fillCircle(-7, 1, 3).fillCircle(7, 1, 3);
      g.fillStyle(C.gold, 1).fillTriangle(10, 10, 32, 2, 32, 22);
      g.lineStyle(2, 0xffffff, 1).lineBetween(-10, 12, 10, 12);
      break;
    case 'journal':
      g.fillStyle(C.gold, 1).fillRoundedRect(-18, -24, 36, 48, 4);
      g.fillStyle(0x0d1330, 1).fillRect(-12, -16, 24, 4).fillRect(-12, -8, 18, 3).fillRect(-12, -2, 22, 3);
      g.fillStyle(C.sig, 1).fillCircle(8, 12, 8);
      break;
    case 'you':
      g.fillStyle(C.blue, 1).fillRoundedRect(-20, 12, 40, 26, 10);
      g.fillStyle(0xf1c27d, 1).fillCircle(0, -2, 17);
      g.fillStyle(0x3d2c1e, 1).fillEllipse(0, -16, 36, 14);
      g.fillStyle(0x0d1330, 1).fillCircle(-6, -2, 2.5).fillCircle(6, -2, 2.5);
      break;
  }
  return c;
}

/**
 * Speech box at the bottom of the screen with a typewriter effect.
 * Space, Enter or a click advances; resolves when all lines were shown.
 */
export class Dialog {
  private box: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private frame: Phaser.GameObjects.Graphics;
  private portrait?: Phaser.GameObjects.Container;
  private typing?: Phaser.Time.TimerEvent;
  private full = '';
  private resolve?: () => void;
  private queue: Line[] = [];
  private advanceBound = () => this.advance();
  private readonly bw = W - 60;
  private readonly bh = 112;
  private openedAt = 0;

  constructor(private scene: Phaser.Scene, private y = H - 70) {
    this.frame = scene.add.graphics();
    this.name = scene.add.text(-this.bw / 2 + 110, -this.bh / 2 + 12, '', txt(15, C.cyan));
    this.body = scene.add.text(-this.bw / 2 + 110, -this.bh / 2 + 34, '', txt(20, C.text, { wordWrap: { width: this.bw - 150 }, lineSpacing: 4 }));
    this.hint = scene.add.text(this.bw / 2 - 18, this.bh / 2 - 10, '▶', txt(18, C.cyan)).setOrigin(1, 1);
    scene.tweens.add({ targets: this.hint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    this.box = scene.add.container(W / 2, y, [this.frame, this.name, this.body, this.hint]).setDepth(5000).setScrollFactor(0).setVisible(false);
  }

  get open() { return this.box.visible; }

  private paintFrame(color: number) {
    const { bw, bh } = this;
    this.frame.clear();
    this.frame.fillStyle(0x000000, 0.4).fillRoundedRect(-bw / 2 + 4, -bh / 2 + 6, bw, bh, 18);
    this.frame.fillStyle(C.panel, 0.96).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
    this.frame.lineStyle(2, color, 1).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
    this.frame.fillStyle(color, 0.12).fillRoundedRect(-bw / 2 + 2, -bh / 2 + 2, 100, bh - 4, { tl: 16, bl: 16, tr: 0, br: 0 });
  }

  say(lines: Line[]): Promise<void> {
    this.queue = [...lines];
    this.box.setVisible(true).setAlpha(0);
    this.box.y = this.y + 20;
    this.scene.tweens.add({ targets: this.box, alpha: 1, y: this.y, duration: 180, ease: 'Cubic.out' });
    this.scene.input.keyboard?.on('keydown-SPACE', this.advanceBound);
    this.scene.input.keyboard?.on('keydown-ENTER', this.advanceBound);
    this.scene.input.on('pointerdown', this.advanceBound);
    this.openedAt = this.scene.time.now;
    this.next();
    return new Promise((r) => (this.resolve = r));
  }

  private next() {
    const line = this.queue.shift();
    if (!line) return this.close();
    const who = line.who ?? 'ada';
    const cast = CAST[who];
    this.paintFrame(cast.color);
    this.portrait?.destroy();
    this.portrait = drawPortrait(this.scene, who, -this.bw / 2 + 52, 0, 1.05);
    this.box.addAt(this.portrait, 1);
    this.name.setText(cast.name).setColor(hex(cast.color));
    this.full = line.text;
    this.body.setText('');
    this.hint.setVisible(false);
    let i = 0;
    this.typing?.remove();
    this.typing = this.scene.time.addEvent({
      delay: 16, repeat: this.full.length - 1,
      callback: () => {
        i++;
        this.body.setText(this.full.slice(0, i));
        if (i % 3 === 0) audio.sfx('type');
        if (i >= this.full.length) this.hint.setVisible(true);
      },
    });
  }

  private advance() {
    if (!this.open || this.scene.time.now - this.openedAt < 120) return;
    if (this.body.text.length < this.full.length) {
      this.typing?.remove();
      this.body.setText(this.full);
      this.hint.setVisible(true);
      return;
    }
    this.next();
  }

  private close() {
    this.scene.input.keyboard?.off('keydown-SPACE', this.advanceBound);
    this.scene.input.keyboard?.off('keydown-ENTER', this.advanceBound);
    this.scene.input.off('pointerdown', this.advanceBound);
    this.box.setVisible(false);
    const r = this.resolve;
    this.resolve = undefined;
    r?.();
  }
}
