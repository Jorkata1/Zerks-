// Loads the GLB models (prepared by tools/models.ts, quantized and gzipped) and gives each building a copy that
// stands on its plot, centred, at the size the approved map uses.
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

const URLS = import.meta.glob('../assets/models/*.glb.gz', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const urlOf = (name: string) => {
  const u = URLS[`../assets/models/${name}.glb.gz`]
  if (!u) throw new Error(`model ${name} is missing: run npm run models`)
  return u
}

/** Emissive materials of the models with their daytime intensity, for the night. */
export const MODEL_GLOWS: [THREE.MeshStandardMaterial, number][] = []
const loaded: Record<string, THREE.Object3D> = {}

/**
 * In the build the models are inside the page as data: URLs. They are decoded here, without fetch(), because the
 * page's sandbox may refuse to fetch even data: URLs; in the dev server they are ordinary files. Either way they are
 * gzipped, and the browser's DecompressionStream opens them (no WebAssembly).
 */
async function load(loader: GLTFLoader, url: string): Promise<GLTF> {
  let bytes: Uint8Array
  if (url.startsWith('data:')) {
    const bin = atob(url.slice(url.indexOf(',') + 1))
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } else bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  const glb = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  return loader.parseAsync(glb, '')
}

/**
 * A building dug into the ground (the clay pit) marks its opening with the material 'hole': it is not drawn, it only
 * writes 1 to the stencil, and the ground and the plot (stencil test "not 1") are not drawn over the pit.
 */
export const HOLE = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1,
  stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp })
HOLE.name = 'hole'

export async function loadModels(names: string[]): Promise<void> {
  const loader = new GLTFLoader()
  await Promise.all(names.map(async (n) => {
    const root = (await load(loader, urlOf(n))).scene
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      if ((mesh.material as THREE.Material).name === 'hole') { mesh.material = HOLE; mesh.renderOrder = -1; mesh.castShadow = mesh.receiveShadow = false; return }
      const ms = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]
      const clear = ms.some((m) => m.transparent)
      mesh.castShadow = !clear
      mesh.receiveShadow = true
      for (const m of ms) {
        m.metalness = 0
        if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide } else m.roughness = Math.max(0.5, m.roughness ?? 0.6)
        if (m.emissive && m.emissive.getHex() !== 0 && !MODEL_GLOWS.some(([x]) => x === m)) MODEL_GLOWS.push([m, m.emissiveIntensity])
      }
      if (clear) mesh.renderOrder = 2
    })
    loaded[n] = root
  }))
}

/** The loaded model itself (shared): for the people, who are cloned and coloured one by one. */
export function model(n: string): THREE.Object3D {
  const src = loaded[n]
  if (!src) throw new Error(`model ${n} not loaded`)
  return src
}

/**
 * A copy of model n standing on y = 0, centred, scaled by k(size of the model). A dug model (the clay pit) keeps its
 * own ground, its origin, at y = 0, so the pit goes down into the ground.
 */
export function place(n: string, k: (size: THREE.Vector3) => number, dug = false): THREE.Group {
  const g = new THREE.Group(), m = model(n).clone(true)
  const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3())
  const scale = k(s)
  m.scale.setScalar(scale)
  m.position.set(-c.x * scale, dug ? 0 : -b.min.y * scale, -c.z * scale)
  g.add(m)
  return g
}
/** Scaled so its footprint is `size` metres across (the mockup's kk). */
export const fit = (n: string, size = 9.6) => place(n, (s) => size / Math.max(s.x, s.z))
/** At a fixed scale, for the buildings that grow with their level (the mockup's atScale). */
export const atScale = (n: string, k = 4.3, dug = false) => place(n, () => k, dug)
