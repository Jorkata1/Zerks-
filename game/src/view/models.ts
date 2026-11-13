// Loads the GLB models (prepared by tools/models.ts, quantized) and gives each building a copy that stands on
// its plot, centred, at the size the approved map uses.
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

const URLS = import.meta.glob('../assets/models/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const urlOf = (name: string) => {
  const u = URLS[`../assets/models/${name}.glb`]
  if (!u) throw new Error(`model ${name} is missing: run npm run models`)
  return u
}

/** Emissive materials of the models with their daytime intensity, for the night. */
export const MODEL_GLOWS: [THREE.MeshStandardMaterial, number][] = []
const loaded: Record<string, THREE.Object3D> = {}

/**
 * In the build the models are inside the page as data: URLs. They are decoded here, without fetch(), because the
 * page's sandbox may refuse to fetch even data: URLs; in the dev server they are ordinary files.
 */
function load(loader: GLTFLoader, url: string): Promise<GLTF> {
  if (!url.startsWith('data:')) return loader.loadAsync(url)
  const bin = atob(url.slice(url.indexOf(',') + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return loader.parseAsync(bytes.buffer, '')
}

export async function loadModels(names: string[]): Promise<void> {
  const loader = new GLTFLoader()
  await Promise.all(names.map(async (n) => {
    const root = (await load(loader, urlOf(n))).scene
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
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

/** A copy of model n standing on y = 0, centred, scaled by k(size of the model). */
export function place(n: string, k: (size: THREE.Vector3) => number): THREE.Group {
  const src = loaded[n]
  if (!src) throw new Error(`model ${n} not loaded`)
  const g = new THREE.Group(), m = src.clone(true)
  const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3())
  const scale = k(s)
  m.scale.setScalar(scale)
  m.position.set(-c.x * scale, -b.min.y * scale, -c.z * scale)
  g.add(m)
  return g
}
/** Scaled so its footprint is `size` metres across (the mockup's kk). */
export const fit = (n: string, size = 9.6) => place(n, (s) => size / Math.max(s.x, s.z))
/** At a fixed scale, for the buildings that grow with their level (the mockup's atScale). */
export const atScale = (n: string, k = 4.3) => place(n, () => k)
