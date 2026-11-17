// The playable world: builds an area from its map, runs the player,
// NPCs, enemies, props, lighting, warps and hands story beats to content.ts.
import Phaser from 'phaser';
import { buildArt } from '../art/index';
import { Pix, single } from '../art/pixel';
import { renderGround, SOLID_TERRAIN, Terrain, TILE } from '../art/terrain';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { Box, Enemy, EnemyKind, Facing, Npc, overlap, Pickup, Player } from '../world/actors';
import { Curator } from '../world/boss';
import { objective, onEnter, onProp, onTalk, onTick, setupArea, warpAllowed } from '../world/content';
import { CHAR_OBJECT, KINDS } from '../world/kinds';
import { AREAS, AreaDef } from '../world/maps';
import type { Line, UIScene } from './UIScene';

export const ZOOM = 4;
const VW = 1920 / ZOOM, VH = 1080 / ZOOM;
/** Moonlight: daylight-coloured props are cooled down outdoors. */
const NIGHT = 0x9aa2e6;
const NIGHT_NPC = 0xd0d4ff;
type Room = NonNullable<AreaDef['rooms']>[number];

export class Prop {
  spr: Phaser.GameObjects.Sprite;
  solid?: Box;
  glow?: Phaser.GameObjects.Image;
  lights: Phaser.GameObjects.Image[] = [];
  alive = true;
  constructor(public w: WorldScene, public kind: string, public x: number, public y: number, public id?: string, public data: Record<string, unknown> = {}) {
    const k = KINDS[kind];
    this.spr = w.add.sprite(Math.round(x), Math.round(y), k.tex, 0).setOrigin(0.5, k.originY ?? 1).setDepth(k.tags?.includes('wall') ? y - 16 : y);
    if (k.frames) {
      const key = `${k.tex}-anim`;
      if (!w.anims.exists(key)) w.anims.create({ key, frames: w.anims.generateFrameNumbers(k.tex, { start: 0, end: k.frames - 1 }), frameRate: k.fps ?? 4, repeat: -1 });
      this.spr.play({ key, startFrame: Math.floor(Math.random() * k.frames) });
    }
    if (k.solid) this.solid = { x: x + k.solid[0], y: y + k.solid[1], w: k.solid[2], h: k.solid[3] };
    const outdoors = w.area.theme !== 'dungeon';
    if (outdoors && !k.lit) this.spr.setTint(NIGHT);
    if (outdoors) for (const [lx, ly, tint, sc] of k.lights ?? []) {
      const l = w.add.image(x + lx, y + ly, 'softglow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(sc).setAlpha(0.85).setDepth(9e5 + 1);
      w.tweens.add({ targets: l, alpha: 0.6, duration: 900 + Math.random() * 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.lights.push(l);
    }
    if (k.glow !== undefined) {
      const gy = kind === 'lamp' ? y - 23 : kind === 'torch' ? y - 12 : kind === 'beacon' ? y - 34 : y - 6;
      if (kind === 'beacon') this.spr.setDepth(y);
      this.glow = w.add.image(x, gy, 'glow').setTint(k.glow).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(kind === 'beacon' ? 0.9 : kind === 'lamp' || kind === 'torch' ? 0.55 : 0.3).setAlpha(kind === 'mushroom' ? 0.35 : 0.5).setDepth(9e5 + 1);
      w.tweens.add({ targets: this.glow, alpha: this.glow.alpha * 0.6, duration: 600 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }
  get tags() { return KINDS[this.kind].tags ?? []; }
  get box(): Box { return this.solid ?? { x: this.x - 7, y: this.y - 12, w: 14, h: 12 }; }
  setTexture(t: string) { this.spr.setTexture(t); }
  remove() { this.alive = false; this.solid = undefined; this.spr.destroy(); this.glow?.destroy(); for (const l of this.lights) l.destroy(); }
}

export class WorldScene extends Phaser.Scene {
  area!: AreaDef;
  spawnId = 'start';
  terrain: Terrain[][] = [];
  grid!: Uint8Array; // 0 free, 1 solid, 2 hidden bridge (solid unless lit), 3 tree
  statics: Box[] = [];
  props: Prop[] = [];
  npcs: Npc[] = [];
  enemies: Enemy[] = [];
  pickups: Pickup[] = [];
  boss?: Curator;
  player!: Player;
  ui!: UIScene;
  drone!: Phaser.GameObjects.Sprite;
  lanternOn = false;
  lanternGlow!: Phaser.GameObjects.Image;
  darkness?: Phaser.GameObjects.Image;
  darkRects: Phaser.GameObjects.Rectangle[] = [];
  ghostBridges: Phaser.GameObjects.Image[] = [];
  prompt!: Phaser.GameObjects.Image;
  cut = false; // cutscene lock
  warping = false;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  extraTick: ((dt: number) => void)[] = [];
  hitStop = 0;
  room?: Room;
  sliding = false;
  private slideDir: [number, number] = [0, 0];
  private camPos = { x: 0, y: 0 };
  private roomMask: Phaser.GameObjects.Rectangle[] = [];
  private lastPos: [number, number] = [0, 0];
  private sky: Phaser.GameObjects.TileSprite[] = [];
  private planet?: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private lastInteract = 0;

  constructor() { super('world'); }

  init(data: { area?: string; spawn?: string }) {
    this.area = AREAS[data.area ?? state.data.area] ?? AREAS.haven;
    this.spawnId = data.spawn ?? state.data.spawn;
    if (!this.area.spawns[this.spawnId]) this.spawnId = Object.keys(this.area.spawns)[0];
    state.data.area = this.area.id;
    state.data.spawn = this.spawnId;
    state.save();
    this.props = []; this.npcs = []; this.enemies = []; this.pickups = []; this.statics = []; this.ghostBridges = []; this.darkRects = [];
    this.boss = undefined; this.darkness = undefined; this.lanternOn = false; this.cut = false; this.warping = false; this.extraTick = [];
    this.room = undefined; this.sliding = false; this.roomMask = []; this.sky = []; this.planet = undefined; this.hitStop = 0;
  }

  get busy() { return this.cut || this.warping || this.sliding || this.ui.dialogOpen || this.ui.menuOpen; }

  create() {
    buildArt(this);
    this.ui = this.scene.get('ui') as UIScene;
    if (!this.scene.isActive('ui') && !this.scene.isPaused('ui')) { this.scene.launch('ui'); this.scene.bringToTop('ui'); }
    const a = this.area;
    const PW = a.w * TILE, PH = a.h * TILE;

    // ---- ground ----
    const gkey = `ground-${a.id}`;
    const shadeTiles = new Set<number>();
    const treeCh = (c?: string) => c === 'T' || c === 'Y' || c === 'D';
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++)
      if (treeCh(a.rows[y][x]) && treeCh(a.rows[y - 1]?.[x]) && treeCh(a.rows[y + 1]?.[x]) && treeCh(a.rows[y][x - 1]) && treeCh(a.rows[y][x + 1])) shadeTiles.add(y * a.w + x);
    const g = renderGround(a.rows, a.w, a.h, a.seed, a.theme, shadeTiles);
    this.terrain = g.terrain;
    if (this.textures.exists(gkey)) this.textures.remove(gkey);
    const ctx = g.canvas.getContext('2d')!;
    // baked soft shadows for objects
    const shadowAt = (x: number, y: number, rx: number, ry: number) => {
      ctx.fillStyle = 'rgba(6,4,20,0.36)';
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    };

    // ---- collision grid from terrain ----
    this.grid = new Uint8Array(a.w * a.h);
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      const t = this.terrain[y][x];
      if (t === 'hidden') this.grid[y * a.w + x] = 2;
      else if (SOLID_TERRAIN.has(t)) this.grid[y * a.w + x] = 1;
    }

    // ---- objects from map characters ----
    const isTree = (c: string | undefined) => c === 'T' || c === 'Y' || c === 'D';
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      const c = a.rows[y][x];
      const make = CHAR_OBJECT[c];
      if (!make) continue;
      const kind = make(x, y, Phaser.Math.Between(0, 99) / 100);
      if (isTree(c)) {
        this.grid[y * a.w + x] = 3;
        const inner = isTree(a.rows[y - 1]?.[x]) && isTree(a.rows[y + 1]?.[x]) && isTree(a.rows[y]?.[x - 1]) && isTree(a.rows[y]?.[x + 1]);
        if (inner && (x + y) % 2 === 1) continue;
        const jx = inner ? ((x * 7 + y * 3) % 5) - 2 : 0;
        const p = new Prop(this, kind, x * TILE + 8 + jx, y * TILE + 16);
        p.solid = undefined; // trees collide by tile
        if (!inner) shadowAt(x * TILE + 8, y * TILE + 14, 13, 5);
        this.props.push(p);
        continue;
      }
      const p = new Prop(this, kind, x * TILE + 8, y * TILE + 16);
      if (kind === 'fence' || kind === 'rock') { if (p.solid) this.statics.push(p.solid); p.solid = undefined; }
      const k = KINDS[kind];
      if (k.shadow) shadowAt(p.x, p.y - 2, k.shadow[0], k.shadow[1]);
      this.props.push(p);
    }
    for (const o of a.objects) {
      if (o.id && state.flag(`gone:${o.id}`)) continue;
      const k = KINDS[o.kind];
      const p = new Prop(this, o.kind, o.x * TILE, o.y * TILE, o.id, o.data ?? {});
      if (k.shadow) shadowAt(p.x, p.y - 2, k.shadow[0], k.shadow[1]);
      if (o.kind === 'archive-gate') {
        this.statics.push({ x: p.x - 38, y: p.y - 54, w: 26, h: 52 }, { x: p.x + 12, y: p.y - 54, w: 26, h: 52 }, { x: p.x - 38, y: p.y - 60, w: 76, h: 26 });
      }
      this.props.push(p);
    }
    this.textures.addCanvas(gkey, g.canvas);
    this.add.image(0, 0, gkey).setOrigin(0).setDepth(-10);

    // ---- open space behind the islands ----
    if (a.theme !== 'dungeon') {
      this.sky = [
        this.add.tileSprite(960, 540, VW + 4, VH + 4, 'stars').setScrollFactor(0).setDepth(-30),
        this.add.tileSprite(960, 540, VW + 4, VH + 4, 'nebula').setScrollFactor(0).setDepth(-29),
        this.add.tileSprite(960, 540, VW + 4, VH + 4, 'stars').setScrollFactor(0).setDepth(-28).setTileScale(2).setAlpha(0.8),
      ];
      this.planet = this.add.image(960, 540, 'planet').setScrollFactor(0).setDepth(-27);
      // starwater glows from within
      for (let y = 1; y < a.h; y += 2) for (let x = 1; x < a.w; x += 2)
        if (this.terrain[y][x] === 'water') {
          const gl = this.add.image(x * TILE + 8, y * TILE + 8, 'softglow').setTint(0x3ad8f0).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5).setAlpha(0.22).setDepth(-4);
          this.tweens.add({ targets: gl, alpha: 0.12, duration: 1500 + Math.random() * 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
      // drifting spores
      for (let i = 0; i < Math.floor((a.w * a.h) / 26); i++) {
        const sx = Math.random() * PW, sy = Math.random() * PH;
        const sp = this.add.image(sx, sy, 'px').setScale(0.5).setTint(i % 3 ? 0x9df6ff : 0xd8b4ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(9e5 + 1);
        this.tweens.add({ targets: sp, x: sx + Phaser.Math.Between(-30, 30), y: sy - Phaser.Math.Between(14, 50), alpha: { from: 0, to: 0.9 }, duration: 2600 + Math.random() * 3000, yoyo: true, repeat: -1, delay: Math.random() * 4000 });
      }
    }

    // water sparkles
    for (const [x, y] of g.waterPixels) {
      const s = this.add.image(x, y, 'sparkle').setDepth(-5).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 0.9, duration: 500, yoyo: true, repeat: -1, delay: Math.random() * 4000, repeatDelay: 1500 + Math.random() * 3000 });
    }
    // ghost bridges for hidden tiles
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++)
      if (this.terrain[y][x] === 'hidden') this.ghostBridges.push(this.add.image(x * TILE, y * TILE, 'bridge-ghost').setOrigin(0).setAlpha(0).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD));

    // ---- NPCs & enemies ----
    for (const n of a.npcs) {
      const npc = new Npc(this, n.id, n.look, n.x * TILE, n.y * TILE, (n.dir === 'side' ? 'right' : n.dir ?? 'down') as Facing, n.wander ?? 0, n.behind);
      if (a.theme !== 'dungeon') npc.spr.setTint(NIGHT_NPC);
      this.npcs.push(npc);
    }
    for (const e of a.enemies) {
      if (e.kind === 'curator') {
        if (!state.flag('boss-archive')) this.boss = new Curator(this, e.x * TILE, e.y * TILE);
        continue;
      }
      this.enemies.push(new Enemy(this, e.kind as EnemyKind, e.x * TILE, e.y * TILE));
    }

    // ---- player & companion ----
    const [sx, sy, sd] = a.spawns[this.spawnId];
    this.player = new Player(this, sx * TILE, sy * TILE, (sd === 'side' ? 'right' : sd) as Facing);
    this.drone = this.add.sprite(this.player.x - 14, this.player.y - 30, 'drone', 0).setDepth(9e5 + 2);
    this.drone.setVisible(state.flag('ada-joined'));
    this.lanternGlow = this.add.image(0, 0, 'glow').setTint(0x7af3ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(9e5 + 1);
    this.prompt = this.add.image(0, 0, 'keycap-e').setOrigin(0.5, 1).setDepth(9e5 + 3).setVisible(false);
    this.tweens.add({ targets: this.prompt, scaleY: 0.86, duration: 380, yoyo: true, repeat: -1 });
    this.marker = this.add.image(0, 0, 'guide-arrow').setAngle(90).setDepth(9e5 + 3).setVisible(false);

    // ---- darkness ----
    if (a.dark) {
      this.darkness = this.add.image(0, 0, 'darkness').setDepth(9e5);
      for (let i = 0; i < 4; i++) this.darkRects.push(this.add.rectangle(0, 0, 10, 10, 0x05030e, 0.7).setOrigin(0).setDepth(9e5));
    }

    // ---- camera ----
    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setRoundPixels(true);
    cam.setBackgroundColor(a.theme === 'dungeon' ? 0x07050f : 0x06051a);
    if (a.rooms) {
      // dungeons: one room fills the screen, the rest stays hidden
      cam.removeBounds();
      cam.stopFollow();
      for (let i = 0; i < 4; i++) this.roomMask.push(this.add.rectangle(0, 0, 10, 10, 0x05030e, 1).setOrigin(0).setDepth(9e5 + 1.5));
      this.room = this.roomAt(this.player.x, this.player.y - 2) ?? a.rooms[0];
      cam.setZoom(this.roomZoom(this.room));
      [this.camPos.x, this.camPos.y] = this.roomCam(this.room);
      this.setMask(this.room);
      cam.centerOn(this.camPos.x, this.camPos.y);
    } else {
      cam.setBounds(0, 0, PW, PH);
      cam.startFollow(this.player.spr, true, 0.16, 0.16, 0, 12);
    }
    this.lastPos = [this.player.x, this.player.y];
    cam.fadeIn(350, 0, 0, 0);

    // ---- input ----
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,E,Q,SPACE,ENTER,TAB,ESC,P,G,ONE,TWO,THREE,FOUR,M') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT');
    kb.on('keydown', () => audio.unlock());
    this.input.on('pointerdown', () => audio.unlock());

    audio.play(a.music);
    const ready = () => { this.ui.onAreaEnter(a.name, !!a.dark); };
    if ((this.ui as unknown as { hearts: unknown[] }).hearts?.length) ready(); else this.ui.events.once('create', ready);
    setupArea(this);
    this.time.delayedCall(400, () => onEnter(this));
    (window as unknown as { __w: WorldScene }).__w = this;
  }

  // ================= collision =================
  tileAt(px: number, py: number) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return 1;
    return this.grid[ty * this.area.w + tx];
  }

  terrainAt(px: number, py: number): Terrain {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    return this.terrain[ty]?.[tx] ?? 'wall';
  }

  blocked(b: Box, fly = false, self?: unknown) {
    for (const [x, y] of [[b.x, b.y], [b.x + b.w - 0.01, b.y], [b.x, b.y + b.h - 0.01], [b.x + b.w - 0.01, b.y + b.h - 0.01]]) {
      const t = this.tileAt(x, y);
      if (t === 1) {
        if (!fly) return true;
        const ter = this.terrainAt(x, y);
        if (ter === 'wall' || ter === 'cliff') return true;
      } else if (t === 3) return true;
      else if (t === 2 && !this.lanternOn && !fly) return true;
    }
    for (const s of this.statics) if (overlap(b, s)) return true;
    for (const p of this.props) if (p.solid && overlap(b, p.solid)) return true;
    if (this.boss?.solid && overlap(b, this.boss.solid)) return true;
    if (self !== this.player && self && !(self instanceof Npc)) return false;
    for (const n of this.npcs) if (n !== self && !n.hidden && overlap(b, n.feet)) return true;
    if (self !== this.player && this.player && overlap(b, this.player.feet)) return true;
    return false;
  }

  /** Moves an entity's feet box with sliding + corner assist. Returns false if blocked. */
  moveBox(e: { x: number; y: number; feet: Box }, dx: number, dy: number, assist = false, fly = false) {
    let ok = true;
    const tryMove = (mx: number, my: number) => {
      const f = e.feet;
      const nb = { x: f.x + mx, y: f.y + my, w: f.w, h: f.h };
      if (this.blocked(nb, fly, e)) return false;
      e.x += mx; e.y += my;
      return true;
    };
    if (dx && !tryMove(dx, 0)) {
      ok = false;
      if (assist && !dy) for (const off of [1, 2, 3, 4, 5, 6]) {
        if (!this.blocked({ ...e.feet, x: e.feet.x + Math.sign(dx), y: e.feet.y - off }, fly, e)) { tryMove(0, -Math.min(1, Math.abs(dx))); break; }
        if (!this.blocked({ ...e.feet, x: e.feet.x + Math.sign(dx), y: e.feet.y + off }, fly, e)) { tryMove(0, Math.min(1, Math.abs(dx))); break; }
      }
    }
    if (dy && !tryMove(0, dy)) {
      ok = false;
      if (assist && !dx) for (const off of [1, 2, 3, 4, 5, 6]) {
        if (!this.blocked({ ...e.feet, y: e.feet.y + Math.sign(dy), x: e.feet.x - off }, fly, e)) { tryMove(-Math.min(1, Math.abs(dy)), 0); break; }
        if (!this.blocked({ ...e.feet, y: e.feet.y + Math.sign(dy), x: e.feet.x + off }, fly, e)) { tryMove(Math.min(1, Math.abs(dy)), 0); break; }
      }
    }
    return ok;
  }

  isPit(px: number, py: number) { return this.tileAt(px, py) === 2 && !this.lanternOn; }
  isSafe(px: number, py: number) {
    for (const [ox, oy] of [[-5, -4], [5, -4], [-5, 0], [5, 0]]) {
      const ter = this.terrainAt(px + ox, py + oy);
      if (ter === 'hidden' || ter === 'void') return false;
    }
    return true;
  }

  // ================= dungeon rooms =================
  private roomAt(px: number, py: number): Room | undefined {
    return this.area.rooms?.find((r) => px >= r.x * TILE && px < (r.x + r.w) * TILE && py >= r.y * TILE && py < (r.y + r.h) * TILE);
  }

  /** Camera centre for a room: fixed if the room fits the screen, else it follows inside the room. */
  private roomCam(r: Room): [number, number] {
    const rx = r.x * TILE, ry = r.y * TILE, rw = r.w * TILE, rh = r.h * TILE;
    const p = this.player, z = this.roomZoom(r);
    const vw = 1920 / z, vh = 1080 / z;
    const cx = rw <= vw ? rx + rw / 2 : Phaser.Math.Clamp(p.x, rx + vw / 2, rx + rw - vw / 2);
    const cy = rh <= vh ? ry + rh / 2 : Phaser.Math.Clamp(p.y - 12, ry + vh / 2, ry + rh - vh / 2);
    return [cx, cy];
  }

  /** Small rooms get a closer camera so they fill the screen like the big halls do. */
  private roomZoom(r: Room) {
    return Phaser.Math.Clamp(Math.min(Math.floor(1920 / (r.w * TILE)), Math.floor(1080 / (r.h * TILE))), ZOOM, ZOOM + 1);
  }

  private setMask(r: Room, r2?: Room) {
    let x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
    if (r2) { x0 = Math.min(x0, r2.x); y0 = Math.min(y0, r2.y); x1 = Math.max(x1, r2.x + r2.w); y1 = Math.max(y1, r2.y + r2.h); }
    const x = x0 * TILE, y = y0 * TILE, w = (x1 - x0) * TILE, h = (y1 - y0) * TILE;
    const m = this.roomMask;
    m[0].setPosition(x - 3000, y - 3000).setSize(w + 6000, 3000);
    m[1].setPosition(x - 3000, y + h).setSize(w + 6000, 3000);
    m[2].setPosition(x - 3000, y).setSize(3000, h);
    m[3].setPosition(x + w, y).setSize(3000, h);
  }

  inRoom(e: { x: number; y: number }) {
    const r = this.room;
    return !r || (e.x >= r.x * TILE && e.x < (r.x + r.w) * TILE && e.y >= r.y * TILE && e.y < (r.y + r.h) * TILE);
  }

  private updateRoom(dt: number) {
    const p = this.player, cam = this.cameras.main;
    const jumped = Math.hypot(p.x - this.lastPos[0], p.y - this.lastPos[1]) > 20;
    this.lastPos = [p.x, p.y];
    if (this.sliding) {
      // keep walking through the doorway while the camera slides
      this.moveBox(p, this.slideDir[0] * 46 * dt, this.slideDir[1] * 46 * dt);
      p.sync();
    } else {
      const r = this.roomAt(p.x, p.y - 2);
      if (r && r !== this.room) {
        const old = this.room!;
        this.room = r;
        const [cx, cy] = this.roomCam(r);
        if (jumped) { this.camPos.x = cx; this.camPos.y = cy; this.setMask(r); cam.setZoom(this.roomZoom(r)); }
        else {
          this.sliding = true;
          const dx = (r.x + r.w / 2) - (old.x + old.w / 2), dy = (r.y + r.h / 2) - (old.y + old.h / 2);
          const horiz = p.x < r.x * TILE + 8 || p.x > (r.x + r.w) * TILE - 8 || (p.y > r.y * TILE + 8 && p.y < (r.y + r.h) * TILE - 8 && Math.abs(dx) > Math.abs(dy));
          this.slideDir = horiz ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
          this.setMask(r, old);
          audio.sfx('room');
          this.tweens.add({ targets: cam, zoom: this.roomZoom(r), duration: 480, ease: 'Sine.inOut' });
          this.tweens.add({
            targets: this.camPos, x: cx, y: cy, duration: 480, ease: 'Sine.inOut',
            onComplete: () => { this.sliding = false; this.setMask(r); for (const e of this.enemies) if (this.inRoom(e)) e.stateT = Math.max(e.stateT, 0.6); },
          });
        }
      } else if (this.room) {
        const [cx, cy] = this.roomCam(this.room);
        this.camPos.x += (cx - this.camPos.x) * Math.min(1, dt * 8);
        this.camPos.y += (cy - this.camPos.y) * Math.min(1, dt * 8);
      }
    }
    cam.centerOn(Math.round(this.camPos.x), Math.round(this.camPos.y));
  }

  // ================= main loop =================
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    state.data.playMs += dms;
    const k = this.keys;
    // read every "just pressed" flag once per frame, so presses made while a
    // dialog or menu is open never leak into the world afterwards
    const pressed = new Set<Phaser.Input.Keyboard.Key>();
    for (const key of Object.values(k)) if (Phaser.Input.Keyboard.JustDown(key)) pressed.add(key);
    const jd = (key: Phaser.Input.Keyboard.Key) => pressed.has(key);

    // admin hotkeys
    if (state.admin) {
      if (jd(k.P)) { state.god = !state.god; this.ui.toast(state.god ? 'Admin: god mode ON' : 'Admin: god mode OFF'); }
      if (jd(k.G)) { for (const i of ['sword', 'lantern']) state.give(i); state.set('ada-joined'); state.data.keys.archive = (state.data.keys.archive ?? 0) + 1; state.data.shards += 50; this.drone.setVisible(true); this.ui.refresh(); this.ui.toast('Admin: items granted'); }
      if (jd(k.ONE)) this.warpTo('haven', 'start');
      if (jd(k.TWO)) this.warpTo('woods', 'south');
      if (jd(k.THREE)) this.warpTo('archive', 'entrance');
      if (jd(k.FOUR)) this.warpTo('archive', 'boss');
    }
    if (jd(k.M)) audio.setMuted(!state.muted);
    // a few frozen frames on every solid hit make the sword feel heavy
    if (this.hitStop > 0) { this.hitStop -= dt; return; }

    if (!this.busy) {
      if (jd(k.TAB) || jd(k.ESC)) { this.ui.openMenu(); return; }
      let ix = 0, iy = 0;
      if (k.A.isDown || k.LEFT.isDown) ix -= 1;
      if (k.D.isDown || k.RIGHT.isDown) ix += 1;
      if (k.W.isDown || k.UP.isDown) iy -= 1;
      if (k.S.isDown || k.DOWN.isDown) iy += 1;
      if (jd(k.J) || jd(k.SPACE)) this.player.attack();
      if ((jd(k.K) || jd(k.E) || jd(k.ENTER)) && this.time.now - this.lastInteract > 250) this.tryInteract();
      if (jd(k.L) || jd(k.Q)) this.toggleLantern();
      this.player.update(dt, ix, iy);
    } else {
      this.player.update(dt, 0, 0);
    }

    // sword hits
    if (this.player.attackT > 0 && this.player.attackT < 0.22) {
      const sb = this.player.swordBox();
      for (const e of this.enemies) if (!e.dead && !this.player.hitThisSwing.has(e) && overlap(sb, e.body)) { this.player.hitThisSwing.add(e); e.hit(this.player.x, this.player.y); }
      if (this.boss) this.boss.trySword(sb);
      for (const p of this.props) {
        if (!p.alive || this.player.hitThisSwing.has(p)) continue;
        if (overlap(sb, p.box) && (p.tags.includes('cut') || p.tags.includes('break'))) { this.player.hitThisSwing.add(p); this.smash(p); }
      }
    }

    for (const n of this.npcs) n.update(dt);
    if (!this.cut && !this.sliding) for (const e of this.enemies) if (!e.dead && this.inRoom(e)) e.update(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const p of this.pickups) if (!p.dead) p.update(dt);
    this.pickups = this.pickups.filter((p) => !p.dead);
    this.boss?.update(dt);
    for (const f of this.extraTick) f(dt);

    // pickups placed in the world (beetles, heart pieces)
    for (const p of this.props) if (p.alive && p.tags.includes('pickup') && overlap(this.player.body, p.box)) onProp(this, p, 'pickup');

    // warps
    if (!this.busy && warpAllowed(this)) for (const wp of this.area.warps) {
      const r = { x: wp.x * TILE, y: wp.y * TILE, w: wp.w * TILE, h: wp.h * TILE };
      if (overlap(this.player.feet, r)) { this.warpTo(wp.to, wp.spawn); break; }
    }

    if (this.area.rooms) this.updateRoom(dt);
    this.updateLight(dt);
    this.updatePrompt();
    this.updateGuide();
    // parallax sky
    const cam = this.cameras.main;
    if (this.sky.length) {
      this.sky[0].setTilePosition(Math.round(cam.scrollX * 0.08), Math.round(cam.scrollY * 0.08));
      this.sky[1].setTilePosition(Math.round(cam.scrollX * 0.16), Math.round(cam.scrollY * 0.16));
      this.sky[2].setTilePosition(Math.round(cam.scrollX * 0.14), Math.round(cam.scrollY * 0.14));
      this.planet!.setPosition(960 + 130 - Math.round(cam.scrollX * 0.05), 540 - 20 - Math.round(cam.scrollY * 0.05));
    }
    // companion drone
    const tx = this.player.x + (this.player.facing === 'left' ? 14 : -14), ty = this.player.y - 30 + Math.sin(this.time.now / 300) * 2;
    this.drone.x += (tx - this.drone.x) * Math.min(1, dt * 4);
    this.drone.y += (ty - this.drone.y) * Math.min(1, dt * 4);
    this.drone.setFrame(Math.floor(this.time.now / 1200) % 4 === 0 ? 1 : 0);
    onTick(this, dt);
  }

  private updateLight(dt: number) {
    const p = this.player;
    this.lanternGlow.setPosition(p.x, p.y - 12).setScale(this.lanternOn ? 1.2 : 0.6);
    this.lanternGlow.setAlpha(Phaser.Math.Linear(this.lanternGlow.alpha, this.lanternOn ? 0.35 : this.darkness ? 0.12 : 0, Math.min(1, dt * 6)));
    if (this.darkness) {
      const target = this.lanternOn ? 1.45 : 0.62;
      const s = Phaser.Math.Linear(this.darkness.scaleX, target, Math.min(1, dt * 5));
      this.darkness.setScale(s).setPosition(p.x, p.y - 8);
      const half = 256 * s;
      const L = p.x - half, R = p.x + half, T = p.y - 8 - half, B = p.y - 8 + half;
      const PW = this.area.w * TILE + 400, PH = this.area.h * TILE + 400;
      this.darkRects[0].setPosition(-200, -200).setSize(PW, Math.max(0, T + 200));
      this.darkRects[1].setPosition(-200, B).setSize(PW, Math.max(0, PH - B));
      this.darkRects[2].setPosition(-200, T).setSize(Math.max(0, L + 200), B - T);
      this.darkRects[3].setPosition(R, T).setSize(Math.max(0, PW - R), B - T);
    }
    const want = this.lanternOn ? 0.75 : 0;
    for (const b of this.ghostBridges) {
      const d = Math.hypot(b.x + 8 - p.x, b.y + 8 - p.y);
      const a = d < 190 ? want * (0.75 + 0.25 * Math.sin(this.time.now / 250 + b.x * 0.1)) : 0;
      b.setAlpha(Phaser.Math.Linear(b.alpha, a, Math.min(1, dt * 8)));
    }
  }

  private interactTarget(): { npc?: Npc; prop?: Prop } | null {
    const fb = this.player.frontBox(10);
    for (const n of this.npcs) if (!n.hidden && overlap(fb, n.talkBox)) return { npc: n };
    let best: Prop | undefined;
    for (const p of this.props) {
      if (!p.alive || !p.tags.includes('interact')) continue;
      const b = p.box;
      const grown = { x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 6 };
      if (overlap(fb, grown)) best = p;
    }
    return best ? { prop: best } : null;
  }

  private updatePrompt() {
    const t = this.busy ? null : this.interactTarget();
    if (!t) { this.prompt.setVisible(false); return; }
    if (t.npc) this.prompt.setPosition(t.npc.x, t.npc.y - 26);
    else if (t.prop) this.prompt.setPosition(t.prop.x, t.prop.spr.getTopCenter().y! - 2);
    this.prompt.setVisible(true);
  }

  /** Objective text + an arrow to where the story continues. */
  private updateGuide() {
    const o = objective(this);
    this.ui.setObjective(o.text);
    const cam = this.cameras.main, v = cam.worldView;
    if (!o.target || this.cut || this.warping || this.ui.dialogOpen || this.ui.menuOpen) { this.marker.setVisible(false); this.ui.setGuide(); return; }
    const [tx, ty] = o.target;
    const near = Math.hypot(tx - this.player.x, ty - this.player.y) < 26;
    const inside = tx > v.x + 10 && tx < v.right - 10 && ty > v.y + 34 && ty < v.bottom - 6;
    const hidden = this.room && !(tx >= this.room.x * TILE && tx < (this.room.x + this.room.w) * TILE && ty >= this.room.y * TILE && ty < (this.room.y + this.room.h) * TILE);
    if (inside && !hidden) {
      this.ui.setGuide();
      this.marker.setVisible(!near).setPosition(tx, ty - (o.lift ?? 30) + Math.sin(this.time.now / 180) * 2);
    } else {
      this.marker.setVisible(false);
      const cx = v.centerX, cy = v.centerY;
      const ang = Math.atan2(ty - cy, tx - cx);
      const hw = 960 - 110, hh = 540 - 110;
      const k = Math.min(hw / Math.abs(Math.cos(ang) || 1e-6), hh / Math.abs(Math.sin(ang) || 1e-6));
      this.ui.setGuide(960 + Math.cos(ang) * k, 540 + Math.sin(ang) * k, ang);
    }
  }

  private async tryInteract() {
    const t = this.interactTarget();
    if (!t) return;
    this.lastInteract = this.time.now;
    if (t.npc) {
      const n = t.npc;
      n.talking = true;
      n.face(this.player.x, this.player.y);
      n.vx = 0; n.vy = 0;
      await onTalk(this, n);
      n.talking = false;
    } else if (t.prop) await onProp(this, t.prop, 'interact');
    this.lastInteract = this.time.now;
  }

  toggleLantern() {
    if (!state.has('lantern')) return;
    this.lanternOn = !this.lanternOn;
    audio.sfx(this.lanternOn ? 'lantern' : 'blip');
    this.ui.refresh();
    if (!this.lanternOn && this.isPit(this.player.x, this.player.y - 2)) { /* player falls next frame */ }
  }

  // ================= gameplay helpers =================
  smash(p: Prop) {
    if (p.kind === 'bush') {
      audio.sfx('cut');
      for (let i = 0; i < 7; i++) {
        const leaf = this.add.image(p.x + Phaser.Math.Between(-5, 5), p.y - 8 + Phaser.Math.Between(-4, 4), 'px').setTint(i % 2 ? 0x4fb8a8 : 0x257078).setDepth(p.y + 1);
        this.tweens.add({ targets: leaf, x: leaf.x + Phaser.Math.Between(-18, 18), y: leaf.y + Phaser.Math.Between(-14, 6), alpha: 0, angle: 180, duration: 450, onComplete: () => leaf.destroy() });
      }
      const stub = this.add.image(p.x, p.y, 'bush-cut').setOrigin(0.5, 1).setDepth(p.y - 10);
      void stub;
      p.remove();
      this.dropLoot(p.x, p.y - 4, 0.22);
      onProp(this, p, 'smash');
    } else if (p.kind === 'pot') {
      audio.sfx('break');
      p.solid = undefined;
      p.alive = false;
      p.spr.setTexture('pot-broken');
      this.tweens.add({ targets: p.spr, alpha: 0, delay: 600, duration: 400, onComplete: () => p.spr.destroy() });
      this.dropLoot(p.x, p.y - 4, 0.55);
    }
  }

  dropLoot(x: number, y: number, chance: number) {
    if (Math.random() > chance) return;
    const needHeart = state.data.hp < state.data.maxHp;
    const kind = needHeart && Math.random() < 0.35 ? 'heart' : Math.random() < 0.12 ? 'shard5' : 'shard';
    this.pickups.push(new Pickup(this, kind, x, y));
  }

  poof(x: number, y: number) {
    const s = this.add.sprite(x, y, 'puff', 0).setDepth(y + 20);
    if (!this.anims.exists('puff')) this.anims.create({ key: 'puff', frames: this.anims.generateFrameNumbers('puff', { start: 0, end: 3 }), frameRate: 14 });
    s.play('puff');
    s.once('animationcomplete', () => s.destroy());
  }

  /** Spark, shake and a few frozen frames when the sword connects. */
  hitFx(x: number, y: number, big = false) {
    this.hitStop = big ? 0.09 : 0.055;
    this.cameras.main.shake(big ? 140 : 70, big ? 0.006 : 0.003);
    const s = this.add.image(x, y, 'sparkle').setScale(big ? 4.5 : 3).setAngle(Math.random() * 90).setBlendMode(Phaser.BlendModes.ADD).setDepth(9e5 + 2);
    this.tweens.add({ targets: s, scale: 0.6, alpha: 0, angle: s.angle + 90, duration: 170, onComplete: () => s.destroy() });
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 12;
      const q = this.add.image(x, y, 'px').setScale(0.5).setTint(0xfff6c8).setDepth(9e5 + 2);
      this.tweens.add({ targets: q, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 220, ease: 'Cubic.out', onComplete: () => q.destroy() });
    }
  }

  /** An enemy pops into glitter. */
  burst(x: number, y: number, tint = 0xf2c14e) {
    audio.sfx('kill');
    this.poof(x, y);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, d = 14 + Math.random() * 16;
      const q = this.add.image(x, y, i % 3 ? 'px' : 'sparkle').setScale(i % 3 ? 0.75 : 1).setTint(i % 2 ? tint : 0xffffff).setDepth(9e5 + 2);
      this.tweens.add({ targets: q, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 4, alpha: 0, duration: 380 + Math.random() * 200, ease: 'Cubic.out', onComplete: () => q.destroy() });
    }
  }

  spawnEnemy(kind: EnemyKind, tx: number, ty: number) {
    const e = new Enemy(this, kind, tx * TILE, ty * TILE);
    this.enemies.push(e);
    return e;
  }

  damagePlayer(n: number) {
    state.data.hp = Math.max(0, state.data.hp - n);
    this.cameras.main.shake(140, 0.005);
    this.ui.hurtFlash();
    this.ui.refresh();
    if (state.data.hp <= 0) this.faint();
  }

  playerFell() {
    const p = this.player;
    p.spr.setScale(1).setAngle(0);
    [p.x, p.y] = p.safe;
    p.invT = 1;
    this.damagePlayer(1);
    if (state.data.hp > 0) this.ui.toast('Without light, the bridge isn\'t there.');
  }

  private async faint() {
    this.cut = true;
    state.data.deaths++;
    audio.stop();
    audio.sfx('fail');
    this.tweens.add({ targets: this.player.spr, angle: 720, duration: 900 });
    await this.ui.faint();
    state.data.hp = state.data.maxHp;
    state.save();
    this.scene.restart({ area: this.area.id, spawn: this.area.dark ? 'entrance' : this.spawnId });
  }

  warpTo(area: string, spawn: string) {
    if (this.warping) return;
    this.warping = true;
    audio.sfx('whoosh');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ area, spawn });
    });
  }

  // ================= script API =================
  say(lines: Line[]) { return this.ui.dialog(lines); }
  choose(prompt: Line, options: string[]) { return this.ui.choose(prompt, options); }
  wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, r)); }
  npc(id: string) { return this.npcs.find((n) => n.id === id); }
  prop(id: string) { return this.props.find((p) => p.id === id && p.alive); }

  /** Zelda-style "you got an item" moment. */
  async getItem(tex: string, title: string, lines: Line[]) {
    this.cut = true;
    const p = this.player;
    p.facing = 'down';
    p.spr.setFrame(0).setFlipX(false);
    p.held = this.add.image(p.x, p.y - 25, tex).setOrigin(0.5, 1);
    const shine = this.add.image(p.x, p.y - 31, 'glow').setTint(0xfff2a8).setBlendMode(Phaser.BlendModes.ADD).setScale(0).setDepth(9e5 + 4);
    this.tweens.add({ targets: shine, scale: 0.7, alpha: { from: 1, to: 0.5 }, duration: 600, yoyo: true });
    p.sync();
    audio.sfx('fanfare');
    this.ui.itemBanner(title);
    await this.wait(900);
    await this.say(lines);
    p.held.destroy(); p.held = undefined; shine.destroy();
    this.cut = false;
    this.ui.refresh();
  }

  note(id: string) {
    if (state.data.notes.includes(id)) return;
    state.data.notes.push(id);
    state.save();
    this.ui.noteToast(id);
  }

  /** Smoothly walk an NPC (cutscenes). */
  walkNpc(n: Npc, tx: number, ty: number, speed = 40) {
    return new Promise<void>((resolve) => {
      n.scripted = true;
      const step = (dt: number) => {
        const dx = tx - n.x, dy = ty - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 1) { this.extraTick = this.extraTick.filter((f) => f !== step); n.walkT = 0; n.scripted = false; n.home = [n.x, n.y]; resolve(); return; }
        const m = Math.min(d, speed * dt);
        n.x += (dx / d) * m; n.y += (dy / d) * m;
        n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        n.walkT += dt;
      };
      this.extraTick.push(step);
    });
  }
}
