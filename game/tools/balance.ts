// Runs the balance model, prints a summary per level and writes docs/balance/balance.json for the Excel file.
//   npm run balance            (from game/)
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILDINGS } from '../src/balance/buildings.js'
import {
  BONUS, CLEAN_GLASS, FIT_MAX, MAX_LEVEL, TARGET_MIN, TEST_TEMPO, RESOURCE_SHARE, ARK_UPGRADE_SHARE, FOOD_PER_COLONIST_MIN,
  ROBOT_SHARE, ONE_OFF, PATCHES, PATCH_AIR, PATCH_STAGE_MIN, SLAG_IRON_SHARE,
} from '../src/balance/data.js'
import {
  AIR, LEVELS, NIGHT_MIN, airAt, airCostCurve, airRate, airCostExtrapolated, arkUpgradeMinutes, batteryCurve, buildCost, buildSeconds,
  curveAt, energyUse, fitAll, nice, patchAirRate, RECIPES, report, solarCurve, upgradeCost, upgradeSeconds, type Curve, type Curves,
} from '../src/balance/model.js'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../docs/balance/balance.json')

const curves: Curves = fitAll()
const levels = report(curves)
const solar = solarCurve()
const battery = batteryCurve()

const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} ч ${String(Math.round(m % 60)).padStart(2, '0')} мин` : `${m.toFixed(1)} мин`)
console.log('L   цел        модел      тест      рисърч  спира')
for (const l of levels) {
  const over = l.modelMin / l.targetMin - 1
  console.log(
    `${String(l.L).padEnd(3)} ${fmt(l.targetMin).padEnd(10)} ${fmt(l.modelMin).padEnd(10)} ${(l.testMin.toFixed(1) + ' мин').padEnd(9)} ${String(l.researchMin).padEnd(7)} ${l.bottleneck}` +
      `  [${l.res.filter((x) => x.minutes > 0.5 * l.targetMin).map((x) => `${x.r} ${Math.round(x.minutes)}`).join(', ')}]  атм ${Math.round(l.atmoMin)}` +
      `  E×${l.energyRatio.toFixed(2)}  ${over > 0.1 ? `+${Math.round(over * 100)}%` : ''}`,
  )
}
const sum = (a: number, b: number) => levels.filter((l) => l.L >= a && l.L <= b).reduce((s, l) => s + l.modelMin, 0)
const tsum = (a: number, b: number) => levels.filter((l) => l.L >= a && l.L <= b).reduce((s, l) => s + l.targetMin, 0)
console.log(`Глава 1 (1-10): ${fmt(sum(1, 10))}, тест ${(sum(1, 10) / TEST_TEMPO).toFixed(1)} мин`)
console.log(`Глава 2 (11-20): ${fmt(sum(11, 20))}`)
console.log(`Глава 3 (21-30): ${fmt(sum(21, 30))} (цел ${fmt(tsum(21, 30))}), тест ${(sum(21, 30) / TEST_TEMPO).toFixed(1)} мин`)
console.log(`Глава 4 (31-40): ${fmt(sum(31, 40))} (цел ${fmt(tsum(31, 40))}), тест ${(sum(31, 40) / TEST_TEMPO).toFixed(1)} мин`)
console.log('Криви:', JSON.stringify(curves))
console.log('Въздух 35-39%:', JSON.stringify(airCostCurve().filter((c) => c.p >= 35).map((c) => [c.p, c.units])),
  ' чиста екстраполация:', JSON.stringify(airCostExtrapolated().map((c) => [c.p, c.units])))
console.log('Петната (въздух/мин):', LEVELS.filter((L) => L >= 21).map((L) => `${L}:${patchAirRate(L).toFixed(1)}`).join(' '))

// Per-building tables, levels 1..MAX_LEVEL
const PRODUCES: Record<string, { label: string; f: (n: number) => number }[]> = {
  drill: [{ label: 'carbon/min', f: (n) => curveAt(curves.carbon, n) }],
  pump: [{ label: 'water/min', f: (n) => curveAt(curves.water, n) }],
  veglab: [{ label: 'food/min', f: (n) => curveAt(curves.food, n) }, { label: 'air/min', f: (n) => airAt(AIR.veglab, n) }],
  processor: [{ label: 'air/min', f: (n) => airAt(AIR.processor, n) }],
  mine: [
    { label: 'stone/min per worker', f: (n) => curveAt(curves.stone, n) },
    { label: 'quartz/min per worker', f: (n) => (n >= 5 ? curveAt(curves.quartz, n) : 0) },
    { label: 'iron/min per worker', f: (n) => (n >= 10 ? curveAt(curves.iron, n) : 0) },
    { label: 'copper/min per worker', f: (n) => (n >= 15 ? curveAt(curves.copper, n) : 0) },
  ],
  furnace: [{ label: 'silicon/min', f: (n) => curveAt(curves.silicon, n) }],
  solar: [{ label: 'kW by day', f: (n) => curveAt(solar, n) }],
  batteries: [{ label: 'kWh', f: (n) => curveAt(battery, n) }],
  greenhouse: [
    { label: 'air/min', f: (n) => airAt(AIR.greenhouse, n) },
    { label: 'food/min', f: (n) => (n >= 16 ? 0.5 * curveAt(curves.food, n) : 0) },
    { label: 'seedlings/min (from level 17)', f: (n) => (n >= 10 ? curveAt(curves.seedlings, n) : 0) },
  ],
  smelter: [{ label: 'steel/min', f: (n) => curveAt(curves.steel, n) }],
  claypit: [{ label: 'clay/min', f: (n) => curveAt(curves.clay, n) }],
  kiln: [{ label: 'bricks/min', f: (n) => curveAt(curves.bricks, n) }],
  copperworks: [{ label: 'cables/min', f: (n) => curveAt(curves.cables, n) }],
  // 0.2
  fieldstation: [{ label: 'seedlings/min', f: (n) => curveAt(curves.fieldSeeds, n) }],
  nursery: [{ label: 'saplings/min', f: (n) => curveAt(curves.saplings, n) }],
  woolworks: [{ label: 'wool/min', f: (n) => curveAt(curves.wool, n) }],
  slagmill: [{ label: 'iron/min', f: (n) => curveAt(curves.slagIron, n) }],
  glassworks: [{ label: 'glass/min', f: (n) => curveAt(curves.glass, n) }],
  seedvault: [
    { label: 'grain/min', f: (n) => curveAt(curves.grain, n) },
    { label: 'saplings/min (tree seeds)', f: (n) => curveAt(curves.saplings, n) },
  ],
}

/** Twins share the rows of their first building and are not written separately. */
const TWINS = ['greenhouse2', 'greenhouse3', 'greenhouse4', 'smelter2']
const buildings = BUILDINGS.filter((b) => !TWINS.includes(b.id)).map((b) => ({
  id: b.id, bg: b.bg, en: b.en, unlock: b.unlock, costWeight: b.costWeight, energyKw1: b.energy, staffedFrom: b.staffedFrom,
  build: { cost: buildCost(b, b.unlock), seconds: Math.round(buildSeconds(b.unlock)) },
  rows: LEVELS.map((n) => ({
    n,
    upgradeTo: n + 1,
    upgradeCost: upgradeCost(b, n),
    upgradeSeconds: Math.round(upgradeSeconds(n, 1)),
    energyKw: nice(energyUse(b, n)),
    produces: Object.fromEntries((PRODUCES[b.id] ?? []).map((p) => [p.label, nice(p.f(n))])),
  })),
}))

// The curves as 0.1 wrote them (a, g1, g2); the growth from building level 26 on (0.2) is a map of its own.
const abc = (c: Curve) => ({ a: c.a, g1: c.g1, g2: c.g2 })
const curvesOut = Object.fromEntries(Object.entries(curves).map(([k, c]) => [k, abc(c)]))
const growthAfter = Object.fromEntries(Object.entries(curves).map(([k, c]) => [k, c.g3 ?? c.g2]))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify(
    {
      version: '0.2',
      date: '2026-11-28',
      note: 'Proposal. Generated by game/tools/balance.ts from game/src/balance; do not edit by hand. Levels 1-25 are balance 0.1 '
        + '(approved by Joro on 13.11.2026) and unchanged; levels 26-40, the buildings of levels 26-38, the new resources and the air '
        + 'for 35-39% are balance 0.2, a proposal for chapters 3 and 4.',
      params: {
        TEST_TEMPO, RESOURCE_SHARE, ARK_UPGRADE_SHARE, FOOD_PER_COLONIST_MIN, ROBOT_SHARE, NIGHT_MIN, AIR, BONUS,
        FIT_MAX, CLEAN_GLASS, SLAG_IRON_SHARE, PATCHES, PATCH_AIR, PATCH_STAGE_MIN, ONE_OFF, RECIPES,
      },
      curves: curvesOut, solar, battery,
      growthAfter: { fromLevel: FIT_MAX + 1, note: 'Each curve grows by this factor a building level from level 26 on (0.2).', ...growthAfter },
      levels: levels.map((l) => ({
        ...l, arkMin: arkUpgradeMinutes(l.L), target: TARGET_MIN[l.L], airPerMin: airRate(l.L), patchAir: patchAirRate(l.L),
      })),
      air: airCostCurve(),
      // 0.2: what the percents 35-39 would cost if the 0.1 curve after 30% simply went on (for comparison only).
      airExtrapolated: airCostExtrapolated(),
      buildings,
      levelList: LEVELS,
      maxLevel: MAX_LEVEL,
    },
    (_, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v),
    1,
  ),
)
console.log('Записано:', OUT)
