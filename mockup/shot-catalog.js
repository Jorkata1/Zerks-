// Renders catalog.html (all chapter-1 buildings, one tile each) to out/catalog.jpg, 1600 px wide,
// and its phone version to out/buildings-kk.jpg.
//   node shot-catalog.js     (start the local server first: npm run serve, port 8777)
// Copy them to art/3d/buildings/catalog.jpg and mockup/screens/buildings-kk.jpg when the models change.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  // the catalogue at 1600 px, and the phone version (three to a row) at iPhone width
  // node shot-catalog.js research: only the sheet of ideas for that building, out/research-ideas.jpg
  const set = process.argv[2];
  const jobs = set ? [[`${set}-ideas.jpg`, `#set=${set}`, 390, 3]] : [['catalog.jpg', '', 800, 2], ['buildings-kk.jpg', '#phone', 390, 3]];
  for (const [file, hash, width, dpr] of jobs) {
    const page = await browser.newPage({ viewport: { width, height: 600 }, deviceScaleFactor: dpr });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
    await page.goto('http://127.0.0.1:8777/catalog.html' + hash, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 600000 }).catch(() => errors.push('timeout'));
    await page.screenshot({ path: path.join(outDir, file), type: 'jpeg', quality: set && set.startsWith('all') ? 95 : 90, fullPage: true });
    console.log(file, errors.join(' | ') || 'ok');
    await page.close();
  }
  await browser.close();
})();
