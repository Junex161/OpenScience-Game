import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { nFor, power } from '../stats/meta';
import { normal } from '../stats/stats';
import { button, C, H, hex, panel, txt, W } from '../ui/theme';
import { choice, floatText, slider } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const AX = { x0: 70, x1: 890, y: 400 };
const DMIN = -0.6;
const DMAX = 1.6;

/** Chapter 3: statistical power, sample size and the winner's curse. */
export class PowerScene extends ChapterScene {
  private trueD = 0.4;
  private n = 20;
  private layer!: Phaser.GameObjects.Container;
  private threshold!: Phaser.GameObjects.Container;
  private statsText!: Phaser.GameObjects.Text;
  private nText!: Phaser.GameObjects.Text;
  private salvos = 0;
  private busy = false;
  private mothership!: Phaser.GameObjects.Container;
  private fireBtn?: Phaser.GameObjects.Container;
  private lockBtn?: Phaser.GameObjects.Container;
  private sl?: ReturnType<typeof slider>;
  private salvoText!: Phaser.GameObjects.Text;
  private truthLine?: Phaser.GameObjects.Graphics;

  constructor() { super('power'); }

  create() {
    this.trueD = { easy: 0.5, normal: 0.4, hard: 0.3 }[state.data.difficulty];
    this.n = 20;
    this.salvos = 0;
    this.busy = false;
    this.chapterSetup('power', 'Planet 3 · Power-Nebel', 'power', { nebula: ['nebula-teal', 'nebula-violet'], tint: 0x0a2233 });
    // lightning flashes in the nebula
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.lightning() });

    this.mothership = this.add.container(W / 2, 92);
    const ms = this.add.image(0, 0, 'ship').setScale(2.2).setAngle(90);
    const halo = this.add.image(0, 0, 'glow').setScale(1.6).setTint(C.cyan).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    this.mothership.add([halo, ms]);
    this.tweens.add({ targets: this.mothership, x: W / 2 + 10, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // axis
    const g = this.add.graphics();
    g.lineStyle(3, 0x8c96c8, 1).lineBetween(AX.x0, AX.y, AX.x1, AX.y);
    for (let d = -0.5; d <= 1.5001; d += 0.25) {
      g.lineStyle(2, 0x8c96c8, 1).lineBetween(this.x(d), AX.y, this.x(d), AX.y + 8);
      this.add.text(this.x(d), AX.y + 12, d.toFixed(2).replace(/\.?0+$/, '') || '0', txt(12, C.dim)).setOrigin(0.5, 0);
    }
    this.add.text(AX.x1, AX.y + 30, 'gemessener Effekt (d)', txt(13, C.dim)).setOrigin(1, 0);
    this.layer = this.add.container(0, 0);
    this.threshold = this.add.container(0, 0);
    this.statsText = this.add.text(20, 52, '', txt(15, C.text)).setDepth(10);
    this.salvoText = this.add.text(W - 20, 52, '', txt(15, C.gold)).setOrigin(1, 0);
    this.nText = this.add.text(W / 2, 470, '', txt(18, C.text)).setOrigin(0.5);
    this.drawThreshold();
    this.time.delayedCall(400, () => this.intro());
  }

  private x(d: number) { return AX.x0 + ((Phaser.Math.Clamp(d, DMIN, DMAX) - DMIN) / (DMAX - DMIN)) * (AX.x1 - AX.x0); }

  private lightning() {
    const x = Phaser.Math.Between(0, W);
    const f = this.add.image(x, Phaser.Math.Between(60, 300), 'glow').setScale(4).setTint(C.cyan).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(-60);
    this.tweens.add({ targets: f, alpha: 0.35, duration: 80, yoyo: true, repeat: 1, onComplete: () => f.destroy() });
  }

  /** The smallest estimate that is still significant with n per group. */
  private sigLine(n: number) { return 1.96 * Math.sqrt(2 / n); }

  private drawThreshold() {
    this.threshold.removeAll(true);
    const xs = this.x(this.sigLine(this.n));
    const zone = this.add.rectangle(xs, AX.y - 150, AX.x1 - xs + 10, 300, C.ok, 0.08).setOrigin(0, 0.5);
    const line = this.add.graphics().lineStyle(2, C.ok, 0.9);
    for (let y = AX.y - 290; y < AX.y; y += 14) line.lineBetween(xs, y, xs, y + 7);
    const lab = this.add.text(xs + 6, AX.y - 292, `signifikant ab d = ${this.sigLine(this.n).toFixed(2)}`, txt(13, C.ok));
    this.threshold.add([zone, line, lab]);
    this.nText.setText(`Stichprobe: n = ${this.n} pro Gruppe`);
  }

  private async intro() {
    await this.say([
      { who: 'nia', text: 'Kapitänin Nia Power, sehr erfreut. In diesem Nebel ist das Signal schwach und das Rauschen laut.' },
      { who: 'nia', text: 'Jede Sonde ist eine Studie. Sie misst den Effekt und landet unten auf der Skala. Grün heißt: signifikant.' },
      { who: 'nia', text: 'Unsere Flotte nimmt traditionell 20 Personen pro Gruppe. Schauen wir, wie das läuft. Feuer!' },
    ]);
    await this.salvo(20, true);
    const sig = this.layer.list.filter((o) => o.getData('sig')) as Phaser.GameObjects.Image[];
    const meanSig = sig.length ? sig.reduce((s, o) => s + (o.getData('d') as number), 0) / sig.length : 0;
    this.showTruth();
    await this.say([
      { who: 'nia', text: `Nur ${sig.length} von 20 Sonden waren signifikant. Das ist eine Power von etwa ${Math.round(power(this.trueD, 20) * 100)} %.` },
      { who: 'nia', text: `Und schau auf die grünen Treffer: Im Schnitt messen sie d = ${meanSig.toFixed(2)}. Der wahre Effekt (grüne Linie) ist nur ${this.trueD}.` },
      { text: 'Das ist der Fluch des Gewinners: Kleine Studien werden nur signifikant, wenn sie zufällig übertreiben.' },
      { who: 'nia', text: 'Deine Mission: Finde eine Stichprobe mit mindestens 80 % Power, ohne Treibstoff zu verschwenden. Du hast 3 Testsalven.' },
    ]);
    this.truthLine?.setVisible(false);
    this.layer.removeAll(true);
    this.salvos = 0;
    this.salvoText.setText('Testsalven: 3');
    this.sl = slider(this, W / 2 - 220, 505, 440, 10, 300, 20, (v) => { this.n = v; this.drawThreshold(); }, { step: 5, color: C.cyan });
    this.fireBtn = button(this, 130, 505, 'Testsalve', () => this.testSalvo(), { w: 150, fill: C.blue });
    this.lockBtn = button(this, W - 130, 505, 'N festlegen', () => this.lock(), { w: 160, fill: C.violet });
  }

  private showTruth() {
    this.truthLine?.destroy();
    this.truthLine = this.add.graphics().lineStyle(4, C.gold, 1).lineBetween(this.x(this.trueD), AX.y - 300, this.x(this.trueD), AX.y);
    this.truthLine.setDepth(5);
  }

  private async testSalvo() {
    if (this.busy || this.salvos >= 3 || this.dialog.open || this.finished) return;
    this.salvos++;
    this.salvoText.setText(`Testsalven: ${3 - this.salvos}`);
    this.layer.removeAll(true);
    await this.salvo(this.n, false);
    if (this.salvos >= 3) this.fireBtn?.setAlpha(0.4);
  }

  private salvo(n: number, slowmo: boolean): Promise<void> {
    this.busy = true;
    audio.sfx('laser');
    const se = Math.sqrt(2 / n + (this.trueD * this.trueD) / (4 * n));
    const r = () => Math.random();
    const stacks = new Map<number, number>();
    let hits = 0;
    let landed = 0;
    return new Promise((resolve) => {
      for (let i = 0; i < 20; i++) {
        const d = this.trueD + normal(r) * se;
        const sig = d > this.sigLine(n);
        if (sig) hits++;
        const bx = Math.round(this.x(d) / 12);
        const stack = stacks.get(bx) ?? 0;
        stacks.set(bx, stack + 1);
        const probe = this.add.image(this.mothership.x, this.mothership.y + 30, 'spark').setScale(1.1).setTint(sig ? C.ok : 0x8c96c8).setBlendMode(Phaser.BlendModes.ADD);
        probe.setData({ sig, d });
        this.layer.add(probe);
        const tx = bx * 12;
        const ty = AX.y - 12 - stack * 14;
        this.tweens.add({
          targets: probe, x: tx, y: ty, delay: i * (slowmo ? 140 : 70), duration: 650, ease: 'Quad.in',
          onStart: () => audio.sfx('blip'),
          onComplete: () => {
            if (sig) { const ring = this.add.circle(tx, ty, 10).setStrokeStyle(2, C.ok); this.layer.add(ring); this.tweens.add({ targets: ring, scale: 2, alpha: 0, duration: 400 }); }
            if (++landed === 20) {
              this.statsText.setText(`Letzte Salve: ${hits}/20 signifikant  (n = ${n} pro Gruppe)`);
              this.busy = false;
              resolve();
            }
          },
        });
      }
    });
  }

  private async lock() {
    if (this.busy || this.dialog.open || this.finished) return;
    this.busy = true;
    this.sl?.setEnabled(false);
    this.fireBtn?.destroy();
    this.lockBtn?.destroy();
    const n80 = nFor(this.trueD);
    const pw = power(this.trueD, this.n);
    let score: number;
    if (pw < 0.8) score = Math.round(420 * (pw / 0.8));
    else score = Math.round(600 * Phaser.Math.Clamp(1 - ((this.n - n80) / n80) / (1.2 * state.diff.tolerance), 0.3, 1));
    await this.powerCurve(n80, pw);
    await this.say([
      { who: 'nia', text: pw >= 0.8 ? `Stark! ${Math.round(pw * 100)} % Power. Optimal wären ${n80} pro Gruppe gewesen.` : `Hm, nur ${Math.round(pw * 100)} % Power. Für 80 % bräuchten wir ${n80} pro Gruppe.` },
      { text: 'Vor jeder Studie hilft eine Power-Analyse, zum Beispiel mit G*Power oder dem R-Paket pwr.' },
    ]);
    const q1 = await choice(this, 'Wie hoch war die mittlere Power in den Neurowissenschaften laut Button et al. (2013)?', ['etwa 21 %', 'etwa 50 %', 'etwa 90 %'], 0,
      'Nur rund 21 %: Die meisten Studien hätten einen echten Effekt meist verpasst.');
    if (q1) score += 200;
    const q2 = await choice(this, 'Eine kleine Studie findet einen signifikanten, riesigen Effekt. Was ist am wahrscheinlichsten?', ['Der Effekt ist wirklich riesig', 'Der Effekt ist überschätzt (Winner’s Curse)', 'Die Studie ist besonders verlässlich'], 1);
    if (q2) score += 200;
    this.finish(score, 'Kleine Stichproben verpassen echte Effekte oder übertreiben sie. Plane N mit einer Power-Analyse.', 'nia');
  }

  private powerCurve(n80: number, pw: number): Promise<void> {
    const layer = this.add.container(0, 0).setDepth(500);
    layer.add(this.add.rectangle(0, 0, W, H, C.void, 0.9).setOrigin(0).setInteractive());
    layer.add(panel(this, 140, 70, 680, 380, C.cyan));
    layer.add(this.add.text(W / 2, 92, `Power-Kurve für d = ${this.trueD}`, txt(22, C.text)).setOrigin(0.5));
    const px = (n: number) => 200 + (n / 300) * 560;
    const py = (p: number) => 410 - p * 280;
    const g = this.add.graphics();
    layer.add(g);
    g.lineStyle(1, 0x3b4a8c, 1).strokeRect(200, 130, 560, 280);
    g.lineStyle(2, C.gold, 0.8).lineBetween(200, py(0.8), 760, py(0.8));
    layer.add(this.add.text(764, py(0.8), '80 %', txt(13, C.gold)).setOrigin(0, 0.5));
    layer.add(this.add.text(480, 420, 'n pro Gruppe', txt(13, C.dim)).setOrigin(0.5, 0));
    for (const n of [0, 100, 200, 300]) layer.add(this.add.text(px(n), 412, String(n), txt(11, C.dim)).setOrigin(0.5, 0));
    return new Promise((resolve) => {
      const pts: Phaser.Math.Vector2[] = [];
      for (let n = 5; n <= 300; n += 5) pts.push(new Phaser.Math.Vector2(px(n), py(power(this.trueD, n))));
      let i = 0;
      this.time.addEvent({
        delay: 20, repeat: pts.length - 2, callback: () => {
          g.lineStyle(4, C.cyan, 1).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
          i++;
          if (i === pts.length - 1) {
            const m = this.add.circle(px(this.n), py(pw), 9, pw >= 0.8 ? C.ok : C.sig).setStrokeStyle(3, 0xffffff);
            const opt = this.add.circle(px(n80), py(power(this.trueD, n80)), 6, C.gold);
            const lab = this.add.text(px(this.n), py(pw) - 26, `Du: n = ${this.n}`, txt(14, pw >= 0.8 ? C.ok : C.sig)).setOrigin(0.5);
            layer.add([opt, m, lab]);
            floatText(this, W / 2, 140, `${Math.round(pw * 100)} % Power`, pw >= 0.8 ? C.ok : C.sig, 28).setDepth(600);
            this.time.delayedCall(2200, () => { layer.destroy(); resolve(); });
          }
        },
      });
    });
  }

  get debugLock() { return (n: number) => { this.n = n; this.sl?.set(n); this.lock(); }; }
}

export { hex };
