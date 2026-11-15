// The layouts of the levels: every building on a plot of its own, inside the open zones, off the Ark's plot, and
// every model they need is in art/3d.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LAYOUTS, buildingModels } from '../src/view/layout'

const ARK_PLOTS = new Set(['0,-2', '-1,-1', '1,-1', '0,0'])

describe.each(Object.values(LAYOUTS))('layout of level $level', (L) => {
  it('one building per plot, never on the Ark\'s', () => {
    const keys = L.buildings.map((b) => `${b.d},${b.s}`)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(ARK_PLOTS.has(k)).toBe(false)
  })

  it('every building stands on a real plot inside the open zones', () => {
    const extra = new Set(L.extra.map(([d, s]) => `${d},${s}`))
    for (const b of L.buildings) {
      expect(Math.abs(b.d + b.s) % 2, `${b.id}: d and s must have the same parity`).toBe(0)
      const open = (Math.abs(b.d) <= 2 && b.s >= -L.reach && b.s <= L.front) || extra.has(`${b.d},${b.s}`)
      expect(open, `${b.id} at (${b.d}, ${b.s})`).toBe(true)
    }
  })

  it('every model is in art/3d/buildings', () => {
    for (const m of buildingModels(L)) expect(existsSync(resolve(__dirname, `../../art/3d/buildings/${m}.glb`)), m).toBe(true)
  })

  it('the HUD numbers make sense', () => {
    expect(L.atmo).toBeLessThanOrEqual(L.atmoNext)
    expect(L.outside.length).toBeLessThanOrEqual(L.colonists)
  })
})
