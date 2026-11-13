// The camera keeps the ground under the finger: when panning, and when zooming with two fingers.
import { describe, expect, it } from 'vitest'
import { IsoCamera } from '../src/view/camera'
import { nightness } from '../src/view/daynight'

const limits = { minView: 22, maxView: 120, minX: -60, maxX: 60, minZ: -60, maxZ: 60 }
const make = () => { const c = new IsoCamera(68, 0, 0, limits); c.resize(390, 844); return c }

describe('camera', () => {
  it('the middle of the screen looks at the target', () => {
    const c = make()
    const g = c.groundAt(195, 422)!
    expect(g.x).toBeCloseTo(0, 3)
    expect(g.z).toBeCloseTo(0, 3)
  })

  it('panning keeps the ground under the finger', () => {
    const c = make()
    const before = c.groundAt(100, 300)!
    c.panBy(40, -60)
    const after = c.groundAt(140, 240)!
    expect(after.x).toBeCloseTo(before.x, 3)
    expect(after.z).toBeCloseTo(before.z, 3)
  })

  it('zooming keeps the ground under the fingers', () => {
    const c = make()
    const before = c.groundAt(250, 500)!
    c.zoomAt(0.6, 250, 500)
    const after = c.groundAt(250, 500)!
    expect(c.view).toBeCloseTo(68 * 0.6, 3)
    expect(after.x).toBeCloseTo(before.x, 3)
    expect(after.z).toBeCloseTo(before.z, 3)
  })

  it('stays inside its limits', () => {
    const c = make()
    c.zoomAt(100, 195, 422)
    expect(c.view).toBe(120)
    c.zoomAt(0.001, 195, 422)
    expect(c.view).toBe(22)
    c.panBy(-100000, 100000)
    expect(Math.abs(c.target.x)).toBeLessThanOrEqual(60)
    expect(Math.abs(c.target.z)).toBeLessThanOrEqual(60)
  })
})

describe('day and night', () => {
  it('is day for 55% of the cycle, night for 30%, with dusk and dawn between', () => {
    expect(nightness(0.25)).toBe(0)
    expect(nightness(0.8)).toBe(1)
    expect(nightness(0.575)).toBeGreaterThan(0)
    expect(nightness(0.575)).toBeLessThan(1)
    expect(nightness(0.975)).toBeGreaterThan(0)
    expect(nightness(0.975)).toBeLessThan(1)
    expect(nightness(1.25)).toBe(0)
  })
})
