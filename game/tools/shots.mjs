// Screenshots of the build at iPhone size (390x844 points), for the checks before "done".
//   node tools/shots.mjs [dpr=1] [outDir=shots]
// Opens dist/index.html straight from the disk (the build is one file) with software WebGL, so it runs without a GPU.
// Each shot fixes the time of day and the moment of the drone and robot, so it always looks the same.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Playwright is installed once for the machine (not in package.json), so it is loaded the CommonJS way.
const { chromium } = createRequire(import.meta.url)('playwright')
const here = dirname(fileURLToPath(import.meta.url))
const dpr = Number(process.argv[2] || 1)
const out = resolve(process.argv[3] || resolve(here, '../shots'))
mkdirSync(out, { recursive: true })
const url = pathToFileURL(resolve(here, '../dist/index.html')).href

const SHOTS = [
  { name: 'day', set: { t: 0.25, at: 4 } },
  { name: 'night', set: { t: 0.8, at: 4 } },
  { name: 'dusk', set: { t: 0.6, at: 9 } },
  { name: 'select-greenhouse', set: { t: 0.3, at: 10, select: 'greenhouse' } },
  { name: 'zoom-ark', set: { t: 0.3, at: 14, view: 34, x: -8, z: -8 } },
  { name: 'zoom-out', set: { t: 0.3, at: 18, view: 120 } },
]

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const s of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
  const t0 = Date.now()
  await page.goto(`${url}?still&shot&dpr=${dpr}`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => window.__zerks?.ready === true, null, { timeout: 240000 }).catch(() => errors.push('timeout'))
  await page.evaluate((o) => window.__zerks.set(o), s.set)
  await page.waitForTimeout(400)
  const info = await page.evaluate(() => window.__zerks.info())
  await page.screenshot({ path: `${out}/${s.name}.png`, timeout: 180000 })
  console.log(s.name.padEnd(18), ((Date.now() - t0) / 1000).toFixed(1) + 's', `${info.calls} draws, ${Math.round(info.triangles / 1000)}k tris`, errors.join(' | ') || 'ok')
  await page.close()
}
await browser.close()
