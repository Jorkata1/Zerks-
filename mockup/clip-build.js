// The build sequence as a film: map.html#lvl10-build, frame by frame, into out/build-clip.mp4 (iPhone size, no sound).
//   node clip-build.js [fps=30] [night|day] [dpr=3]      (start the server first: npm run serve; needs ffmpeg)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const fps = Number(process.argv[2] || 30), night = process.argv[3] === 'night', dpr = Number(process.argv[4] || 3);
  const out = path.join(__dirname, 'out', `build-clip${night ? '-night' : ''}.mp4`);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:8777/map.html?dpr=${dpr}#lvl10${night ? '-night' : ''}-build`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__ready === true && window.__buildAt, null, { timeout: 420000 });
  const end = await page.evaluate(() => window.__buildT.end + 0.8);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(end * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.__buildAt(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) console.log(`${i}/${n}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(out, errors.join(' | ') || 'ok');
  await browser.close();
})();
