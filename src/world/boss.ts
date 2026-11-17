// The Gilded Curator: hoards only shiny results. It hides among gilded
// statues; only the Lantern of Openness shows which one is real.
import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import type { WorldScene } from '../scenes/WorldScene';
import { Box, Enemy, overlap } from './actors';

const T = 16;
const SPOTS: [number, number][] = [[16.5 * T, 7 * T], [27.5 * T, 7 * T], [16.5 * T, 11 * T], [27.5 * T, 11 * T], [22 * T, 9.3 * T]];

interface Coin { spr: Phaser.GameObjects.Sprite; x: number; y: number; vx: number; vy: number; t: number }

export class Curator {
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  statues: Phaser.GameObjects.Image[] = [];
  coins: Coin[] = [];
  x: number; y: number; z = 34;
  hp: number; maxHp: number;
  mode: 'wait' | 'fly' | 'land' | 'perch' | 'hurt' | 'dead' = 'wait';
  t = 0; flyT = 0; shootT = 1.4;
  spot = 4;
  active = false;
  solid?: Box;
  invT = 0;
  warned = false;
  decoyHits = 0;
  private gate?: Phaser.GameObjects.Image;

  constructor(public w: WorldScene, x: number, y: number) {
    this.x = x; this.y = y;
    this.maxHp = { easy: 4, normal: 5, hard: 6 }[state.data.difficulty];
    this.hp = this.maxHp;
    this.shadow = w.add.image(x, y, 'shadow').setScale(1.1, 0.4).setDepth(1).setAlpha(0);
    this.spr = w.add.sprite(x, y, 'curator', 0).setOrigin(0.5, 1).setVisible(false);
    if (!w.anims.exists('curator-fly')) w.anims.create({ key: 'curator-fly', frames: w.anims.generateFrameNumbers('curator', { frames: [0, 1, 0, 2] }), frameRate: 9, repeat: -1 });
    SPOTS.forEach(([sx, sy]) => this.statues.push(w.add.image(sx, sy, 'statue-gold').setOrigin(0.5, 1).setDepth(sy)));
  }

  get onScreenBody(): Box { return { x: this.x - 12, y: this.y - 30 - this.z, w: 24, h: 28 }; }

  /** Called once the player steps into the arena. */
  async start() {
    const w = this.w;
    this.active = true;
    w.cut = true;
    // seal the way back
    this.gate = w.add.image(22 * T, 15 * T, 'door-boss').setOrigin(0.5, 1).setDepth(15 * T - 16);
    w.statics.push({ x: 21 * T, y: 13 * T, w: 2 * T, h: 2 * T });
    audio.sfx('stamp');
    w.cameras.main.shake(200, 0.006);
    await w.wait(500);
    // the centre statue comes alive
    this.statues[4].setVisible(false);
    this.spr.setVisible(true).setPosition(this.x, this.y).setFrame(3);
    audio.sfx('screech');
    await w.say([
      { who: 'curator', text: 'LIGHT? In MY gallery?! Only the shiniest results hang here. The dull ones go in the drawers!' },
      { who: 'ada', text: 'The Gilded Curator. It decides what the world gets to see... and it only likes gold.' },
    ]);
    audio.play('boss');
    w.cut = false;
    this.takeOff();
  }

  takeOff() {
    this.mode = 'fly';
    this.flyT = 4.5 + Math.random() * 1.5 - (this.hp <= this.maxHp / 2 ? 1.2 : 0);
    this.solid = undefined;
    this.statues.forEach((s, i) => s.setVisible(i !== this.spot || this.mode !== 'fly' ? true : true));
    this.statues[this.spot].setVisible(true);
    this.spr.setVisible(true).play('curator-fly');
    this.shadow.setAlpha(1);
    audio.sfx('whoosh');
  }

  land() {
    // choose a new statue spot and hide there
    this.mode = 'land';
    const options = [0, 1, 2, 3, 4].filter((i) => i !== this.spot);
    this.spot = options[Math.floor(Math.random() * options.length)];
    this.t = 0;
  }

  update(dt: number) {
    const w = this.w, p = w.player;
    this.invT = Math.max(0, this.invT - dt);
    if (!this.active) {
      if (this.mode === 'wait' && p.y < 13 * T - 2 && !w.busy) { this.mode = 'perch'; this.start(); }
      return;
    }
    this.t += dt;
    const lit = w.lanternOn;
    // statues: decoys turn to plain stone in the lantern light
    this.statues.forEach((s, i) => {
      const near = Math.hypot(s.x - p.x, s.y - p.y) < 190;
      const isMe = this.mode === 'perch' && i === this.spot;
      s.setTexture(lit && near && !isMe ? 'statue-stone' : 'statue-gold');
      if (isMe && lit && near) s.setX(SPOTS[i][0] + Math.sin(this.t * 40) * 0.8);
      else s.setX(SPOTS[i][0]);
    });

    if (this.mode === 'fly') {
      const hard = this.hp <= this.maxHp / 2;
      const cx = 22 * T, cy = 8 * T;
      const tx = cx + Math.sin(this.t * (hard ? 1.3 : 0.9)) * 120;
      const ty = cy + Math.sin(this.t * (hard ? 2.1 : 1.6)) * 40;
      this.x += (tx - this.x) * Math.min(1, dt * 2.5);
      this.y += (ty - this.y) * Math.min(1, dt * 2.5);
      this.z += (34 - this.z) * Math.min(1, dt * 3);
      this.shootT -= dt;
      if (this.shootT <= 0 && !w.busy) {
        this.shootT = hard ? 1.0 : 1.5;
        const a = Math.atan2(p.y - 8 - (this.y - this.z - 16), p.x - this.x);
        const n = hard ? 5 : 3;
        for (let i = 0; i < n; i++) this.coin(a + (i - (n - 1) / 2) * 0.28, hard ? 120 : 95);
        audio.sfx('coin');
      }
      this.flyT -= dt;
      if (this.flyT <= 0) this.land();
    } else if (this.mode === 'land') {
      const [sx, sy] = SPOTS[this.spot];
      this.x += (sx - this.x) * Math.min(1, dt * 4);
      this.y += (sy - this.y) * Math.min(1, dt * 4);
      this.z = Math.max(0, this.z - dt * 60);
      if (Math.hypot(sx - this.x, sy - this.y) < 2 && this.z <= 0) {
        // vanish into the statue with a golden flash
        this.mode = 'perch';
        this.t = 0;
        this.x = sx; this.y = sy;
        this.spr.setVisible(false).stop();
        this.shadow.setAlpha(0);
        this.statues[this.spot].setVisible(true);
        this.solid = { x: sx - 9, y: sy - 9, w: 18, h: 8 };
        const fl = w.add.image(sx, sy - 16, 'glow').setTint(0xf2c14e).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setDepth(9e5 + 3);
        w.tweens.add({ targets: fl, scale: 1.2, alpha: 0, duration: 500, onComplete: () => fl.destroy() });
        audio.sfx('shine');
        this.shuffleIfHard();
      }
    } else if (this.mode === 'perch') {
      if (this.t > 7) { this.statues[this.spot].setVisible(true); this.takeOff(); }
    } else if (this.mode === 'hurt') {
      this.z = Math.min(34, this.z + dt * 70);
      if (this.t > 0.7) this.takeOff();
    }

    // coins
    for (const c of this.coins) {
      c.t += dt;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.spr.setPosition(Math.round(c.x), Math.round(c.y)).setDepth(c.y + 10).setFrame(Math.floor(c.t * 12) % 4);
      const box = { x: c.x - 3, y: c.y - 3, w: 6, h: 6 };
      if (overlap(box, p.body)) { p.hurt(c.x, c.y, state.diff.dmg); c.t = 99; }
      else if (p.attackT > 0 && overlap(box, p.swordBox())) { c.t = 99; audio.sfx('clang'); w.poof(c.x, c.y); }
      if (w.tileAt(c.x, c.y) === 1 && w.terrainAt(c.x, c.y) === 'wall') c.t = 99;
      if (c.t > 4) c.spr.destroy();
    }
    this.coins = this.coins.filter((c) => c.t <= 4);

    if (this.spr.visible) {
      this.spr.setPosition(Math.round(this.x), Math.round(this.y - this.z)).setDepth(this.y + 40);
      this.spr.setFlipX(p.x < this.x);
      const flash = this.invT > 0 && Math.floor(this.invT * 20) % 2 === 0;
      if (flash) this.spr.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else this.spr.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      this.shadow.setPosition(this.x, this.y - 1).setScale(1.1 - this.z / 100, 0.4);
      // body contact while low
      if (this.z < 12 && overlap(this.onScreenBody, p.body) && !w.busy) p.hurt(this.x, this.y, state.diff.dmg);
    }
  }

  private coin(a: number, speed: number) {
    const sx = this.x, sy = this.y - this.z - 18;
    const spr = this.w.add.sprite(sx, sy, 'coin', 0);
    this.coins.push({ spr, x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: 0 });
  }

  private shuffleIfHard() {
    if (this.hp > this.maxHp / 2) return;
    // decoys glide to new spots so the player has to look again
    const w = this.w;
    const order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
    this.statues.forEach((s, i) => {
      if (i === this.spot) return;
      const j = order[i] === this.spot ? i : order[i];
      void j;
    });
    w.cameras.main.shake(150, 0.003);
  }

  /** Sword swing check from the world. */
  trySword(sb: Box) {
    const w = this.w;
    if (!this.active || this.mode === 'dead') return;
    if (this.mode === 'perch') {
      this.statues.forEach((s, i) => {
        const box = { x: s.x - 10, y: s.y - 30, w: 20, h: 30 };
        if (!overlap(sb, box) || w.player.hitThisSwing.has(s)) return;
        w.player.hitThisSwing.add(s);
        if (i === this.spot) this.damage();
        else this.decoyHit(s);
      });
    } else if ((this.mode === 'fly' || this.mode === 'hurt') && this.z < 14 && this.invT <= 0 && overlap(sb, this.onScreenBody)) {
      this.damage();
    }
  }

  private decoyHit(s: Phaser.GameObjects.Image) {
    const w = this.w;
    audio.sfx('clang');
    w.tweens.add({ targets: s, x: s.x + 2, duration: 40, yoyo: true, repeat: 3 });
    this.decoyHits++;
    if (w.enemies.length < 3) {
      const e = new Enemy(w, 'glimmerling', s.x + (Math.random() < 0.5 ? -16 : 16), s.y + 6);
      w.enemies.push(e);
      w.poof(e.x, e.y - 6);
    }
    if (!this.warned && this.decoyHits >= 1) {
      this.warned = true;
      w.ui.toast(w.lanternOn ? 'Gold paint! Strike the statue that stays gold in the light.' : 'Just gold paint! Raise the lantern (L) to see which one is real.', 0x2bb7d6);
    }
  }

  private damage() {
    const w = this.w;
    this.hp--;
    this.invT = 0.7;
    audio.sfx('bosshit');
    w.hitFx(this.x, this.y - 18 - this.z, true);
    this.solid = undefined;
    this.statues[this.spot].setVisible(false);
    this.spr.setVisible(true).setFrame(3).stop();
    this.shadow.setAlpha(1);
    this.mode = 'hurt'; this.t = 0;
    // burst of coins on hit
    for (let i = 0; i < 8; i++) this.coin((i / 8) * Math.PI * 2, 70);
    if (this.hp <= 0) this.defeat();
  }

  private async defeat() {
    const w = this.w;
    this.mode = 'dead';
    w.cut = true;
    for (const c of this.coins) c.spr.destroy();
    this.coins = [];
    for (const e of w.enemies) e.die();
    audio.stop();
    this.spr.setFrame(3);
    for (let i = 0; i < 10; i++) {
      w.time.delayedCall(i * 140, () => {
        audio.sfx('boom');
        w.poof(this.x + Phaser.Math.Between(-20, 20), this.y - Phaser.Math.Between(10, 40));
      });
    }
    w.tweens.add({ targets: this.spr, alpha: 0, delay: 1300, duration: 600 });
    await w.wait(1500);
    w.ui.flash(0xfff6d8, 900);
    this.shadow.destroy();
    // the hoard bursts: gold turns into paper, the paper turns into light
    for (let i = 0; i < 40; i++) {
      const pg = w.add.image(this.x, this.y - 20, i % 3 ? 'px' : 'sparkle').setTint(i % 2 ? 0xf4efe6 : 0xf2c14e).setDepth(9e5 + 3).setScale(i % 3 ? 2 : 1);
      w.tweens.add({ targets: pg, x: this.x + Phaser.Math.Between(-160, 160), y: this.y - Phaser.Math.Between(40, 200), alpha: 0, duration: 1800 + Math.random() * 800, ease: 'Cubic.out', onComplete: () => pg.destroy() });
    }
    this.statues.forEach((s) => s.setTexture('statue-stone'));
    await w.wait(1200);
    await w.say([
      { who: 'curator', text: 'My collection... it was so SHINY...' },
      { who: 'ada', text: 'Shiny, but lopsided: every hit on the wall, every miss in a drawer. Look, the hidden results are flying home!' },
    ]);
    state.set('boss-archive');
    state.setQuest('main', 5);
    w.note('pubbias');
    // heart container
    state.data.maxHp += 2;
    state.data.hp = state.data.maxHp;
    await w.getItem('heart-big', 'Heart Container!', [{ text: 'Your maximum health grows by one heart.' }]);
    state.save();
    audio.play('archive');
    // portal home
    const portal = w.add.image(22 * T, 9 * T, 'glow').setTint(0x5ef0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0).setDepth(2);
    w.tweens.add({ targets: portal, scale: 0.6, duration: 800, ease: 'Back.out' });
    w.tweens.add({ targets: portal, angle: 360, duration: 4000, repeat: -1 });
    w.area.warps.push({ x: 21.5, y: 8.5, w: 1, h: 1, to: 'haven', spawn: 'fromArchive' });
    this.gate?.destroy();
    w.statics.pop();
    w.cut = false;
  }
}
