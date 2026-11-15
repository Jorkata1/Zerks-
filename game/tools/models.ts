// Prepares the 3D models for the game: reads the Draco GLBs from art/3d/buildings and art/3d/characters and writes
// them quantized and gzipped into src/assets/models, so the game needs no decoder (no Draco or meshopt WebAssembly:
// the browser's own DecompressionStream opens the gzip) and the whole build can be one HTML file under 16 MB.
// Only the models of the level the build shows are written (src/view/layout.ts), so the page carries nothing it
// does not use.   npm run models   (VITE_ZERKS_LEVEL=10 for stage 1; 20 is the default)
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { dedup, prune, quantize, reorder } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { MeshoptEncoder } from 'meshoptimizer'
import { buildingModels, layoutFor } from '../src/view/layout'

const here = dirname(fileURLToPath(import.meta.url))
const ART = resolve(here, '../../art/3d')
const OUT = resolve(here, '../src/assets/models')

const layout = layoutFor(process.env.VITE_ZERKS_LEVEL)
/** The people and ECHO (art/3d/characters, Joro 14.11.2026): one model for everyone, coloured by looks.json. */
const CHARACTERS = ['colonist', 'echo']
const MODELS = [...buildingModels(layout).map((n) => ['buildings', n] as const), ...CHARACTERS.map((n) => ['characters', n] as const)]

await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.encoder': MeshoptEncoder,
  })

mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) if (/\.(glb|gz|json)$/.test(f)) rmSync(resolve(OUT, f))
let before = 0, after = 0
for (const [dir, name] of MODELS) {
  const src = `${ART}/${dir}/${name}.glb`
  const doc = await io.read(src)
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === KHRDracoMeshCompression.EXTENSION_NAME) ext.dispose()
  // the people keep every material apart (accent, skin and hair are coloured per person), so no dedup for them
  const steps = dir === 'characters' ? [prune({ keepLeaves: true }), quantize()] : [dedup(), prune({ keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), quantize()]
  await doc.transform(...steps)
  // Quantized only (KHR_mesh_quantization), without meshopt compression: three.js reads it with no WebAssembly,
  // which the page's sandbox may not allow. Set COMPRESS=meshopt to compress (smaller, but needs WebAssembly).
  if (process.env.COMPRESS === 'meshopt') {
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER })
  }
  const out = `${OUT}/${name}.glb.gz`
  writeFileSync(out, gzipSync(await io.writeBinary(doc), { level: 9 }))
  const a = statSync(src).size, b = statSync(out).size
  before += a; after += b
  console.log(`${name.padEnd(14)} ${(a / 1024).toFixed(0).padStart(5)} KB -> ${(b / 1024).toFixed(0).padStart(5)} KB`)
}
copyFileSync(`${ART}/characters/looks.json`, `${OUT}/looks.json`)
console.log(`level ${layout.level}: ${MODELS.length} models, ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB, and looks.json`)
