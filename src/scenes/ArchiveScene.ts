import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { makeLiterature, MiniStudy, pooled } from '../stats/meta';
import { Hearts, Ship } from '../ui/ship';
import { button, C, H, panel, txt, W } from '../ui/theme';
import { choice, floatText } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const TRUE_D = 0.15;
const ARENA = new Phaser.Geom.Rectangle(30, 70, 580, 450);
const FP = { x: 650, y: 96, w: 290, h: 330 }; // funnel plot area
const DMIN = -0.6;
const DMAX = 1.4;
const SEMAX = 0.5;

/** Chapter 2: publication bias. Recover null results from the file drawer. */
export class ArchiveScene extends ChapterScene {
  private ship!: Ship;
  private hearts!: Hearts;
  private lit: MiniStudy[] = [];
  private found: MiniStudy[] = [];
  private drawers: { img: Phaser.GameObjects.Image; study: MiniStudy; vx: number; vy: number }[] = [];
  private comets: { img: Phaser.GameObjects.Image; vx: number }[] = [];
  private plot!: Phaser.GameObjects.Graphics;
  private estText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timeLeft = 0;
  private timeTotal = 0;
  private running = false;
  private startBias = 0;
  private cometTimer = 0;

  constructor() { super('archive'); }

  create() {
    this.found = [];
    this.drawers = [];
    this.comets = [];
    this.running = false;
    this.chapterSetup('archive', 'Planet 2 · Archivmond Schublade', 'archive', { nebula: ['nebula-teal'], tint: 0x1b1a2e });
    this.makeDrawerTexture();
    // pick a literature where recovering the drawers really fixes the estimate
    const s0 = 5 + Math.floor(Math.random() * 40);
    for (let seed = s0; seed < s0 + 500; seed++) {
      const lit = makeLiterature(TRUE_D, 60, seed);
      const pub = lit.filter((s) => s.published);
      const hidden = lit.filter((s) => !s.published).slice(0, 26);
      this.lit = [...pub, ...hidden];
      if (pub.length >= 12 && pub.length <= 22 && pooled(pub) > TRUE_D + 0.1 && Math.abs(pooled([...pub, ...hidden]) - TRUE_D) < 0.035) break;
    }
    const g = this.add.graphics();
    g.lineStyle(2, 0x3b4a8c, 0.8).strokeRoundedRect(ARENA.x - 10, ARENA.y - 10, ARENA.width + 20, ARENA.height + 20, 16);
    panel(this, FP.x - 20, 56, W - FP.x + 10, 470, C.cyan);
    this.add.text(FP.x - 4, 64, 'Funnel Plot', txt(16, C.cyan));
    this.plot = this.add.graphics();
    this.estText = this.add.text(FP.x - 4, 448, '', txt(15, C.text, { wordWrap: { width: 290 } }));
    this.timerText = this.add.text(ARENA.right, 50, '', txt(18, C.gold)).setOrigin(1, 0).setDepth(4001);
    this.startBias = pooled(this.published()) - TRUE_D;
    this.drawPlot();

    this.ship = new Ship(this, ARENA.centerX, ARENA.centerY, ARENA, 300);
    this.ship.enabled = false;
    this.hearts = new Hearts(this, state.diff.hearts);
    for (const s of this.lit.filter((x) => !x.published)) this.spawnDrawer(s);
    this.timeTotal = this.timeLeft = 70000 * state.diff.time;
    this.time.delayedCall(400, () => this.intro());
  }

  private published() { return this.lit.filter((s) => s.published); }

  private makeDrawerTexture() {
    if (this.textures.exists('drawer')) return;
    const g = this.make.graphics({}, false);
    g.fillStyle(0xd4a373, 1).fillRoundedRect(0, 0, 40, 30, 5);
    g.fillStyle(0xa47148, 1).fillRect(4, 4, 32, 10).fillRect(4, 16, 32, 10);
    g.fillStyle(0x4cf2ff, 1).fillRect(16, 7, 8, 3).fillRect(16, 19, 8, 3);
    g.generateTexture('drawer', 40, 30);
    g.clear();
    g.fillStyle(0xff4fd8, 1).fillCircle(14, 14, 10);
    g.fillStyle(0xffd166, 1).fillCircle(14, 14, 5);
    g.generateTexture('comet', 28, 28);
    g.destroy();
  }

  private spawnDrawer(study: MiniStudy) {
    const img = this.add.image(Phaser.Math.Between(ARENA.left + 30, ARENA.right - 30), Phaser.Math.Between(ARENA.top + 30, ARENA.bottom - 30), 'drawer').setDepth(20);
    const glow = this.add.image(img.x, img.y, 'glow').setScale(0.6).setTint(C.cyan).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(19);
    img.setData('glow', glow);
    const a = Math.random() * Math.PI * 2;
    const sp = Phaser.Math.Between(15, 45) * state.diff.speed;
    this.drawers.push({ img, study, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }

  private async intro() {
    await this.say([
      { who: 'schubi', text: 'Piep! Willkommen im Archiv. Hier landen alle Studien, die niemand drucken wollte.' },
      { who: 'schubi', text: 'Rechts siehst du, was veröffentlicht ist: lauter kleine Studien mit großen Effekten. Der Mittelwert sieht beeindruckend aus.' },
      { text: 'Verdächtig: Kleine Studien streuen stark. Wo sind die kleinen Studien mit kleinen oder negativen Effekten?' },
      { who: 'schubi', text: 'In den Schubladen! Flieg sie an und öffne sie. Aber Vorsicht vor den Hype-Kometen!' },
    ]);
    this.ship.enabled = true;
    this.running = true;
  }

  private x(d: number) { return FP.x + ((d - DMIN) / (DMAX - DMIN)) * FP.w; }
  private y(se: number) { return FP.y + (se / SEMAX) * FP.h; }

  private drawPlot(showTruth = false) {
    const g = this.plot.clear();
    const all = [...this.published(), ...this.found];
    const est = pooled(all);
    // axes
    g.lineStyle(1, 0x3b4a8c, 1).strokeRect(FP.x, FP.y, FP.w, FP.h);
    g.lineStyle(1, 0x3b4a8c, 0.6).lineBetween(this.x(0), FP.y, this.x(0), FP.y + FP.h);
    // funnel around the current estimate
    g.lineStyle(2, C.magenta, 0.5);
    g.lineBetween(this.x(est), FP.y, this.x(est - 1.96 * SEMAX), FP.y + FP.h);
    g.lineBetween(this.x(est), FP.y, this.x(est + 1.96 * SEMAX), FP.y + FP.h);
    g.lineStyle(3, C.magenta, 1).lineBetween(this.x(est), FP.y, this.x(est), FP.y + FP.h);
    if (showTruth) g.lineStyle(3, C.ok, 1).lineBetween(this.x(TRUE_D), FP.y, this.x(TRUE_D), FP.y + FP.h);
    for (const s of this.published()) g.fillStyle(C.gold, 1).fillCircle(this.x(Phaser.Math.Clamp(s.d, DMIN, DMAX)), this.y(Math.min(s.se, SEMAX)), 4.5);
    for (const s of this.found) g.fillStyle(C.cyan, 1).fillCircle(this.x(Phaser.Math.Clamp(s.d, DMIN, DMAX)), this.y(Math.min(s.se, SEMAX)), 4.5);
    const bias = est - TRUE_D;
    this.estText.setText(`● veröffentlicht  ● aus der Schublade\nGeschätzter Effekt: d = ${est.toFixed(2)}${showTruth ? `\nWahrer Effekt: d = ${TRUE_D.toFixed(2)}` : ''}`);
    return bias;
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    if (!this.ship) return;
    this.ship.update(dt);
    const s = dt / 1000;
    for (const d of this.drawers) {
      d.img.x += d.vx * s;
      d.img.y += d.vy * s;
      if (d.img.x < ARENA.left + 20 || d.img.x > ARENA.right - 20) d.vx *= -1;
      if (d.img.y < ARENA.top + 15 || d.img.y > ARENA.bottom - 15) d.vy *= -1;
      d.img.angle = Math.sin(t / 500 + d.img.x) * 6;
      (d.img.getData('glow') as Phaser.GameObjects.Image).setPosition(d.img.x, d.img.y);
    }
    if (!this.running) return;
    this.timeLeft -= dt;
    this.timerText.setText(`⏱ ${Math.max(0, Math.ceil(this.timeLeft / 1000))} s`);
    for (const d of [...this.drawers]) {
      if (Phaser.Math.Distance.Between(d.img.x, d.img.y, this.ship.x, this.ship.y) < 32) this.open(d);
    }
    this.cometTimer -= dt;
    if (this.cometTimer <= 0) {
      this.cometTimer = Phaser.Math.Between(900, 1700) / state.diff.speed;
      const img = this.add.image(ARENA.right + 20, Phaser.Math.Between(ARENA.top + 10, ARENA.bottom - 10), 'comet').setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
      const tail = this.add.particles(0, 0, 'spark', { follow: img, lifespan: 350, scale: { start: 0.6, end: 0 }, tint: [C.magenta, C.gold], blendMode: 'ADD', frequency: 20, speedX: { min: 40, max: 90 } }).setDepth(29);
      img.setData('tail', tail);
      this.comets.push({ img, vx: -Phaser.Math.Between(170, 260) * state.diff.speed });
    }
    for (const c of [...this.comets]) {
      c.img.x += c.vx * s;
      if (c.img.x < ARENA.left - 40) {
        this.comets = this.comets.filter((x) => x !== c);
        (c.img.getData('tail') as Phaser.GameObjects.Particles.ParticleEmitter).destroy();
        c.img.destroy();
        continue;
      }
      if (Phaser.Math.Distance.Between(c.img.x, c.img.y, this.ship.x, this.ship.y) < 24 && this.ship.hit()) {
        audio.sfx('hurt');
        floatText(this, this.ship.x, this.ship.y - 20, '−♥', C.sig);
        if (this.hearts.lose() === 0) this.fail();
      }
    }
    if (this.timeLeft <= 0) this.end(false);
  }

  private open(d: { img: Phaser.GameObjects.Image; study: MiniStudy }) {
    this.drawers = this.drawers.filter((x) => x !== d);
    audio.sfx('coin');
    const glow = d.img.getData('glow') as Phaser.GameObjects.Image;
    glow.destroy();
    const spark = this.add.image(d.img.x, d.img.y, 'spark').setScale(1.4).setTint(C.cyan).setBlendMode(Phaser.BlendModes.ADD).setDepth(60);
    this.tweens.add({ targets: d.img, scale: 1.5, alpha: 0, duration: 300, onComplete: () => d.img.destroy() });
    floatText(this, d.img.x, d.img.y - 10, `d = ${d.study.d.toFixed(2)}`, C.cyan, 16);
    this.tweens.add({
      targets: spark, x: this.x(Phaser.Math.Clamp(d.study.d, DMIN, DMAX)), y: this.y(Math.min(d.study.se, SEMAX)), duration: 600, ease: 'Cubic.in',
      onComplete: () => {
        spark.destroy();
        this.found.push(d.study);
        const bias = this.drawPlot();
        if (bias <= 0.05 * state.diff.tolerance + 0.01 && this.running) this.end(true);
      },
    });
  }

  private async fail() {
    this.running = false;
    this.ship.enabled = false;
    await this.say([{ who: 'schubi', text: 'Bzzt! Die Kometen haben uns erwischt. Neuer Versuch!' }]);
    this.scene.restart();
  }

  private async end(success: boolean) {
    if (!this.running) return;
    this.running = false;
    this.ship.enabled = false;
    for (const c of this.comets) c.img.setVisible(false);
    const bias = this.drawPlot(true);
    const progress = Phaser.Math.Clamp(1 - bias / this.startBias, 0, 1);
    let score = Math.round(450 * progress) + (success ? Math.round(150 * (this.timeLeft / this.timeTotal)) : 0) + this.hearts.n * 20;
    await this.say([
      { who: 'schubi', text: success ? 'Geschafft! Mit den Schubladen-Studien liegt die Schätzung fast beim wahren Effekt.' : 'Zeit um! Ein paar Schubladen sind noch zu.' },
      { text: `Nur mit den veröffentlichten Studien hätten wir den Effekt um das ${(pooled(this.published()) / TRUE_D).toFixed(1)}-Fache überschätzt.` },
      { text: 'Das ist Publikationsbias, auch „File-Drawer-Problem“ (Rosenthal, 1979). In der Psychologie berichten über 90 % der Artikel positive Ergebnisse (Fanelli, 2010).' },
    ]);
    const q = await choice(this, 'Woran erkennst du Publikationsbias im Funnel Plot?', ['Der Trichter ist symmetrisch', 'Kleine Studien mit kleinen Effekten fehlen: der Trichter ist schief', 'Alle Punkte liegen auf einer Linie'], 1,
      'Ohne Bias verteilen sich kleine Studien symmetrisch um den wahren Effekt.');
    if (q) score += 200;
    const q2 = await choice(this, 'Was hilft gegen das Schubladen-Problem?', ['Nur große Effekte einreichen', 'Auch Nullbefunde veröffentlichen, z. B. als Registered Report', 'Mehr Kometen'], 1,
      'Registered Reports werden vor den Ergebnissen angenommen, also auch bei Nullbefunden.');
    if (q2) score += 160;
    this.finish(score, 'Nullbefunde sind auch Befunde. Ohne sie sieht jeder Effekt größer aus, als er ist.', 'schubi');
  }

  // automated-test hook
  get debugOpenAll() { return () => { for (const d of [...this.drawers]) this.open(d); }; }
}

