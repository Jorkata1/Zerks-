// The balance model's inputs. Everything that comes from docs/levels.md says so; everything else is a
// proposal (marked "proposal") that the team tunes. Levels: L is the Ark level the player is on; the
// requirements in REQ[L] are what the Ark needs to go from L-1 to L.
//
// Balance 0.1 (levels 1-25) was approved by Joro on 13.11.2026 and stays as it is: the model still fits the
// curves of 0.1 on levels 1-FIT_MAX only. Balance 0.2 (28.11.2026, proposal) adds chapters 3 and 4 (levels
// 26-40): the requirements to level 41, the buildings of levels 26-38 and four new resources.

export type Res =
  | 'carbon' | 'water' | 'stone' | 'food' | 'quartz' | 'silicon' | 'iron'
  | 'steel' | 'clay' | 'bricks' | 'copper' | 'cables' | 'seedlings'
  | 'saplings' | 'wool' | 'glass' | 'grain'

export const RESOURCES: Res[] = [
  'carbon', 'water', 'stone', 'food', 'quartz', 'silicon', 'iron',
  'steel', 'clay', 'bricks', 'copper', 'cables', 'seedlings',
  // 0.2: saplings on 26, rock wool on 27, glass on 30, grain on 38 (levels.md)
  'saplings', 'wool', 'glass', 'grain',
]

/** The resources of balance 0.1; their curves are fitted on levels 1-FIT_MAX and never refitted. */
export const RESOURCES_01: Res[] = RESOURCES.slice(0, 13)

/** The last level the model reports (levels.md has the requirements to level 40; for 41 see REQ). */
export const MAX_LEVEL = 40
/** The last level of balance 0.1 (approved): the 0.1 curves, panels, batteries and air costs are fitted on 1-FIT_MAX. */
export const FIT_MAX = 25

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
  // 0.2: chapters 3 and 4 (levels.md, 27.11.2026)
  27: { carbon: 98200, water: 62800, stone: 27700, food: 17800, silicon: 9200, atmo: 35 },
  28: { carbon: 108000, water: 69100, stone: 30500, food: 19600, silicon: 10100, atmo: 36 },
  29: { carbon: 118800, water: 76000, stone: 33600, food: 21600, silicon: 11100, atmo: 36 },
  30: { carbon: 130700, water: 83600, stone: 37000, food: 23800, silicon: 12200, atmo: 36 },
  31: { carbon: 143800, water: 92000, stone: 40700, food: 26200, silicon: 13400, glass: 500, atmo: 37 },
  32: { carbon: 158200, water: 101200, stone: 44800, food: 28800, silicon: 14700, glass: 550, atmo: 37 },
  33: { carbon: 174000, water: 111300, stone: 49300, food: 31700, silicon: 16200, glass: 600, atmo: 37 },
  34: { carbon: 191400, water: 122400, stone: 54200, food: 34900, silicon: 17800, glass: 660, atmo: 38 },
  35: { carbon: 210500, water: 134600, stone: 59600, food: 38400, silicon: 19600, glass: 730, atmo: 38 },
  36: { carbon: 231600, water: 148100, stone: 65600, food: 42200, silicon: 21600, glass: 800, atmo: 38 },
  37: { carbon: 254800, water: 162900, stone: 72200, food: 46400, silicon: 23800, glass: 880, atmo: 39 },
  38: { carbon: 280300, water: 179200, stone: 79400, food: 51000, silicon: 26200, glass: 970, atmo: 39 },
  39: { carbon: 308300, water: 197100, stone: 87300, food: 56100, silicon: 28800, glass: 1070, atmo: 39 },
  40: { carbon: 339100, water: 216800, stone: 96000, food: 61700, silicon: 31700, glass: 1180, atmo: 40 },
  // Not written in levels.md yet: level 40 x1.1 (the rule from level 12), atmosphere still 40% (proposal).
  41: { carbon: 373000, water: 238500, stone: 105600, food: 67900, silicon: 34900, glass: 1300, atmo: 40 },
}
/** The last level REQ has; req() goes on by x1.1 a level after it. */
export const REQ_MAX = 41

/** The atmosphere at the start of the game (levels.md, level 1). */
export const ATMO_START = 7

/**
 * The Ark spends carbon, water and stone (concept.md: the resources "се харчат за ... нивата на Ковчега").
 * The rows that levels.md calls "в склада" (silicon, food, the new materials) are a stock the player must
 * have; the Ark does not take them (Salamen; approved by Joro on 13.11.2026, levels.md 2.4).
 */
export const ARK_SPENDS: Res[] = ['carbon', 'water', 'stone']

/**
 * One-off costs in the dock, on the Green Belt and for the build extras ("Строежът и корабът" in levels.md).
 * Levels.md leaves the numbers of chapters 3 and 4 for later; those from level 25 on are a proposal (0.2).
 */
export const ONE_OFF: Record<number, Partial<Record<Res, number>>> = {
  12: { steel: 200 }, // frame stage 1
  14: { steel: 500 }, // frame stage 2
  17: { steel: 1000 }, // frame stage 3
  18: { copper: 200 }, // research "Медни шини" costs 200 copper ore
  19: { steel: 1500 }, // frame stage 4
  21: { seedlings: 300 }, // six patches, 50 seedlings each
  22: { steel: 2000, cables: 100 }, // hull stage 1
  24: { steel: 3000, cables: 200 }, // hull stage 2
  // 0.2 (proposal)
  25: { seedlings: 120 }, // grass on the six patches, 20 each
  26: { saplings: 120 }, // sea buckthorn on the six patches, 20 each
  27: { steel: 4000, cables: 300, wool: 400 }, // hull stage 3: sandwich panels
  29: { steel: 4500, cables: 300, wool: 400 + 500 }, // hull stage 4; insulation of 5 buildings, 100 wool each
  30: { steel: 300 }, // the glassworks' build extra
  31: { glass: 200 }, // the university's roof
  32: { steel: 3000, wool: 200, glass: 150, saplings: 40 }, // reactor stage 1; the park's dome and bushes
  33: { glass: 100, steel: 300, cables: 200 }, // the dispatch: windows, frame, sensor cables
  34: { steel: 5000 + 200, glass: 300 }, // reactor stage 2 (the vessel); the fourth greenhouse
  36: { stone: 12000 }, // paving the four streets round the Ark, 3000 stone each
  37: { steel: 4000 + 200, cables: 600 + 100 }, // reactor stage 3 (pipes and generator); the weather station
  38: { wool: 300, steel: 400 }, // the seed vault's walls and door
  // 39: reactor stage 4 needs nothing: the fuel is in the Ark (levels.md)
}

/** Colonists awake at the end of level L (levels.md: "Колонистите са N" in the requirements for L+1). */
export const COLONISTS: Record<number, number> = {
  1: 0, 2: 0, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11,
  11: 14, 12: 14, 13: 16, 14: 17, 15: 18, 16: 19, 17: 19, 18: 19, 19: 20, 20: 21,
  21: 21, 22: 22, 23: 23, 24: 24, 25: 25,
  26: 26, 27: 27, 28: 29, 29: 29, 30: 31, 31: 32, 32: 33, 33: 34, 34: 35, 35: 36,
  36: 38, 37: 39, 38: 40, 39: 40, 40: 40, // 40: the requirements for 41 are not written (proposal)
}

/**
 * Target length of each level in real time, in minutes (proposal). A level is never shorter than the research
 * it needs, plus printing the new building, bringing it to the required level, a window to make the first stock
 * of a new material, and the Ark's own upgrade (the model checks this). Chapter 1 adds up to about 17 hours,
 * chapter 2 to about 48, levels 21-25 to about 28. 0.2: 330 a level in chapters 3 and 4, 360 on 30 and 40,
 * 360 on 31 (the university's blueprint is 5 hours) and 630 on 34 ("Чисто стъкло" and "Реакторен съд" are
 * one after the other in the same branch: 9 hours).
 */
export const TARGET_MIN: Record<number, number> = {
  1: 10, 2: 15, 3: 45, 4: 75, 5: 120, 6: 105, 7: 135, 8: 180, 9: 150, 10: 210,
  11: 300, 12: 210, 13: 225, 14: 210, 15: 300, 16: 240, 17: 360, 18: 360, 19: 360, 20: 360,
  21: 360, 22: 330, 23: 330, 24: 330, 25: 330,
  26: 330, 27: 330, 28: 330, 29: 330, 30: 360, 31: 360, 32: 330, 33: 330, 34: 630, 35: 330,
  36: 330, 37: 330, 38: 330, 39: 330, 40: 360,
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
  // 0.2: levels.md, "Веригите за нива 21-30" and "31-40"
  26: { min: 240, what: 'Облепиха ‖ Разсадник' },
  27: { min: 240, what: 'Цех за каменна вата' },
  28: { min: 240, what: 'Мелница за шлака' },
  29: { min: 180, what: 'Изолация' },
  30: { min: 240, what: 'Стъкларска пещ' },
  31: { min: 300, what: 'Университет' },
  32: { min: 240, what: 'Парк' },
  33: { min: 240, what: 'Диспечерска' },
  34: { min: 540, what: 'Чисто стъкло → Реакторен съд' },
  35: { min: 240, what: 'Медицински пункт' },
  36: { min: 240, what: 'Пътна база' },
  37: { min: 240, what: 'Метеостанция' },
  38: { min: 240, what: 'Семенен трезор' },
  39: { min: 0, what: '—' },
  40: { min: 0, what: '—' },
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

/**
 * "Чисто стъкло" (levels.md, level 34): every greenhouse gets more light, +10% air and food (proposal). The
 * research ends late on level 34, so the model counts it from level 35, like the other research bonuses.
 */
export const CLEAN_GLASS = { mult: 1.1, from: 35 }

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
  // 0.2 (levels.md, the research chains for levels 21-40)
  nursery: 180, woolworks: 240, slagmill: 240, glassworks: 240, university: 300, park: 240, dispatch: 240,
  greenhouse4: 0, medpost: 240, roaddepot: 240, weather: 240, seedvault: 240,
}

/** The robot collector adds this share to carbon and stone from level 2 (proposal). */
export const ROBOT_SHARE = 0.06

/** Food each colonist eats, per minute of real time (proposal). */
export const FOOD_PER_COLONIST_MIN = 0.2

/** Share of the target time in which the resources should be ready (proposal); the rest is the Ark upgrade. */
export const RESOURCE_SHARE = 0.85
export const ARK_UPGRADE_SHARE = 0.12

/**
 * The slag mill's magnet gives back this share of the iron that the two smelters eat (proposal, 0.2: levels.md
 * says only "стомана за корпуса идва повече"; on Earth a few percent to a sixth of the slag is metal).
 */
export const SLAG_IRON_SHARE = 0.12

/**
 * The Green Belt (levels.md, levels 21-26): six patches, not buildings, without a worker. Each goes rock ->
 * lichen -> moss -> thin soil; grass is sown on 25 and sea buckthorn planted on 26. Proposal (0.2).
 */
export const PATCHES = 6
/** Air from one patch, units per minute, by its stage (proposal: six patches stay well under the greenhouses). */
export const PATCH_AIR = { lichen: 0.2, moss: 0.4, soil: 0.7, grass: 1.5, buckthorn: 3 }
/**
 * Game minutes each stage takes (proposal). Lichen -> moss and moss -> thin soil go twice as fast with the
 * treatment plant's water (levels.md, level 23); grass and buckthorn grow with that water already.
 * Lichen planted late on 21 shows the first moss on 22; the moss has six patches by the end of 23; thin soil
 * comes during 24 with the water; the grass is green a couple of hours after it is sown on 25.
 */
export const PATCH_STAGE_MIN = { lichenToMoss: 360, mossToSoil: 720, grass: 120, buckthorn: 600 }
