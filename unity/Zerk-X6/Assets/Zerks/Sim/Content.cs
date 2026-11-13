using System;
using System.Collections.Generic;
using System.Linq;

namespace Zerks.Sim
{
    public enum Profession { None, Cook, Agronomist, Geologist, Engineer, Scientist }

    /// <summary>A building of chapter 1 and where it stands (docs/levels.md; plots from mockup/map.html#lvl10).</summary>
    public sealed class BuildingDef
    {
        public string Id;
        public string Name;
        /// <summary>Plot on the street grid: d across the screen, s along it (as in game/src/view/world.ts).</summary>
        public int D, S;
        /// <summary>0 = open from the start, 1 = under the dust until "Zone I expansion" (level 4).</summary>
        public int Zone;
        /// <summary>Who works here; None = no workplace (levels.md: geolocator, batteries, store, homes).</summary>
        public Profession Worker;
        /// <summary>Research that gives the blueprint (null = the five tutorial buildings).</summary>
        public string Blueprint;
        /// <summary>Atmosphere needed to build it (greenhouse: 20%).</summary>
        public int MinAtmo;
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
        /// <summary>Game minutes (levels.md, "Веригите за нива 1–10").</summary>
        public double Minutes;
    }

    /// <summary>What the Ark needs to reach a level (levels.md, "Изисквания за ниво L").</summary>
    public sealed class LevelReq
    {
        public int Level;
        public Bag Res = new Bag();
        public int Atmo;
        public int Colonists;
        /// <summary>Required building levels; null means "every building on level L, without the research station".</summary>
        public Dictionary<string, int> Overrides = new Dictionary<string, int>();
        public string[] Research = Array.Empty<string>();
        public int MineWorkers;
        public bool MineIron;
        public double EnergyRatio; // production / demand by day
        public bool NightWithoutShortage;
        public bool ResearchStationUpgraded;
        public bool LabPotatoes;
    }

    /// <summary>Everything chapter 1 is made of, from docs/levels.md 2.4 (and concept.md for the screen and ECHO).</summary>
    public static class Content
    {
        public const float Pitch = 16f;
        public const int LastLevel = 11; // chapter 1 ends when the Ark reaches level 11 (chapter 2, "First Breath")

        // ---------- Buildings ----------

        public static readonly List<BuildingDef> Buildings = new List<BuildingDef>
        {
            new BuildingDef { Id = "geolocator", Name = "Geolocator", D = -2, S = 2, Zone = 0, Worker = Profession.None,
                About = "Seismic station: listens to the rock and measures the air.", Models = { [1] = "geolocator" } },
            new BuildingDef { Id = "drill", Name = "Carbon drill", D = 1, S = 1, Zone = 0, Worker = Profession.Geologist,
                About = "Drills the carbon deposit.", Models = { [1] = "drill-1", [10] = "drill-10" } },
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
                About = "Beds for the colonists. Every upgrade makes it cosier.", Models = { [1] = "home-1", [10] = "home-10" } },
            new BuildingDef { Id = "kitchen", Name = "Common Kitchen", D = 2, S = 0, Zone = 0, Worker = Profession.Cook, Blueprint = "bp_kitchen",
                About = "A cook makes meals; everyone eats here.", Models = { [1] = "kitchen-1", [10] = "kitchen-10" } },
            new BuildingDef { Id = "warehouse", Name = "Store", D = 2, S = -2, Zone = 1, Worker = Profession.None, Blueprint = "bp_warehouse",
                About = "Raises the ceiling of every stock.", Models = { [1] = "warehouse-1", [10] = "warehouse-10" } },
            new BuildingDef { Id = "furnace", Name = "Silicon furnace", D = -2, S = -2, Zone = 1, Worker = Profession.Engineer, Blueprint = "bp_furnace",
                About = "Quartz + carbon + a lot of power = silicon. It smokes until it has a filter.", Models = { [1] = "furnace" } },
            new BuildingDef { Id = "solar", Name = "Solar panels", D = 1, S = 3, Zone = 1, Worker = Profession.Engineer, Blueprint = "bp_solar",
                About = "One field of panels that grows with upgrades. A worker keeps the dust off: +20%.", Models = { [1] = "solar-1", [10] = "solar-10" } },
            new BuildingDef { Id = "batteries", Name = "Batteries", D = -1, S = 3, Zone = 1, Worker = Profession.None, Blueprint = "bp_batteries",
                About = "Store the day's surplus for the night.", Models = { [1] = "batteries-1", [10] = "batteries-10" } },
            new BuildingDef { Id = "greenhouse", Name = "Greenhouse", D = 2, S = 2, Zone = 1, Worker = Profession.Agronomist, Blueprint = "bp_greenhouse",
                MinAtmo = 20, About = "Plants under glass make more air than the machines. Lit at night.", Models = { [1] = "greenhouse-1", [10] = "greenhouse-10" } },
        };

        public static BuildingDef B(string id) => Buildings.First(b => b.Id == id);

        /// <summary>The five buildings of the tutorial, in their order (levels.md, level 1).</summary>
        public static readonly string[] TutorialOrder = { "geolocator", "drill", "pump", "processor", "veglab" };

        /// <summary>Places in the mine by its level (levels.md: 1, 2 on 5, 3 on 10).</summary>
        public static int MineSlots(int mineLevel) => mineLevel >= 15 ? 4 : mineLevel >= 10 ? 3 : mineLevel >= 5 ? 2 : 1;

        /// <summary>What the mine can dig at its level (levels.md: stone; quartz on 5; iron ore on 10).</summary>
        public static List<Res> MineMaterials(int mineLevel)
        {
            var l = new List<Res> { Res.Stone };
            if (mineLevel >= 5) l.Add(Res.Quartz);
            if (mineLevel >= 10) l.Add(Res.Iron);
            return l;
        }

        /// <summary>Beds in the home: 4 to level 4, then one per level (levels.md).</summary>
        public static int Beds(int homeLevel) => homeLevel <= 0 ? 0 : homeLevel <= 4 ? 4 : Math.Min(20, homeLevel);

        /// <summary>Seats in the kitchen: 8 to level 8, then one per level (levels.md).</summary>
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
            /// <summary>Food multiplier (balance model: potatoes x1.25, beans x1.25 more).</summary>
            public double Food;
            /// <summary>Game minutes between harvests: fast and little, or slow and much.</summary>
            public double Cycle;
        }

        public static readonly List<Crop> Crops = new List<Crop>
        {
            new Crop { Id = "veg", Name = "Vegetables", About = "Fast, a little food. For when you play.", LabLevel = 1, Food = 1.0, Cycle = 2 },
            new Crop { Id = "potato", Name = "Potatoes", About = "Slow, more food. Plant them before you leave.", LabLevel = 5, Food = 1.25, Cycle = 20 },
            new Crop { Id = "bean", Name = "Beans", About = "Medium speed, more food than vegetables.", LabLevel = 10, Food = 1.5625, Cycle = 8 },
        };

        // ---------- Research (levels.md, "Веригите за нива 1–10") ----------

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

            new ResearchDef { Id = "fast_seeds", Branch = "Life", Order = 1, Name = "Fast seeds", Effect = "+20% food", ArkLevel = 2, Minutes = 5 },
            new ResearchDef { Id = "processor_filter", Branch = "Life", Order = 2, Name = "Processor filter", Effect = "Air grows 15% faster", ArkLevel = 3, Minutes = 15 },
            new ResearchDef { Id = "bp_greenhouse", Branch = "Life", Order = 3, Name = "Blueprint: Greenhouse", Effect = "Plants make air under glass", ArkLevel = 8, MinAtmo = 20, Minutes = 120 },

            new ResearchDef { Id = "bp_home", Branch = "Colony", Order = 1, Name = "Blueprint: Colonists' Home", Effect = "Beds for the first people", ArkLevel = 3, Minutes = 5 },
            new ResearchDef { Id = "bp_kitchen", Branch = "Colony", Order = 2, Name = "Blueprint: Common Kitchen", Effect = "Meals for everyone", ArkLevel = 3, Minutes = 5 },
            new ResearchDef { Id = "zone1", Branch = "Colony", Order = 3, Name = "Zone I expansion", Effect = "Clears the dust over the next plots", ArkLevel = 4, Minutes = 20 },
            new ResearchDef { Id = "long_shift", Branch = "Colony", Order = 4, Name = "Longer shift", Effect = "Workers gather twice as long while you are away", ArkLevel = 5, Minutes = 45 },
            new ResearchDef { Id = "short_upgrades", Branch = "Colony", Order = 5, Name = "Shorter upgrades", Effect = "-15% upgrade time", ArkLevel = 7, Minutes = 90 },
            new ResearchDef { Id = "zone2", Branch = "Colony", Order = 6, Name = "Zone II expansion", Effect = "The south slope: sun and room for greenhouses", ArkLevel = 10, Minutes = 180 },

            new ResearchDef { Id = "fast_robot", Branch = "Space", Order = 1, Name = "Faster robot", Effect = "The collector robot drives faster", ArkLevel = 4, Minutes = 30 },
            new ResearchDef { Id = "big_cargo", Branch = "Space", Order = 2, Name = "Bigger cargo", Effect = "The collector robot carries more", ArkLevel = 9, Minutes = 180 },
        };

        public static ResearchDef R(string id) => Research.First(r => r.Id == id);
        public static readonly string[] Branches = { "Industry", "Life", "Colony", "Space" };

        /// <summary>The research that comes before this one in its branch (or null).</summary>
        public static ResearchDef Previous(ResearchDef r) =>
            Research.Where(x => x.Branch == r.Branch && x.Order < r.Order).OrderByDescending(x => x.Order).FirstOrDefault();

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
        };

        // ---------- The Ark ----------

        /// <summary>The level's target length in game minutes (game/src/balance/data.ts); the Ark's own upgrade is 12% of it.</summary>
        static readonly Dictionary<int, double> TargetMin = new Dictionary<int, double>
        { [1] = 10, [2] = 15, [3] = 45, [4] = 75, [5] = 120, [6] = 105, [7] = 135, [8] = 180, [9] = 150, [10] = 210, [11] = 300 };

        public static double ArkUpgradeMinutes(int fromLevel) => 0.12 * (TargetMin.TryGetValue(fromLevel, out var t) ? t : 300);

        /// <summary>Pods with power at an Ark level: four on 3, one more on every level (levels.md, chapter 1).</summary>
        public static int PodsPowered(int arkLevel) => arkLevel < 3 ? 0 : Math.Min(100, arkLevel + 1);

        /// <summary>The Ark's reactor covers the demand to level 4, half on 5, a quarter on 6, nothing from 7 (balance model).</summary>
        public static double ReactorShare(int arkLevel) => arkLevel <= 4 ? 1 : arkLevel == 5 ? 0.5 : arkLevel == 6 ? 0.25 : 0;

        /// <summary>The Ark holds 1000 of each resource; the store adds 1000 x 1.4^(n-1) to level 11 (levels.md).</summary>
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

        public static readonly Dictionary<int, LevelReq> Requirements = new Dictionary<int, LevelReq>
        {
            [2] = new LevelReq { Level = 2, Res = Bag(150, 100), Atmo = 10 },
            [3] = new LevelReq { Level = 3, Res = Bag(350, 220, 60), Atmo = 13, Overrides = { ["mine"] = 2 } },
            [4] = new LevelReq { Level = 4, Res = Bag(700, 450, 150, food: 100), Atmo = 16, Colonists = 4 },
            [5] = new LevelReq { Level = 5, Res = Bag(1400, 900, 400, food: 250), Atmo = 18, Colonists = 5, LabPotatoes = true },
            [6] = new LevelReq { Level = 6, Res = Bag(2800, 1800, 800, food: 500, silicon: 200), Atmo = 20, Colonists = 6, MineWorkers = 2, EnergyRatio = 1.0 },
            [7] = new LevelReq { Level = 7, Res = Bag(5600, 3600, 1600, food: 1000, silicon: 500), Atmo = 22, Colonists = 7,
                Research = new[] { "furnace_filter" }, EnergyRatio = 1.5 },
            [8] = new LevelReq { Level = 8, Res = Bag(7800, 5000, 2200, food: 1400, silicon: 700), Atmo = 24, Colonists = 8, NightWithoutShortage = true },
            [9] = new LevelReq { Level = 9, Res = Bag(10900, 7000, 3100, food: 2000, silicon: 1000), Atmo = 26, Colonists = 9, NightWithoutShortage = true },
            [10] = new LevelReq { Level = 10, Res = Bag(15300, 9800, 4300, food: 2800, silicon: 1400, iron: 300), Atmo = 28, Colonists = 10, MineIron = true },
            [11] = new LevelReq { Level = 11, Res = Bag(21400, 13700, 6000, food: 3900, silicon: 2000, iron: 500), Atmo = 30, Colonists = 11,
                Research = new[] { "zone2" }, ResearchStationUpgraded = true },
        };

        /// <summary>The level a building must have for the Ark to reach level L (every building on L, without research).</summary>
        public static int RequiredLevel(LevelReq req, string id)
        {
            if (req.Overrides.TryGetValue(id, out var v)) return v;
            return B(id).OutsideAllRule ? 0 : req.Level;
        }

        // ---------- Starting state ----------

        /// <summary>The containers' supplies at the landing: enough for the five tutorial buildings (proposal).</summary>
        public static Bag StartStock() => Bag(24, 8);

        public const int StartAtmo = 7;
    }
}
