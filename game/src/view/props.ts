// The small things built in code, as in the approved map (mockup/src/map.js, colony.js, models.js):
// the flat cartoon materials, lamps, planters, benches, colonists in suits and ECHO.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { rng } from './soft'

export const flat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...o })
export const glow = (color: number, k = 1.6) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 })

/** The palette. The glowing ones are listed in GLOWS so the night can make them brighter. */
export const M = {
  cream: flat(0xfbf3e6), orange: flat(0xff7a2e), navy: flat(0x2f3346), white: flat(0xffffff),
  soil: flat(0x9a6440), wood: flat(0xc98b55), darkGlass: flat(0x2f4f78, { roughness: 0.25 }), steel: flat(0xa7b2c4),
  hull2: flat(0xe9dfcf), carbon: flat(0x2e2c33),
  leaf: [flat(0x5fbf47), flat(0x7ad35a), flat(0x4aa83f)],
  teal: glow(0x5fe3d0, 1.2), warm: glow(0xffd58a, 1.1),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
  pad: flat(0xfff4e4), padEdge: flat(0xe8b285), rock: flat(0xcf7a52), rock2: flat(0xb9643f),
}
/** Emissive materials and their intensity by day and by night (the night values are the mockup's #lvl10-night). */
export const GLOWS: [THREE.MeshStandardMaterial, number, number][] = [[M.teal, 1.2, 2.2], [M.warm, 1.1, 2.2]]

const done = <T extends THREE.Object3D>(g: T): T => {
  g.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) { m.castShadow = !(m.material as THREE.Material).transparent; m.receiveShadow = true }
  })
  return g
}

/** A rounded box, the basic shape of the style (no sharp edges). */
export function rb(w: number, h: number, d: number, mat: THREE.Material, r = 0.4, seg = 3): THREE.Mesh {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat)
  m.castShadow = m.receiveShadow = true
  return m
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => { o.position.set(x, y, z); return o }
function box(g: THREE.Group, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = 0.3) {
  return g.add(at(rb(w, h, d, m, r, 1), x, y, z))
}
function cyl(g: THREE.Group, rt: number, rb_: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 14) {
  return g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb_, h, seg), m), x, y, z))
}
const ballGeo = new THREE.SphereGeometry(1, 12, 8)
function ball(g: THREE.Group, r: number, m: THREE.Material, x: number, y: number, z: number, sy = 1) {
  const b = new THREE.Mesh(ballGeo, m)
  b.scale.set(r, r * sy, r)
  return g.add(at(b, x, y, z))
}
function band(g: THREE.Group, r: number, t: number, m: THREE.Material, x: number, y: number, z: number) {
  const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 5, 20), m)
  o.rotation.x = Math.PI / 2
  return g.add(at(o, x, y, z))
}

export function lamp(): THREE.Group {
  const g = new THREE.Group(), h = 2.4
  cyl(g, 0.07, 0.1, h, M.navy, 0, h / 2, 0, 8)
  ball(g, 0.22, M.teal, 0, h + 0.15, 0)
  band(g, 0.2, 0.04, M.orange, 0, h - 0.02, 0)
  return done(g)
}

/** At 28% the air is still thin, so the plant in the planter lives under a glass bell (mockup, level 10). */
export function planter(): THREE.Group {
  const g = new THREE.Group()
  cyl(g, 0.55, 0.45, 0.5, M.cream, 0, 0.25, 0)
  band(g, 0.56, 0.05, M.orange, 0, 0.42, 0)
  cyl(g, 0.48, 0.48, 0.05, M.soil, 0, 0.5, 0)
  ball(g, 0.25, M.leaf[Math.floor(rng() * 3)]!, 0, 0.7, 0)
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.glass)
  bell.position.y = 0.5
  g.add(bell)
  return done(g)
}

export function bench(): THREE.Group {
  const g = new THREE.Group()
  box(g, 1.5, 0.12, 0.5, M.cream, 0, 0.45, 0, 0.05)
  box(g, 1.5, 0.4, 0.1, M.cream, 0, 0.75, -0.22, 0.05)
  for (const x of [-0.6, 0.6]) box(g, 0.1, 0.45, 0.45, M.navy, x, 0.22, 0, 0.03)
  return done(g)
}

export const SUITS = [0x6fb7ff, 0x9a7cff, 0x33c5a2, 0xff8b3d, 0xff5d8a, 0xffc65c]
const suitWhite = flat(0xffffff), visorMat = flat(0x3a6db5, { roughness: 0.2 })
/** A colonist in a white suit with a coloured stripe and a blue visor (mockup/src/map.js). */
export function colonist(stripe: number): THREE.Group {
  const g = new THREE.Group(), st = flat(stripe)
  const legs = new THREE.Group()
  for (const x of [-0.13, 0.13]) legs.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 4, 8), suitWhite), x, 0.3, 0))
  legs.name = 'legs'
  g.add(legs)
  g.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.36, 6, 12), suitWhite), 0, 0.86, 0))
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 16), st), 0, 0.74, 0))
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), suitWhite), 0, 1.42, 0))
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), visorMat)
  visor.rotation.x = Math.PI / 2
  visor.position.set(0, 1.44, 0.11)
  visor.scale.set(1, 1, 0.75)
  g.add(visor)
  return done(g)
}

/** ECHO: the small flying robot, the Ark's computer in a small body (concept.md). */
export function echoBot(): THREE.Group {
  const g = new THREE.Group()
  ball(g, 0.5, M.white, 0, 0, 0)
  box(g, 0.6, 0.22, 0.2, M.darkGlass, 0, 0.05, 0.42, 0.1)
  box(g, 0.4, 0.08, 0.05, M.teal, 0, 0.05, 0.53, 0.03)
  band(g, 0.68, 0.05, M.teal, 0, -0.12, 0)
  for (const s of [-1, 1]) box(g, 0.12, 0.35, 0.3, M.hull2, s * 0.55, 0, 0, 0.05)
  cyl(g, 0.02, 0.02, 0.4, M.steel, 0.15, 0.6, 0, 4)
  ball(g, 0.06, M.teal, 0.15, 0.82, 0)
  return done(g)
}

const rockGeo = new THREE.IcosahedronGeometry(1, 1)
export function rock(s: number): THREE.Mesh {
  const m = new THREE.Mesh(rockGeo, rng() < 0.5 ? M.rock : M.rock2)
  m.scale.set(s * (0.9 + rng() * 0.4), s * (0.55 + rng() * 0.3), s * (0.9 + rng() * 0.4))
  m.rotation.y = rng() * 6
  m.castShadow = m.receiveShadow = true
  return m
}
