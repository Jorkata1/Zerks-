// The balance model (proposal, v0.1): for every Ark level it adds up what the player has to gather and
// spend, fits the production of every building so that the level takes about its target time, and then
// reports how long each level really takes in the model and what holds it up.
//
// It is a flow model, not the game: it assumes a player who keeps the research running, upgrades every
// producer once per Ark level (the chapter 1 rule, kept later as the simple way to play) and collects.

import {
  ARK_SPENDS, ARK_UPGRADE_SHARE, ATMO_START, BONUS, COLONISTS, FOOD_PER_COLONIST_MIN, MAX_LEVEL, NIGHT_FACTOR,
  BLUEPRINT_AT_MIN, ONE_OFF, REQ, RESEARCH_CRITICAL_MIN, RESOURCE_SHARE, RESOURCES, ROBOT_SHARE, TARGET_MIN, TEST_TEMPO,
  UNSTAFFED_UPTIME, type Res,
} from './data.js'
import { BUILDINGS, type Building } from './buildings.js'

export const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1)

// ---------- Small helpers ----------

/** Rounds to a number that reads well in a table: two significant digits from 100 up. */
export function nice(x: number): number {
  if (x === 0) return 0
  if (x < 10) return Math.round(x * 10) / 10
  if (x < 100) return Math.round(x)
  const p = 10 ** (Math.floor(Math.log10(x)) - 1)
  return Math.round(x / p) * p
}

type Bag = Partial<Record<Res, number>>
const add = (a: Bag, b: Bag, k = 1) => {
  for (const [r, v] of Object.entries(b) as [Res, number][]) a[r] = (a[r] ?? 0) + v * k
}

/** The Ark's requirement for level L, extended past level 26 by x1.1 a level (the rule from level 12). */
export function req(L: number, r: Res): number {
  if (L <= 26) return REQ[L]?.[r] ?? 0
  return req(26, r) * 1.1 ** (L - 26)
}

/** The scale the upgrade costs follow: the Ark's requirement, with silicon halving below level 6 (panels are built on 5). */
function costScale(n: number, r: Res): number {
  if (r === 'silicon' && n < 6) return 200 * 0.5 ** (6 - n)
  return req(n, r)
}

const bonus = (r: Res | 'upgradeTime', L: number) =>
  BONUS.filter((b) => b.res === r && L >= b.from).reduce((m, b) => m * b.mult, 1)

// ---------- Times ----------

/** Seconds to upgrade a building from level n to n+1 (proposal): x1.6 a level to 11, then x1.08. */
export function upgradeSeconds(n: number, L: number): number {
  const base = n <= 11 ? 20 * 1.6 ** (n - 1) : 20 * 1.6 ** 10 * 1.08 ** (n - 11)
  return base * bonus('upgradeTime', L)
}

/**
 * Seconds for the drone to print a new building on Ark level L (proposal): one and a half upgrades of the
 * same level, but never more than on level 7 (about 8 minutes): it always prints a level 1 building.
 */
export const buildSeconds = (L: number) => 1.5 * upgradeSeconds(Math.min(L, 7), L)

/** Minutes the Ark's own upgrade takes on level L (proposal: about an eighth of the level). */
export const arkUpgradeMinutes = (L: number) => ARK_UPGRADE_SHARE * (TARGET_MIN[L] ?? 0)

// ---------- Levels of the buildings ----------

export const exists = (b: Building, L: number) => L >= b.unlock

/** The building's level at the start of Ark level L; 1 on the level it is built. */
export function levelAt(b: Building, L: number): number {
  if (L < b.unlock) return 0
  if (L === b.unlock) return 1
  return b.levelAt(L)
}

/**
 * Share of level L in which the building already produces. On the level it is built it starts after its
 * blueprint research and the print (the research on that level is the blueprint, except where it is not needed).
 */
export function availability(b: Building, L: number): number {
  if (L < b.unlock) return 0
  if (L > b.unlock) return 1
  const window = RESOURCE_SHARE * TARGET_MIN[L]!
  const blueprint = BLUEPRINT_AT_MIN[b.id] ?? 0
  return Math.min(1, Math.max(0.1, (window - blueprint - buildSeconds(L) / 60) / window))
}

const staffed = (b: Building, L: number) => b.staffedFrom !== null && L >= b.staffedFrom
const uptime = (b: Building, L: number) =>
  (staffed(b, L) || L === b.unlock ? 1 : UNSTAFFED_UPTIME(L)) * NIGHT_FACTOR(L)

/** The level it produces at during Ark level L: on its first level it catches up quickly, so its level at the end. */
const producingLevel = (b: Building, L: number) => (L === b.unlock ? levelAt(b, L + 1) : levelAt(b, L))

const byId = (id: string) => {
  const b = BUILDINGS.find((x) => x.id === id)
  if (!b) throw new Error(`no building ${id}`)
  return b
}

// ---------- Costs ----------

/** A price as it is shown: a whole number, two significant digits from 100 up, nothing below 1. */
const price = (x: number) => (x < 0.5 ? 0 : Math.max(1, Math.round(nice(x))))
const clean = (c: Bag): Bag => Object.fromEntries(Object.entries(c).filter(([, v]) => v > 0)) as Bag

/** What one upgrade of b from level n to n+1 costs (proposal): its weight times the Ark's need for level n+1. */
export function upgradeCost(b: Building, n: number): Bag {
  const w = b.costWeight
  const c: Bag = {
    carbon: price(w * costScale(n + 1, 'carbon')),
    water: price(w * 0.3 * costScale(n + 1, 'water')),
    stone: price(w * costScale(n + 1, 'stone')),
  }
  if (b.silicon) c.silicon = price(w * costScale(n + 1, 'silicon'))
  return clean(c)
}

/** What printing a new building costs on Ark level L (proposal): half an upgrade at the scale of the level. */
export function buildCost(b: Building, L: number): Bag {
  const u = upgradeCost(b, L)
  const c: Bag = {}
  for (const [r, v] of Object.entries(u) as [Res, number][]) c[r] = price(v / 2)
  return clean(c)
}

// ---------- Producers ----------

/** out(n) = a * g1^(n-1) up to level 11, then x g2 a level. */
export interface Curve { a: number; g1: number; g2: number }
export const curveAt = (c: Curve, n: number) =>
  n <= 0 ? 0 : n <= 11 ? c.a * c.g1 ** (n - 1) : c.a * c.g1 ** 10 * c.g2 ** (n - 11)

/** The Ark level from which a worker digs each material (levels.md, as ECHO advises). */
const MINE_STAFFED_FROM: Record<string, number> = { stone: 4, quartz: 5, iron: 9, copper: 14, iron2: 24 }

/** Share of level L in which a mine material is dug, and by how many workers. */
function mineShare(material: 'stone' | 'quartz' | 'iron' | 'copper', L: number): { level: number; workers: number } {
  const mine = byId('mine')
  const start = levelAt(mine, L)
  const end = levelAt(mine, L + 1) || start
  let workers = 0
  const slots: [string, number][] = [['stone', 1], ['quartz', 5], ['iron', 10], ['copper', 15], ['iron2', 20]]
  for (const [slot, from] of slots) {
    const mat = slot === 'iron2' ? 'iron' : slot
    if (mat !== material) continue
    const share = start >= from ? 1 : end >= from ? 0.5 : 0
    if (share === 0) continue
    const up = L >= MINE_STAFFED_FROM[slot]! ? 1 : UNSTAFFED_UPTIME(L)
    workers += share * up * (mine.unlock === L ? 0.5 : 1)
  }
  return { level: Math.max(start, 1), workers: workers * NIGHT_FACTOR(L) }
}

/** The fitted curve of each produced resource (units per minute at a building level). */
export type Curves = Record<Res, Curve>

/**
 * How much of resource r the colony makes per minute on Ark level L, as (curve level, multiplier) pairs:
 * production = sum of curveAt(curve, level) * multiplier.
 */
export function producerTerms(r: Res, L: number): { level: number; mult: number }[] {
  const t: { level: number; mult: number }[] = []
  const one = (id: string, extra = 1) => {
    const b = byId(id)
    if (!exists(b, L)) return
    t.push({ level: producingLevel(b, L), mult: availability(b, L) * uptime(b, L) * extra * bonus(r, L) })
  }
  switch (r) {
    case 'carbon': one('drill', L >= 2 ? 1 + ROBOT_SHARE : 1); break
    case 'water': one('pump'); break
    case 'food': {
      const lab = byId('veglab')
      t.push({ level: levelAt(lab, L), mult: uptime(lab, L) * bonus('food', L) * seedTier(levelAt(lab, L)) })
      // Greenhouses give food from their level 16 (levels.md): a quarter of a lab each (proposal), +20% with tomatoes.
      for (const id of ['greenhouse', 'greenhouse2', 'greenhouse3']) {
        const b = byId(id)
        if (exists(b, L) && levelAt(b, L) >= 16) t.push({ level: levelAt(b, L), mult: GREENHOUSE_FOOD * uptime(b, L) * bonus('food', L) * (L >= 17 ? 1.2 : 1) })
      }
      break
    }
    case 'stone': case 'quartz': case 'iron': case 'copper': {
      const m = mineShare(r, L)
      if (m.workers > 0) t.push({ level: m.level, mult: m.workers * bonus(r, L) * (r === 'stone' && L >= 2 ? 1 + ROBOT_SHARE : 1) })
      break
    }
    case 'silicon': one('furnace'); break
    case 'steel': one('smelter'); one('smelter2'); break
    case 'clay': one('claypit'); break
    case 'bricks': one('kiln'); break
    case 'cables': one('copperworks'); break
    case 'seedlings':
      // Seedlings come from the greenhouse beds after "Здрав разсад" (level 17); greenhouse 1 at full, the others less.
      if (L >= 17) for (const id of ['greenhouse', 'greenhouse2', 'greenhouse3']) {
        const b = byId(id)
        if (exists(b, L)) t.push({ level: levelAt(b, L), mult: (L === 17 ? afterResearch(17) : 1) * uptime(b, L) })
      }
      break
  }
  return t.filter((x) => x.mult > 0 && x.level > 0)
}

/** Share of the level left after its critical research (for what that research starts). */
const afterResearch = (L: number) => {
  const window = RESOURCE_SHARE * TARGET_MIN[L]!
  return Math.max(0.1, (window - (RESEARCH_CRITICAL_MIN[L]?.min ?? 0)) / window)
}

/** Each new seed of the lab gives more food (levels.md: potatoes on 5, beans on 10, wheat on 15; the factors are a proposal). */
export const seedTier = (labLevel: number) => (labLevel >= 15 ? 1.25 * 1.25 * 1.2 : labLevel >= 10 ? 1.25 * 1.25 : labLevel >= 5 ? 1.25 : 1)
/** Food from one greenhouse from its level 16, as a share of the lab's food at the same level (proposal). */
export const GREENHOUSE_FOOD = 0.25

/** Inputs per unit of output for the converters (proposal, by the real processes in levels.md). */
export const RECIPES: Partial<Record<Res, Bag>> = {
  silicon: { quartz: 2, carbon: 1 }, // quartz + carbon + energy -> silicon
  steel: { iron: 2, carbon: 1 }, // iron ore + carbon + energy -> steel
  bricks: { clay: 2 }, // clay + energy -> bricks
  cables: { copper: 2, carbon: 1 }, // copper ore -> copper; carbon insulation
}

// ---------- What each level needs ----------

export interface LevelNeed { need: Bag; spend: Bag; upgrades: Bag; builds: Bag }

/** Upgrades the player makes on level L: every building from its level now to its level on L+1. */
export function upgradesOn(L: number): { b: Building; from: number; to: number }[] {
  const u: { b: Building; from: number; to: number }[] = []
  for (const b of BUILDINGS) {
    if (!exists(b, L)) continue
    const from = levelAt(b, L)
    const to = levelAt(b, L + 1)
    if (to > from) u.push({ b, from, to })
  }
  return u
}

const stockTarget = (L: number, r: Res) => (ARK_SPENDS.includes(r) ? 0 : req(L, r))

/** Output per minute of a converter resource on level L, from its curve. */
export const rate = (curves: Curves, r: Res, L: number) =>
  producerTerms(r, L).reduce((s, t) => s + curveAt(curves[r], t.level) * t.mult, 0)

export function needsOn(L: number, curves: Partial<Curves>): LevelNeed {
  const spend: Bag = {}
  const upgrades: Bag = {}
  const builds: Bag = {}
  for (const r of ARK_SPENDS) spend[r] = req(L + 1, r)
  for (const { b, from, to } of upgradesOn(L)) for (let n = from; n < to; n++) add(upgrades, upgradeCost(b, n))
  for (const b of BUILDINGS) if (b.unlock === L) add(builds, buildCost(b, L))
  add(spend, upgrades)
  add(spend, builds)
  add(spend, ONE_OFF[L] ?? {})
  const T = TARGET_MIN[L]!
  // Food the colonists eat during the level (average of the start and the end).
  const people = ((COLONISTS[L - 1] ?? 0) + (COLONISTS[L] ?? 0)) / 2
  add(spend, { food: people * FOOD_PER_COLONIST_MIN * T })
  // Inputs the converters eat while they make their output.
  for (const [out, recipe] of Object.entries(RECIPES) as [Res, Bag][]) {
    const c = curves[out]
    if (!c) continue
    const made = producerTerms(out, L).reduce((s, t) => s + curveAt(c, t.level) * t.mult, 0) * RESOURCE_SHARE * T
    add(spend, recipe, made)
  }
  const need: Bag = {}
  for (const r of RESOURCES) {
    const v = stockTarget(L + 1, r) - stockTarget(L, r) + (spend[r] ?? 0)
    if (v > 0) need[r] = v
  }
  return { need, spend, upgrades, builds }
}

// ---------- Fitting ----------

/** Fits a, g1, g2 so that production meets need / (share * target) in every level, in log terms. */
export function fitCurve(points: { level: number; mult: number; want: number }[], fixedGrowth?: readonly [number, number]): Curve {
  const pts = points.filter((p) => p.want > 0 && p.mult > 0)
  if (pts.length === 0) return { a: 0, g1: 1, g2: 1 }
  // Slow levels count four times more than fast ones, so most levels end up on or under their target.
  // Every upgrade must give more: at least +6% a level to level 11 and +3% after (proposal).
  const SLOW = 12
  let best: Curve & { err: number } = { a: 0, g1: 1, g2: 1, err: Infinity }
  const g1s = fixedGrowth ? [fixedGrowth[0]] : range(1.06, 1.8, 0.005)
  const g2s = fixedGrowth ? [fixedGrowth[1]] : range(1.03, 1.4, 0.005)
  for (const g1 of g1s) {
    for (const g2 of g2s) {
      const res = pts.map((p) => Math.log(p.want) - Math.log(curveAt({ a: 1, g1, g2 }, p.level) * p.mult))
      let la = res.reduce((s, x) => s + x, 0) / res.length
      for (let i = 0; i < 30; i++) {
        let sw = 0, swx = 0
        for (const x of res) { const w = x > la ? SLOW : 1; sw += w; swx += w * x }
        la = swx / sw
      }
      const err = res.reduce((s, x) => s + (x > la ? SLOW : 1) * (x - la) ** 2, 0)
      if (err < best.err) best = { a: Math.exp(la), g1, g2, err }
    }
  }
  return { a: best.a, g1: Math.round(best.g1 * 1000) / 1000, g2: Math.round(best.g2 * 1000) / 1000 }
}
/** For a material needed on only a few levels: the smallest curve that meets every one of them. */
function envelope(points: { level: number; mult: number; want: number }[], fixedGrowth?: readonly [number, number]): Curve {
  const g1 = fixedGrowth?.[0] ?? 1.06, g2 = fixedGrowth?.[1] ?? 1.03
  const a = Math.max(0, ...points.filter((p) => p.mult > 0).map((p) => p.want / (curveAt({ a: 1, g1, g2 }, p.level) * p.mult)))
  return { a, g1, g2 }
}
const range = (a: number, b: number, step: number) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step)

/** Fit order: converters first, then what they eat, then the rest. */
const FIT_ORDER: Res[] = ['silicon', 'steel', 'bricks', 'cables', 'seedlings', 'quartz', 'iron', 'clay', 'copper', 'carbon', 'water', 'stone', 'food']

export function fitAll(): Curves {
  const curves: Partial<Curves> = {}
  for (const r of FIT_ORDER) {
    // Two passes: the first guesses how a lower-level twin building compares, the second uses the fitted curve.
    let shape: Curve | undefined
    for (let pass = 0; pass < 2; pass++) {
      const points: { level: number; mult: number; want: number }[] = []
      for (const L of LEVELS) {
        const need = needsOn(L, curves).need[r] ?? 0
        const terms = producerTerms(r, L)
        if (terms.length === 0 || need <= 0) continue
        const lvl = terms[0]!.level
        const ratio = (n: number) => (shape ? curveAt(shape, n) / curveAt(shape, lvl) : curveRatioGuess(n, lvl))
        const mult = terms.reduce((s, t) => s + t.mult * ratio(t.level), 0)
        points.push({ level: lvl, mult, want: need / (RESOURCE_SHARE * TARGET_MIN[L]!) })
      }
      // Food from the lab is fitted on chapter 1 and level 11: from level 16 the greenhouses add food as well.
      const pts = r === 'food' ? points.filter((p) => p.level <= 11) : points
      // Seedlings grow with the greenhouse itself: the same growth as its air (proposal).
      const fixed = r === 'seedlings' ? ([AIR.growth, AIR.growthAfter11] as const) : undefined
      shape = pts.length <= 3 ? envelope(pts, fixed) : fitCurve(pts, fixed)
    }
    curves[r] = shape!
  }
  return curves as Curves
}
/** Before a curve exists, a lower-level twin building counts as 0.9^(difference) of the first one. */
const curveRatioGuess = (n: number, ref: number) => 0.9 ** Math.max(0, ref - n)

// ---------- Atmosphere ----------

/** Air from the buildings, units per minute at level n (proposal, not fitted). */
export const AIR = { processor: 1, veglab: 0.3, greenhouse: 1.8, growth: 1.22, growthAfter11: 1.06 }
export const airAt = (k: number, n: number) =>
  n <= 0 ? 0 : n <= 11 ? k * AIR.growth ** (n - 1) : k * AIR.growth ** 10 * AIR.growthAfter11 ** (n - 11)

export function airRate(L: number): number {
  const p = byId('processor'), v = byId('veglab')
  let a = airAt(AIR.processor, levelAt(p, L)) * uptime(p, L) * (L >= 4 ? 1.15 : 1) // processor filter, level 3
  a += airAt(AIR.veglab, levelAt(v, L)) * uptime(v, L)
  for (const id of ['greenhouse', 'greenhouse2', 'greenhouse3']) {
    const g = byId(id)
    if (exists(g, L)) a += airAt(AIR.greenhouse, levelAt(g, L)) * availability(g, L) * uptime(g, L)
  }
  // Smoke before the filters: the furnace on levels 5-6, the smelter on level 11 (levels.md).
  const smoke = (L === 5 || L === 6 ? 0.15 : 0) + (L === 11 ? 0.15 : 0)
  return a * (1 - smoke)
}

/**
 * The air each percent costs, smoothed (proposal): a geometric curve fitted to the derived values, one for the
 * percents of chapter 1 (to 30%) and one after, where levels.md slows the atmosphere to 1% every three levels.
 */
export function airCostCurve(): { p: number; units: number; levels: number[] }[] {
  const raw = airPerPercent()
  const fit = (pts: typeof raw) => {
    const xs = pts.map((x) => x.p), ys = pts.map((x) => Math.log(x.units))
    const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length
    const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0)
    return (p: number) => Math.exp(my + b * (p - mx))
  }
  const early = fit(raw.filter((x) => x.p < 30)), late = fit(raw.filter((x) => x.p >= 30))
  const smooth = raw.map((x) => ({ ...x, units: x.p < 30 ? early(x.p) : late(x.p) }))
  // Lower each curve until no level waits for the air longer than its share of the target (the tightest level meets it).
  for (const part of [(p: number) => p < 30, (p: number) => p >= 30]) {
    let scale = Infinity
    for (const L of LEVELS) {
      const units = smooth.filter((c) => part(c.p) && c.levels.includes(L)).reduce((s, c) => s + c.units / c.levels.length, 0)
      if (units > 0) scale = Math.min(scale, (RESOURCE_SHARE * TARGET_MIN[L]! * airRate(L)) / units)
    }
    for (const c of smooth) if (part(c.p) && Number.isFinite(scale)) c.units *= Math.min(1, scale)
  }
  return smooth.map((c) => ({ ...c, units: nice(c.units) }))
}

/** Minutes of level L the atmosphere needs with the smoothed costs (a percent spread over its levels evenly). */
export function atmoMinutes(L: number, costs = airCostCurve()): number {
  const units = costs.filter((c) => c.levels.includes(L)).reduce((s, c) => s + c.units / c.levels.length, 0)
  return units > 0 ? units / airRate(L) : 0
}

/**
 * Air needed for each percent, from p to p+1 (derived): the air the colony makes in the levels where that
 * percent is gained, so that the atmosphere is ready in its share of the level. The later percents need
 * more air: the thicker the air, the more of it binds to the rock and escapes (the reason in the game).
 */
export function airPerPercent(): { p: number; units: number; levels: number[] }[] {
  const out: { p: number; units: number; levels: number[] }[] = []
  let prevL = 0
  let prevAtmo = ATMO_START
  for (let L = 2; L <= MAX_LEVEL + 1; L++) {
    const a = REQ[L]!.atmo
    if (a <= prevAtmo) continue
    const levels = Array.from({ length: L - 1 - prevL }, (_, i) => prevL + 1 + i)
    const units = levels.reduce((s, l) => s + airRate(l) * RESOURCE_SHARE * TARGET_MIN[l]!, 0)
    for (let p = prevAtmo; p < a; p++) out.push({ p, units: units / (a - prevAtmo), levels })
    prevL = L - 1
    prevAtmo = a
  }
  return out
}

// ---------- Energy ----------

export const energyUse = (b: Building, n: number) => b.energy * 1.12 ** (n - 1)

export function energyDemand(L: number): number {
  return BUILDINGS.filter((b) => exists(b, L)).reduce((s, b) => s + energyUse(b, levelAt(b, L)) * (L === b.unlock ? 0.5 : 1), 0)
}
/** Power the buildings need at the end of level L, on their levels for L+1. */
export const energyDemandEnd = (L: number) =>
  BUILDINGS.filter((b) => exists(b, L)).reduce((s, b) => s + energyUse(b, levelAt(b, L + 1)), 0)

/** kW the Ark's reactor keeps on levels 5-6: what the colony used when it reached level 5 (levels.md 2.5, Joro, 14.11.2026). */
export const reactorCapKw = () => energyDemandEnd(4)
/** The Ark's reactor: everything to level 4, the level-5 use on 5-6 (never more than the demand), nothing from 7 (levels.md 2.5). */
export const reactorKw = (L: number, demand: number) => (L <= 4 ? demand : L <= 6 ? Math.min(demand, reactorCapKw()) : 0)
/** Panels output wanted: production / demand of 1.1 on level 5, 1.6 on 6, 1.8 from 7 with the nights (proposal). */
export const energyTarget = (L: number) => (L <= 4 ? 1 : L === 5 ? 1.1 : L === 6 ? 1.6 : 1.8)
/** Night length in real minutes (levels.md: a day is about 20 minutes; proposal: 12 day, 8 night). */
export const NIGHT_MIN = 8

// ---------- The report ----------

export interface LevelReport {
  L: number
  targetMin: number
  modelMin: number
  testMin: number
  researchMin: number
  researchWhat: string
  chainMin: number
  atmoMin: number
  arkMin: number
  bottleneck: string
  colonists: number
  atmo: number
  res: { r: Res; need: number; perMin: number; minutes: number }[]
  energyRatio: number
}

/** The longest "blueprint, then print, then catch up to the required level" chain of the level, in minutes. */
export function chainMinutes(L: number): number {
  const research = RESEARCH_CRITICAL_MIN[L]?.min ?? 0
  const fresh = BUILDINGS.filter((b) => b.unlock === L)
  let chain = research
  let printed = 0 // one drone: the prints follow one another
  for (const b of [...fresh].sort((x, y) => (BLUEPRINT_AT_MIN[x.id] ?? 0) - (BLUEPRINT_AT_MIN[y.id] ?? 0))) {
    printed = Math.max(printed, BLUEPRINT_AT_MIN[b.id] ?? 0) + buildSeconds(L) / 60
    let catchUp = 0
    for (let n = 1; n < levelAt(b, L + 1); n++) catchUp += upgradeSeconds(n, L) / 60
    chain = Math.max(chain, printed + catchUp)
  }
  return chain
}

export function report(curves: Curves): LevelReport[] {
  const costs = airCostCurve()
  return LEVELS.map((L) => {
    const T = TARGET_MIN[L]!
    const { need } = needsOn(L, curves)
    const res = (Object.entries(need) as [Res, number][]).map(([r, n]) => {
      const perMin = rate(curves, r, L)
      return { r, need: n, perMin, minutes: perMin > 0 ? n / perMin : Infinity }
    })
    const worst = res.reduce((w, x) => (x.minutes > w.minutes ? x : w), { r: 'carbon' as Res, need: 0, perMin: 0, minutes: 0 })
    const chain = chainMinutes(L)
    const ark = arkUpgradeMinutes(L)
    const atmo = atmoMinutes(L, costs)
    const core = Math.max(chain, worst.minutes, atmo)
    const modelMin = core + ark
    // Energy as the requirement reads it: at the end of the level, with the panels and the buildings upgraded.
    const panels = BUILDINGS.find((b) => b.id === 'solar')!
    const demand = energyDemandEnd(L)
    const solar = exists(panels, L) ? curveAt(solarCurve(), levelAt(panels, L + 1)) : 0
    return {
      L, targetMin: T, modelMin, testMin: modelMin / TEST_TEMPO,
      researchMin: RESEARCH_CRITICAL_MIN[L]?.min ?? 0, researchWhat: RESEARCH_CRITICAL_MIN[L]?.what ?? '',
      chainMin: chain, arkMin: ark,
      bottleneck: core === chain ? 'research and building' : core === atmo ? 'atmosphere' : worst.r,
      atmoMin: atmo,
      colonists: COLONISTS[L] ?? 0, atmo: REQ[L + 1]!.atmo, res,
      energyRatio: (solar + reactorKw(L, demand)) / demand,
    }
  })
}

/** Panels: fitted so that production / demand meets energyTarget from level 5 (kW at a panels level). */
export function solarCurve(): Curve {
  const panels = byId('solar')
  const pts = LEVELS.filter((L) => L >= 6).map((L) => ({
    level: levelAt(panels, L),
    mult: availability(panels, L),
    want: energyTarget(L) * energyDemand(L) - reactorKw(L, energyDemand(L)),
  }))
  return fitCurve(pts)
}

/** Battery capacity (kWh) wanted on level L: the night's demand, with a fifth to spare. */
export const batteryWanted = (L: number) => (L >= 7 ? (energyDemand(L) * NIGHT_MIN * 1.2) / 60 : 0)
export function batteryCurve(): Curve {
  const bat = byId('batteries')
  return fitCurve(LEVELS.filter((L) => L >= 8).map((L) => ({ level: levelAt(bat, L), mult: 1, want: batteryWanted(L) })))
}
