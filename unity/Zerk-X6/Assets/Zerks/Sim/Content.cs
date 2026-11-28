using System;
using System.Collections.Generic;
using System.Linq;

namespace Zerks.Sim
{
    /// <summary>Who works where (levels.md, "Специалностите"). New ones go at the end: a save keeps them as numbers.</summary>
    public enum Profession { None, Cook, Agronomist, Geologist, Engineer, Scientist, Builder }

    /// <summary>A building of chapters 1 and 2 and where it stands (docs/levels.md; plots from mockup/map.html#lvl10 and game/src/view/layout.ts, level 20).</summary>
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

        public float X => (S + D) / 2f * Content.Pitch;
        public float Z => (S - D) / 2f * Content.Pitch;

        public string ModelFor(int level)
        {
            string m = null;
            foreach (var kv in Models) if (kv.Key <= Math.Max(1, level)) m = kv.Value;
            return m ?? Models.Values.FirstOrDefault();
        }

        public bool HasWorkplace => Worker != Profession.None;
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
    }

    /// <summary>One stage of the ship's frame in the dock (levels.md, "Строежът и корабът").</summary>
    public sealed class FrameStage
    {
        public int Stage, ArkLevel;
        public double Steel;
        /// <summary>Game minutes the Ark's fabricator and the cranes need (proposal).</summary>
        public double Minutes;
    }

    /// <summary>Everything chapters 1 and 2 are made of, from docs/levels.md 2.8 (and concept.md for the screen and ECHO).</summary>
    public static class Content
    {
        public const float Pitch = 16f;
        /// <summary>Chapter 2 ends when the Ark reaches level 21 (chapter 3, "Green Belt").</summary>
        public const int LastLevel = 21;

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
                MinAtmo = 20, About = "Plants under glass make more air than the machines. Lit at night.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" } },

            // ---- chapter 2 (levels.md, levels 11-20; the plots are the ones of stage 2, game/src/view/layout.ts, a proposal) ----
            // The South Slope (zone II): the smelter next to the silicon furnace, the copper works next to the smelter, the
            // brick home next to the first home, the second and the third greenhouse.
            new BuildingDef { Id = "smelter", Name = "Smelter", D = -2, S = -4, Zone = 2, Worker = Profession.Engineer, Blueprint = "bp_smelter",
                About = "Iron ore + carbon + a lot of power = steel. It smokes until it has a filter.", Models = { [1] = "smelter" } },
            new BuildingDef { Id = "greenhouse2", Kind = "greenhouse", Name = "Greenhouse 2", D = 2, S = -4, Zone = 2, Worker = Profession.Agronomist,
                Blueprint = "bp_greenhouse", MinAtmo = 20, Unlock = 11,
                About = "The second greenhouse, on the South Slope: sun all day.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" } },
            // The Ice Hollow: the clay pit on the bank of the ice, the brick kiln next to it.
            new BuildingDef { Id = "claypit", Name = "Clay pit", D = -1, S = 5, Zone = 1, Worker = Profession.Geologist, Blueprint = "bp_claypit", Dug = true,
                About = "Dug down on the bank of the ice: red regolith on top, layers of clay under it.", Models = { [1] = "claypit" } },
            new BuildingDef { Id = "kiln", Name = "Brick kiln", D = -2, S = 4, Zone = 1, Worker = Profession.Engineer, Blueprint = "bp_kiln",
                About = "Clay + power = bricks. Electric, so no smoke.", Models = { [1] = "brickkiln" } },
            new BuildingDef { Id = "greenhouse3", Kind = "greenhouse", Name = "Greenhouse 3", D = 1, S = -5, Zone = 2, Worker = Profession.Agronomist,
                Blueprint = "bp_greenhouse", MinAtmo = 20, Unlock = 16,
                About = "The third greenhouse, on the South Slope.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10", [20] = "greenhouse-20" } },
            new BuildingDef { Id = "copperworks", Name = "Copper works", D = -1, S = -5, Zone = 2, Worker = Profession.Engineer, Blueprint = "bp_copperworks",
                About = "Copper ore in acid, pure copper on plates with power, drawn into wire: cables. No smoke, a lot of power.", Models = { [1] = "copperworks" } },
            new BuildingDef { Id = "brickhome", Name = "Brick home", D = 0, S = -4, Zone = 2, Worker = Profession.None, Blueprint = "bp_brickhome",
                Extra = Bag((Res.Bricks, 800), (Res.Cables, 150)),
                About = "The second home, printed from paste with our crushed bricks: reddish, stronger and warmer walls.",
                Models = { [1] = "brickhome-1", [10] = "brickhome-10", [20] = "brickhome-20" } },
            // The canteen: next to the kitchen there is no free plot, so on the nearest free one in front (stage 2).
            new BuildingDef { Id = "canteen", Name = "Canteen", D = 2, S = 4, Zone = 1, Worker = Profession.Cook, Blueprint = "bp_canteen",
                Extra = Bag((Res.Cables, 150)),
                About = "The second place to eat, for the colonists from the 21st on. A cook makes meals here.",
                Models = { [1] = "canteen-1", [10] = "canteen-10", [20] = "canteen-20" } },
        };

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
                default: return B(id).HasWorkplace ? 1 : 0;
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

        // ---------- Research (levels.md, "Веригите за нива 1–10" and "11–20") ----------

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

            new ResearchDef { Id = "fast_seeds", Branch = "Life", Order = 1, Name = "Fast seeds", Effect = "+20% food", ArkLevel = 2, Minutes = 5 },
            new ResearchDef { Id = "processor_filter", Branch = "Life", Order = 2, Name = "Processor filter", Effect = "Air grows 15% faster", ArkLevel = 3, Minutes = 15 },
            new ResearchDef { Id = "bp_greenhouse", Branch = "Life", Order = 3, Name = "Blueprint: Greenhouse", Effect = "Plants make air under glass", ArkLevel = 8, MinAtmo = 20, Minutes = 120 },
            new ResearchDef { Id = "double_glass", Branch = "Life", Order = 4, Name = "Double glass", Effect = "Greenhouses use 20% less power at night", ArkLevel = 11, Minutes = 120 },
            new ResearchDef { Id = "tomatoes", Branch = "Life", Order = 5, Name = "Tomatoes", Effect = "+20% food from the greenhouses", ArkLevel = 16, Minutes = 180 },
            new ResearchDef { Id = "hardy_seedlings", Branch = "Life", Order = 6, Name = "Hardy seedlings", Effect = "Moss, grasses and shrubs that stand cold and dust: a seedling bed in each greenhouse",
                ArkLevel = 17, Minutes = 240 },

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

            new ResearchDef { Id = "fast_robot", Branch = "Space", Order = 1, Name = "Faster robot", Effect = "The collector robot drives faster", ArkLevel = 4, Minutes = 30 },
            new ResearchDef { Id = "big_cargo", Branch = "Space", Order = 2, Name = "Bigger cargo", Effect = "The collector robot carries more", ArkLevel = 9, Minutes = 180 },
            new ResearchDef { Id = "antenna", Branch = "Space", Order = 3, Name = "The Ark's antenna", Effect = "The map of the planet; the robot goes farther, where you send it",
                ArkLevel = 18, Minutes = 300 },
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

        // ---------- The Ark ----------

        /// <summary>The level's target length in game minutes (game/src/balance/data.ts); the Ark's own upgrade is 12% of it.</summary>
        static readonly Dictionary<int, double> TargetMin = new Dictionary<int, double>
        {
            [1] = 10, [2] = 15, [3] = 45, [4] = 75, [5] = 120, [6] = 105, [7] = 135, [8] = 180, [9] = 150, [10] = 210,
            [11] = 300, [12] = 210, [13] = 225, [14] = 210, [15] = 300, [16] = 240, [17] = 360, [18] = 360, [19] = 360, [20] = 360, [21] = 360,
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
            int people = ColonistsAfter.TryGetValue(L - 1, out var p) ? p : 21;
            int since(int unlock) => Math.Max(1, L - unlock + 1);
            switch (id)
            {
                case "geolocator": return Math.Min(L, 11);
                case "research": return L <= 10 ? 1 : 2;
                case "mine": return L <= 2 ? 1 : L == 3 ? 2 : Math.Min(L, 19);
                case "home": case "kitchen": return L <= 10 ? L : Math.Min(20, people);
                case "smelter": return Math.Max(1, L - 7);
                case "greenhouse2": return since(11);
                case "claypit": return since(13);
                case "kiln": return since(15);
                case "greenhouse3": return since(16);
                case "copperworks": return since(19);
                case "brickhome": case "canteen": return Math.Max(1, people - 20);
                default: return L;
            }
        }

        // ---------- Starting state ----------

        /// <summary>The containers' supplies at the landing: enough for the five tutorial buildings (proposal).</summary>
        public static Bag StartStock() => Bag(24, 8);

        public const int StartAtmo = 7;
    }
}
