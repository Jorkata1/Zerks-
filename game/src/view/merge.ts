// Fewer draw calls for the phone: meshes that never move are merged by material. The props on the map (plots,
// streets, rocks, lamps, planters, benches) become one mesh per material; each building keeps its own group (for
// tapping and the bounce) but its parts are merged by material inside it.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const ATTRS = ['position', 'normal', 'uv'] as const

/** A plain, non-indexed float copy of a mesh's geometry in the given space (models come quantized with meshopt). */
function plainGeometry(mesh: THREE.Mesh, toSpace: THREE.Matrix4, withColor: boolean): THREE.BufferGeometry {
  const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry
  const g = new THREE.BufferGeometry()
  const names: string[] = [...ATTRS, ...(withColor ? ['color'] : [])]
  for (const name of names) {
    const a = src.getAttribute(name) as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined
    const size = name === 'uv' ? 2 : 3
    const out = new Float32Array(src.getAttribute('position').count * size)
    if (a) {
      for (let i = 0; i < a.count; i++) {
        out[i * size] = a.getX(i)
        out[i * size + 1] = a.getY(i)
        if (size === 3) out[i * size + 2] = a.itemSize > 2 ? a.getZ(i) : 0
      }
    } else if (name === 'color') out.fill(1)
    g.setAttribute(name, new THREE.BufferAttribute(out, size))
  }
  if (!src.getAttribute('normal')) g.computeVertexNormals()
  g.applyMatrix4(toSpace.clone().multiply(mesh.matrixWorld))
  return g
}

/** Merges meshes by material, in the space of `space` (its matrixWorld inverse), or the world's. */
export function mergeMeshes(meshes: THREE.Mesh[], space: THREE.Object3D | null): THREE.Mesh[] {
  const inv = space ? space.matrixWorld.clone().invert() : new THREE.Matrix4()
  const byMat = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; order: number }>()
  for (const m of meshes) {
    const mat = m.material as THREE.Material
    const e = byMat.get(mat) ?? { geos: [], cast: false, order: m.renderOrder }
    e.geos.push(plainGeometry(m, inv, (mat as THREE.MeshStandardMaterial).vertexColors === true))
    e.cast ||= m.castShadow
    byMat.set(mat, e)
  }
  const out: THREE.Mesh[] = []
  for (const [mat, e] of byMat) {
    const geo = mergeGeometries(e.geos, false)
    if (!geo) continue
    for (const g of e.geos) g.dispose()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = e.cast && !mat.transparent
    mesh.receiveShadow = true
    mesh.renderOrder = e.order
    out.push(mesh)
  }
  return out
}

const meshesUnder = (root: THREE.Object3D) => {
  const list: THREE.Mesh[] = []
  root.traverseVisible((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && !Array.isArray(m.material)) list.push(m)
  })
  return list
}

/** Merges a building's parts inside its own group. */
export function mergeGroup(group: THREE.Group) {
  group.updateMatrixWorld(true)
  const merged = mergeMeshes(meshesUnder(group), group)
  group.clear()
  group.add(...merged)
}

/** Merges the static props: every top-level object of the scene that is not in `keep`. */
export function mergeProps(scene: THREE.Scene, keep: Set<THREE.Object3D>) {
  scene.updateMatrixWorld(true)
  const props = scene.children.filter((o) => !keep.has(o) && !(o as THREE.Light).isLight && !(o as THREE.Sprite).isSprite)
  const meshes = props.flatMap((o) => meshesUnder(o))
  const merged = mergeMeshes(meshes, null)
  for (const o of props) scene.remove(o)
  scene.add(...merged)
}
