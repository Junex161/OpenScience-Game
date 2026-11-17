import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { rng } from '../stats/stats';
import { C, fadeTo, H, panel, txt, W } from '../ui/theme';
import { BaseScene } from './BaseScene';

/**
 * Prologue: the sky is a map of 97 published findings. A replication storm
 * (modelled on Open Science Collaboration, 2015) re-tests them: 35 hold, at
 * half their brightness; 62 collapse.
 */
export class IntroScene extends BaseScene {
  private stars: Phaser.GameObjects.Image[] = [];
  private survive = new Set<number>();
  private counter!: Phaser.GameObjects.Text;
  private repBar!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Container;

  constructor() { super('intro'); }

  create() {
    this.stars = [];
    this.setup({ music: 'intro', nebula: ['nebula-teal', 'nebula-violet'], seed: 12 });
    const ship = this.add.image(W / 2, H - 175, 'ship').setScale(1.4).setAngle(-90);
    this.tweens.add({ targets: ship, y: H - 181, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.particles(0, 0, 'spark', {
      follow: ship, followOffset: { x: 0, y: 34 }, lifespan: 300, speedY: { min: 60, max: 120 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: C.cyan, blendMode: 'ADD', frequency: 20,
    });

    // 97 "finding" stars in a loose band across the sky
    const r = rng(97);
    for (let i = 0; i < 97; i++) {
      const col = i % 17;
      const row = Math.floor(i / 17);
      const x = 60 + col * 50 + (r() - 0.5) * 30;
      const y = 112 + row * 42 + (r() - 0.5) * 22;
      const s = this.add.image(x, y, 'finding').setScale(0).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, scale: 0.45 + r() * 0.25, delay: 30 * i, duration: 400, ease: 'Back.out' });
      this.stars.push(s);
    }
    const idx = Array.from({ length: 97 }, (_, i) => i).sort(() => r() - 0.5);
    idx.slice(0, 35).forEach((i) => this.survive.add(i));

    this.buildHud();
    this.time.delayedCall(3400, () => this.run());
    this.add.text(W - 10, H - 6, 'Leertaste: weiter', txt(12, C.dim)).setOrigin(1, 1);
  }

  private buildHud() {
    const g = panel(this, 0, 0, 470, 66, C.cyan);
    const l = this.add.text(16, 8, 'Erneut signifikant', txt(13, C.dim));
    this.counter = this.add.text(16, 26, '– / 97', txt(28, C.text));
    const e = this.add.text(180, 8, 'Mittlere Effektstärke (r)', txt(13, C.dim));
    const o1 = this.add.text(180, 28, 'Original', txt(12, C.text));
    const o2 = this.add.text(180, 44, 'Replikation', txt(12, C.text));
    const b1 = this.add.rectangle(262, 35, 0.4 * 300, 9, C.cyan).setOrigin(0, 0.5);
    this.repBar = this.add.rectangle(262, 51, 0, 9, C.sig).setOrigin(0, 0.5);
    const v1 = this.add.text(388, 28, '.40', txt(12, C.text));
    const v2 = this.add.text(388, 44, '.20', txt(12, C.text)).setAlpha(0);
    const src = this.add.text(462, 8, 'OSC (2015)', txt(11, C.dim)).setOrigin(1, 0);
    this.hud = this.add.container(W / 2 - 235, 4, [g, l, this.counter, e, o1, o2, b1, this.repBar, v1, v2, src]).setAlpha(0).setDepth(100);
    this.hud.setData('v2', v2);
  }

  private async run() {
    const name = state.data.name || 'Gast';
    await this.say([
      { text: `Willkommen an Bord, ${name}! Ich bin ADA, die Bord-KI der Forschungsfähre „Lumen“.` },
      { text: 'Jeder Stern da draußen ist ein veröffentlichter Befund. Ganze Flotten navigieren nach ihnen.' },
      { text: 'Aber halten sie auch? Ein Team aus 270 Forschenden hat 100 Studien wiederholt. Sieh hin.' },
    ]);
    await this.storm();
    await this.say([
      { text: 'Nur 35 von 97 Befunden waren wieder signifikant. Und die Effekte waren im Schnitt nur halb so groß.' },
      { text: 'Betrogen hat dabei kaum jemand. Das Problem steckt im System.' },
    ]);
    await this.hypeCameo();
    await this.say([
      { text: 'Der HYPE frisst glänzende Ergebnisse. Er belohnt „p < .05“, egal wie es zustande kam.' },
      { text: 'Unser Gegenmittel heißt Open Science: Forschung so offen machen, dass alle sie nachprüfen können.' },
      { text: 'Sieben Planeten, sieben Werkzeuge. Dann stellen wir den HYPE. Ab zur Sternenkarte!' },
    ]);
    state.data.prologueDone = true;
    state.save();
    fadeTo(this, 'galaxy');
  }

  private storm(): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({ targets: this.hud, alpha: 1, y: 14, duration: 400 });
      audio.sfx('whoosh');
      const wave = this.add.image(-200, 230, 'glow').setScale(2.2, 6).setTint(C.cyan).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
      const hit = new Set<number>();
      let held = 0;
      this.tweens.add({
        targets: wave, x: W + 200, duration: 5200, ease: 'Linear',
        onUpdate: () => {
          this.stars.forEach((s, i) => {
            if (hit.has(i) || wave.x < s.x) return;
            hit.add(i);
            if (this.survive.has(i)) {
              held++;
              this.counter.setText(`${held} / 97`);
              this.tweens.add({ targets: s, scale: s.scale * 0.6, duration: 600, ease: 'Back.inOut' });
              s.setTint(0xbfffe6);
            } else this.collapse(s);
          });
        },
        onComplete: () => {
          wave.destroy();
          this.counter.setText('35 / 97').setColor('#ff5c7a');
          this.tweens.add({ targets: this.repBar, width: 0.2 * 300, duration: 900, ease: 'Cubic.out' });
          this.tweens.add({ targets: this.hud.getData('v2'), alpha: 1, duration: 400, delay: 600 });
          this.time.delayedCall(1500, resolve);
        },
      });
    });
  }

  private collapse(s: Phaser.GameObjects.Image) {
    s.setTint(0xff7a8a);
    this.tweens.add({ targets: s, scale: s.scale * 1.4, duration: 120, yoyo: true, onComplete: () => {
      this.tweens.add({ targets: s, scale: 0, alpha: 0, duration: 400, ease: 'Quad.in' });
      const p = this.add.particles(s.x, s.y, 'spark', {
        speed: { min: 20, max: 70 }, lifespan: 600, scale: { start: 0.35, end: 0 }, tint: [0x8c96c8, 0xff7a8a], quantity: 8, emitting: false, blendMode: 'ADD',
      });
      p.explode(8);
      this.time.delayedCall(900, () => p.destroy());
    } });
  }

  private async hypeCameo() {
    audio.sfx('boom');
    this.cameras.main.shake(300, 0.008);
    const h = this.add.container(W / 2, H / 2 - 40).setScale(0);
    const aura = this.add.image(0, 0, 'glow').setScale(3).setTint(C.magenta).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    g.fillStyle(C.magenta, 1).fillTriangle(-60, 50, 0, -70, 60, 50);
    g.fillStyle(0xffffff, 1).fillCircle(-18, 0, 14).fillCircle(18, 0, 14);
    g.fillStyle(C.sig, 1).fillCircle(-18, 2, 6).fillCircle(18, 2, 6);
    g.fillStyle(C.gold, 1).fillTriangle(30, 25, 90, 0, 90, 50);
    const shout = this.add.text(0, -110, 'p < .05!!!', txt(42, C.gold, { stroke: '#ff4fd8', strokeThickness: 6 })).setOrigin(0.5);
    h.add([aura, g, shout]);
    this.tweens.add({ targets: h, scale: 1, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: shout, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 10 });
    await this.say([
      { who: 'hype', text: 'HAHAHA! Mehr! Glänzender! Signifikanter! Wer braucht schon Wiederholungen?' },
    ]);
    this.tweens.add({ targets: h, scale: 0, alpha: 0, duration: 400, onComplete: () => h.destroy() });
    await this.wait(400);
  }
}
