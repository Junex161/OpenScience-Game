import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { button, C, H, hex, panel, txt, W } from '../ui/theme';
import { choice, floatText } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

interface Slot { label: string; good: string; bad: string }

const SLOTS: Slot[] = [
  { label: 'Hypothese', good: 'Viel Training erhöht den Wert in Test A', bad: 'Training wirkt irgendwie positiv' },
  { label: 'Stichprobe', good: 'n = 100 pro Gruppe (Power-Analyse)', bad: 'So viele, bis es klappt' },
  { label: 'Messung', good: 'Test A, Version 2, vorab festgelegt', bad: 'Der Test, der am besten aussieht' },
  { label: 'Analyse', good: 't-Test, einseitig, α = .05, Ausschluss > 3 SD', bad: 'Die passende Analyse später' },
];

const RESULTS: { text: string; confirm: boolean }[] = [
  { text: 'Test A, Viel vs. Kontrolle, t-Test: p = .18', confirm: true },
  { text: 'Nur Personen über 30 betrachtet: p = .03', confirm: false },
  { text: 'Test B statt Test A: p = .04', confirm: false },
  { text: 'Ausschluss > 3 SD angewendet: 2 Personen', confirm: true },
  { text: 'Interaktion mit Uhrzeit der Messung: p = .02', confirm: false },
  { text: 'Wenig Training vs. Kontrolle: p = .41', confirm: false },
];

/** Chapter 4: preregistration and registered reports. */
export class VaultScene extends ChapterScene {
  private score = 0;
  private picks: (boolean | null)[] = [];

  constructor() { super('vault'); }

  create() {
    this.score = 0;
    this.picks = SLOTS.map(() => null);
    this.chapterSetup('vault', 'Planet 4 · Zeitstempel-Tresor', 'vault', { nebula: ['nebula-violet'], tint: 0x161a33 });
    this.drawVaultBackdrop();
    this.time.delayedCall(400, () => this.run());
  }

  private drawVaultBackdrop() {
    const g = this.add.graphics().setDepth(-20);
    g.lineStyle(2, 0x3b4a8c, 0.4);
    for (let r = 60; r < 600; r += 60) g.strokeCircle(W / 2, H / 2 + 20, r);
    const gear = this.add.graphics({ x: W / 2, y: H / 2 + 20 }).setDepth(-19).setAlpha(0.25);
    gear.lineStyle(10, 0x8892b0, 1).strokeCircle(0, 0, 210);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      gear.fillStyle(0x8892b0, 1).fillRect(Math.cos(a) * 214 - 8, Math.sin(a) * 214 - 8, 16, 16);
    }
    this.tweens.add({ targets: gear, angle: 360, duration: 60000, repeat: -1 });
  }

  private async run() {
    await this.say([
      { who: 'tick', text: 'Tick, tack. Notar Tick, zu Diensten. In diesem Tresor werden Forschungspläne versiegelt, bevor es Daten gibt.' },
      { who: 'tick', text: 'Das nennt man Präregistrierung. Danach kann niemand mehr behaupten, er hätte das Ergebnis vorhergesagt, wenn er es nicht tat.' },
      { who: 'tick', text: 'Fülle die vier Fächer deines Plans. Wähle jeweils die Karte, die man später eindeutig überprüfen kann.' },
    ]);
    await this.planPhase();
    await this.sortPhase();
    await this.portals();
    await this.deviation();
    this.finish(this.score, 'Erst planen, dann schauen. Abweichungen sind erlaubt, wenn du sie offen berichtest.', 'tick');
  }

  // ---------- A: fill and seal the plan ----------

  private planPhase(): Promise<void> {
    return new Promise((resolve) => {
      const layer = this.add.container(0, 0);
      const cardObjs: Phaser.GameObjects.Container[][] = [];
      SLOTS.forEach((s, i) => {
        const y = 80 + i * 92;
        layer.add(panel(this, 40, y, 880, 80, 0x3b4a8c, 0.85));
        layer.add(this.add.text(60, y + 28, s.label, txt(18, C.gold)));
        const opts = Math.random() < 0.5 ? [true, false] : [false, true];
        cardObjs[i] = [];
        opts.forEach((good, k) => {
          const label = good ? s.good : s.bad;
          const c = this.card(220 + k * 350, y + 12, 330, 56, label, () => {
            this.picks[i] = good;
            audio.sfx('blip');
            cardObjs[i].forEach((o, kk) => this.paintCard(o, kk === k ? C.cyan : 0x3b4a8c, kk === k));
            if (this.picks.every((p) => p !== null)) sealBtn.setVisible(true);
          });
          cardObjs[i].push(c);
          layer.add(c);
        });
      });
      const sealBtn = button(this, W / 2, 470, '🔒 Plan versiegeln', async () => {
        if (this.dialog.open) return;
        sealBtn.destroy();
        const good = this.picks.filter((p) => p).length;
        this.score += good * 60;
        await this.seal(layer);
        if (good < 4) {
          await this.say([{ who: 'tick', text: `${4 - good} deiner Fächer sind vage. „Irgendwie“ und „später“ lassen wieder alle Wege offen. Merk dir: präzise = überprüfbar.` }]);
        } else await this.say([{ who: 'tick', text: 'Ausgezeichnet präzise! So ein Plan lässt sich hinterher Punkt für Punkt prüfen.' }]);
        resolve();
      }, { w: 260, fill: C.violet });
      sealBtn.setVisible(false);
      layer.add(sealBtn);
    });
  }

  private card(x: number, y: number, w: number, h: number, label: string, onClick: () => void) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const t = this.add.text(w / 2, h / 2, label, txt(15, C.text, { wordWrap: { width: w - 20 }, align: 'center' })).setOrigin(0.5);
    const z = this.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerdown', onClick);
    c.add([g, t, z]);
    c.setData({ w, h });
    this.paintCard(c, 0x3b4a8c, false);
    return c;
  }

  private paintCard(c: Phaser.GameObjects.Container, edge: number, on: boolean) {
    const g = c.list[0] as Phaser.GameObjects.Graphics;
    const { w, h } = c.data.values as { w: number; h: number };
    g.clear().fillStyle(on ? 0x1d3b6a : 0x1a2250, 1).fillRoundedRect(0, 0, w, h, 12).lineStyle(on ? 3 : 2, edge, 1).strokeRoundedRect(0, 0, w, h, 12);
  }

  private async seal(layer: Phaser.GameObjects.Container) {
    audio.sfx('whoosh');
    this.tweens.add({ targets: layer, scale: 0.2, x: W / 2 - 0.2 * W / 2, y: H / 2 - 0.2 * H / 2, alpha: 0, duration: 700, ease: 'Cubic.in' });
    await this.wait(650);
    layer.destroy();
    // vault door
    const door = this.add.container(W / 2, H / 2);
    const g = this.add.graphics();
    g.fillStyle(0x8892b0, 1).fillCircle(0, 0, 130);
    g.fillStyle(0x5a6488, 1).fillCircle(0, 0, 110);
    g.lineStyle(8, 0xc0c8e8, 1).strokeCircle(0, 0, 70);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineStyle(10, 0xc0c8e8, 1).lineBetween(0, 0, Math.cos(a) * 70, Math.sin(a) * 70); }
    g.fillStyle(C.gold, 1).fillCircle(0, 0, 16);
    door.add(g).setScale(0);
    this.tweens.add({ targets: door, scale: 1, duration: 400, ease: 'Back.out' });
    this.tweens.add({ targets: door, angle: 270, delay: 400, duration: 900, ease: 'Cubic.inOut' });
    await this.wait(1300);
    audio.sfx('stamp');
    this.cameras.main.shake(150, 0.006);
    const now = new Date();
    const hash = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const stamp = this.add.text(W / 2, H / 2 + 160, `VERSIEGELT · ${now.toISOString().slice(0, 19).replace('T', ' ')} UTC · #${hash}`, txt(18, C.gold)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: stamp, alpha: 1, duration: 300 });
    await this.wait(1600);
    this.tweens.add({ targets: [door, stamp], alpha: 0, duration: 400, onComplete: () => { door.destroy(); stamp.destroy(); } });
    await this.wait(400);
  }

  // ---------- B: confirmatory vs exploratory ----------

  private async sortPhase() {
    await this.say([
      { who: 'tick', text: 'Die Daten sind da! Jetzt kommen die Ergebnisse. Sortiere: Stand das so im Plan (konfirmatorisch) oder nicht (explorativ)?' },
      { text: 'Exploratives ist nicht verboten. Es muss nur als exploratorisch gekennzeichnet sein. Pfeiltasten oder Klick.' },
    ]);
    const perCard = 7000 * state.diff.time;
    const left = button(this, 210, 450, '◀ Konfirmatorisch', () => answer(true), { w: 260, fill: C.blue });
    const right = button(this, W - 210, 450, 'Explorativ ▶', () => answer(false), { w: 260, fill: 0xb5179e });
    const kb = this.input.keyboard!;
    let answer: (c: boolean) => void = () => {};
    const onL = () => answer(true);
    const onR = () => answer(false);
    kb.on('keydown-LEFT', onL);
    kb.on('keydown-RIGHT', onR);
    kb.on('keydown-A', onL);
    kb.on('keydown-D', onR);
    const order = Phaser.Utils.Array.Shuffle([...RESULTS]);
    for (const r of order) {
      const c = this.add.container(W / 2, 230).setScale(0.5).setAlpha(0);
      const g = panel(this, -230, -70, 460, 140, C.gold);
      const t = this.add.text(0, -6, r.text, txt(21, C.text, { wordWrap: { width: 400 }, align: 'center' })).setOrigin(0.5);
      const bar = this.add.rectangle(-210, 52, 420, 6, C.gold).setOrigin(0, 0.5);
      c.add([g, t, bar]);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 250, ease: 'Back.out' });
      this.tweens.add({ targets: bar, scaleX: 0, duration: perCard });
      const picked = await new Promise<boolean | null>((res) => {
        const timer = this.time.delayedCall(perCard, () => res(null));
        answer = (v) => { timer.remove(); res(v); };
      });
      answer = () => {};
      const ok = picked === r.confirm;
      if (ok) { this.score += 60; audio.sfx('coin'); floatText(this, W / 2, 140, '+60', C.ok); } else { audio.sfx('fail'); floatText(this, W / 2, 140, r.confirm ? 'war im Plan' : 'stand nicht im Plan', C.sig, 18); }
      this.tweens.add({ targets: c, x: (picked ?? r.confirm) ? -200 : W + 200, angle: (picked ?? r.confirm) ? -20 : 20, alpha: 0, duration: 350, onComplete: () => c.destroy() });
      await this.wait(500);
    }
    kb.off('keydown-LEFT', onL);
    kb.off('keydown-RIGHT', onR);
    kb.off('keydown-A', onL);
    kb.off('keydown-D', onR);
    left.destroy();
    right.destroy();
  }

  // ---------- C: registered reports vs. standard articles ----------

  private async portals() {
    await this.say([
      { who: 'tick', text: 'Noch stärker als Präregistrierung: Registered Reports. Das Journal prüft deinen Plan, BEVOR es Daten gibt.' },
      { who: 'tick', text: 'Ist der Plan gut, wird der Artikel angenommen, egal was herauskommt. Schau, was das mit der Literatur macht.' },
    ]);
    const layer = this.add.container(0, 0);
    const mk = (x: number, label: string, color: number) => {
      const glow = this.add.image(x, 250, 'glow').setScale(2.6).setTint(color).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
      const ring = this.add.ellipse(x, 250, 170, 220).setStrokeStyle(6, color);
      this.tweens.add({ targets: ring, scaleX: 1.05, scaleY: 0.97, duration: 700, yoyo: true, repeat: -1 });
      const t = this.add.text(x, 100, label, txt(19, color)).setOrigin(0.5);
      const pct = this.add.text(x, 395, '0 %', txt(38, C.text)).setOrigin(0.5);
      const sub = this.add.text(x, 430, 'positive Ergebnisse', txt(14, C.dim)).setOrigin(0.5);
      layer.add([glow, ring, t, pct, sub]);
      return pct;
    };
    const p1 = mk(W / 2 - 220, 'Klassische Artikel', C.gold);
    const p2 = mk(W / 2 + 220, 'Registered Reports', C.cyan);
    const run = (x: number, rate: number, pct: Phaser.GameObjects.Text) => new Promise<void>((res) => {
      let pos = 0;
      for (let i = 0; i < 50; i++) {
        const positive = i < Math.round(rate * 50);
        const paper = this.add.rectangle(x + Phaser.Math.Between(-300, 300), -20, 14, 18, positive ? C.gold : 0x8c96c8).setAngle(Phaser.Math.Between(-30, 30));
        layer.add(paper);
        this.tweens.add({
          targets: paper, x, y: 250, scale: 0.2, angle: 360, delay: Phaser.Math.Between(0, 2200), duration: 700, ease: 'Quad.in',
          onComplete: () => { paper.destroy(); if (positive) pos++; pct.setText(`${Math.round((pos / 50) * 100)} %`); },
        });
      }
      this.time.delayedCall(3200, () => { pct.setText(`${Math.round(rate * 100)} %`); res(); });
    });
    await Promise.all([run(W / 2 - 220, 0.96, p1), run(W / 2 + 220, 0.44, p2)]);
    layer.add(this.add.text(W / 2, 470, 'Scheel, Schijen & Lakens (2021): 96 % vs. 44 % positive Ergebnisse', txt(14, C.dim)).setOrigin(0.5));
    await this.say([{ who: 'tick', text: 'Bei Registered Reports sind nur 44 % der Hypothesen bestätigt. Das ist viel ehrlicher. Die 96 % sind zu schön, um wahr zu sein.' }]);
    layer.destroy();
  }

  // ---------- D: a deviation from the plan ----------

  private async deviation() {
    await this.say([{ who: 'tick', text: 'Oh. Ein Funkspruch: Wegen eines Meteoritenschauers kamen nur 85 statt 100 Personen pro Gruppe.' }]);
    const ok = await choice(this, 'Was machst du mit der Abweichung vom Plan?', ['Verschweigen, merkt eh keiner', 'Im Artikel offen als Abweichung berichten und begründen', 'Die fehlenden Daten schätzen und dazuerfinden'], 1,
      'Abweichungen passieren. Transparent berichten ist genau der Sinn der Präregistrierung.');
    if (ok) this.score += 120;
    const q = await choice(this, 'Darfst du nach einer Präregistrierung noch Analysen machen, die nicht im Plan standen?', ['Nein, nie', 'Ja, wenn sie klar als explorativ gekennzeichnet sind', 'Ja, und man nennt sie konfirmatorisch'], 1);
    if (q) this.score += 160;
  }
}

export { hex };
