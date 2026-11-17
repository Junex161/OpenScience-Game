import Phaser from 'phaser';
import { audio } from '../core/audio';
import { CHAPTERS, state } from '../core/state';
import { Hearts, Ship } from '../ui/ship';
import { C, H, hex, txt, W } from '../ui/theme';
import { floatText } from '../ui/widgets';
import { ChapterScene } from './BaseScene';

const ARENA = new Phaser.Geom.Rectangle(40, 70, 560, 450);
const HEADLINES = ['SENSATION!', 'p < .05!', 'DURCHBRUCH!', 'BEWIESEN!', 'REVOLUTION!', 'SCHOCKIEREND!', 'GAME CHANGER!'];
const DECOY_CLAIMS = ['n = 12', '36 Wege', 'HARKing', 'p = .049'];

interface Bullet { obj: Phaser.GameObjects.GameObject & { x: number; y: number }; vx: number; vy: number; r: number }

/** Finale: the many-labs fleet against the HYPE. */
export class FinaleScene extends ChapterScene {
  private ship!: Ship;
  private hearts!: Hearts;
  private boss!: Phaser.GameObjects.Container;
  private bossHp = 100;
  private bossMax = 100;
  private hpBar!: Phaser.GameObjects.Graphics;
  private phase = 0;
  private shots: Bullet[] = [];
  private enemy: Bullet[] = [];
  private walls: { top: Phaser.GameObjects.Rectangle; bot: Phaser.GameObjects.Rectangle }[] = [];
  private decoys: { c: Phaser.GameObjects.Container; hp: number }[] = [];
  private drones: Phaser.GameObjects.Image[] = [];
  private fireKey!: Phaser.Input.Keyboard.Key;
  private salvoKey!: Phaser.Input.Keyboard.Key;
  private fireCd = 0;
  private attackCd = 0;
  private droneCd = 0;
  private wallCd = 0;
  private charge = 0;
  private chargeBar!: Phaser.GameObjects.Graphics;
  private shield = 0;
  private shieldImg?: Phaser.GameObjects.Image;
  private running = false;
  private t0 = 0;

  constructor() { super('finale'); }

  create() {
    this.shots = [];
    this.enemy = [];
    this.walls = [];
    this.decoys = [];
    this.drones = [];
    this.phase = 0;
    this.charge = 0;
    this.running = false;
    this.bossMax = this.bossHp = { easy: 70, normal: 100, hard: 140 }[state.data.difficulty];
    this.chapterSetup('finale', 'Finale · Hype-Nebel', 'finale', { nebula: ['nebula-violet', 'nebula-ember', 'nebula-violet'], tint: 0x2a0b2e });
    const bounds = new Phaser.Geom.Rectangle(ARENA.x, ARENA.y, ARENA.width - 60, ARENA.height);
    this.ship = new Ship(this, 120, H / 2, bounds, 300);
    this.ship.faceVelocity = false;
    this.ship.enabled = false;
    this.hearts = new Hearts(this, state.diff.hearts + 2);
    const labs = state.admin ? 7 : Math.max(1, CHAPTERS.filter((c) => c !== 'finale' && state.done(c)).length);
    for (let i = 0; i < labs; i++) this.drones.push(this.add.image(0, 0, 'ship-ally').setScale(0.45).setDepth(48));
    this.makeBoss();
    this.hpBar = this.add.graphics().setDepth(4001);
    this.chargeBar = this.add.graphics().setDepth(4001);
    this.add.text(20, H - 26, 'Leertaste: Replikationen feuern · E: Many-Labs-Salve (wenn voll)', txt(13, C.dim)).setDepth(4001);
    this.fireKey = this.input.keyboard!.addKey('SPACE');
    this.salvoKey = this.input.keyboard!.addKey('E');
    if (state.done('vault') || state.admin) { this.shield = 1; this.shieldImg = this.add.image(0, 0, 'glow').setScale(0.9).setTint(C.cyan).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(51); }
    this.drawBars();
    this.time.delayedCall(400, () => this.intro());
  }

  private makeBoss() {
    this.boss = this.add.container(800, H / 2).setDepth(40);
    const aura = this.add.image(0, 0, 'glow').setScale(3.4).setTint(C.magenta).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    g.fillStyle(C.magenta, 1).fillTriangle(-80, 70, 0, -100, 80, 70);
    g.fillStyle(0xb5179e, 1).fillTriangle(-50, 70, 0, -40, 50, 70);
    g.fillStyle(0xffffff, 1).fillCircle(-24, -4, 18).fillCircle(24, -4, 18);
    g.fillStyle(C.sig, 1).fillCircle(-28, -2, 8).fillCircle(20, -2, 8);
    g.fillStyle(C.gold, 1).fillTriangle(-130, 20, -60, 0, -60, 46);
    g.lineStyle(4, 0xffffff, 1).lineBetween(-20, 34, 20, 34);
    const crown = this.add.text(0, -120, '★ HYPE ★', txt(22, C.gold, { stroke: '#ff4fd8', strokeThickness: 5 })).setOrigin(0.5);
    this.boss.add([aura, g, crown]);
    this.boss.setData('aura', aura);
    this.tweens.add({ targets: this.boss, y: H / 2 + 120, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: aura, scale: 3.8, duration: 500, yoyo: true, repeat: -1 });
  }

  private async intro() {
    const labs = this.drones.length;
    await this.say([
      { who: 'hype', text: 'Soso, die kleine Fähre mit ihren Werkzeugen. Niemand will Replikationen! Alle wollen SENSATIONEN!' },
      { text: `Wir sind nicht allein: ${labs} ${labs === 1 ? 'Labor fliegt' : 'Labore fliegen'} mit uns. Das ist Many Labs: dieselbe Studie, viele Teams, viele Länder.` },
      { text: 'Feuere Replikationen mit der Leertaste. Wenn die Salve voll ist, drück E. Weich den Schlagzeilen aus!' },
    ]);
    this.ship.enabled = true;
    this.running = true;
    this.phase = 1;
    this.t0 = this.time.now;
  }

  private drawBars() {
    const g = this.hpBar.clear();
    g.fillStyle(0x26305f, 1).fillRoundedRect(620, 50, 320, 14, 7);
    g.fillStyle(C.magenta, 1).fillRoundedRect(620, 50, Math.max(0, 320 * (this.bossHp / this.bossMax)), 14, 7);
    const c = this.chargeBar.clear();
    c.fillStyle(0x26305f, 1).fillRoundedRect(20, 84, 160, 10, 5);
    c.fillStyle(this.charge >= 1 ? C.gold : C.cyan, 1).fillRoundedRect(20, 84, Math.max(6, 160 * Math.min(1, this.charge)), 10, 5);
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    if (!this.ship) return;
    this.ship.update(dt);
    const s = dt / 1000;
    // drones orbit the ship
    this.drones.forEach((d, i) => {
      const a = t / 700 + (i / this.drones.length) * Math.PI * 2;
      d.setPosition(this.ship.x + Math.cos(a) * 46, this.ship.y + Math.sin(a) * 46);
    });
    this.shieldImg?.setPosition(this.ship.x, this.ship.y).setVisible(this.shield > 0);
    if (!this.running) return;

    // player fire
    this.fireCd -= dt;
    if (this.fireKey.isDown && this.fireCd <= 0) {
      this.fireCd = 170;
      this.shoot(this.ship.x + 26, this.ship.y, 620, 0, C.cyan, 1);
      audio.sfx('laser');
    }
    this.droneCd -= dt;
    if (this.droneCd <= 0) {
      this.droneCd = 900;
      for (const d of this.drones) this.shoot(d.x, d.y, 520, 0, C.gold, 0.4);
    }
    if (Phaser.Input.Keyboard.JustDown(this.salvoKey) && this.charge >= 1) this.salvo();

    // boss attacks
    this.attackCd -= dt;
    if (this.attackCd <= 0) this.attack();
    if (this.phase === 3) {
      this.wallCd -= dt;
      if (this.wallCd <= 0) { this.wallCd = 3200 / state.diff.speed; this.spawnWall(); }
    }

    this.moveBullets(this.shots, s, (b) => this.hitEnemies(b));
    this.moveBullets(this.enemy, s, (b) => Phaser.Math.Distance.Between(b.obj.x, b.obj.y, this.ship.x, this.ship.y) < b.r + 12 ? (this.damagePlayer(), true) : false);
    for (const w of [...this.walls]) {
      w.top.x -= 150 * state.diff.speed * s;
      w.bot.x = w.top.x;
      const sx = this.ship.x;
      const sy = this.ship.y;
      if (Math.abs(sx - w.top.x) < 22 && (sy < w.top.y + w.top.height / 2 + 8 || sy > w.bot.y - w.bot.height / 2 - 8)) this.damagePlayer();
      if (w.top.x < ARENA.left - 40) { w.top.destroy(); w.bot.destroy(); this.walls = this.walls.filter((x) => x !== w); }
    }
  }

  private shoot(x: number, y: number, vx: number, vy: number, color: number, dmg: number) {
    const img = this.add.image(x, y, 'spark').setScale(dmg >= 1 ? 0.9 : 0.6, 0.5).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(45);
    img.setData('dmg', dmg);
    this.shots.push({ obj: img, vx, vy, r: 8 });
  }

  private moveBullets(list: Bullet[], s: number, collide: (b: Bullet) => boolean) {
    for (const b of [...list]) {
      b.obj.x += b.vx * s;
      b.obj.y += b.vy * s;
      const out = b.obj.x < -80 || b.obj.x > W + 80 || b.obj.y < 30 || b.obj.y > H + 40;
      if (out || collide(b)) {
        const i = list.indexOf(b);
        if (i >= 0) list.splice(i, 1);
        b.obj.destroy();
      }
    }
  }

  private hitEnemies(b: Bullet): boolean {
    const dmg = (b.obj.getData('dmg') as number) ?? 1;
    for (const d of [...this.decoys]) {
      if (Phaser.Math.Distance.Between(b.obj.x, b.obj.y, d.c.x, d.c.y) < 46) {
        d.hp -= dmg;
        this.tweens.add({ targets: d.c, scale: 0.9, duration: 60, yoyo: true });
        if (d.hp <= 0) this.popDecoy(d);
        return true;
      }
    }
    if (Phaser.Math.Distance.Between(b.obj.x, b.obj.y, this.boss.x, this.boss.y) < 80) {
      if (this.decoys.length) { floatText(this, this.boss.x, this.boss.y - 90, 'abgeschirmt!', C.dim, 14); return true; }
      this.damageBoss(dmg);
      return true;
    }
    return false;
  }

  private damageBoss(dmg: number) {
    this.bossHp -= dmg;
    this.charge = Math.min(1, this.charge + 0.035 * dmg);
    (this.boss.getData('aura') as Phaser.GameObjects.Image).setTint(0xffffff);
    this.time.delayedCall(60, () => (this.boss.getData('aura') as Phaser.GameObjects.Image).setTint(C.magenta));
    this.drawBars();
    const frac = this.bossHp / this.bossMax;
    if (this.phase === 1 && frac <= 0.66) this.toPhase(2);
    else if (this.phase === 2 && frac <= 0.33 && !this.decoys.length) this.toPhase(3);
    if (this.bossHp <= 0) this.win();
  }

  private async toPhase(p: number) {
    this.phase = p;
    this.running = false;
    this.ship.enabled = false;
    this.clearEnemy();
    if (p === 2) {
      await this.say([
        { who: 'hype', text: 'Grr! Dann eben mehr Befunde! Viel mehr! Such dir einen aus!' },
        { text: 'Doppelgänger aus p-gehackten Studien. Sie schützen den HYPE. Prüf sie, dann platzen sie!' },
      ]);
      DECOY_CLAIMS.forEach((claim, i) => {
        const c = this.add.container(this.boss.x, this.boss.y).setDepth(41);
        const glow = this.add.image(0, 0, 'glow').setScale(1.3).setTint(C.magenta).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
        const g = this.add.graphics().fillStyle(C.magenta, 0.8).fillTriangle(-34, 30, 0, -42, 34, 30).fillStyle(0xffffff, 1).fillCircle(-10, 0, 7).fillCircle(10, 0, 7);
        const t = this.add.text(0, 46, claim, txt(14, C.gold, { stroke: '#070b1a', strokeThickness: 4 })).setOrigin(0.5);
        c.add([glow, g, t]);
        const tx = 660 + (i % 2) * 120;
        const ty = 140 + i * 95;
        this.tweens.add({ targets: c, x: tx, y: ty, duration: 600, ease: 'Back.out' });
        this.tweens.add({ targets: c, y: ty + 20, duration: 900 + i * 100, yoyo: true, repeat: -1, delay: 600, ease: 'Sine.inOut' });
        this.decoys.push({ c, hp: 6 });
      });
    } else if (p === 3) {
      await this.say([
        { who: 'hype', text: 'Unmöglich! Dann sperre ich euch aus! PAYWALLS!' },
        { text: 'Flieg durch die Lücken in den Bezahlschranken. Gleich haben wir ihn!' },
      ]);
      this.wallCd = 500;
    }
    this.ship.enabled = true;
    this.running = true;
  }

  private popDecoy(d: { c: Phaser.GameObjects.Container; hp: number }) {
    this.decoys = this.decoys.filter((x) => x !== d);
    audio.sfx('boom');
    floatText(this, d.c.x, d.c.y - 40, 'nicht repliziert!', C.cyan, 16);
    const p = this.add.particles(d.c.x, d.c.y, 'spark', { speed: { min: 60, max: 220 }, lifespan: 700, scale: { start: 0.7, end: 0 }, tint: [C.magenta, C.gold], blendMode: 'ADD', emitting: false });
    p.explode(30);
    d.c.destroy();
    if (!this.decoys.length && this.bossHp / this.bossMax <= 0.33) this.toPhase(3);
  }

  private attack() {
    const sp = state.diff.speed;
    if (this.phase === 1 || this.phase === 3) {
      this.attackCd = (this.phase === 1 ? 1100 : 1500) / sp;
      const n = this.phase === 1 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const ang = Math.PI + (i - (n - 1) / 2) * 0.28 + Phaser.Math.FloatBetween(-0.08, 0.08);
        this.headline(this.boss.x - 90, this.boss.y, Math.cos(ang) * 210 * sp, Math.sin(ang) * 210 * sp);
      }
    } else if (this.phase === 2) {
      this.attackCd = 1500 / sp;
      const src = this.decoys.length ? Phaser.Utils.Array.GetRandom(this.decoys).c : this.boss;
      const a = Phaser.Math.Angle.Between(src.x, src.y, this.ship.x, this.ship.y);
      this.headline(src.x - 30, src.y, Math.cos(a) * 200 * sp, Math.sin(a) * 200 * sp);
    }
  }

  private headline(x: number, y: number, vx: number, vy: number) {
    const t = this.add.text(x, y, Phaser.Utils.Array.GetRandom(HEADLINES), txt(15, 0xffffff, { backgroundColor: hex(C.sig), padding: { x: 6, y: 3 } })).setOrigin(0.5).setDepth(44);
    this.enemy.push({ obj: t, vx, vy, r: 18 });
  }

  private spawnWall() {
    const gap = 140 * state.diff.tolerance + 20;
    const gy = Phaser.Math.Between(ARENA.top + gap / 2 + 10, ARENA.bottom - gap / 2 - 10);
    const x = ARENA.right + 40;
    const topH = gy - gap / 2 - ARENA.top;
    const botH = ARENA.bottom - (gy + gap / 2);
    const top = this.add.rectangle(x, ARENA.top + topH / 2, 26, topH, C.sig, 0.75).setStrokeStyle(3, 0xffffff).setDepth(43);
    const bot = this.add.rectangle(x, ARENA.bottom - botH / 2, 26, botH, C.sig, 0.75).setStrokeStyle(3, 0xffffff).setDepth(43);
    const lab = this.add.text(0, 0, '🔒', txt(16, 0xffffff)).setOrigin(0.5).setDepth(44);
    this.tweens.add({ targets: lab, alpha: 0, delay: 1200, duration: 300, onComplete: () => lab.destroy() });
    lab.setPosition(x, ARENA.top + topH / 2);
    this.walls.push({ top, bot });
  }

  private damagePlayer() {
    if (!this.ship.hit()) return;
    if (this.shield > 0) {
      this.shield = 0;
      floatText(this, this.ship.x, this.ship.y - 30, 'Präreg-Schild!', C.cyan, 16);
      audio.sfx('select');
      this.time.delayedCall(10000, () => { if (this.running) this.shield = 1; });
      return;
    }
    audio.sfx('hurt');
    if (this.hearts.lose() === 0) this.lose();
  }

  private salvo() {
    this.charge = 0;
    this.drawBars();
    audio.sfx('boom');
    this.cameras.main.flash(200, 255, 220, 120);
    for (const d of [...this.drones, this.ship.img]) {
      const beam = this.add.rectangle(d.x, d.y, 900, 8, C.gold, 0.9).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(46);
      this.tweens.add({ targets: beam, scaleY: 0, alpha: 0, duration: 450, onComplete: () => beam.destroy() });
    }
    this.clearEnemy();
    if (this.decoys.length) for (const d of [...this.decoys]) { d.hp -= 4; if (d.hp <= 0) this.popDecoy(d); }
    else this.damageBoss(4 + this.drones.length * 1.5);
  }

  private clearEnemy() {
    for (const b of this.enemy) b.obj.destroy();
    this.enemy = [];
  }

  private async lose() {
    this.running = false;
    this.ship.enabled = false;
    await this.say([{ who: 'hype', text: 'HAHA! Schlagzeilen schlagen Sorgfalt!' }, { text: 'Nicht aufgeben. Replikation heißt: nochmal versuchen!' }]);
    this.scene.restart();
  }

  private async win() {
    if (!this.running && this.phase === 4) return;
    this.phase = 4;
    this.running = false;
    this.ship.enabled = false;
    this.clearEnemy();
    for (const w of this.walls) { w.top.destroy(); w.bot.destroy(); }
    this.walls = [];
    this.tweens.killTweensOf(this.boss);
    audio.sfx('boom');
    this.cameras.main.shake(600, 0.012);
    const p = this.add.particles(this.boss.x, this.boss.y, 'spark', { speed: { min: 80, max: 360 }, lifespan: 1200, scale: { start: 0.9, end: 0 }, tint: [C.magenta, C.gold, 0xffffff], blendMode: 'ADD', emitting: false });
    p.explode(120);
    this.tweens.add({ targets: this.boss, scale: 0.25, duration: 1400, ease: 'Cubic.in' });
    await this.wait(1500);
    const spark = this.add.image(this.boss.x, this.boss.y, 'glow').setScale(0.6).setTint(C.gold).setBlendMode(Phaser.BlendModes.ADD);
    this.boss.setVisible(false);
    this.tweens.add({ targets: spark, scale: 0.8, duration: 600, yoyo: true, repeat: -1 });
    await this.say([
      { who: 'hype', text: 'Ich … schrumpfe? Ohne glänzende Schlagzeilen bin ich nur noch … ein kleiner Funken Begeisterung.' },
      { text: 'Begeisterung ist toll. Solange sie auf robusten, offenen und replizierten Befunden steht.' },
      { who: 'hype', text: 'Dann begeistere ich mich ab jetzt für Replikationen. Die sind eigentlich ziemlich spannend.' },
    ]);
    const secs = (this.time.now - this.t0) / 1000;
    const timeBonus = Math.round(200 * Phaser.Math.Clamp(1 - (secs - 60) / 180, 0, 1));
    const score = 500 + this.hearts.n * 60 + timeBonus;
    this.finish(score, 'Viele Labore, offene Methoden, geteilte Daten: So entstehen Befunde, die halten.', 'ada');
  }

  get debugWin() { return () => { this.running = true; this.bossHp = 0; this.win(); }; }
}
