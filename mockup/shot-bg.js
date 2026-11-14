// The backgrounds of menus.html: the level-10 map without its HUD, and where the buildings are on each of them.
//   node shot-bg.js      (server on 8777) writes ui/bg-<name>.jpg through out/ and ui/anchors.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
// name, [view in metres across the screen, x, z]
const VIEWS = { main: [68, 0, 0], mine: [26, -5, 27], ark: [44, 8, 8], build: [30, 49, 17], home: [30, -6, -22] };
// the plots (centres) and how high the tag floats over them
const SPOTS = { drill: [16, 9, 0], pump: [0, 6, 16], processor: [32, 8, 32], research: [-32, 8, -16], veglab: [16, 6, 16], home: [-16, 7, -32], kitchen: [16, 7, -16],
  mine: [-16, 10, 16], furnace: [-32, 9, 0], warehouse: [0, 8, -32], greenhouse: [32, 6, 0], geolocator: [0, 7, 32], solar: [32, 4, 16], batteries: [16, 4, 32],
  ark: [-8, 30, -8], empty: [48, 0.5, 16], empty2: [16, 0.5, 48], echo: [4.4, 4.2, 0.6], commander: [2.4, 3.2, 2.4] };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  page.on('pageerror', e => console.log('ERR', String(e)));
  await page.goto('http://127.0.0.1:8777/map.html?dpr=3#lvl10', { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 });
  await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
  const anchors = {};
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  for (const [name, aim] of Object.entries(VIEWS)) {
    anchors[name] = await page.evaluate(([aim, spots]) => { window.__aim(...aim); const a = {}; for (const [k, p] of Object.entries(spots)) a[k] = window.__screen(p[0], p[1], p[2]); return a; }, [aim, SPOTS]);
    await page.screenshot({ path: path.join(__dirname, 'out', `bg-${name}.png`) });
  }
  fs.mkdirSync(path.join(__dirname, 'ui'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'ui', 'anchors.json'), JSON.stringify(anchors, null, 1));
  console.log(Object.keys(anchors).join(', '));
  await browser.close();
})();
