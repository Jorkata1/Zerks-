using System;
using System.Collections.Generic;
using System.Linq;

namespace Zerks.Sim
{
    /// <summary>Who works where (levels.md, "Специалностите"). New ones go at the end: a save keeps them as numbers.</summary>
    public enum Profession { None, Cook, Agronomist, Geologist, Engineer, Scientist, Builder, Dispatcher, Doctor, Technician }

    /// <summary>
    /// A building and where it stands (docs/levels.md; plots from mockup/map.html#lvl10 and game/src/view/layout.ts, level 20;
    /// the plots of chapters 3 and 4 are a proposal of 28.11.2026: the Green Belt behind the South Slope, the sides of the colony).
    /// </summary>
    public sealed class BuildingDef
    {
        public string Id;
        public string Name;
        string kind;
        /// <summary>The type it is one of: the second and third greenhouse are greenhouses (numbers, models, what it makes).</summary>
        public string Kind { get => kind ?? Id; set => kind = value; }
        /// <summary>Plot on the street grid: d across the screen, s along it (as in game/src/view/world.ts).</summary>
        public int D, S;
        /// <summary>0 = open from the start, 1 = under the dust until "Zone I expansion" (level 4), 2 = Zone II, the South Slope (level 10).</summary>
        public int Zone;
        /// <summary>Who works here; None = no workplace (levels.md: geolocator, batteries, store, homes).</summary>
        public Profession Worker;
        /// <summary>Research that gives the blueprint (null = the five tutorial buildings).</summary>
        public string Blueprint;
        /// <summary>Atmosphere needed to build it (greenhouse: 20%).</summary>
        public int MinAtmo;
        /// <summary>Ark level on which it can be built, when it differs from its kind's (the second greenhouse on 11, the third on 16).</summary>
        public int Unlock;
        /// <summary>Dug down into the ground (the clay pit): the map cuts its ground open over it.</summary>
        public bool Dug;
        /// <summary>What it costs besides its print (proposal: the bricks and the cables of the brick home and the canteen, levels.md level 20).</summary>
        public Bag Extra;
        /// <summary>One-line description for the panel.</summary>
        public string About;
        /// <summary>Model files by building level: level -> GLB name (art/3d/buildings).</summary>
        public SortedDictionary<int, string> Models = new SortedDictionary<int, string>();
        /// <summary>Outside the "all buildings on level L" rule.</summary>
        public bool OutsideAllRule;
        /// <summary>A workplace for each profession, when it has more than one (the slag mill, the glassworks, the road depot).</summary>
        public Profession[] SlotWorkers;
        /// <summary>Gets the special upgrade "Insulation" on level 29 (the brick home, the canteen, the three greenhouses).</summary>
        public bool Insulates;
        /// <summary>A building for happiness: after a storm it wants care (levels.md, "Щастие").</summary>
        public bool CareSign;

        public float X => (S + D) / 2f * Content.Pitch;
        public float Z => (S - D) / 2f * Content.Pitch;

        public string ModelFor(int level)
        {
            string m = null;
            foreach (var kv in Models) if (kv.Key <= Math.Max(1, level)) m = kv.Value;
            return m ?? Models.Values.FirstOrDefault();
        }

        public bool HasWorkplace => Worker != Profession.None;

        /// <summary>Who works in a slot: the profession of that place.</summary>
        public Profession WorkerAt(int slot) => SlotWorkers != null && slot >= 0 && slot < SlotWorkers.Length ? SlotWorkers[slot] : Worker;

        /// <summary>The model on the map: its level's variant, insulated ("-1i", "-10i", "-20i") once it has the insulation.</summary>
        public string ModelFor(int level, bool insulated) => insulated && Insulates ? ModelFor(level) + "i" : ModelFor(level);
    }

    public sealed class ResearchDef
    {
        public string Id;
        public string Branch; // Industry, Life, Colony, Space
        public int Order;
        public string Name;
        public string Effect;
        public int ArkLevel;
        public int MinAtmo;
        /// <summary>Game minutes (levels.md, "Веригите").</summary>
        public double Minutes;
        /// <summary>
        /// The research it waits for, when it is not the one before it in its branch: "-" for none. Two of one branch
        /// run side by side when levels.md says so (the console and the clay pit on 13, the brick home and the canteen on 20).
        /// </summary>
        public string After;
        /// <summary>What it costs to start ("Медни шини": 200 copper ore).</summary>
        public Bag Cost;
    }

    /// <summary>A stage of the hull or of the ship's reactor in the dock (levels.md, "Строежът и корабът"; the costs are a proposal).</summary>
    public sealed class ShipStage
    {
        public string Part;
        public int Stage, ArkLevel;
        public Bag Cost = new Bag();
        public double Minutes;
        /// <summary>The research the fabricator needs first ("Стоманени листове" for the hull, "Реакторен съд" for the vessel).</summary>
        public string Research;
        public string Name;
    }

    /// <summary>What the Ark needs to reach a level (levels.md, "Изисквания за ниво L").</summary>
    public sealed class LevelReq
    {
        public int Level;
        public Bag Res = new Bag();
        public int Atmo;
        public int Colonists;
        /// <summary>Required building levels; to level 11 every other building must be on level L as well (without the research station).</summary>
        public Dictionary<string, int> Overrides = new Dictionary<string, int>();
        public string[] Research = Array.Empty<string>();
        public bool MineIron;
        public double EnergyRatio; // production / demand by day
        public bool NightWithoutShortage;
        public bool ResearchStationUpgraded;
        public bool LabPotatoes;

        // ---- from level 12 (levels.md, general rule 2) ----
        /// <summary>From level 12: no more "all buildings"; beds, seats and every workplace taken instead.</summary>
        public bool ForEveryone;
        /// <summary>The store on this level.</summary>
        public int Store;
        /// <summary>New buildings that only have to stand (the clay pit, the brick kiln, the copper works, the brick home, the canteen).</summary>
        public string[] Built = Array.Empty<string>();
        /// <summary>Stages of the frame done in the dock.</summary>
        public int Frame;
        public bool Builder;
        /// <summary>Greenhouses that stand, and the first one gives food (level 17).</summary>
        public int Greenhouses;
        public bool GreenhouseFood;
        public bool Antenna;
        public bool MineCopper;

        // ---- chapters 3 and 4 (levels.md, levels 21-40) ----
        public int Hull, Reactor;
        public bool ReactorTested;
        /// <summary>Patches of the Green Belt on at least this stage (1 lichen, 2 moss, 4 grass, 5 sea buckthorn).</summary>
        public int Patches, PatchStage;
        /// <summary>The brick home, the canteen and the three greenhouses with the insulation (level 29).</summary>
        public int Insulated;
        /// <summary>The streets round the Ark paved (level 36).</summary>
        public bool PavedArk;
    }

    /// <summary>One stage of the ship's frame in the dock (levels.md, "Строежът и корабът").</summary>
    public sealed class FrameStage
    {
        public int Stage, ArkLevel;
        public double Steel;
        /// <summary>Game minutes the Ark's fabricator and the cranes need (proposal).</summary>
        public double Minutes;
    }

    /// <summary>Everything chapters 1 to 4 are made of, from docs/levels.md 2.16 (and concept.md for the screen and ECHO).</summary>
    public static class Content
    {
        public const float Pitch = 16f;
        /// <summary>Chapter 4 ends when the Ark reaches level 40; level 40 itself is not written yet (levels.md 2.16).</summary>
        public const int LastLevel = 40;

        // ---------- Buildings ----------

        public static readonly List<BuildingDef> Buildings = new List<BuildingDef>
        {
            new BuildingDef { Id = "geolocator", Name = "Geolocator", D = -2, S = 2, Zone = 0, Worker = Profession.None,
                About = "Seismic station: listens to the rock and measures the air.", Models = { [1] = "geolocator" } },
            new BuildingDef { Id = "drill", Name = "Carbon drill", D = 1, S = 1, Zone = 0, Worker = Profession.Geologist,
                About = "Drills the carbon deposit.", Models = { [1] = "drill-1", [10] = "drill-10", [20] = "drill-20" } },
            new BuildingDef { Id = "pump", Name = "Water pump", D = -1, S = 1, Zone = 0, Worker = Profession.Engineer,
                About = "Melts and pumps the ice in the shadow of the rocks.", Models = { [1] = "pump" } },
            new BuildingDef { Id = "processor", Name = "Atmosphere processor", D = 0, S = 4, Zone = 0, Worker = Profession.Engineer,
                About = "Turns water and carbon into air, slowly.", Models = { [1] = "processor" } },
            new BuildingDef { Id = "veglab", Name = "Vegetable lab", D = 0, S = 2, Zone = 0, Worker = Profession.Agronomist,
                About = "Grows food under light, and a little air.", Models = { [1] = "veglab" } },
            new BuildingDef { Id = "research", Name = "Research station", D = -1, S = -3, Zone = 0, Worker = Profession.Scientist,
                About = "Blueprints and bonuses. One project at a time.", Models = { [1] = "research-1", [2] = "research-10" }, OutsideAllRule = true },
            new BuildingDef { Id = "mine", Name = "Mine", D = -2, S = 0, Zone = 0, Worker = Profession.Geologist, Blueprint = "bp_mine",
                About = "A tunnel in the canyon wall. Each miner digs what you choose.", Models = { [1] = "mine-portal", [10] = "mine" } },
            new BuildingDef { Id = "home", Name = "Colonists' Home", D = 1, S = -3, Zone = 0, Worker = Profession.None, Blueprint = "bp_home",
                About = "Beds for the colonists. Every upgrade makes it cosier.", Models = { [1] = "home-1", [10] = "home-10", [20] = "home-20" } },
            new BuildingDef { Id = "kitchen", Name = "Common Kitchen", D = 2, S = 0, Zone = 0, Worker = Profession.Cook, Blueprint = "bp_kitchen",
                About = "A cook makes meals; everyone eats here.", Models = { [1] = "kitchen-1", [10] = "kitchen-10", [20] = "kitchen-20" } },
            new BuildingDef { Id = "warehouse", Name = "Store", D = 2, S = -2, Zone = 1, Worker = Profession.None, Blueprint = "bp_warehouse",
                About = "Raises the ceiling of every stock.", Models = { [1] = "warehouse-1", [10] = "warehouse-10", [20] = "warehouse-20" } },
            new BuildingDef { Id = "furnace", Name = "Silicon furnace", D = -2, S = -2, Zone = 1, Worker = Profession.Engineer, Blueprint = "bp_furnace",
                About = "Quartz + carbon + a lot of power = silicon. It smokes until it has a filter.", Models = { [1] = "furnace" } },
            new BuildingDef { Id = "solar", Name = "Solar panels", D = 1, S = 3, Zone = 1, Worker = Profession.Engineer, Blueprint = "bp_solar",
                About = "One field of panels that grows with upgrades. A worker keeps the dust off: +20%.", Models = { [1] = "solar-1", [10] = "solar-10", [20] = "solar-20" } },
            new BuildingDef { Id = "batteries", Name = "Batteries", D = -1, S = 3, Zone = 1, Worker = Profession.None, Blueprint = "bp_batteries",
                About = "Store the day's surplus for the night.", Models = { [1] = "batteries-1", [10] = "batteries-10", [20] = "batteries-20" } },
            new BuildingDef { Id = "greenhouse", Name = "Greenhouse", D = 2, S = 2, Zone = 1, Worker = Profession.Agronomist, Blueprint = "bp_greenhouse",
                MinAtmo = 20, About = "Plants under glass make more air than the machines. Lit at night.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" }, Insulates = true },

            // ---- chapter 2 (levels.md, levels 11-20; the plots are the ones of stage 2, game/src/view/layout.ts, a proposal) ----
            // The South Slope (zone II): the smelter next to the silicon furnace, the copper works next to the smelter, the
            // brick home next to the first home, the second and the third greenhouse.
            new BuildingDef { Id = "smelter", Name = "Smelter", D = -2, S = -4, Zone = 2, Worker = Profession.Engineer, Blueprint = "bp_smelter",
                About = "Iron ore + carbon + a lot of power = steel. It smokes until it has a filter.", Models = { [1] = "smelter" } },
            new BuildingDef { Id = "greenhouse2", Kind = "greenhouse", Name = "Greenhouse 2", D = 2, S = -4, Zone = 2, Worker = Profession.Agronomist,
                Blueprint = "bp_greenhouse", MinAtmo = 20, Unlock = 11,
                About = "The second greenhouse, on the South Slope: sun all day.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" }, Insulates = true },
            // The Ice Hollow: the clay pit on the bank of the ice, the brick kiln next to it.
            new BuildingDef { Id = "claypit", Name = "Clay pit", D = -1, S = 5, Zone = 1, Worker = Profession.Geologist, Blueprint = "bp_claypit", Dug = true,
                About = "Dug down on the bank of the ice: red regolith on top, layers of clay under it.", Models = { [1] = "claypit" } },
            new BuildingDef { Id = "kiln", Name = "Brick kiln", D = -2, S = 4, Zone = 1, Worker = Profession.Engineer, Blueprint = "bp_kiln",
                About = "Clay + power = bricks. Electric, so no smoke.", Models = { [1] = "brickkiln" } },
            new BuildingDef { Id = "greenhouse3", Kind = "greenhouse", Name = "Greenhouse 3", D = 1, S = -5, Zone = 2, Worker = Profession.Agronomist,
                Blueprint = "bp_greenhouse", MinAtmo = 20, Unlock = 16,
                About = "The third greenhouse, on the South Slope.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" }, Insulates = true },
            new BuildingDef { Id = "copperworks", Name = "Copper works", D = -1, S = -5, Zone = 2, Worker = Profession.Engineer, Blueprint = "bp_copperworks",
                About = "Copper ore in acid, pure copper on plates with power, drawn into wire: cables. No smoke, a lot of power.", Models = { [1] = "copperworks" } },
            new BuildingDef { Id = "brickhome", Name = "Brick home", D = 0, S = -4, Zone = 2, Worker = Profession.None, Blueprint = "bp_brickhome",
                Extra = Bag((Res.Bricks, 800), (Res.Cables, 150)),
                About = "The second home, printed from paste with our crushed bricks: reddish, stronger and warmer walls.",
                Models = { [1] = "brickhome-1", [10] = "brickhome-10", [20] = "brickhome-20" }, Insulates = true },
            // The canteen: next to the kitchen there is no free plot, so on the nearest free one in front (stage 2).
            new BuildingDef { Id = "canteen", Name = "Canteen", D = 2, S = 4, Zone = 1, Worker = Profession.Cook, Blueprint = "bp_canteen",
                Extra = Bag((Res.Cables, 150)),
                About = "The second place to eat, for the colonists from the 21st on. A cook makes meals here.",
                Models = { [1] = "canteen-1", [10] = "canteen-10", [20] = "canteen-20" }, Insulates = true },

            // ---- chapter 3 (levels.md, levels 21-30) and chapter 4 (31-39); the plots are a proposal (28.11.2026) ----
            // Zone III opens with "Zone III expansion" on level 21: the Green Belt, the terrace behind the South Slope at the
            // back of the canyon, and the strips along both sides of the colony under the walls.
            new BuildingDef { Id = "smelter2", Kind = "smelter", Name = "Smelter 2", D = -3, S = -5, Zone = 3, Worker = Profession.Engineer,
                Blueprint = "bp_smelter", Unlock = 22, About = "The second smelter, next to the first: the hull wants a lot of steel.", Models = { [1] = "smelter" } },
            new BuildingDef { Id = "treatment", Name = "Treatment plant", D = 2, S = 6, Zone = 3, Worker = Profession.Engineer, Blueprint = "bp_treatment",
                About = "The water of the homes and the kitchens comes down to it on its own; it goes up to the Green Belt for the patches.", Models = { [1] = "pstation" } },
            new BuildingDef { Id = "fieldstation", Name = "Field station", D = -1, S = -7, Zone = 3, Worker = Profession.Agronomist, Blueprint = "bp_fieldstation",
                About = "On the edge of the Green Belt: the agronomist gathers the grass seeds and picks the berries.", Models = { [1] = "fieldstation" } },
            new BuildingDef { Id = "nursery", Name = "Nursery", D = 1, S = -7, Zone = 3, Worker = Profession.Agronomist, Blueprint = "bp_nursery",
                About = "Seeds sprout under glass; in the yard under the net the saplings get used to the cold.", Models = { [1] = "nursery" } },
            new BuildingDef { Id = "woolworks", Name = "Rock wool works", D = -3, S = -3, Zone = 3, Worker = Profession.Engineer, Blueprint = "bp_woolworks",
                About = "Stone melted at 1,500 °C and spun into fibres: rock wool for the hull and the walls. No smoke, a lot of power.", Models = { [1] = "woolworks" } },
            new BuildingDef { Id = "slagmill", Name = "Slag mill", D = -2, S = -6, Zone = 3, Worker = Profession.Geologist,
                SlotWorkers = new[] { Profession.Geologist, Profession.Engineer }, Blueprint = "bp_slagmill",
                About = "The magnet takes the iron out of the slag for the smelters; the mill grinds the rest into fertiliser and lime.", Models = { [1] = "slagmill" } },
            new BuildingDef { Id = "glassworks", Name = "Glassworks", D = -3, S = -1, Zone = 3, Worker = Profession.Engineer,
                SlotWorkers = new[] { Profession.Engineer, Profession.Engineer }, Blueprint = "bp_glassworks", Extra = Bag((Res.Steel, 300)),
                About = "Quartz with lime from the slag mill, melted without soda at 1,500 °C and rolled into sheets.", Models = { [1] = "glassworks" } },
            new BuildingDef { Id = "university", Name = "University", D = 0, S = -6, Zone = 3, Worker = Profession.Scientist, Blueprint = "bp_university",
                Extra = Bag((Res.Glass, 200)), About = "Two people learn each other's work in the evenings; then you swap them.", Models = { [1] = "university" } },
            new BuildingDef { Id = "park", Name = "Park", D = 2, S = -6, Zone = 3, Worker = Profession.Agronomist, Blueprint = "bp_park", CareSign = true,
                Extra = Bag((Res.Glass, 150), (Res.Saplings, 40)), About = "Grass, sea buckthorn and benches under a dome of our glass. A gardener keeps it.", Models = { [1] = "park" } },
            new BuildingDef { Id = "dispatch", Name = "Dispatch", D = 3, S = -1, Zone = 3, Worker = Profession.Dispatcher, Blueprint = "bp_dispatch",
                Extra = Bag((Res.Glass, 100), (Res.Steel, 300), (Res.Cables, 200)),
                About = "The sensors of every building on one console. The buildings it manages give more.", Models = { [1] = "dispatch" } },
            new BuildingDef { Id = "greenhouse4", Kind = "greenhouse", Name = "Greenhouse 4", D = 0, S = -8, Zone = 3, Worker = Profession.Agronomist,
                Blueprint = "bp_greenhouse", MinAtmo = 20, Unlock = 34, Extra = Bag((Res.Glass, 300), (Res.Steel, 200)),
                About = "The fourth greenhouse, on the Green Belt: the first all of our own glass.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" } },
            new BuildingDef { Id = "medpost", Name = "Medical post", D = 3, S = -3, Zone = 3, Worker = Profession.Doctor, Blueprint = "bp_medpost", CareSign = true,
                About = "A surgery and two beds. The doctor sees the people and checks the seals of the suits.", Models = { [1] = "medpost" } },
            new BuildingDef { Id = "roaddepot", Name = "Road depot", D = -3, S = 1, Zone = 3, Worker = Profession.Builder,
                SlotWorkers = new[] { Profession.Builder, Profession.Technician }, Blueprint = "bp_roaddepot", CareSign = true,
                About = "The road builder paves the streets one by one; the technician sweeps them and changes the cracked pavers.", Models = { [1] = "roaddepot" } },
            new BuildingDef { Id = "weather", Name = "Weather station", D = 0, S = -12, Zone = 3, Worker = Profession.Scientist, Blueprint = "bp_weather",
                Extra = Bag((Res.Steel, 200), (Res.Cables, 100)),
                About = "The mast over the rim and the lidar: when the storm comes and how strong.", Models = { [1] = "weather" } },
            new BuildingDef { Id = "seedvault", Name = "Seed vault", D = -2, S = 8, Zone = 3, Worker = Profession.Agronomist, Blueprint = "bp_seedvault",
                Extra = Bag((Res.Wool, 300), (Res.Steel, 400)),
                About = "Earth's seeds, frozen without power. The agronomist tests which sprout and grows the hardiest.", Models = { [1] = "seedvault" } },
        };

        /// <summary>
        /// The patches of the Green Belt (levels.md, level 21; their plots are a proposal): not buildings, no workplace; they
        /// grow on their own. Six are asked for; the other two are for whoever wants more.
        /// </summary>
        public static readonly (string id, int d, int s)[] PatchPlots =
        {
            ("patch1", -2, -8), ("patch2", 2, -8), ("patch3", -1, -9), ("patch4", 1, -9), ("patch5", 0, -10), ("patch6", -2, -10),
            ("patch7", 2, -10), ("patch8", -1, -11),
        };

        /// <summary>The names of the stages of a patch.</summary>
        public static readonly string[] PatchStages = { "Bare rock", "Lichen", "Moss", "Thin soil", "Grass", "Sea buckthorn" };

        /// <summary>The four street blocks round the Ark (levels.md, level 36: "the streets round the Ark").</summary>
        public static readonly string[] ArkStreets = { "0,-2", "-1,-1", "1,-1", "0,0" };

        public static BuildingDef B(string id) => Buildings.First(b => b.Id == id);
        public static BuildingDef Find(string id) => Buildings.FirstOrDefault(b => b.Id == id);
        public static IEnumerable<BuildingDef> OfKind(string kind) => Buildings.Where(b => b.Kind == kind);
        public static readonly string[] Kinds = Buildings.Select(b => b.Kind).Distinct().ToArray();

        /// <summary>The name of a workplace: a building, or the Ark (the builder's place).</summary>
        public static string PlaceName(string id) => id == "ark" ? "The Ark" : string.IsNullOrEmpty(id) ? "—" : B(id).Name;

        /// <summary>The five buildings of the tutorial, in their order (levels.md, level 1).</summary>
        public static readonly string[] TutorialOrder = { "geolocator", "drill", "pump", "processor", "veglab" };

        /// <summary>Places in the mine by its level (levels.md: 1, 2 on 5, 3 on 10, 4 on 15, 5 on 20).</summary>
        public static int MineSlots(int mineLevel) => mineLevel >= 20 ? 5 : mineLevel >= 15 ? 4 : mineLevel >= 10 ? 3 : mineLevel >= 5 ? 2 : 1;

        /// <summary>What the mine can dig at its level (levels.md: stone; quartz on 5; iron ore on 10; copper on 15).</summary>
        public static List<Res> MineMaterials(int mineLevel)
        {
            var l = new List<Res> { Res.Stone };
            if (mineLevel >= 5) l.Add(Res.Quartz);
            if (mineLevel >= 10) l.Add(Res.Iron);
            if (mineLevel >= 15) l.Add(Res.Copper);
            return l;
        }

        /// <summary>Beds in a home: 4 to level 4, then one per level, 20 on its last level (levels.md).</summary>
        public static int Beds(int homeLevel) => homeLevel <= 0 ? 0 : homeLevel <= 4 ? 4 : Math.Min(20, homeLevel);

        /// <summary>Seats in a building for food: 8 to level 8, then one per level, 20 on its last level (levels.md).</summary>
        public static int Seats(int kitchenLevel) => kitchenLevel <= 0 ? 0 : kitchenLevel <= 8 ? 8 : Math.Min(20, kitchenLevel);

        /// <summary>Workplaces of a building at its level.</summary>
        public static int Slots(string id, int level, bool researchUpgraded)
        {
            if (level <= 0) return 0;
            switch (id)
            {
                case "mine": return MineSlots(level);
                case "research": return researchUpgraded ? 1 : 0;
                default: var def = B(id); return def.HasWorkplace ? def.SlotWorkers?.Length ?? 1 : 0;
            }
        }

        // ---------- Crops of the vegetable lab ----------

        public sealed class Crop
        {
            public string Id, Name, About;
            public int LabLevel;
            /// <summary>Food multiplier (balance model: potatoes x1.25, beans x1.25 more, wheat x1.2 more).</summary>
            public double Food;
            /// <summary>Game minutes between harvests: fast and little, or slow and much.</summary>
            public double Cycle;
        }

        public static readonly List<Crop> Crops = new List<Crop>
        {
            new Crop { Id = "veg", Name = "Vegetables", About = "Fast, a little food. For when you play.", LabLevel = 1, Food = 1.0, Cycle = 2 },
            new Crop { Id = "potato", Name = "Potatoes", About = "Slow, more food. Plant them before you leave.", LabLevel = 5, Food = 1.25, Cycle = 20 },
            new Crop { Id = "bean", Name = "Beans", About = "Medium speed, more food than vegetables.", LabLevel = 10, Food = 1.5625, Cycle = 8 },
            new Crop { Id = "wheat", Name = "Wheat", About = "Grows slowly, feeds the most. The kitchen bakes bread from it.", LabLevel = 15, Food = 1.875, Cycle = 30 },
        };

        // ---------- Research (levels.md, "Веригите" for levels 1-40) ----------

        public static readonly List<ResearchDef> Research = new List<ResearchDef>
        {
            new ResearchDef { Id = "drills", Branch = "Industry", Order = 1, Name = "Hardened drills", Effect = "+20% carbon", ArkLevel = 1, Minutes = 2 },
            new ResearchDef { Id = "bp_mine", Branch = "Industry", Order = 2, Name = "Blueprint: Mine", Effect = "Stone from the canyon wall", ArkLevel = 2, Minutes = 5 },
            new ResearchDef { Id = "pump_plus", Branch = "Industry", Order = 3, Name = "Improved pump", Effect = "+20% water", ArkLevel = 3, Minutes = 15 },
            new ResearchDef { Id = "bp_warehouse", Branch = "Industry", Order = 4, Name = "Blueprint: Store", Effect = "A bigger stock", ArkLevel = 4, Minutes = 20 },
            new ResearchDef { Id = "bp_furnace", Branch = "Industry", Order = 5, Name = "Blueprint: Silicon furnace", Effect = "Quartz + carbon = silicon", ArkLevel = 5, Minutes = 45 },
            new ResearchDef { Id = "bp_solar", Branch = "Industry", Order = 6, Name = "Blueprint: Solar panels", Effect = "Power from the sun", ArkLevel = 5, Minutes = 45 },
            new ResearchDef { Id = "furnace_filter", Branch = "Industry", Order = 7, Name = "Furnace filter", Effect = "No more smoke", ArkLevel = 6, Minutes = 60 },
            new ResearchDef { Id = "bp_batteries", Branch = "Industry", Order = 8, Name = "Blueprint: Batteries", Effect = "Power for the night", ArkLevel = 7, Minutes = 90 },
            new ResearchDef { Id = "wide_belts", Branch = "Industry", Order = 9, Name = "Wide belts", Effect = "+20% from the mine", ArkLevel = 7, Minutes = 90 },
            new ResearchDef { Id = "bp_smelter", Branch = "Industry", Order = 10, Name = "Blueprint: Smelter", Effect = "Iron ore + carbon = steel", ArkLevel = 11, Minutes = 180 },
            new ResearchDef { Id = "smelter_filter", Branch = "Industry", Order = 11, Name = "Smelter filter", Effect = "No smoke from the smelter", ArkLevel = 11, Minutes = 60 },
            new ResearchDef { Id = "good_steel", Branch = "Industry", Order = 12, Name = "Good steel", Effect = "+20% steel", ArkLevel = 12, Minutes = 180 },
            new ResearchDef { Id = "bp_kiln", Branch = "Industry", Order = 13, Name = "Blueprint: Brick kiln", Effect = "Clay + power = bricks", ArkLevel = 15, Minutes = 180 },
            new ResearchDef { Id = "copper_bars", Branch = "Industry", Order = 14, Name = "Copper bars", Effect = "Thick copper between panels, batteries and furnaces: batteries last 10% longer at night",
                ArkLevel = 18, Minutes = 240, Cost = Bag((Res.Copper, 200)) },
            new ResearchDef { Id = "bp_copperworks", Branch = "Industry", Order = 15, Name = "Blueprint: Copper works", Effect = "Copper ore = cables", ArkLevel = 19, Minutes = 240 },
            // chapters 3 and 4
            new ResearchDef { Id = "steel_sheets", Branch = "Industry", Order = 16, Name = "Steel sheets", Effect = "The fabricator rolls steel into sheets for the hull", ArkLevel = 22, Minutes = 240 },
            new ResearchDef { Id = "bp_woolworks", Branch = "Industry", Order = 17, Name = "Blueprint: Rock wool works", Effect = "Stone + power = rock wool for the hull", ArkLevel = 27, Minutes = 240 },
            new ResearchDef { Id = "bp_slagmill", Branch = "Industry", Order = 18, Name = "Blueprint: Slag mill", Effect = "Iron back to the smelters; fertiliser and lime", ArkLevel = 28, Minutes = 240 },
            new ResearchDef { Id = "bp_glassworks", Branch = "Industry", Order = 19, Name = "Blueprint: Glassworks", Effect = "Quartz + lime + power = glass", ArkLevel = 30, Minutes = 240 },
            new ResearchDef { Id = "clean_glass", Branch = "Industry", Order = 20, Name = "Clear glass", Effect = "The magnet takes the iron out of the quartz: +10% air and food from the greenhouses", ArkLevel = 34, Minutes = 240 },
            new ResearchDef { Id = "reactor_vessel", Branch = "Industry", Order = 21, Name = "Reactor vessel", Effect = "The fabricator forges the thick steel vessel of the reactor", ArkLevel = 34, Minutes = 300 },

            new ResearchDef { Id = "fast_seeds", Branch = "Life", Order = 1, Name = "Fast seeds", Effect = "+20% food", ArkLevel = 2, Minutes = 5 },
            new ResearchDef { Id = "processor_filter", Branch = "Life", Order = 2, Name = "Processor filter", Effect = "Air grows 15% faster", ArkLevel = 3, Minutes = 15 },
            new ResearchDef { Id = "bp_greenhouse", Branch = "Life", Order = 3, Name = "Blueprint: Greenhouse", Effect = "Plants make air under glass", ArkLevel = 8, MinAtmo = 20, Minutes = 120 },
            new ResearchDef { Id = "double_glass", Branch = "Life", Order = 4, Name = "Double glass", Effect = "Greenhouses use 20% less power at night", ArkLevel = 11, Minutes = 120 },
            new ResearchDef { Id = "tomatoes", Branch = "Life", Order = 5, Name = "Tomatoes", Effect = "+20% food from the greenhouses", ArkLevel = 16, Minutes = 180 },
            new ResearchDef { Id = "hardy_seedlings", Branch = "Life", Order = 6, Name = "Hardy seedlings", Effect = "Moss, grasses and shrubs that stand cold and dust: a seedling bed in each greenhouse",
                ArkLevel = 17, Minutes = 240 },
            new ResearchDef { Id = "lichens", Branch = "Life", Order = 7, Name = "Lichens", Effect = "They grow on bare rock and start the soil", ArkLevel = 21, Minutes = 180 },
            new ResearchDef { Id = "hydroseeding", Branch = "Life", Order = 8, Name = "Hydroseeding", Effect = "The drone sows grass with water and mulch", ArkLevel = 25, Minutes = 180 },
            new ResearchDef { Id = "buckthorn", Branch = "Life", Order = 9, Name = "Sea buckthorn", Effect = "Shrubs on the patches: nitrogen for the soil, and berries", ArkLevel = 26, Minutes = 240 },
            new ResearchDef { Id = "bp_seedvault", Branch = "Life", Order = 10, Name = "Blueprint: Seed vault", Effect = "Seeds for the fields and the forests", ArkLevel = 38, Minutes = 240 },

            new ResearchDef { Id = "bp_home", Branch = "Colony", Order = 1, Name = "Blueprint: Colonists' Home", Effect = "Beds for the first people", ArkLevel = 3, Minutes = 5 },
            new ResearchDef { Id = "bp_kitchen", Branch = "Colony", Order = 2, Name = "Blueprint: Common Kitchen", Effect = "Meals for everyone", ArkLevel = 3, Minutes = 5 },
            new ResearchDef { Id = "zone1", Branch = "Colony", Order = 3, Name = "Zone I expansion", Effect = "Clears the dust over the next plots", ArkLevel = 4, Minutes = 20 },
            new ResearchDef { Id = "long_shift", Branch = "Colony", Order = 4, Name = "Longer shift", Effect = "Workers gather twice as long while you are away", ArkLevel = 5, Minutes = 45 },
            new ResearchDef { Id = "short_upgrades", Branch = "Colony", Order = 5, Name = "Shorter upgrades", Effect = "-15% upgrade time", ArkLevel = 7, Minutes = 90 },
            new ResearchDef { Id = "zone2", Branch = "Colony", Order = 6, Name = "Zone II expansion", Effect = "The south slope: sun and room for greenhouses", ArkLevel = 10, Minutes = 180 },
            new ResearchDef { Id = "builder_console", Branch = "Colony", Order = 7, Name = "Builder's console", Effect = "A place in the Ark for a builder, who leads the drone: faster builds and upgrades",
                ArkLevel = 13, Minutes = 120 },
            new ResearchDef { Id = "bp_claypit", Branch = "Colony", Order = 8, Name = "Blueprint: Clay pit", Effect = "Clay from the bank of the ice", ArkLevel = 13, Minutes = 120, After = "zone2" },
            new ResearchDef { Id = "bp_brickhome", Branch = "Colony", Order = 9, Name = "Blueprint: Brick home", Effect = "A second home, from our bricks and with our cables", ArkLevel = 20, Minutes = 300 },
            new ResearchDef { Id = "bp_canteen", Branch = "Colony", Order = 10, Name = "Blueprint: Canteen", Effect = "A second place to eat", ArkLevel = 20, Minutes = 180, After = "bp_claypit" },
            new ResearchDef { Id = "zone3", Branch = "Colony", Order = 11, Name = "Zone III expansion", Effect = "The Green Belt: a rocky terrace, damp with the morning frost", ArkLevel = 21, Minutes = 300 },
            new ResearchDef { Id = "bp_treatment", Branch = "Colony", Order = 12, Name = "Blueprint: Treatment plant", Effect = "The water comes back, for the patches", ArkLevel = 23, Minutes = 240 },
            new ResearchDef { Id = "bp_fieldstation", Branch = "Colony", Order = 13, Name = "Blueprint: Field station", Effect = "An agronomist on the Green Belt: grass seeds", ArkLevel = 25, Minutes = 180 },
            new ResearchDef { Id = "bp_nursery", Branch = "Colony", Order = 14, Name = "Blueprint: Nursery", Effect = "Saplings, hardened in the yard", ArkLevel = 26, Minutes = 180 },
            new ResearchDef { Id = "insulation", Branch = "Colony", Order = 15, Name = "Insulation", Effect = "Rock wool on the brick home, the canteen and the greenhouses: 15% less power at night", ArkLevel = 29, Minutes = 180 },
            new ResearchDef { Id = "bp_university", Branch = "Colony", Order = 16, Name = "Blueprint: University", Effect = "Swapping work", ArkLevel = 31, Minutes = 300 },
            new ResearchDef { Id = "bp_park", Branch = "Colony", Order = 17, Name = "Blueprint: Park", Effect = "The first building for happiness", ArkLevel = 32, Minutes = 240 },
            new ResearchDef { Id = "bp_dispatch", Branch = "Colony", Order = 18, Name = "Blueprint: Dispatch", Effect = "Managing the buildings", ArkLevel = 33, Minutes = 240 },
            new ResearchDef { Id = "bp_medpost", Branch = "Colony", Order = 19, Name = "Blueprint: Medical post", Effect = "The doctor", ArkLevel = 35, Minutes = 240 },
            new ResearchDef { Id = "bp_roaddepot", Branch = "Colony", Order = 20, Name = "Blueprint: Road depot", Effect = "The roads and their upkeep", ArkLevel = 36, Minutes = 240 },

            new ResearchDef { Id = "fast_robot", Branch = "Space", Order = 1, Name = "Faster robot", Effect = "The collector robot drives faster", ArkLevel = 4, Minutes = 30 },
            new ResearchDef { Id = "big_cargo", Branch = "Space", Order = 2, Name = "Bigger cargo", Effect = "The collector robot carries more", ArkLevel = 9, Minutes = 180 },
            new ResearchDef { Id = "antenna", Branch = "Space", Order = 3, Name = "The Ark's antenna", Effect = "The map of the planet; the robot goes farther, where you send it",
                ArkLevel = 18, Minutes = 300 },
            new ResearchDef { Id = "bp_weather", Branch = "Space", Order = 4, Name = "Blueprint: Weather station", Effect = "When the storm comes, and \"Prepare the colony\"", ArkLevel = 37, Minutes = 240 },
        };

        public static ResearchDef R(string id) => Research.First(r => r.Id == id);
        public static readonly string[] Branches = { "Industry", "Life", "Colony", "Space" };

        /// <summary>The research this one waits for (or null).</summary>
        public static ResearchDef Previous(ResearchDef r)
        {
            if (r.After == "-") return null;
            if (r.After != null) return R(r.After);
            return Research.Where(x => x.Branch == r.Branch && x.Order < r.Order).OrderByDescending(x => x.Order).FirstOrDefault();
        }

        /// <summary>What ECHO recommends first on each level (levels.md: what leads to the next level).</summary>
        public static readonly Dictionary<int, string[]> Recommended = new Dictionary<int, string[]>
        {
            [1] = new[] { "drills" },
            [2] = new[] { "bp_mine", "fast_seeds" },
            [3] = new[] { "bp_home", "bp_kitchen", "pump_plus", "processor_filter" },
            [4] = new[] { "zone1", "bp_warehouse", "fast_robot" },
            [5] = new[] { "bp_furnace", "bp_solar", "long_shift" },
            [6] = new[] { "furnace_filter" },
            [7] = new[] { "bp_batteries", "short_upgrades", "wide_belts" },
            [8] = new[] { "bp_greenhouse" },
            [9] = new[] { "big_cargo" },
            [10] = new[] { "zone2" },
            [11] = new[] { "bp_smelter", "double_glass", "smelter_filter" },
            [12] = new[] { "good_steel" },
            [13] = new[] { "builder_console", "bp_claypit" },
            [15] = new[] { "bp_kiln" },
            [16] = new[] { "tomatoes" },
            [17] = new[] { "hardy_seedlings" },
            [18] = new[] { "antenna", "copper_bars" },
            [19] = new[] { "bp_copperworks" },
            [20] = new[] { "bp_brickhome", "bp_canteen" },
            [21] = new[] { "zone3", "lichens" },
            [22] = new[] { "steel_sheets" },
            [23] = new[] { "bp_treatment" },
            [25] = new[] { "hydroseeding", "bp_fieldstation" },
            [26] = new[] { "buckthorn", "bp_nursery" },
            [27] = new[] { "bp_woolworks" },
            [28] = new[] { "bp_slagmill" },
            [29] = new[] { "insulation" },
            [30] = new[] { "bp_glassworks" },
            [31] = new[] { "bp_university" },
            [32] = new[] { "bp_park" },
            [33] = new[] { "bp_dispatch" },
            [34] = new[] { "clean_glass", "reactor_vessel" },
            [35] = new[] { "bp_medpost" },
            [36] = new[] { "bp_roaddepot" },
            [37] = new[] { "bp_weather" },
            [38] = new[] { "bp_seedvault" },
        };

        // ---------- The ship ----------

        /// <summary>The frame in the dock (levels.md): stage 1 on level 12 (200 steel), 2 on 14 (500), 3 on 17 (1 000), 4 on 19 (1 500).</summary>
        public static readonly FrameStage[] Frame =
        {
            new FrameStage { Stage = 1, ArkLevel = 12, Steel = 200, Minutes = 30 },
            new FrameStage { Stage = 2, ArkLevel = 14, Steel = 500, Minutes = 45 },
            new FrameStage { Stage = 3, ArkLevel = 17, Steel = 1000, Minutes = 60 },
            new FrameStage { Stage = 4, ArkLevel = 19, Steel = 1500, Minutes = 90 },
        };

        /// <summary>
        /// The hull on the frame (levels.md: 22, 24, 27, 29; stages 1-2 from levels.md, 3-4 a proposal) and the ship's reactor
        /// in the middle of it (32, 34, 37, 39; a proposal: "how much the stages cost, we decide later"). The minutes are a proposal.
        /// </summary>
        public static readonly ShipStage[] Hull =
        {
            new ShipStage { Part = "hull", Stage = 1, ArkLevel = 22, Cost = Bag((Res.Steel, 2000), (Res.Cables, 100)), Minutes = 90, Research = "steel_sheets", Name = "the middle of both sides" },
            new ShipStage { Part = "hull", Stage = 2, ArkLevel = 24, Cost = Bag((Res.Steel, 3000), (Res.Cables, 200)), Minutes = 120, Research = "steel_sheets", Name = "the rest of the sides" },
            new ShipStage { Part = "hull", Stage = 3, ArkLevel = 27, Cost = Bag((Res.Steel, 4000), (Res.Cables, 300), (Res.Wool, 400)), Minutes = 150, Research = "steel_sheets", Name = "the bottom and the back" },
            new ShipStage { Part = "hull", Stage = 4, ArkLevel = 29, Cost = Bag((Res.Steel, 4500), (Res.Cables, 300), (Res.Wool, 400)), Minutes = 180, Research = "steel_sheets", Name = "the bow and the stern" },
        };

        public static readonly ShipStage[] ReactorStages =
        {
            new ShipStage { Part = "reactor", Stage = 1, ArkLevel = 32, Cost = Bag((Res.Steel, 3000), (Res.Wool, 200)), Minutes = 120, Name = "the compartment" },
            new ShipStage { Part = "reactor", Stage = 2, ArkLevel = 34, Cost = Bag((Res.Steel, 5000)), Minutes = 150, Research = "reactor_vessel", Name = "the vessel" },
            new ShipStage { Part = "reactor", Stage = 3, ArkLevel = 37, Cost = Bag((Res.Steel, 4000), (Res.Cables, 600)), Minutes = 150, Name = "the pipes and the generator" },
            new ShipStage { Part = "reactor", Stage = 4, ArkLevel = 39, Cost = new Bag(), Minutes = 60, Name = "the fuel" },
        };

        // ---------- The Ark ----------

        /// <summary>The level's target length in game minutes (game/src/balance/data.ts); the Ark's own upgrade is 12% of it.</summary>
        static readonly Dictionary<int, double> TargetMin = new Dictionary<int, double>
        {
            [1] = 10, [2] = 15, [3] = 45, [4] = 75, [5] = 120, [6] = 105, [7] = 135, [8] = 180, [9] = 150, [10] = 210,
            [11] = 300, [12] = 210, [13] = 225, [14] = 210, [15] = 300, [16] = 240, [17] = 360, [18] = 360, [19] = 360, [20] = 360, [21] = 360,
            // levels 22-40: a proposal (balance 0.2, 28.11.2026)
            [22] = 330, [23] = 330, [24] = 330, [25] = 330, [26] = 330, [27] = 330, [28] = 330, [29] = 330, [30] = 360,
            [31] = 360, [32] = 330, [33] = 330, [34] = 630, [35] = 330, [36] = 330, [37] = 330, [38] = 330, [39] = 330, [40] = 360,
        };

        public static double ArkUpgradeMinutes(int fromLevel) => 0.12 * (TargetMin.TryGetValue(fromLevel, out var t) ? t : 360);

        /// <summary>
        /// Pods with power: four on 3, one more on every level of chapter 1. From level 11 the colonists come with the
        /// work: the Ark powers a pod for every new workplace (levels.md), so the pods are no longer the limit.
        /// </summary>
        public static int PodsPowered(int arkLevel) => arkLevel < 3 ? 0 : arkLevel <= 10 ? arkLevel + 1 : 100;

        /// <summary>Colonists awake at the end of each level (levels.md: "Колонистите са N" in the requirements for L+1).</summary>
        public static readonly Dictionary<int, int> ColonistsAfter = new Dictionary<int, int>
        {
            [1] = 0, [2] = 0, [3] = 4, [4] = 5, [5] = 6, [6] = 7, [7] = 8, [8] = 9, [9] = 10, [10] = 11,
            [11] = 14, [12] = 14, [13] = 16, [14] = 17, [15] = 18, [16] = 19, [17] = 19, [18] = 19, [19] = 20, [20] = 21,
            [21] = 21, [22] = 22, [23] = 23, [24] = 24, [25] = 25, [26] = 26, [27] = 27, [28] = 29, [29] = 29, [30] = 31,
            [31] = 32, [32] = 33, [33] = 34, [34] = 35, [35] = 36, [36] = 38, [37] = 39, [38] = 40, [39] = 40,
        };

        /// <summary>The Ark holds 1000 of each resource; the store adds 1000 x 1.4^(n-1) to level 11, then x1.1 a level (levels.md).</summary>
        public static double StoreCapacity(int warehouseLevel)
        {
            if (warehouseLevel <= 0) return 0;
            double c = 1000;
            for (int n = 2; n <= warehouseLevel; n++) c *= n <= 11 ? 1.4 : 1.1;
            return Math.Round(c / 10) * 10;
        }
        public const double ArkCapacity = 1000;

        static Bag Bag(double carbon = 0, double water = 0, double stone = 0, double food = 0, double silicon = 0, double iron = 0)
        {
            var b = new Bag();
            b[Sim.Res.Carbon] = carbon; b[Sim.Res.Water] = water; b[Sim.Res.Stone] = stone;
            b[Sim.Res.Food] = food; b[Sim.Res.Silicon] = silicon; b[Sim.Res.Iron] = iron;
            return b;
        }

        static Bag Bag(params (Res r, double a)[] items)
        {
            var b = new Bag();
            foreach (var (r, a) in items) b[r] = a;
            return b;
        }

        /// <summary>From level 12 (levels.md): the resources, the air, the store on L, people fed and housed, the key buildings and the new thing.</summary>
        static LevelReq Ch2(int level, double carbon, double water, double stone, double food, double silicon, int atmo, int smelter, int greenhouse,
            params (Res r, double a)[] stock)
        {
            var req = new LevelReq { Level = level, Res = Bag(carbon, water, stone, food, silicon), Atmo = atmo, ForEveryone = true, Store = level };
            foreach (var (r, a) in stock) req.Res[r] = a;
            req.Colonists = ColonistsAfter[level - 1];
            if (smelter > 0) req.Overrides["smelter"] = smelter;
            if (greenhouse > 0) req.Overrides["greenhouse"] = greenhouse;
            return req;
        }

        /// <summary>Chapter 3 (levels.md): the first smelter on L-7 and the copper works on L-19 (the requirement for 31 too).</summary>
        static LevelReq Ch3(int level, double carbon, double water, double stone, double food, double silicon, int atmo, params (Res r, double a)[] stock)
        {
            var req = Ch2(level, carbon, water, stone, food, silicon, atmo, level - 7, 0, stock);
            req.Overrides["copperworks"] = level - 19;
            return req;
        }

        /// <summary>Chapter 4 (levels.md, Joro 24.11.2026): the first smelter on L-7 and the glassworks on L-29; glass in the store.</summary>
        static LevelReq Ch4(int level, double carbon, double water, double stone, double food, double silicon, double glass, int atmo)
        {
            var req = Ch2(level, carbon, water, stone, food, silicon, atmo, level - 7, 0, (Res.Glass, glass));
            req.Overrides["glassworks"] = level - 29;
            return req;
        }

        public static readonly Dictionary<int, LevelReq> Requirements = new Dictionary<int, LevelReq>
        {
            [2] = new LevelReq { Level = 2, Res = Bag(150, 100), Atmo = 10 },
            [3] = new LevelReq { Level = 3, Res = Bag(350, 220, 60), Atmo = 13, Overrides = { ["mine"] = 2 } },
            [4] = new LevelReq { Level = 4, Res = Bag(700, 450, 150, food: 100), Atmo = 16, Colonists = 4 },
            [5] = new LevelReq { Level = 5, Res = Bag(1400, 900, 400, food: 250), Atmo = 18, Colonists = 5, LabPotatoes = true },
            [6] = new LevelReq { Level = 6, Res = Bag(2800, 1800, 800, food: 500, silicon: 200), Atmo = 20, Colonists = 6, EnergyRatio = 1.0 },
            [7] = new LevelReq { Level = 7, Res = Bag(5600, 3600, 1600, food: 1000, silicon: 500), Atmo = 22, Colonists = 7,
                Research = new[] { "furnace_filter" }, EnergyRatio = 1.5 },
            [8] = new LevelReq { Level = 8, Res = Bag(7800, 5000, 2200, food: 1400, silicon: 700), Atmo = 24, Colonists = 8, NightWithoutShortage = true },
            [9] = new LevelReq { Level = 9, Res = Bag(10900, 7000, 3100, food: 2000, silicon: 1000), Atmo = 26, Colonists = 9, NightWithoutShortage = true },
            [10] = new LevelReq { Level = 10, Res = Bag(15300, 9800, 4300, food: 2800, silicon: 1400, iron: 300), Atmo = 28, Colonists = 10, MineIron = true },
            [11] = new LevelReq { Level = 11, Res = Bag(21400, 13700, 6000, food: 3900, silicon: 2000, iron: 500), Atmo = 30, Colonists = 11,
                Research = new[] { "zone2" }, ResearchStationUpgraded = true },

            // Chapter 2 (levels.md, levels 11-20): the smelter on L-7 and the first greenhouse on L-1 are the key buildings.
            [12] = Mod(Ch2(12, 23500, 15100, 6600, 4300, 2200, 30, 5, 11, (Res.Steel, 200)), r => { r.Research = new[] { "smelter_filter" }; r.NightWithoutShortage = true; }),
            [13] = Mod(Ch2(13, 25900, 16600, 7300, 4700, 2400, 31, 6, 12), r => r.Frame = 1),
            [14] = Mod(Ch2(14, 28500, 18200, 8000, 5200, 2700, 31, 7, 13, (Res.Clay, 300)), r => { r.Builder = true; r.Built = new[] { "claypit" }; }),
            [15] = Mod(Ch2(15, 31300, 20100, 8800, 5700, 2900, 31, 8, 14, (Res.Copper, 300)), r => { r.Overrides["mine"] = 15; r.MineCopper = true; r.Frame = 2; }),
            [16] = Mod(Ch2(16, 34500, 22100, 9700, 6300, 3200, 32, 9, 15, (Res.Bricks, 200)), r => { r.Built = new[] { "kiln" }; r.NightWithoutShortage = true; }),
            [17] = Mod(Ch2(17, 37900, 24300, 10600, 6900, 3500, 32, 10, 16), r => { r.Greenhouses = 3; r.GreenhouseFood = true; }),
            [18] = Mod(Ch2(18, 41700, 26700, 11700, 7600, 3900, 32, 11, 17, (Res.Seedlings, 100)), r => r.Frame = 3),
            [19] = Mod(Ch2(19, 45900, 29400, 12900, 8400, 4300, 33, 12, 18), r => r.Antenna = true),
            [20] = Mod(Ch2(20, 50500, 32300, 14100, 9200, 4700, 33, 13, 19, (Res.Cables, 300), (Res.Bricks, 800)), r => { r.Built = new[] { "copperworks" }; r.Frame = 4; }),
            [21] = Mod(Ch2(21, 55500, 35500, 15600, 10100, 5200, 33, 14, 20, (Res.Seedlings, 300)), r => r.Built = new[] { "brickhome", "canteen" }),

            // Chapter 3 (levels.md, levels 21-30): the first smelter on L-7 and the copper works on L-19.
            [22] = Mod(Ch3(22, 61000, 39000, 17200, 11100, 5700, 34), r => { r.Research = new[] { "zone3" }; r.Patches = 6; r.PatchStage = 1; }),
            [23] = Mod(Ch3(23, 67100, 42900, 18900, 12200, 6300, 34), r => { r.Hull = 1; r.Built = new[] { "smelter2" }; }),
            [24] = Mod(Ch3(24, 73800, 47200, 20800, 13400, 6900, 34), r => { r.Built = new[] { "treatment" }; r.Patches = 6; r.PatchStage = 2; }),
            [25] = Mod(Ch3(25, 81200, 51900, 22900, 14700, 7600, 35), r => { r.Hull = 2; r.Overrides["mine"] = 20; }),
            [26] = Mod(Ch3(26, 89300, 57100, 25200, 16200, 8400, 35), r => { r.Patches = 6; r.PatchStage = 4; r.Built = new[] { "fieldstation" }; }),
            [27] = Mod(Ch3(27, 98200, 62800, 27700, 17800, 9200, 35), r => { r.Patches = 6; r.PatchStage = 5; r.Built = new[] { "nursery" }; }),
            [28] = Mod(Ch3(28, 108000, 69100, 30500, 19600, 10100, 36), r => { r.Hull = 3; r.Built = new[] { "woolworks" }; }),
            [29] = Mod(Ch3(29, 118800, 76000, 33600, 21600, 11100, 36), r => r.Built = new[] { "slagmill" }),
            [30] = Mod(Ch3(30, 130700, 83600, 37000, 23800, 12200, 36), r => { r.Hull = 4; r.Insulated = 5; }),
            [31] = Mod(Ch3(31, 143800, 92000, 40700, 26200, 13400, 37, (Res.Glass, 500)), r => r.Built = new[] { "glassworks" }),

            // Chapter 4 (levels.md, levels 31-39): the first smelter on L-7 and the glassworks on L-29.
            [32] = Mod(Ch4(32, 158200, 101200, 44800, 28800, 14700, 550, 37), r => r.Built = new[] { "university" }),
            [33] = Mod(Ch4(33, 174000, 111300, 49300, 31700, 16200, 600, 37), r => { r.Built = new[] { "park" }; r.Reactor = 1; }),
            [34] = Mod(Ch4(34, 191400, 122400, 54200, 34900, 17800, 660, 38), r => r.Built = new[] { "dispatch" }),
            [35] = Mod(Ch4(35, 210500, 134600, 59600, 38400, 19600, 730, 38), r => { r.Built = new[] { "greenhouse4" }; r.Reactor = 2; }),
            [36] = Mod(Ch4(36, 231600, 148100, 65600, 42200, 21600, 800, 38), r => r.Built = new[] { "medpost" }),
            [37] = Mod(Ch4(37, 254800, 162900, 72200, 46400, 23800, 880, 39), r => { r.Built = new[] { "roaddepot" }; r.PavedArk = true; }),
            [38] = Mod(Ch4(38, 280300, 179200, 79400, 51000, 26200, 970, 39), r => { r.Built = new[] { "weather" }; r.Reactor = 3; }),
            [39] = Mod(Ch4(39, 308300, 197100, 87300, 56100, 28800, 1070, 39), r => r.Built = new[] { "seedvault" }),
            [40] = Mod(Ch4(40, 339100, 216800, 96000, 61700, 31700, 1180, 40), r => { r.Reactor = 4; r.ReactorTested = true; }),
        };

        static LevelReq Mod(LevelReq r, Action<LevelReq> f) { f(r); return r; }

        /// <summary>The level a building must have for the Ark to reach level L: to level 11 every building on L (without research), from 12 only the key ones.</summary>
        public static int RequiredLevel(LevelReq req, string id)
        {
            if (req.Overrides.TryGetValue(id, out var v)) return v;
            if (req.ForEveryone) return 0;
            return B(id).OutsideAllRule ? 0 : req.Level;
        }

        /// <summary>
        /// The level a building is on by the start of Ark level L when the player follows ECHO: the balance model's plan
        /// (game/src/balance/buildings.ts, levelAt). The developer panel's jump builds this; the auto-player follows it.
        /// </summary>
        public static int PlanLevel(string id, int L)
        {
            int people = ColonistsAfter.TryGetValue(L - 1, out var p) ? p : 40;
            int since(int unlock) => Math.Max(1, L - unlock + 1);
            switch (id)
            {
                case "geolocator": return Math.Min(L, 11);
                case "research": return L <= 10 ? 1 : 2;
                case "mine": return L <= 2 ? 1 : L == 3 ? 2 : Math.Min(L, L >= 25 ? 20 : 19); // the fifth place on 20 wants the Ark on 24
                case "home": case "kitchen": return L <= 10 ? L : Math.Min(20, people);
                case "smelter": return Math.Max(1, L - 7);
                case "greenhouse2": return since(11);
                case "claypit": return since(13);
                case "kiln": return since(15);
                case "greenhouse3": return since(16);
                case "copperworks": return since(19);
                case "brickhome": case "canteen": return Math.Max(1, people - 20);
                // chapters 3 and 4 (balance 0.2): the second smelter catches up two levels an Ark level; the rest grow with the Ark
                case "smelter2": return Math.Max(1, Math.Min(2 * (L - 22) + 1, L - 7)); // then it follows the first one (from 36)
                case "treatment": return since(23);
                case "fieldstation": return since(25);
                case "nursery": return since(26);
                case "woolworks": return since(27);
                case "slagmill": return since(28);
                case "glassworks": return since(30);
                case "university": return since(31);
                case "park": return since(32);
                case "dispatch": return since(33);
                case "greenhouse4": return Math.Max(1, 2 * (L - 34) + 1);
                case "medpost": return since(35);
                case "roaddepot": return since(36);
                case "weather": return since(37);
                case "seedvault": return since(38);
                default: return L;
            }
        }

        // ---------- Starting state ----------

        /// <summary>The containers' supplies at the landing: enough for the five tutorial buildings (proposal).</summary>
        public static Bag StartStock() => Bag(24, 8);

        public const int StartAtmo = 7;
    }
}
