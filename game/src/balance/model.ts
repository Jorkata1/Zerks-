// The balance model (proposal; 0.1 for levels 1-25, approved; 0.2 for levels 26-40): for every Ark level it adds
// up what the player has to gather and spend, fits the production of every building so that the level takes about
// its target time, and then reports how long each level really takes in the model and what holds it up.
//
// It is a flow model, not the game: it assumes a player who keeps the research running, upgrades every
// producer once per Ark level (the chapter 1 rule, kept later as the simple way to play) and collects.
//
// Balance 0.2 keeps 0.1 as it is: the curves are still fitted on levels 1-FIT_MAX, and a building level above
// FIT_MAX grows by its own rate g3, fitted on levels 26-40 (the rows 1-25 do not move). The new resources of
// chapters 3 and 4 are fitted on their own levels.

import {
  ARK_SPENDS, ARK_UPGRADE_SHARE, ATMO_START, BONUS, CLEAN_GLASS, COLONISTS, FIT_MAX, FOOD_PER_COLONIST_MIN, MAX_LEVEL,
  NIGHT_FACTOR, BLUEPRINT_AT_MIN, ONE_OFF, PATCHES, PATCH_AIR, PATCH_STAGE_MIN, REQ, REQ_MAX, RESEARCH_CRITICAL_MIN,
  RESOURCE_SHARE, RESOURCES, RESOURCES_01, ROBOT_SHARE, SLAG_IRON_SHARE, TARGET_MIN, TEST_TEMPO, UNSTAFFED_UPTIME, type Res,
} from './data.js'
import { BUILDINGS, type Building } from './buildings.js'

export const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1)
/** The levels balance 0.1 was fitted on (approved); its curves, panels, batteries and air costs come from these only. */
export const FIT_LEVELS = LEVELS.filter((L) => L <= FIT_MAX)
/** The levels of balance 0.2. */
export const NEW_LEVELS = LEVELS.filter((L) => L > FIT_MAX)

// ---------- Small helpers ----------

/** Rounds to a number that reads well in a table: two significant digits from 100 up. */
export function nice(x: number): number {
  if (x === 0) return 0
  if (x < 10) return Math.round(x * 10) / 10
  if (x < 100) return Math.round(x)
  const p = 10 ** (Math.floor(Math.log10(x)) - 1)
  return Math.round(x / p) * p
}

/** Like nice(), but never up (for a ceiling). */
export function niceDown(x: number): number {
  if (x < 100) return Math.floor(x * 10) / 10
  const p = 10 ** (Math.floor(Math.log10(x)) - 1)
  return Math.floor(x / p) * p
}

type Bag = Partial<Record<Res, number>>
const add = (a: Bag, b: Bag, k = 1) => {
  for (const [r, v] of Object.entries(b) as [Res, number][]) a[r] = (a[r] ?? 0) + v * k
}

/** The Ark's requirement for level L, extended past the last written level by x1.1 a level (the rule from level 12). */
export function req(L: number, r: Res): number {
  if (L <= REQ_MAX) return REQ[L]?.[r] ?? 0
  return req(REQ_MAX, r) * 1.1 ** (L - REQ_MAX)
}

/** The scale the upgrade costs follow: the Ark's requirement, with silicon halving below level 6 (panels are built on 5). */
function costScale(n: number, r: Res): number {
  if (r === 'silicon' && n < 6) return 200 * 0.5 ** (6 - n)
  return req(n, r)
}

const bonus = (r: Res | 'upgradeTime', L: number) =>
  BONUS.filter((b) => b.res === r && L >= b.from).reduce((m, b) => m * b.mult, 1)
/** "Чисто стъкло": more light in every greenhouse, for its air and food. */
const cleanGlass = (L: number) => (L >= CLEAN_GLASS.from ? CLEAN_GLASS.mult : 1)

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

export const byId = (id: string) => {
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

/**
 * out(n) = a * g1^(n-1) up to level 11, then x g2 a level to level FIT_MAX (balance 0.1), then x g3 a level
 * (balance 0.2; without g3 the curve goes on by g2).
 */
export interface Curve { a: number; g1: number; g2: number; g3?: number }
export const curveAt = (c: Curve, n: number) =>
  n <= 0 ? 0
    : n <= 11 ? c.a * c.g1 ** (n - 1)
      : n <= FIT_MAX ? c.a * c.g1 ** 10 * c.g2 ** (n - 11)
        : c.a * c.g1 ** 10 * c.g2 ** (FIT_MAX - 11) * (c.g3 ?? c.g2) ** (n - FIT_MAX)

/** Curves of buildings that make a resource on their own scale: the slag mill's iron, the field station's seeds. */
export type SideKey = 'slagIron' | 'fieldSeeds'
export type CurveKey = Res | SideKey
/** The fitted curve of each produced resource (units per minute at a building level), and the side curves. */
export type Curves = Record<CurveKey, Curve>

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

/** One part of a resource's production: curveAt(curves[key ?? r], level) * mult. */
export interface Term { level: number; mult: number; key?: SideKey }

const GREENHOUSES = ['greenhouse', 'greenhouse2', 'greenhouse3', 'greenhouse4']

/**
 * How much of resource r the colony makes per minute on Ark level L, as (curve level, multiplier) pairs:
 * production = sum of curveAt(curve, level) * multiplier.
 */
export function producerTerms(r: Res, L: number): Term[] {
  const t: Term[] = []
  const one = (id: string, extra = 1, key?: SideKey) => {
    const b = byId(id)
    if (!exists(b, L)) return
    t.push({ level: producingLevel(b, L), mult: availability(b, L) * uptime(b, L) * extra * bonus(r, L), ...(key ? { key } : {}) })
  }
  switch (r) {
    case 'carbon': one('drill', L >= 2 ? 1 + ROBOT_SHARE : 1); break
    case 'water': one('pump'); break
    case 'food': {
      const lab = byId('veglab')
      t.push({ level: levelAt(lab, L), mult: uptime(lab, L) * bonus('food', L) * seedTier(levelAt(lab, L)) })
      // Greenhouses give food from their level 16 (levels.md): a quarter of a lab each (proposal), +20% with tomatoes.
      for (const id of GREENHOUSES) {
        const b = byId(id)
        if (exists(b, L) && levelAt(b, L) >= 16) {
          t.push({ level: levelAt(b, L), mult: GREENHOUSE_FOOD * uptime(b, L) * bonus('food', L) * (L >= 17 ? 1.2 : 1) * cleanGlass(L) })
        }
      }
      break
    }
    case 'stone': case 'quartz': case 'copper': {
      const m = mineShare(r, L)
      if (m.workers > 0) t.push({ level: m.level, mult: m.workers * bonus(r, L) * (r === 'stone' && L >= 2 ? 1 + ROBOT_SHARE : 1) })
      break
    }
    case 'iron': {
      const m = mineShare(r, L)
      if (m.workers > 0) t.push({ level: m.level, mult: m.workers * bonus(r, L) })
      // 0.2: the slag mill's magnet sends iron back to the smelters (levels.md, level 28); on its own curve.
      one('slagmill', 1 / bonus(r, L), 'slagIron')
      break
    }
    case 'silicon': one('furnace'); break
    case 'steel': one('smelter'); one('smelter2'); break
    case 'clay': one('claypit'); break
    case 'bricks': one('kiln'); break
    case 'cables': one('copperworks'); break
    case 'seedlings':
      // Seedlings come from the greenhouse beds after "Здрав разсад" (level 17); greenhouse 1 at full, the others less.
      if (L >= 17) for (const id of GREENHOUSES) {
        const b = byId(id)
        if (exists(b, L)) t.push({ level: levelAt(b, L), mult: (L === 17 ? afterResearch(17) : 1) * uptime(b, L) })
      }
      // 0.2: the field station's agronomist gathers the grass seeds once the grass has ripened (from level 26).
      if (L >= 26) one('fieldstation', 1, 'fieldSeeds')
      break
    // 0.2
    case 'saplings': one('nursery'); break // the seed vault's tree seeds are counted on grain (the player picks one)
    case 'wool': one('woolworks'); break
    case 'glass': one('glassworks'); break
    case 'grain': one('seedvault'); break
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
  wool: { stone: 2 }, // 0.2: stone melted and spun (levels.md, level 27)
  glass: { quartz: 2 }, // 0.2: quartz with lime from the slag mill (levels.md, level 30); the lime is not a stock
}

const termRate = (curves: Partial<Curves>, r: Res, t: Term) => {
  const c = curves[t.key ?? r]
  return c ? curveAt(c, t.level) * t.mult : 0
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

/** Output per minute of a resource on level L, from its curves. */
export const rate = (curves: Partial<Curves>, r: Res, L: number) =>
  producerTerms(r, L).reduce((s, t) => s + termRate(curves, r, t), 0)

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
    if (!curves[out]) continue
    const made = rate(curves, out, L) * RESOURCE_SHARE * T
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

/** Slow levels count this many times more than fast ones, so most levels end up on or under their target. */
const SLOW = 12

/** Fits a, g1, g2 so that production meets need / (share * target) in every level, in log terms. */
export function fitCurve(points: { level: number; mult: number; want: number }[], fixedGrowth?: readonly [number, number]): Curve {
  const pts = points.filter((p) => p.want > 0 && p.mult > 0)
  if (pts.length === 0) return { a: 0, g1: 1, g2: 1 }
  // Every upgrade must give more: at least +6% a level to level 11 and +3% after (proposal).
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

/** Fit order of balance 0.1: converters first, then what they eat, then the rest. */
const FIT_ORDER: Res[] = ['silicon', 'steel', 'bricks', 'cables', 'seedlings', 'quartz', 'iron', 'clay', 'copper', 'carbon', 'water', 'stone', 'food']

/**
 * Fits a resource's curve (a, g1, g2) on the given levels, as balance 0.1 does. 0.2: the new materials use the
 * envelope (every level meets its share): their first level is short, after a long blueprint, and a log fit
 * over the quiet levels after it would leave that level far too slow.
 */
function fitResource(r: Res, curves: Partial<Curves>, levels: number[], always = false): Curve {
  // Two passes: the first guesses how a lower-level twin building compares, the second uses the fitted curve.
  let shape: Curve | undefined
  for (let pass = 0; pass < 2; pass++) {
    const points: { level: number; mult: number; want: number }[] = []
    for (const L of levels) {
      const need = needsOn(L, curves).need[r] ?? 0
      const terms = producerTerms(r, L).filter((t) => !t.key)
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
    shape = always || pts.length <= 3 ? envelope(pts, fixed) : fitCurve(pts, fixed)
  }
  return shape!
}

/**
 * 0.2: the growth after building level FIT_MAX of a 0.1 curve (a, g1 and g2 stay as approved), fitted on the
 * levels 26-40 whose production depends on it. Without such a level the curve goes on by g2.
 */
function fitGrowth3(r: Res, curves: Partial<Curves>): number {
  const c = curves[r]!
  const pts: { want: number; terms: Term[] }[] = []
  for (const L of NEW_LEVELS) {
    const need = needsOn(L, curves).need[r] ?? 0
    const terms = producerTerms(r, L)
    if (need <= 0 || !terms.some((t) => !t.key && t.level > FIT_MAX)) continue
    pts.push({ want: need / (RESOURCE_SHARE * TARGET_MIN[L]!), terms })
  }
  if (pts.length === 0) return c.g2
  let best = { g3: c.g2, err: Infinity }
  for (const g3 of range(1.03, 1.3, 0.0025)) {
    const cg = { ...c, g3 }
    let err = 0
    for (const p of pts) {
      const made = p.terms.reduce((s, t) => s + (t.key ? termRate(curves, r, t) : curveAt(cg, t.level) * t.mult), 0)
      const x = Math.log(p.want) - Math.log(made)
      err += (x > 0 ? SLOW : 1) * x * x
    }
    if (err < best.err) best = { g3, err }
  }
  return Math.round(best.g3 * 1000) / 1000
}

/**
 * 0.2: what the slag mill gives while it runs: a share of the iron that the smelters eat in the same minute
 * (fitted on levels 28-40; on its first level it runs only after its blueprint, which the model counts in rate()).
 */
function fitSlagIron(curves: Partial<Curves>): Curve {
  const mill = byId('slagmill')
  const pts = NEW_LEVELS.filter((L) => exists(mill, L)).map((L) => ({
    level: producingLevel(mill, L),
    mult: uptime(mill, L),
    want: SLAG_IRON_SHARE * RECIPES.steel!.iron! * rate(curves, 'steel', L),
  }))
  return fitCurve(pts)
}

/**
 * 0.2: the field station's grass seeds (proposal): at its level 1 a third of what the first greenhouse's beds give
 * on that Ark level (25), +6% a level. No level needs more seedlings after 25, so this is not fitted.
 */
const fieldSeeds = (curves: Partial<Curves>): Curve => ({ a: curveAt(curves.seedlings!, FIT_MAX) / 3, g1: 1.06, g2: 1.06 })

export function fitAll(): Curves {
  const curves: Partial<Curves> = {}
  // Balance 0.1, as approved: fitted on levels 1-25 only.
  for (const r of FIT_ORDER) curves[r] = fitResource(r, curves, FIT_LEVELS)
  curves.copper = approvedPair(curves.copper!, APPROVED_COPPER_G1)
  // Balance 0.2: converters first, then the new materials, then what they all eat.
  const growth3 = (r: Res) => { curves[r] = { ...curves[r]!, g3: fitGrowth3(r, curves) } }
  for (const r of ['silicon', 'steel', 'bricks', 'cables'] as Res[]) growth3(r)
  curves.seedlings = { ...curves.seedlings!, g3: AIR.growthAfter11 } // the greenhouse's own growth
  for (const r of ['wool', 'glass', 'saplings'] as Res[]) curves[r] = fitResource(r, curves, NEW_LEVELS, true)
  // Grain has no stock to make before level 40: the seed vault's agronomist grows it like the nursery (proposal).
  curves.grain = { ...curves.saplings! }
  curves.slagIron = fitSlagIron(curves)
  curves.fieldSeeds = fieldSeeds(curves)
  for (const r of ['quartz', 'iron', 'clay', 'copper', 'carbon', 'water', 'stone', 'food'] as Res[]) growth3(r)
  for (const r of RESOURCES) if (!curves[r]) throw new Error(`no curve for ${r}`)
  return curves as Curves
}
/**
 * Copper is dug from mine level 15, so its fit fixes only a * g1^10, and which (a, g1) pair the grid lands on
 * depends on the machine's rounding (13.11.2026: g1 1.125; Node 24 on this Mac: 1.155). The model writes the
 * approved g1 and the a that keeps a * g1^10, so every copper row is the same either way.
 */
const APPROVED_COPPER_G1 = 1.125
function approvedPair(c: Curve, g1: number): Curve {
  return { a: (c.a * c.g1 ** 10) / g1 ** 10, g1, g2: c.g2 }
}

/** Before a curve exists, a lower-level twin building counts as 0.9^(difference) of the first one. */
const curveRatioGuess = (n: number, ref: number) => 0.9 ** Math.max(0, ref - n)

/** The resources whose curves come from balance 0.1 (approved); the others are 0.2. */
export const isApproved = (r: CurveKey) => (RESOURCES_01 as CurveKey[]).includes(r)

// ---------- Atmosphere ----------

/** Air from the buildings, units per minute at level n (proposal, not fitted). */
export const AIR = { processor: 1, veglab: 0.3, greenhouse: 1.8, growth: 1.22, growthAfter11: 1.06 }
export const airAt = (k: number, n: number) =>
  n <= 0 ? 0 : n <= 11 ? k * AIR.growth ** (n - 1) : k * AIR.growth ** 10 * AIR.growthAfter11 ** (n - 11)

/** Minute at which Ark level L starts, if every level takes its target (for things that grow by the clock). */
const levelStart = (L: number) => LEVELS.filter((l) => l < L).reduce((s, l) => s + TARGET_MIN[l]!, 0)

/**
 * 0.2: air per minute from the six patches of the Green Belt, on average over level L (proposal). A patch goes
 * rock -> lichen -> moss -> thin soil, then grass and sea buckthorn; its air grows from one stage to the next.
 */
export function patchAirRate(L: number): number {
  if (L < 21) return 0
  const planted = levelStart(21) + (RESEARCH_CRITICAL_MIN[21]?.min ?? 0) // after "Зона III" and "Лишеи"
  const water = levelStart(23) + (BLUEPRINT_AT_MIN.treatment ?? 0) + buildSeconds(23) / 60
  const sowFrom = levelStart(25) + (RESEARCH_CRITICAL_MIN[25]?.min ?? 0) // "Хидросеене"
  const plantFrom = levelStart(26) + (RESEARCH_CRITICAL_MIN[26]?.min ?? 0) // "Облепиха"
  const A = PATCH_AIR
  // Walk the clock minute by minute up to the end of level L.
  const start = levelStart(L), end = start + TARGET_MIN[L]!
  let stage = 0, progress = 0, sum = 0
  for (let t = planted; t < end; t++) {
    const fast = t >= water ? 2 : 1
    let air = 0
    switch (stage) {
      case 0: progress += fast / PATCH_STAGE_MIN.lichenToMoss; air = A.lichen + (A.moss - A.lichen) * progress; break
      case 1: progress += fast / PATCH_STAGE_MIN.mossToSoil; air = A.moss + (A.soil - A.moss) * progress; break
      case 2: air = A.soil; if (t >= sowFrom) progress = 1; break
      case 3: progress += 1 / PATCH_STAGE_MIN.grass; air = A.soil + (A.grass - A.soil) * progress; break
      case 4: air = A.grass; if (t >= plantFrom) progress = 1; break
      case 5: progress += 1 / PATCH_STAGE_MIN.buckthorn; air = A.grass + (A.buckthorn - A.grass) * progress; break
      default: air = A.buckthorn
    }
    if (progress >= 1) { stage++; progress = 0 }
    if (t >= start) sum += air
  }
  return (PATCHES * sum) / TARGET_MIN[L]!
}

/** Air per minute on level L. Balance 0.1 set its air costs without the patches (patches = false). */
export function airRate(L: number, patches = true): number {
  const p = byId('processor'), v = byId('veglab')
  let a = airAt(AIR.processor, levelAt(p, L)) * uptime(p, L) * (L >= 4 ? 1.15 : 1) // processor filter, level 3
  a += airAt(AIR.veglab, levelAt(v, L)) * uptime(v, L)
  for (const id of GREENHOUSES) {
    const g = byId(id)
    if (exists(g, L)) a += airAt(AIR.greenhouse, levelAt(g, L)) * availability(g, L) * uptime(g, L) * cleanGlass(L)
  }
  // Smoke before the filters: the furnace on levels 5-6, the smelter on level 11 (levels.md).
  const smoke = (L === 5 || L === 6 ? 0.15 : 0) + (L === 11 ? 0.15 : 0)
  return a * (1 - smoke) + (patches ? patchAirRate(L) : 0)
}

export interface AirCost { p: number; units: number; levels: number[] }

/**
 * The air each percent costs, smoothed (proposal): a geometric curve fitted to the derived values, one for the
 * percents of chapter 1 (to 30%) and one after, where levels.md slows the atmosphere to 1% every three levels.
 * The percents gained on levels 1-25 (to 34%) are balance 0.1, as approved. 0.2 adds the percents 35-39: the
 * curve after 30% goes on, but no percent may cost more than its levels make in their share of the target (the
 * rule 0.1 lowered its curves by), and none less than the one before.
 */
export function airCostCurve(): AirCost[] {
  const smooth = airCostCurve01()
  const { late, lateScale } = airCurveFit()
  const last = smooth.at(-1)!
  const out = smooth.map((c) => ({ ...c, units: nice(c.units) }))
  for (const x of airPerPercent(true).filter((c) => c.p > last.p)) {
    const capacity = x.levels.length * Math.min(...x.levels.map((l) => airRate(l) * RESOURCE_SHARE * TARGET_MIN[l]!))
    const units = Math.max(out.at(-1)!.units, Math.min(nice(late(x.p) * lateScale), niceDown(capacity)))
    out.push({ p: x.p, units, levels: x.levels })
  }
  return out
}

/** The pure extrapolation of the 0.1 curve after 30% to the percents 35-39 (for the report: what it would cost). */
export function airCostExtrapolated(): AirCost[] {
  const { late, lateScale } = airCurveFit()
  const last = airCostCurve01().at(-1)!
  return airPerPercent(true).filter((c) => c.p > last.p).map((c) => ({ ...c, units: nice(late(c.p) * lateScale) }))
}

/** The derived values of balance 0.1 (levels 1-25, without the patches) and the two fitted curves. */
function airCurveFit() {
  const raw = airPerPercent(false).filter((x) => Math.max(...x.levels) <= FIT_MAX)
  const fit = (pts: AirCost[]) => {
    const xs = pts.map((x) => x.p), ys = pts.map((x) => Math.log(x.units))
    const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length
    const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0)
    return (p: number) => Math.exp(my + b * (p - mx))
  }
  const early = fit(raw.filter((x) => x.p < 30)), late = fit(raw.filter((x) => x.p >= 30))
  const smooth = raw.map((x) => ({ ...x, units: x.p < 30 ? early(x.p) : late(x.p) }))
  // Lower each curve until no level waits for the air longer than its share of the target (the tightest level meets it).
  const scales: number[] = []
  for (const part of [(p: number) => p < 30, (p: number) => p >= 30]) {
    let scale = Infinity
    for (const L of FIT_LEVELS) {
      const units = smooth.filter((c) => part(c.p) && c.levels.includes(L)).reduce((s, c) => s + c.units / c.levels.length, 0)
      if (units > 0) scale = Math.min(scale, (RESOURCE_SHARE * TARGET_MIN[L]! * airRate(L, false)) / units)
    }
    const k = Number.isFinite(scale) ? Math.min(1, scale) : 1
    scales.push(k)
    for (const c of smooth) if (part(c.p)) c.units *= k
  }
  return { smooth, late, lateScale: scales[1]! }
}
/** Balance 0.1's smoothed air costs (percents 7-34), before rounding. */
const airCostCurve01 = () => airCurveFit().smooth

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
export function airPerPercent(patches: boolean): AirCost[] {
  const out: AirCost[] = []
  let prevL = 0
  let prevAtmo = ATMO_START
  for (let L = 2; L <= MAX_LEVEL + 1; L++) {
    const a = REQ[L]!.atmo
    if (a <= prevAtmo) continue
    const levels = Array.from({ length: L - 1 - prevL }, (_, i) => prevL + 1 + i)
    const units = levels.reduce((s, l) => s + airRate(l, patches) * RESOURCE_SHARE * TARGET_MIN[l]!, 0)
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
  /** 0.2: minutes the store's upgrade to level L+1 takes (the Ark asks for the store on its level). */
  storeMin: number
}

/** Minutes the store's upgrade from level L to L+1 takes on Ark level L (the store follows the Ark). */
export const storeMinutes = (L: number) => (L >= byId('warehouse').unlock ? upgradeSeconds(L, L) / 60 : 0)

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
  // 0.2: the store's own upgrade to level L+1 (it grows x1.08 a level and nears the level's length by level 40).
  return Math.max(chain, storeMinutes(L))
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
      storeMin: storeMinutes(L),
    }
  })
}

/** Panels: fitted so that production / demand meets energyTarget from level 5 (kW at a panels level); levels 6-25 (0.1). */
export function solarCurve(): Curve {
  const panels = byId('solar')
  const pts = FIT_LEVELS.filter((L) => L >= 6).map((L) => ({
    level: levelAt(panels, L),
    mult: availability(panels, L),
    want: energyTarget(L) * energyDemand(L) - reactorKw(L, energyDemand(L)),
  }))
  return fitCurve(pts)
}

/** Battery capacity (kWh) wanted on level L: the night's demand, with a fifth to spare. */
export const batteryWanted = (L: number) => (L >= 7 ? (energyDemand(L) * NIGHT_MIN * 1.2) / 60 : 0)
/** Batteries: fitted on levels 8-25 (0.1). */
export function batteryCurve(): Curve {
  const bat = byId('batteries')
  return fitCurve(FIT_LEVELS.filter((L) => L >= 8).map((L) => ({ level: levelAt(bat, L), mult: 1, want: batteryWanted(L) })))
}
