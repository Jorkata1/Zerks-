// Renders the mockup states to out/<state>.png at iPhone size (390x844 points).
//   node shot.js [scale=3] [states=early,early-zoom,early-panel,late,late-zoom]
// Start the local server first: npm run serve (port 8777). Needs Playwright with Chromium.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dpr = Number(process.argv[2] || 3);
  const pageName = process.argv[4] || 'index.html';
  const states = (process.argv[3] || 'early,early-zoom,early-panel,late,late-zoom').split(',');
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  // software WebGL, so it also runs on machines without a GPU
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  for (const s of states) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:8777/${pageName}?dpr=${dpr}#${s}`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 }).catch(() => errors.push('timeout'));
    await page.screenshot({ path: path.join(outDir, `${s}.png`) });
    console.log(s, ((Date.now() - t0) / 1000).toFixed(1) + 's', errors.join(' | ') || 'ok');
    await page.close();
  }
  await browser.close();
})();
