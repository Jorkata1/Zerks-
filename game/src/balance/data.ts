// The balance model's inputs. Everything that comes from docs/levels.md says so; everything else is a
// proposal (marked "proposal") that the team tunes. Levels: L is the Ark level the player is on; the
// requirements in REQ[L] are what the Ark needs to go from L-1 to L.

export type Res =
  | 'carbon' | 'water' | 'stone' | 'food' | 'quartz' | 'silicon' | 'iron'
  | 'steel' | 'clay' | 'bricks' | 'copper' | 'cables' | 'seedlings'

export const RESOURCES: Res[] = [
  'carbon', 'water', 'stone', 'food', 'quartz', 'silicon', 'iron',
  'steel', 'clay', 'bricks', 'copper', 'cables', 'seedlings',
]

export const MAX_LEVEL = 25 // the last level written in levels.md (requirements for 26 are known)

/** The Ark's requirements to reach level L, from docs/levels.md (tables "Изисквания за ниво L"). */
export const REQ: Record<number, Partial<Record<Res, number>> & { atmo: number }> = {
  2: { carbon: 150, water: 100, atmo: 10 },
  3: { carbon: 350, water: 220, stone: 60, atmo: 13 },
  4: { carbon: 700, water: 450, stone: 150, food: 100, atmo: 16 },
  5: { carbon: 1400, water: 900, stone: 400, food: 250, atmo: 18 },
  6: { carbon: 2800, water: 1800, stone: 800, food: 500, silicon: 200, atmo: 20 },
  7: { carbon: 5600, water: 3600, stone: 1600, food: 1000, silicon: 500, atmo: 22 },
  8: { carbon: 7800, water: 5000, stone: 2200, food: 1400, silicon: 700, atmo: 24 },
  9: { carbon: 10900, water: 7000, stone: 3100, food: 2000, silicon: 1000, atmo: 26 },
  10: { carbon: 15300, water: 9800, stone: 4300, food: 2800, silicon: 1400, iron: 300, atmo: 28 },
  11: { carbon: 21400, water: 13700, stone: 6000, food: 3900, silicon: 2000, iron: 500, atmo: 30 },
  12: { carbon: 23500, water: 15100, stone: 6600, food: 4300, silicon: 2200, steel: 200, atmo: 30 },
  13: { carbon: 25900, water: 16600, stone: 7300, food: 4700, silicon: 2400, atmo: 31 },
  14: { carbon: 28500, water: 18200, stone: 8000, food: 5200, silicon: 2700, clay: 300, atmo: 31 },
  15: { carbon: 31300, water: 20100, stone: 8800, food: 5700, silicon: 2900, copper: 300, atmo: 31 },
  16: { carbon: 34500, water: 22100, stone: 9700, food: 6300, silicon: 3200, bricks: 200, atmo: 32 },
  17: { carbon: 37900, water: 24300, stone: 10600, food: 6900, silicon: 3500, atmo: 32 },
  18: { carbon: 41700, water: 26700, stone: 11700, food: 7600, silicon: 3900, seedlings: 100, atmo: 32 },
  19: { carbon: 45900, water: 29400, stone: 12900, food: 8400, silicon: 4300, atmo: 33 },
  20: { carbon: 50500, water: 32300, stone: 14100, food: 9200, silicon: 4700, cables: 300, bricks: 800, atmo: 33 },
  21: { carbon: 55500, water: 35500, stone: 15600, food: 10100, silicon: 5200, seedlings: 300, atmo: 33 },
  22: { carbon: 61000, water: 39000, stone: 17200, food: 11100, silicon: 5700, atmo: 34 },
  23: { carbon: 67100, water: 42900, stone: 18900, food: 12200, silicon: 6300, atmo: 34 },
  24: { carbon: 73800, water: 47200, stone: 20800, food: 13400, silicon: 6900, atmo: 34 },
  25: { carbon: 81200, water: 51900, stone: 22900, food: 14700, silicon: 7600, atmo: 35 },
  26: { carbon: 89300, water: 57100, stone: 25200, food: 16200, silicon: 8400, atmo: 35 },
}

/** The atmosphere at the start of the game (levels.md, level 1). */
export const ATMO_START = 7

/**
 * The Ark spends carbon, water and stone (concept.md: the resources "се харчат за ... нивата на Ковчега").
 * The rows that levels.md calls "в склада" (silicon, food, the new materials) are a stock the player must
 * have; the Ark does not take them (proposal, from how levels.md words the tables).
 */
export const ARK_SPENDS: Res[] = ['carbon', 'water', 'stone']

/** One-off costs in the dock and on the Green Belt, from levels.md ("Строежът и корабът", levels 21-25). */
export const ONE_OFF: Record<number, Partial<Record<Res, number>>> = {
  12: { steel: 200 }, // frame stage 1
  14: { steel: 500 }, // frame stage 2
  17: { steel: 1000 }, // frame stage 3
  18: { copper: 200 }, // research "Медни шини" costs 200 copper ore
  19: { steel: 1500 }, // frame stage 4
  21: { seedlings: 300 }, // six patches, 50 seedlings each
  22: { steel: 2000, cables: 100 }, // hull stage 1
  24: { steel: 3000, cables: 200 }, // hull stage 2
}

/** Colonists awake at the end of level L (levels.md: "Колонистите са N" in the requirements for L+1). */
export const COLONISTS: Record<number, number> = {
  1: 0, 2: 0, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11,
  11: 14, 12: 14, 13: 16, 14: 17, 15: 18, 16: 19, 17: 19, 18: 19, 19: 20, 20: 21,
  21: 21, 22: 22, 23: 23, 24: 24, 25: 25,
}

/**
 * Target length of each level in real time, in minutes (proposal). A level is never shorter than the research
 * it needs, plus printing the new building, bringing it to the required level, a window to make the first stock
 * of a new material, and the Ark's own upgrade (the model checks this). Chapter 1 adds up to about 17 hours,
 * chapter 2 to about 48, levels 21-25 to about 28.
 */
export const TARGET_MIN: Record<number, number> = {
  1: 10, 2: 15, 3: 45, 4: 75, 5: 120, 6: 105, 7: 135, 8: 180, 9: 150, 10: 210,
  11: 300, 12: 210, 13: 225, 14: 210, 15: 300, 16: 240, 17: 360, 18: 360, 19: 360, 20: 360,
  21: 360, 22: 330, 23: 330, 24: 330, 25: 330,
}

/** The test version runs this many times faster (Salamen, 13.11.2026: chapter 1 in about 15-20 minutes). */
export const TEST_TEMPO = 60

/** Research the level cannot do without, in minutes (levels.md, "Веригите"). One slot to level 10, two from 11. */
export const RESEARCH_CRITICAL_MIN: Record<number, { min: number; what: string }> = {
  1: { min: 2, what: 'Закалени сврдла' },
  2: { min: 5, what: 'Чертеж: Мина' },
  3: { min: 10, what: 'Дом + Кухня' },
  4: { min: 40, what: 'Зона I + Склад' },
  5: { min: 90, what: 'Силициева пещ + Панели' },
  6: { min: 60, what: 'Филтър за пещта' },
  7: { min: 90, what: 'Батерии' },
  8: { min: 120, what: 'Оранжерия' },
  9: { min: 0, what: '—' },
  10: { min: 180, what: 'Зона II' },
  11: { min: 240, what: 'Топилня, после филтърът ѝ' },
  12: { min: 0, what: '—' },
  13: { min: 120, what: 'Пулт ‖ Изкоп' },
  14: { min: 0, what: '—' },
  15: { min: 180, what: 'Пещ за тухли' },
  16: { min: 0, what: '—' },
  17: { min: 240, what: 'Здрав разсад' },
  18: { min: 300, what: 'Антената ‖ Медни шини' },
  19: { min: 240, what: 'Цех за мед' },
  20: { min: 300, what: 'Тухлен дом ‖ Столова' },
  21: { min: 300, what: 'Зона III ‖ Лишеи' },
  22: { min: 240, what: 'Стоманени листове' },
  23: { min: 240, what: 'Пречиствателна станция' },
  24: { min: 0, what: '—' },
  25: { min: 180, what: 'Хидросеене ‖ Полева станция' },
}

/** Research bonuses (levels.md) and the level they arrive on (proposal: the level they unlock). */
export const BONUS: { res: Res | 'upgradeTime'; mult: number; from: number; what: string }[] = [
  { res: 'carbon', mult: 1.2, from: 2, what: 'Закалени сврдла' },
  { res: 'food', mult: 1.2, from: 3, what: 'Бързи семена' },
  { res: 'water', mult: 1.2, from: 4, what: 'Подобрена помпа' },
  { res: 'stone', mult: 1.2, from: 8, what: 'Широки ленти' },
  { res: 'quartz', mult: 1.2, from: 8, what: 'Широки ленти' },
  { res: 'iron', mult: 1.2, from: 8, what: 'Широки ленти' },
  { res: 'copper', mult: 1.2, from: 15, what: 'Широки ленти' },
  { res: 'steel', mult: 1.2, from: 13, what: 'Добра стомана' },
  { res: 'upgradeTime', mult: 0.85, from: 8, what: 'По-кратки подобрения' },
]

/** Night from level 7: machines give 5% less while it is dark (Joro, 11.11.2026); half the time is night. */
export const NIGHT_FACTOR = (L: number) => (L >= 7 ? 1 - 0.05 * 0.5 : 1)

/**
 * A building without a worker works only while you play (levels.md). Proposal: the player is in the game
 * about half the time once colonists exist; in the tutorial (levels 1-2) the player is always there, and on the
 * level a building is printed the player is there to start it (the model counts it as always on, that level).
 */
export const UNSTAFFED_UPTIME = (L: number) => (L <= 2 ? 1 : 0.5)

/**
 * Minutes into its level at which a new building's blueprint is ready (levels.md: the order of the research).
 * 0 = no blueprint needed (a second greenhouse or smelter is built with "Строй" right away).
 */
export const BLUEPRINT_AT_MIN: Record<string, number> = {
  mine: 5, home: 5, kitchen: 10, warehouse: 40, furnace: 45, solar: 90, batteries: 90, greenhouse: 120,
  smelter: 180, greenhouse2: 0, claypit: 120, kiln: 180, greenhouse3: 0, copperworks: 240, brickhome: 300,
  canteen: 180, smelter2: 0, treatment: 240, fieldstation: 180,
}

/** The robot collector adds this share to carbon and stone from level 2 (proposal). */
export const ROBOT_SHARE = 0.06

/** Food each colonist eats, per minute of real time (proposal). */
export const FOOD_PER_COLONIST_MIN = 0.2

/** Share of the target time in which the resources should be ready (proposal); the rest is the Ark upgrade. */
export const RESOURCE_SHARE = 0.85
export const ARK_UPGRADE_SHARE = 0.12
