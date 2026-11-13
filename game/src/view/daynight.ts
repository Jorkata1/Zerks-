// Day and night (levels.md: from level 7; a day is about 20 minutes of real time, here 12 of day and 8 of night).
// The colours are the approved map's day (#lvl10) and night (#lvl10-night). The sun crosses the sky by day;
// at night a pale moon stays put, and the lamps, windows and light pools carry the light.
import * as THREE from 'three'
import { GLOWS } from './props'
import { MODEL_GLOWS } from './models'
import type { World } from './world'

const DAY = { bg: 0xee9f66, sky: 0xfff1e0, bounce: 0xe7925f, sun: 0xfff0dc, sunK: 2.8, hemi: 1.05, env: 0.35 }
const NIGHT = { bg: 0x1d2442, sky: 0x7d8cc4, bounce: 0x2a2f4a, sun: 0xa8b8ff, sunK: 0.62, hemi: 0.4, env: 0.14 }
/** Share of the cycle that is day; dusk and dawn each take this share. */
export const DAY_SHARE = 0.6
const TWILIGHT = 0.05

/** How much it is night at time t of the cycle (0..1): 0 by day, 1 at night, smooth at dusk and dawn. */
export function nightness(t: number): number {
  t = ((t % 1) + 1) % 1
  const s = (x: number) => x * x * (3 - 2 * x)
  if (t < DAY_SHARE - TWILIGHT) return 0
  if (t < DAY_SHARE) return s((t - (DAY_SHARE - TWILIGHT)) / TWILIGHT)
  if (t < 1 - TWILIGHT) return 1
  return 1 - s((t - (1 - TWILIGHT)) / TWILIGHT)
}

export interface Lights { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight }

const c1 = new THREE.Color(), c2 = new THREE.Color()
const mix = (a: number, b: number, k: number) => c1.setHex(a).lerp(c2.setHex(b), k)

/** Sets the scene for time t; returns true when the sun moved enough to redraw the shadows. */
export function applyTime(t: number, scene: THREE.Scene, L: Lights, world: World, last: { dir: THREE.Vector3 }): boolean {
  const n = nightness(t)
  ;(scene.background as THREE.Color).copy(mix(DAY.bg, NIGHT.bg, n))
  L.hemi.color.copy(mix(DAY.sky, NIGHT.sky, n))
  L.hemi.groundColor.copy(mix(DAY.bounce, NIGHT.bounce, n))
  L.hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, n)
  L.sun.color.copy(mix(DAY.sun, NIGHT.sun, n))
  L.sun.intensity = THREE.MathUtils.lerp(DAY.sunK, NIGHT.sunK, n)
  scene.environmentIntensity = THREE.MathUtils.lerp(DAY.env, NIGHT.env, n)

  // The sun from morning (east, low) through noon to evening; the approved map's light is mid-morning.
  const day = Math.min(1, Math.max(0, ((t % 1) + 1) % 1 / DAY_SHARE))
  const az = THREE.MathUtils.lerp(-1.9, 1.3, day), el = THREE.MathUtils.lerp(0.45, 1.15, Math.sin(Math.PI * day))
  const sunDir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
  const moonDir = new THREE.Vector3(-30, 80, 50).normalize()
  const dir = sunDir.lerp(moonDir, n).normalize()
  L.sun.position.copy(dir).multiplyScalar(100)

  for (const [m, d, nt] of GLOWS) m.emissiveIntensity = THREE.MathUtils.lerp(d, nt, n)
  for (const [m, d] of MODEL_GLOWS) m.emissiveIntensity = d * (1 + 0.9 * n)
  for (const p of world.pools) {
    const op = (p.userData.opacity as number) * n
    ;(p.material as THREE.MeshBasicMaterial).opacity = op
    p.visible = op > 0.01
  }
  for (const s of world.dust) (s.material as THREE.SpriteMaterial).color.setScalar(THREE.MathUtils.lerp(1, 0.32, n))

  const moved = dir.angleTo(last.dir) > THREE.MathUtils.degToRad(1.5) // the shadows are redrawn only when the sun has moved a little
  if (moved) last.dir.copy(dir)
  return moved
}
