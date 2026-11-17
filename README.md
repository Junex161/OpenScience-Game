# REPLICA: Light for the Open Index

A compact top-down action adventure in the spirit of the classic 2D Zelda games, about Open Science.
It plays on Lumen, a moon of floating islands under a ringed giant. Glimmerlings steal the light of the
Index Beacon, you get a sword, and the trail leads into a dungeon full of results nobody wanted to publish.

The Open Science ideas are never lectured. You meet them as things in the world (a doctor with "twenty recipes",
drawers full of quiet "no effect" results, a boss that only keeps what is golden), and your journal names
the idea afterwards as a **Field Note**.

Built with [Phaser 4](https://phaser.io), TypeScript and Vite. All graphics, music and sound are generated in code.
Fonts: Pixelify Sans and Press Start 2P (SIL Open Font License, see `public/fonts`).

## Play locally

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

> **Windows:** if the project folder path contains an `&` (e.g. `Me, Myself & I`), `npm run dev` fails because of how
> npm starts programs on Windows. Either rename the folder (e.g. `Me, Myself and I`) or start Vite directly:
> `node .\node_modules\vite\bin\vite.js`

## Controls

| Action | Keys |
| --- | --- |
| Move | W A S D or arrow keys |
| Sword | Space or J |
| Talk, open, read | E, K or Enter |
| Raise the lantern | L or Q |
| Journal (quests, Field Notes, controls) | Tab or Esc |
| Music on/off | M |

The game shows the important keys itself when you need them, a line under the hearts says what to do next,
and a golden arrow points the way.

## Chapter 1 (playable, about 15 minutes)

| Place | What happens | Field Note |
| --- | --- | --- |
| Haven | The Beacon goes dark, Glimmerlings raid the plaza, Mo throws you the sword *Occam's Edge* | |
| Haven (optional) | Pip thinks all Moon Beetles are blue after seeing one | Small Samples |
| Haven (optional) | Dr. Gloss sells a tonic: one of twenty recipes had p = .04 | Twenty Tries, One Hit |
| Whispering Woods | Glimmerlings, Noise Bats, hidden beetles, a secret grove, the reporter Quill | |
| Archive of Drawers | Room-by-room dungeon: small key, locked door, the **Lantern of Openness**, invisible bridges | Openness |
| Archive of Drawers | Four drawers hide Null Wisps, unpublished results. Freeing them breaks the gilded seal | The File Drawer, Replication, Null Results Matter |
| Archive of Drawers | Boss: the **Gilded Curator** hides among golden statues; only the lantern shows which one is real | Publication Bias |

Planned for the full game (about 40 to 50 minutes in total): the Canyon of Intent (preregistration),
the Hall of Echoes (replication), the final boss HYPE and an end-of-game scoreboard.

## Difficulty and admin mode

Difficulties: *Explorer* (4 hearts, slower enemies), *Adventurer* (normal), *Reviewer #2* (enemies hit twice as hard).

Admin mode for testing: open the game with `?admin` in the address, e.g. `http://localhost:5173/?admin&area=archive`.

| Key | Admin action |
| --- | --- |
| P | God mode on/off (no damage, faster) |
| G | Get sword, lantern, a key and shards |
| 1 / 2 / 3 / 4 | Warp to Haven / Woods / Archive / boss room |

URL parameters: `area=haven|woods|archive`, `spawn=<spawn id>`, `diff=easy|normal|hard`.

## Project structure

```
src/
  main.ts              game config
  art/                 pixel-art generators (terrain, characters, props, monsters)
  core/audio.ts        soundtrack (hand-written songs, synthesised instruments) + sound effects
  core/state.ts        save game (localStorage)
  data/journal.ts      Field Notes and quest texts
  scenes/TitleScene.ts title, name entry, difficulty
  scenes/WorldScene.ts the world: collision, lighting, dungeon rooms, combat, guide arrow
  scenes/UIScene.ts    HUD, objective line, key hints, dialog boxes, journal
  world/maps.ts        area layouts (drawn with small helper functions)
  world/kinds.ts       placeable objects (sprite, collision, behaviour)
  world/actors.ts      player, NPCs, enemies, pickups
  world/boss.ts        the Gilded Curator
  world/content.ts     story, quests and all dialog
tests/
  maps.test.ts         checks that maps, spawns and warps are consistent
  audio.test.ts        checks the songs (bar lengths, note range, melody against chords)
  e2e/play.cjs         bot that plays Chapter 1 start to finish and takes screenshots
  e2e/look.cjs         screenshots of each area
  e2e/sound.cjs        renders every song and prints its loudness
```

## Tests

```bash
npm test                                   # unit tests
npm run build && npx vite preview --port 4173
node tests/e2e/play.cjs normal             # in a second terminal: full bot playthrough
```

## Deploy (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` builds and publishes the game on every push to `main`
(enable it once under *Settings → Pages → Source: GitHub Actions*). The game can then be embedded in the
portfolio with an iframe:

```html
<iframe src="https://junex161.github.io/OpenScience-Game/" width="960" height="540" style="border:0" allowfullscreen></iframe>
```

## Sources for the Open Science content

- Open Science Collaboration (2015). Estimating the reproducibility of psychological science. *Science, 349*(6251).
- Rosenthal, R. (1979). The "file drawer problem" and tolerance for null results. *Psychological Bulletin, 86*(3).
- Simmons, J. P., Nelson, L. D., & Simonsohn, U. (2011). False-positive psychology. *Psychological Science, 22*(11).
- Button, K. S., et al. (2013). Power failure: why small sample size undermines the reliability of neuroscience. *Nature Reviews Neuroscience, 14*(5).
- Chambers, C. D. (2013). Registered Reports: A new publishing initiative at Cortex. *Cortex, 49*(3).
