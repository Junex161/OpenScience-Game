// Sound check: renders every song offline and prints peak / loudness,
// so silent or clipping tracks are caught without ears.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(BASE);
  await p.waitForTimeout(1500);
  for (const id of ['title', 'haven', 'woods', 'archive', 'boss', 'raid']) {
    const r = await p.evaluate((i) => window.__renderSong(i, 14), id);
    console.log(id.padEnd(8), 'peak', r.peak.toFixed(3), 'rms', r.rms.toFixed(3));
  }
  await b.close();
})();
