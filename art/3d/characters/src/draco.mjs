// Draco-compresses the GLBs that characters.py writes, with the tools the game project already has
// (game/node_modules), keeping the nodes as they are (body, arm_l … stay separate, so the game can move them).
//   cd game && npm ci && node ../art/3d/characters/src/draco.mjs <in_dir> <out_dir>
import { createRequire } from 'node:module'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(resolve(process.cwd(), 'package.json'))
const { NodeIO } = require('@gltf-transform/core')
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions')
const { dedup, draco, prune } = require('@gltf-transform/functions')
const draco3d = require('draco3dgltf')

const [inDir, outDir] = process.argv.slice(2).map((p) => resolve(p))
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
mkdirSync(outDir, { recursive: true })
for (const f of readdirSync(inDir).filter((n) => n.endsWith('.glb')).sort()) {
  const doc = await io.read(`${inDir}/${f}`)
  await doc.transform(dedup(), prune({ keepLeaves: true }), draco())
  await io.write(`${outDir}/${f}`, doc)
  const a = statSync(`${inDir}/${f}`).size, b = statSync(`${outDir}/${f}`).size
  console.log(`${f.padEnd(26)} ${(a / 1024).toFixed(0).padStart(5)} KB -> ${(b / 1024).toFixed(0).padStart(4)} KB`)
}
