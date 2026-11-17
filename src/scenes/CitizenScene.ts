import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { Ship } from '../ui/ship';
import { C, H, panel, txt, W } from '../ui/theme';
import { choice, floatText } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const ARENA = new Phaser.Geom.Rectangle(30, 60, 680, 465);
const GROUPS = [
  { name: 'W.E.I.R.D.', color: 0xc0c8e8, x: 160, y: 170, rate: 0.9, tex: 'p-vault' },
  { name: 'Aquaria', color: 0x4cc9f0, x: 640, y: 120, rate: 0.35, tex: 'p-lab' },
  { name: 'Ember', color: 0xff8a5b, x: 620, y: 460, rate: 0.35, tex: 'p-forge' },
  { name: 'Sylva', color: 0x52b788, x: 110, y: 470, rate: 0.35, tex: 'p-citizen' },
  { name: 'Lumi', color: 0xf4c2ff, x: 380, y: 300, rate: 0.3, tex: 'p-press' },
];

/** Chapter 7: citizen science and diverse (non-WEIRD) samples. */
export class CitizenScene extends ChapterScene {
  private ship!: Ship;
  private counts: number[] = [];
  private people: { img: Phaser.GameObjects.Image; g: number; vx: number; vy: number; life: number }[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private divText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private running = false;
  private timeLeft = 0;
  private timeTotal = 0;
  private spawnAcc: number[] = [];

  constructor() { super('citizen'); }

  create() {
    this.counts = [20, 0, 0, 0, 0];
    this.people = [];
    this.running = false;
    this.spawnAcc = GROUPS.map(() => 0);
    this.chapterSetup('citizen', 'Planet 7 · Planet Vielfalt', 'citizen', { nebula: ['nebula-teal', 'nebula-ember'], tint: 0x10261c });
    const g = this.add.graphics();
    g.lineStyle(2, 0x3b4a8c, 0.8).strokeRoundedRect(ARENA.x - 10, ARENA.y - 6, ARENA.width + 20, ARENA.height + 12, 16);
    GROUPS.forEach((gr) => {
      this.add.image(gr.x, gr.y, gr.tex).setScale(gr.name === 'Lumi' ? 0.45 : 0.55).setDepth(5);
      this.add.text(gr.x, gr.y + 46, gr.name, txt(13, gr.color, { stroke: '#070b1a', strokeThickness: 4 })).setOrigin(0.5).setDepth(6);
    });
    panel(this, 730, 56, 220, 470, C.ok);
    this.add.text(745, 66, 'Deine Stichprobe', txt(16, C.ok));
    this.bars = this.add.graphics();
    this.divText = this.add.text(745, 420, '', txt(15, C.text, { wordWrap: { width: 190 } }));
    this.timerText = this.add.text(ARENA.right, 48, '', txt(18, C.gold)).setOrigin(1, 0).setDepth(4001);
    this.ship = new Ship(this, 300, 200, ARENA, 330);
    this.ship.enabled = false;
    this.timeTotal = this.timeLeft = 55000 * state.diff.time;
    this.drawBars();
    this.time.delayedCall(400, () => this.intro());
  }

  private diversity() {
    const n = this.counts.reduce((a, b) => a + b, 0);
    const simpson = 1 - this.counts.reduce((s, c) => s + (c / n) ** 2, 0);
    return simpson / (1 - 1 / GROUPS.length);
  }

  private drawBars() {
    const g = this.bars.clear();
    const n = this.counts.reduce((a, b) => a + b, 0);
    GROUPS.forEach((gr, i) => {
      const y = 110 + i * 58;
      g.fillStyle(0x26305f, 1).fillRoundedRect(745, y + 20, 190, 14, 7);
      g.fillStyle(gr.color, 1).fillRoundedRect(745, y + 20, Math.max(8, (this.counts[i] / n) * 190), 14, 7);
      const label = this.children.getByName(`lab${i}`) as Phaser.GameObjects.Text | null;
      const s = `${gr.name}: ${this.counts[i]}`;
      if (label) label.setText(s); else this.add.text(745, y, s, txt(14, C.text)).setName(`lab${i}`);
    });
    const d = this.diversity();
    this.divText.setText(`n = ${n}\nVielfalt: ${Math.round(d * 100)} %\nZiel: ${Math.round(this.goal() * 100)} %`);
  }

  private goal() { return 0.8; }

  private async intro() {
    await this.say([
      { who: 'mo', text: 'Hallo, ich bin Mo, Bürgermeisterin von Planet Vielfalt! Bei uns forschen alle mit.' },
      { who: 'mo', text: 'Schau mal auf deine Stichprobe: 20 Personen, alle vom Planeten W.E.I.R.D. Typisch Forschung!' },
      { text: 'WEIRD steht für Western, Educated, Industrialized, Rich, Democratic. Viele Studien testen nur solche Menschen.' },
      { who: 'mo', text: 'Flieg zu allen Planeten und sammle Freiwillige ein. Erreiche mindestens 80 % Vielfalt!' },
    ]);
    this.ship.enabled = true;
    this.running = true;
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    if (!this.ship) return;
    this.ship.update(dt);
    const s = dt / 1000;
    for (const p of [...this.people]) {
      p.img.x += p.vx * s;
      p.img.y += p.vy * s;
      p.life -= dt;
      if (p.life < 600) p.img.setAlpha(p.life / 600);
      if (p.life <= 0) { this.people = this.people.filter((x) => x !== p); p.img.destroy(); continue; }
      if (this.running && Phaser.Math.Distance.Between(p.img.x, p.img.y, this.ship.x, this.ship.y) < 30) {
        this.people = this.people.filter((x) => x !== p);
        this.counts[p.g]++;
        audio.sfx('blip');
        floatText(this, p.img.x, p.img.y - 10, '+1', GROUPS[p.g].color, 16);
        p.img.destroy();
        this.drawBars();
        if (this.diversity() >= this.goal()) this.end(true);
      }
    }
    if (!this.running) return;
    GROUPS.forEach((gr, i) => {
      this.spawnAcc[i] += s * gr.rate * (i === 0 ? 1 : 1 / Math.max(0.7, state.diff.speed));
      if (this.spawnAcc[i] >= 1) {
        this.spawnAcc[i] = 0;
        const img = this.add.image(gr.x, gr.y, 'dot').setScale(1.2).setTint(gr.color).setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
        const a = Math.random() * Math.PI * 2;
        const sp = Phaser.Math.Between(20, 50);
        this.people.push({ img, g: i, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4500 * state.diff.time });
      }
    });
    this.timeLeft -= dt;
    this.timerText.setText(`⏱ ${Math.max(0, Math.ceil(this.timeLeft / 1000))} s`);
    if (this.timeLeft <= 0) this.end(false);
  }

  private async end(success: boolean) {
    if (!this.running) return;
    this.running = false;
    this.ship.enabled = false;
    const d = this.diversity();
    let score = Math.round(500 * Math.min(1, d / this.goal())) + (success ? Math.round(150 * (this.timeLeft / this.timeTotal)) : 0);
    await this.say([
      { who: 'mo', text: success ? 'Fantastisch! Jetzt sagt deine Studie etwas über mehr als einen Planeten aus.' : 'Die Zeit ist um. Deine Stichprobe ist schon bunter, aber noch nicht ganz.' },
      { text: '96 % der Teilnehmenden in Psychologie-Studien kamen aus westlichen Industrieländern, in denen nur 12 % der Menschheit lebt (Arnett, 2008).' },
      { who: 'mo', text: 'Citizen Science hilft: Menschen sammeln Daten, stellen Fragen, deuten Ergebnisse mit, manchmal bis zur Ko-Autorschaft.' },
    ]);
    const q1 = await choice(this, 'Warum ist eine reine W.E.I.R.D.-Stichprobe ein Problem?', ['Die Ergebnisse gelten vielleicht nicht für andere Menschen', 'Sie ist zu teuer', 'Gar nicht, Menschen sind überall gleich'], 0,
      'Henrich, Heine & Norenzayan (2010) zeigten große Unterschiede, sogar bei Wahrnehmung.');
    if (q1) score += 175;
    const q2 = await choice(this, 'Was gehört zu Citizen Science?', ['Bürger*innen sammeln und klassifizieren Daten mit', 'Nur Profis dürfen forschen', 'Ergebnisse werden geheim gehalten'], 0,
      'Und: Gute Citizen Science bringt auch den Beteiligten etwas, etwa Wissen oder Anerkennung.');
    if (q2) score += 175;
    this.finish(score, 'Vielfältige Stichproben und Beteiligung der Öffentlichkeit machen Ergebnisse breiter gültig.', 'mo');
  }

  get debugWin() { return () => { this.counts = [20, 12, 12, 12, 12]; this.drawBars(); this.end(true); }; }
}

export { H, W };
