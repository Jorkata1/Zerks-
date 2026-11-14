// Saves a whole page at phone width as a JPG:  node shot-sheet.js <page without .html> [hash]   (server on 8777)
// -> out/<page>[-hash].jpg
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const name = process.argv[2], hash = process.argv[3] || '';
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  page.on('pageerror', e => console.log('ERR', String(e).slice(0, 300)));
  await page.goto(`http://127.0.0.1:8777/${name}.html${hash ? '#' + hash : ''}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.screenshot({ path: path.join(__dirname, 'out', name + (hash ? '-' + hash : '') + '.jpg'), type: 'jpeg', quality: 88, fullPage: true });
  console.log(name, 'ok');
  await browser.close();
})();
