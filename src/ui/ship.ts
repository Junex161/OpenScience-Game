import Phaser from 'phaser';
import { C } from './theme';

/** Arcade ship with gentle inertia, used in the action chapters. */
export class Ship {
  img: Phaser.GameObjects.Image;
  vel = new Phaser.Math.Vector2();
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter;
  enabled = true;
  invuln = 0;
  bounds: Phaser.Geom.Rectangle;
  faceVelocity = true;

  constructor(private scene: Phaser.Scene, x: number, y: number, bounds: Phaser.Geom.Rectangle, private speed = 320, texture = 'ship') {
    this.bounds = bounds;
    this.img = scene.add.image(x, y, texture).setDepth(50);
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.trail = scene.add.particles(0, 0, 'spark', {
      lifespan: 380, speed: { min: 20, max: 50 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [C.cyan, 0xffffff, C.violet], blendMode: 'ADD', frequency: 18, emitting: false,
    }).setDepth(49);
  }

  get x() { return this.img.x; }
  get y() { return this.img.y; }

  update(dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    const k = this.keys;
    const input = new Phaser.Math.Vector2(
      (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0),
      (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0),
    );
    if (!this.enabled) input.set(0, 0);
    if (input.lengthSq() > 0) input.normalize().scale(this.speed * 4 * dt);
    this.vel.add(input);
    this.vel.scale(Math.pow(0.03, dt));
    if (this.vel.length() > this.speed) this.vel.setLength(this.speed);
    const b = this.bounds;
    this.img.x = Phaser.Math.Clamp(this.img.x + this.vel.x * dt, b.left, b.right);
    this.img.y = Phaser.Math.Clamp(this.img.y + this.vel.y * dt, b.top, b.bottom);
    if (this.faceVelocity && this.vel.length() > 30) this.img.rotation = Phaser.Math.Angle.RotateTo(this.img.rotation, this.vel.angle(), 8 * dt);
    const moving = input.lengthSq() > 0;
    this.trail.emitting = moving;
    const back = new Phaser.Math.Vector2(-24, 0).rotate(this.img.rotation);
    this.trail.setPosition(this.img.x + back.x, this.img.y + back.y);
    if (this.invuln > 0) {
      this.invuln -= dtMs;
      this.img.setAlpha(Math.floor(this.invuln / 80) % 2 ? 0.3 : 1);
      if (this.invuln <= 0) this.img.setAlpha(1);
    }
  }

  hit(): boolean {
    if (this.invuln > 0) return false;
    this.invuln = 1400;
    this.scene.cameras.main.shake(160, 0.008);
    return true;
  }
}

/** Heart display for action chapters. */
export class Hearts {
  private icons: Phaser.GameObjects.Text[] = [];
  constructor(scene: Phaser.Scene, public n: number, x = 20, y = 52) {
    for (let i = 0; i < n; i++) this.icons.push(scene.add.text(x + i * 26, y, '♥', { fontFamily: 'Fredoka, sans-serif', fontSize: '24px', color: '#ff5c7a' }).setDepth(4001).setScrollFactor(0));
  }
  lose() {
    this.n = Math.max(0, this.n - 1);
    this.icons.forEach((ic, i) => ic.setAlpha(i < this.n ? 1 : 0.2));
    return this.n;
  }
}
