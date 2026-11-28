import { COLONISTS } from './data.js'

// The buildings of levels 1-38 and the rules for their level while the Ark is on level L.
// Unlock levels and who works where come from docs/levels.md; cost weights and energy are proposals.
// The buildings of levels 26-38 are balance 0.2 (28.11.2026, proposal).

export interface Building {
  id: string
  bg: string
  en: string
  /** Ark level on which it is built (levels.md). */
  unlock: number
  /** One upgrade costs this share of what the Ark needs for the matching level (proposal). */
  costWeight: number
  /** Its upgrades and its construction also cost silicon (panels, batteries, greenhouses). */
  silicon?: boolean
  /** Power at its level 1, in kW (proposal); grows 12% a level. */
  energy: number
  /** Ark level from which a colonist works here (levels.md, chapter 1 choices as ECHO recommends). */
  staffedFrom: number | null
  /** Its level at the start of Ark level L, for L after its unlock level (rules in levels.md; proposal where there is none). */
  levelAt(L: number): number
}

const ark = (L: number) => L // chapter 1: everything is on the Ark's level; producers keep up later too
const since = (unlock: number) => (L: number) => Math.max(1, L - unlock + 1)

export const BUILDINGS: Building[] = [
  { id: 'geolocator', bg: 'Геолокатор', en: 'Geolocator', unlock: 1, costWeight: 0.03, energy: 0.5, staffedFrom: null,
    levelAt: (L) => Math.min(L, 11) },
  { id: 'drill', bg: 'Карбонова сонда', en: 'Carbon drill', unlock: 1, costWeight: 0.05, energy: 2, staffedFrom: 3, levelAt: ark },
  { id: 'pump', bg: 'Помпа за вода', en: 'Water pump', unlock: 1, costWeight: 0.05, energy: 2, staffedFrom: 3, levelAt: ark },
  { id: 'processor', bg: 'Атмосферен процесор', en: 'Atmosphere processor', unlock: 1, costWeight: 0.05, energy: 3, staffedFrom: 11, levelAt: ark },
  { id: 'veglab', bg: 'Лаборатория за зеленчуци', en: 'Vegetable lab', unlock: 1, costWeight: 0.05, energy: 2, staffedFrom: 3, levelAt: ark },
  // The research station is outside the "all buildings" rule; it is upgraded once, on level 10, for the second slot.
  { id: 'research', bg: 'Рисърч станция', en: 'Research station', unlock: 1, costWeight: 0.15, energy: 2, staffedFrom: 11,
    levelAt: (L) => (L <= 10 ? 1 : 2) },
  // The mine is built on level 2 and must be on level 2 for Ark level 3 (levels.md, level 3), then follows the Ark.
  { id: 'mine', bg: 'Мина', en: 'Mine', unlock: 2, costWeight: 0.06, energy: 3, staffedFrom: 4,
    levelAt: (L) => (L <= 2 ? 1 : L === 3 ? 2 : L) },
  // From level 11 the home grows with the people: one level per colonist, up to 20 (levels.md).
  { id: 'home', bg: 'Дом на колонистите', en: 'Colonists\' home', unlock: 3, costWeight: 0.04, energy: 1, staffedFrom: null,
    levelAt: (L) => (L <= 10 ? L : Math.min(20, colonistsAt(L))) },
  { id: 'kitchen', bg: 'Обща кухня', en: 'Common kitchen', unlock: 3, costWeight: 0.04, energy: 1, staffedFrom: 3,
    levelAt: (L) => (L <= 10 ? L : Math.min(20, colonistsAt(L))) },
  { id: 'warehouse', bg: 'Склад', en: 'Store', unlock: 4, costWeight: 0.07, energy: 0.5, staffedFrom: null, levelAt: ark },
  { id: 'furnace', bg: 'Силициева пещ', en: 'Silicon furnace', unlock: 5, costWeight: 0.06, energy: 12, staffedFrom: 6, levelAt: ark },
  { id: 'solar', bg: 'Слънчеви панели', en: 'Solar panels', unlock: 5, costWeight: 0.05, silicon: true, energy: 0, staffedFrom: 7, levelAt: ark },
  { id: 'batteries', bg: 'Батерии', en: 'Batteries', unlock: 7, costWeight: 0.05, silicon: true, energy: 0, staffedFrom: null, levelAt: ark },
  { id: 'greenhouse', bg: 'Оранжерия', en: 'Greenhouse', unlock: 8, costWeight: 0.06, silicon: true, energy: 5, staffedFrom: 8, levelAt: ark },
  // Key building of chapters 2 and 3: level L-7 for Ark level L, so L-6 at the end of level L (levels.md).
  { id: 'smelter', bg: 'Топилня', en: 'Smelter', unlock: 11, costWeight: 0.06, energy: 20, staffedFrom: 11, levelAt: (L) => Math.max(1, L - 7) },
  { id: 'greenhouse2', bg: 'Втора оранжерия', en: 'Second greenhouse', unlock: 11, costWeight: 0.06, silicon: true, energy: 5, staffedFrom: 11,
    levelAt: since(11) },
  { id: 'claypit', bg: 'Глинен изкоп', en: 'Clay pit', unlock: 13, costWeight: 0.04, energy: 4, staffedFrom: 13, levelAt: since(13) },
  { id: 'kiln', bg: 'Пещ за тухли', en: 'Brick kiln', unlock: 15, costWeight: 0.05, energy: 12, staffedFrom: 15, levelAt: since(15) },
  { id: 'greenhouse3', bg: 'Трета оранжерия', en: 'Third greenhouse', unlock: 16, costWeight: 0.06, silicon: true, energy: 5, staffedFrom: 16,
    levelAt: since(16) },
  // Key building of chapter 3: level L-19 for Ark level L (levels.md).
  { id: 'copperworks', bg: 'Цех за мед', en: 'Copper works', unlock: 19, costWeight: 0.06, energy: 15, staffedFrom: 19, levelAt: since(19) },
  { id: 'brickhome', bg: 'Тухлен дом', en: 'Brick home', unlock: 20, costWeight: 0.04, energy: 1, staffedFrom: null,
    levelAt: (L) => Math.max(1, colonistsAt(L) - 20) },
  { id: 'canteen', bg: 'Столова', en: 'Canteen', unlock: 20, costWeight: 0.04, energy: 1, staffedFrom: 20,
    levelAt: (L) => Math.max(1, colonistsAt(L) - 20) },
  // The second smelter catches up two levels per Ark level (proposal: its first levels are cheap and quick);
  // 0.2: once it has caught up with the first smelter (on level 36) it follows it.
  { id: 'smelter2', bg: 'Втора топилня', en: 'Second smelter', unlock: 22, costWeight: 0.06, energy: 20, staffedFrom: 22,
    levelAt: (L) => Math.max(1, Math.min(2 * (L - 22) + 1, L - 7)) },
  { id: 'treatment', bg: 'Пречиствателна станция', en: 'Treatment plant', unlock: 23, costWeight: 0.05, energy: 4, staffedFrom: 23, levelAt: since(23) },
  { id: 'fieldstation', bg: 'Полева станция', en: 'Field station', unlock: 25, costWeight: 0.04, energy: 1, staffedFrom: 25, levelAt: since(25) },
  // ---- 0.2: chapter 3 (levels.md 26-30) ----
  // A small glass house and a yard under a net; the agronomist grows saplings (levels.md, level 26).
  { id: 'nursery', bg: 'Разсадник', en: 'Nursery', unlock: 26, costWeight: 0.04, energy: 1.5, staffedFrom: 26, levelAt: since(26) },
  // An electric furnace melts stone at about 1500 °C: a heavy user of power (levels.md, level 27).
  { id: 'woolworks', bg: 'Цех за каменна вата', en: 'Rock wool works', unlock: 27, costWeight: 0.05, energy: 15, staffedFrom: 27,
    levelAt: since(27) },
  // Crusher and magnet (geologist) and mill (engineer): iron back to the smelters (levels.md, level 28).
  { id: 'slagmill', bg: 'Мелница за шлака', en: 'Slag mill', unlock: 28, costWeight: 0.05, energy: 6, staffedFrom: 28, levelAt: since(28) },
  // Key building of chapter 4: level L-29 for Ark level L (levels.md); two engineers, furnace and rollers.
  { id: 'glassworks', bg: 'Стъкларска пещ', en: 'Glassworks', unlock: 30, costWeight: 0.06, energy: 18, staffedFrom: 30,
    levelAt: since(30) },
  // ---- 0.2: chapter 4 (levels.md 31-39) ----
  { id: 'university', bg: 'Университет', en: 'University', unlock: 31, costWeight: 0.04, energy: 1.5, staffedFrom: 31, levelAt: since(31) },
  { id: 'park', bg: 'Парк', en: 'Park', unlock: 32, costWeight: 0.04, energy: 1, staffedFrom: 32, levelAt: since(32) },
  { id: 'dispatch', bg: 'Диспечерска', en: 'Dispatch', unlock: 33, costWeight: 0.04, energy: 1.5, staffedFrom: 33, levelAt: since(33) },
  // Built with "Строй" without a blueprint (levels.md, level 34); catches up two levels per Ark level, like the
  // second smelter (proposal).
  { id: 'greenhouse4', bg: 'Четвърта оранжерия', en: 'Fourth greenhouse', unlock: 34, costWeight: 0.06, silicon: true, energy: 5,
    staffedFrom: 34, levelAt: (L) => Math.max(1, 2 * (L - 34) + 1) },
  { id: 'medpost', bg: 'Медицински пункт', en: 'Medical post', unlock: 35, costWeight: 0.04, energy: 1, staffedFrom: 35, levelAt: since(35) },
  // The press and two machines (builder and maintenance technician); paving costs stone from the store.
  { id: 'roaddepot', bg: 'Пътна база', en: 'Road depot', unlock: 36, costWeight: 0.04, energy: 3, staffedFrom: 36, levelAt: since(36) },
  { id: 'weather', bg: 'Метеостанция', en: 'Weather station', unlock: 37, costWeight: 0.04, energy: 1, staffedFrom: 37, levelAt: since(37) },
  // Cold and rock wool keep the seeds without power; only the small glass room with lamps uses some.
  { id: 'seedvault', bg: 'Семенен трезор', en: 'Seed vault', unlock: 38, costWeight: 0.05, energy: 1, staffedFrom: 38, levelAt: since(38) },
]

/** Colonists at the start of Ark level L (COLONISTS holds the count at the end of each level). */
function colonistsAt(L: number): number {
  return COLONISTS[L - 1] ?? COLONISTS[40]!
}
