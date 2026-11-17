import Phaser from 'phaser';
import { audio } from '../core/audio';
import { ChapterId, state } from '../core/state';
import { shootingStar, SpaceBg, spaceBackground } from '../ui/art';
import { Dialog, drawPortrait, Who } from '../ui/dialog';
import { button, C, fadeTo, H, W, panel, txt, wait } from '../ui/theme';

/** Shared scene features: background, music, mute (M), admin mode (P), dialog. */
export class BaseScene extends Phaser.Scene {
  protected dialog!: Dialog;
  protected bg?: SpaceBg;
  private adminBadge?: Phaser.GameObjects.Text;

  protected setup(opts: { music?: string; nebula?: string[]; worldW?: number; worldH?: number; seed?: number; tint?: number; noBg?: boolean } = {}) {
    this.cameras.main.fadeIn(350, 7, 11, 26);
    if (!opts.noBg) this.bg = spaceBackground(this, opts);
    if (opts.music) audio.play(opts.music);
    this.dialog = new Dialog(this);
    const kb = this.input.keyboard!;
    kb.on('keydown-M', () => audio.setMuted(!state.muted));
    kb.on('keydown-P', () => { state.admin = !state.admin; this.refreshAdmin(); this.onAdminToggle(); });
    this.input.on('pointerdown', () => audio.unlock());
    kb.on('keydown', () => audio.unlock());
    this.refreshAdmin();
    this.time.addEvent({ delay: 5000, loop: true, callback: () => { if (Math.random() < 0.5) shootingStar(this); } });
  }

  protected onAdminToggle() { /* scenes may override */ }

  private refreshAdmin() {
    this.adminBadge?.destroy();
    this.adminBadge = undefined;
    if (state.admin) {
      this.adminBadge = this.add.text(W - 8, H - 6, 'ADMIN · N: Kapitel überspringen', txt(11, C.sig)).setOrigin(1, 1).setScrollFactor(0).setDepth(9000);
    }
  }

  update(_t: number, dt: number) {
    this.bg?.update(dt);
  }

  protected say(lines: { who?: Who; text: string }[]) {
    return this.dialog.say(lines);
  }

  protected wait(ms: number) { return wait(this, ms); }
}

/**
 * Base class for the planet chapters: a header bar, an ESC exit back to the
 * galaxy, an admin skip and a shared end-of-chapter card.
 */
export class ChapterScene extends BaseScene {
  protected chapter!: ChapterId;
  protected startedAt = 0;
  protected finished = false;
  protected scoreText?: Phaser.GameObjects.Text;

  protected chapterSetup(id: ChapterId, title: string, music: string, opts: { nebula?: string[]; tint?: number } = {}) {
    this.chapter = id;
    this.finished = false;
    this.startedAt = this.time.now;
    this.setup({ music, ...opts });
    const bar = this.add.graphics().setDepth(4000);
    bar.fillStyle(C.void, 0.85).fillRect(0, 0, W, 40);
    bar.lineStyle(1, C.panelEdge, 1).lineBetween(0, 40, W, 40);
    this.add.text(16, 9, title, txt(19, C.gold)).setDepth(4001);
    const diff = { easy: 'Leicht', normal: 'Normal', hard: 'Schwer' }[state.data.difficulty];
    this.add.text(W - 16, 11, `${state.data.name || 'Gast'} · ${diff} · ESC: Karte`, txt(13, C.dim)).setOrigin(1, 0).setDepth(4001);
    this.input.keyboard!.on('keydown-ESC', () => { if (!this.finished) fadeTo(this, 'galaxy'); });
    this.input.keyboard!.on('keydown-N', () => { if (state.admin && !this.finished) this.finish(1000, 'Admin: übersprungen.'); });
  }

  /** End of chapter: save result and show a card with stars and the key insight. */
  protected async finish(rawScore: number, insight: string, who: Who = 'ada') {
    if (this.finished) return;
    this.finished = true;
    const { score, stars } = state.complete(this.chapter, rawScore, this.time.now - this.startedAt);
    audio.sfx('success');
    const layer = this.add.container(0, 0).setDepth(6000).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, W, H, C.void, 0.75).setOrigin(0).setInteractive();
    layer.add(dim);
    layer.add(panel(this, W / 2 - 260, 90, 520, 340, C.gold));
    layer.add(this.add.text(W / 2, 125, 'Kapitel geschafft!', txt(30, C.gold)).setOrigin(0.5));
    for (let i = 0; i < 3; i++) {
      const s = this.add.star(W / 2 - 70 + i * 70, 190, 5, 14, 30, i < stars ? C.gold : 0x2a335e).setScale(0);
      if (i < stars) s.setStrokeStyle(3, 0xffffff, 0.8);
      layer.add(s);
      this.tweens.add({ targets: s, scale: 1, angle: 360, delay: 200 + i * 250, duration: 500, ease: 'Back.out', onStart: () => { if (i < stars) audio.sfx('coin'); } });
    }
    const sc = this.add.text(W / 2, 245, '0 Punkte', txt(26, C.text)).setOrigin(0.5);
    layer.add(sc);
    this.tweens.addCounter({ from: 0, to: score, duration: 900, delay: 600, onUpdate: (t) => sc.setText(`${Math.round(t.getValue() ?? 0)} Punkte`) });
    const p = drawPortrait(this, who, W / 2 - 200, 320, 0.8);
    const ins = this.add.text(W / 2 - 160, 320, insight, txt(16, C.text, { wordWrap: { width: 380 } })).setOrigin(0, 0.5);
    layer.add([p, ins]);
    await wait(this, 900);
    const btn = button(this, W / 2, 395, 'Weiter zur Sternenkarte', () => fadeTo(this, 'galaxy', { from: this.chapter }), { w: 300, fill: C.blue });
    layer.add(btn);
    this.input.keyboard!.once('keydown-ENTER', () => fadeTo(this, 'galaxy', { from: this.chapter }));
  }
}
