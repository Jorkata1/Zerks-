// The people and ECHO (Joro, 14.11.2026: "A and ECHO 2"; art/3d/characters). One model for the Commander and every
// colonist: the materials accent, skin and hair take the person's colours, one hair style is shown, the beard if he
// has one, and the stripe and the aerial only on the Commander (looks.json, a proposal). Arms and legs are their own
// parts with the pivot in the joint, so a person can walk.
import * as THREE from 'three'
import { model } from './models'

interface Look { profession: string; skin: string; hair: string; style: string; beard: boolean }
interface Looks { accent: Record<string, string>; tool?: Record<string, string>; people: Record<string, Look> }

const FILES = import.meta.glob('../assets/models/looks.json', { eager: true, import: 'default' }) as Record<string, Looks>
const LOOKS = Object.values(FILES)[0]
// since 21.11.2026 the model also has the tool of each profession: only looks.tool[profession] is shown
const OPTIONAL = ['hair_short', 'hair_bun', 'hair_full', 'beard', 'stripe', 'aerial', 'tool_hammer', 'tool_wrench', 'tool_trowel', 'tool_ladle', 'tool_tablet']
const tints = new Map<string, THREE.Material>()

/** A person by name, as looks.json describes them; an unknown name gets the first colonist's look. */
export function person(name: string): THREE.Group {
  if (!LOOKS) throw new Error('looks.json is missing: run npm run models')
  const look = LOOKS.people[name] ?? Object.values(LOOKS.people)[1]!
  const g = new THREE.Group(), m = model('colonist').clone(true)
  const show = new Set(['hair_' + look.style, ...(look.beard ? ['beard'] : []), ...(look.profession === 'commander' ? ['stripe', 'aerial'] : []), ...(LOOKS.tool?.[look.profession] ? [LOOKS.tool[look.profession]!] : [])])
  const tint: Record<string, string | undefined> = { accent: LOOKS.accent[look.profession], skin: look.skin, hair: look.hair }
  m.traverse((o) => {
    if (OPTIONAL.includes(o.name)) o.visible = show.has(o.name)
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.MeshStandardMaterial, clear = mat.transparent
    mesh.castShadow = !clear
    mesh.receiveShadow = !clear
    const colour = tint[mat.name]
    if (colour) {
      const key = `${mat.name}:${colour}`
      if (!tints.has(key)) tints.set(key, Object.assign(mat.clone(), { color: new THREE.Color(colour) }))
      mesh.material = tints.get(key)!
    }
  })
  g.add(m)
  g.name = name
  return g
}

/** ECHO: the Ark's computer in a small flying body with two fans. */
export function echo(): THREE.Group {
  const g = new THREE.Group(), m = model('echo').clone(true)
  m.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = !(mesh.material as THREE.Material).transparent })
  g.add(m)
  g.name = 'echo'
  return g
}

/** The arms and legs of a person, to swing them while walking. */
export function limbs(p: THREE.Object3D) {
  const get = (n: string) => p.getObjectByName(n) ?? null
  return { armL: get('arm_l'), armR: get('arm_r'), legL: get('leg_l'), legR: get('leg_r') }
}
