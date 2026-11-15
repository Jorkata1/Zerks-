// The canyon, the ground and the details of the map, from the approved mockup (mockup/src/map-details.js, decided by
// Joro on 14.11.2026: "I like it ... yes, make them permanent"; the ground made into real relief the same day).
//   the canyon   a floor that winds, three terraces of layered rock up to the plain above, a round head, a mouth
//                that opens to the plain; beside the mine the layers hold the iron ore and the quartz it digs
//   the ground   real relief: flat where the colony stands, low dunes beyond it, a rise to the foot of the walls,
//                a basin for the Ice Hollow, craters with rims; one picture as big as the floor, so nothing repeats
//   the ice      the Ice Hollow at the low end of the canyon (the clay pit of level 13 stands on its shore)
//   the lines    a covered service channel along the streets for the water and the power, a box at every building
//   the robot    the collector robot's tracks (it drives them, movers.ts)
//   the zone     stakes with flags and a sign along the edge of the closed zone
//   the dust     a blanket of soft layers over the closed zone
//   the stones   lumpy boulders with flat faces, dust on top, pebbles round the big ones; also on the ledges
// Made lighter for the phone than in the mockup: the land is sampled every 1.5 m and the floor every 2 m, the floor
// picture has 8 pixels to the metre, the stones are instanced and simpler, and the dust layers are softTextures
// (white, only the alpha varies), because Safari shows coloured dots in soft canvas pictures (docs/practices.md).
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface Block { d: number; s: number; cx: number; cz: number; built: boolean }
export interface Kerb { cx: number; cz: number; half: number }

const R2 = Math.SQRT1_2
/** The canyon's own directions: a across it (to the right of the screen), t along it (towards the camera). */
export const P = (a: number, t: number): [number, number] => [(a + t) * R2, (t - a) * R2]
const AT = (x: number, z: number): [number, number] => [(x - z) * R2, (x + z) * R2]
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const flat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...o })
const box = (w: number, h: number, d: number, mat: THREE.Material, r = 0.3, seg = 3) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat)
  m.castShadow = m.receiveShadow = true
  return m
}
type Noise = (x: number, y: number) => number
/** Smooth noise between 0 and 1. */
function noise2(seed: number): Noise {
  const r = rng(seed), perm = Array.from({ length: 256 }, (_, i) => i), val = new Float32Array(256).map(() => r())
  for (let i = 255; i > 0; i--) { const k = (r() * (i + 1)) | 0; const tmp = perm[i]!; perm[i] = perm[k]!; perm[k] = tmp }
  const h = (i: number, j: number) => val[perm[(perm[i & 255]! + j) & 255]!]!
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}
const fbm = (n: Noise, x: number, y: number, oct = 4) => { let s = 0, a = 0.5, f = 1, w = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); w += a; a *= 0.5; f *= 2 } return s / w }
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
const smooth = (v: number) => { v = clamp(v); return v * v * (3 - 2 * v) }

const HEAD = -100             // where the round head of the canyon begins
const TOP = 23                // how high the plain above the canyon lies
const RISE = 26, STEPS = 3    // the walls climb to it over 26 m, in three terraces
const ICE: [number, number, number, number] = [-22, 76, 17, 9.5]   // the Ice Hollow: across, along, half-width, half-length
const CRATERS: [number, number, number][] = [[-30, 98, 5.2], [28, 86, 3.4], [40, -66, 4.2], [-42, 40, 2.6], [10, 116, 2.4]]
/** Where the robot drives out to the plain (across, along). */
export const TRACK: [number, number][] = [[0, 58], [3, 66], [9, 76], [18, 90], [30, 104], [46, 122], [60, 136]]
/** A point on a polyline at f (0..1), with the direction it runs. */
export function along(pts: [number, number][], f: number): [number, number, number] {
  const n = pts.length - 1, k = Math.min(n - 1, Math.floor(f * n)), u = f * n - k, [a1, t1] = pts[k]!, [a2, t2] = pts[k + 1]!
  return [a1 + (a2 - a1) * u, t1 + (t2 - t1) * u, Math.atan2(t2 - t1, a2 - a1)]
}

export interface Shape {
  halfW(t: number, side: number): number
  outside(a: number, t: number): number
  floor(a: number, t: number, d?: number): number
  wall(a: number, t: number, d: number): number
  land(a: number, t: number): number
  n3: Noise
}

// ---------- the shape of the land: everything else stands on it ----------
function canyonShape(blocks: Block[]): Shape {
  const n = noise2(17), n2 = noise2(23), n3 = noise2(31), n4 = noise2(53), RH = 62, S = TOP / STEPS, built = blocks.filter((b) => b.built)
  // how wide the floor is on each side at a place along the canyon; past the colony the walls fall back (the mouth)
  const halfW = (t: number, side: number) => { let w = 53 + 4.5 * Math.sin(t * 0.031 + (side < 0 ? 0.6 : 2.4)) + 8 * (fbm(n, t * 0.02 + (side < 0 ? 10 : 50), 1.7, 3) - 0.5); if (t > 96) w += (t - 96) * 0.95; return w }
  // how far outside the floor a point lies (negative on the floor); spurs and gullies break the line
  const outside = (a: number, t: number) => {
    const side = a < 0 ? -1 : 1
    let d: number
    if (t >= HEAD) d = Math.abs(a) - halfW(t, side)
    else { const w = halfW(HEAD, side); d = (Math.hypot(Math.abs(a) / w, (HEAD - t) / RH) - 1) * Math.min(w, RH) }
    return d + (fbm(n2, a * 0.045, t * 0.045, 3) - 0.5) * 9
  }
  // metres to the nearest street of the colony, to the robot's track, and the place in the Ice Hollow (1 = its rim)
  const flatDist = (a: number, t: number) => { const [x, z] = P(a, t); let m = 1e9; for (const b of built) m = Math.min(m, Math.hypot(Math.max(Math.abs(x - b.cx) - 8.4, 0), Math.max(Math.abs(z - b.cz) - 8.4, 0))); return m }
  const trackDist = (a: number, t: number) => { let m = 1e9; for (let i = 0; i <= 40; i++) { const [ta, tt] = along(TRACK, i / 40); m = Math.min(m, Math.hypot(a - ta, t - tt)) } return m }
  const iceR = (a: number, t: number) => { const da = (a - ICE[0]) / ICE[2], dt = (t - ICE[1]) / ICE[3], q = Math.atan2(dt, da); return Math.hypot(da, dt) / (1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2)) }
  // flat where the colony stands and gentle where the robot drives; beyond, low dunes across the wind; a rise to the
  // foot of the walls; the Ice Hollow is a basin, the craters are bowls with rims
  const floor = (a: number, t: number, d = outside(a, t)) => {
    const fd = flatDist(a, t), e = iceR(a, t)
    const w = smooth((fd - 4) / 16) * (0.3 + 0.7 * smooth((trackDist(a, t) - 1.5) / 5)) * smooth((e - 1.15) / 0.7)
    const ridge = 1 - Math.abs(2 * n4(a * 0.03 + 7, t * 0.085) - 1)
    let h = w * (1.9 * ridge * ridge + 1.1 * (fbm(n4, a * 0.022, t * 0.03, 3) - 0.5))
    h += 2.4 * smooth((d + 14) / 14) * smooth((fd - 3) / 8)
    if (e < 1.22) h -= 1.15 * smooth((1.22 - e) / 0.3)
    for (const [a0, t0, rad] of CRATERS) { const r = Math.hypot(a - a0, t - t0) / rad; if (r < 1.6) h += -0.8 * smooth((0.85 - r) / 0.85) + 0.34 * Math.exp(-(((r - 1) / 0.24) ** 2)) }
    return h
  }
  // the walls: a steep face, then a ledge, three times; then the plain above, never quite flat
  const wall = (a: number, t: number, d: number) => {
    const k = STEPS * clamp(d / RISE), fl = Math.floor(k)
    if (d > RISE) return TOP + (fbm(n, a * 0.03 + 40, t * 0.03, 3) - 0.5) * 2.4 * smooth((d - RISE) / 22)
    return (fl + smooth((k - fl) / 0.3)) * S + (fbm(n3, a * 0.16, t * 0.16, 2) - 0.5) * 0.7 * smooth(d / 2.5)
  }
  const land = (a: number, t: number) => { const d = outside(a, t), f = floor(a, t, d); return d > 0 ? Math.max(wall(a, t, d), f) : f }
  return { halfW, outside, floor, wall, land, n3 }
}

// ---------- the colour of the floor: one picture as big as the floor, so nothing repeats ----------
// 8 pixels to the metre, 168 m across and 324 m along: big soft patches of lighter and darker dust, a stonier band
// under the walls and fine grain; on it the wind ripples, the dry cracks, the shade in the craters and under the
// stones, the frost on the bank of the Ice Hollow and the tracks of the robot. It lies on the relief like a cloth.
const PXM = 8, GA = 84, GT0 = -174, GT1 = 150, GW = 2 * GA, GL = GT1 - GT0
const gx = (a: number) => (a + GA) * PXM, gy = (t: number) => (t - GT0) * PXM
interface Field { h: Float32Array; d: Float32Array; row: number }
function floorField(shape: Shape): Field {
  const row = GW + 1, h = new Float32Array(row * (GL + 1)), d = new Float32Array(row * (GL + 1))
  for (let j = 0; j <= GL; j++) for (let i = 0; i <= GW; i++) { const q = j * row + i; d[q] = shape.outside(i - GA, GT0 + j); h[q] = shape.floor(i - GA, GT0 + j, d[q]) }
  return { h, d, row }
}
function paintFloor(shape: Shape, placed: [number, number, number][], field: Field): THREE.CanvasTexture {
  const w = GW * PXM, h = GL * PXM, c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d')!, img = x.createImageData(w, h), d = img.data, n1 = noise2(71), n2 = noise2(73), g = rng(79), r = rng(29), row = GW + 1
  const tone = new Float32Array(row * (GL + 1)), H = field.h
  for (let j = 0; j <= GL; j++) for (let i = 0; i <= GW; i++) {
    const a = i - GA, t = GT0 + j, edge = smooth(Math.min(GA - Math.abs(a), t - GT0, GT1 - t) / 14)   // at its edge the plain colour of the land beyond
    const big = smooth((fbm(n1, a * 0.016, t * 0.016, 3) - 0.3) / 0.4) - 0.5, mid = fbm(n2, a * 0.08, t * 0.08, 2) - 0.5, q = j * row + i
    // the slopes that face the sun (it stands to the left) are a little lighter, the ones turned away darker
    const i0 = Math.max(0, i - 1), i1 = Math.min(GW, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(GL, j + 1)
    const sunny = clamp(0.5 * (0.57 * (H[j * row + i1]! - H[j * row + i0]!) / (i1 - i0) - 0.14 * (H[j1 * row + i]! - H[j0 * row + i]!) / (j1 - j0)), -0.16, 0.16)
    tone[q] = edge * (big * 0.16 + mid * 0.07 - 0.06 * smooth((field.d[q]! + 10) / 10)) + sunny
  }
  for (let py = 0; py < h; py++) {
    const fy = py / PXM, j = Math.min(GL - 1, fy | 0), v = fy - j
    for (let px = 0; px < w; px++) {
      const fx = px / PXM, i = Math.min(GW - 1, fx | 0), u = fx - i, o = j * row + i, q = (py * w + px) * 4
      const tn = (tone[o]! * (1 - u) + tone[o + 1]! * u) * (1 - v) + (tone[o + row]! * (1 - u) + tone[o + row + 1]! * u) * v, gr = (g() - 0.5) * 0.034
      const kg = tn > 0 ? 1.45 : 1.15, kb = tn > 0 ? 1.9 : 1.45   // lighter dust is paler, darker dust a little redder
      d[q] = 238 * (1 + tn * 0.45 + gr); d[q + 1] = 159 * (1 + tn * kg + gr); d[q + 2] = 102 * (1 + tn * kb + gr); d[q + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  x.lineCap = 'round'
  const k = PXM / 10   // the mockup's strokes were drawn at 10 pixels to the metre
  // wind ripples: short waves in fields that fade at their edges
  for (const [a0, t0, fw, fl] of [[-14, 84, 30, 16], [22, 104, 34, 18], [-34, 112, 24, 14], [6, 124, 30, 12], [-46, -18, 10, 30], [47, 14, 9, 34], [46, 66, 10, 26], [-44, -84, 16, 22], [40, -96, 18, 20], [2, -118, 34, 14], [34, 84, 20, 14], [-52, 130, 26, 12], [56, 122, 22, 12]] as const) {
    const turn = (r() - 0.5) * 0.5
    for (let kk = 0; kk < fl / 1.5; kk++) {
      const v = kk * 1.5 - fl / 2, ph = r() * 6
      for (let u = -fw / 2; u < fw / 2; u += 1) {
        const fade = Math.max(0, 1 - (2 * u / fw) ** 2) * Math.max(0, 1 - (2 * v / fl) ** 2)
        if (fade < 0.05) continue
        const pt = (uu: number): [number, number] => { const vv = v + Math.sin(uu * 0.45 + ph) * 0.5, cs = Math.cos(turn), sn = Math.sin(turn); return [gx(a0 + uu * cs - vv * sn), gy(t0 + uu * sn + vv * cs)] }
        const [x1, y1] = pt(u), [x2, y2] = pt(u + 1.05)
        x.strokeStyle = `rgba(255,226,188,${0.4 * fade})`; x.lineWidth = 4 * k; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke()
        x.strokeStyle = `rgba(186,104,66,${0.26 * fade})`; x.lineWidth = 2.8 * k; x.beginPath(); x.moveTo(x1, y1 + 4.2 * k); x.lineTo(x2, y2 + 4.2 * k); x.stroke()
      }
    }
  }
  // dry cracks: a few patches of thin branching lines
  for (const [a0, t0, cnt] of [[30, 70, 7], [-40, 62, 6], [14, 92, 6], [-8, 108, 7], [44, -40, 5], [-46, 22, 5], [-30, -70, 6], [24, -74, 6]] as const) {
    for (let kk = 0; kk < cnt; kk++) {
      const walk = (a: number, t: number, dir: number, len: number, wd: number) => {
        for (let i = 0; i < len; i++) {
          const na = a + Math.cos(dir) * 0.9, nt = t + Math.sin(dir) * 0.9
          x.strokeStyle = `rgba(160,86,54,${0.3 * (1 - i / len) + 0.08})`; x.lineWidth = wd * k; x.beginPath(); x.moveTo(gx(a), gy(t)); x.lineTo(gx(na), gy(nt)); x.stroke()
          a = na; t = nt; dir += (r() - 0.5) * 0.9
          if (r() < 0.12 && len > 3) walk(a, t, dir + (r() < 0.5 ? 1 : -1), len >> 1, wd * 0.8)
        }
      }
      walk(a0 + (r() - 0.5) * 7, t0 + (r() - 0.5) * 7, r() * 6.3, 5 + ((r() * 6) | 0), 2.1)
    }
  }
  // the craters: the darker dust that gathers in them and the pale rim
  for (const [a0, t0, rad] of CRATERS) {
    const cx = gx(a0), cy = gy(t0), R = rad * PXM, gr = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3)
    gr.addColorStop(0, 'rgba(170,92,60,.38)'); gr.addColorStop(0.6, 'rgba(186,104,68,.22)'); gr.addColorStop(0.82, 'rgba(255,224,184,.42)'); gr.addColorStop(1, 'rgba(255,224,184,0)')
    x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R * 1.3, 0, 7); x.fill()
  }
  // stonier ground under the walls
  for (let i = 0; i < 3600; i++) { const side = r() < 0.5 ? -1 : 1, t = GT0 + 8 + r() * (GL - 16), a = side * (shape.halfW(t, side) - 10 * r() * r()); x.fillStyle = `rgba(166,90,58,${0.16 + r() * 0.3})`; x.beginPath(); x.ellipse(gx(a), gy(t), (2 + r() * 6) * k, (1.3 + r() * 3.6) * k, r() * 3, 0, 7); x.fill() }
  // a soft shade where each stone sits
  for (const [a, t, s] of placed) {
    const cx = gx(a + s * 0.25), cy = gy(t + s * 0.12), R = s * 1.7 * PXM, gr = x.createRadialGradient(cx, cy, R * 0.25, cx, cy, R)
    gr.addColorStop(0, 'rgba(150,80,52,.34)'); gr.addColorStop(1, 'rgba(150,80,52,0)')
    x.fillStyle = gr; x.beginPath(); x.ellipse(cx, cy, R, R * 0.72, 0, 0, 7); x.fill()
  }
  // the bank of the Ice Hollow: damp and darker outside, frost towards the ice
  const [ia, it, ra, rt] = ICE
  const blob = (s: number) => { x.beginPath(); for (let i = 0; i <= 64; i++) { const q = (i / 64) * Math.PI * 2, wv = 1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2); x.lineTo(gx(ia + Math.cos(q) * ra * wv * s), gy(it + Math.sin(q) * rt * wv * s)) } x.closePath() }
  x.fillStyle = 'rgba(156,84,56,.28)'; blob(1.36); x.fill(); x.fillStyle = 'rgba(156,84,56,.2)'; blob(1.27); x.fill()
  x.fillStyle = 'rgba(255,240,220,.5)'; blob(1.19); x.fill(); x.fillStyle = 'rgba(255,248,238,.55)'; blob(1.14); x.fill()
  // the tracks of the robot: two ruts, and fainter ones beside them from other days
  const rt2 = rng(5)
  for (const off of [-0.85, 0.85]) for (let pass = 0; pass < 3; pass++) {
    const sway = (rt2() - 0.5) * 0.5
    x.strokeStyle = pass ? 'rgba(176,96,62,.2)' : 'rgba(156,82,52,.5)'; x.lineWidth = (pass ? 2.6 : 3.8) * k; x.beginPath()
    for (let i = 0; i <= 260; i++) { const [a, t, q] = along(TRACK, i / 260), o = off + (pass ? sway + Math.sin(i * 0.14 + pass) * 0.25 : 0); x.lineTo(gx(a - Math.sin(q) * o), gy(t + Math.cos(q) * o)) }
    x.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
/** The floor as a mesh, every 2 m; a dug building's hole (stencil 1) keeps it from covering the pit. */
function floorMesh(field: Field, tex: THREE.Texture): THREE.Mesh {
  const STEP = 2, nx = GW / STEP + 1, nz = GL / STEP + 1, pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), keep = new Uint8Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i, fq = j * STEP * field.row + i * STEP, [x, z] = P(i * STEP - GA, GT0 + j * STEP)
    pos[q * 3] = x; pos[q * 3 + 1] = field.h[fq]!; pos[q * 3 + 2] = z; uv[q * 2] = (i * STEP) / GW; uv[q * 2 + 1] = 1 - (j * STEP) / GL
    keep[q] = field.d[fq]! < 3 ? 1 : 0
  }
  const idx: number[] = []
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const p = j * nx + i, q = p + nx; if (keep[p] || keep[p + 1] || keep[q] || keep[q + 1]) idx.push(p, q, p + 1, p + 1, q, q + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.KeepStencilOp }))
  m.receiveShadow = true
  m.name = 'floor'
  return m
}

// ---------- the walls of the canyon and the plain above ----------
// Each face is a layer of rock in its own colour with thin lines of strata; the colour is painted by height, so the
// layers stay level and sharp whatever the shape of the wall, and dust lies on the ledges.
function strataTexture(): THREE.CanvasTexture {
  const H = 1024, c = document.createElement('canvas'); c.width = 2; c.height = H
  const x = c.getContext('2d')!, S = TOP / STEPS, yOf = (h: number) => (1 - (h + 1) / (TOP + 2)) * H, r = rng(47)
  const band = (col: number, h0: number, h1: number, colour: string) => { x.fillStyle = colour; x.fillRect(col, yOf(h1), 1, yOf(h0) - yOf(h1) + 1) }
  for (const col of [0, 1]) {
    band(col, -1, TOP + 1, '#ee9f66')
    ;['#c8744e', '#b6603c', '#d0865c'].forEach((rock, k) => {
      band(col, k * S + 0.45, (k + 1) * S - 0.45, rock)
      for (let h = k * S + 0.9; h < (k + 1) * S - 0.7; h += 0.9 + r() * 1.3) band(col, h, h + 0.16 + r() * 0.2, r() < 0.5 ? 'rgba(90,40,20,.2)' : 'rgba(255,214,170,.28)')
    })
    if (col === 1) { band(col, 2.5, 4.5, '#8a4a36'); band(col, 3.3, 3.55, '#6f3a2a'); band(col, S + 2.2, S + 3.7, '#f1e6ff'); band(col, S + 2.8, S + 2.95, '#d9c8f5') }
    for (let k = 1; k <= STEPS; k++) band(col, k * S - 0.45, k * S + 0.45, k === STEPS ? '#eaa878' : '#e6a274')   // the ledges: dust lies on them
    band(col, TOP + 0.45, TOP + 1, '#eaa878')
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter
  return tex
}
function canyonLand(shape: Shape): THREE.Mesh {
  const STEP = 1.5, A0 = -170, A1 = 170, T0 = -310, T1 = 268, nx = Math.round((A1 - A0) / STEP) + 1, nz = Math.round((T1 - T0) / STEP) + 1, n3 = shape.n3
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), col = new Float32Array(nx * nz * 3), keep = new Uint8Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = A0 + i * STEP, t = T0 + j * STEP, d = shape.outside(a, t), q = j * nx + i
    // inside the picture of the floor the floor is its own surface; this one starts at the foot of the walls
    keep[q] = d > 1.5 || Math.abs(a) > GA - 1 || t < GT0 + 1 || t > GT1 - 1 ? 1 : 0
    const f = shape.floor(a, t, d), h = d > 0 ? Math.max(shape.wall(a, t, d), f) : f - 0.04
    const [x, z] = P(a, t); pos[q * 3] = x; pos[q * 3 + 1] = h; pos[q * 3 + 2] = z
    // the colour comes from the height (the layers waver a little); by the mine, from the column with the ore
    uv[q * 2] = a < 0 ? smooth((-a - 30) / 12) * smooth((t + 32) / 8) * smooth((40 - t) / 8) : 0
    uv[q * 2 + 1] = d <= 0 ? 0.002 : d > RISE - 1 ? 0.998 : clamp((h + (fbm(n3, a * 0.07 + 9, t * 0.07, 2) - 0.5) * 0.7 + 1) / (TOP + 2), 0.002, 0.998)
    // big soft patches of lighter and darker rock, so no ledge and no stretch of the plain is one flat colour
    const tint = 1 + (fbm(n3, a * 0.022 + 3, t * 0.022, 3) - 0.5) * 0.2 * smooth(d / 4); col[q * 3] = tint; col[q * 3 + 1] = tint; col[q * 3 + 2] = tint
  }
  const idx: number[] = []
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const p = j * nx + i, q = p + nx; if (keep[p] || keep[p + 1] || keep[q] || keep[q + 1]) idx.push(p, q, p + 1, p + 1, q, q + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: strataTexture(), roughness: 0.95, vertexColors: true }))
  m.castShadow = m.receiveShadow = true
  m.name = 'canyon'
  return m
}

// ---------- the Ice Hollow: the ice lies in its basin, below the ground round it ----------
const ICE_Y = -0.5
function iceSurface(): THREE.Mesh {
  const [a0, t0, ra, rt] = ICE, c = document.createElement('canvas'); c.width = 768; c.height = 448
  const x = c.getContext('2d')!, r = rng(3)
  const gr = x.createRadialGradient(300, 180, 20, 384, 224, 420); gr.addColorStop(0, '#f2fbff'); gr.addColorStop(0.55, '#cfeeff'); gr.addColorStop(1, '#a6d6f1')
  x.fillStyle = gr; x.fillRect(0, 0, 768, 448)
  x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineCap = 'round'
  for (let k = 0; k < 11; k++) { let px = 80 + r() * 608, py = 60 + r() * 328, dir = r() * 6.3; for (let i = 0; i < 10; i++) { const nxp = px + Math.cos(dir) * 26, nyp = py + Math.sin(dir) * 26; x.lineWidth = 5 - i * 0.4; x.beginPath(); x.moveTo(px, py); x.lineTo(nxp, nyp); x.stroke(); px = nxp; py = nyp; dir += (r() - 0.5) * 1.1 } }
  x.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(100 + r() * 568, 70 + r() * 308, 50 + r() * 60, 12 + r() * 10, -0.5, 0, 7); x.fill() }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  const N = 64, K = 1.1, pos: number[] = [], uv: number[] = [], idx: number[] = [], [cx, cz] = P(a0, t0)
  pos.push(cx, ICE_Y, cz); uv.push(0.5, 0.5)
  for (let i = 0; i < N; i++) { const q = (i / N) * Math.PI * 2, wv = (1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2)) * K, da = Math.cos(q) * wv, dt = Math.sin(q) * wv, [px, pz] = P(a0 + da * ra, t0 + dt * rt); pos.push(px, ICE_Y, pz); uv.push(0.5 + da / 2.5, 0.5 - dt / 2.5) }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22 }))
  m.receiveShadow = true
  m.name = 'ice'
  return m
}
function iceBlocks(group: THREE.Group, shape: Shape, r: () => number) {
  const ice = flat(0xdff5ff, { roughness: 0.25 }), [a0, t0, ra, rt] = ICE
  for (let k = 0; k < 10; k++) {
    const q = r() * 6.3, s = 0.5 + r() * 0.9, a = a0 + Math.cos(q) * ra * (0.78 + r() * 0.3), t = t0 + Math.sin(q) * rt * (0.78 + r() * 0.3), m = box(s * 1.4, s, s * 1.1, ice, 0.25), [x, z] = P(a, t)
    m.position.set(x, Math.max(shape.floor(a, t), ICE_Y) + s * 0.36, z); m.rotation.set((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3); group.add(m)
  }
}

// ---------- the stones: lumpy boulders with flat faces, dust on top, pebbles round the big ones ----------
// A ball is pushed out and in by noise, then cut by a few planes, which leaves the flat faces a broken rock has; the
// edges stay soft. The top of every stone is paler (dust lies on it), the underside darker. Big ones get a finer ball.
function rockShapes(r: () => number, detail: number): THREE.BufferGeometry[] {
  const shapes: THREE.BufferGeometry[] = [], n = noise2(61)
  for (let v = 0; v < 8; v++) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail)), p = g.attributes.position as THREE.BufferAttribute, q = new THREE.Vector3()
    const sx = 0.85 + r() * 0.45, sz = 0.85 + r() * 0.45, sy = 0.55 + r() * 0.32
    const cuts = Array.from({ length: 4 + ((r() * 4) | 0) }, () => { const c = new THREE.Vector3(r() - 0.5, r() * 0.9 - 0.15, r() - 0.5).normalize(); return [c, 0.6 + r() * 0.28] as const })
    for (let i = 0; i < p.count; i++) {
      q.fromBufferAttribute(p, i)
      q.multiplyScalar(1 + 0.42 * (fbm(n, q.x * 1.5 + v * 9 + q.z * 0.8, q.y * 1.5 - q.z * 0.6, 3) - 0.5))
      for (const [c, d] of cuts) { const over = q.dot(c) - d; if (over > 0) q.addScaledVector(c, -over * 0.93) }
      q.set(q.x * sx, Math.max(q.y, -0.38) * sy + 0.38 * sy, q.z * sz)
      p.setXYZ(i, q.x, q.y, q.z)
    }
    g.computeVertexNormals()
    const nor = g.attributes.normal as THREE.BufferAttribute, col = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const up = nor.getY(i), shade = 0.74 + 0.34 * smooth((up + 0.25) / 1.1), dusty = smooth((up - 0.5) / 0.4) * 0.55
      col[i * 3] = shade * (1 + dusty * 0.3); col[i * 3 + 1] = shade * (1 + dusty * 0.42); col[i * 3 + 2] = shade * (1 + dusty * 0.5)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    shapes.push(g)
  }
  return shapes
}
interface Stone { x: number; y: number; z: number; k: number; sx: number; sy: number; sz: number; ry: number; shape: number; tone: number }
function stones(shape: Shape, blocks: Block[]): { meshes: THREE.InstancedMesh[]; placed: [number, number, number][] } {
  const r = rng(73), list: Stone[] = [], placed: [number, number, number][] = []
  const put = (x: number, z: number, k: number) => {
    const [a, t] = AT(x, z)
    list.push({ x, z, k, y: shape.land(a, t) - 0.07 * k, sx: k * (0.92 + r() * 0.2), sy: k * (0.85 + r() * 0.35), sz: k * (0.92 + r() * 0.2), ry: r() * 6.3, shape: (r() * 8) | 0, tone: (r() * 4) | 0 })
    if (shape.outside(a, t) < 0) placed.push([a, t, k])
  }
  const around = (x: number, z: number, k: number) => { for (let i = 0, c = k > 1.05 ? 2 + ((r() * 3) | 0) : r() < 0.45 ? 1 : 0; i < c; i++) { const q = r() * 6.3, d = k * (1.05 + r() * 0.9); put(x + Math.cos(q) * d, z + Math.sin(q) * d, k * (0.13 + r() * 0.2)) } }
  // bare rock on the blocks outside the colony, not on the ice and not on the robot's tracks; about a quarter left out
  const onIceOrTrack = (x: number, z: number, s: number) => {
    const [a, t] = AT(x, z)
    if (((a - ICE[0]) / (ICE[2] * 1.4)) ** 2 + ((t - ICE[1]) / (ICE[3] * 1.5)) ** 2 < 1) return true
    for (let i = 0; i <= 60; i++) { const [ta, tt] = along(TRACK, i / 60); if (Math.hypot(a - ta, t - tt) < 2.6 + s) return true }
    return false
  }
  for (const b of blocks) {
    if (b.built) continue
    for (let i = 0; i < 6; i++) {
      const x = b.cx - 6 + r() * 12, z = b.cz - 6 + r() * 12, s = 0.6 + r() * 1.4
      if (onIceOrTrack(x, z, s) || r() < 0.26) continue
      const k = s * (0.8 + r() * 0.55)
      put(x, z, k); around(x, z, k)
    }
  }
  // fallen stones under the walls, a few on the ledges and on the plain above
  for (let i = 0; i < 150; i++) {
    const side = r() < 0.5 ? -1 : 1, t = HEAD + r() * 190, [x, z] = P(side * (shape.halfW(t, side) - 2 - r() * r() * 9), t), k = 0.35 + r() * r() * 1.9
    put(x, z, k); if (k > 1.2) around(x, z, k)
  }
  for (let i = 0; i < 110; i++) {
    const side = r() < 0.5 ? -1 : 1, t = HEAD + r() * 210, step = (r() * 3) | 0, out = step < 2 ? (RISE * (step + 0.5 + r() * 0.42)) / STEPS : RISE + 5 + r() * 45
    const [x, z] = P(side * (shape.halfW(t, side) + out), t), k = 0.3 + r() * r() * 1.5
    put(x, z, k); if (k > 1.1) around(x, z, k)
  }
  // one instanced mesh per shape and fineness; the tone of each stone is its instance colour
  const fine = rockShapes(rng(91), 2), coarse = rockShapes(rng(91), 1)
  const tones = [0xc8744e, 0xb5613d, 0xd68a5f, 0xa9583a].map((c) => new THREE.Color(c))
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true })
  const meshes: THREE.InstancedMesh[] = [], o = new THREE.Object3D()
  for (const [geos, small] of [[fine, false], [coarse, true]] as const) for (let s = 0; s < 8; s++) {
    const mine = list.filter((x) => x.shape === s && (x.k < 0.55) === small)
    if (!mine.length) continue
    const m = new THREE.InstancedMesh(geos[s]!, mat, mine.length)
    mine.forEach((st, i) => { o.position.set(st.x, st.y, st.z); o.rotation.set(0, st.ry, 0); o.scale.set(st.sx, st.sy, st.sz); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, tones[st.tone]!) })
    m.castShadow = m.receiveShadow = true
    m.computeBoundingSphere()
    meshes.push(m)
  }
  return { meshes, placed }
}

// ---------- the service channel: water and power under covers along the streets, a box at every building ----------
function lines(group: THREE.Group, runs: [number, number, number, number][], kerbs: Kerb[], glow: THREE.MeshStandardMaterial) {
  const base = flat(0x6b4a36), cover = flat(0xf7e6cc), cream = flat(0xfbf3e6), orange = flat(0xff8b3d)
  const run = (x1: number, z1: number, x2: number, z2: number, flush = false) => {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1), L = Math.hypot(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, turn = alongX ? 0 : Math.PI / 2
    const b = box(L + 0.5, 0.08, 0.5, base, 0.03); b.position.set(mx, flush ? 0.09 : 0.11, mz); b.rotation.y = turn; group.add(b)
    const n = Math.max(1, Math.round(L / 2))
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, p = box(L / n - 0.1, 0.08, 0.52, cover, 0.03); p.position.set(x1 + (x2 - x1) * f, flush ? 0.12 : 0.16, z1 + (z2 - z1) * f); p.rotation.y = turn; group.add(p) }
  }
  for (const q of runs) run(...q)
  // the nearest point of the channel to a place, and a box at the kerb of every building
  const near = (x: number, z: number): [number, number, number] => {
    let best: [number, number, number] = [x, z, 1e9]
    for (const [x1, z1, x2, z2] of runs) { const dx = x2 - x1, dz = z2 - z1, f = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz))), px = x1 + dx * f, pz = z1 + dz * f, d = Math.hypot(px - x, pz - z); if (d < best[2]) best = [px, pz, d] }
    return best
  }
  for (const b of kerbs) {
    let [px, pz] = near(b.cx, b.cz)
    // the side of the plot that looks at the channel, and the box on its kerb
    const dx = px - b.cx, dz = pz - b.cz, half = b.half, sideX = Math.abs(dx) > Math.abs(dz)
    const kx = sideX ? b.cx + Math.sign(dx) * half : Math.max(b.cx - half + 1.2, Math.min(b.cx + half - 1.2, px))
    const kz = sideX ? Math.max(b.cz - half + 1.2, Math.min(b.cz + half - 1.2, pz)) : b.cz + Math.sign(dz) * half
    ;[px, pz] = near(kx, kz)
    if (Math.hypot(px - kx, pz - kz) > 0.7) run(px, pz, kx, kz, true)          // across the street, flush with it
    const g = new THREE.Group(), body = box(0.9, 0.7, 0.6, cream, 0.12), band = box(0.94, 0.1, 0.64, orange, 0.04), lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glow)
    body.position.y = 0.35; band.position.y = 0.5; lamp.position.y = 0.76; g.add(body, band, lamp)
    g.position.set(kx, 0.3, kz); g.rotation.y = sideX ? Math.PI / 2 : 0; group.add(g)
  }
}

// ---------- the edge of the closed zone: stakes with flags along the last street, and a sign ----------
function zone(group: THREE.Group, blocks: Block[], sign: { text: string; x: number; z: number }, glow: THREE.MeshStandardMaterial) {
  const pole = flat(0x2f3346), flag = flat(0xff8b3d), cream = flat(0xfbf3e6)
  const stakeGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.9, 8), lampGeo = new THREE.SphereGeometry(0.09, 10, 8)
  const stake = (x: number, z: number) => {
    const g = new THREE.Group(), p = new THREE.Mesh(stakeGeo, pole), f = box(0.62, 0.36, 0.04, flag, 0.02), l = new THREE.Mesh(lampGeo, glow)
    p.position.y = 0.95; f.position.set(0.33, 1.62, 0); l.position.y = 1.95; p.castShadow = true; g.add(p, f, l); g.position.set(x, 0.05, z); g.rotation.y = Math.PI / 4; group.add(g)
  }
  const key = (i: number, j: number) => `${i},${j}`, state = new Map(blocks.map((b) => [key(Math.round(b.cx / 16), Math.round(b.cz / 16)), b]))
  for (const b of blocks) {
    if (!b.built) continue
    const i = Math.round(b.cx / 16), j = Math.round(b.cz / 16)
    // a side that looks up the canyon at a block that is still closed
    for (const [di, dj] of [[-1, 0], [0, -1]] as const) { const n = state.get(key(i + di, j + dj)); if (n && !n.built) for (const u of [-5, 0, 5]) stake(b.cx + (di ? di * 8.7 : u), b.cz + (dj ? dj * 8.7 : u)) }
  }
  // the sign at the head of the street that runs up into the zone
  const c = document.createElement('canvas'); c.width = 512; c.height = 192; const x = c.getContext('2d')!
  x.fillStyle = '#fbf3e6'; x.fillRect(0, 0, 512, 192); x.fillStyle = '#ff8b3d'; x.fillRect(0, 0, 512, 34)
  x.fillStyle = '#3b2618'; x.font = '900 78px Nunito, sans-serif'; x.textAlign = 'center'; x.fillText(sign.text, 256, 112); x.font = '800 36px Nunito, sans-serif'; x.fillStyle = '#9a7a62'; x.fillText('opens with research', 256, 162)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  const g = new THREE.Group(), board = box(3.2, 1.2, 0.14, cream, 0.06), face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }))
  board.position.y = 2.0; face.position.set(0, 2.0, 0.08); g.add(board, face)
  for (const u of [-1.2, 1.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 8), pole); p.position.set(u, 0.8, 0); p.castShadow = true; g.add(p) }
  g.position.set(sign.x, 0.05, sign.z); g.rotation.y = Math.PI / 4; group.add(g)
}

// ---------- the dust over the closed zone: a blanket of soft layers that lies on the ground ----------
// Each layer is a sheet at its own height with holes of its own; seen from the map's camera the upper ones slide over
// the lower ones, so the dust has depth and stones stand up out of it. Each sheet is a softTexture: white, only the
// alpha varies; its colour is the material's, so Safari has no colour to spoil.
/** The colour of the dust at night is its day colour times this. */
export const DUST_NIGHT = new THREE.Color(0x56596e)
function dustBlanket(shape: Shape, front0: number): { group: THREE.Group; mats: THREE.MeshBasicMaterial[] } {
  const FLOOR = 52, W = 2 * FLOOR + 40, T0 = -176, T1 = front0 + 17, L = T1 - T0, PX = 2, w = W * PX, h = Math.round(L * PX)
  // three thin layers of haze near the ground, then four of billows with real gaps, each with its shade under it,
  // pushed away from the sun, so the billows look lit from the left like everything else
  //   height, strength, gaps (0 = none), colour, seed, pushed by (across, along)
  const HAZE = [246, 208, 172], LIT = [[252, 226, 198], [254, 234, 210], [255, 240, 222], [255, 246, 232]], SHADE = [218, 164, 126]
  const layers: [number, number, number, number[], number, number, number][] = [[0.4, 0.3, 0, HAZE, 0, 0, 0], [1.1, 0.28, 0, HAZE, 1, 0, 0], [2.0, 0.26, 0, [249, 216, 184], 2, 0, 0]]
  ;([[3.2, 0.52, 0.47], [4.9, 0.5, 0.5], [6.8, 0.46, 0.53], [8.8, 0.38, 0.57]] as const).forEach(([y, st, gaps], k) => {
    layers.push([y - 0.3, st * 0.78, gaps, SHADE, 3 + k, 2.8, 1.5], [y, st * 1.12, gaps, LIT[k]!, 3 + k, 0, 0])
  })
  const group = new THREE.Group(), mats: THREE.MeshBasicMaterial[] = []
  layers.forEach(([y, strength, gaps, col, seed, da, dt], order) => {
    const n = noise2(100 + seed * 13), data = new Uint8Array(w * h * 4)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const a = i / PX - W / 2 - da, t = T0 + j / PX - dt, side = a < 0 ? -1 : 1
      const o = (j * w + i) * 4
      data[o] = data[o + 1] = data[o + 2] = 255
      // where the dust begins: a little beyond the last street, the higher layers further back, the edge wavy
      const front = front0 - seed * 2.2 + (fbm(n, a * 0.05 + 3, 1.3, 2) - 0.5) * 16
      const dens = smooth((front - t) / 15) * smooth((shape.halfW(Math.max(t, HEAD), side) + 5 - Math.abs(a)) / 10) * smooth((t - T0) / 12)
      if (dens <= 0.002) continue
      const f = fbm(n, a * 0.04 + seed * 7.3, t * 0.056 - seed * 3.1, 4)
      const wisp = clamp((f - 0.42 + dens * 0.95) * 3.6), body = gaps ? clamp((f - gaps) * 5.2 + 0.32) : 0.6 + 0.4 * clamp((f - 0.4) * 3 + 0.5)
      data[o + 3] = Math.round(255 * clamp(strength * Math.pow(dens, 0.7) * wisp * body))
    }
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.flipY = false; tex.needsUpdate = true
    const day = new THREE.Color(`rgb(${col[0]},${col[1]},${col[2]})`)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: day.clone() })
    mat.userData.day = day
    mats.push(mat)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat)
    m.rotation.x = -Math.PI / 2; m.renderOrder = 4 + order
    // the texture's first row is the far end of the zone (t = T0): on the plane that is its top edge, so flip v
    const uv = m.geometry.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i))
    const g = new THREE.Group(), [px, pz] = P(0, (T0 + T1) / 2); g.add(m); g.rotation.y = Math.PI / 4; g.position.set(px, y, pz); group.add(g)
  })
  return { group, mats }
}

export interface Canyon {
  shape: Shape
  /** Everything the canyon adds; the static props among them are merged with the map (merge.ts). */
  props: THREE.Group
  /** Big meshes that stay as they are (merging them would only make them heavier). */
  keep: THREE.Object3D[]
  dustMats: THREE.MeshBasicMaterial[]
  /** The glowing lamps on the channel and the stakes; brighter at night. */
  glow: THREE.MeshStandardMaterial
}

/**
 * Builds the canyon round the colony. `blocks` are all the blocks of the grid (built = inside the open zones),
 * `kerbs` the plots that get a box on the channel, `reach` how many rows back the open zones go.
 */
export function buildCanyon(scene: THREE.Scene, o: { blocks: Block[]; kerbs: Kerb[]; reach: number; runs: [number, number, number, number][]; zone: string }): Canyon {
  const shape = canyonShape(o.blocks)
  const glow = new THREE.MeshStandardMaterial({ color: 0x33d1a8, emissive: 0x33d1a8, emissiveIntensity: 1.2, roughness: 0.4 })
  const { meshes, placed } = stones(shape, o.blocks)
  const field = floorField(shape)
  const floor = floorMesh(field, paintFloor(shape, placed, field))
  const land = canyonLand(shape)
  // plain ground far beyond the land that is shaped
  const far = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ color: 0xee9f66, roughness: 1 }))
  far.rotation.x = -Math.PI / 2; far.position.y = -2; far.name = 'far'
  const ice = iceSurface()
  const props = new THREE.Group()
  iceBlocks(props, shape, rng(7))
  lines(props, o.runs, o.kerbs, glow)
  // the sign stands at the head of the street that runs up into the closed zone, a row behind the last open one
  const back = -(o.reach * 11.314) - 13.2, [sx, sz] = P(13.1, back)
  zone(props, o.blocks, { text: o.zone, x: sx, z: sz }, glow)
  const dust = dustBlanket(shape, -47 - (o.reach - 3) * 11.314)
  scene.add(floor, land, far, ice, props, dust.group, ...meshes)
  return { shape, props, keep: [floor, land, far, ice, dust.group, ...meshes], dustMats: dust.mats, glow }
}
