import Phaser from 'phaser';
import { state } from './core/state';
import { TitleScene } from './scenes/TitleScene';
import { H, UIScene, W } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';

async function start() {
  // Make sure the pixel fonts are ready before Phaser renders any text.
  try {
    await Promise.all([
      document.fonts.load('400 32px "Pixelify Sans"'),
      document.fonts.load('600 32px "Pixelify Sans"'),
      document.fonts.load('400 32px "Press Start 2P"'),
    ]);
  } catch { /* fall back to system fonts */ }

  // ?admin&area=woods jumps straight into an area (for testing).
  const q = new URLSearchParams(location.search);
  const area = q.get('area');
  const scenes: Phaser.Types.Scenes.SceneType[] = area && state.admin ? [WorldScene, UIScene, TitleScene] : [TitleScene, WorldScene, UIScene];
  if (area && state.admin) {
    if (!state.data.name) state.newGame('Tester', (q.get('diff') as 'easy' | 'normal' | 'hard') ?? 'normal');
    state.data.area = area;
    state.data.spawn = q.get('spawn') ?? '';
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#05030e',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: scenes,
  });
  (window as unknown as { game: Phaser.Game }).game = game;
}

start();
