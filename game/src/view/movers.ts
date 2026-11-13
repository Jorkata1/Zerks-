// What moves on the map in stage 1: the build drone flies from the Ark to a building, surveys it and comes back;
// the collector robot drives round the Ark on the streets; ECHO hovers; the colonists sway a little.
// Everything is a function of time, so a screenshot at a given time always looks the same.
import * as THREE from 'three'
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

  // ---- the robot: round the Ark on the streets (the Ark's 2x2 block has streets at x, z = -24 and 8)
  const rover = noCast(fit('rover', 2.8))
  const roverShadow = blob(3.4)
  scene.add(rover, roverShadow)
  const loop = [new THREE.Vector3(8, 0.15, 8), new THREE.Vector3(8, 0.15, -24), new THREE.Vector3(-24, 0.15, -24), new THREE.Vector3(-24, 0.15, 8)]
  const side = 32, perimeter = side * 4, SPEED = 3.2 // m/s

  const p = new THREE.Vector3(), q = new THREE.Vector3()
  return {
    objects: [drone, droneShadow, rover, roverShadow],
    update(t: number) {
      // drone
      const round = Math.floor(t / ROUND), u = (t % ROUND) / ROUND
      const b = stops[(round * 5 + 3) % stops.length]!
      const over = new THREE.Vector3(b.cx, 11, b.cz)
      const ease = (x: number) => x * x * (3 - 2 * x)
      let heading = 0
      if (u < 0.08) p.copy(home)
      else if (u < 0.35) { const k = ease((u - 0.08) / 0.27); p.lerpVectors(home, over, k); p.y += Math.sin(Math.PI * k) * 4 }
      else if (u < 0.7) { const a = ((u - 0.35) / 0.35) * Math.PI * 2; p.set(b.cx + Math.cos(a) * 7, 10 + Math.sin(a * 2) * 0.4, b.cz + Math.sin(a) * 7) }
      else if (u < 0.95) { const k = ease((u - 0.7) / 0.25); q.set(b.cx + 7, 10, b.cz); p.lerpVectors(q, home, k); p.y += Math.sin(Math.PI * k) * 4 }
      else p.copy(home)
      const prev = drone.position.clone()
      drone.position.copy(p)
      drone.position.y += Math.sin(t * 3) * 0.08
      const v = p.clone().sub(prev)
      if (v.lengthSq() > 1e-4) heading = Math.atan2(v.x, v.z)
      if (v.lengthSq() > 1e-4) drone.rotation.y = heading
      drone.rotation.z = THREE.MathUtils.clamp(-v.x * 0.6, -0.15, 0.15)
      droneShadow.position.set(p.x, 0.5, p.z)
      ;(droneShadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * THREE.MathUtils.clamp(1 - (p.y - 8) / 20, 0.3, 1)

      // robot: along the loop at constant speed, turning at the corners
      const d = (t * SPEED) % perimeter, leg = Math.floor(d / side), f = (d % side) / side
      const a = loop[leg]!, c = loop[(leg + 1) % 4]!
      rover.position.lerpVectors(a, c, f)
      rover.position.y = 0.15 + Math.abs(Math.sin(t * 6)) * 0.03
      rover.rotation.y = Math.atan2(c.x - a.x, c.z - a.z)
      roverShadow.position.set(rover.position.x, 0.2, rover.position.z)

      // ECHO and the colonists
      world.echo.position.y = 6.2 + Math.sin(t * 1.6) * 0.18
      world.echo.rotation.y = -0.6 + Math.sin(t * 0.5) * 0.25
      world.people.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.3 + i) * 0.03 })
    },
  }
}
