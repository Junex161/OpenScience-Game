import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { allChoices, analyse, Choices, Comparison, falsePositiveRates, findPlayableStudy, Measure, PLANNED, Study } from '../stats/forking';
import { button, C, H, hex, panel, txt, W } from '../ui/theme';
import { choice, floatText, slider } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const PLOT = { x0: 34, x1: 466, y0: 78, y1: 300 };
const RIGHT_X = 500;

type RowKey = 'measure' | 'comparison' | 'outliers' | 'more';
const key = (c: Choices) => `${c.measure}|${c.comparison}|${c.removeOutliers}|${c.moreData}`;
const QRP: Record<RowKey, string> = {
  measure: 'Selektives Berichten', comparison: 'Cherry-Picking', outliers: 'Flexible Ausschlüsse', more: 'Optional Stopping',
};
const TREAT: Record<Comparison, string> = { low: 'Wenig Training', high: 'Viel Training', both: 'Beide Trainings' };

/** Chapter 1: p-hacking in the garden of forking paths. */
export class ForgeScene extends ChapterScene {
  private study!: Study;
  private choices: Choices = { ...PLANNED };
  private tried = new Map<string, number>();
  private plotLayer!: Phaser.GameObjects.Container;
  private pText!: Phaser.GameObjects.Text;
  private needle!: Phaser.GameObjects.Triangle;
  private triedText!: Phaser.GameObjects.Text;
  private tree!: Phaser.GameObjects.Graphics;
  private seg: Record<string, { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; value: string; w: number }[]> = {};
  private tags: Partial<Record<RowKey, Phaser.GameObjects.Container>> = {};
  private submitBtn!: Phaser.GameObjects.Container;
  private lockText!: Phaser.GameObjects.Text;
  private interactive = false;
  private submitted = false;
  private score = 0;

  constructor() { super('forge'); }

  create() {
    this.choices = { ...PLANNED };
    this.tried = new Map();
    this.seg = {};
    this.tags = {};
    this.interactive = false;
    this.submitted = false;
    this.score = 0;
    this.study = findPlayableStudy(7 + Math.floor(Math.random() * 50)).study;
    this.chapterSetup('forge', 'Planet 1 · Schmiede Kepler-p', 'forge', { nebula: ['nebula-ember'], tint: 0x2a0f1e });
    // lava glow at the bottom
    this.add.image(W / 2, H + 120, 'glow').setScale(10, 3).setTint(0xff6b35).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);

    panel(this, PLOT.x0 - 14, PLOT.y0 - 20, PLOT.x1 - PLOT.x0 + 28, PLOT.y1 - PLOT.y0 + 56, 0xff6b35);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x3b4a8c, 0.6);
    for (let v = -2; v <= 2; v++) grid.lineBetween(PLOT.x0 + 26, this.yOf(v), PLOT.x1, this.yOf(v));
    this.add.text(PLOT.x0 + 2, this.yOf(0) - 8, '0', txt(12, C.dim));
    this.add.text(PLOT.x0 + 2, PLOT.y0 - 14, 'IQ-Test (z)', txt(11, C.dim));
    this.plotLayer = this.add.container(0, 0);
    panel(this, PLOT.x0 - 14, 352, PLOT.x1 - PLOT.x0 + 28, 176, 0x3b4a8c);
    this.add.text(PLOT.x0, 360, 'Garten der Pfadgabelungen', txt(14, C.gold));
    this.tree = this.add.graphics();
    this.drawRight();
    this.refresh(false);
    this.time.delayedCall(450, () => this.intro());
  }

  private async intro() {
    await this.say([
      { who: 'glanz', text: 'Ah, Verstärkung! Ich bin Dr. Glanz. Mein Förderantrag läuft Freitag aus. Ich brauche ein Ergebnis!' },
      { who: 'glanz', text: 'Studie: Macht unser Lerntraining schlauer? Drei Gruppen, je 20 Personen. Geplanter Test: Beide Trainings gegen Kontrolle.' },
      { who: 'journal', text: 'Wir drucken nur Ergebnisse mit p < .05. Glänzende, bitte.' },
      { who: 'glanz', text: 'Unser p ist leider weit drüber. Aber man kann die Daten ja auch … anders auswerten. Probier die Regler!' },
    ]);
    this.interactive = true;
  }

  private yOf(v: number) {
    const t = (Phaser.Math.Clamp(v, -3, 3) + 3) / 6;
    return PLOT.y1 - t * (PLOT.y1 - PLOT.y0);
  }

  private gaugeT(p: number) { return Phaser.Math.Clamp(-Math.log10(Math.max(p, 1e-3)) / 3, 0, 1); }

  private drawRight() {
    panel(this, RIGHT_X - 10, 58, W - RIGHT_X - 10, 470, 0xff6b35);
    this.pText = this.add.text(RIGHT_X + 10, 64, 'p = ', txt(46, C.text));
    const gx = RIGHT_X + 14;
    const gw = 410;
    const gy = 136;
    const g = this.add.graphics();
    g.fillStyle(0x26305f, 1).fillRoundedRect(gx, gy, gw, 14, 7);
    const thr = gx + this.gaugeT(0.05) * gw;
    g.fillStyle(C.sig, 0.35).fillRoundedRect(thr, gy, gx + gw - thr, 14, { tl: 0, bl: 0, tr: 7, br: 7 });
    g.lineStyle(3, C.sig, 1).lineBetween(thr, gy - 6, thr, gy + 20);
    this.add.text(thr, gy + 20, '.05', txt(12, C.sig)).setOrigin(0.5, 0);
    this.add.text(gx, gy + 20, '1', txt(12, C.dim));
    this.add.text(gx + gw, gy + 20, '.001', txt(12, C.dim)).setOrigin(1, 0);
    this.needle = this.add.triangle(gx, gy - 3, 0, 0, 16, 0, 8, 12, 0xffffff).setOrigin(0.5, 1);
    this.needle.setData({ gx, gw });

    const rows: { key: RowKey; label: string; options: [string, string][] }[] = [
      { key: 'measure', label: 'Messung', options: [['Test A', 'dv1'], ['Test B', 'dv2'], ['Mittelwert', 'avg']] },
      { key: 'comparison', label: 'Vergleich', options: [['Beide', 'both'], ['Wenig', 'low'], ['Viel', 'high']] },
      { key: 'outliers', label: 'Ausreißer', options: [['behalten', 'false'], ['entfernen', 'true']] },
      { key: 'more', label: 'Stichprobe', options: [['20 / Gruppe', 'false'], ['+10 nacherheben', 'true']] },
    ];
    rows.forEach((r, i) => {
      const y = 200 + i * 54;
      this.add.text(RIGHT_X + 14, y - 22, r.label, txt(13, C.dim));
      let x = RIGHT_X + 14;
      this.seg[r.key] = [];
      for (const [lab, val] of r.options) {
        const g2 = this.add.graphics().setPosition(x, y);
        const t = this.add.text(0, 0, lab, txt(15, C.text)).setOrigin(0.5);
        const w = Math.max(84, t.width + 24);
        t.setPosition(x + w / 2, y + 14);
        const z = this.add.zone(x + w / 2, y + 14, w, 30).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => this.choose(r.key, val));
        this.seg[r.key].push({ g: g2, t, value: val, w });
        x += w + 6;
      }
    });
    this.triedText = this.add.text(RIGHT_X + 14, 418, '', txt(14, C.text));
    this.lockText = this.add.text(RIGHT_X + 14, 478, '🔒 Journal: nur p < .05', txt(15, C.dim)).setOrigin(0, 0.5);
    this.submitBtn = button(this, 840, 478, 'Einreichen!', () => this.submit(), { w: 160, fill: C.sig }).setVisible(false);
  }

  private value(row: RowKey) {
    const c = this.choices;
    return row === 'measure' ? c.measure : row === 'comparison' ? c.comparison : row === 'outliers' ? String(c.removeOutliers) : String(c.moreData);
  }

  private choose(row: RowKey, value: string) {
    if (!this.interactive || this.dialog.open || this.submitted) return;
    if (this.value(row) === value) return;
    audio.sfx('blip');
    if (row === 'measure') this.choices.measure = value as Measure;
    if (row === 'comparison') this.choices.comparison = value as Comparison;
    if (row === 'outliers') this.choices.removeOutliers = value === 'true';
    if (row === 'more') this.choices.moreData = value === 'true';
    this.refresh(true);
  }

  private refresh(animate: boolean) {
    const res = analyse(this.study, this.choices);
    this.tried.set(key(this.choices), res.p);
    this.drawPlot(res, animate);
    this.drawTree();
    const sig = res.p < 0.05;
    this.pText.setText(`p = ${res.p.toFixed(3).replace(/^0/, '')}`).setColor(hex(sig ? C.sig : C.text));
    if (animate) this.tweens.add({ targets: this.pText, scale: { from: 1.15, to: 1 }, duration: 220 });
    const { gx, gw } = this.needle.data.values as { gx: number; gw: number };
    this.tweens.add({ targets: this.needle, x: gx + this.gaugeT(res.p) * gw, duration: animate ? 500 : 0, ease: 'Back.out' });
    for (const [row, btns] of Object.entries(this.seg)) {
      for (const b of btns) {
        const on = this.value(row as RowKey) === b.value;
        b.g.clear().fillStyle(on ? 0xff6b35 : 0x1a2250, 1).fillRoundedRect(0, 0, b.w, 30, 10).lineStyle(2, on ? 0xffb38a : 0x3b4a8c, 1).strokeRoundedRect(0, 0, b.w, 30, 10);
        b.t.setColor(hex(on ? 0xffffff : C.text));
      }
    }
    (['measure', 'comparison', 'outliers', 'more'] as RowKey[]).forEach((row, i) => {
      const planned = row === 'measure' ? 'dv1' : row === 'comparison' ? 'both' : 'false';
      const off = this.value(row) !== planned;
      if (off && !this.tags[row]) {
        const t = this.add.text(0, 0, QRP[row], txt(12, 0xffffff)).setOrigin(0.5);
        const bg = this.add.graphics().fillStyle(C.sig, 1).fillRoundedRect(-t.width / 2 - 8, -10, t.width + 16, 20, 10);
        const c = this.add.container(W - 34 - t.width / 2 - 8, 200 + i * 54 - 14, [bg, t]).setScale(0);
        this.tweens.add({ targets: c, scale: 1, duration: 250, ease: 'Back.out' });
        this.tags[row] = c;
      } else if (!off && this.tags[row]) {
        const c = this.tags[row]!;
        this.tweens.add({ targets: c, scale: 0, duration: 150, onComplete: () => c.destroy() });
        delete this.tags[row];
      }
    });
    this.triedText.setText(`Ausprobierte Wege: ${this.tried.size} / 36`);
    this.submitBtn.setVisible(sig && !this.submitted);
    this.lockText.setVisible(!sig && !this.submitted);
    if (sig && animate && !this.submitted) {
      this.tweens.add({ targets: this.submitBtn, scale: { from: 0.6, to: 1 }, duration: 300, ease: 'Back.out' });
      this.cameras.main.flash(150, 255, 120, 160);
      audio.sfx('coin');
    }
  }

  private drawPlot(res: ReturnType<typeof analyse>, animate: boolean) {
    this.plotLayer.removeAll(true);
    const cols = [
      { x: 150, label: 'Kontrolle', vals: res.control, dropped: res.droppedControl, color: 0x8c96c8 },
      { x: 360, label: TREAT[this.choices.comparison], vals: res.treatment, dropped: res.droppedTreatment, color: C.cyan },
    ];
    for (const col of cols) {
      this.plotLayer.add(this.add.text(col.x, PLOT.y1 + 18, col.label, txt(14, C.text)).setOrigin(0.5));
      const r = new Phaser.Math.RandomDataGenerator([col.label]);
      col.vals.forEach((v, i) => {
        const d = this.add.image(col.x + r.between(-58, 58), this.yOf(v), 'dot').setScale(0.75).setTint(col.color).setBlendMode(Phaser.BlendModes.ADD);
        if (animate) { d.setScale(0); this.tweens.add({ targets: d, scale: 0.75, delay: i * 4, duration: 200 }); }
        this.plotLayer.add(d);
      });
      for (const v of col.dropped) {
        const x = this.add.text(col.x + r.between(-58, 58), this.yOf(v), '✕', txt(16, C.sig)).setOrigin(0.5).setAlpha(0.6);
        this.plotLayer.add(x);
      }
      const m = col.vals.reduce((s, v) => s + v, 0) / col.vals.length;
      const bar = this.add.rectangle(col.x, this.yOf(m), 150, 5, col.color).setOrigin(0.5);
      if (animate) { bar.setScale(0, 1); this.tweens.add({ targets: bar, scaleX: 1, duration: 300, ease: 'Cubic.out' }); }
      this.plotLayer.add(bar);
    }
  }

  private drawTree(revealAll = false) {
    const g = this.tree.clear();
    const leafY = 505;
    const levels = [388, 418, 448, 476];
    const leaves = allChoices();
    const xLeaf = (i: number) => PLOT.x0 + 10 + i * ((PLOT.x1 - PLOT.x0 - 20) / 35);
    const nodeX = (depth: number, idx: number) => {
      const span = [36, 12, 4, 2][depth];
      let s = 0;
      for (let k = idx * span; k < (idx + 1) * span; k++) s += xLeaf(k);
      return s / span;
    };
    const curIdx = leaves.findIndex((c) => key(c) === key(this.choices));
    const counts = [1, 3, 9, 18];
    for (let d = 0; d < 4; d++) {
      const childSpan = [12, 4, 2, 1][d];
      const nChildren = d < 2 ? 3 : 2;
      for (let p = 0; p < counts[d]; p++) {
        const px = nodeX(d, p);
        for (let c = 0; c < nChildren; c++) {
          const ci = p * nChildren + c;
          const cx = d === 3 ? xLeaf(ci) : nodeX(d + 1, ci);
          const cy = d === 3 ? leafY : levels[d + 1];
          const onPath = Math.floor(curIdx / childSpan) === ci;
          g.lineStyle(onPath ? 4 : 1.5, onPath ? C.gold : 0x3b4a8c, 1).lineBetween(px, levels[d], cx, cy);
        }
      }
    }
    leaves.forEach((c, i) => {
      const p = revealAll ? analyse(this.study, c).p : this.tried.get(key(c));
      const color = p === undefined ? 0x1a2250 : p < 0.05 ? C.sig : 0xdfe7ff;
      g.fillStyle(color, 1).fillCircle(xLeaf(i), leafY, 5);
      g.lineStyle(2, i === curIdx ? C.gold : 0x3b4a8c, 1).strokeCircle(xLeaf(i), leafY, 5);
    });
  }

  private async submit() {
    if (this.submitted || this.dialog.open) return;
    this.submitted = true;
    this.submitBtn.setVisible(false);
    audio.sfx('stamp');
    const stamp = this.add.text(W / 2, H / 2 - 40, 'ANGENOMMEN', txt(72, C.sig, { stroke: '#ffffff', strokeThickness: 8 }))
      .setOrigin(0.5).setAngle(-12).setScale(3).setAlpha(0).setDepth(500);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 260, ease: 'Quad.in', onComplete: () => this.cameras.main.shake(180, 0.01) });
    const conf = this.add.particles(W / 2, H / 2 - 40, 'spark', { speed: { min: 150, max: 420 }, lifespan: 1400, gravityY: 300, scale: { start: 0.6, end: 0 }, tint: [C.gold, C.magenta, C.cyan], emitting: false }).setDepth(499);
    conf.explode(80);
    await this.wait(1600);
    this.tweens.add({ targets: stamp, alpha: 0, duration: 400 });
    await this.say([
      { who: 'glanz', text: 'JA! Publiziert! „Lerntraining macht schlauer“! Ich bin gerettet!' },
      { text: 'Moment. Ich muss was gestehen: Ich habe diese Daten simuliert. Alle drei Gruppen kommen aus derselben Verteilung.' },
      { text: 'Es gibt also keinen Effekt. Gar keinen. Und trotzdem hat einer der Wege „funktioniert“.' },
    ]);
    this.drawTree(true);
    const hits = allChoices().filter((c) => analyse(this.study, c).p < 0.05).length;
    const note = this.add.text((PLOT.x0 + PLOT.x1) / 2, 523, `${hits} von 36 Wegen führen zu p < .05`, txt(14, C.gold)).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: note, scale: 1, duration: 300, ease: 'Back.out' });
    await this.wait(800);
    await this.predict();
  }

  /** The player estimates the false-positive rate before seeing the simulation. */
  private async predict() {
    const layer = this.add.container(0, 0).setDepth(600);
    const bg = this.add.rectangle(0, 0, W, H, C.void, 0.95).setOrigin(0).setInteractive();
    layer.add(bg);
    layer.add(this.add.text(W / 2, 70, 'Stell dir 200 Studien vor, alle ohne echten Effekt.', txt(24, C.text)).setOrigin(0.5));
    layer.add(this.add.text(W / 2, 108, 'Wie viel Prozent werden „signifikant“, wenn man alle 36 Wege ausprobieren darf?', txt(17, C.dim)).setOrigin(0.5));
    let guess = 20;
    const val = this.add.text(W / 2, 190, '20 %', txt(54, C.gold)).setOrigin(0.5);
    layer.add(val);
    const s = slider(this, W / 2 - 250, 260, 500, 0, 100, 20, (v) => { guess = v; val.setText(`${v} %`); }, { step: 1, color: C.gold });
    layer.add(s.objs);
    layer.add(this.add.text(W / 2 - 250, 280, '0 %', txt(13, C.dim)));
    layer.add(this.add.text(W / 2 + 250, 280, '100 %', txt(13, C.dim)).setOrigin(1, 0));
    await new Promise<void>((resolve) => {
      layer.add(button(this, W / 2, 340, 'Tipp abgeben', () => resolve(), { w: 220, fill: C.violet }));
    });
    s.setEnabled(false);
    layer.destroy();
    const sim = await this.simulation();
    const err = Math.abs(guess - sim.hacked * 100);
    const tol = 40 * state.diff.tolerance;
    const pts = Math.round(500 * Phaser.Math.Clamp(1 - err / tol, 0, 1));
    this.score += pts;
    floatText(this, W / 2, 380, `Dein Tipp: ${guess} %  ·  +${pts}`, C.gold, 24).setDepth(700);
    await this.wait(1200);
    await this.say([
      { who: 'glanz', text: 'Oh nein. Ich wollte doch nur meinen Job behalten …' },
      { text: 'Genau das ist der Punkt: Niemand hier ist böse. Druck und flexible Entscheidungen reichen schon.' },
      { text: 'Das Gegenmittel: vorher festlegen, was du misst und wie du auswertest. Mehr dazu im Zeitstempel-Tresor!' },
    ]);
    const q1 = await choice(this, 'Glanz erhebt 10 Personen nach, weil p = .07 war. Wie heißt das?', ['HARKing', 'Optional Stopping', 'Präregistrierung'], 1,
      'Optional Stopping: so lange Daten sammeln, bis p < .05 ist.');
    if (q1) this.score += 250;
    const q2 = await choice(this, 'Nach den Ergebnissen schreibt Glanz: „Wie erwartet wirkt nur viel Training.“ Was ist das?', ['Replikation', 'Open Data', 'HARKing: Hypothese nachträglich erfunden'], 2,
      'HARKing = Hypothesizing After the Results are Known.');
    if (q2) this.score += 250;
    this.finish(this.score, 'Mit genug Wegen wird fast alles „signifikant“. Ein fester Plan schützt davor.');
  }

  private async simulation() {
    const layer = this.add.container(0, 0).setDepth(600);
    const bg = this.add.rectangle(0, 0, W, H, C.void, 0.97).setOrigin(0).setInteractive();
    layer.add(bg);
    layer.add(this.add.text(W / 2, 40, '200 Studien ohne echten Effekt', txt(28, C.text)).setOrigin(0.5));
    const sim = falsePositiveRates(200, 42);
    const grids = [
      { x: 60, label: 'Ein Plan, vorher festgelegt', pick: (s: { planned: boolean }) => s.planned },
      { x: 520, label: 'Alle 36 Wege erlaubt', pick: (s: { hacked: boolean }) => s.hacked },
    ];
    const cell = 19;
    let done = 0;
    await new Promise<void>((resolve) => {
      for (const gd of grids) {
        layer.add(this.add.text(gd.x + 190, 88, gd.label, txt(18, C.warn)).setOrigin(0.5));
        const pct = this.add.text(gd.x + 190, 330, '0 %', txt(40, C.text)).setOrigin(0.5);
        layer.add([pct, this.add.text(gd.x + 190, 365, 'falsch-positiv', txt(15, C.dim)).setOrigin(0.5)]);
        let count = 0;
        sim.perStudy.forEach((s, i) => {
          const hit = gd.pick(s);
          const sq = this.add.rectangle(gd.x + (i % 20) * cell + cell / 2, 112 + Math.floor(i / 20) * cell + cell / 2, cell - 4, cell - 4, hit ? C.sig : 0x26305f).setScale(0);
          layer.add(sq);
          this.tweens.add({
            targets: sq, scale: 1, delay: i * 11, duration: 160, ease: 'Back.out',
            onStart: () => { if (hit) { count++; pct.setText(`${Math.round((count / 200) * 100)} %`); if (count > 20) pct.setColor(hex(C.sig)); } },
            onComplete: () => { if (++done === 400) resolve(); },
          });
        });
      }
    });
    layer.add(this.add.text(W / 2, 410, 'Simmons, Nelson & Simonsohn (2011) fanden mit vier solchen Freiheiten bis zu 61 %.', txt(15, C.dim)).setOrigin(0.5));
    await this.wait(1600);
    this.time.delayedCall(2600, () => layer.destroy());
    return sim;
  }
}
