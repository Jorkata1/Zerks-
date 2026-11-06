// Stills of the build sequence (map.html#lvl10-build, src/build-seq.js) at the given seconds, to out/build-<t>.png.
//   node shot-build.js [times=2,3.8,6.5,9,11.6,13.6] [night]      (start the server first: npm run serve)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const times = (process.argv[2] || '2,3.8,6.5,9,11.6,13.6').split(',').map(Number);
  const night = process.argv[3] === 'night';
  const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:8777/map.html?dpr=3#lvl10${night ? '-night' : ''}-build`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__ready === true && window.__buildAt, null, { timeout: 420000 }).catch(() => errors.push('timeout'));
  for (const t of times) {
    await page.evaluate(t => window.__buildAt(t), t);
    await page.screenshot({ path: path.join(outDir, `build${night ? '-night' : ''}-${t}.png`) });
  }
  console.log(errors.join(' | ') || 'ok');
  await browser.close();
})();
