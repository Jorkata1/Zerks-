// Frames for the sheet of the map's details (src/map-details.js, decided on 14.11.2026): node shot-ideas.js [day|night] [only these views, e.g. wall,zone]
// (server on 8777) -> out/idea-*.png
// Each view is shot twice: the map as it was before the details (?details=none) and with the ones named.
const { chromium } = require('playwright');
const path = require('path');
// name, [view in metres across the screen, x, z], which ideas
const VIEWS = [
  ['whole', [68, 0, 0], 'all'], ['canyon', [170, -6, -6], 'all'], ['wall', [60, -36, 36], 'canyon,ground,rocks,dust'], ['ground', [40, 81, 53], 'ground'],
  ['ice', [46, 34, 68], 'ice'], ['lines', [30, 12, 10], 'lines'], ['rover', [34, 56, 52], 'rover'], ['zone', [22, -27, -41], 'zone,dust'], ['head', [100, -70, -70], 'all'],
  ['dust', [46, -34, -34], 'dust'], ['rocks', [34, 56, 52], 'rocks'],
];
(async () => {
  const night = process.argv[2] === 'night' ? '-night' : '';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  const pages = {};
  const open = async ideas => {
    if (pages[ideas]) return pages[ideas];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    page.on('pageerror', e => console.log('ERR', ideas, String(e).slice(0, 300)));
    await page.goto(`http://127.0.0.1:8777/map.html?dpr=3&details=${ideas || 'none'}#lvl10${night}`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 });
    await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
    return (pages[ideas] = page);
  };
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  for (const [name, aim, ideas] of VIEWS) for (const [tag, set] of [['a', ''], ['b', ideas]]) {
    if (only && !only.includes(name)) continue;
    const page = await open(set);
    await page.evaluate(a => window.__aim(...a), aim);
    await page.screenshot({ path: path.join(__dirname, 'out', `idea-${name}-${tag}${night}.png`) });
  }
  console.log('ok');
  await browser.close();
})();
