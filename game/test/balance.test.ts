// Checks that the balance model (proposal) keeps the rules of docs/levels.md and the targets.
import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../src/balance/buildings'
import { REQ, TARGET_MIN, TEST_TEMPO } from '../src/balance/data'
import {
  LEVELS, airCostCurve, curveAt, energyTarget, fitAll, report, req, upgradeCost, upgradeSeconds,
} from '../src/balance/model'

const curves = fitAll()
const levels = report(curves)

/** What the Ark and the store hold together at store level n (levels.md, "Складът и балансът"). */
const capacity = (n: number) => 1000 + (n < 1 ? 0 : n <= 11 ? 1000 * 1.4 ** (n - 1) : 1000 * 1.4 ** 10 * 1.1 ** (n - 11))

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
      for (let n = 1; n < 30; n++) expect(curveAt(c, n + 1), `${r} level ${n}`).toBeGreaterThan(curveAt(c, n))
    }
  })

  it('the Ark asks for at most what the Ark and the store hold (store on the same level)', () => {
    for (let L = 5; L <= 26; L++) {
      for (const r of ['carbon', 'water', 'stone'] as const) expect(req(L, r), `level ${L} ${r}`).toBeLessThanOrEqual(capacity(L))
    }
  })

  it('no upgrade costs more than the store can hold at that level (levels.md: the natural limit)', () => {
    for (const b of BUILDINGS) {
      for (let n = 1; n <= 25; n++) {
        const cost = upgradeCost(b, n)
        for (const [r, v] of Object.entries(cost)) expect(v, `${b.id} ${n} ${r}`).toBeLessThanOrEqual(capacity(n))
      }
    }
  })

  it('upgrades take longer every level', () => {
    for (let n = 1; n < 30; n++) expect(upgradeSeconds(n + 1, 1)).toBeGreaterThan(upgradeSeconds(n, 1))
  })

  it('each further percent of atmosphere costs at least as much air', () => {
    const c = airCostCurve()
    for (let i = 1; i < c.length; i++) expect(c[i]!.units, `p ${c[i]!.p}`).toBeGreaterThanOrEqual(c[i - 1]!.units)
    expect(c[0]!.p).toBe(7)
    expect(c.at(-1)!.p).toBe(REQ[26]!.atmo - 1)
  })

  it('energy meets the requirements: production >= demand on level 5, x1.5 on level 6 (levels.md)', () => {
    for (const l of levels.filter((x) => x.L >= 5)) {
      const need = l.L === 5 ? 1 : l.L === 6 ? 1.5 : energyTarget(l.L) - 0.2
      expect(l.energyRatio, `level ${l.L}`).toBeGreaterThanOrEqual(need)
    }
  })

  it('covers levels 1-25', () => {
    expect(LEVELS).toHaveLength(25)
  })
})
