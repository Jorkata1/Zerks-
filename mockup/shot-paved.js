// The level-10 map with the streets as they are and paved (draft level 36), the same frames side by side:
//   node shot-paved.js   (server on 8777) -> out/paved-<name>-<before|after>.png
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = [['whole', null], ['left', [46, -6.5, 10.5]], ['home', [20, -16, -32]], ['ark', [40, -10, -10]]];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  for (const [hash, tag] of [['#lvl10', 'before'], ['#lvl10-paved', 'after']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://127.0.0.1:8777/map.html?dpr=2' + hash, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 });
    for (const [name, aim] of SHOTS) {
      if (aim) await page.evaluate(a => window.__aim(...a), aim);
      await page.screenshot({ path: path.join(__dirname, 'out', `paved-${name}-${tag}.png`) });
      console.log(name, tag, errors.join(' | ') || 'ok');
    }
    await page.close();
  }
  await browser.close();
})();
