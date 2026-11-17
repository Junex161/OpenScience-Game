import Phaser from 'phaser';
import { audio } from '../core/audio';
import { CHAPTER_INFO, CRYSTALS } from '../core/chapters';
import { addLocal, fetchOnline, localScores, onlineEnabled, percentile, ScoreEntry, submitOnline } from '../core/scores';
import { state } from '../core/state';
import { button, C, fadeTo, H, panel, txt, W } from '../ui/theme';
import { BaseScene } from './BaseScene';

const RANKS: [number, string][] = [
  [0, 'Replikations-Rookie'],
  [3000, 'Daten-Detektiv*in'],
  [4500, 'Präregistrierungs-Profi'],
  [6000, 'FAIR-Kommandant*in'],
  [7200, 'Open-Science-Legende'],
];

const REFS = [
  'Arnett (2008). The neglected 95%. American Psychologist.',
  'Button et al. (2013). Power failure. Nature Reviews Neuroscience.',
  'Fanelli (2010). "Positive" results increase down the hierarchy of the sciences. PLoS ONE.',
  'Henrich, Heine & Norenzayan (2010). The weirdest people in the world? BBS.',
  'John, Loewenstein & Prelec (2012). Measuring the prevalence of QRPs. Psych. Science.',
  'Kerr (1998). HARKing. Personality and Social Psychology Review.',
  'Klein et al. (2018). Many Labs 2. AMPPS.',
  'Open Science Collaboration (2015). Estimating the reproducibility of psychological science. Science.',
  'Rosenthal (1979). The file drawer problem. Psychological Bulletin.',
  'Scheel, Schijen & Lakens (2021). An excess of positive results. AMPPS.',
  'Simmons, Nelson & Simonsohn (2011). False-positive psychology. Psych. Science.',
  'Wilkinson et al. (2016). The FAIR guiding principles. Scientific Data.',
];

export class ResultsScene extends BaseScene {
  constructor() { super('results'); }

  create() {
    this.setup({ music: 'results', nebula: ['nebula-violet', 'nebula-teal'], seed: 77 });
    const total = state.total;
    const me: ScoreEntry = { name: state.data.name || 'Gast', score: total, difficulty: state.data.difficulty, date: new Date().toISOString() };
    const d = state.data as typeof state.data & { submitted?: boolean };
    let local = localScores();
    if (!d.submitted && state.done('finale')) {
      d.submitted = true;
      state.save();
      local = addLocal(me);
      submitOnline(me);
    }
    // celebration
    this.add.particles(W / 2, -10, 'spark', { x: { min: -W / 2, max: W / 2 }, speedY: { min: 60, max: 140 }, lifespan: 6000, scale: { start: 0.5, end: 0.1 }, tint: [C.gold, C.cyan, C.magenta], blendMode: 'ADD', frequency: 120 }).setDepth(-30);

    this.add.text(W / 2, 34, state.done('finale') ? 'Galaxie gerettet!' : 'Zwischenstand', txt(36, C.gold, { stroke: '#9b5cff', strokeThickness: 6 })).setOrigin(0.5);
    // left: personal result
    panel(this, 24, 70, 440, 410, C.gold);
    this.add.text(44, 82, me.name, txt(22, C.text));
    const rank = [...RANKS].reverse().find(([min]) => total >= min)![1];
    this.add.text(44, 112, rank, txt(16, C.cyan));
    const tot = this.add.text(444, 84, '0', txt(34, C.gold)).setOrigin(1, 0);
    this.tweens.addCounter({ from: 0, to: total, duration: 1500, onUpdate: (t) => tot.setText(`${Math.round(t.getValue() ?? 0)}`) });
    this.add.text(444, 124, 'Punkte', txt(13, C.dim)).setOrigin(1, 0);
    CHAPTER_INFO.forEach((c, i) => {
      const y = 158 + i * 34;
      const r = state.data.results[c.id];
      this.add.image(58, y + 10, c.planet).setScale(0.18);
      this.add.text(82, y, c.name, txt(15, r ? C.text : C.dim));
      this.add.text(330, y, r ? '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars) : '–', txt(16, C.gold));
      this.add.text(444, y, r ? `${r.score}` : '', txt(15, C.text)).setOrigin(1, 0);
    });
    this.add.text(82, 158 + 8 * 34, `Kristalle ${state.data.crystals.length}/${CRYSTALS.length}`, txt(15, C.cyan));
    this.add.text(444, 158 + 8 * 34, `${state.data.crystals.length * 50}`, txt(15, C.text)).setOrigin(1, 0);
    const diffLabel = { easy: 'Leicht', normal: 'Normal', hard: 'Schwer' }[state.data.difficulty];
    this.add.text(44, 452, `Schwierigkeit: ${diffLabel}`, txt(13, C.dim));

    // right: comparison
    panel(this, 490, 70, 446, 410, C.cyan);
    this.add.text(510, 82, 'Wie schneidest du ab?', txt(20, C.cyan));
    const status = this.add.text(510, 110, onlineEnabled ? 'Lade weltweite Bestenliste …' : 'Bestenliste auf diesem Gerät', txt(13, C.dim));
    const area = this.add.container(0, 0);
    const render = (list: ScoreEntry[], scope: string) => {
      area.removeAll(true);
      status.setText(scope);
      this.drawHistogram(area, list, total);
      const pct = percentile(list, total);
      area.add(this.add.text(713, 268, pct === null ? 'Du bist die erste Person hier. Spiel nochmal oder lass andere ran!' : `Besser als ${pct} % der Spieler*innen`, txt(16, C.text, { align: 'center', wordWrap: { width: 400 } })).setOrigin(0.5));
      const top = [...list].sort((a, b) => b.score - a.score).slice(0, 6);
      top.forEach((e, i) => {
        const mine = e.name === me.name && e.score === me.score;
        const y = 300 + i * 26;
        area.add(this.add.text(512, y, `${i + 1}.`, txt(15, mine ? C.gold : C.dim)));
        area.add(this.add.text(545, y, e.name, txt(15, mine ? C.gold : C.text)));
        area.add(this.add.text(800, y, { easy: 'L', normal: 'N', hard: 'S' }[e.difficulty] ?? '', txt(13, C.dim)));
        area.add(this.add.text(916, y, `${e.score}`, txt(15, mine ? C.gold : C.text)).setOrigin(1, 0));
      });
    };
    render(local.length ? local : [me], 'Bestenliste auf diesem Gerät');
    if (onlineEnabled) fetchOnline().then((list) => { if (list && list.length) render(list, `Weltweit · ${list.length} Spiele`); });

    button(this, 170, 508, 'Neues Spiel', () => { audio.sfx('select'); fadeTo(this, 'title'); }, { w: 190, fill: C.violet });
    button(this, 390, 508, 'Sternenkarte', () => fadeTo(this, 'galaxy', {}), { w: 190, fill: C.blue });
    button(this, 610, 508, 'Quellen', () => this.showRefs(), { w: 160, fill: 0x26305f });
    button(this, 810, 508, 'Credits', () => this.showCredits(), { w: 160, fill: 0x26305f });
  }

  private drawHistogram(area: Phaser.GameObjects.Container, list: ScoreEntry[], mine: number) {
    const x0 = 520;
    const y1 = 240;
    const w = 390;
    const h = 100;
    const max = Math.max(9000, ...list.map((e) => e.score));
    const bins = new Array(18).fill(0);
    for (const e of list) bins[Math.min(bins.length - 1, Math.floor((e.score / max) * bins.length))]++;
    const top = Math.max(1, ...bins);
    const g = this.add.graphics();
    area.add(g);
    g.lineStyle(1, 0x3b4a8c, 1).lineBetween(x0, y1, x0 + w, y1);
    bins.forEach((b, i) => {
      const bw = w / bins.length;
      const bh = (b / top) * h;
      const has = Math.floor((mine / max) * bins.length) === i || (i === bins.length - 1 && mine >= max);
      if (bh <= 0) return;
      const rect = this.add.rectangle(x0 + i * bw + 1, y1, bw - 2, bh, has ? C.gold : C.violet, 0.9).setOrigin(0, 1).setScale(1, 0);
      area.add(rect);
      this.tweens.add({ targets: rect, scaleY: 1, delay: 300 + i * 40, duration: 500, ease: 'Cubic.out' });
    });
    const mx = x0 + Math.min(1, mine / max) * w;
    area.add(this.add.text(mx, y1 - h - 22, '▼ Du', txt(13, C.gold)).setOrigin(0.5));
    area.add(this.add.text(x0, y1 + 4, '0', txt(11, C.dim)));
    area.add(this.add.text(x0 + w, y1 + 4, `${max}`, txt(11, C.dim)).setOrigin(1, 0));
  }

  private overlay(title: string, lines: string[]) {
    const layer = this.add.container(0, 0).setDepth(7000);
    const bg = this.add.rectangle(0, 0, W, H, C.void, 0.92).setOrigin(0).setInteractive();
    layer.add([bg, panel(this, 60, 40, W - 120, H - 80, C.violet)]);
    layer.add(this.add.text(W / 2, 64, title, txt(24, C.gold)).setOrigin(0.5));
    layer.add(this.add.text(90, 100, lines.join('\n'), txt(14, C.text, { wordWrap: { width: W - 180 }, lineSpacing: 6 })));
    layer.add(button(this, W / 2, H - 76, 'Schließen', () => layer.destroy(), { w: 180, fill: C.blue }));
  }

  private showRefs() { this.overlay('Quellen', REFS); }

  private showCredits() {
    this.overlay('Credits', [
      'Mission Replika: Eine Open-Science-Odyssee',
      'Idee, Konzept und Leitung: Julian',
      'Code, Grafik und Musik: prozedural erzeugt (Phaser, Web Audio), entwickelt mit Claude',
      'Schrift: Fredoka (SIL Open Font License)',
      '',
      'Alle Figuren, Planeten und Journale sind frei erfunden.',
      'Das Spiel ist eine Open Educational Resource: Nutzen, teilen und anpassen ausdrücklich erwünscht.',
    ]);
  }
}
