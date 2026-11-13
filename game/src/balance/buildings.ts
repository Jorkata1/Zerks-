import { COLONISTS } from './data.js'

// The buildings of levels 1-25 and the rules for their level while the Ark is on level L.
// Unlock levels and who works where come from docs/levels.md; cost weights and energy are proposals.

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
  // The second smelter catches up two levels per Ark level (proposal: its first levels are cheap and quick).
  { id: 'smelter2', bg: 'Втора топилня', en: 'Second smelter', unlock: 22, costWeight: 0.06, energy: 20, staffedFrom: 22,
    levelAt: (L) => Math.max(1, 2 * (L - 22) + 1) },
  { id: 'treatment', bg: 'Пречиствателна станция', en: 'Treatment plant', unlock: 23, costWeight: 0.05, energy: 4, staffedFrom: 23, levelAt: since(23) },
  { id: 'fieldstation', bg: 'Полева станция', en: 'Field station', unlock: 25, costWeight: 0.04, energy: 1, staffedFrom: 25, levelAt: since(25) },
]

/** Colonists at the start of Ark level L (COLONISTS holds the count at the end of each level). */
function colonistsAt(L: number): number {
  return COLONISTS[L - 1] ?? COLONISTS[25]!
}
