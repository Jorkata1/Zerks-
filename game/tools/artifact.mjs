// Turns the one-file build (dist/index.html) into the page for the preview link: Claude wraps a published page in
// its own <!doctype>, <html>, <head> and <body>, so those and the viewport meta come off; the rest stays as built.
//   npm run artifact   (after npm run build) -> dist/artifact-stage2.html (level 20), dist/artifact.html (level 10)
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(here, '../dist/index.html'), 'utf8')
const pick = (re) => [...html.matchAll(re)].map((m) => m[0])
const title = pick(/<title>[\s\S]*?<\/title>/g)[0] ?? '<title>Zerks-X6</title>'
const metas = pick(/<meta name="theme-color"[^>]*>/g)
const styles = pick(/<style[\s\S]*?<\/style>/g)
const scripts = pick(/<script[\s\S]*?<\/script>/g)
const body = (html.match(/<body>([\s\S]*?)<\/body>/) ?? [])[1] ?? ''
const bodyNoScripts = body.replace(/<script[\s\S]*?<\/script>/g, '').trim()
const page = [title, ...metas, ...styles, bodyNoScripts, ...scripts].join('\n')
const name = Number(process.env.VITE_ZERKS_LEVEL ?? 20) === 10 ? 'artifact.html' : 'artifact-stage2.html'
writeFileSync(resolve(here, '../dist', name), page)
console.log(`dist/${name} ${(page.length / 1e6).toFixed(1)} MB; ${scripts.length} script, ${styles.length} style`)
