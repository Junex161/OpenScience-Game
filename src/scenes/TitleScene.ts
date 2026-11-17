// Title screen: pixel-art night over Haven, name entry and difficulty.
import Phaser from 'phaser';
import { buildArt } from '../art/index';
import { planet } from '../art/objects';
import { hash, Pix, shade } from '../art/pixel';
import { audio } from '../core/audio';
import { DIFF, Difficulty, state } from '../core/state';
import { FONT_PX, H, pixelPanel, txt, W } from './UIScene';

function backdrop(): HTMLCanvasElement {
  const w = 320, h = 180;
  const p = new Pix(w, h);
  // sky bands
  const sky = [0x0b0820, 0x120c2e, 0x1a1240, 0x24184f, 0x2f1f5c, 0x3d2768];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const band = Math.min(sky.length - 1, Math.floor((y + (hash(x, y, 1) < 0.5 ? 0 : 3)) / 22));
    p.set(x, y, sky[band]);
  }
  // aurora: soft vertical curtains, dithered towards the bottom
  const aur = [0x3a8f9a, 0x2a6f86, 0x254f78, 0x23386a];
  for (let x = 0; x < w; x++) {
    const y0 = 122 + Math.sin(x * 0.028) * 9 + Math.sin(x * 0.009 + 1) * 12;
    const len = 10 + Math.floor((Math.sin(x * 0.21) * 0.5 + 0.5) * 8 + hash(x, 0, 3) * 3);
    for (let j = 0; j < len; j++) {
      const k = Math.min(3, Math.floor((j / len) * 4));
      if (k >= 2 && (x + j) % 2 === 0) continue;
      if (k === 3 && (x + j) % 4 !== 1) continue;
      p.set(x, Math.round(y0 + j), aur[k]);
    }
  }
  // the ringed giant that Lumen circles
  p.blit(planet(), -44, 44);
  // small islands drifting in the distance
  const island = (cx: number, top: number, half: number, deep: number, lip: number, body: number[]) => {
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const rel = (x - cx) / half;
      const ty = top + Math.round(hash(x >> 2, 3, 9) * 1.4);
      const d = Math.max(2, Math.round(deep * Math.pow(1 - rel * rel, 0.6) + hash(x, 5, 9) * deep * 0.35 - 2));
      for (let y = ty; y < ty + d; y++) {
        const k = (y - ty) / d;
        p.set(x, y, y - ty < 2 ? lip : k < 0.35 ? body[0] : k < 0.7 ? body[1] : body[2]);
      }
    }
  };
  island(34, 150, 26, 16, 0x1f5560, [0x2a2448, 0x1e1936, 0x141024]);
  island(292, 128, 22, 14, 0x1f5560, [0x2a2448, 0x1e1936, 0x141024]);
  // Haven: the island with the Beacon
  island(160, 88, 78, 34, 0x2e7676, [0x3a3160, 0x2a2348, 0x191430]);
  // glowcap trees
  for (const [tx, col] of [[94, 0x2488a0], [104, 0x7046b8], [222, 0x2488a0], [232, 0x17566c], [128, 0x17566c], [300, 0x7046b8]] as [number, number][]) {
    const base = tx > 280 ? 128 : 89;
    p.rect(tx, base - 8, 2, 8, 0x7d78a8);
    p.ellipse(tx + 1, base - 10, 6, 3.5, (dx, dy) => (dy > 0.3 ? 0x7af3ff : dx < -0.2 && dy < 0 ? shade(col, 0.25) : col));
  }
  // the Beacon
  for (let y = 54; y < 88; y++) {
    const half = y < 62 ? (y - 54) * 0.5 : 4;
    for (let x = Math.round(160 - half); x < Math.round(160 + half); x++) p.set(x, y, x < 160 ? 0x7af3ff : 0x2bb7d6);
  }
  p.rect(152, 86, 16, 4, 0x56568e);
  // habitat pods with lit portholes
  for (const [hx, hy] of [[110, 78], [136, 80], [172, 80], [198, 78]]) {
    p.rect(hx, hy, 16, 10, 0x2a2244);
    p.ellipse(hx + 8, hy, 9, 6, 0x3a2a60);
    p.rect(hx + 3, hy + 4, 3, 3, 0xffd77a); p.rect(hx + 10, hy + 4, 3, 3, 0xffd77a);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  p.drawTo(c.getContext('2d')!, 0, 0);
  return c;
}

export class TitleScene extends Phaser.Scene {
  private mode: 'main' | 'name' | 'diff' = 'main';
  private items: Phaser.GameObjects.Text[] = [];
  private sel = 0;
  private name = '';
  private nameText?: Phaser.GameObjects.Text;
  private layer!: Phaser.GameObjects.Container;
  private options: { label: string; act: () => void }[] = [];

  constructor() { super('title'); }

  create() {
    buildArt(this);
    if (!this.textures.exists('title-bg')) this.textures.addCanvas('title-bg', backdrop());
    this.add.image(0, 0, 'title-bg').setOrigin(0).setScale(6);
    // twinkling stars + fireflies
    for (let i = 0; i < 70; i++) {
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 1060), 'sparkle').setScale(Phaser.Math.Between(2, 4)).setAlpha(0.2);
      this.tweens.add({ targets: s, alpha: 0.95, duration: 600 + Math.random() * 1400, yoyo: true, repeat: -1, delay: Math.random() * 3000 });
    }
    for (let i = 0; i < 18; i++) {
      const f = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(820, 1060), 'glow').setScale(0.12).setTint(0xc8ff7a).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-80, 80), y: f.y - Phaser.Math.Between(20, 90), alpha: { from: 0, to: 1 }, duration: 2600 + Math.random() * 2000, yoyo: true, repeat: -1, delay: Math.random() * 2000 });
    }
    const beam = this.add.image(960, 430, 'glow').setScale(2, 2.6).setTint(0x5ef0ff).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0.12, duration: 1800, yoyo: true, repeat: -1 });

    // logo
    const logoShadow = this.add.text(W / 2 + 8, 168, 'REPLICA', txt(132, '#05030e', { fontFamily: FONT_PX })).setOrigin(0.5);
    const logo = this.add.text(W / 2, 160, 'REPLICA', txt(132, '#fff6d8', { fontFamily: FONT_PX, stroke: '#2b1b5a', strokeThickness: 16 })).setOrigin(0.5);
    logo.setTint(0xfff6d8, 0xfff6d8, 0x7af3ff, 0x7af3ff);
    this.tweens.add({ targets: [logo, logoShadow], y: '-=8', duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(W / 2, 290, 'Light for the Open Index', txt(44, '#b4a6d4', { stroke: '#05030e', strokeThickness: 8 })).setOrigin(0.5);

    this.layer = this.add.container(0, 0);
    this.showMain();
    this.add.text(W - 24, H - 18, 'An Open Science adventure   ·   v0.3', txt(22, '#8a82b8')).setOrigin(1, 1);

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('pointerdown', () => { audio.unlock(); audio.play('title'); });
    audio.play('title');
  }

  private menu(title: string | null, opts: { label: string; act: () => void }[], y = 560) {
    this.layer.removeAll(true);
    this.options = opts;
    this.sel = 0;
    const pw = 760, ph = 70 + opts.length * 84 + (title ? 70 : 0);
    this.layer.add(pixelPanel(this, W / 2 - pw / 2, y - 40, pw, ph, 0xb4a6d4, 0x120c22, 0.9));
    if (title) this.layer.add(this.add.text(W / 2, y + 10, title, txt(36, '#f2cd6b')).setOrigin(0.5));
    this.items = opts.map((o, i) => {
      const t = this.add.text(W / 2, y + (title ? 90 : 30) + i * 84, o.label, txt(48, '#b4a6d4', { fontStyle: '600' })).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.sel = i; this.paint(); });
      t.on('pointerdown', () => { audio.unlock(); this.sel = i; this.confirm(); });
      return t;
    });
    this.layer.add(this.items);
    this.paint();
  }

  private paint() {
    this.items.forEach((t, i) => t.setText((i === this.sel ? '▶  ' : '') + this.options[i].label + (i === this.sel ? '  ◀' : '')).setColor(i === this.sel ? '#fff0a8' : '#b4a6d4'));
  }

  private showMain() {
    this.mode = 'main';
    const opts: { label: string; act: () => void }[] = [];
    if (state.hasSave && state.data.flags['intro-done']) opts.push({ label: 'Continue', act: () => this.start() });
    opts.push({ label: 'New Game', act: () => this.showName() });
    opts.push({ label: state.muted ? 'Music: off' : 'Music: on', act: () => { audio.setMuted(!state.muted); this.showMain(); } });
    this.menu(null, opts, 720);
    this.layer.add(this.add.text(W / 2, 1030, 'W / S choose   ·   Enter confirm', txt(28, '#8a82b8')).setOrigin(0.5));
  }

  private showName() {
    this.mode = 'name';
    this.name = '';
    this.layer.removeAll(true);
    this.layer.add(pixelPanel(this, W / 2 - 480, 620, 960, 360, 0xf2cd6b));
    this.layer.add(this.add.text(W / 2, 680, 'What is your name, star-cartographer?', txt(40, '#fff6d8')).setOrigin(0.5));
    this.nameText = this.add.text(W / 2, 790, '', txt(72, '#fff0a8', { fontStyle: '600' })).setOrigin(0.5);
    this.layer.add(this.nameText);
    this.layer.add(this.add.text(W / 2, 910, 'Type a name, then press Enter   (empty = Nova)', txt(28, '#8a82b8')).setOrigin(0.5));
    this.layer.add(this.add.rectangle(W / 2, 840, 520, 6, 0xb4a6d4));
    this.updateName();
  }

  private updateName() {
    const blink = Math.floor(this.time.now / 400) % 2 === 0 ? '_' : ' ';
    this.nameText?.setText(this.name + blink);
  }

  private showDiff() {
    this.mode = 'diff';
    const ids: Difficulty[] = ['easy', 'normal', 'hard'];
    this.menu('How tough should it be?', ids.map((d) => ({ label: DIFF[d].label, act: () => this.newGame(d) })), 620);
    const blurb = this.add.text(W / 2, 1010, '', txt(32, '#d8d0f0')).setOrigin(0.5);
    this.layer.add(blurb);
    const upd = () => blurb.setText(DIFF[ids[this.sel]].blurb);
    upd();
    this.events.off('sel').on('sel', upd);
    this.sel = 1;
    this.paint();
    upd();
  }

  private onKey(e: KeyboardEvent) {
    audio.unlock();
    audio.play('title');
    if (this.mode === 'name') {
      if (e.key === 'Enter') { this.name = this.name.trim() || 'Nova'; audio.sfx('select'); this.showDiff(); return; }
      if (e.key === 'Escape') { this.showMain(); return; }
      if (e.key === 'Backspace') this.name = this.name.slice(0, -1);
      else if (e.key.length === 1 && /[\p{L}\p{N} '\-.]/u.test(e.key) && this.name.length < 12) { this.name += e.key; audio.sfx('type'); }
      this.updateName();
      return;
    }
    const up = e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
    const down = e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';
    if (up || down) {
      this.sel = (this.sel + (up ? -1 : 1) + this.options.length) % this.options.length;
      audio.sfx('blip');
      this.paint();
      this.events.emit('sel');
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') this.confirm();
    if (e.key === 'Escape' && this.mode === 'diff') this.showMain();
  }

  private confirm() {
    audio.sfx('select');
    this.options[this.sel]?.act();
  }

  update() { if (this.mode === 'name') this.updateName(); }

  private newGame(d: Difficulty) {
    state.newGame(this.name || 'Nova', d);
    this.start();
  }

  private start() {
    this.input.keyboard!.removeAllListeners();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('world', { area: state.data.area, spawn: state.data.spawn });
    });
  }
}
