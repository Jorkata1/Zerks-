// Writes the pictures the menus use to ui/thumbs (see thumbs.html):   node shot-thumbs.js
// Start the local server first: npm run serve (port 8777).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BUILDINGS = ['ark', 'geolocator', 'drill', 'pump', 'processor', 'veglab', 'research-1', 'mine-portal', 'mine', 'home-1', 'home-10', 'kitchen',
  'warehouse', 'furnace', 'solar', 'batteries', 'greenhouse', 'smelter', 'claypit', 'brickkiln', 'copperworks', 'brickhome-1', 'canteen-1', 'rover', 'drone'];
(async () => {
  const out = path.join(__dirname, 'ui', 'thumbs');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('pageerror', e => console.log('ERR', String(e)));
  await page.goto('http://127.0.0.1:8777/thumbs.html', { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const save = (name, url) => fs.writeFileSync(path.join(out, name + '.webp'), Buffer.from(url.split(',')[1], 'base64'));
  for (const b of BUILDINGS) save(b, await page.evaluate(n => window.__building(n), b));
  const people = await page.evaluate(() => window.__people);
  for (const p of people) {
    const file = p.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    save('face-' + file, await page.evaluate(n => window.__portrait(n), p));
    save('body-' + file, await page.evaluate(n => window.__figure(n), p));
  }
  save('echo', await page.evaluate(() => window.__echo()));
  console.log(BUILDINGS.length, 'buildings,', people.length, 'people');
  await browser.close();
})();
