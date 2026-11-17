// Story, quests and all the talking. Open Science is never lectured:
// people just live with its problems, and the journal names them later.
// Rule of thumb for every scene here: play first, talk second, and never
// more than three lines in a row.
import Phaser from 'phaser';
import { audio } from '../core/audio';
import { state } from '../core/state';
import type { Prop, WorldScene } from '../scenes/WorldScene';
import type { Line } from '../scenes/UIScene';
import type { Npc } from './actors';

const T = 16;
let busyScript = false;

async function run(w: WorldScene, fn: () => Promise<void>) {
  if (busyScript) return;
  busyScript = true;
  w.cut = true;
  try { await fn(); } finally { busyScript = false; w.cut = false; w.ui.refresh(); state.save(); }
}

// ------------------------------------------------------------------
// What to do next: one short line in the HUD plus an arrow in the world.
// ------------------------------------------------------------------
export interface Objective { text: string; target?: [number, number]; lift?: number }

/** Where the way to another area starts, seen from the current one. */
const WAY: Record<string, Record<string, [number, number]>> = {
  haven: { woods: [22, 1], archive: [22, 1] },
  woods: { haven: [29, 44.5], archive: [12.5, 9.6] },
  archive: { woods: [22, 57], haven: [22, 57] },
};

export function objective(w: WorldScene): Objective {
  const a = w.area.id;
  const main = state.quest('main');
  const to = (area: string, text: string, here?: [number, number], lift?: number): Objective => {
    const t = a === area ? here : WAY[a]?.[area];
    return { text, target: t ? [t[0] * T, t[1] * T] : undefined, lift: a === area ? lift : 14 };
  };
  if (main <= 1) return { text: state.flag('intro-done') ? `Drive off the Glimmerlings  (${w.enemies.length} left)` : '' };
  if (main === 2) return to('archive', 'Follow the Glimmerlings north to the old Archive');
  if (main === 3 || main === 4) {
    if (a !== 'archive') return to('archive', 'Return to the Archive of Drawers');
    if (!state.has('lantern')) {
      const door = w.prop('door-a');
      if (door && !(state.data.keys.archive > 0)) return { text: 'The door is locked. Search the side rooms for a key' };
      if (door) return { text: 'Unlock the door in the entrance hall', target: [22 * T, 46 * T], lift: 36 };
      return { text: 'See what the Archive keeps behind the locked door', target: [22 * T, 38.6 * T], lift: 26 };
    }
    const n = state.count('wisps');
    if (n < 4) return { text: `Raise the Lantern (L) and open the old drawers  (${n}/4)` };
    if (w.prop('door-boss')) return { text: 'The seal is cracking. Cross the dark hall to the north', target: [22 * T, 16 * T], lift: 36 };
    return { text: 'Face the Gilded Curator' };
  }
  if (main === 5) {
    if (a === 'archive') return { text: 'Step into the light', target: [22 * T, 9 * T], lift: 22 };
    const mo = w.npc('mo');
    return to('haven', 'Bring the news to Mo', mo ? [mo.x / T, mo.y / T] : [20, 19], 34);
  }
  return { text: '' };
}

/** The bridge out of Haven only opens once the plaza is safe. */
export function warpAllowed(w: WorldScene) {
  return !(w.area.id === 'haven' && state.quest('main') < 2);
}

// ------------------------------------------------------------------
export function setupArea(w: WorldScene) {
  busyScript = false;
  const a = w.area.id;
  for (const p of w.props) {
    if (!p.id) continue;
    if (p.tags.includes('chest') && state.flag(`opened:${p.id}`)) p.setTexture(p.kind === 'bigchest' ? 'bigchest-open' : 'chest-open');
    if (p.kind === 'drawer' && state.flag(`drawer:${p.id}`)) p.setTexture('drawer-open');
  }
  if (a === 'haven') {
    // the Beacon burns before the raid and again after the Archive is freed
    const on = !state.flag('intro-done') || state.quest('main') >= 6;
    setBeacon(w, on, true);
  }
  if (a === 'archive' && state.flag('boss-archive')) {
    const portal = w.add.image(22 * T, 9 * T, 'glow').setTint(0x5ef0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setDepth(2);
    w.tweens.add({ targets: portal, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
    if (!w.area.warps.some((x) => x.to === 'haven')) w.area.warps.push({ x: 21.5, y: 8.5, w: 1, h: 1, to: 'haven', spawn: 'fromArchive' });
  }
}

function setBeacon(w: WorldScene, on: boolean, instant = false) {
  const b = w.prop('beacon');
  if (!b) return;
  b.setTexture(on ? 'beacon-lit' : 'beacon');
  if (!b.glow) return;
  w.tweens.killTweensOf(b.glow);
  if (instant) b.glow.setScale(on ? 1.7 : 0.5).setAlpha(on ? 0.75 : 0.12);
  else w.tweens.add({ targets: b.glow, scale: on ? 1.7 : 0.5, alpha: on ? 0.75 : 0.12, duration: 1200 });
}

const RAID_SPOTS: [number, number][] = [[17.5, 17], [26.5, 17], [18.5, 20.6], [25.5, 20.6], [22, 15.6]];
const raidSize = () => ({ easy: 3, normal: 4, hard: 5 }[state.data.difficulty]);

export async function onEnter(w: WorldScene) {
  const a = w.area.id;
  if (a === 'haven' && !state.flag('intro-done')) return run(w, () => raidIntro(w));
  if (a === 'haven' && state.quest('main') === 1) {
    // came back after fainting (or loading) in the middle of the raid
    for (let i = 0; i < raidSize(); i++) { const e = w.spawnEnemy('glimmerling', ...RAID_SPOTS[i]); w.poof(e.x, e.y - 6); }
    audio.play('raid');
    w.ui.coach('SPACE', 'Swing your sword');
    return;
  }
  if (a === 'woods' && !state.flag('seen-woods')) {
    state.set('seen-woods');
    return run(w, () => w.say([{ who: 'ada', text: 'Glimmerlings everywhere. They only ever chase what glitters... funny creatures.' }]));
  }
  if (a === 'archive' && !state.flag('seen-archive')) {
    state.set('seen-archive');
    state.setQuest('main', 3);
    return run(w, () => w.say([{ who: 'ada', text: 'The Archive of Drawers. Shelf after shelf of results that nobody ever got to read.' }]));
  }
}

/** The opening: no lecture, the Beacon goes dark and you get a sword. */
async function raidIntro(w: WorldScene) {
  const p = w.player, mo = w.npc('mo');
  audio.stop();
  await w.wait(1100);
  // the Beacon flickers and dies
  for (let i = 0; i < 6; i++) {
    setBeacon(w, i % 2 === 1, true);
    audio.sfx('blip');
    await w.wait(90 + i * 45);
  }
  setBeacon(w, false, true);
  audio.sfx('dark');
  w.cameras.main.shake(600, 0.007);
  w.ui.flash(0x9ff4ff, 500);
  await w.wait(900);
  // Glimmerlings drop out of the sky around the plaza
  for (let i = 0; i < raidSize(); i++) {
    const e = w.spawnEnemy('glimmerling', ...RAID_SPOTS[i]);
    e.drop = 190; e.stateT = 1.2 + i * 0.25;
    e.sync();
    w.tweens.add({
      targets: e, drop: 0, duration: 420, delay: i * 130, ease: 'Quad.in',
      onUpdate: () => { if (!e.dead) e.sync(); },
      onComplete: () => { audio.sfx('stamp'); w.poof(e.x, e.y - 4); w.cameras.main.shake(90, 0.004); },
    });
  }
  await w.wait(1000);
  if (mo) mo.face(p.x, p.y);
  await w.say([{ who: 'mo', text: 'Glimmerlings! They are after the Beacon\'s light. {name}, catch!' }]);
  // Mo throws her old blade
  if (mo) {
    const sw = w.add.image(mo.x, mo.y - 14, 'sword').setDepth(9e5 + 2);
    audio.sfx('whoosh');
    await new Promise<void>((r) => w.tweens.add({ targets: sw, x: p.x, y: p.y - 22, angle: 720, duration: 420, ease: 'Sine.out', onComplete: () => { sw.destroy(); r(); } }));
  }
  state.give('sword');
  state.set('intro-done');
  state.setQuest('main', 1);
  audio.sfx('pickup');
  w.ui.itemBanner('Occam\'s Edge');
  w.ui.refresh();
  audio.play('raid');
  w.ui.coach('SPACE', 'Swing your sword');
}

async function raidWon(w: WorldScene) {
  const p = w.player, mo = w.npc('mo');
  w.ui.coach();
  audio.play('haven');
  await w.wait(500);
  if (mo) mo.face(p.x, p.y);
  await w.say([
    { who: 'mo', text: 'Well fought! But they carried off the Beacon\'s light. Glimmerlings flock to anything that shines.' },
    { who: 'mo', text: 'They came from the old Archive, north across the bridge. Keep my blade, {name}, and find out what is feeding them.' },
  ]);
  w.drone.setPosition(p.x + 150, p.y - 90).setVisible(true);
  audio.sfx('whoosh');
  await new Promise<void>((r) => w.tweens.add({ targets: w.drone, x: p.x + 14, y: p.y - 30, duration: 800, ease: 'Sine.out', onComplete: () => r() }));
  await w.say([{ who: 'ada', text: 'ADA, field unit, reporting in! You do the hitting, I take the notes.' }]);
  state.set('ada-joined');
  state.setQuest('main', 2);
  state.data.hp = state.data.maxHp;
}

export function onTick(w: WorldScene, _dt: number) {
  if (w.area.id === 'haven' && state.quest('main') === 1 && !busyScript && !w.cut && w.enemies.length === 0) run(w, () => raidWon(w));
  // coach marks disappear once the player has clearly got it
  if (w.ui.coachKey === 'SPACE' && state.quest('main') >= 2) w.ui.coach();
  if (w.ui.coachKey === 'L' && w.lanternOn) w.ui.coach();
}

// ------------------------------------------------------------------
const SIGNS: Record<string, string[]> = {
  'sign-woods': ['North: the Whispering Woods. Beyond them, the Archive of Drawers.'],
  'sign-canyon': ['The bridge to the Canyon of Intent has fallen. (The next chapter is still being written.)'],
  'sign-woods-south': ['South: Haven. North-west: the Archive of Drawers.'],
  'sign-archive': ['THE ARCHIVE OF DRAWERS. "Whatever is not shared is lost."'],
  'sign-archive-in': ['Quiet, please. Most results in this archive have been asleep for years.'],
  'sign-void': ['The Bridge of Openness. It is only there for those who bring their own light.'],
};

export async function onProp(w: WorldScene, p: Prop, how: 'interact' | 'pickup' | 'smash') {
  if (how === 'smash') return;
  const id = p.id ?? '';
  if (how === 'pickup') return pickup(w, p);
  if (p.kind === 'sign' && SIGNS[id]) return run(w, () => w.say(SIGNS[id].map((text) => ({ text }))));
  if (p.tags.includes('chest')) return openChest(w, p);
  if (p.kind === 'drawer') return drawer(w, p);
  if (id === 'door-a') return lockedDoor(w, p);
  if (id === 'door-boss') return bossDoor(w, p);
  if (id === 'stall-zib') { const n = w.npc('zib'); if (n) return talk(w, n); }
  if (id === 'stall-gloss') { const n = w.npc('gloss'); if (n) return talk(w, n); }
  if (id === 'beacon') return run(w, () => w.say(state.quest('main') >= 6
    ? [{ text: 'The Beacon hums, steady and bright. Fewer stars than before, but every one of them has been checked.' }]
    : [{ text: 'The Index Beacon. Every star it shows is a finding somebody published. Right now it is dark.' }]));
  if (p.kind.startsWith('house') || p.kind === 'library') {
    const t: Record<string, string> = {
      'house-nova': 'Your pod. ADA left the light on again.',
      'house-mo': 'Mo\'s pod. It smells like moonberry soup.',
      library: 'The Library of Haven. Its door is carved with hundreds of tiny drawers.',
    };
    return run(w, () => w.say([{ text: t[id] ?? 'The door is locked.' }]));
  }
}

async function pickup(w: WorldScene, p: Prop) {
  if (busyScript || !p.alive) return;
  const id = p.id ?? '';
  p.remove();
  state.set(`gone:${id}`);
  if (p.kind.startsWith('beetle')) {
    const n = state.inc('beetles');
    const col = p.kind.replace('beetle-', '');
    audio.sfx('pickup');
    await run(w, () => w.getItem(p.kind, 'Moon Beetle!', [{ text: `A ${col} Moon Beetle. It wiggles politely. (${n} caught)` }]));
    if (n >= 3 && state.quest('beetles') === 1) state.setQuest('beetles', 2);
  } else if (p.kind === 'heart-piece') {
    await run(w, () => heartPiece(w));
  }
}

async function heartPiece(w: WorldScene) {
  state.data.heartPieces++;
  const whole = state.data.heartPieces % 2 === 0;
  if (whole) { state.data.maxHp += 2; state.data.hp = state.data.maxHp; }
  await w.getItem('heart-piece', 'Piece of Heart!', [{ text: whole ? 'Two pieces make a whole new heart!' : 'One more piece makes a whole new heart.' }]);
}

async function openChest(w: WorldScene, p: Prop) {
  const id = p.id ?? '';
  if (state.flag(`opened:${id}`)) return run(w, () => w.say([{ text: 'It\'s empty.' }]));
  await run(w, async () => {
    state.set(`opened:${id}`);
    audio.sfx('chest');
    p.setTexture(p.kind === 'bigchest' ? 'bigchest-open' : 'chest-open');
    await w.wait(350);
    if (id === 'chest-lantern') {
      state.give('lantern');
      state.setQuest('main', 4);
      await w.getItem('lantern', 'Lantern of Openness!', [
        { text: 'Whatever stands in its light can be seen by everyone. Even things that seem not to exist.' },
      ]);
      w.note('open');
      await w.say([{ who: 'ada', text: 'So this is what the Archive was hiding. Try it on those old drawers we passed!' }]);
      w.ui.coach('L', 'Raise the lantern');
      return;
    }
    const d = p.data as { shards?: number; key?: string };
    if (d.key) {
      state.data.keys[d.key] = (state.data.keys[d.key] ?? 0) + 1;
      await w.getItem('key', 'Small Key', [{ text: 'It opens one locked door in this dungeon.' }]);
      return;
    }
    if (d.shards) {
      state.data.shards += d.shards;
      audio.sfx('coin');
      await w.getItem('shard', `${d.shards} Shards!`, [{ text: `${d.shards} data shards. Zib in Haven trades in these.` }]);
    }
  });
}

async function lockedDoor(w: WorldScene, p: Prop) {
  const k = state.data.keys.archive ?? 0;
  if (k <= 0) return run(w, () => w.say([{ text: 'Locked. There must be a key somewhere in the side rooms.' }]));
  await run(w, async () => {
    state.data.keys.archive = k - 1;
    state.set(`gone:${p.id}`);
    audio.sfx('door');
    w.tweens.add({ targets: p.spr, alpha: 0, y: p.y + 6, duration: 400 });
    await w.wait(420);
    p.remove();
    audio.sfx('secret');
  });
}

async function bossDoor(w: WorldScene, p: Prop) {
  const n = state.count('wisps');
  if (n < 4) {
    return run(w, () => w.say([
      { text: 'A gilded seal: "ONLY THE EXTRAORDINARY MAY ENTER."' },
      { who: 'ada', text: n === 0 ? 'It only listens to the loudest results. Maybe the quiet ones in the drawers can open it.' : `It trembles. ${n} of 4 quiet voices have reached it.` },
    ]));
  }
  await run(w, async () => {
    w.cameras.main.shake(400, 0.006);
    audio.sfx('boom');
    await w.wait(500);
    state.set(`gone:${p.id}`);
    w.ui.flash(0xfff6d8, 500);
    p.remove();
    audio.sfx('secret');
  });
}

/** Every drawer holds a result nobody wanted to print. Each one names an idea. */
const WISPS: Record<string, { lines: Line[]; note: string }> = {
  'drawer-1': { note: 'drawer', lines: [
    { who: 'wisp', text: 'Oh! Light! I am a result. I tested whether moonberries cure hiccups. They do not.' },
    { who: 'wisp', text: '"No effect, no story," said the editor. I have been in this drawer for six years.' },
  ] },
  'drawer-2': { note: 'replication', lines: [
    { who: 'wisp', text: 'I am a replication! A famous study said Lucky Socks boost exam scores.' },
    { who: 'wisp', text: 'I tried it again with ten times as many students. Nothing. Nobody wanted to print that.' },
  ] },
  'drawer-3': { note: 'garden', lines: [
    { who: 'wisp', text: 'Twenty tonic recipes were tested. I am the nineteen that did nothing.' },
    { who: 'wisp', text: 'Only number twenty got published. With twenty tries, one lucky hit is just what chance gives you.' },
  ] },
  'drawer-4': { note: 'nulls', lines: [
    { who: 'wisp', text: 'I measured whether talking to plants makes them grow. They grew exactly the same.' },
    { who: 'wisp', text: 'Not exciting, I know. But now nobody has to waste a summer finding it out again!' },
  ] },
};

async function drawer(w: WorldScene, p: Prop) {
  const id = p.id ?? '';
  if (state.flag(`drawer:${id}`)) return run(w, () => w.say([{ text: 'An empty drawer. Whatever was in here is free now.' }]));
  if (!w.lanternOn) {
    return run(w, () => w.say(state.has('lantern')
      ? [{ text: 'Too dark to find the handle. Raise the lantern (L).' }]
      : [{ text: 'A drawer labelled "RESULTS: NOT INTERESTING". It is too dark to open it.' }]));
  }
  await run(w, async () => {
    state.set(`drawer:${id}`);
    p.setTexture('drawer-open');
    audio.sfx('secret');
    const wisp = w.add.sprite(p.x, p.y - 14, 'nullwisp', 0).setAlpha(0).setDepth(p.y + 20);
    if (!w.anims.exists('wisp')) w.anims.create({ key: 'wisp', frames: w.anims.generateFrameNumbers('nullwisp', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
    wisp.play('wisp');
    w.tweens.add({ targets: wisp, alpha: 0.9, y: p.y - 30, duration: 700, ease: 'Sine.out' });
    await w.wait(700);
    const d = WISPS[id];
    await w.say(d?.lines ?? []);
    const n = state.inc('wisps');
    if (d) w.note(d.note);
    w.tweens.add({ targets: wisp, x: 22 * T, y: 13 * T, alpha: 0, duration: 1600, ease: 'Sine.in', onComplete: () => wisp.destroy() });
    if (n === 4) {
      await w.wait(700);
      w.cameras.main.shake(300, 0.004);
      audio.sfx('boom');
      await w.say([{ who: 'ada', text: 'That was the last one! Four small voices together, and the gilded seal is cracking.' }]);
    }
  });
}

// ------------------------------------------------------------------
export async function onTalk(w: WorldScene, n: Npc) { return talk(w, n); }

async function talk(w: WorldScene, n: Npc) {
  const main = state.quest('main');
  switch (n.id) {
    case 'mo': return run(w, async () => {
      if (main < 5) await w.say([{ who: 'mo', text: 'North across the bridge, through the woods, to the Archive. Come back in one piece, {name}.' }]);
      else if (main === 5) await finale(w);
      else await w.say([{ who: 'mo', text: 'Fewer stars, but true ones. I will take that trade any day.' }]);
    });
    case 'pip': return run(w, async () => {
      const q = state.quest('beetles');
      const have = state.count('beetles');
      if (q === 0) {
        await w.say([
          { who: 'pip', text: 'I caught a Moon Beetle and it\'s BLUE! So ALL Moon Beetles are blue. I\'m writing a paper!' },
          { who: 'pip', text: 'Okay, okay. Bring me three more from the woods and you\'ll see. All blue!' },
        ]);
        state.setQuest('beetles', have >= 3 ? 2 : 1);
        return;
      }
      if (q === 1 && have < 3) { await w.say([{ who: 'pip', text: `${have} of 3 beetles! They hide in the Whispering Woods.` }]); return; }
      if (q <= 2) {
        await w.say([
          { who: 'pip', text: 'Gold... red... GREEN?! With one beetle I was so sure.' },
          { who: 'pip', text: 'Maybe one beetle isn\'t a theory. Next time I count how many I need BEFORE I start. Here, for you!' },
        ]);
        state.setQuest('beetles', 3);
        w.note('sample');
        await heartPiece(w);
        return;
      }
      await w.say([{ who: 'pip', text: 'My next study has FORTY beetles. I worked out the number before catching a single one!' }]);
    });
    case 'gloss': return run(w, async () => {
      if (state.quest('tonic') >= 2) { await w.say([{ who: 'gloss', text: 'Glimmer Tonic! Now with a much, much smaller label.' }]); return; }
      await w.say([
        { who: 'gloss', text: 'GLIMMER TONIC! Scientifically proven! I tested twenty recipes, and number fourteen worked. p = .04!' },
        { who: 'ada', text: 'Test twenty duds and one will "work" by pure luck. That is all p < .05 promises.' },
        { who: 'gloss', text: '...I\'ll test fourteen again. With a plan written down first. Happy?' },
      ]);
      state.setQuest('tonic', 2);
      w.note('garden');
    });
    case 'zib': return run(w, async () => {
      const opts = ['Red Tea, refills hearts (10)'];
      const hpSold = state.flag('zib-heart');
      if (!hpSold) opts.push('Piece of Heart (60)');
      opts.push('Just looking');
      const c = await w.choose({ who: 'zib', text: 'Zib\'s! Honest labels, no p-values on the packaging. What\'ll it be?' }, opts);
      if (c === 0) {
        if (state.data.shards < 10) { await w.say([{ who: 'zib', text: 'Ten shards, friend. Glimmerlings drop them when you, uh, argue with them.' }]); return; }
        state.data.shards -= 10;
        state.data.hp = state.data.maxHp;
        audio.sfx('heart');
        await w.say([{ text: 'Warmth spreads through you. All hearts restored!' }]);
      } else if (c === 1 && !hpSold) {
        if (state.data.shards < 60) { await w.say([{ who: 'zib', text: 'Sixty shards for that one. It\'s a piece of a HEART, after all.' }]); return; }
        state.data.shards -= 60;
        state.set('zib-heart');
        await heartPiece(w);
      }
    });
    case 'dusty': return run(w, () => w.say([{ who: 'dusty', text: 'Same broom, same plaza, same result. I have replicated this finding 4,381 times. Very reassuring.' }]));
    case 'quill': return run(w, async () => {
      if (state.flag('boss-archive')) { await w.say([{ who: 'quill', text: 'Headline: "Local Hero Defeats Bird, Index Saved?" I am keeping the question mark. I have been burned before.' }]); return; }
      await w.say(state.flag('quill-talked')
        ? [{ who: 'quill', text: 'Gold beetle east, green one across the stream, red one behind the bushes out west!' }]
        : [
          { who: 'quill', text: 'Quill, Lumen Ledger! Scoop: staring at Glimmerlings makes you 30% smarter. A very confident guy told me.' },
          { who: 'ada', text: 'Confidence is not data.' },
          { who: 'quill', text: 'Spoilsport. Fine, a real tip: odd beetles! Gold in the east, green across the stream, red behind the bushes out west.' },
        ]);
      state.set('quill-talked');
    });
  }
}

async function finale(w: WorldScene) {
  const mo = w.npc('mo');
  const [bx, by] = [22 * T, 18.4 * T];
  await w.say([{ who: 'mo', text: '{name}! You are back! And look...' }]);
  w.cameras.main.stopFollow(); w.cameras.main.pan(bx, by - 30, 800, 'Sine.easeInOut');
  await w.wait(900);
  audio.sfx('fanfare');
  w.ui.flash(0xd4fdff, 1200);
  setBeacon(w, true);
  for (let i = 0; i < 24; i++) {
    const s = w.add.image(bx, by - 40, 'sparkle').setDepth(9e5 + 3).setBlendMode(Phaser.BlendModes.ADD);
    w.tweens.add({ targets: s, x: bx + Phaser.Math.Between(-140, 140), y: by - Phaser.Math.Between(60, 180), alpha: 0, duration: 1600 + i * 40, ease: 'Cubic.out', onComplete: () => s.destroy() });
  }
  await w.wait(1400);
  await w.say([
    { who: 'mo', text: 'The forgotten results came home. The Index got dimmer for a moment... and then it got steady.' },
    { who: 'ada', text: 'A true map beats a shiny one. Every time.' },
  ]);
  w.cameras.main.pan(w.player.x, w.player.y - 12, 600, 'Sine.easeInOut');
  if (mo) mo.facing = 'down';
  state.setQuest('main', 6);
  state.save();
  await w.ui.chapterCard();
  w.cameras.main.startFollow(w.player.spr, true, 0.16, 0.16, 0, 12);
}
