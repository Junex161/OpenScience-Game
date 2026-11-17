// Moving things: the player, NPCs, enemies, the Archive boss, pickups.
import Phaser from 'phaser';
import { Dir } from '../art/characters';
import { cframe } from '../art/index';
import { audio } from '../core/audio';
import { state } from '../core/state';
import type { WorldScene } from '../scenes/WorldScene';

export interface Box { x: number; y: number; w: number; h: number }
export const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export type Facing = 'down' | 'up' | 'left' | 'right';
export const FACE_VEC: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** Shared helper: sprite frame for a chibi facing + animation frame. */
export function chibiFrame(f: Facing, n: number) {
  const dir: Dir = f === 'left' || f === 'right' ? 'side' : f;
  return cframe(dir, n);
}

// ------------------------------------------------------------------
export class Player {
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  blade: Phaser.GameObjects.Image;
  slashFx: Phaser.GameObjects.Image;
  held?: Phaser.GameObjects.Image;
  x: number; y: number;
  facing: Facing = 'down';
  walkT = 0;
  attackT = 0;
  hurtT = 0;
  invT = 0;
  kx = 0; ky = 0;
  falling = 0;
  safe: [number, number];
  hitThisSwing = new Set<unknown>();

  constructor(public w: WorldScene, x: number, y: number, facing: Facing) {
    this.x = x; this.y = y; this.facing = facing;
    this.safe = [x, y];
    this.shadow = w.add.image(x, y, 'shadow').setScale(0.5, 0.22).setDepth(1);
    this.spr = w.add.sprite(x, y, 'ch-nova', chibiFrame(facing, 0)).setOrigin(0.5, 1);
    this.blade = w.add.image(x, y, 'blade').setOrigin(0.05, 0.5).setVisible(false).setScale(1.15);
    this.slashFx = w.add.image(x, y, 'slash').setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setScale(1.35);
  }

  get feet(): Box { return { x: this.x - 4, y: this.y - 4, w: 8, h: 4 }; }
  get body(): Box { return { x: this.x - 5, y: this.y - 15, w: 10, h: 14 }; }

  swordBox(): Box {
    const { x, y } = this;
    switch (this.facing) {
      case 'right': return { x: x + 2, y: y - 19, w: 22, h: 20 };
      case 'left': return { x: x - 24, y: y - 19, w: 22, h: 20 };
      case 'up': return { x: x - 12, y: y - 32, w: 24, h: 22 };
      default: return { x: x - 12, y: y - 7, w: 24, h: 22 };
    }
  }

  frontBox(reach = 12): Box {
    const [dx, dy] = FACE_VEC[this.facing];
    const cx = this.x + dx * reach, cy = this.y - 5 + dy * reach;
    return { x: cx - 7, y: cy - 7, w: 14, h: 14 };
  }

  attack() {
    if (this.attackT > 0 || !state.has('sword')) return;
    this.attackT = 0.24;
    this.hitThisSwing.clear();
    audio.sfx('sword');
    // a small lunge into the swing
    const [dx, dy] = FACE_VEC[this.facing];
    this.w.moveBox(this, dx * 4, dy * 4);
  }

  update(dt: number, ix: number, iy: number) {
    const w = this.w;
    if (this.falling > 0) {
      this.falling -= dt;
      this.spr.setScale(Math.max(0, this.falling / 0.6)).setAngle(this.spr.angle + dt * 600);
      if (this.falling <= 0) w.playerFell();
      this.sync();
      return;
    }
    this.invT = Math.max(0, this.invT - dt);
    let moving = false;
    if (this.hurtT > 0) {
      this.hurtT -= dt;
      w.moveBox(this, this.kx * dt, this.ky * dt);
    } else if (this.attackT > 0) {
      this.attackT -= dt;
    } else if (ix || iy) {
      const len = Math.hypot(ix, iy);
      const sp = (w.lanternOn ? 72 : 94) * (state.god && state.admin ? 1.6 : 1);
      w.moveBox(this, (ix / len) * sp * dt, (iy / len) * sp * dt, true);
      // facing: prefer the axis that changed most recently / dominant
      if (Math.abs(ix) > Math.abs(iy)) this.facing = ix > 0 ? 'right' : 'left';
      else if (Math.abs(iy) > Math.abs(ix)) this.facing = iy > 0 ? 'down' : 'up';
      else if (!(this.facing === (ix > 0 ? 'right' : 'left') || this.facing === (iy > 0 ? 'down' : 'up'))) this.facing = iy > 0 ? 'down' : 'up';
      moving = true;
    }
    // animation
    let fr = 0;
    if (this.attackT > 0) fr = 3;
    else if (moving) {
      this.walkT += dt;
      fr = [1, 0, 2, 0][Math.floor(this.walkT / 0.1) % 4];
    }
    this.spr.setFrame(chibiFrame(this.facing, fr));
    this.spr.setFlipX(this.facing === 'left');
    // falling into the void when standing on an unlit hidden bridge
    if (w.isPit(this.x, this.y - 2) && !(state.god && state.admin)) {
      this.falling = 0.6;
      audio.sfx('fall');
    } else if (!moving || Math.random() < 0.2) {
      if (w.isSafe(this.x, this.y)) this.safe = [this.x, this.y];
    }
    this.sync();
  }

  sync() {
    const blink = this.invT > 0 && Math.floor(this.invT * 16) % 2 === 0;
    this.spr.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(this.y).setAlpha(blink ? 0.35 : 1);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y - 1));
    this.shadow.setVisible(this.falling <= 0);
    // sword sweep
    if (this.attackT > 0) {
      const t = 1 - this.attackT / 0.24;
      const base = { right: 0, down: 90, left: 180, up: -90 }[this.facing];
      const sweep = this.facing === 'left' ? 1 : -1;
      const ang = base + sweep * (-75 + Math.min(1, t * 1.6) * 150);
      const cx = this.x + (this.facing === 'left' ? -2 : this.facing === 'right' ? 2 : 0);
      const cy = this.y - 10;
      this.blade.setVisible(true).setPosition(cx, cy).setAngle(ang).setDepth(this.facing === 'up' ? this.y - 1 : this.y + 1);
      this.slashFx.setVisible(t > 0.15).setPosition(cx, cy).setAngle(base).setAlpha(1 - t).setDepth(this.y + 2).setFlipY(this.facing === 'left');
    } else {
      this.blade.setVisible(false);
      this.slashFx.setVisible(false);
    }
    if (this.held) this.held.setPosition(Math.round(this.x), Math.round(this.y - 25)).setDepth(this.y + 5);
  }

  hurt(fromX: number, fromY: number, dmg: number) {
    if (this.invT > 0 || this.falling > 0) return false;
    if (state.god && state.admin) return false;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.kx = Math.cos(a) * 170; this.ky = Math.sin(a) * 170;
    this.hurtT = 0.16; this.invT = 1.1;
    this.attackT = 0;
    audio.sfx('hurt');
    this.w.damagePlayer(dmg);
    return true;
  }

  destroy() { this.spr.destroy(); this.shadow.destroy(); this.blade.destroy(); this.slashFx.destroy(); this.held?.destroy(); }
}

// ------------------------------------------------------------------
export class Npc {
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  x: number; y: number;
  facing: Facing;
  home: [number, number];
  t = Math.random() * 2;
  vx = 0; vy = 0;
  walkT = 0;
  talking = false;
  hidden = false;
  scripted = false;

  constructor(public w: WorldScene, public id: string, public look: string, x: number, y: number, facing: Facing, public wander = 0, public behind = false) {
    this.x = x; this.y = y; this.facing = facing; this.home = [x, y];
    this.shadow = w.add.image(x, y, 'shadow').setScale(0.5, 0.22).setDepth(1);
    this.spr = w.add.sprite(x, y, `ch-${look}`, chibiFrame(facing, 0)).setOrigin(0.5, 1);
    if (behind) this.shadow.setVisible(false);
  }

  get feet(): Box { return { x: this.x - 5, y: this.y - 5, w: 10, h: 5 }; }
  get talkBox(): Box { return { x: this.x - 8, y: this.y - 16, w: 16, h: 18 + (this.behind ? 16 : 0) }; }

  face(tx: number, ty: number) {
    const dx = tx - this.x, dy = ty - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  update(dt: number) {
    let moving = false;
    if (this.wander && !this.talking && !this.scripted) {
      this.t -= dt;
      if (this.t <= 0) {
        if (this.vx || this.vy) { this.vx = 0; this.vy = 0; this.t = 1 + Math.random() * 2.5; }
        else {
          const dirs: [number, number, Facing][] = [[1, 0, 'right'], [-1, 0, 'left'], [0, 1, 'down'], [0, -1, 'up']];
          let d = dirs[Math.floor(Math.random() * 4)];
          // drift home when too far
          const [hx, hy] = this.home;
          if (Math.hypot(this.x - hx, this.y - hy) > this.wander * 16) d = Math.abs(this.x - hx) > Math.abs(this.y - hy) ? (this.x > hx ? dirs[1] : dirs[0]) : this.y > hy ? dirs[3] : dirs[2];
          this.vx = d[0] * 26; this.vy = d[1] * 26; this.facing = d[2];
          this.t = 0.5 + Math.random();
        }
      }
      if (this.vx || this.vy) {
        const ok = this.w.moveBox(this, this.vx * dt, this.vy * dt);
        if (!ok) { this.vx = 0; this.vy = 0; }
        moving = true;
      }
    }
    let fr = 0;
    if (moving) { this.walkT += dt; fr = [1, 0, 2, 0][Math.floor(this.walkT / 0.13) % 4]; }
    if (this.scripted) fr = this.walkT > 0 ? [1, 0, 2, 0][Math.floor(this.walkT / 0.13) % 4] : 0;
    this.spr.setFrame(chibiFrame(this.facing, fr)).setFlipX(this.facing === 'left');
    this.spr.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y - 1));
    this.spr.setVisible(!this.hidden); this.shadow.setVisible(!this.hidden && !this.behind);
  }

  destroy() { this.spr.destroy(); this.shadow.destroy(); }
}

// ------------------------------------------------------------------
export type EnemyKind = 'glimmerling' | 'glimmerling-pink' | 'noisebat' | 'pagewing';

const ENEMY_STATS: Record<EnemyKind, { hp: number; speed: number; dmg: number; fly: boolean }> = {
  glimmerling: { hp: 2, speed: 62, dmg: 1, fly: false },
  'glimmerling-pink': { hp: 3, speed: 74, dmg: 1, fly: false },
  noisebat: { hp: 1, speed: 70, dmg: 1, fly: true },
  pagewing: { hp: 2, speed: 48, dmg: 1, fly: true },
};

export class Enemy {
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  x: number; y: number;
  hp: number;
  vx = 0; vy = 0;
  t = Math.random();
  state: 'idle' | 'move' | 'knock' | 'dash' = 'idle';
  stateT = Math.random();
  invT = 0;
  anim = Math.random() * 10;
  dead = false;
  z = 0;
  /** Extra height while dropping in from the sky (opening raid). */
  drop = 0;

  constructor(public w: WorldScene, public kind: EnemyKind, x: number, y: number) {
    this.x = x; this.y = y;
    this.hp = ENEMY_STATS[kind].hp + (state.data.difficulty === 'hard' ? 1 : 0);
    this.shadow = w.add.image(x, y, 'shadow').setScale(0.42, 0.2).setDepth(1);
    this.spr = w.add.sprite(x, y, kind, 0).setOrigin(0.5, 1);
    if (ENEMY_STATS[kind].fly) this.z = 8;
  }

  get stats() { return ENEMY_STATS[this.kind]; }
  get feet(): Box { return { x: this.x - 5, y: this.y - 4, w: 10, h: 4 }; }
  get body(): Box { return { x: this.x - 6, y: this.y - 12 - this.z, w: 12, h: 11 }; }

  update(dt: number) {
    const w = this.w, p = w.player;
    const sp = this.stats.speed * state.diff.enemySpeed;
    this.anim += dt;
    this.invT = Math.max(0, this.invT - dt);
    this.stateT -= dt;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (this.state === 'knock') {
      w.moveBox(this, this.vx * dt, this.vy * dt);
      this.vx *= 0.86; this.vy *= 0.86;
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 0.4; }
    } else if (this.kind.startsWith('glimmerling')) {
      if (this.state === 'idle' && this.stateT <= 0) {
        this.state = 'move';
        this.stateT = 0.42;
        const a = dist < 110 && !w.busy ? Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6 : Math.random() * Math.PI * 2;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
      } else if (this.state === 'move') {
        const ok = w.moveBox(this, this.vx * dt, this.vy * dt);
        if (!ok) { this.vx = -this.vx; this.vy = -this.vy; }
        if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 0.5 + Math.random() * 0.7; }
      }
      const fr = this.state === 'move' ? (this.stateT > 0.3 ? 3 : this.stateT > 0.1 ? 2 : 1) : Math.floor(this.anim * 3) % 2;
      this.spr.setFrame(fr);
      this.z = this.state === 'move' ? Math.sin((1 - this.stateT / 0.42) * Math.PI) * 5 : 0;
    } else {
      // flyers: wobble around, dash at the player when close
      if (this.state === 'dash') {
        w.moveBox(this, this.vx * dt, this.vy * dt, false, true);
        if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 0.8 + Math.random(); }
      } else {
        this.t += dt;
        const wob = this.kind === 'noisebat' ? 2.6 : 1.4;
        const ax = Math.sin(this.t * wob + this.anim) * sp * 0.7 + (dist < 150 ? (dx / (dist || 1)) * sp * 0.35 : 0);
        const ay = Math.cos(this.t * wob * 1.3) * sp * 0.6 + (dist < 150 ? (dy / (dist || 1)) * sp * 0.35 : 0);
        w.moveBox(this, ax * dt, ay * dt, false, true);
        if (this.stateT <= 0 && dist < 80 && !w.busy) {
          this.state = 'dash'; this.stateT = 0.45;
          this.vx = (dx / dist) * sp * 2.1; this.vy = (dy / dist) * sp * 2.1;
        } else if (this.stateT <= 0) this.stateT = 0.5;
      }
      this.spr.setFrame(Math.floor(this.anim * (this.kind === 'noisebat' ? 10 : 6)) % 2);
      this.z = 8 + Math.sin(this.anim * 3) * 2;
    }
    // contact damage
    if (!w.busy && overlap(this.body, p.body)) p.hurt(this.x, this.y, this.stats.dmg * state.diff.dmg);
    this.sync();
  }

  sync() {
    this.spr.setPosition(Math.round(this.x), Math.round(this.y - this.z - this.drop)).setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y - 1));
    const flash = this.invT > 0 && Math.floor(this.invT * 20) % 2 === 0;
    if (flash) this.spr.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else this.spr.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.spr.setFlipX(this.w.player.x < this.x && this.kind !== 'noisebat');
  }

  hit(fromX: number, fromY: number, dmg = 1) {
    if (this.invT > 0 || this.dead) return;
    this.hp -= dmg;
    this.invT = 0.3;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.vx = Math.cos(a) * 230; this.vy = Math.sin(a) * 230;
    this.state = 'knock'; this.stateT = 0.18;
    audio.sfx('hit');
    this.w.hitFx(this.x, this.y - 7 - this.z, this.hp <= 0);
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.w.burst(this.x, this.y - 6, this.kind === 'glimmerling-pink' ? 0xff7ac8 : this.kind.startsWith('glimmerling') ? 0xf2c14e : 0xb4a6d4);
    this.w.dropLoot(this.x, this.y, this.kind.startsWith('glimmerling') ? 0.75 : 0.5);
    this.destroy();
  }

  destroy() { this.spr.destroy(); this.shadow.destroy(); }
}

// ------------------------------------------------------------------
export class Pickup {
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  t = 0;
  z = 0;
  vz = 90;
  dead = false;

  constructor(public w: WorldScene, public kind: 'shard' | 'shard5' | 'heart', public x: number, public y: number, public life = 12) {
    const tex = kind === 'heart' ? 'heart-full' : 'shard';
    this.shadow = w.add.image(x, y, 'shadow').setScale(0.25, 0.12).setDepth(1);
    this.spr = w.add.sprite(x, y, tex, 0).setOrigin(0.5, 1);
    if (kind === 'shard5') this.spr.setTint(0xff9ff3);
  }

  get box(): Box { return { x: this.x - 5, y: this.y - 10 - this.z, w: 10, h: 10 }; }

  update(dt: number) {
    this.t += dt;
    if (this.vz !== 0 || this.z > 0) {
      this.vz -= 420 * dt;
      this.z = Math.max(0, this.z + this.vz * dt);
      if (this.z === 0) this.vz = Math.abs(this.vz) > 40 ? -this.vz * 0.35 : 0;
    }
    if (this.kind !== 'heart') this.spr.setFrame(Math.floor(this.t * 8) % 4);
    this.spr.setPosition(Math.round(this.x), Math.round(this.y - this.z)).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 1);
    if (this.life - this.t < 3) this.spr.setVisible(Math.floor(this.t * 10) % 2 === 0);
    if (this.t > this.life) this.destroy();
    if (this.t > 0.25 && overlap(this.box, this.w.player.body)) this.collect();
  }

  collect() {
    if (this.kind === 'heart') {
      state.data.hp = Math.min(state.data.maxHp, state.data.hp + 2);
      audio.sfx('heart');
    } else {
      state.data.shards = Math.min(999, state.data.shards + (this.kind === 'shard5' ? 5 : 1));
      audio.sfx('coin');
    }
    this.w.ui.refresh();
    this.destroy();
  }

  destroy() { this.dead = true; this.spr.destroy(); this.shadow.destroy(); }
}
