<!-- Синхронизирано с документа „Практики за игри (раздел Инструменти)“ (https://claude.ai/artifact/XL3TUQFuxrNgXHr3J8k71P) при rev 1. -->

# Инструменти

Скриптовете, с които проверявахме интрото на Starhop. Трябват Node, Playwright с Chromium, Python 3 и ffmpeg.

## 1. Ревю build със стъпки

Подменя `requestAnimationFrame`: всеки кадър придвижва играта точно с 1/30 с, а `window.__holdAt` спира цикъла на даден кадър. Така браузър без екран снима точни моменти, колкото и бавно да рисува. В Starhop е `test/stepped-entry.ts`, build: `node test/build-entry.mjs test/stepped-entry.ts review.html`.

```ts
const STEP_MS = 1000 / 30;
const stepped = window as unknown as Window & { __frames: number; __holdAt: number };
stepped.__frames = 0;
stepped.__holdAt = Number.POSITIVE_INFINITY;
const nativeFrame = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const wait = (): number =>
    nativeFrame(() => {
      if (stepped.__frames >= stepped.__holdAt) {
        wait();
        return;
      }
      stepped.__frames += 1;
      callback(stepped.__frames * STEP_MS);
    });
  return wait();
};
// The game is imported only after the patch, so its loop runs on the stepped clock.
import("../src/main");
```

## 2. Снимки по сцени (cutshots.js)

`node cutshots.js /path/review.html out "1:15,60;3:10,40" 390 844` отваря `#cuts`, избира сцена 1 и снима след 15 и 60 кадъра, после същото за сцена 3.

```js
const { chromium } = require('playwright');
const [,, page_, out, plan, w, h] = process.argv;
// plan: "cut:frames,frames;cut:frames" — jump to a cut, then shoot after each cumulative frame count.
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 }); });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + page_ + '#cuts');
  await p.waitForSelector('#start-button:not([hidden])', { timeout: 60000 });
  await p.click('#start-button');
  await p.addStyleTag({ content: '.cut-picker{opacity:0!important}' });
  const step = async (n) => { const f = await p.evaluate(() => window.__frames); await p.evaluate((t) => { window.__holdAt = t; }, f + n); await p.waitForFunction((t) => window.__frames >= t, f + n, { timeout: 900000, polling: 50 }); };
  await step(2);
  for (const part of plan.split(';')) {
    const [cut, list] = part.split(':');
    await p.evaluate((c) => { [...document.querySelectorAll('.cut-button')][c].click(); }, +cut);
    let done = 0;
    for (const n of list.split(',').map(Number)) {
      await step(n - done); done = n;
      const label = await p.textContent('.cut-status');
      const name = `c${cut}-${String(n).padStart(3, '0')}`;
      await p.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
      console.log(name, label);
    }
  }
  await b.close();
})();
```

## 3. Пълен запис (seq.js)

`node seq.js /path/review.html seq 925 390 844` записва 925 кадъра като JPG. Отнема около 20–25 минути.

```js
const { chromium } = require('playwright');
const [,, page_, out, count, w, h] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 }); });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + page_);
  await p.waitForSelector('#start-button:not([hidden])', { timeout: 60000 });
  await p.evaluate(() => { window.__holdAt = window.__frames + 1; });
  await p.click('#start-button');
  // Hide only the skip button, which isn't part of the film.
  await p.addStyleTag({ content: '#intro-skip{display:none!important}' });
  const f0 = await p.evaluate(() => window.__frames);
  for (let i = 0; i < +count; i++) {
    await p.evaluate((t) => { window.__holdAt = t; }, f0 + i);
    await p.waitForFunction((t) => window.__frames >= t, f0 + i, { timeout: 900000, polling: 20 });
    await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88, timeout: 180000 });
  }
  await b.close();
})();
```

## 4. Карта на сцените (cutmap.py)

Превръща времето в историята в номера на кадри, като отчита забавения каданс. Времената са на интрото на Starhop и се сменят за всяка игра.

```python
G = 14.2
T = dict(blast=6.8, slowEnd=7.95, end=G + 15.0)
SLOW = 0.35
def rate(t):
    if t < T['blast'] + 0.04 or t >= T['slowEnd']: return 1
    if t < T['slowEnd'] - 0.4: return SLOW
    return SLOW + (1 - SLOW) * (t - (T['slowEnd'] - 0.4)) / 0.4
times = []
t = 0.0
while t < T['end']:
    t = t + rate(t) / 30
    times.append(t)
CUTS = [("1-orbit", 0, 4.4), ("2-drive-fails", 4.1, 6.75), ("3-blast", 6.3, 8.5), ("4-pod-away", 8.5, 10.4), ("5-descent", 10.1, G),
        ("6-black-visor", G, G + 4.54), ("7-wake-up", G + 4.3, G + 9.8), ("8-to-the-game", G + 9.4, T['end'])]
for name, a, b in CUTS:
    fa = next(i for i, x in enumerate(times) if x >= a) if a > 0 else 0
    fb = next((i for i, x in enumerate(times) if x >= b), len(times) - 1)
    print(name, fa, fb, f"{(fb - fa) / 30:.1f}s")
print("total frames", len(times))
```

## 5. ffmpeg

```bash
# Contact sheet: every 16th frame, 10 per row
ffmpeg -nostdin -loglevel error -y -framerate 30 -i seq/f%04d.jpg -vf "select='not(mod(n\,16))',scale=120:-1,tile=10x3" -frames:v 1 -fps_mode vfr sheet.png
# One scene as a labelled clip: START = first frame, N = frame count
ffmpeg -nostdin -loglevel error -y -framerate 30 -start_number START -i seq/f%04d.jpg -frames:v N -vf "drawtext=fontfile=FONT.ttf:text='Cut 3 blast':x=16:y=16:fontsize=20:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=6" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart clip.mp4
# The whole film
ffmpeg -nostdin -loglevel error -y -framerate 30 -i seq/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart full.mp4
```
