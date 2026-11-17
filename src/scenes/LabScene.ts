import Phaser from 'phaser';
import { audio } from '../core/audio';
import { button, C, H, hex, panel, txt, W } from '../ui/theme';
import { choice, floatText } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const COLS: { name: string; identifying: boolean; why: string }[] = [
  { name: 'Name', identifying: true, why: 'direkt identifizierend' },
  { name: 'E-Mail', identifying: true, why: 'direkt identifizierend' },
  { name: 'Geburtsdatum', identifying: true, why: 'mit PLZ fast eindeutig' },
  { name: 'PLZ', identifying: true, why: 'Quasi-Identifikator' },
  { name: 'Alter', identifying: false, why: 'für die Analyse nötig' },
  { name: 'Gruppe', identifying: false, why: 'für die Analyse nötig' },
  { name: 'Score', identifying: false, why: 'für die Analyse nötig' },
];

const ROWS = [
  ['Zorb Kalla', 'zorb@nebula.space', '12.03.2401', '40213', '27', 'Viel', '104'],
  ['Mira Tov', 'mira@orbit.ac', '01.11.2398', '40227', '30', 'Kontrolle', '97'],
  ['Quen Odo', 'quen@ring7.org', '23.07.2405', '45127', '23', 'Wenig', '101'],
  ['Lysa Fenn', 'lysa@moon.edu', '09.09.2400', '44135', '28', 'Viel', '112'],
  ['Brix Halo', 'brix@halo.net', '30.01.2397', '40210', '31', 'Kontrolle', '93'],
];

const LOCKS: { letter: string; title: string; options: string[]; correct: number; explain: string }[] = [
  { letter: 'F', title: 'Findable: Wie findet man die Daten?', options: ['Link auf meinen Laptop', 'Dauerhafte DOI im Repositorium', 'Ein USB-Stick in der Schublade'], correct: 1, explain: 'Eine DOI ist ein dauerhafter Identifikator.' },
  { letter: 'A', title: 'Accessible: Wie kommt man ran?', options: ['Offen im Repositorium mit Lizenz CC-BY', '„Auf Anfrage“ per Mail', 'Nur gegen Bezahlung'], correct: 0, explain: '„Auf Anfrage“ klappt erschreckend oft nicht.' },
  { letter: 'I', title: 'Interoperable: In welchem Format?', options: ['Proprietäres .xyz-Format', 'Screenshot der Tabelle', 'CSV plus Codebuch'], correct: 2, explain: 'Offene Formate kann jede Software lesen.' },
  { letter: 'R', title: 'Reusable: Was liegt noch dabei?', options: ['README, Lizenz und kommentiertes Analyse-Skript', 'Nichts, die Daten sprechen für sich', 'Ein Foto vom Whiteboard'], correct: 0, explain: 'Mit Doku und Code lässt sich alles nachrechnen.' },
];

/** Chapter 5: open data, anonymisation, FAIR and computational reproducibility. */
export class LabScene extends ChapterScene {
  private score = 0;
  private fairOk = 0;

  constructor() { super('lab'); }

  create() {
    this.score = 0;
    this.fairOk = 0;
    this.chapterSetup('lab', 'Planet 5 · Offenes Labor', 'lab', { nebula: ['nebula-teal'], tint: 0x0b2a2a });
    // bubbles rising from the ocean planet
    this.add.particles(0, H + 10, 'spark', {
      x: { min: 0, max: W }, speedY: { min: -60, max: -25 }, lifespan: 9000, scale: { min: 0.2, max: 0.6 }, alpha: { start: 0.5, end: 0 },
      tint: [C.ok, C.cyan], blendMode: 'ADD', frequency: 220,
    }).setDepth(-50);
    this.time.delayedCall(400, () => this.run());
  }

  private async run() {
    await this.say([
      { who: 'fair', text: 'Blubb! Prof. Fair hier. Vier Arme, vier Prinzipien: F, A, I, R. Ich kümmere mich um geteilte Daten.' },
      { who: 'fair', text: 'Andere können deine Studie nur prüfen, wenn sie an Daten, Materialien und Code kommen. Aber zuerst: Datenschutz!' },
      { who: 'fair', text: 'Klicke die Spalten an, die vor dem Hochladen raus müssen. Was die Analyse braucht, bleibt drin.' },
    ]);
    await this.anonymise();
    await this.say([{ who: 'fair', text: 'Jetzt der Datencontainer. Er hat vier Schlösser. Öffne sie mit den richtigen Entscheidungen.' }]);
    await this.fairLocks();
    await this.reproduce();
    const q1 = await choice(this, 'Warum braucht eine direkte Replikation Open Materials?', ['Damit andere genau dieselben Fragebögen und Stimuli nutzen können', 'Damit die Studie schöner aussieht', 'Braucht sie nicht'], 0);
    if (q1) this.score += 175;
    const q2 = await choice(this, 'Was bedeutet die Lizenz CC-BY?', ['Niemand darf die Daten nutzen', 'Alle dürfen nutzen, wenn sie dich als Quelle nennen', 'Nur gegen Geld'], 1,
      'CC-BY: Namensnennung. CC0: komplett frei, ohne Bedingungen.');
    if (q2) this.score += 175;
    this.finish(this.score, 'Geteilte Daten, Materialien und Code machen Forschung prüfbar. Anonym, FAIR und mit Lizenz.', 'fair');
  }

  // ---------- A: anonymise the data table ----------

  private anonymise(): Promise<void> {
    return new Promise((resolve) => {
      const layer = this.add.container(0, 0);
      layer.add(panel(this, 30, 60, 900, 370, C.ok));
      const colW = [140, 180, 130, 90, 80, 120, 80];
      const removed = new Set<number>();
      let x = 50;
      const colObjs: Phaser.GameObjects.GameObject[][] = [];
      COLS.forEach((col, ci) => {
        const w = colW[ci];
        const objs: Phaser.GameObjects.GameObject[] = [];
        const head = this.add.rectangle(x, 80, w - 6, 40, 0x1d3b6a).setOrigin(0).setStrokeStyle(2, C.cyan).setInteractive({ useHandCursor: true });
        const ht = this.add.text(x + (w - 6) / 2, 100, col.name, txt(15, C.cyan)).setOrigin(0.5);
        objs.push(head, ht);
        ROWS.forEach((r, ri) => {
          const cell = this.add.text(x + 6, 136 + ri * 44, r[ci], txt(14, C.text));
          objs.push(cell);
        });
        const strike = this.add.rectangle(x + (w - 6) / 2, 245, w - 6, 330, C.sig, 0.25).setVisible(false);
        const cross = this.add.text(x + (w - 6) / 2, 245, '✕', txt(48, C.sig)).setOrigin(0.5).setVisible(false);
        objs.push(strike, cross);
        head.on('pointerdown', () => {
          if (this.dialog.open) return;
          audio.sfx('blip');
          if (removed.has(ci)) removed.delete(ci); else removed.add(ci);
          strike.setVisible(removed.has(ci));
          cross.setVisible(removed.has(ci));
        });
        colObjs.push(objs);
        layer.add(objs);
        x += w;
      });
      layer.add(this.add.text(W / 2, 392, 'Spaltenkopf anklicken = Spalte entfernen', txt(14, C.dim)).setOrigin(0.5));
      const up = button(this, W / 2, 470, '⬆ Hochladen', async () => {
        if (this.dialog.open) return;
        up.destroy();
        let right = 0;
        COLS.forEach((c, ci) => {
          const ok = removed.has(ci) === c.identifying;
          if (ok) right++;
          const t = this.add.text(50 + colW.slice(0, ci).reduce((a, b) => a + b, 0) + (colW[ci] - 6) / 2, 412, ok ? '✔' : c.why, txt(ok ? 18 : 11, ok ? C.ok : C.warn, { align: 'center', wordWrap: { width: colW[ci] - 8 } })).setOrigin(0.5, 0);
          layer.add(t);
        });
        this.score += right * 30;
        audio.sfx(right === 7 ? 'success' : 'select');
        floatText(this, W / 2, 60, `${right}/7 richtig · +${right * 30}`, right === 7 ? C.ok : C.gold);
        await this.wait(1800);
        await this.say([{ who: 'fair', text: right === 7 ? 'Perfekt anonymisiert! Auch die PLZ war tückisch: Mit Geburtsdatum zusammen identifiziert sie fast jede Person.' : 'Fast! Achtung bei Quasi-Identifikatoren wie PLZ und Geburtsdatum: zusammen verraten sie oft, wer gemeint ist.' }]);
        layer.destroy();
        resolve();
      }, { w: 220, fill: C.ok, color: C.ink });
      layer.add(up);
    });
  }

  // ---------- B: the four FAIR locks ----------

  private async fairLocks() {
    const layer = this.add.container(0, 0);
    const box = this.add.graphics();
    box.fillStyle(0x1d3b6a, 1).fillRoundedRect(W / 2 - 260, 120, 520, 220, 18);
    box.lineStyle(4, C.cyan, 1).strokeRoundedRect(W / 2 - 260, 120, 520, 220, 18);
    box.fillStyle(0x0d1330, 1).fillRect(W / 2 - 240, 140, 480, 40);
    layer.add(box);
    layer.add(this.add.text(W / 2, 160, 'DATENSATZ · Lerntraining-Studie', txt(18, C.cyan)).setOrigin(0.5));
    const locks: Phaser.GameObjects.Container[] = LOCKS.map((l, i) => {
      const c = this.add.container(W / 2 - 180 + i * 120, 260);
      const g = this.add.graphics();
      g.lineStyle(8, 0xc0c8e8, 1).beginPath().arc(0, -22, 22, Math.PI, 0).strokePath();
      g.fillStyle(0xc0c8e8, 1).fillRoundedRect(-32, -22, 64, 56, 10);
      const t = this.add.text(0, 6, l.letter, txt(30, C.ink)).setOrigin(0.5);
      c.add([g, t]);
      c.setData('g', g);
      layer.add(c);
      return c;
    });
    for (let i = 0; i < LOCKS.length; i++) {
      const l = LOCKS[i];
      this.tweens.add({ targets: locks[i], scale: 1.15, duration: 300, yoyo: true });
      const ok = await choice(this, `${l.letter} · ${l.title}`, l.options, l.correct, l.explain);
      const g = locks[i].getData('g') as Phaser.GameObjects.Graphics;
      if (ok) {
        this.fairOk++;
        this.score += 60;
        g.clear();
        g.lineStyle(8, C.ok, 1).beginPath().arc(0, -40, 22, Math.PI, 0).strokePath();
        g.fillStyle(C.ok, 1).fillRoundedRect(-32, -22, 64, 56, 10);
        this.tweens.add({ targets: locks[i], y: 250, duration: 200, yoyo: true });
      } else {
        g.clear().fillStyle(C.sig, 1).fillRoundedRect(-32, -22, 64, 56, 10);
      }
    }
    await this.wait(600);
    if (this.fairOk === 4) {
      audio.sfx('success');
      const burst = this.add.particles(W / 2, 230, 'spark', { speed: { min: 80, max: 260 }, lifespan: 900, scale: { start: 0.7, end: 0 }, tint: [C.ok, C.cyan, C.gold], blendMode: 'ADD', emitting: false });
      burst.explode(60);
    }
    await this.wait(900);
    layer.destroy();
  }

  // ---------- C: can someone else reproduce the result? ----------

  private async reproduce() {
    await this.say([{ who: 'fair', text: 'Ein Team auf Planet Zeta will dein Ergebnis mit deinen Daten und deinem Code nachrechnen. Reproduzier-o-Mat, los!' }]);
    const layer = this.add.container(0, 0);
    const steps = ['Daten', 'Skript', 'Ergebnis'];
    const boxes = steps.map((s, i) => {
      const x = 200 + i * 280;
      const g = panel(this, x - 90, 180, 180, 110, C.cyan);
      const t = this.add.text(x, 235, s, txt(22, C.text)).setOrigin(0.5);
      layer.add([g, t]);
      return { x, t };
    });
    for (let i = 0; i < 2; i++) {
      const arrow = this.add.text(boxes[i].x + 140, 235, '➜', txt(34, C.gold)).setOrigin(0.5).setAlpha(0);
      layer.add(arrow);
      this.tweens.add({ targets: arrow, alpha: 1, x: arrow.x + 10, delay: 500 + i * 700, duration: 400 });
    }
    const ok = this.fairOk === 4;
    await this.wait(2000);
    audio.sfx(ok ? 'success' : 'fail');
    boxes[2].t.setText(ok ? 'p = .18 ✔' : 'Fehler ✖').setColor(hex(ok ? C.ok : C.sig));
    layer.add(this.add.text(W / 2, 340, ok ? 'Reproduziert! Gleiches Ergebnis wie im Artikel.' : 'Nicht reproduzierbar: Etwas fehlte im Container.', txt(20, ok ? C.ok : C.sig)).setOrigin(0.5));
    if (ok) this.score += 100;
    await this.wait(2200);
    layer.destroy();
  }
}
