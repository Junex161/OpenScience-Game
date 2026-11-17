// Bot playthrough of the Chapter 1 slice. Teleports between story beats,
// presses real keys for talking/fighting and screenshots each step.
// Run: npx vite build && npx vite preview --port 4173 & node tests/e2e/play.cjs [difficulty]
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
const DIFF = process.argv[2] || 'normal';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.stack || e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let n = 0;
  const snap = async (name) => p.screenshot({ path: `shots/play_${String(++n).padStart(2, '0')}_${name}.png` });
  const W = (fn, arg) => p.evaluate(([f, a]) => new Function('w', 's', 'a', f)(window.__w, window.__w && window.__w.ui, a), [fn, arg]);
  const wait = (ms) => p.waitForTimeout(ms);
  const key = async (k, ms = 90) => { await p.keyboard.down(k); await wait(ms); await p.keyboard.up(k); };
  const talkThrough = async (maxMs = 40000) => {
    const t0 = Date.now();
    await wait(300);
    while (Date.now() - t0 < maxMs) {
      const open = await W('return !!(w && (w.ui.dialogOpen || w.cut))');
      if (!open) { await wait(250); if (!(await W('return !!(w && (w.ui.dialogOpen || w.cut))'))) return; }
      if (await W('return w.ui.dialogOpen')) await key('e', 60);
      await wait(170);
    }
    throw new Error('dialog did not end');
  };
  const tp = async (x, y, face) => { await W(`w.player.x=${x * 16}; w.player.y=${y * 16}; w.player.facing='${face}'; w.player.sync(); w.cameras.main.centerOn(w.player.x, w.player.y);`); await wait(250); };
  const interact = async (x, y, face) => { await tp(x, y, face); await key('e'); await talkThrough(); };
  const area = () => W('return w.area.id');
  const waitArea = async (id) => { for (let i = 0; i < 40; i++) { await wait(200); if ((await W('return !!w && w.area.id')) === id && !(await W('return w.warping'))) return; } throw new Error('no area ' + id); };
  const st = (expr) => p.evaluate((e) => new Function('return ' + e)(), expr);

  try {
    await p.goto(BASE);
    await wait(1500);
    await snap('title');
    await key('Enter'); // New Game (no save yet)
    await wait(300);
    for (const c of 'Juli') await key(c, 40);
    await snap('name');
    await key('Enter');
    await wait(300);
    if (DIFF === 'easy') await key('w'); if (DIFF === 'hard') await key('s');
    await key('Enter');
    await wait(1500);
    await snap('beacon_lit_start');
    // opening: the Beacon dies, Glimmerlings drop in, Mo throws the sword
    await wait(3200);
    await snap('raid_drop');
    // wait until the intro has really handed over control (slow machines)
    for (let i = 0; i < 80; i++) {
      if (await W('return w.ui.dialogOpen')) await key('e', 60);
      if (await W('return !!(w && !w.cut && !w.ui.dialogOpen && w.enemies.length > 0)')) break;
      await wait(250);
    }
    await wait(300);
    await snap('raid_fight');
    console.log('raid enemies', await W('return w.enemies.length'), 'sword', await W("return w.player && JSON.parse(localStorage.getItem('replica.save.v1')).items.join()"));
    // warps are closed during the raid
    await p.keyboard.down('d'); await wait(400); await p.keyboard.up('d');
    for (let i = 0; i < 40 && (await W('return w.enemies.length')) > 0; i++) {
      await W(`const e=w.enemies[0]; if(e){ w.player.x=e.x; w.player.y=e.y+17; w.player.facing='up'; w.player.invT=1; e.state='idle'; e.stateT=2; }`);
      await key(' ', 60); await wait(330);
      if (i === 1) await snap('raid_hit');
    }
    console.log('raid cleared', await W('return w.enemies.length'));
    await wait(900);
    await snap('raid_won');
    await talkThrough();
    console.log('quest main =', await st("JSON.parse(localStorage.getItem('replica.save.v1')).quests.main"));
    await wait(400);
    await snap('objective_arrow');
    // Pip, quest start
    await W(`const n=w.npc('pip'); n.x=31*16; n.y=22.6*16; n.wander=0;`);
    await interact(31, 23.9, 'up');
    // Gloss and Zib at their stalls
    await interact(26.5, 15.7, 'up');
    await tp(17.5, 15.7, 'up'); await key('e'); await wait(900);
    await snap('shop');
    await key('s'); await key('s'); await key('e'); await talkThrough();
    // cut a bush
    await tp(22, 12, 'down'); await key(' '); await wait(300);
    // journal
    await key('Tab'); await wait(400); await snap('journal_quests'); await key('d'); await wait(300); await snap('journal_notes'); await key('Tab'); await wait(300);
    // go north
    await tp(22, 4, 'up'); await wait(300); await snap('bridge');
    await p.keyboard.down('w'); await wait(1400); await p.keyboard.up('w');
    await waitArea('woods');
    await talkThrough();
    await snap('woods');
    // fight: place a glimmerling right in front and swing until it dies
    await tp(28, 36, 'up');
    const before = await W('return w.enemies.length');
    await W(`const e=w.enemies[0]; e.x=w.player.x; e.y=w.player.y-18; e.state='idle'; e.stateT=5;`);
    for (let i = 0; i < 6; i++) { await W(`w.player.facing='up'; const e=w.enemies[0]; if(e){e.x=w.player.x; e.y=w.player.y-16; e.stateT=5;}`); await key('j'); await wait(380); }
    const after = await W('return w.enemies.length');
    console.log('enemies', before, '->', after);
    await snap('fight');
    // beetles
    for (const [x, y] of [[49.5, 36], [13.5, 30.5], [51.5, 9]]) { await tp(x, y + 0.3, 'up'); await wait(400); await talkThrough(); }
    console.log('beetles', await st("JSON.parse(localStorage.getItem('replica.save.v1')).counters.beetles"));
    // heart piece in the hidden grove
    await tp(9, 30.8, 'up'); await wait(400); await talkThrough();
    // Quill
    await interact(47, 12.2, 'up');
    // archive gate
    await tp(12.5, 10.5, 'up'); await p.keyboard.down('w'); await wait(1200); await p.keyboard.up('w');
    await waitArea('archive');
    await talkThrough();
    await snap('archive_dark');
    // walk into the west room with real input: the camera should slide
    await W('for (const e of w.enemies) e.die();');
    await tp(16.6, 50.2, 'left'); await wait(300);
    await p.keyboard.down('a'); await wait(700); await snap('room_slide'); await wait(700); await p.keyboard.up('a');
    console.log('room after walking west', await W('return w.area.rooms.indexOf(w.room)'), await W('return w.sliding'));
    await snap('west_room');
    // key chest (west room) and drawer without lantern
    await interact(4.5, 49.1, 'up');
    await interact(10.5, 48.5, 'up');
    // locked door
    await interact(22, 47.3, 'up');
    console.log('door open', await W("return !w.prop('door-a')"));
    // lantern
    await interact(22, 39.9, 'up');
    await snap('lantern');
    await key('l'); await wait(500);
    await snap('lantern_on');
    // drawers 1-3
    await W('for (const e of w.enemies) e.die();');
    for (const [x, y] of [[10.5, 48.5], [33.5, 48.5], [39.5, 48.5]]) await interact(x, y, 'up');
    // the void hall: stand on a hidden bridge with lantern up
    await tp(21.5, 26, 'up'); await wait(600);
    await snap('bridge_lit');
    // lantern off on the bridge -> fall back to safety
    await tp(22, 30, 'up'); await wait(300);
    await tp(21.5, 26, 'up'); await key('l'); await wait(1400);
    console.log('after fall hp', await W('return JSON.stringify([w.player.x/16, w.player.y/16])'));
    await key('l'); await wait(300);
    // drawer 4 on the north ledge
    await interact(10.5, 18.6, 'up');
    console.log('wisps', await st("JSON.parse(localStorage.getItem('replica.save.v1')).counters.wisps"));
    await snap('wisps');
    // boss door
    await interact(22, 17.3, 'up');
    // boss
    await tp(22, 12.4, 'up');
    await wait(800);
    await talkThrough();
    await snap('boss_start');
    await W('window.__god = true');
    let guard = 0;
    while (guard++ < 400) {
      const info = await W("const c=w.boss; return c ? [c.mode, c.spot, c.hp] : ['none']");
      if (info[0] === 'dead' || info[0] === 'none') break;
      if (info[0] === 'perch') {
        const spots = [[16.5, 7], [27.5, 7], [16.5, 11], [27.5, 11], [22, 9.3]];
        const [sx, sy] = spots[info[1]];
        await tp(sx, sy + 1.3, 'up');
        await W('w.player.invT = 3;');
        await key('j');
        await wait(300);
        if (guard % 7 === 0) await snap('boss_' + guard);
      } else {
        await W('w.player.invT = 3; state=null;');
        await wait(250);
      }
    }
    await talkThrough(60000);
    await snap('boss_dead');
    // portal home
    await tp(22, 9.3, 'up'); await wait(1500);
    await waitArea('haven');
    await wait(500);
    await snap('home');
    await snap('home_arrow');
    await interact(19.5, 20.9, 'up');
    await wait(1500);
    await snap('chapter_card');
    await key('e'); await wait(800);
    await snap('beacon_lit');
  } catch (e) {
    errs.push('BOT: ' + e.message);
    await snap('error');
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await b.close();
})();
