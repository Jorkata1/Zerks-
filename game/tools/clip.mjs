// A short clip of the motion, frame by frame (the build renders each moment on request), for checking the drone,
// the robot and dusk at phone size.   node tools/clip.mjs [outDir=shots] [frames=60]
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { chromium } = createRequire(import.meta.url)('playwright')
const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(process.argv[2] || resolve(here, '../shots'))
const N = Number(process.argv[3] || 60)
mkdirSync(`${out}/clip`, { recursive: true })
const url = pathToFileURL(resolve(here, '../dist/index.html')).href

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
await page.goto(`${url}?still&shot`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__zerks?.ready === true, null, { timeout: 240000 })
for (let i = 0; i < N; i++) {
  // one drone round (24 s) while the day goes from late afternoon into the night
  await page.evaluate((o) => window.__zerks.set(o), { at: (i / N) * 24, t: 0.5 + (i / N) * 0.25 })
  await page.screenshot({ path: `${out}/clip/f${String(i).padStart(3, '0')}.png`, timeout: 120000 })
}
await browser.close()
execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-framerate', '10', '-i', `${out}/clip/f%03d.png`, '-pix_fmt', 'yuv420p', '-vf', 'scale=390:844', `${out}/clip.mp4`])
execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', `${out}/clip/f%03d.png`, '-vf', 'select=not(mod(n\\,6)),scale=130:-1,tile=10x1', '-frames:v', '1', `${out}/clip-sheet.png`])
console.log('clip:', `${out}/clip.mp4`)
