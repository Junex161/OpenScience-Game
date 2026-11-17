// HUD, dialog boxes, banners, toasts and the journal. Runs at zoom 1 on
// top of the world so text stays razor sharp.
import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import { NOTES, QUESTS } from '../data/journal';

export const W = 1920, H = 1080;
export const FONT = '"Pixelify Sans", monospace';
export const FONT_PX = '"Press Start 2P", monospace';

export interface Line { who?: string; text: string }

export const SPEAKERS: Record<string, { name: string; tex: string; frame?: number; scale?: number; color: number }> = {
  nova: { name: 'Nova', tex: 'ch-nova', color: 0xe43b44 },
  mo: { name: 'Mo', tex: 'ch-mo', color: 0xf7b32b },
  pip: { name: 'Pip', tex: 'ch-pip', color: 0x3b9ae1 },
  gloss: { name: 'Dr. Gloss', tex: 'ch-gloss', color: 0xff4fd8 },
  zib: { name: 'Zib', tex: 'ch-zib', color: 0x5cb860 },
  dusty: { name: 'Dusty', tex: 'ch-dusty', color: 0x8a6a48 },
  quill: { name: 'Quill', tex: 'ch-quill', color: 0x3a6fc8 },
  ada: { name: 'ADA', tex: 'drone', scale: 12, color: 0x2bb7d6 },
  wisp: { name: 'Null Wisp', tex: 'nullwisp', scale: 10, color: 0x9fd4ff },
  curator: { name: 'The Gilded Curator', tex: 'curator', scale: 3.4, color: 0xf2c14e },
};

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
export const txt = (size: number, color = '#f4efff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT, fontSize: `${size}px`, color, ...extra });

/** Pixel-art framed panel. */
export function pixelPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, accent = 0xb4a6d4, fill = 0x120c22, alpha = 0.95) {
  const g = scene.add.graphics();
  const u = 6;
  g.fillStyle(0x05030e, 1);
  g.fillRect(x + u, y, w - 2 * u, h); g.fillRect(x, y + u, w, h - 2 * u);
  g.fillStyle(fill, alpha);
  g.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
  g.fillStyle(accent, 1);
  g.fillRect(x + 2 * u, y + u, w - 4 * u, 3); g.fillRect(x + 2 * u, y + h - u - 3, w - 4 * u, 3);
  g.fillRect(x + u, y + 2 * u, 3, h - 4 * u); g.fillRect(x + w - u - 3, y + 2 * u, 3, h - 4 * u);
  g.fillRect(x + u + 3, y + u + 3, 6, 6); g.fillRect(x + w - u - 9, y + u + 3, 6, 6);
  g.fillRect(x + u + 3, y + h - u - 9, 6, 6); g.fillRect(x + w - u - 9, y + h - u - 9, 6, 6);
  return g;
}

export class UIScene extends Phaser.Scene {
  dialogOpen = false;
  menuOpen = false;
  private hud!: Phaser.GameObjects.Container;
  private hearts: Phaser.GameObjects.Image[] = [];
  private shardTxt!: Phaser.GameObjects.Text;
  private keyIcon!: Phaser.GameObjects.Image;
  private keyTxt!: Phaser.GameObjects.Text;
  private slotSword!: Phaser.GameObjects.Container;
  private slotLantern!: Phaser.GameObjects.Container;
  private lanternIcon!: Phaser.GameObjects.Image;
  private banner!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private objTxt!: Phaser.GameObjects.Text;
  private objective = '';
  private guide!: Phaser.GameObjects.Image;
  private coachBox?: Phaser.GameObjects.Container;
  coachKey = '';
  // dialog
  private dlg!: Phaser.GameObjects.Container;
  private dlgPanel?: Phaser.GameObjects.Graphics;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgNameBg!: Phaser.GameObjects.Rectangle;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgArrow!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Sprite;
  private portraitBg!: Phaser.GameObjects.Rectangle;
  private queue: Line[] = [];
  private full = '';
  private shown = 0;
  private openedAt = 0;
  private onDone?: () => void;
  private choice?: { options: string[]; sel: number; texts: Phaser.GameObjects.Text[]; box: Phaser.GameObjects.Container; resolve: (i: number) => void };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private menu?: Phaser.GameObjects.Container;
  private menuTab = 0;
  private menuSel = 0;
  private toastY = 0;
  private cardClose?: () => void;

  constructor() { super('ui'); }

  create() {
    this.hearts = [];
    this.dialogOpen = false;
    this.menuOpen = false;
    this.choice = undefined;
    this.menu = undefined;
    this.cameras.main.setRoundPixels(true);
    this.keys = this.input.keyboard!.addKeys('K,E,J,SPACE,ENTER,W,S,A,D,UP,DOWN,LEFT,RIGHT,TAB,ESC') as Record<string, Phaser.Input.Keyboard.Key>;

    // soft vignette: pulls the eye to the middle and deepens the night
    if (!this.textures.exists('vignette')) {
      const t = this.textures.createCanvas('vignette', 480, 270)!;
      const c = t.getContext();
      const g = c.createRadialGradient(240, 135, 90, 240, 135, 290);
      g.addColorStop(0, 'rgba(5,3,20,0)');
      g.addColorStop(0.7, 'rgba(5,3,20,0.22)');
      g.addColorStop(1, 'rgba(5,3,20,0.62)');
      c.fillStyle = g;
      c.fillRect(0, 0, 480, 270);
      t.refresh();
    }
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H);

    // ---- HUD ----
    this.coachBox = undefined;
    this.coachKey = '';
    this.objective = '';
    this.hud = this.add.container(0, 0);
    for (let i = 0; i < 20; i++) {
      const h = this.add.image(44 + (i % 10) * 52, 44 + Math.floor(i / 10) * 50, 'heart-full').setScale(5).setOrigin(0, 0);
      this.hearts.push(h);
      this.hud.add(h);
    }
    const sh = this.add.sprite(46, 152, 'shard', 0).setScale(4).setOrigin(0, 0.5);
    this.shardTxt = this.add.text(96, 152, '000', txt(40, '#d4fdff', { stroke: '#05030e', strokeThickness: 8 })).setOrigin(0, 0.5);
    this.keyIcon = this.add.image(214, 152, 'key').setScale(4).setOrigin(0, 0.5);
    this.keyTxt = this.add.text(262, 152, '0', txt(40, '#fff0a8', { stroke: '#05030e', strokeThickness: 8 })).setOrigin(0, 0.5);
    this.hud.add([sh, this.shardTxt, this.keyIcon, this.keyTxt]);
    this.tweens.add({ targets: sh, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });

    const slot = (x: number, key: string, tex: string, scale: number) => {
      const c = this.add.container(x, 70);
      const bg = this.add.graphics();
      bg.fillStyle(0x05030e, 1).fillRect(-50, -50, 100, 100);
      bg.fillStyle(0x120c22, 0.92).fillRect(-44, -44, 88, 88);
      bg.lineStyle(4, 0xb4a6d4, 1).strokeRect(-42, -42, 84, 84);
      const icon = this.add.image(0, 0, tex).setScale(scale);
      const k = this.add.text(-42, 32, key, txt(key.length > 1 ? 20 : 26, '#05030e', { backgroundColor: '#f2cd6b', padding: { x: 6, y: 1 } })).setOrigin(0, 0);
      c.add([bg, icon, k]);
      return { c, icon };
    };
    const s1 = slot(W - 180, 'SPACE', 'sword', 4.4);
    const s2 = slot(W - 66, 'L', 'lantern', 4.2);
    this.slotSword = s1.c;
    this.slotLantern = s2.c;
    this.lanternIcon = s2.icon;

    this.banner = this.add.text(W / 2, 170, '', txt(76, '#fff6d8', { fontStyle: '600', stroke: '#05030e', strokeThickness: 12 })).setOrigin(0.5).setAlpha(0);
    this.bannerSub = this.add.text(W / 2, 240, '', txt(30, '#b4a6d4', { stroke: '#05030e', strokeThickness: 8 })).setOrigin(0.5).setAlpha(0);
    this.objTxt = this.add.text(46, 196, '', txt(30, '#fff0a8', { stroke: '#05030e', strokeThickness: 8 })).setOrigin(0, 0);
    this.guide = this.add.image(0, 0, 'guide-arrow').setScale(5).setVisible(false);

    // ---- dialog box ----
    this.dlg = this.add.container(0, 0).setVisible(false).setDepth(50);
    this.buildDialogFrame(true);
    this.refresh();
  }

  private buildDialogFrame(withPortrait: boolean) {
    this.dlg.removeAll(true);
    const x = 250, y = 780, w = 1420, h = 270;
    this.dlgPanel = pixelPanel(this, x, y, w, h);
    this.portraitBg = this.add.rectangle(x + 30, y + 34, 200, 200, 0x1f1735).setOrigin(0).setStrokeStyle(4, 0x3a2f57).setVisible(withPortrait);
    this.portrait = this.add.sprite(x + 130, y + 134, 'ch-mo', 0).setVisible(withPortrait);
    this.dlgNameBg = this.add.rectangle(x + 40, y - 30, 300, 58, 0xb4a6d4).setOrigin(0);
    this.dlgName = this.add.text(x + 60, y - 1, '', txt(36, '#05030e', { fontStyle: '600' })).setOrigin(0, 0.5);
    this.dlgText = this.add.text(x + 260, y + 40, '', txt(40, '#f4efff', { wordWrap: { width: 1110 }, lineSpacing: 12 }));
    this.dlgArrow = this.add.text(x + w - 54, y + h - 46, '▼', txt(30, '#f2cd6b')).setOrigin(0.5);
    this.tweens.add({ targets: this.dlgArrow, y: this.dlgArrow.y + 6, duration: 300, yoyo: true, repeat: -1 });
    this.dlg.add([this.dlgPanel, this.portraitBg, this.portrait, this.dlgNameBg, this.dlgName, this.dlgText, this.dlgArrow]);
  }

  // =============== HUD ===============
  refresh() {
    if (!this.hearts.length) return;
    const d = state.data;
    const n = Math.ceil(d.maxHp / 2);
    this.hearts.forEach((h, i) => {
      h.setVisible(i < n);
      const v = d.hp - i * 2;
      h.setTexture(v >= 2 ? 'heart-full' : v === 1 ? 'heart-half' : 'heart-empty');
    });
    const row2 = n > 10 ? 50 : 0;
    this.shardTxt.setText(String(d.shards).padStart(3, '0'));
    const k = d.keys[d.area] ?? 0;
    const inDungeon = d.area === 'archive';
    this.keyIcon.setVisible(inDungeon); this.keyTxt.setVisible(inDungeon).setText(String(k));
    this.shardTxt.y = 152 + row2; this.keyIcon.y = 152 + row2; this.keyTxt.y = 152 + row2;
    this.objTxt.y = 196 + row2;
    this.slotSword.setVisible(state.has('sword'));
    this.slotLantern.setVisible(state.has('lantern'));
    const w = this.scene.get('world') as unknown as { lanternOn?: boolean };
    this.lanternIcon.setTexture(w?.lanternOn ? 'lantern' : 'lantern-off');
  }

  onAreaEnter(name: string, dark: boolean) {
    this.refresh();
    this.banner.setText(name).setAlpha(0).setY(160);
    this.bannerSub.setText(dark ? 'Dungeon' : '').setAlpha(0);
    this.tweens.killTweensOf([this.banner, this.bannerSub]);
    this.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 1, y: '+=10', duration: 600, delay: 300, hold: 1800, yoyo: true });
  }

  /** One line under the hearts: what to do next. */
  setObjective(text: string) {
    if (!this.objTxt || text === this.objective) return;
    const first = this.objective.replace(/\(.*\)/, '') !== text.replace(/\(.*\)/, '');
    this.objective = text;
    this.objTxt.setText(text ? '◆ ' + text : '');
    if (first && text) {
      this.objTxt.setAlpha(0).setX(20);
      this.tweens.add({ targets: this.objTxt, alpha: 1, x: 46, duration: 350, ease: 'Cubic.out' });
    }
  }

  /** Arrow at the screen edge pointing to the objective (no arguments hides it). */
  setGuide(x?: number, y?: number, angle = 0) {
    if (!this.guide) return;
    if (x === undefined || y === undefined) { this.guide.setVisible(false); return; }
    const bob = Math.sin(this.time.now / 160) * 8;
    this.guide.setVisible(true).setRotation(angle).setPosition(x + Math.cos(angle) * bob, y + Math.sin(angle) * bob);
  }

  /** Big key hint at the bottom, shown until the player has used the key. */
  coach(key = '', text = '') {
    if (key === this.coachKey) return;
    this.coachBox?.destroy(true);
    this.coachBox = undefined;
    this.coachKey = key;
    if (!key) return;
    const label = this.add.text(0, 0, text, txt(40, '#fff6d8', { stroke: '#05030e', strokeThickness: 8 })).setOrigin(0, 0.5);
    const cap = this.add.text(0, 0, key, txt(34, '#2b1b5a', { fontStyle: '600', backgroundColor: '#f4efff', padding: { x: 18, y: 8 } })).setOrigin(0, 0.5);
    const total = cap.width + 24 + label.width;
    cap.setX(-total / 2); label.setX(-total / 2 + cap.width + 24);
    const shade = this.add.rectangle(-total / 2 - 4, 6, cap.width + 8, cap.height, 0x8a7fc0).setOrigin(0, 0.5);
    const c = this.add.container(W / 2, H - 120, [shade, cap, label]).setAlpha(0);
    this.coachBox = c;
    this.tweens.add({ targets: c, alpha: 1, y: H - 130, duration: 300 });
    this.tweens.add({ targets: cap, y: 4, duration: 420, yoyo: true, repeat: -1, delay: 400 });
  }

  hurtFlash() {
    const r = this.add.rectangle(0, 0, W, H, 0xff2a4a, 0.22).setOrigin(0).setDepth(40);
    this.tweens.add({ targets: r, alpha: 0, duration: 260, onComplete: () => r.destroy() });
  }

  itemBanner(title: string) {
    const t = this.add.text(W / 2, 330, title, txt(64, '#fff0a8', { fontStyle: '600', stroke: '#05030e', strokeThickness: 12 })).setOrigin(0.5).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 400, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 500, onComplete: () => t.destroy() });
  }

  toast(msg: string, color = 0xb4a6d4) {
    if (!this.sys.isActive()) return;
    const y = 300 + this.toastY;
    this.toastY = (this.toastY + 70) % 280;
    const t = this.add.text(W - 40, y, msg, txt(30, '#f4efff', { backgroundColor: '#120c22', padding: { x: 18, y: 10 } })).setOrigin(1, 0).setAlpha(0);
    const bar = this.add.rectangle(W - 40 - t.width - 6, y, 6, t.height, color).setOrigin(0, 0).setAlpha(0);
    this.tweens.add({ targets: [t, bar], alpha: 1, x: '-=20', duration: 300 });
    this.tweens.add({ targets: [t, bar], alpha: 0, delay: 3200, duration: 400, onComplete: () => { t.destroy(); bar.destroy(); } });
  }

  noteToast(id: string) {
    const n = NOTES[id];
    if (!n) return;
    audio.sfx('note');
    const c = this.add.container(W - 40, 210).setAlpha(0);
    const bg = pixelPanel(this, -560, 0, 560, 130, 0xf2cd6b);
    const a = this.add.text(-530, 26, 'NEW FIELD NOTE', txt(24, '#f2cd6b', { fontStyle: '600' }));
    const b = this.add.text(-530, 58, n.title, txt(40, '#fff6d8', { fontStyle: '600' }));
    const k = this.add.text(-30, 26, 'Tab', txt(22, '#05030e', { backgroundColor: '#b4a6d4', padding: { x: 6, y: 1 } })).setOrigin(1, 0);
    c.add([bg, a, b, k]);
    this.tweens.add({ targets: c, alpha: 1, x: W - 60, duration: 350 });
    this.tweens.add({ targets: c, alpha: 0, delay: 4200, duration: 500, onComplete: () => c.destroy() });
  }

  faint(): Promise<void> {
    return new Promise((res) => {
      const bg = this.add.rectangle(0, 0, W, H, 0x05030e, 0).setOrigin(0).setDepth(80);
      const t = this.add.text(W / 2, H / 2 - 20, 'You fainted...', txt(72, '#ff9fb0', { fontStyle: '600' })).setOrigin(0.5).setAlpha(0).setDepth(81);
      const s = this.add.text(W / 2, H / 2 + 60, 'ADA patches you up. Try again!', txt(34, '#b4a6d4')).setOrigin(0.5).setAlpha(0).setDepth(81);
      this.tweens.add({ targets: bg, fillAlpha: 1, duration: 900 });
      this.tweens.add({ targets: [t, s], alpha: 1, delay: 700, duration: 500 });
      this.time.delayedCall(2600, () => {
        this.tweens.add({ targets: [bg, t, s], alpha: 0, duration: 500, onComplete: () => { bg.destroy(); t.destroy(); s.destroy(); } });
        res();
      });
    });
  }

  /** End-of-chapter card with a few stats. Resolves on a key press. */
  chapterCard(): Promise<void> {
    return new Promise((res) => {
      this.dialogOpen = true;
      const c = this.add.container(0, 0).setDepth(90).setAlpha(0);
      c.add(this.add.rectangle(0, 0, W, H, 0x05030e, 0.85).setOrigin(0));
      c.add(pixelPanel(this, 460, 170, 1000, 740, 0xf2cd6b));
      c.add(this.add.text(W / 2, 250, 'CHAPTER 1 COMPLETE', txt(40, '#f2cd6b', { fontFamily: FONT_PX })).setOrigin(0.5));
      c.add(this.add.text(W / 2, 330, 'The Archive of Drawers', txt(56, '#fff6d8', { fontStyle: '600' })).setOrigin(0.5));
      const d = state.data;
      const rows: [string, string][] = [
        ['Time', `${Math.floor(d.playMs / 60000)} min ${Math.floor((d.playMs / 1000) % 60)} s`],
        ['Field Notes', `${d.notes.length} / ${Object.keys(NOTES).length}`],
        ['Hearts', `${d.maxHp / 2}`],
        ['Moon Beetles', `${state.count('beetles')} / 3`],
        ['Faints', `${d.deaths}`],
        ['Difficulty', state.diff.label],
      ];
      rows.forEach(([a, b], i) => {
        c.add(this.add.text(620, 420 + i * 62, a, txt(36, '#b4a6d4')));
        c.add(this.add.text(1300, 420 + i * 62, b, txt(36, '#fff6d8', { fontStyle: '600' })).setOrigin(1, 0));
      });
      c.add(this.add.text(W / 2, 830, 'Next: The Canyon of Intent (coming soon)   ·   press E to keep exploring', txt(28, '#8a82b8')).setOrigin(0.5));
      this.tweens.add({ targets: c, alpha: 1, duration: 600 });
      const t0 = this.time.now;
      this.cardClose = () => {
        if (this.time.now - t0 < 1200) return;
        this.cardClose = undefined;
        this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => { c.destroy(true); this.dialogOpen = false; res(); } });
      };
    });
  }

  /** Full-screen fade used by cutscenes. */
  flash(color = 0xffffff, ms = 600) {
    const r = this.add.rectangle(0, 0, W, H, color, 1).setOrigin(0).setDepth(70);
    this.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }

  private talking(on: boolean) {
    this.objTxt.setVisible(!on);
    this.coachBox?.setVisible(!on);
    if (on) this.guide.setVisible(false);
  }

  // =============== dialog ===============
  dialog(lines: Line[]): Promise<void> {
    return new Promise((res) => {
      this.queue = [...lines];
      this.onDone = res;
      this.dialogOpen = true;
      this.openedAt = this.time.now;
      this.dlg.setVisible(true).setAlpha(0);
      this.talking(true);
      this.tweens.add({ targets: this.dlg, alpha: 1, duration: 120 });
      this.nextLine();
    });
  }

  choose(prompt: Line, options: string[]): Promise<number> {
    return new Promise((res) => {
      this.queue = [];
      this.dialogOpen = true;
      this.openedAt = this.time.now;
      this.dlg.setVisible(true).setAlpha(1);
      this.talking(true);
      this.showLine(prompt);
      const bw = 520, bh = 40 + options.length * 64;
      const box = this.add.container(1670 - bw, 780 - bh - 20).setDepth(51);
      box.add(pixelPanel(this, 0, 0, bw, bh, 0xf2cd6b));
      const texts = options.map((o, i) => this.add.text(60, 26 + i * 64, o, txt(36, '#f4efff')));
      box.add(texts);
      this.choice = { options, sel: 0, texts, box, resolve: res };
      this.updateChoice();
    });
  }

  private updateChoice() {
    const c = this.choice!;
    c.texts.forEach((t, i) => t.setText((i === c.sel ? '▶ ' : '   ') + c.options[i]).setColor(i === c.sel ? '#fff0a8' : '#b4a6d4').setX(i === c.sel ? 24 : 24));
  }

  private showLine(l: Line) {
    const sp = l.who ? SPEAKERS[l.who] : undefined;
    const name = l.who === 'nova' ? state.data.name || 'Nova' : sp?.name;
    const withPortrait = !!sp;
    this.portrait.setVisible(withPortrait); this.portraitBg.setVisible(withPortrait);
    this.dlgText.setX(withPortrait ? 510 : 310).setWordWrapWidth(withPortrait ? 1110 : 1300);
    if (sp) {
      this.portrait.setTexture(sp.tex, sp.frame ?? 0);
      // people: head and shoulders; creatures: the whole sprite
      if (sp.tex.startsWith('ch-')) this.portrait.setCrop(0, 0, 16, 14).setOrigin(0.5, 0).setScale(12).setY(780 + 46);
      else this.portrait.setCrop().setOrigin(0.5).setScale(sp.scale ?? 11).setY(780 + 134);
      this.portraitBg.setFillStyle(Phaser.Display.Color.ValueToColor(sp.color).darken(55).color);
    }
    this.dlgNameBg.setVisible(!!name);
    this.dlgName.setVisible(!!name).setText(name ?? '');
    if (name) this.dlgNameBg.setSize(this.dlgName.width + 44, 58).setFillStyle(sp?.color ?? 0xb4a6d4);
    this.dlgName.setColor(sp && Phaser.Display.Color.ValueToColor(sp.color).v < 0.6 ? '#f4efff' : '#05030e');
    this.full = (l.text ?? '').replace(/\{name\}/g, state.data.name || 'Nova');
    this.shown = 0;
    this.dlgText.setText('');
    this.dlgArrow.setVisible(false);
  }

  private nextLine() {
    const l = this.queue.shift();
    if (!l) { this.closeDialog(); return; }
    this.showLine(l);
  }

  private closeDialog() {
    this.dialogOpen = false;
    this.dlg.setVisible(false);
    this.talking(false);
    const d = this.onDone;
    this.onDone = undefined;
    // keep the world from re-triggering on the same key press
    this.time.delayedCall(60, () => d?.());
  }

  // =============== journal menu ===============
  openMenu() {
    this.menuOpen = true;
    this.openedAt = this.time.now;
    this.menuSel = 0;
    audio.sfx('select');
    this.drawMenu();
  }

  private closeMenu() {
    this.menu?.destroy(true);
    this.menu = undefined;
    this.time.delayedCall(80, () => { this.menuOpen = false; });
  }

  private drawMenu() {
    this.menu?.destroy(true);
    const c = this.add.container(0, 0).setDepth(60);
    this.menu = c;
    c.add(this.add.rectangle(0, 0, W, H, 0x05030e, 0.78).setOrigin(0));
    c.add(pixelPanel(this, 160, 90, 1600, 900));
    const tabs = ['Quests', 'Field Notes', 'Controls'];
    tabs.forEach((t, i) => {
      const on = i === this.menuTab;
      const b = this.add.text(220 + i * 330, 120, t, txt(40, on ? '#05030e' : '#b4a6d4', { fontStyle: '600', backgroundColor: on ? '#f2cd6b' : undefined, padding: { x: 20, y: 8 } }));
      c.add(b);
    });
    c.add(this.add.text(1700, 130, 'A / D switch tab   W / S select   Tab close', txt(24, '#8a82b8')).setOrigin(1, 0));
    const d = state.data;
    if (this.menuTab === 0) {
      const qs = Object.entries(QUESTS).filter(([id]) => state.quest(id) > 0);
      if (!qs.length) c.add(this.add.text(240, 240, 'No quests yet. Talk to people!', txt(36, '#b4a6d4')));
      qs.forEach(([id, q], i) => {
        const st = state.quest(id);
        const done = st >= q.done;
        const y = 240 + i * 190;
        c.add(this.add.text(240, y, (done ? '✔ ' : '◆ ') + q.title, txt(42, done ? '#86d27e' : '#fff6d8', { fontStyle: '600' })));
        let desc = q.stages[st] ?? '';
        if (id === 'beetles' && st === 1) desc = desc.replace('(0/3)', `(${Math.min(3, state.count('beetles'))}/3)`);
        c.add(this.add.text(290, y + 58, desc, txt(32, '#d8d0f0', { wordWrap: { width: 1380 }, lineSpacing: 6 })));
        c.add(this.add.text(1700, y + 8, `from ${q.giver}`, txt(26, '#8a82b8')).setOrigin(1, 0));
      });
    } else if (this.menuTab === 1) {
      const ids = d.notes;
      if (!ids.length) c.add(this.add.text(240, 240, 'Your Field Notes are empty. Explore and listen.', txt(36, '#b4a6d4')));
      this.menuSel = Phaser.Math.Clamp(this.menuSel, 0, Math.max(0, ids.length - 1));
      ids.forEach((id, i) => {
        const on = i === this.menuSel;
        c.add(this.add.text(230, 240 + i * 66, (on ? '▶ ' : '   ') + NOTES[id].title, txt(36, on ? '#fff0a8' : '#b4a6d4', { fontStyle: on ? '600' : '400' })));
      });
      const total = Object.keys(NOTES).length;
      c.add(this.add.text(230, 930, `${ids.length} / ${total} discovered`, txt(28, '#8a82b8')));
      const n = NOTES[ids[this.menuSel]];
      if (n) {
        c.add(this.add.rectangle(760, 230, 4, 720, 0x3a2f57).setOrigin(0));
        c.add(this.add.text(810, 240, n.title, txt(52, '#fff6d8', { fontStyle: '600' })));
        c.add(this.add.text(810, 310, n.where, txt(28, '#f2cd6b')));
        c.add(this.add.text(810, 380, n.body.join('\n\n'), txt(34, '#e4def4', { wordWrap: { width: 890 }, lineSpacing: 10 })));
      }
    } else {
      const rows = [
        ['Move', 'W A S D  or  arrow keys'], ['Sword', 'Space  or  J'], ['Talk / open / read', 'E  or  K  or  Enter'],
        ['Raise the lantern', 'L  or  Q'], ['Journal', 'Tab  or  Esc'], ['Music on / off', 'M'],
      ];
      rows.forEach(([a, b], i) => {
        c.add(this.add.text(260, 260 + i * 80, a, txt(38, '#fff6d8', { fontStyle: '600' })));
        c.add(this.add.text(900, 260 + i * 80, b, txt(38, '#b4a6d4')));
      });
      c.add(this.add.text(260, 800, `${state.data.name || 'Nova'}   ·   ${state.diff.label}   ·   ${Math.floor(state.data.playMs / 60000)} min played`, txt(30, '#8a82b8')));
      if (state.admin) c.add(this.add.text(260, 860, 'Admin: P god mode · G items · 1-4 warp', txt(28, '#ff9fb0')));
    }
  }

  update(_t: number, _d: number) {
    const k = this.keys;
    const pressed = new Set<Phaser.Input.Keyboard.Key>();
    for (const key of Object.values(k)) if (Phaser.Input.Keyboard.JustDown(key)) pressed.add(key);
    const jd = (key: Phaser.Input.Keyboard.Key) => pressed.has(key);
    if (this.menuOpen && this.menu) {
      const close = jd(k.TAB) || jd(k.ESC);
      if (close && this.time.now - this.openedAt > 150) { this.closeMenu(); return; }
      if (jd(k.A) || jd(k.LEFT)) { this.menuTab = (this.menuTab + 2) % 3; audio.sfx('blip'); this.drawMenu(); }
      if (jd(k.D) || jd(k.RIGHT)) { this.menuTab = (this.menuTab + 1) % 3; audio.sfx('blip'); this.drawMenu(); }
      if (jd(k.W) || jd(k.UP)) { this.menuSel--; audio.sfx('blip'); this.drawMenu(); }
      if (jd(k.S) || jd(k.DOWN)) { this.menuSel++; audio.sfx('blip'); this.drawMenu(); }
      return;
    }
    if (!this.dialogOpen) return;
    if (this.cardClose) {
      if (jd(k.K) || jd(k.E) || jd(k.SPACE) || jd(k.ENTER) || jd(k.J)) this.cardClose();
      return;
    }
    // typewriter
    if (this.shown < this.full.length) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + _d * 0.085);
      if (Math.floor(this.shown) !== before) {
        this.dlgText.setText(this.full.slice(0, Math.floor(this.shown)));
        if (before % 4 === 0) audio.sfx('type');
      }
      if (this.shown >= this.full.length) this.dlgArrow.setVisible(!this.choice);
    }
    if (this.time.now - this.openedAt < 150) return;
    if (this.choice) {
      const c = this.choice;
      if (jd(k.W) || jd(k.UP)) { c.sel = (c.sel + c.options.length - 1) % c.options.length; audio.sfx('blip'); this.updateChoice(); }
      if (jd(k.S) || jd(k.DOWN)) { c.sel = (c.sel + 1) % c.options.length; audio.sfx('blip'); this.updateChoice(); }
    }
    const adv = jd(k.K) || jd(k.E) || jd(k.SPACE) || jd(k.ENTER) || jd(k.J);
    if (!adv) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.dlgText.setText(this.full);
      this.dlgArrow.setVisible(!this.choice);
      return;
    }
    if (this.choice) {
      const c = this.choice;
      this.choice = undefined;
      c.box.destroy(true);
      audio.sfx('select');
      this.dialogOpen = false;
      this.dlg.setVisible(false);
      this.talking(false);
      this.time.delayedCall(60, () => c.resolve(c.sel));
      return;
    }
    audio.sfx('blip');
    this.nextLine();
  }
}

export { hex };
