// The colony at Ark level 10, the end of chapter 1, as on the approved map (mockup/src/map.js, map.html#lvl10,
// Joro 05-06.11.2026): the buildings levels.md has by then, one per plot, square to a street grid of 16 m
// (12 m blocks, 4 m streets), the Ark on a 2x2 plot in the middle. The camera looks along the grid's diagonal.
import * as THREE from 'three'
import { mergeMeshes } from './merge'
import { atScale, fit, place } from './models'
import { M, SUITS, bench, colonist, echoBot, lamp, planter, rb, rock } from './props'
import { cloudTexture, glowTexture, groundTexture, pick, rng, seed } from './soft'

export const PITCH = 16
export const ARK_AT = { x: -8, z: -8 }
export const ARK_HALF = 13.8

export interface Placed {
  id: string
  name: string
  level: number
  group: THREE.Group
  cx: number
  cz: number
  half: number
}

/** The buildings of the level 10 map, by plot (d = i - j across the screen, s = i + j along it). Names in English. */
const BUILT: Record<string, { id: string; name: string; make: () => THREE.Group }> = {
  '1,1': { id: 'drill', name: 'Carbon drill', make: () => fit('drill', 9.6) },
  '-1,1': { id: 'pump', name: 'Water pump', make: () => fit('pump', 8.2) },
  '0,4': { id: 'processor', name: 'Atmosphere processor', make: () => fit('processor', 7.6) },
  '-1,-3': { id: 'research', name: 'Research station', make: () => atScale('research-1') },
  '0,2': { id: 'veglab', name: 'Vegetable lab', make: () => fit('veglab', 9.6) },
  '1,-3': { id: 'home', name: 'Colonists\' home', make: () => atScale('home-10') },
  '2,0': { id: 'kitchen', name: 'Common kitchen', make: () => fit('kitchen', 10.2) },
  '-2,0': { id: 'mine', name: 'Mine', make: () => fit('mine', 10) },
  '-2,-2': { id: 'furnace', name: 'Silicon furnace', make: () => noSmoke(fit('furnace', 8.8)) },
  '2,-2': { id: 'warehouse', name: 'Store', make: () => fit('warehouse', 10) },
  '2,2': { id: 'greenhouse', name: 'Greenhouse', make: () => fit('greenhouse', 10.4) },
  '-2,2': { id: 'geolocator', name: 'Geolocator', make: () => fit('geolocator', 9.4) },
  '1,3': { id: 'solar', name: 'Solar panels', make: () => fit('solar', 11.0) },
  '-1,3': { id: 'batteries', name: 'Batteries', make: () => fit('batteries', 6.0) },
}
/** The furnace has its filter from level 6, so no smoke. */
function noSmoke(g: THREE.Group) {
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === 'steam') m.visible = false })
  return g
}

export const MODEL_NAMES = ['ark', 'drill', 'pump', 'processor', 'veglab', 'research-1', 'home-10', 'kitchen', 'warehouse',
  'furnace', 'solar', 'batteries', 'greenhouse', 'mine', 'geolocator', 'drone', 'rover']

export interface World {
  buildings: Placed[]
  ground: THREE.Mesh
  /** Light pools on the ground, shown only at night. */
  pools: THREE.Mesh[]
  dust: THREE.Sprite[]
  echo: THREE.Group
  people: THREE.Group[]
  /** Where the build drone rests on the Ark's balcony. */
  dronePad: THREE.Vector3
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}

export function buildWorld(scene: THREE.Scene): World {
  seed(7)
  const add = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, ry = 0, s = 1): T => {
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o
  }

  // the dusty ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ map: groundTexture('#ee9f66', ['226,140,88', '246,184,124']), roughness: 1 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const glowT = glowTexture(), cloudT = cloudTexture()
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
  const dust: THREE.Sprite[] = []
  const puff = (x: number, y: number, z: number, s: number, op: number) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, color: 0xfde6d2, transparent: true, opacity: op, depthWrite: false, rotation: rng() * 6 }))
    m.position.set(x, y, z)
    m.scale.set(s, s * 0.62, 1)
    m.userData.opacity = op
    scene.add(m)
    dust.push(m)
  }

  // the street grid: zone I at level 10 reaches 3 rows back and 4 to the front (mockup)
  const REACH = 3, FRONT = 4
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xf6c590, roughness: 0.82 })
  const ARK_PLOTS = new Set(['0,-2', '-1,-1', '1,-1', '0,0'])
  const blocks: { d: number; s: number; cx: number; cz: number; built: boolean }[] = []
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
    const d = i - j, s = i + j
    if (Math.abs(d) > 3 || Math.abs(s) > 10) continue
    blocks.push({ d, s, cx: i * PITCH, cz: j * PITCH, built: Math.abs(d) <= 2 && s >= -REACH && s <= FRONT })
  }
  const plot = (cx: number, cz: number) => {
    add(rb(PITCH, 0.1, PITCH, roadMat, 0.05, 1), cx, 0.03, cz)
    add(rb(12.4, 0.36, 12.4, M.padEdge, 0.5, 2), cx, 0.12, cz)
    add(rb(11.6, 0.36, 11.6, M.pad, 0.45, 2), cx, 0.22, cz)
  }
  const dash = new THREE.MeshStandardMaterial({ color: 0xfff3e2, roughness: 0.82, transparent: true, opacity: 0.75 })
  const futurePlot = (cx: number, cz: number) => {
    for (let i = 0; i < 8; i++) {
      const t = -5.25 + i * 1.5
      for (const e of [-5.6, 5.6]) { add(rb(0.9, 0.12, 0.35, dash, 0.1, 1), cx + t, 0.06, cz + e); add(rb(0.35, 0.12, 0.9, dash, 0.1, 1), cx + e, 0.06, cz + t) }
    }
  }

  const buildings: Placed[] = []
  for (const b of blocks) {
    if (ARK_PLOTS.has(`${b.d},${b.s}`)) { add(rb(PITCH, 0.1, PITCH, roadMat, 0.05, 1), b.cx, 0.03, b.cz); continue }
    const fill = BUILT[`${b.d},${b.s}`]
    if (b.built && fill) {
      plot(b.cx, b.cz)
      const g = add(fill.make(), b.cx, 0.4, b.cz)
      g.name = fill.id
      buildings.push({ id: fill.id, name: fill.name, level: 10, group: g, cx: b.cx, cz: b.cz, half: 6 })
      if (fill.id === 'drill') for (let i = 0; i < 10; i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.25, 0), M.carbon), b.cx - 4 + rng() * 8, 0.55, b.cz + 4 + rng())
      continue
    }
    if (b.built) { plot(b.cx, b.cz); futurePlot(b.cx, b.cz); continue }
    for (let i = 0; i < 6; i++) { const r = rock(0.6 + rng() * 1.4); add(r, b.cx - 6 + rng() * 12, r.scale.x * 0.25, b.cz - 6 + rng() * 12) }
  }
  // the Ark on its 2x2 plot (Joro, 06.11.2026)
  add(rb(2 * ARK_HALF + 0.8, 0.36, 2 * ARK_HALF + 0.8, M.padEdge, 0.5), ARK_AT.x, 0.12, ARK_AT.z)
  add(rb(2 * ARK_HALF, 0.36, 2 * ARK_HALF, M.pad, 0.45), ARK_AT.x, 0.22, ARK_AT.z)
  const ark = add(place('ark', () => 4.15), ARK_AT.x, 0.4, ARK_AT.z)
  ark.name = 'ark'
  // the drone's balcony (art/3d/buildings/src/build.py): the flying drone lands where the model parks its own
  ark.updateMatrixWorld(true)
  const padNode = ark.getObjectByName('drone_pad')
  const dronePad = padNode ? padNode.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(ARK_AT.x - 6, 15.5, ARK_AT.z + 6)
  ark.traverse((o) => { if (o.name.startsWith('parked_drone')) o.visible = false })
  buildings.unshift({ id: 'ark', name: 'The Ark', level: 10, group: ark, cx: ARK_AT.x, cz: ARK_AT.z, half: ARK_HALF + 0.15 })

  // colonists outside (ten are awake; most work inside), lamps, planters and benches (mockup)
  const people: THREE.Group[] = []
  let outside = 5
  for (const b of buildings) {
    if (outside-- > 0) {
      const off = b.half + (b.id === 'ark' ? 0.6 : 0.7), side = rng() < 0.5, t = (rng() - 0.5) * 12, o = (rng() < 0.5 ? -1 : 1) * off
      people.push(add(colonist(pick(SUITS)), b.cx + (side ? o : t), 0.15, b.cz + (side ? t : o), rng() * 6, 1.25))
    }
    pool(b.cx, b.cz, b.id === 'ark' ? 30 : 13, 0xffd9a0, 0.22)
  }
  for (const b of buildings) {
    const e = b.id === 'ark' ? b.half : 5.95, y = 0.4
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) { add(lamp(), b.cx + sx * e, y, b.cz + sz * e); pool(b.cx + sx * e, b.cz + sz * e, 7) }
    const h = Math.abs(Math.round(((b.cx - b.cz) / PITCH) * 3 + (b.cx + b.cz) / PITCH))
    ;([[0, 1], [1, 0], [0, -1], [-1, 0]] as const).forEach(([ax, az], side) => {
      const p = (t: number) => [b.cx + (ax ? ax * e : t), b.cz + (az ? az * e : t)] as const
      const rot = ax ? (ax > 0 ? Math.PI / 2 : -Math.PI / 2) : (az > 0 ? 0 : Math.PI)
      if (b.id === 'ark') {
        { const [x, z] = p(0); add(lamp(), x, y, z); pool(x, z, 7) }
        for (const t of [-10.2, -6.8, 6.8, 10.2]) { const [x, z] = p(t); add(planter(), x, y, z) }
        for (const t of [-3.4, 3.4]) { const [x, z] = p(t); add(bench(), x, y, z, rot) }
        return
      }
      for (const t of [-3.4, 3.4]) if ((h + side) % 2 === 0) { const [x, z] = p(t); add(planter(), x, y, z) }
      if ((h + side) % 3 === 0) { const [x, z] = p(0); add(bench(), x, y, z, rot) }
    })
  }
  const echo = add(echoBot(), 6.5, 6.2, 9, -0.6, 1.25)
  echo.name = 'echo'

  // zone II, which the research opens on level 10, still lies under dust
  for (const b of blocks) if (b.s < -REACH && Math.abs(b.d) <= 2) for (let k = 0; k < 2; k++) puff(b.cx - 4 + rng() * 8, 2 + rng() * 3, b.cz - 4 + rng() * 8, 20 + rng() * 8, 0.85)
  for (const [x, z, s, c] of [[-32, -16, 8, 0x5fe3d0], [16, -16, 9, 0xffc77a], [16, 16, 8, 0xd38cff], [32, 32, 8, 0x5fe3d0], [-16, -32, 9, 0xffd58a], [-8, -8, 22, 0xffd58a]] as const) pool(x, z, s, c, 0.35)

  const pools = mergeMeshes(poolParts, null)
  for (const m of pools) { m.userData.opacity = (m.material as THREE.Material).userData.opacity; m.visible = false; m.castShadow = m.receiveShadow = false; m.renderOrder = 1; scene.add(m) }
  return { buildings, ground, pools, dust, echo, people, dronePad, bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 } }
}
