// The frames of the level-10 map in screens/ (map.html#lvl10 and #lvl10-night), at iPhone size:
//   node shot-map.js        (start the local server first: npm run serve, port 8777; then convert out/*.png to JPG)
// map-lvl10, -night: the whole colony; -left, -right: the two halves; -home, -ark (and -night): close-ups;
// -commander: the Commander and ECHO on the Ark's plot; -colonist: a colonist by her building (14.11.2026).
const { chromium } = require('playwright');
const path = require('path');
const DAY = [['map-lvl10', null], ['map-lvl10-left', [46, -6.5, 10.5]], ['map-lvl10-right', [46, 10.5, -6.5]], ['map-lvl10-home', [20, -16, -32]],
  ['map-lvl10-ark', [40, -10, -10]], ['map-lvl10-commander', [15, 3.2, 1.8]], ['map-lvl10-colonist', [15, -11.2, 6.7]]];
const NIGHT = [['map-lvl10-night', null], ['map-lvl10-home-night', [20, -16, -32]], ['map-lvl10-ark-night', [40, -10, -10]], ['map-lvl10-commander-night', [15, 3.2, 1.8]]];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  for (const [hash, shots] of [['#lvl10', DAY], ['#lvl10-night', NIGHT]]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://127.0.0.1:8777/map.html?dpr=3' + hash, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 });
    for (const [name, aim] of shots) {
      if (aim) await page.evaluate(a => window.__aim(...a), aim);
      await page.screenshot({ path: path.join(__dirname, 'out', name + '.png') });
      console.log(name, errors.join(' | ') || 'ok');
    }
    await page.close();
  }
  await browser.close();
})();
