// Checks that the balance model (proposal) keeps the rules of docs/levels.md and the targets.
import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../src/balance/buildings'
import { FIT_MAX, MAX_LEVEL, REQ, REQ_MAX, TARGET_MIN, TEST_TEMPO } from '../src/balance/data'
import {
  LEVELS, airCostCurve, airRate, curveAt, energyTarget, fitAll, patchAirRate, report, req, upgradeCost, upgradeSeconds,
} from '../src/balance/model'

const curves = fitAll()
const levels = report(curves)

/** What the Ark and the store hold together at store level n (levels.md, "Складът и балансът"). */
const capacity = (n: number) => 1000 + (n < 1 ? 0 : n <= 11 ? 1000 * 1.4 ** (n - 1) : 1000 * 1.4 ** 10 * 1.1 ** (n - 11))

/** Balance 0.1 as approved by Joro on 13.11.2026 (balance.json 0.1): the curves (a, g1, g2) and the air for 7-34%. */
const APPROVED_CURVES: Record<string, [number, number, number]> = {
  silicon: [2.809, 1.06, 1.035], steel: [2.253, 1.06, 1.08], bricks: [2.851, 1.06, 1.03], cables: [4.931, 1.06, 1.03],
  seedlings: [0.104, 1.22, 1.06], quartz: [5.196, 1.06, 1.03], iron: [1.116, 1.165, 1.065], clay: [4.43, 1.085, 1.03],
  copper: [0.644, 1.125, 1.15], carbon: [23.244, 1.255, 1.045], water: [14.57, 1.21, 1.05], stone: [11.22, 1.175, 1.05],
  food: [3.048, 1.07, 1.03],
}
const APPROVED_AIR = [1.9, 2.5, 3.3, 4.4, 5.9, 7.9, 10, 14, 19, 25, 33, 44, 58, 77, 100, 140, 180, 240, 320, 430, 570, 750, 1000,
  9200, 14000, 22000, 34000, 53000]
const r3 = (x: number) => Math.round(x * 1000) / 1000

describe('balance model', () => {
  it('chapter 1 takes 15-20 minutes at the test tempo (Salamen, 13.11.2026)', () => {
    const minutes = levels.filter((l) => l.L <= 10).reduce((s, l) => s + l.modelMin, 0) / TEST_TEMPO
    expect(minutes).toBeGreaterThanOrEqual(15)
    expect(minutes).toBeLessThanOrEqual(20)
  })

  it('no level is more than 15% slower than its target', () => {
    for (const l of levels) expect(l.modelMin, `level ${l.L}`).toBeLessThanOrEqual(1.15 * TARGET_MIN[l.L]!)
  })

  it('every level has room for its research, prints and catch-up', () => {
    for (const l of levels) expect(l.chainMin + l.arkMin, `level ${l.L}`).toBeLessThanOrEqual(TARGET_MIN[l.L]!)
  })

  it('every upgrade gives more than the level before', () => {
    for (const [r, c] of Object.entries(curves)) {
      for (let n = 1; n < MAX_LEVEL; n++) expect(curveAt(c, n + 1), `${r} level ${n}`).toBeGreaterThan(curveAt(c, n))
    }
  })

  it('the Ark asks for at most what the Ark and the store hold (store on the same level)', () => {
    for (let L = 5; L <= REQ_MAX; L++) {
      for (const r of ['carbon', 'water', 'stone'] as const) expect(req(L, r), `level ${L} ${r}`).toBeLessThanOrEqual(capacity(L))
    }
  })

  it('no upgrade costs more than the store can hold at that level (levels.md: the natural limit)', () => {
    for (const b of BUILDINGS) {
      for (let n = 1; n <= MAX_LEVEL; n++) {
        const cost = upgradeCost(b, n)
        for (const [r, v] of Object.entries(cost)) expect(v, `${b.id} ${n} ${r}`).toBeLessThanOrEqual(capacity(n))
      }
    }
  })

  it('upgrades take longer every level', () => {
    for (let n = 1; n < MAX_LEVEL; n++) expect(upgradeSeconds(n + 1, 1)).toBeGreaterThan(upgradeSeconds(n, 1))
  })

  it('each further percent of atmosphere costs at least as much air', () => {
    const c = airCostCurve()
    for (let i = 1; i < c.length; i++) expect(c[i]!.units, `p ${c[i]!.p}`).toBeGreaterThanOrEqual(c[i - 1]!.units)
    expect(c[0]!.p).toBe(7)
    expect(c.at(-1)!.p).toBe(REQ[MAX_LEVEL + 1]!.atmo - 1)
  })

  it('no level waits for the air longer than its share of the target (0.2: 35-39%)', () => {
    for (const l of levels.filter((x) => x.L > FIT_MAX)) expect(l.atmoMin, `level ${l.L}`).toBeLessThanOrEqual(0.86 * l.targetMin)
  })

  it('the six patches give a modest share of the air: the greenhouses stay the main source (levels.md, rule 9)', () => {
    for (const L of LEVELS.filter((x) => x >= 21)) expect(patchAirRate(L) / airRate(L), `level ${L}`).toBeLessThan(0.2)
  })

  it('energy meets the requirements: production >= demand on level 5, x1.5 on level 6 (levels.md)', () => {
    for (const l of levels.filter((x) => x.L >= 5)) {
      const need = l.L === 5 ? 1 : l.L === 6 ? 1.5 : energyTarget(l.L) - 0.2
      expect(l.energyRatio, `level ${l.L}`).toBeGreaterThanOrEqual(need)
    }
  })

  it('covers levels 1-40', () => {
    expect(LEVELS).toHaveLength(MAX_LEVEL)
    expect(MAX_LEVEL).toBe(40)
    for (const L of LEVELS) expect(TARGET_MIN[L], `target ${L}`).toBeGreaterThan(0)
  })

  it('keeps balance 0.1 as approved (curves and the air to 34%)', () => {
    for (const [r, [a, g1, g2]] of Object.entries(APPROVED_CURVES)) {
      const c = curves[r as keyof typeof curves]
      expect([r3(c.a), c.g1, c.g2], r).toEqual([a, g1, g2])
    }
    const air = airCostCurve()
    expect(air.slice(0, APPROVED_AIR.length).map((x) => x.units)).toEqual(APPROVED_AIR)
  })
})
