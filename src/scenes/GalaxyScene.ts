import Phaser from 'phaser';
import { audio } from '../core/audio';
import { CHAPTER_INFO, ChapterInfo, CRYSTALS } from '../core/chapters';
import { CHAPTERS, state } from '../core/state';
import { C, fadeTo, H, hex, panel, txt, W } from '../ui/theme';
import { BaseScene } from './BaseScene';

const WW = 2400;
const WH = 1500;

/** Star map hub: fly the ship between chapter planets, collect insight crystals. */
export class GalaxyScene extends BaseScene {
  private ship!: Phaser.GameObjects.Image;
  private vel = new Phaser.Math.Vector2();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private card!: Phaser.GameObjects.Container;
  private cardText!: Phaser.GameObjects.Text;
  private cardTitle!: Phaser.GameObjects.Text;
  private cardBg!: Phaser.GameObjects.Graphics;
  private near?: ChapterInfo;
  private crystals: { img: Phaser.GameObjects.Image; id: string; fact: string }[] = [];
  private pointer!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private mini!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private locked = false;
  private planetObjs: Phaser.GameObjects.GameObject[] = [];
  private pressBound?: () => void;

  constructor() { super('galaxy'); }

  create(data: { from?: string }) {
    this.crystals = [];
    this.locked = false;
    this.near = undefined;
    this.setup({ music: 'galaxy', worldW: WW, worldH: WH, nebula: ['nebula-violet', 'nebula-teal', 'nebula-ember'], seed: 31 });
    this.cameras.main.setBounds(0, 0, WW, WH);

    this.drawRoutes();
    this.drawPlanets();
    this.drawCrystals();
    this.drawDecor();

    const start = CHAPTER_INFO.find((c) => c.id === data?.from) ?? { x: 260, y: 700 };
    this.ship = this.add.image(start.x, start.y + (data?.from ? 140 : 0), 'ship').setDepth(50);
    this.trail = this.add.particles(0, 0, 'spark', {
      lifespan: 450, speed: { min: 20, max: 60 }, scale: { start: 0.55, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [C.cyan, 0xffffff, C.violet], blendMode: 'ADD', frequency: 16, emitting: false,
    }).setDepth(49);
    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.pressBound = () => this.land();
    this.input.keyboard!.on('keydown-E', this.pressBound);
    this.input.keyboard!.on('keydown-SPACE', this.pressBound);

    this.buildHud();
    this.refreshQuest();
    this.onArrive(data?.from);
  }

  protected onAdminToggle() { this.scene.restart({}); }

  private async onArrive(from?: string) {
    const done = Object.keys(state.data.results).length;
    if (!state.data.seenIntro.galaxy) {
      state.data.seenIntro.galaxy = true;
      state.save();
      this.locked = true;
      await this.say([
        { text: 'Das ist unsere Sternenkarte. Fliegen mit WASD oder Pfeiltasten, landen mit E.' },
        { text: 'Die Kristalle enthalten Erkenntnisse und Bonuspunkte. Der Pfeil zeigt dir dein nächstes Ziel.' },
      ]);
      this.locked = false;
    } else if (from && done === 7 && !state.done('finale')) {
      this.locked = true;
      await this.say([{ text: 'Alle sieben Werkzeuge an Bord! Der Hype-Nebel ist jetzt erreichbar. Zeit für das Finale.' }]);
      this.locked = false;
    }
    if (state.done('finale') && from === 'finale') fadeTo(this, 'results');
  }

  private drawRoutes() {
    const g = this.add.graphics().setDepth(-10);
    for (let i = 0; i < CHAPTER_INFO.length - 1; i++) {
      const a = CHAPTER_INFO[i];
      const b = CHAPTER_INFO[i + 1];
      const done = state.done(a.id);
      const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      const steps = Math.floor(d / 22);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        g.fillStyle(done ? C.cyan : 0x3b4a8c, done ? 0.7 : 0.5).fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, done ? 2.5 : 2);
      }
    }
  }

  private drawPlanets() {
    this.planetObjs = [];
    CHAPTER_INFO.forEach((c, i) => {
      const unlocked = state.unlocked(c.id);
      const halo = this.add.image(c.x, c.y, 'glow').setScale(3.2 * c.scale).setTint(C.planets[i % C.planets.length]).setAlpha(unlocked ? 0.35 : 0.1).setBlendMode(Phaser.BlendModes.ADD);
      const p = this.add.image(c.x, c.y, c.planet).setScale(c.scale);
      if (!unlocked) p.setTint(0x555a77);
      this.tweens.add({ targets: halo, alpha: unlocked ? 0.5 : 0.12, duration: 1800, yoyo: true, repeat: -1 });
      const label = this.add.text(c.x, c.y + p.displayHeight / 2 - 4, `${i + 1 < 8 ? i + 1 + ' · ' : ''}${c.name}`, txt(15, unlocked ? C.text : C.dim, { stroke: '#070b1a', strokeThickness: 5 })).setOrigin(0.5);
      const res = state.data.results[c.id];
      const stars = this.add.text(c.x, label.y + 20, res ? '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars) : unlocked ? 'NEU' : '🔒', txt(15, res ? C.gold : unlocked ? C.ok : C.dim, { stroke: '#070b1a', strokeThickness: 4 })).setOrigin(0.5);
      if (unlocked && !res) this.tweens.add({ targets: stars, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
      this.planetObjs.push(halo, p, label, stars);
    });
  }

  private drawCrystals() {
    for (const cr of CRYSTALS) {
      if (state.data.crystals.includes(cr.id)) continue;
      const glow = this.add.image(cr.x, cr.y, 'glow').setScale(0.6).setTint(C.cyan).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
      const img = this.add.image(cr.x, cr.y, 'crystal');
      this.tweens.add({ targets: [img, glow], y: cr.y - 10, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      img.setData('glow', glow);
      this.crystals.push({ img, id: cr.id, fact: cr.fact });
    }
  }

  private drawDecor() {
    // drifting asteroids
    for (let i = 0; i < 26; i++) {
      const a = this.add.image(Phaser.Math.Between(0, WW), Phaser.Math.Between(0, WH), Math.random() < 0.6 ? 'p-small1' : 'p-small2')
        .setScale(Phaser.Math.FloatBetween(0.25, 0.6)).setAlpha(0.8).setTint(0x9a8f9f).setDepth(-5);
      this.tweens.add({ targets: a, x: a.x + Phaser.Math.Between(-80, 80), y: a.y + Phaser.Math.Between(-60, 60), angle: Phaser.Math.Between(-180, 180), duration: Phaser.Math.Between(9000, 16000), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  private buildHud() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(4000);
    hud.add(panel(this, 10, 10, 330, 62, C.panelEdge));
    this.questText = this.add.text(24, 18, '', txt(14, C.text, { wordWrap: { width: 300 } }));
    hud.add(this.questText);
    this.scoreText = this.add.text(W - 20, 16, '', txt(18, C.gold)).setOrigin(1, 0);
    hud.add(this.scoreText);
    hud.add(this.add.text(W - 20, 40, `${state.data.name || 'Gast'} · ${{ easy: 'Leicht', normal: 'Normal', hard: 'Schwer' }[state.data.difficulty]}`, txt(13, C.dim)).setOrigin(1, 0));
    this.mini = this.add.graphics().setScrollFactor(0).setDepth(4001);
    this.pointer = this.add.text(0, 0, '➤', txt(30, C.gold, { stroke: '#070b1a', strokeThickness: 5 })).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
    this.tweens.add({ targets: this.pointer, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });

    // landing card
    this.cardBg = this.add.graphics();
    this.cardTitle = this.add.text(0, -34, '', txt(20, C.gold)).setOrigin(0.5);
    this.cardText = this.add.text(0, 6, '', txt(15, C.text, { align: 'center' })).setOrigin(0.5);
    this.card = this.add.container(W / 2, H - 70, [this.cardBg, this.cardTitle, this.cardText]).setScrollFactor(0).setDepth(4100).setVisible(false);
  }

  private target(): ChapterInfo | undefined {
    return CHAPTER_INFO.find((c) => state.unlocked(c.id) && !state.done(c.id));
  }

  private refreshQuest() {
    const t = this.target();
    this.questText.setText(t ? `Nächstes Ziel:\n${t.name} · ${t.topic}` : state.done('finale') ? 'Galaxie gerettet! Schau dir das Scoreboard an (E auf dem Hype-Nebel).' : 'Erkunde die Galaxie!');
    this.scoreText.setText(`${state.total} Punkte · ${state.data.crystals.length}/${CRYSTALS.length} ◆`);
  }

  update(t: number, dtMs: number) {
    super.update(t, dtMs);
    const dt = Math.min(dtMs, 50) / 1000;
    const k = this.keys;
    const input = new Phaser.Math.Vector2(
      (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0),
      (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0),
    );
    if (this.locked || this.dialog.open) input.set(0, 0);
    const accel = k.SHIFT.isDown ? 1300 : 800;
    if (input.lengthSq() > 0) input.normalize().scale(accel * dt);
    this.vel.add(input);
    this.vel.scale(Math.pow(0.12, dt)); // space-drag so it stays controllable
    const max = k.SHIFT.isDown ? 520 : 340;
    if (this.vel.length() > max) this.vel.setLength(max);
    this.ship.x = Phaser.Math.Clamp(this.ship.x + this.vel.x * dt, 30, WW - 30);
    this.ship.y = Phaser.Math.Clamp(this.ship.y + this.vel.y * dt, 30, WH - 30);
    if (this.vel.length() > 20) {
      this.ship.rotation = Phaser.Math.Angle.RotateTo(this.ship.rotation, this.vel.angle(), 6 * dt);
    }
    const moving = input.lengthSq() > 0;
    this.trail.emitting = moving;
    if (moving) {
      const back = new Phaser.Math.Vector2(-26, 0).rotate(this.ship.rotation);
      this.trail.setPosition(this.ship.x + back.x, this.ship.y + back.y);
    }

    // crystals
    for (const cr of [...this.crystals]) {
      if (Phaser.Math.Distance.Between(cr.img.x, cr.img.y, this.ship.x, this.ship.y) < 40) this.collect(cr);
    }

    // planet proximity
    this.near = CHAPTER_INFO.find((c) => Phaser.Math.Distance.Between(c.x, c.y, this.ship.x, this.ship.y) < 70 * c.scale + 60);
    this.updateCard();
    this.updatePointer();
    this.drawMinimap();
  }

  private collect(cr: { img: Phaser.GameObjects.Image; id: string; fact: string }) {
    this.crystals = this.crystals.filter((c) => c !== cr);
    state.addCrystal(cr.id);
    audio.sfx('coin');
    const glow = cr.img.getData('glow') as Phaser.GameObjects.Image;
    this.tweens.add({ targets: [cr.img, glow], scale: 2, alpha: 0, duration: 400, onComplete: () => { cr.img.destroy(); glow.destroy(); } });
    const p = this.add.particles(cr.img.x, cr.img.y, 'spark', { speed: { min: 60, max: 180 }, lifespan: 600, scale: { start: 0.6, end: 0 }, tint: [C.cyan, C.violet], blendMode: 'ADD', emitting: false });
    p.explode(24);
    this.refreshQuest();
    // fact toast
    const toast = this.add.container(W / 2, 110).setScrollFactor(0).setDepth(4200);
    const t = this.add.text(0, 0, `◆ +50   ${cr.fact}`, txt(16, C.text, { wordWrap: { width: 600 }, align: 'center' })).setOrigin(0.5);
    const bg = this.add.graphics().fillStyle(C.panel, 0.95).fillRoundedRect(-t.width / 2 - 18, -t.height / 2 - 12, t.width + 36, t.height + 24, 14)
      .lineStyle(2, C.cyan, 1).strokeRoundedRect(-t.width / 2 - 18, -t.height / 2 - 12, t.width + 36, t.height + 24, 14);
    toast.add([bg, t]).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, y: 120, duration: 300 });
    this.tweens.add({ targets: toast, alpha: 0, delay: 4200, duration: 500, onComplete: () => toast.destroy() });
  }

  private updateCard() {
    const c = this.near;
    if (!c || this.dialog.open) { this.card.setVisible(false); return; }
    const unlocked = state.unlocked(c.id);
    const i = CHAPTER_INFO.indexOf(c);
    const res = state.data.results[c.id];
    this.cardTitle.setText(c.name);
    let line2 = `${c.topic} · ${c.teaser}`;
    if (c.id === 'finale' && state.done('finale')) line2 = 'Galaxie gerettet!';
    const action = !unlocked ? `🔒 Erst Planet ${i} abschließen` : c.id === 'finale' && state.done('finale') ? 'E: Scoreboard ansehen' : res ? `E: Nochmal spielen (Bestwert ${res.score})` : 'E / Leertaste: Landen';
    this.cardText.setText(`${line2}\n${action}`);
    const w = Math.max(this.cardText.width, this.cardTitle.width) + 50;
    this.cardBg.clear().fillStyle(C.panel, 0.95).fillRoundedRect(-w / 2, -58, w, 100, 16)
      .lineStyle(2, unlocked ? C.gold : C.panelEdge, 1).strokeRoundedRect(-w / 2, -58, w, 100, 16);
    this.card.setVisible(true);
  }

  private updatePointer() {
    const t = this.target() ?? (state.done('finale') ? CHAPTER_INFO[7] : undefined);
    const cam = this.cameras.main;
    if (!t) { this.pointer.setVisible(false); return; }
    const sx = t.x - cam.scrollX;
    const sy = t.y - cam.scrollY;
    const on = sx > 0 && sx < W && sy > 0 && sy < H;
    if (on || this.near === t) { this.pointer.setVisible(false); return; }
    const ang = Math.atan2(sy - H / 2, sx - W / 2);
    this.pointer.setVisible(true).setRotation(ang)
      .setPosition(Phaser.Math.Clamp(W / 2 + Math.cos(ang) * 400, 40, W - 40), Phaser.Math.Clamp(H / 2 + Math.sin(ang) * 230, 90, H - 40));
  }

  private drawMinimap() {
    const g = this.mini.clear();
    const mw = 160;
    const mh = 100;
    const x0 = W - mw - 14;
    const y0 = H - mh - 14;
    g.fillStyle(C.panel, 0.8).fillRoundedRect(x0, y0, mw, mh, 8).lineStyle(1, C.panelEdge, 1).strokeRoundedRect(x0, y0, mw, mh, 8);
    for (const c of CHAPTER_INFO) {
      const col = state.done(c.id) ? C.gold : state.unlocked(c.id) ? C.ok : 0x555a77;
      g.fillStyle(col, 1).fillCircle(x0 + (c.x / WW) * mw, y0 + (c.y / WH) * mh, 3.5);
    }
    for (const cr of this.crystals) g.fillStyle(C.cyan, 0.8).fillCircle(x0 + (cr.img.x / WW) * mw, y0 + (cr.img.y / WH) * mh, 1.5);
    g.fillStyle(0xffffff, 1).fillCircle(x0 + (this.ship.x / WW) * mw, y0 + (this.ship.y / WH) * mh, 3);
  }

  private land() {
    const c = this.near;
    if (!c || this.locked || this.dialog.open) return;
    if (!state.unlocked(c.id)) { audio.sfx('fail'); this.cameras.main.shake(120, 0.004); return; }
    if (c.id === 'finale' && state.done('finale')) { fadeTo(this, 'results'); return; }
    this.locked = true;
    audio.sfx('whoosh');
    this.tweens.add({ targets: this.ship, x: c.x, y: c.y, scale: 0.2, duration: 600, ease: 'Cubic.in' });
    this.cameras.main.zoomTo(2.2, 650, 'Cubic.easeIn');
    this.time.delayedCall(450, () => fadeTo(this, c.scene));
  }

  // expose for automated tests
  get debug() { return { ship: this.ship, near: this.near?.id, chapters: CHAPTERS, hex }; }
}
