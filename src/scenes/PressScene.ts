import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { button, C, H, hex, panel, txt, W } from '../ui/theme';
import { choice, floatText } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const PAPER: { text: string; flag?: string }[] = [
  { text: 'Wir untersuchten 12 Personen pro Gruppe.', flag: 'Winzige Stichprobe: kaum Power.' },
  { text: 'Die Teilnehmenden wurden zufällig den Gruppen zugeteilt.' },
  { text: 'Zwei Ausreißer wurden nach Sichtung der Ergebnisse entfernt.', flag: 'Ausschluss nach Blick auf die Ergebnisse.' },
  { text: 'Test A wurde wie im Handbuch durchgeführt.' },
  { text: 'Wie erwartet profitierten nur Linkshänder.', flag: 'Klingt nach HARKing: stand das vorher fest?' },
  { text: 'Das Ergebnis (p = .049) beweist eindeutig, dass Training schlau macht.', flag: 'Überzogene Aussage: Eine Studie beweist nichts.' },
  { text: 'Die Analyse folgte dem präregistrierten Plan.' },
  { text: 'Daten sind auf Anfrage erhältlich.', flag: '„Auf Anfrage“ ist nicht offen: Daten ins Repositorium!' },
  { text: 'Wir danken der Flotte für die Unterstützung.' },
];

/** Chapter 6: peer review, open peer review, open access and preprints. */
export class PressScene extends ChapterScene {
  private score = 0;

  constructor() { super('press'); }

  create() {
    this.score = 0;
    this.chapterSetup('press', 'Planet 6 · Satellit Druckerpresse', 'press', { nebula: ['nebula-violet', 'nebula-ember'], tint: 0x221433 });
    // satellite dishes blinking
    for (let i = 0; i < 5; i++) {
      const b = this.add.image(Phaser.Math.Between(40, W - 40), Phaser.Math.Between(60, H - 40), 'dot').setTint(0xf4c2ff).setScale(0.6).setDepth(-40).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: b, alpha: 0.1, duration: 400 + i * 150, yoyo: true, repeat: -1 });
    }
    this.time.delayedCall(400, () => this.run());
  }

  private async run() {
    await this.say([
      { who: 'quill', text: 'Kraah! Quill, Redaktion. Bevor hier etwas gedruckt wird, prüfen Gutachtende den Artikel: Peer Review.' },
      { who: 'quill', text: 'Du bist heute Gutachter*in! Klicke alle Sätze an, die dir verdächtig vorkommen. Falsche Alarme kosten Punkte.' },
    ]);
    await this.review();
    await this.say([
      { who: 'quill', text: 'Bei uns ist Peer Review offen: Gutachten werden mit dem Artikel veröffentlicht. So sieht jede*r, was geprüft wurde.' },
      { who: 'quill', text: 'Und jetzt das Wichtigste: Wer kann den Artikel eigentlich lesen?' },
    ]);
    await this.openAccess();
    this.finish(this.score, 'Gutes Review findet Schwächen. Open Access sorgt dafür, dass alle die Ergebnisse lesen können.', 'quill');
  }

  private review(): Promise<void> {
    return new Promise((resolve) => {
      const layer = this.add.container(0, 0);
      // a paper page
      const page = this.add.graphics();
      page.fillStyle(0x000000, 0.4).fillRoundedRect(156, 62, 520, 440, 10);
      page.fillStyle(0xf8f5ff, 1).fillRoundedRect(150, 56, 520, 440, 10);
      layer.add(page);
      layer.add(this.add.text(410, 80, 'Training macht schlau: ein Durchbruch', txt(20, C.ink)).setOrigin(0.5));
      layer.add(this.add.text(410, 104, 'Glanz, N. · Journal of Shiny Results', txt(13, 0x6b6f91)).setOrigin(0.5));
      const total = PAPER.filter((p) => p.flag).length;
      let found = 0;
      let wrong = 0;
      const timeMs = 45000 * state.diff.time;
      const bar = this.add.rectangle(150, 500, 520, 6, C.gold).setOrigin(0, 0.5);
      layer.add(bar);
      this.tweens.add({ targets: bar, scaleX: 0, duration: timeMs });
      const counter = this.add.text(700, 70, `Gefunden: 0 / ${total}`, txt(18, C.gold));
      const notes = this.add.text(700, 110, '', txt(13, C.text, { wordWrap: { width: 240 }, lineSpacing: 6 }));
      layer.add([counter, notes]);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        timer.remove();
        const pts = Math.max(0, found * 100 - wrong * 40);
        this.score += pts;
        floatText(this, 410, 300, `${found}/${total} gefunden · +${pts}`, C.gold, 26);
        // reveal missed flags
        rows.forEach((r) => { if (r.p.flag && !r.hit) r.t.setBackgroundColor('#ffd16655'); });
        this.time.delayedCall(2600, () => { layer.destroy(); resolve(); });
      };
      const rows: { t: Phaser.GameObjects.Text; p: (typeof PAPER)[number]; hit: boolean }[] = [];
      PAPER.forEach((p, i) => {
        const t = this.add.text(172, 130 + i * 39, p.text, txt(15, C.ink, { wordWrap: { width: 480 } })).setInteractive({ useHandCursor: true });
        const row = { t, p, hit: false };
        rows.push(row);
        t.on('pointerover', () => { if (!row.hit) t.setColor('#3a86ff'); });
        t.on('pointerout', () => { if (!row.hit) t.setColor(hex(C.ink)); });
        t.on('pointerdown', () => {
          if (row.hit || done || this.dialog.open) return;
          row.hit = true;
          if (p.flag) {
            found++;
            audio.sfx('coin');
            t.setColor('#d00045').setBackgroundColor('#ff5c7a33');
            notes.setText(`${notes.text}• ${p.flag}\n`);
            counter.setText(`Gefunden: ${found} / ${total}`);
            if (found === total) finish();
          } else {
            wrong++;
            audio.sfx('fail');
            t.setColor('#8c96c8');
            floatText(this, t.x + t.width / 2, t.y, 'kein Problem · −40', C.sig, 15);
          }
        });
        layer.add(t);
      });
      const timer = this.time.delayedCall(timeMs, finish);
      layer.add(button(this, 810, 470, 'Gutachten abgeben', () => finish(), { w: 220, fill: C.violet }));
    });
  }

  private async openAccess() {
    const layer = this.add.container(0, 0);
    // the article behind a paywall shield, readers around it
    const article = this.add.rectangle(W / 2, 220, 90, 120, 0xf8f5ff).setStrokeStyle(3, C.gold);
    const shield = this.add.ellipse(W / 2, 220, 220, 220, C.sig, 0.15).setStrokeStyle(4, C.sig);
    const price = this.add.text(W / 2, 340, '🔒 39,95 Credits pro Artikel', txt(18, C.sig)).setOrigin(0.5);
    this.tweens.add({ targets: shield, scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
    layer.add([article, shield, price]);
    const readers = [
      { x: 170, y: 160, label: 'Studentin\nauf Planet Zeta' },
      { x: 790, y: 160, label: 'Journalist' },
      { x: 170, y: 330, label: 'Lehrerin' },
      { x: 790, y: 330, label: 'Patientin' },
    ].map((r) => {
      const dot = this.add.image(r.x, r.y, 'glow').setScale(0.7).setTint(0x8c96c8).setBlendMode(Phaser.BlendModes.ADD);
      const t = this.add.text(r.x, r.y + 44, r.label, txt(14, C.dim, { align: 'center' })).setOrigin(0.5, 0);
      layer.add([dot, t]);
      return dot;
    });
    await this.wait(600);
    const q1 = await choice(this, 'Du hast kein Budget für Publikationsgebühren (APCs). Wie wird dein Artikel trotzdem frei lesbar?', [
      'Gar nicht, Pech gehabt',
      'Green Open Access: Manuskript ins Repositorium (ggf. nach Embargo)',
      'PDF heimlich an Freunde schicken',
    ], 1, 'Gold OA: sofort frei beim Verlag, oft gegen APC. Green OA: Zweitveröffentlichung im Repositorium.');
    if (q1) this.score += 200;
    const q2 = await choice(this, 'Was ist ein Preprint?', ['Eine frei zugängliche Version vor dem Peer Review', 'Ein Artikel hinter einer Paywall', 'Ein gedrucktes Poster'], 0,
      'Preprints machen Ergebnisse sofort sichtbar. Sie sind aber noch nicht begutachtet.');
    if (q2) this.score += 200;
    // shield shatters
    audio.sfx('boom');
    this.cameras.main.shake(200, 0.006);
    const shards = this.add.particles(W / 2, 220, 'spark', { speed: { min: 120, max: 320 }, lifespan: 900, scale: { start: 0.7, end: 0 }, tint: [C.sig, 0xffffff], emitting: false, blendMode: 'ADD' });
    shards.explode(60);
    shield.destroy();
    price.setText('🔓 Open Access: frei für alle').setColor(hex(C.ok));
    readers.forEach((r, i) => {
      const beam = this.add.graphics().lineStyle(3, C.ok, 0.8).lineBetween(W / 2, 220, r.x, r.y).setAlpha(0);
      layer.add(beam);
      this.tweens.add({ targets: beam, alpha: 1, delay: i * 200, duration: 300 });
      this.tweens.add({ targets: r, delay: i * 200, duration: 300, scale: 1, onStart: () => r.setTint(C.ok) });
    });
    await this.wait(1500);
    await this.say([{ who: 'quill', text: 'Wunderbar! Wissen, das mit öffentlichen Geldern entsteht, sollte auch öffentlich lesbar sein.' }]);
    layer.destroy();
  }
}

