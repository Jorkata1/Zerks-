// Frames of the ideas for the map (src/map-ideas.js): node shot-ideas.js [night]   (server on 8777) -> out/idea-*.png
// Each view is shot twice, without the ideas and with them.
const { chromium } = require('playwright');
const path = require('path');
// name, [view in metres across the screen, x, z], which ideas
const VIEWS = [
  ['whole', [68, 0, 0], 'all'], ['canyon', [150, -6, -6], 'all'], ['wall', [52, -30, 30], 'canyon,ground'], ['ground', [40, 81, 53], 'ground'],
  ['ice', [46, 34, 68], 'ice'], ['lines', [30, 12, 10], 'lines'], ['rover', [34, 56, 52], 'rover'], ['zone', [22, -27, -41], 'zone'], ['head', [90, -70, -70], 'all'],
];
(async () => {
  const night = process.argv[2] === 'night' ? '-night' : '';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  const pages = {};
  const open = async ideas => {
    if (pages[ideas]) return pages[ideas];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    page.on('pageerror', e => console.log('ERR', ideas, String(e).slice(0, 300)));
    await page.goto(`http://127.0.0.1:8777/map.html?dpr=3${ideas ? '&ideas=' + ideas : ''}#lvl10${night}`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 });
    await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
    return (pages[ideas] = page);
  };
  for (const [name, aim, ideas] of VIEWS) for (const [tag, set] of [['a', ''], ['b', ideas]]) {
    const page = await open(set);
    await page.evaluate(a => window.__aim(...a), aim);
    await page.screenshot({ path: path.join(__dirname, 'out', `idea-${name}-${tag}${night}.png`) });
  }
  console.log('ok');
  await browser.close();
})();
