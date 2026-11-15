// The colony on its map, as on the approved mockup (mockup/src/map.js and map-details.js): the buildings the level
// has, one per plot, square to a street grid of 16 m (12 m blocks, 4 m streets), the Ark on a 2x2 plot in the
// middle, the whole colony in its canyon (Joro, 14.11.2026). What stands where is in layout.ts.
// The camera looks along the grid's diagonal.
import * as THREE from 'three'
import { buildCanyon, type Block, type Shape } from './canyon'
import type { Layout } from './layout'
import { mergeMeshes } from './merge'
import { atScale, fit, place } from './models'
import { echo as makeEcho, limbs, person } from './people'
import { M, bench, lamp, planter, rb } from './props'
import { glowTexture, rng, seed } from './soft'

export const PITCH = 16
export const ARK_AT = { x: -8, z: -8 }
export const ARK_HALF = 13.8

export interface Placed {
  id: string
  name: string
  level: number
  sub?: string
  group: THREE.Group
  cx: number
  cz: number
  half: number
}

/** Someone walking up and down a street. */
export interface Walker {
  body: THREE.Group
  from: THREE.Vector3
  to: THREE.Vector3
  phase: number
  limbs: ReturnType<typeof limbs>
}

export interface World {
  buildings: Placed[]
  /** Light pools on the ground, shown only at night. */
  pools: THREE.Mesh[]
  /** Sprites of dust (none since the canyon's blanket; kept for daynight.ts). */
  dust: THREE.Sprite[]
  /** The dust blanket's layers: their day colour turns darker at night. */
  dustMats: THREE.MeshBasicMaterial[]
  /** Glowing materials of the map with their strength by day and by night. */
  glows: [THREE.MeshStandardMaterial, number, number][]
  echo: THREE.Group
  echoY: number
  people: THREE.Group[]
  walkers: Walker[]
  /** Where the build drone rests on the Ark's balcony. */
  dronePad: THREE.Vector3
  shape: Shape
  /** Objects that stay as they are (not merged with the props). */
  keep: THREE.Object3D[]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}

/** The furnaces have their filters, so no smoke. */
function noSmoke(g: THREE.Group) {
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === 'steam') m.visible = false })
  return g
}
/** A copy of a material that is not drawn where a dug building's hole is (stencil 1). */
const notOverHole = (m: THREE.Material) => Object.assign(m.clone(), { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.KeepStencilOp })

export function buildWorld(scene: THREE.Scene, L: Layout): World {
  seed(7)
  const add = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, ry = 0, s = 1): T => {
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o
  }

  const glowT = glowTexture()
  // the pools share one material per colour and strength, so they merge into a few meshes at the end
  const poolParts: THREE.Mesh[] = []
  const poolMats = new Map<string, THREE.MeshBasicMaterial>()
  const pool = (x: number, z: number, size: number, color = 0xffc77a, op = 0.5) => {
    const key = `${color}-${op}`
    let mat = poolMats.get(key)
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ map: glowT, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      mat.userData.opacity = op
      poolMats.set(key, mat)
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.45, z)
    m.updateMatrixWorld()
    poolParts.push(m)
  }

  // the street grid: the open zones reach `reach` rows back and `front` rows to the front, |d| <= 2
  const extra = new Set(L.extra.map(([d, s]) => `${d},${s}`))
  const blocks: Block[] = []
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
    const d = i - j, s = i + j
    if (Math.abs(d) > 3 || Math.abs(s) > 10) continue
    blocks.push({ d, s, cx: i * PITCH, cz: j * PITCH, built: (Math.abs(d) <= 2 && s >= -L.reach && s <= L.front) || extra.has(`${d},${s}`) })
  }
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xf6c590, roughness: 0.82 })
  const holeSafe = { road: notOverHole(roadMat), edge: notOverHole(M.padEdge), pad: notOverHole(M.pad) }
  const ARK_PLOTS = new Set(['0,-2', '-1,-1', '1,-1', '0,0'])
  const plot = (cx: number, cz: number, dug = false) => {
    const m = dug ? holeSafe : { road: roadMat, edge: M.padEdge, pad: M.pad }
    add(rb(PITCH, 0.1, PITCH, m.road, 0.05, 1), cx, 0.03, cz)
    const e = add(rb(12.4, 0.36, 12.4, m.edge, 0.5, 2), cx, 0.12, cz), p = add(rb(11.6, 0.36, 11.6, m.pad, 0.45, 2), cx, 0.22, cz)
    if (dug) e.castShadow = p.castShadow = false   // the plot's slab must not shade the pit
  }
  const dash = new THREE.MeshStandardMaterial({ color: 0xfff3e2, roughness: 0.82, transparent: true, opacity: 0.75 })
  const futurePlot = (cx: number, cz: number) => {
    for (let i = 0; i < 8; i++) {
      const t = -5.25 + i * 1.5
      for (const e of [-5.6, 5.6]) { add(rb(0.9, 0.12, 0.35, dash, 0.1, 1), cx + t, 0.06, cz + e); add(rb(0.35, 0.12, 0.9, dash, 0.1, 1), cx + e, 0.06, cz + t) }
    }
  }

  const byPlot = new Map(L.buildings.map((b) => [`${b.d},${b.s}`, b]))
  const buildings: Placed[] = []
  for (const b of blocks) {
    if (ARK_PLOTS.has(`${b.d},${b.s}`)) { add(rb(PITCH, 0.1, PITCH, roadMat, 0.05, 1), b.cx, 0.03, b.cz); continue }
    if (!b.built) continue
    const fill = byPlot.get(`${b.d},${b.s}`)
    plot(b.cx, b.cz, !!fill?.dug)
    if (!fill) { futurePlot(b.cx, b.cz); continue }
    const model = fill.k ? atScale(fill.model, fill.k, fill.dug) : fit(fill.model, fill.size)
    const g = add(noSmoke(model), b.cx, 0.4, b.cz)
    g.name = fill.id
    buildings.push({ id: fill.id, name: fill.name, level: fill.level, sub: fill.sub, group: g, cx: b.cx, cz: b.cz, half: 6 })
    if (fill.id === 'drill') for (let i = 0; i < 10; i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.25, 0), M.carbon), b.cx - 4 + rng() * 8, 0.55, b.cz + 4 + rng())
  }

  // the Ark on its 2x2 plot (Joro, 06.11.2026)
  add(rb(2 * ARK_HALF + 0.8, 0.36, 2 * ARK_HALF + 0.8, M.padEdge, 0.5), ARK_AT.x, 0.12, ARK_AT.z)
  add(rb(2 * ARK_HALF, 0.36, 2 * ARK_HALF, M.pad, 0.45), ARK_AT.x, 0.22, ARK_AT.z)
  const ark = add(place(L.ark, () => 4.15), ARK_AT.x, 0.4, ARK_AT.z)
  ark.name = 'ark'
  ark.updateMatrixWorld(true)
  // the drone's balcony (art/3d/buildings/src/build.py): the flying drone lands where the model parks its own
  const padNode = ark.getObjectByName('drone_pad')
  const dronePad = padNode ? padNode.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(ARK_AT.x - 6, 15.5, ARK_AT.z + 6)
  ark.traverse((o) => { if (o.name.startsWith('parked_drone')) o.visible = false })
  buildings.unshift({ id: 'ark', name: 'The Ark', level: L.level, group: ark, cx: ARK_AT.x, cz: ARK_AT.z, half: ARK_HALF + 0.15 })
  // the dock with the ship's frame, on the Ark's plot in front of it on the crane's side: its centre is (2.32, -1.82)
  // Blender units from the Ark's origin (art/3d/buildings/README.md), at the Ark's 4.15 m a unit
  const dockBox = new THREE.Box3()
  if (L.dock) {
    const origin = ark.children[0]!.position.clone().add(ark.position)
    const dock = add(place(L.dock, () => 4.15), origin.x + 2.32 * 4.15, 0.4, origin.z + 1.82 * 4.15)
    dock.name = 'dock'
    dockBox.setFromObject(dock).expandByScalar(1.2)
    buildings.push({ id: 'dock', name: 'Dock', level: L.level, sub: 'The frame is ready', group: dock, cx: dock.position.x, cz: dock.position.z, half: 4.5 })
  }
  /** Nothing small stands in the dock. */
  const free = (x: number, z: number) => dockBox.isEmpty() || !dockBox.containsPoint(new THREE.Vector3(x, dockBox.min.y + 0.1, z))

  // a few colonists outside (most of them work inside), lamps, planters and benches (mockup)
  const people: THREE.Group[] = []
  const standing = L.outside.slice(0, 4), walking = L.outside.slice(4)
  let next = 0
  for (const b of buildings) {
    if (b.id === 'dock') continue
    if (next < standing.length && b.id !== 'ark') {
      const off = b.half + 0.7, side = rng() < 0.5, t = (rng() - 0.5) * 12, o = (rng() < 0.5 ? -1 : 1) * off
      people.push(add(person(standing[next++]!), b.cx + (side ? o : t), 0.15, b.cz + (side ? t : o), rng() * 6, 1.4))
    }
    pool(b.cx, b.cz, b.id === 'ark' ? 30 : 13, 0xffd9a0, 0.22)
  }
  // the Commander on the Ark's plot, by its front corner left of the dock, with ECHO at his shoulder
  // (ECHO is 2.4 times its real half metre, to be tapped; the people 1.4 times, as on the mockup)
  people.push(add(person('Commander'), -4.6, 0.4, 3.4, Math.PI / 4, 1.4))
  const echoY = 2.7
  const echo = add(makeEcho(), -2.7, echoY, 1.9, Math.PI / 4, 2.4)
  // the ones who walk: up and down the streets round the Ark and into the newer zones
  const ROUTES: [number, number, number, number][] = [[8.9, -22, 8.9, 34], [-54, -24.9, 6, -24.9], [-24.9, -56, -24.9, 6], [-6, 8.9, 40, 8.9]]
  const walkers: Walker[] = walking.map((name, i) => {
    const [x1, z1, x2, z2] = ROUTES[i % ROUTES.length]!
    const body = add(person(name), x1, 0.15, z1, 0, 1.4)
    return { body, from: new THREE.Vector3(x1, 0.15, z1), to: new THREE.Vector3(x2, 0.15, z2), phase: i * 0.37, limbs: limbs(body) }
  })

  for (const b of buildings) {
    if (b.id === 'dock') continue
    const e = b.id === 'ark' ? b.half : 5.95, y = 0.4
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) { add(lamp(), b.cx + sx * e, y, b.cz + sz * e); pool(b.cx + sx * e, b.cz + sz * e, 7) }
    const h = Math.abs(Math.round(((b.cx - b.cz) / PITCH) * 3 + (b.cx + b.cz) / PITCH))
    ;([[0, 1], [1, 0], [0, -1], [-1, 0]] as const).forEach(([ax, az], side) => {
      const p = (t: number) => [b.cx + (ax ? ax * e : t), b.cz + (az ? az * e : t)] as const
      const rot = ax ? (ax > 0 ? Math.PI / 2 : -Math.PI / 2) : (az > 0 ? 0 : Math.PI)
      if (b.id === 'ark') {
        { const [x, z] = p(0); add(lamp(), x, y, z); pool(x, z, 7) }
        for (const t of [-10.2, -6.8, 6.8, 10.2]) { const [x, z] = p(t); if (free(x, z)) add(planter(), x, y, z) }
        for (const t of [-3.4, 3.4]) { const [x, z] = p(t); if (free(x, z)) add(bench(), x, y, z, rot) }
        return
      }
      for (const t of [-3.4, 3.4]) if ((h + side) % 2 === 0) { const [x, z] = p(t); add(planter(), x, y, z) }
      if ((h + side) % 3 === 0) { const [x, z] = p(0); add(bench(), x, y, z, rot) }
    })
  }

  // the canyon, the ground, the ice, the channel, the edge of the closed zone and the dust over it
  const canyon = buildCanyon(scene, {
    blocks,
    kerbs: buildings.filter((b) => b.id !== 'dock').map((b) => ({ cx: b.cx, cz: b.cz, half: b.id === 'ark' ? b.half : 6.2 })),
    reach: L.reach, runs: L.lines, zone: L.zone,
  })

  const pools = mergeMeshes(poolParts, null)
  for (const m of pools) { m.userData.opacity = (m.material as THREE.Material).userData.opacity; m.visible = false; m.castShadow = m.receiveShadow = false; m.renderOrder = 1; scene.add(m) }
  return {
    buildings, pools, dust: [], dustMats: canyon.dustMats, glows: [[canyon.glow, 1.2, 2.2]], echo, echoY, people, walkers, dronePad,
    shape: canyon.shape, keep: canyon.keep, bounds: L.bounds,
  }
}
