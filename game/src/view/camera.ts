// The camera: angled top-down like a city builder (decided 04.11.2026), looking along the diagonal of the street
// grid at 36 degrees above the ground, orthographic (the approved map). The player only moves it: one finger pans,
// two fingers zoom. It never turns, so the buildings always show the faces they were made for.
import * as THREE from 'three'

export const ELEVATION = THREE.MathUtils.degToRad(36)
/** From the point looked at towards the camera. */
export const DIR = new THREE.Vector3(Math.cos(ELEVATION) * Math.SQRT1_2, Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.SQRT1_2)
/** On the ground: screen right, and screen up (away from the camera). */
export const RIGHT = new THREE.Vector3(1, 0, -1).normalize()
export const AWAY = new THREE.Vector3(-1, 0, -1).normalize()

export interface Limits { minView: number; maxView: number; minX: number; maxX: number; minZ: number; maxZ: number }

export class IsoCamera {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 900)
  /** Metres across the screen width. */
  view: number
  /** The ground point in the middle of the screen. */
  readonly target = new THREE.Vector3()
  private w = 390
  private h = 844
  private readonly ray = new THREE.Raycaster()
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  constructor(view: number, x: number, z: number, readonly limits: Limits) {
    this.view = view
    this.target.set(x, 0, z)
    this.apply()
  }

  resize(w: number, h: number) { this.w = w; this.h = h; this.apply() }

  apply() {
    const L = this.limits
    this.view = THREE.MathUtils.clamp(this.view, L.minView, L.maxView)
    this.target.x = THREE.MathUtils.clamp(this.target.x, L.minX, L.maxX)
    this.target.z = THREE.MathUtils.clamp(this.target.z, L.minZ, L.maxZ)
    const half = this.view / 2
    Object.assign(this.camera, { left: -half, right: half, top: (half * this.h) / this.w, bottom: (-half * this.h) / this.w })
    this.camera.updateProjectionMatrix()
    this.camera.position.copy(this.target).addScaledVector(DIR, 400)
    this.camera.lookAt(this.target)
    this.camera.updateMatrixWorld()
  }

  /** Metres of ground per screen pixel, across and along the screen. */
  metresPerPixel() { const m = this.view / this.w; return { across: m, along: m / Math.sin(ELEVATION) } }

  /** Moves the map with the finger: the ground under the finger stays under it. */
  panBy(dx: number, dy: number) {
    const m = this.metresPerPixel()
    this.target.addScaledVector(RIGHT, -dx * m.across).addScaledVector(AWAY, dy * m.along)
    this.apply()
  }

  /** The ground point under a screen point (CSS pixels), or null. */
  groundAt(sx: number, sy: number): THREE.Vector3 | null {
    this.ray.setFromCamera(new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1), this.camera)
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3())
  }

  /** Zooms by `factor` (< 1 = closer) keeping the ground under (sx, sy) in place. */
  zoomAt(factor: number, sx: number, sy: number) {
    const before = this.groundAt(sx, sy)
    this.view *= factor
    this.apply()
    const after = this.groundAt(sx, sy)
    if (before && after) { this.target.add(before.sub(after)); this.apply() }
  }

  /** A ray from a screen point, for picking. */
  rayAt(sx: number, sy: number): THREE.Raycaster {
    this.ray.setFromCamera(new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1), this.camera)
    return this.ray
  }
}
