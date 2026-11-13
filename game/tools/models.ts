// Prepares the 3D models for the game: reads the Draco GLBs from art/3d/buildings and writes them quantized into
// src/assets/models, so the game needs no decoder (no Draco or meshopt WebAssembly) and the whole build can be one
// HTML file.   npm run models
import { mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { dedup, prune, quantize, reorder } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { MeshoptEncoder } from 'meshoptimizer'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '../../art/3d/buildings')
const OUT = resolve(here, '../src/assets/models')

/** The models of chapter 1 that the level 10 map uses (mockup/src/map.js), plus the drone and the rover. */
export const MODELS = [
  'ark', 'drill', 'pump', 'processor', 'veglab', 'research-1', 'home-10', 'kitchen', 'warehouse', 'furnace',
  'solar', 'batteries', 'greenhouse', 'mine', 'geolocator', 'drone', 'rover',
]

await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.encoder': MeshoptEncoder,
  })

mkdirSync(OUT, { recursive: true })
let before = 0, after = 0
for (const name of MODELS) {
  const src = `${SRC}/${name}.glb`
  const doc = await io.read(src)
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === KHRDracoMeshCompression.EXTENSION_NAME) ext.dispose()
  await doc.transform(dedup(), prune({ keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), quantize())
  // Quantized only (KHR_mesh_quantization), without meshopt compression: three.js reads it with no WebAssembly,
  // which the page's sandbox may not allow. Set COMPRESS=meshopt to compress (smaller, but needs WebAssembly).
  if (process.env.COMPRESS === 'meshopt') {
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER })
  }
  const out = `${OUT}/${name}.glb`
  await io.write(out, doc)
  const a = statSync(src).size, b = statSync(out).size
  before += a; after += b
  console.log(`${name.padEnd(12)} ${(a / 1024).toFixed(0).padStart(5)} KB -> ${(b / 1024).toFixed(0).padStart(5)} KB`)
}
console.log(`total ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`)
