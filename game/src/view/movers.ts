// What moves on the map: the build drone flies from the Ark to a building, surveys it and comes back; the collector
// robot drives out along its tracks to the plain and comes home (mockup/src/map-details.js); ECHO hovers by the
// Commander; a few colonists walk the streets and the others sway a little.
// Everything is a function of time, so a screenshot at a given time always looks the same.
import * as THREE from 'three'
import { P, TRACK, along } from './canyon'
import { fit, place } from './models'
import { glowTexture } from './soft'
import { type World } from './world'

/** A soft dark spot under something that flies or drives: its shadow without redrawing the shadow map. */
function blob(size: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: glowTexture(64), color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }))
  m.rotation.x = -Math.PI / 2
  return m
}
const noCast = (g: THREE.Object3D) => { g.traverse((o) => { (o as THREE.Mesh).castShadow = false }); return g }

export interface Movers { update(t: number): void; objects: THREE.Object3D[] }

export function addMovers(scene: THREE.Scene, world: World): Movers {
  // ---- the drone: rests on the Ark's balcony, flies to a building, circles it, comes back (one round = 24 s)
  // as big as the drone the Ark's model parks on its balcony: 1.1 Ark units x 4.15 m (build.py)
  const drone = noCast(place('drone', () => 1.1 * 4.15))
  const droneShadow = blob(2.6)
  scene.add(drone, droneShadow)
  const home = world.dronePad.clone()
  const stops = world.buildings.filter((b) => b.id !== 'ark')
  const ROUND = 24

  // ---- the robot: out along its tracks to the plain and home again (one trip = 70 s), on the relief of the floor
  const rover = noCast(fit('rover', 3.4))
  const roverShadow = blob(4)
  scene.add(rover, roverShadow)
  const TRIP = 70
  const roverAt = (f: number) => { const [a, t, q] = along(TRACK, f), [x, z] = P(a, t), [hx, hz] = P(Math.cos(q), Math.sin(q)); return { x, z, y: world.shape.floor(a, t), heading: Math.atan2(hx, hz) } }

  const p = new THREE.Vector3(), q = new THREE.Vector3(), prev = new THREE.Vector3(), v = new THREE.Vector3()
  return {
    objects: [drone, droneShadow, rover, roverShadow],
    update(t: number) {
      // drone
      const round = Math.floor(t / ROUND), u = (t % ROUND) / ROUND
      const b = stops[(round * 5 + 3) % stops.length]!
      const over = q.set(b.cx, 11, b.cz).clone()
      const ease = (x: number) => x * x * (3 - 2 * x)
      if (u < 0.08) p.copy(home)
      else if (u < 0.35) { const k = ease((u - 0.08) / 0.27); p.lerpVectors(home, over, k); p.y += Math.sin(Math.PI * k) * 4 }
      else if (u < 0.7) { const a = ((u - 0.35) / 0.35) * Math.PI * 2; p.set(b.cx + Math.cos(a) * 7, 10 + Math.sin(a * 2) * 0.4, b.cz + Math.sin(a) * 7) }
      else if (u < 0.95) { const k = ease((u - 0.7) / 0.25); q.set(b.cx + 7, 10, b.cz); p.lerpVectors(q, home, k); p.y += Math.sin(Math.PI * k) * 4 }
      else p.copy(home)
      prev.copy(drone.position)
      drone.position.copy(p)
      drone.position.y += Math.sin(t * 3) * 0.08
      v.copy(p).sub(prev)
      if (v.lengthSq() > 1e-4) drone.rotation.y = Math.atan2(v.x, v.z)
      drone.rotation.z = THREE.MathUtils.clamp(-v.x * 0.6, -0.15, 0.15)
      droneShadow.position.set(p.x, 0.5, p.z)
      ;(droneShadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * THREE.MathUtils.clamp(1 - (p.y - 8) / 20, 0.3, 1)

      // robot: out for the first half of the trip, home for the second, with a short stop at each end
      const k = (t % TRIP) / TRIP, out = k < 0.5, f = THREE.MathUtils.clamp((out ? k : 1 - k) * 2.2 - 0.05, 0, 1)
      const r = roverAt(ease(f))
      rover.position.set(r.x, r.y + 0.02 + Math.abs(Math.sin(t * 6)) * 0.03, r.z)
      rover.rotation.y = r.heading + (out ? 0 : Math.PI)
      roverShadow.position.set(r.x, r.y + 0.06, r.z)

      // ECHO and the colonists
      world.echo.position.y = world.echoY + Math.sin(t * 1.6) * 0.18
      world.echo.rotation.y = Math.PI / 4 + Math.sin(t * 0.5) * 0.25
      world.people.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.3 + i) * 0.03 })
      // the walkers: 1.1 m/s up the street and back, arms and legs swinging
      for (const w of world.walkers) {
        const len = w.from.distanceTo(w.to), lap = (2 * len) / 1.1, s = (((t / lap + w.phase) % 1) + 1) % 1, there = s < 0.5
        const g = there ? s * 2 : 2 - s * 2
        w.body.position.lerpVectors(w.from, w.to, g)
        const dx = (w.to.x - w.from.x) * (there ? 1 : -1), dz = (w.to.z - w.from.z) * (there ? 1 : -1)
        w.body.rotation.y = Math.atan2(dx, dz)
        const swing = Math.sin(t * 6.2 + w.phase * 10) * 0.45
        if (w.limbs.legL) w.limbs.legL.rotation.x = swing
        if (w.limbs.legR) w.limbs.legR.rotation.x = -swing
        if (w.limbs.armL) w.limbs.armL.rotation.x = -swing * 0.7
        if (w.limbs.armR) w.limbs.armR.rotation.x = swing * 0.7
        w.body.position.y = 0.15 + Math.abs(Math.cos(t * 6.2 + w.phase * 10)) * 0.05
      }
    },
  }
}
