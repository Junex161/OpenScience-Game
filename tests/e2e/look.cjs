// Quick visual check: opens areas in admin mode and saves screenshots.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const shots = (process.argv[2] || 'title,haven,woods,archive').split(',');
  for (const s of shots) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', (e) => errs.push(`${s}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${s}: ${m.text()}`); });
    await p.addInitScript(() => localStorage.setItem('replica.save.v1', JSON.stringify({ name: 'Nova', flags: { 'intro-done': true, 'ada-joined': true }, items: ['sword'], quests: { main: 2 } })));
    const [area, spawn] = s.split(':');
    await p.goto(s === 'title' ? BASE : `${BASE}?admin&area=${area}${spawn ? '&spawn=' + spawn : ''}`);
    await p.waitForTimeout(s === 'title' ? 2500 : 3200);
    await p.screenshot({ path: `shots/look_${s.replace(':', '_')}.png` });
    await p.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
