// Zerks-X6, stage 1: the colony at Ark level 10 on the phone. The map, the camera (pan and pinch), tapping a building,
// day and night, the drone and the robot moving, and a frame counter, to see that it runs smoothly on an iPhone.
// URL options for testing: ?t=0..1 fixes the time of day, ?at=seconds the moment of the drone and robot,
// ?still stops time, ?shot renders only on request (screenshots), ?day=seconds sets the length of a day (default 120), ?dpr=1..3, ?view=metres.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { IsoCamera } from './view/camera'
import { applyTime, nightness } from './view/daynight'
import { attachInput } from './view/input'
import { loadModels } from './view/models'
import { addMovers } from './view/movers'
import { mergeGroup, mergeProps } from './view/merge'
import { MODEL_NAMES, buildWorld, type Placed } from './view/world'
import { createHud } from './ui/hud'

const q = new URLSearchParams(location.search)
const num = (k: string, d: number) => (q.has(k) && !Number.isNaN(Number(q.get(k))) ? Number(q.get(k)) : d)
const DAY_SECONDS = num('day', 120)
const STILL = q.has('still')
const DPR = num('dpr', Math.min(window.devicePixelRatio || 1, 2))

const view = document.getElementById('view')!
const hud = createHud(document.getElementById('hud')!, { arkLevel: 10, atmo: 28, atmoNext: 30 })

// ---------- renderer, scene, light ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: q.has('shot') })
renderer.setPixelRatio(DPR)
renderer.toneMapping = THREE.NeutralToneMapping
renderer.toneMappingExposure = 0.98
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = false
view.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xee9f66)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const hemi = new THREE.HemisphereLight(0xfff1e0, 0xe7925f, 1.05)
const sun = new THREE.DirectionalLight(0xfff0dc, 2.8)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.04
sun.shadow.radius = 4
Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 1, far: 260 })
sun.shadow.camera.updateProjectionMatrix()
scene.add(hemi, sun, sun.target)

renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); hud.lost(true) })

// ---------- the world ----------
await loadModels(MODEL_NAMES)
const world = buildWorld(scene)
const movers = addMovers(scene, world)
// fewer draw calls: the buildings' parts by material inside each building, the props of the map all together
for (const b of world.buildings) mergeGroup(b.group)
mergeProps(scene, new Set<THREE.Object3D>([...world.buildings.map((b) => b.group), world.ground, world.echo, ...world.people, ...world.pools, ...movers.objects, sun.target]))
const cam = new IsoCamera(num('view', 68), 0, 0, { minView: 22, maxView: 120, ...world.bounds })

// ---------- picking a building ----------
const ring = new THREE.Mesh(new THREE.RingGeometry(6.6, 7.4, 48), new THREE.MeshBasicMaterial({ color: 0x5fe3d0, transparent: true, opacity: 0.9, depthWrite: false }))
ring.rotation.x = -Math.PI / 2
ring.visible = false
scene.add(ring)
let selected: Placed | null = null
let selectedAt = 0
function select(b: Placed | null) {
  selected = b
  selectedAt = clock
  ring.visible = !!b
  if (b) { ring.position.set(b.cx, 0.62, b.cz); const s = b.half / 6; ring.scale.setScalar(s) }
  hud.select(b?.name ?? null, b?.level)
}
function pick(sx: number, sy: number): Placed | null {
  const hits = cam.rayAt(sx, sy).intersectObjects(world.buildings.map((b) => b.group), true)
  for (const h of hits) {
    let o: THREE.Object3D | null = h.object
    while (o && !world.buildings.some((b) => b.group === o)) o = o.parent
    if (o) return world.buildings.find((b) => b.group === o) ?? null
  }
  // a tap on the plot itself also counts
  const g = cam.groundAt(sx, sy)
  if (g) return world.buildings.find((b) => Math.abs(g.x - b.cx) < b.half && Math.abs(g.z - b.cz) < b.half) ?? null
  return null
}

// ---------- input and size ----------
let lastActive = -Infinity
const input = attachInput(renderer.domElement, cam, {
  tap: (sx, sy) => { select(pick(sx, sy)); lastActive = performance.now() },
  active: () => { lastActive = performance.now() },
})
function resize() {
  const w = view.clientWidth, h = view.clientHeight
  renderer.setSize(w, h, false)
  cam.resize(w, h)
}
window.addEventListener('resize', resize)
resize()

// ---------- the loop: full rate while touched, 30 fps when idle, nothing when hidden ----------
let clock = num('at', 0)
let dayT = num('t', 0.25)
const sunMemo = { dir: new THREE.Vector3() }
let shadowsDirty = true
let last = performance.now(), acc = 0, frames = 0, fpsT = last, fps = 0
let running = true

function frame(now: number) {
  if (!running) return
  requestAnimationFrame(frame)
  const dt = Math.min(100, now - last)
  last = now
  const busy = now - lastActive < 2500
  acc += dt
  if (!busy && acc < 33) return
  const step = acc
  acc = 0
  if (!STILL) {
    clock += step / 1000
    if (!q.has('t')) dayT += step / 1000 / DAY_SECONDS
  }
  input.step(step)
  render()
  frames++
  if (now - fpsT > 500) {
    fps = Math.round((frames * 1000) / (now - fpsT))
    frames = 0
    fpsT = now
    const i = renderer.info.render
    hud.debug(`${fps} fps · ${i.calls} draws · ${Math.round(i.triangles / 1000)}k tris · ${DPR}x`)
  }
}

function render() {
  if (applyTime(dayT, scene, { hemi, sun }, world, sunMemo)) shadowsDirty = true
  hud.setSky(nightness(dayT) > 0.5)
  movers.update(clock)
  if (selected) {
    const k = Math.min(1, (clock - selectedAt) / 0.35)
    selected.group.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.06)
    ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(clock * 4) * 0.25
  }
  if (shadowsDirty) { renderer.shadowMap.needsUpdate = true; shadowsDirty = false }
  renderer.render(scene, cam.camera)
}

// ?shot: no loop at all; the screenshot script renders each state on demand (software WebGL is slow)
const SHOT = q.has('shot')
document.addEventListener('visibilitychange', () => {
  running = !document.hidden && !SHOT
  if (running) { last = performance.now(); requestAnimationFrame(frame) }
})
if (!SHOT) requestAnimationFrame(frame)
render()

// ---------- hooks for the screenshot scripts ----------
declare global { interface Window { __zerks: unknown } }
window.__zerks = {
  ready: true,
  set(o: { t?: number; at?: number; select?: string; view?: number; x?: number; z?: number }) {
    if (o.t !== undefined) dayT = o.t
    if (o.at !== undefined) clock = o.at
    if (o.view !== undefined) cam.view = o.view
    if (o.x !== undefined) cam.target.x = o.x
    if (o.z !== undefined) cam.target.z = o.z
    cam.apply()
    if (o.select !== undefined) select(world.buildings.find((b) => b.id === o.select) ?? null)
    shadowsDirty = true
    render()
  },
  info: () => ({ ...renderer.info.render, fps }),
  /** Where the movers are on the screen, in CSS pixels (for the checks). */
  where() {
    const r = renderer.domElement.getBoundingClientRect()
    return movers.objects.filter((_, i) => i % 2 === 0).map((o) => {
      const v = o.getWorldPosition(new THREE.Vector3()).project(cam.camera)
      return { x: Math.round((v.x + 1) / 2 * r.width), y: Math.round((1 - v.y) / 2 * r.height), h: Math.round(o.position.y * 10) / 10 }
    })
  },
  /** Triangles by top-level object, to see what is heavy. */
  census() {
    const tris = (o: THREE.Object3D) => { let n = 0; o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { const g = m.geometry; n += (g.index ? g.index.count : g.getAttribute('position').count) / 3 } }); return Math.round(n) }
    return scene.children.map((o) => [o.name || (o as THREE.Mesh).type, tris(o)] as const).filter(([, n]) => n > 2000).sort((a, b) => b[1] - a[1])
  },
}
window.dispatchEvent(new Event('scene-ready'))
