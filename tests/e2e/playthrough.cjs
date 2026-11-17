// Automated playtest: jumps into every chapter (admin mode), plays it with
// scripted inputs and saves screenshots to shots/. Run: node tests/e2e/playthrough.cjs [difficulty]
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
const DIFF = process.argv[2] || 'normal';
const ONLY = process.argv[3];

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const results = {};
  const chapters = ['forge', 'archive', 'power', 'vault', 'lab', 'press', 'citizen', 'finale'].filter((c) => !ONLY || c === ONLY);
  for (const ch of chapters) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    p.on('pageerror', (e) => errs.push(`${ch}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${ch}: ${m.text()}`); });
    await p.addInitScript((d) => {
      window.__bot = 'right';
      localStorage.setItem('osgame.save.v1', JSON.stringify({ name: 'Bot', difficulty: d, results: {}, crystals: [], prologueDone: true, startedAt: Date.now(), seenIntro: { galaxy: true } }));
    }, DIFF);
    await p.goto(`${BASE}?admin&scene=${ch}`);
    await p.waitForTimeout(1200);
    // helper available inside S(): find a text object anywhere in the display tree
    await p.evaluate(() => { window.__hasText = (s, str) => { const walk = (o) => (o.text === str) || (o.list && o.list.some(walk)); return s.children.list.some(walk); }; });
    const S = (fn, arg) => p.evaluate(([k, f, a]) => { const s = window.game.scene.getScene(k); return new Function('s', 'a', f)(s, a); }, [ch, fn, arg]);
    const rect = await p.locator('canvas').boundingBox();
    const click = async (x, y) => { await p.mouse.click(rect.x + x * rect.width / 960, rect.y + y * rect.height / 540); await p.waitForTimeout(150); };
    const advance = async (until, maxMs = 60000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < maxMs) {
        if (until && (await S(until))) return true;
        if (await S('return s.dialog && s.dialog.open')) await p.keyboard.press('Space');
        await p.waitForTimeout(220);
      }
      return false;
    };
    let shot = 0;
    const snap = async (n) => p.screenshot({ path: `shots/${DIFF}_${ch}_${++shot}_${n}.png` });
    try {
      if (ch === 'forge') {
        await advance('return s.interactive');
        await snap('start');
        const ok = await S(`
          const rows = { measure: ['dv1','dv2','avg'], comparison: ['both','low','high'], outliers: ['false','true'], more: ['false','true'] };
          for (const m of rows.measure) for (const c of rows.comparison) for (const o of rows.outliers) for (const n of rows.more) {
            s.choose('measure', m); s.choose('comparison', c); s.choose('outliers', o); s.choose('more', n);
            if (s.submitBtn.visible) return true;
          } return false;`);
        await p.waitForTimeout(700);
        await snap('significant');
        await S('s.submit()');
        await advance('return window.__hasText(s, "Tipp abgeben")');
        await snap('predict');
        await click(480, 340);
        await p.waitForTimeout(5500);
        await snap('sim');
      }
      if (ch === 'archive') {
        await advance('return s.running');
        await p.keyboard.down('d'); await p.waitForTimeout(800); await p.keyboard.up('d');
        await snap('play');
        await S('s.debugOpenAll()');
        await p.waitForTimeout(1500);
        await snap('funnel');
      }
      if (ch === 'power') {
        await advance('return !!s.fireBtn');
        await snap('winners_curse');
        await click(480, 505); // slider somewhere in the middle
        await click(130, 505);
        await p.waitForTimeout(2500);
        await snap('salvo');
        await S('s.debugLock(110)');
        await p.waitForTimeout(2000);
        await snap('curve');
      }
      if (ch === 'vault') {
        await advance('return s.children.list.some(o => o.list && o.list.some(t => t.text && t.text.startsWith("Viel Training")))');
        const pos = await S(`const goods = ['Viel Training erhöht den Wert in Test A','n = 100 pro Gruppe (Power-Analyse)','Test A, Version 2, vorab festgelegt','t-Test, einseitig, α = .05, Ausschluss > 3 SD'];
          const out = []; const walk = (o, ox, oy) => { if (o.list) o.list.forEach(c => walk(c, ox + (o.x||0), oy + (o.y||0))); else if (o.text && goods.includes(o.text)) out.push([ox + o.x, oy + o.y]); };
          s.children.list.forEach(o => walk(o, 0, 0)); return out;`);
        for (const [x, y] of pos) await click(x, y);
        await snap('plan');
        await click(480, 470);
        await advance('return window.__hasText(s, "Explorativ ▶")');
        await snap('sort');
        for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700); }
        await advance('return s.children.list.some(o => o.type === "Ellipse")', 20000);
        await p.waitForTimeout(2000);
        await snap('portals');
      }
      if (ch === 'lab') {
        await advance('return window.__hasText(s, "⬆ Hochladen")');
        const xs = [50 + 67, 190 + 87, 370 + 62, 500 + 42];
        for (const x of xs) await click(x, 100);
        await snap('anon');
        await click(480, 470);
        await p.waitForTimeout(2000);
        await snap('anon_done');
        await advance('return window.__hasText(s, "DATENSATZ · Lerntraining-Studie")');
        await p.waitForTimeout(500);
        await snap('fair');
      }
      if (ch === 'press') {
        await advance('return window.__hasText(s, "Gutachten abgeben")');
        for (const i of [0, 2, 4, 5, 7]) await click(200, 130 + i * 39 + 9);
        await snap('review');
        await p.waitForTimeout(800);
      }
      if (ch === 'citizen') {
        await advance('return s.running');
        await p.keyboard.down('d'); await p.keyboard.down('s'); await p.waitForTimeout(1500); await p.keyboard.up('d'); await p.keyboard.up('s');
        await snap('play');
        await S('s.debugWin()');
      }
      if (ch === 'finale') {
        await advance('return s.running');
        await p.keyboard.down('Space');
        for (let i = 0; i < 3; i++) { await p.keyboard.press('w'); await p.waitForTimeout(1200); }
        await snap('fight');
        await S('s.toPhase(2)');
        await advance('return s.running && s.decoys.length > 0', 15000);
        await p.waitForTimeout(1500);
        await snap('decoys');
        await S('for (const d of [...s.decoys]) s.popDecoy(d); s.bossHp = s.bossMax * 0.3; s.toPhase(3)');
        await advance('return s.running && s.phase === 3', 15000);
        await p.waitForTimeout(3500);
        await snap('walls');
        await p.keyboard.up('Space');
        await S('s.debugWin()');
      }
      const done = await advance('return s.finished', 90000);
      await p.waitForTimeout(2500);
      await snap('finish');
      results[ch] = done ? await p.evaluate((c) => JSON.parse(localStorage.getItem('osgame.save.v1')).results[c], ch) : 'NOT FINISHED';
    } catch (e) { errs.push(`${ch}: ${e.message}`); }
    await p.close();
  }
  console.log(JSON.stringify(results));
  console.log('errors', errs);
  await b.close();
})();
