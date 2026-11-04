// Renders the example map as a clip: for each atmosphere level the camera holds on the overview,
// then glides in towards what grew at that stage; the stages cross-fade into each other. At the end the
// 85% map turns to night where the camera stopped, and the camera pulls out over the lit colony.
//   node clip.js [scale=2] [seconds per stage=3.5] [states=atm20,atm50,atm85,atm85-night]
// Start the local server first: npm run serve (port 8777). Needs Playwright with Chromium and ffmpeg.
// Writes out/clip/<state>/f0000.jpg ... and out/map-clip.mp4.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const dpr = Number(process.argv[2] || 2), secs = Number(process.argv[3] || 3.5), fps = 30, fade = 0.8;
  const states = (process.argv[4] || 'atm20,atm50,atm85,atm85-night').split(',');
  const n = Math.round(secs * fps), hold = Math.round(0.6 * fps);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  for (const s of states) {
    const dir = path.join(__dirname, 'out', 'clip', s);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
    page.on('pageerror', e => console.log(s, String(e)));
    await page.goto(`http://127.0.0.1:8777/map.html?dpr=${dpr}#${s}`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 420000 });
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      await page.evaluate(t => window.__frame(t), Math.max(0, f - hold) / (n - 1 - hold));
      await page.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
    }
    console.log(s, n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
    await page.close();
  }
  await browser.close();
  // one stream per stage, cross-faded into each other
  const ins = states.flatMap(s => ['-framerate', String(fps), '-i', path.join('out', 'clip', s, 'f%04d.jpg')]);
  let filter = '', last = '0';
  for (let i = 1; i < states.length; i++) { filter += `[${last}][${i}]xfade=transition=fade:duration=${fade}:offset=${(i * (secs - fade)).toFixed(2)}[x${i}];`; last = `x${i}`; }
  filter += `[${last}]format=yuv420p[v]`;
  execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', ...ins, '-filter_complex', filter, '-map', '[v]', '-c:v', 'libx264', '-crf', '21', '-movflags', '+faststart', path.join('out', 'map-clip.mp4')], { cwd: __dirname, stdio: 'inherit' });
  console.log('out/map-clip.mp4');
})();
