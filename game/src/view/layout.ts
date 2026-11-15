// What stands where on the map, for each level the build can show: level 10 (stage 1, the end of chapter 1) and
// level 20 (stage 2, the end of chapter 2). Pure data, so tools/models.ts can read it without three.js.
// The grid: plot (d, s) with d = i - j across the screen and s = i + j along it (positive = towards the camera);
// its centre is (16 i, 16 j). The buildings follow docs/levels.md; where levels.md says where a building goes
// ("next to the silicon furnace", "on the shore of the ice"), it goes on the nearest free plot there.
// Placement and the building levels that levels.md does not give are a proposal.

export interface Building {
  /** Plot on the grid. */
  d: number
  s: number
  id: string
  /** In English, as in the game. */
  name: string
  level: number
  /** The model in art/3d/buildings. */
  model: string
  /** Footprint in metres (fit), or a fixed scale in metres per Blender unit (k). */
  size?: number
  k?: number
  /** A second line in the panel instead of "Level n". */
  sub?: string
  /** Dug into the ground (the clay pit): its own ground is at the plot, the plot does not cover it. */
  dug?: boolean
}

export interface Layout {
  level: number
  /** The page title and the tag on the screen. */
  title: string
  tag: string
  /** Atmosphere now and the percent the next level asks (concept.md, balance.json). */
  atmo: number
  atmoNext: number
  colonists: number
  /** Zone I: how far the built plots reach back (towards the closed zone) and to the front; |d| <= 2. */
  reach: number
  front: number
  /** Plots outside that band that are built on (the shore of the Ice Hollow). */
  extra: [number, number][]
  ark: string
  /** The dock with the ship's frame on the Ark's plot (from level 12). */
  dock?: string
  buildings: Building[]
  /** The sign at the edge of the closed zone. */
  zone: string
  /** Who walks outside, by name (art/3d/characters/looks.json). */
  outside: string[]
  /** Where the camera starts: metres across the screen and the point looked at. */
  view: [number, number, number]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** The service channel along the streets: [x1, z1, x2, z2]. */
  lines: [number, number, number, number][]
}

const O = 1.35 // the channel runs this far inside the street's edge
const LINES_10: [number, number, number, number][] = [
  [8 - O, -24 - O, 8 - O, 40], [-24 - O, 8 - O, 40, 8 - O], [24 - O, 8 - O, 24 - O, 24], [-24 - O, -24 - O, 8 - O, -24 - O], [-24 - O, -24 - O, -24 - O, 8 - O],
]

/** The chapter 1 buildings on their level 10 plots (mockup/src/map.js, Joro 05-06.11.2026). */
const CHAPTER_1: Building[] = [
  { d: 1, s: 1, id: 'drill', name: 'Carbon drill', level: 10, model: 'drill', size: 9.6 },
  { d: -1, s: 1, id: 'pump', name: 'Water pump', level: 10, model: 'pump', size: 8.2 },
  { d: 0, s: 4, id: 'processor', name: 'Atmosphere processor', level: 10, model: 'processor', size: 7.6 },
  { d: -1, s: -3, id: 'research', name: 'Research station', level: 10, model: 'research-1', k: 4.3 },
  { d: 0, s: 2, id: 'veglab', name: 'Vegetable lab', level: 10, model: 'veglab', size: 9.6 },
  { d: 1, s: -3, id: 'home', name: 'Colonists\' home', level: 10, model: 'home-10', k: 4.3 },
  { d: 2, s: 0, id: 'kitchen', name: 'Common kitchen', level: 10, model: 'kitchen', size: 10.2 },
  { d: -2, s: 0, id: 'mine', name: 'Mine', level: 10, model: 'mine', size: 10 },
  { d: -2, s: -2, id: 'furnace', name: 'Silicon furnace', level: 10, model: 'furnace', size: 8.8 },
  { d: 2, s: -2, id: 'warehouse', name: 'Store', level: 10, model: 'warehouse', size: 10 },
  { d: 2, s: 2, id: 'greenhouse', name: 'Greenhouse', level: 10, model: 'greenhouse', size: 10.4 },
  { d: -2, s: 2, id: 'geolocator', name: 'Geolocator', level: 10, model: 'geolocator', size: 9.4 },
  { d: 1, s: 3, id: 'solar', name: 'Solar panels', level: 10, model: 'solar', size: 11.0 },
  { d: -1, s: 3, id: 'batteries', name: 'Batteries', level: 10, model: 'batteries', size: 6.0 },
]

/** The same building at its level 20 look: same plot, the variant of level 20 at the scale its level 10 had. */
const at20 = (id: string, level: number, model: string, k: number): Building => {
  const b = CHAPTER_1.find((x) => x.id === id)!
  return { d: b.d, s: b.s, id, name: b.name, level, model, k }
}

export const LAYOUTS: Record<number, Layout> = {
  10: {
    level: 10, title: 'Zerks-X6 Stage 1', tag: 'Stage 1 test', atmo: 28, atmoNext: 30, colonists: 10,
    reach: 3, front: 4, extra: [], ark: 'ark', buildings: CHAPTER_1, zone: 'ZONE II',
    outside: ['Maya Okafor', 'Lena Sorensen', 'Tomas Varga', 'Ravi Menon', 'Ana Lima'],
    view: [68, 0, 0], bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 }, lines: LINES_10,
  },
  // Level 20, "The hull" (levels.md): the end of chapter 2. Zone II, the South Slope, is open (research at level 10);
  // zone III, the Green Belt, opens at level 21 and still lies under dust. 21 colonists; the air is 33%.
  20: {
    level: 20, title: 'Stage 2 тест от Жоро', tag: 'Stage 2 test', atmo: 33, atmoNext: 33, colonists: 21,
    reach: 7, front: 4, extra: [[-1, 5]], ark: 'ark-18', dock: 'dock-4',
    buildings: [
      // chapter 1, grown: home, kitchen and store at 20, the first greenhouse at 19 (levels.md, level 19 and 20)
      at20('drill', 20, 'drill-20', 9.6 / 2.02),
      { ...CHAPTER_1[1]!, level: 18 },
      { ...CHAPTER_1[2]!, level: 16 },
      at20('research', 12, 'research-10', 4.3),
      { ...CHAPTER_1[4]!, level: 15 },
      at20('home', 20, 'home-20', 4.3),
      at20('kitchen', 20, 'kitchen-20', 3.85),
      { ...CHAPTER_1[7]!, level: 15 },
      { ...CHAPTER_1[8]!, level: 15 },
      at20('warehouse', 20, 'warehouse-20', 10 / 2.41),
      at20('greenhouse', 19, 'greenhouse-20', 10.4 / 2.84),
      { ...CHAPTER_1[11]!, level: 10 },
      at20('solar', 20, 'solar-20', 11.0 / 3.13),
      at20('batteries', 18, 'batteries-20', 6.0 / 1.8),
      // the South Slope (zone II): the smelter next to the silicon furnace (11), the copper works next to the smelter
      // (19), the brick home next to the first home (20), the second (11) and third (16) greenhouses
      { d: -2, s: -4, id: 'smelter', name: 'Smelter', level: 13, model: 'smelter', k: 4.15 },
      { d: -1, s: -5, id: 'copperworks', name: 'Copper works', level: 1, model: 'copperworks', k: 4.15 },
      { d: 0, s: -4, id: 'brickhome', name: 'Brick home', level: 1, model: 'brickhome-1', k: 4.5 },
      { d: 2, s: -4, id: 'greenhouse2', name: 'Greenhouse', level: 10, model: 'greenhouse-10', k: 10.4 / 2.84 },
      { d: 1, s: -5, id: 'greenhouse3', name: 'Greenhouse', level: 5, model: 'greenhouse-1', k: 10.4 / 2.84 },
      // the Ice Hollow: the clay pit on the shore of the ice (13), the brick kiln next to it (15)
      { d: -1, s: 5, id: 'claypit', name: 'Clay pit', level: 7, model: 'claypit', k: 4.15, dug: true },
      { d: -2, s: 4, id: 'kiln', name: 'Brick kiln', level: 5, model: 'brickkiln', k: 4.15 },
      // the canteen (20): next to the kitchen there is no free plot, so on the nearest free one in front
      { d: 2, s: 4, id: 'canteen', name: 'Canteen', level: 1, model: 'canteen-1', k: 4.5 },
    ],
    zone: 'ZONE III',
    outside: ['Maya Okafor', 'Lena Sorensen', 'Tomas Varga', 'Ravi Menon', 'Ana Lima', 'Kenji Mori', 'Grace Mensah'],
    view: [72, -12, -12], bounds: { minX: -80, maxX: 70, minZ: -80, maxZ: 70 },
    lines: [
      [8 - O, -24 - O, 8 - O, 40], [-24 - O, 8 - O, 56, 8 - O], [24 - O, 8 - O, 24 - O, 24], [-24 - O, -24 - O, 8 - O, -24 - O],
      [-24 - O, -24 - O, -24 - O, 8 - O],
      // up into the South Slope, and along the street by the shore of the Ice Hollow
      [-24 - O, -56, -24 - O, -24 - O], [-56, -40 - O, -8, -40 - O], [8 - O, 40 - O, 40, 40 - O],
    ],
  },
}

/** The level this build shows: VITE_ZERKS_LEVEL=10 for stage 1, 20 (the default) for stage 2. */
export function layoutFor(level: string | number | undefined): Layout {
  const l = LAYOUTS[Number(level ?? 20)]
  if (!l) throw new Error(`no layout for level ${level}`)
  return l
}

/** The building models a layout needs, the Ark and its dock first. */
export function buildingModels(l: Layout): string[] {
  return [...new Set([l.ark, ...(l.dock ? [l.dock] : []), ...l.buildings.map((b) => b.model), 'drone', 'rover'])]
}
