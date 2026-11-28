using System;
using System.Collections.Generic;
using System.Linq;

namespace Zerks.Sim
{
    /// <summary>What happened in a step, for the screen. New kinds go at the end.</summary>
    public enum Ev
    {
        Echo, BuildStarted, Built, UpgradeStarted, Upgraded, Ready, Reprinted, ArkUpgradeStarted, ArkLevel,
        ResearchStarted, ResearchDone, Woken, RobotOut, RobotBack, Collected, NightFalls, DayBreaks, PowerShort,
        ZoneOpened, Sketch, Chapter1Done, TutorialStep, Debris, Impulse, AtmoUp,
        DockOpened, FrameStarted, FrameDone, AntennaReady, AntennaFixed, Chapter2Done, GreenhouseSwitched,
    }

    public readonly struct GameEvent
    {
        public readonly Ev Kind;
        public readonly string Id;
        public readonly string Text;
        public GameEvent(Ev kind, string id = null, string text = null) { Kind = kind; Id = id; Text = text; }
        public override string ToString() => $"{Kind} {Id} {Text}";
    }

    /// <summary>Settings of a run. Tempo 60 is the test version (Salamen, 13.11.2026); 1 is the real game.</summary>
    public sealed class Settings
    {
        public double Tempo = 60;
        /// <summary>Real seconds a new building takes at least: the drone measures, shows the plan and prints.</summary>
        public double MinBuildReal = 8;
        public double MinUpgradeReal = 1.5;
        public double MinResearchReal = 2;
        public double MinArkReal = 3;
        /// <summary>The day cycle is stretched so a test day is about 2 minutes, not 20 seconds (proposal).</summary>
        public double CycleScale => Math.Max(1, Tempo / 10);
        /// <summary>Game minutes of production an idle building keeps in its bubble (proposal).</summary>
        public double BubbleMinutes = 60;
        /// <summary>Game hours workers keep producing while you are away (proposal); doubled by "Longer shift".</summary>
        public double AwayHours = 2;
    }

    public sealed class ReqItem
    {
        public string Text;
        public bool Done;
        public string Have;
        public ReqItem(string text, bool done, string have = null) { Text = text; Done = done; Have = have; }
    }

    public sealed class SlotRef
    {
        /// <summary>A building id, or "ark" for the builder's place in the Ark.</summary>
        public string Building;
        public int Slot;
        public Profession Profession;
        public bool Recommended;
        public override string ToString() => $"{Building}#{Slot}";
    }

    /// <summary>
    /// The colony of chapters 1 and 2: the rules of docs/levels.md and the numbers of docs/balance/balance.json.
    /// No Unity here, so the whole game can be played in a test.
    /// </summary>
    public sealed class Colony
    {
        public readonly Balance Bal;
        public readonly GameState S;
        public readonly Settings Cfg;
        public readonly List<GameEvent> Events = new List<GameEvent>();
        readonly Random rng;

        // Flows of the last step, for the screen.
        public double EnergyDemand, EnergySupply, SolarKw, ReactorKw, EnergyRatio = 1;
        public double AirRate, SmokeRate;
        public readonly Dictionary<string, double> AirBySource = new Dictionary<string, double>();
        public readonly Bag RatePerMin = new Bag();
        public readonly Bag UsePerMin = new Bag();
        public bool Hungry;

        public Colony(Balance bal, GameState state, Settings cfg = null)
        {
            Bal = bal;
            S = state ?? new GameState();
            S.Fit();
            Cfg = cfg ?? new Settings();
            rng = new Random(S.NextColonistId * 7919 + (int)S.GameTime);
            EnsureResearchBuilding();
        }

        void EnsureResearchBuilding()
        {
            // The research station is on the map from the start, buried under the debris of the landing.
            if (S.Get("research") == null)
                S.Buildings.Add(new BuildingState { Id = "research", Level = 1, ShownLevel = 1, Built = false });
        }

        void Emit(Ev kind, string id = null, string text = null) => Events.Add(new GameEvent(kind, id, text));

        public void Echo(string text, string onceKey = null)
        {
            if (onceKey != null)
            {
                if (S.Said.Contains(onceKey)) return;
                S.Said.Add(onceKey);
            }
            S.Notes.Add(new EchoLog { GameTime = S.GameTime, Text = text });
            if (S.Notes.Count > 60) S.Notes.RemoveAt(0);
            Emit(Ev.Echo, null, text);
        }

        // =====================================================================
        // Queries
        // =====================================================================

        public double Capacity => Content.ArkCapacity + Content.StoreCapacity(S.Level("warehouse"));
        public int Awake => S.Colonists.Count;
        public int Beds => Content.Beds(S.Level("home")) + Content.Beds(S.Level("brickhome"));
        public int Seats => Content.Seats(S.Level("kitchen")) + Content.Seats(S.Level("canteen"));
        public int Pods => Content.PodsPowered(S.Ark);
        public bool DaysStarted => S.Ark >= 7;
        public double CycleMinutes => 20 * Cfg.CycleScale;
        public double NightMinutes => Bal.NightMin * Cfg.CycleScale;
        public bool IsDone(string research) => S.Done.Contains(research);
        public int ResearchSlots => S.ResearchUpgraded ? 2 : 1;
        public int Chapter => S.Ark <= 10 ? 1 : S.Ark <= 20 ? 2 : 3;

        public bool Staffed(BuildingState b) => b.Workers.Any(w => w != 0);

        public int Stars(ColonistState c) => Math.Min(5, (int)(c.WorkMinutes / 180));

        /// <summary>A worker's bonus from the stars: +10% at one, +5% for each next, +30% at five (levels.md, proposal).</summary>
        public static double StarBonus(int stars) => stars <= 0 ? 0 : 0.05 + 0.05 * stars;

        double HappyFactor(ColonistState c) => 0.9 + 0.2 * c.Happiness / 100.0;

        /// <summary>The type a building is one of (the second greenhouse is a greenhouse).</summary>
        public static string Kind(string id) => Content.Find(id)?.Kind ?? id;

        public static bool IsGreenhouse(string id) => Kind(id) == "greenhouse";

        /// <summary>Ark level on which a building can be built.</summary>
        public int UnlockOf(BuildingDef def) => def.Unlock > 0 ? def.Unlock : Bal.B(def.Kind).Unlock;

        /// <summary>The highest level a building may be upgraded to now.</summary>
        public int MaxLevel(string id)
        {
            if (id == "research") return S.Ark >= 10 ? 2 : 1;
            if (id == "home" || id == "brickhome") return 20; // a home's last level is 20 (levels.md)
            var store = S.Level("warehouse");
            var cap = (store > 0 ? store : S.Ark) + 5; // "at most 5 levels above the store" (levels.md, proposal)
            if (id == "warehouse") cap = S.Ark + 5;
            // Upgrades that unlock something new want the Ark on a level (levels.md, general rule 3).
            if (id == "mine" || id == "veglab")
            {
                if (S.Ark < 9) cap = Math.Min(cap, 9);
                else if (S.Ark < 14) cap = Math.Min(cap, 14);
                else if (id == "mine" && S.Ark < 24) cap = Math.Min(cap, 19);
            }
            if (IsGreenhouse(id) && S.Ark < 16) cap = Math.Min(cap, 15); // food from the greenhouse's level 16 wants the Ark on 16
            if (id == "kitchen" || id == "canteen") cap = Math.Min(cap, 20); // the last level of a building for food
            return Math.Min(cap, 25);
        }

        public BuildingRow Row(string id, int level) => Bal.B(Kind(id)).Row(level);

        public Bag UpgradeCost(BuildingState b)
        {
            if (b.Id == "research") return Row("research", 10).UpgradeCost; // the level-10 upgrade (second slot)
            return Row(b.Id, b.Level).UpgradeCost;
        }

        /// <summary>The builder at the console in the Ark (levels.md, level 13): -10% on builds and upgrades, up to -20% at five stars.</summary>
        public double BuilderCut
        {
            get
            {
                var c = S.Builder != 0 ? S.Colonist(S.Builder) : null;
                if (c == null) return 0;
                var stars = Stars(c);
                return stars <= 1 ? 0.10 : 0.10 + 0.025 * (stars - 1);
            }
        }

        public double UpgradeSeconds(BuildingState b)
        {
            var sec = b.Id == "research" ? Row("research", 10).UpgradeSeconds : Row(b.Id, b.Level).UpgradeSeconds;
            if (IsDone("short_upgrades")) sec *= 0.85;
            sec *= 1 - BuilderCut;
            return Math.Max(sec, Cfg.MinUpgradeReal * Cfg.Tempo);
        }

        public double BuildSeconds(string id) => Math.Max(Bal.B(Kind(id)).BuildSeconds * (1 - BuilderCut), Cfg.MinBuildReal * Cfg.Tempo);

        /// <summary>What printing a building costs: its paste, and the bricks and cables of the brick home and the canteen.</summary>
        public Bag BuildCost(string id)
        {
            var cost = new Bag(Bal.B(Kind(id)).BuildCost);
            var extra = Content.B(id).Extra;
            if (extra != null) cost.Add(extra);
            return cost;
        }

        public bool CanAfford(Bag cost)
        {
            foreach (var (r, a) in cost.NonZero()) if (S.Stock[r] + 1e-6 < a) return false;
            return true;
        }

        void Pay(Bag cost)
        {
            foreach (var (r, a) in cost.NonZero()) S.Stock[r] = Math.Max(0, S.Stock[r] - a);
        }

        void Gain(Res r, double amount)
        {
            S.Stock[r] = Math.Min(Capacity, S.Stock[r] + amount);
        }

        // =====================================================================
        // The build menu
        // =====================================================================

        /// <summary>Why a building cannot be built now ("" = it can). Used for the padlock under the black silhouette.</summary>
        public string WhyNotBuild(string id, out int unlockLevel)
        {
            var def = Content.B(id);
            unlockLevel = UnlockOf(def);
            if (id == "research") return "Under the debris";
            if (S.Has(id) || (S.Get(id) != null && !S.Get(id).Built && S.Get(id).BuildTotal > 0)) return "Built";
            if (InTutorial)
            {
                var want = TutorialBuilding;
                return want == id ? "" : "Locked";
            }
            if (S.Ark < unlockLevel) return $"Level {unlockLevel}";
            if (def.Blueprint != null && !IsDone(def.Blueprint))
            {
                var r = Content.R(def.Blueprint);
                if (S.Ark < r.ArkLevel) { unlockLevel = Math.Max(unlockLevel, r.ArkLevel); return $"Level {unlockLevel}"; }
                return "Needs its blueprint (Research)";
            }
            if (def.MinAtmo > 0 && S.Atmo < def.MinAtmo) return $"Needs {def.MinAtmo}% air";
            if (def.Zone > S.Zone) return def.Zone == 1 ? "Under the dust: research Zone I expansion" : "Under the dust: research Zone II expansion";
            if (Printing != null) return "The drone is busy";
            if (!CanAfford(BuildCost(id))) return "Not enough resources";
            return "";
        }

        /// <summary>The one of a kind the build menu offers: the first that is not standing yet (or the last, when all stand).</summary>
        public BuildingDef NextOfKind(string kind)
        {
            var all = Content.OfKind(kind).ToList();
            foreach (var d in all)
            {
                var st = S.Get(d.Id);
                if (st == null || (!st.Built && st.BuildTotal <= 0)) return d;
            }
            return all.Last();
        }

        public BuildingState Printing => S.Buildings.FirstOrDefault(b => !b.Built && b.BuildTotal > 0);

        public bool Build(string id)
        {
            if (WhyNotBuild(id, out _) != "") return false;
            Pay(BuildCost(id));
            var sec = BuildSeconds(id);
            var st = S.Get(id);
            if (st == null) { st = new BuildingState { Id = id }; S.Buildings.Add(st); }
            st.Built = false; st.Level = 0; st.BuildLeft = sec; st.BuildTotal = sec;
            Emit(Ev.BuildStarted, id);
            return true;
        }

        // =====================================================================
        // Upgrades
        // =====================================================================

        public string WhyNotUpgrade(string id)
        {
            var b = S.Get(id);
            if (b == null || !b.Built) return "Not built";
            if (InTutorial && S.Tutorial < TStep.UpgradeToLevel2) return "Later";
            if (b.Upgrading) return "Upgrading";
            if (b.Level >= MaxLevel(id))
            {
                if ((id == "mine" || id == "veglab") && b.Level == 9 && S.Ark < 9) return "The Ark must be on level 9";
                if ((id == "mine" || id == "veglab") && b.Level == 14 && S.Ark < 14) return "The Ark must be on level 14";
                if (id == "mine" && b.Level == 19 && S.Ark < 24) return "The Ark must be on level 24";
                if (IsGreenhouse(id) && b.Level == 15 && S.Ark < 16) return "The Ark must be on level 16";
                if (id == "research") return S.Ark < 10 ? "The Ark must be on level 10" : "Top level for now";
                if ((id == "home" || id == "brickhome" || id == "kitchen" || id == "canteen") && b.Level >= 20) return "Its last level";
                var store = S.Level("warehouse");
                return store > 0 ? $"Needs the Store on level {b.Level - 4}" : $"Needs a Store (or the Ark on level {b.Level - 4})";
            }
            if (!CanAfford(UpgradeCost(b))) return "Not enough resources";
            return "";
        }

        public bool Upgrade(string id)
        {
            if (WhyNotUpgrade(id) != "") return false;
            var b = S.Get(id);
            Pay(UpgradeCost(b));
            b.UpgradeTotal = b.UpgradeLeft = UpgradeSeconds(b);
            Emit(Ev.UpgradeStarted, id);
            return true;
        }

        /// <summary>Tap on "Ready": the drone comes for a few seconds and prints the new part.</summary>
        public void Reprint(string id)
        {
            var b = S.Get(id);
            if (b == null || !b.Ready) return;
            b.Ready = false;
            b.ShownLevel = b.Level;
            Emit(Ev.Reprinted, id);
        }

        /// <summary>The model changes at this level (variants at 1, 10, 20; the mine becomes a shaft on 10; the research station on 2; a home's second floor on 11).</summary>
        static bool LooksDifferent(string id, int from, int to)
        {
            var def = Content.B(id);
            return def.ModelFor(from) != def.ModelFor(to) || ((id == "home" || id == "brickhome") && from < 11 && to >= 11);
        }

        // ---------- the greenhouses (levels.md, levels 16 and 17) ----------

        /// <summary>From its level 16 a greenhouse can give food too: "air and food" is about 70% of the air plus food.</summary>
        public bool CanGiveFood(BuildingState b) => b != null && b.Built && IsGreenhouse(b.Id) && b.Level >= 16;

        /// <summary>Switch "air only" / "air and food". It takes hold after one cycle of the plants, about an hour.</summary>
        public bool SetGreenhouseFood(string id, bool food)
        {
            var b = S.Get(id);
            if (!CanGiveFood(b)) return false;
            if (b.FoodWanted == food && (b.SwitchLeft > 0 || b.Food == food)) return true;
            b.FoodWanted = food;
            if (b.Food == food) { b.SwitchLeft = 0; return true; }
            b.SwitchLeft = 60 * 60;
            return true;
        }

        public bool SetSeedbed(string id, bool on)
        {
            var b = S.Get(id);
            if (b == null || !b.Built || !IsGreenhouse(b.Id) || !IsDone("hardy_seedlings")) return false;
            b.Seedbed = on;
            return true;
        }

        // =====================================================================
        // Research
        // =====================================================================

        public string WhyNotResearch(string id)
        {
            var r = Content.R(id);
            if (IsDone(id)) return "Done";
            if (S.Running.Any(x => x.Id == id)) return "Running";
            if (!S.DebrisCleared) return "No research station yet";
            if (InTutorial && id != "drills") return "Later";
            if (S.Ark < r.ArkLevel) return $"Level {r.ArkLevel}";
            if (r.MinAtmo > 0 && S.Atmo < r.MinAtmo) return $"Needs {r.MinAtmo}% air";
            var prev = Content.Previous(r);
            if (prev != null && !IsDone(prev.Id)) return $"After \"{prev.Name}\"";
            if (S.Running.Count >= ResearchSlots) return "The station is busy";
            if (r.Cost != null && !CanAfford(r.Cost)) return $"Needs {r.Cost}";
            return "";
        }

        public double ResearchSeconds(string id)
        {
            var sec = Content.R(id).Minutes * 60;
            var st = S.Get("research");
            var sci = st?.Workers.Where(w => w != 0).Select(S.Colonist).FirstOrDefault(c => c != null);
            if (sci != null)
            {
                var stars = Stars(sci);
                sec *= 1 - (stars <= 0 ? 0.05 : 0.075 + 0.025 * stars); // the scientist: -10% at one star to -20% at five (proposal)
            }
            return Math.Max(sec, Cfg.MinResearchReal * Cfg.Tempo);
        }

        public bool StartResearch(string id)
        {
            if (WhyNotResearch(id) != "") return false;
            var r = Content.R(id);
            if (r.Cost != null) Pay(r.Cost);
            var sec = ResearchSeconds(id);
            S.Running.Add(new ResearchRun { Id = id, Left = sec, Total = sec });
            Emit(Ev.ResearchStarted, id);
            return true;
        }

        void FinishResearch(string id)
        {
            S.Done.Add(id);
            Emit(Ev.ResearchDone, id);
            switch (id)
            {
                case "zone1":
                    S.Zone = Math.Max(S.Zone, 1);
                    Emit(Ev.ZoneOpened, "1");
                    Echo("The dust is settling over the next strip of the canyon. Room for a store and more.", "zone1");
                    break;
                case "zone2":
                    S.Zone = Math.Max(S.Zone, 2);
                    Emit(Ev.ZoneOpened, "2");
                    Echo("The south slope is clear: sun, and room for the greenhouses of chapter 2.", "zone2");
                    break;
                case "furnace_filter":
                    Echo("The filter is on the chimney. No more smoke.", "filter");
                    break;
                case "smelter_filter":
                    Echo("The smelter's filter is on. Steel, and no smoke.", "sfilter");
                    break;
                case "bp_mine": Echo("The mine's blueprint is ready. Build it in the canyon wall.", "bpmine"); break;
                case "builder_console": Echo(Texts.Console, "console"); break;
                case "hardy_seedlings": Echo(Texts.Seedbeds, "seedbeds"); break;
                case "bp_brickhome": Echo(Texts.BrickHome, "bpbrick"); break;
                case "antenna":
                    S.AntennaReady = true;
                    Emit(Ev.AntennaReady, "ark");
                    Echo("The antenna is ready. Tap \"Ready\" over the Ark: the drone unfolds the dish.", "antready");
                    break;
            }
        }

        // ---------- the antenna (levels.md, level 18) ----------

        /// <summary>Tap on "Ready" over the Ark: the drone comes for a few seconds and the dish unfolds.</summary>
        public bool FixAntenna()
        {
            if (!S.AntennaReady) return false;
            S.AntennaReady = false;
            S.AntennaFixed = true;
            Emit(Ev.AntennaFixed, "ark");
            Echo(Texts.AntennaFixed, "antfixed");
            Echo(Texts.Signal, "signal");
            return true;
        }

        /// <summary>With the antenna the robot goes where you send it: for carbon, stone or a speed-up (levels.md, level 18).</summary>
        public bool SetRobotTarget(string target)
        {
            if (!S.AntennaFixed) return false;
            if (target != "" && target != "carbon" && target != "stone" && target != "boost") return false;
            S.RobotTarget = target;
            return true;
        }

        // =====================================================================
        // The dock and the frame (levels.md, "Строежът и корабът")
        // =====================================================================

        public bool DockOpen => S.Ark >= 12;
        public FrameStage NextFrame => Content.Frame.FirstOrDefault(f => f.Stage == S.Frame + 1);

        public string WhyNotFrame()
        {
            if (!DockOpen) return "The dock opens on level 12";
            if (S.FrameLeft > 0) return "Building";
            var f = NextFrame;
            if (f == null) return "The frame is complete";
            if (S.Ark < f.ArkLevel) return $"Stage {f.Stage} on level {f.ArkLevel}";
            if (S.Stock[Res.Steel] + 1e-6 < f.Steel) return $"Needs {Fmt.Num(f.Steel)} steel";
            return "";
        }

        /// <summary>The Ark's fabricator makes the parts from steel; its crane and the gantry crane set them. No drone, no builder's bonus.</summary>
        public bool BuildFrame()
        {
            if (WhyNotFrame() != "") return false;
            var f = NextFrame;
            S.Stock[Res.Steel] -= f.Steel;
            S.FrameTotal = S.FrameLeft = Math.Max(f.Minutes * 60, Cfg.MinBuildReal * Cfg.Tempo);
            Emit(Ev.FrameStarted, f.Stage.ToString());
            if (f.Stage == 1) Echo(Texts.FrameFirst, "frame1");
            return true;
        }

        // =====================================================================
        // The Ark
        // =====================================================================

        public LevelReq NextReq => Content.Requirements.TryGetValue(S.Ark + 1, out var r) ? r : null;

        /// <summary>Every workplace there is now, and how many are taken (the builder's place in the Ark counts).</summary>
        public (int taken, int all) Jobs()
        {
            int taken = 0, all = 0;
            foreach (var b in S.Buildings)
            {
                if (!b.Built) continue;
                var n = Content.Slots(b.Id, b.Level, S.ResearchUpgraded);
                SyncSlots(b, n);
                for (int i = 0; i < n; i++) { all++; if (b.Workers[i] != 0) taken++; }
            }
            if (IsDone("builder_console")) { all++; if (S.Builder != 0) taken++; }
            return (taken, all);
        }

        public List<ReqItem> Requirements()
        {
            var list = new List<ReqItem>();
            var req = NextReq;
            if (req == null) return list;
            foreach (var (r, a) in req.Res.NonZero())
            {
                var label = ResInfo.ArkSpends(r) ? ResInfo.Name(r) : $"{ResInfo.Name(r)} in stock";
                list.Add(new ReqItem($"{label} {Fmt.Num(a)}", S.Stock[r] + 1e-6 >= a, Fmt.Num(S.Stock[r])));
            }
            list.Add(new ReqItem($"Air {req.Atmo}%", S.Atmo >= req.Atmo, $"{S.Atmo}%"));
            if (!req.ForEveryone && req.Colonists > 0) list.Add(new ReqItem($"Colonists awake {req.Colonists}", Awake >= req.Colonists, $"{Awake}"));
            if (req.Store > 0) list.Add(new ReqItem($"Store level {req.Store}", S.Level("warehouse") >= req.Store, S.Has("warehouse") ? $"{S.Level("warehouse")}" : "not built"));
            foreach (var def in Content.Buildings)
            {
                var need = Content.RequiredLevel(req, def.Id);
                if (need <= 0) continue;
                if (UnlockOf(def) > S.Ark && !req.ForEveryone) continue; // not on the map yet
                var name = def.Id == "greenhouse" && S.Has("greenhouse2") ? "First greenhouse" : def.Name;
                list.Add(new ReqItem($"{name} level {need}{(def.Id == "mine" && req.MineCopper ? " (copper)" : "")}", S.Level(def.Id) >= need, S.Has(def.Id) ? $"{S.Level(def.Id)}" : "not built"));
            }
            foreach (var id in req.Built) list.Add(new ReqItem($"{Content.B(id).Name} built", S.Has(id)));
            if (req.Greenhouses > 0)
            {
                var n = Content.OfKind("greenhouse").Count(d => S.Has(d.Id));
                list.Add(new ReqItem($"Greenhouses {req.Greenhouses}", n >= req.Greenhouses, $"{n}"));
            }
            if (req.GreenhouseFood) list.Add(new ReqItem("The first greenhouse gives food too", S.Get("greenhouse")?.Food == true));
            if (req.Builder) list.Add(new ReqItem("A builder in the Ark", S.Builder != 0));
            if (req.Frame > 0) list.Add(new ReqItem(req.Frame >= 4 ? "The frame complete" : $"The frame: stage {req.Frame}", S.Frame >= req.Frame, $"{S.Frame}/4"));
            if (req.Antenna) list.Add(new ReqItem("The antenna repaired", S.AntennaFixed));
            if (req.LabPotatoes) list.Add(new ReqItem("Vegetable lab with potatoes", S.Level("veglab") >= 5));
            if (req.MineIron) list.Add(new ReqItem("Mine digs iron ore (mine level 10)", S.Level("mine") >= 10));
            if (req.EnergyRatio > 0)
            {
                var panels = req.EnergyRatio > 1;
                var ratio = DaytimeEnergyRatio(panels);
                list.Add(new ReqItem(panels ? $"Panels give at least {req.EnergyRatio:0.#}x the use" : "Power by day at least the use",
                    ratio + 1e-6 >= req.EnergyRatio, $"{ratio:0.0}x"));
            }
            if (req.NightWithoutShortage) list.Add(new ReqItem("A night without a power shortage", S.NightOk));
            foreach (var id in req.Research) list.Add(new ReqItem($"Research: {Content.R(id).Name}", IsDone(id)));
            if (req.ResearchStationUpgraded) list.Add(new ReqItem("Research station upgraded (second slot)", S.ResearchUpgraded));
            if (req.ForEveryone)
            {
                // Beds 14/14 · Food 14/14 · Jobs 14/14 (levels.md, "Колко са и кога се будят").
                var (taken, all) = Jobs();
                list.Add(new ReqItem("Beds for everyone", Beds >= Awake, $"{Awake}/{Beds}"));
                list.Add(new ReqItem("Seats for everyone", Seats >= Awake, $"{Awake}/{Seats}"));
                list.Add(new ReqItem($"Every workplace taken ({req.Colonists} people)", taken >= all && Awake >= req.Colonists, $"{taken}/{Math.Max(all, req.Colonists)}"));
            }
            return list;
        }

        public string WhyNotArk()
        {
            if (S.ArkLeft > 0) return "Upgrading";
            if (NextReq == null) return "Chapter 2 is complete";
            if (InTutorial && S.Tutorial < TStep.UpgradeArk) return "Later";
            return Requirements().All(x => x.Done) ? "" : "Not everything is ready";
        }

        public bool UpgradeArk()
        {
            if (WhyNotArk() != "") return false;
            foreach (var (r, a) in NextReq.Res.NonZero())
                if (ResInfo.ArkSpends(r)) S.Stock[r] = Math.Max(0, S.Stock[r] - a);
            S.ArkTotal = S.ArkLeft = Math.Max(Content.ArkUpgradeMinutes(S.Ark) * 60, Cfg.MinArkReal * Cfg.Tempo);
            Emit(Ev.ArkUpgradeStarted);
            return true;
        }

        void ArkLevelUp()
        {
            S.Ark++;
            S.NightOk = false;
            if (S.Ark == 5) S.ReactorCapKw = DemandKw();
            if (S.Ark >= 7) S.ReactorCapKw = 0;
            Emit(Ev.ArkLevel, S.Ark.ToString());
            if (Texts.ArkLevelUp.TryGetValue(S.Ark, out var line) && S.Ark != 10 && S.Ark != 20) Echo(line, $"ark{S.Ark}");
            if (S.Ark == 2) { S.Tutorial = TStep.Done; S.Robot.Unlocked = true; LaunchRobot(); Emit(Ev.TutorialStep, "done"); }
            if (S.Ark == 10 && !S.Sketches.Contains("frame"))
            {
                S.Sketches.Add("frame");
                Emit(Ev.Sketch, "frame");
                Echo(Texts.Sketch, "sketch");
                Echo(Texts.FrameLater, "framelater");
            }
            if (S.Ark == 12) { Emit(Ev.DockOpened); Echo(Texts.DockOpen, "dock"); }
            if (S.Ark == 20 && !S.Sketches.Contains("hull"))
            {
                S.Sketches.Add("hull");
                Emit(Ev.Sketch, "hull");
                Echo(Texts.HullSketch, "sketch2");
            }
            if (S.Ark >= 11 && !S.Chapter1Done)
            {
                S.Chapter1Done = true;
                Emit(Ev.Chapter1Done);
                Echo(Texts.Chapter2, "ch2");
            }
            if (S.Ark >= Content.LastLevel && !S.Chapter2Done)
            {
                S.Chapter2Done = true;
                Emit(Ev.Chapter2Done);
                Echo(Texts.Chapter3, "ch3");
            }
            if (Texts.LevelHint.TryGetValue(S.Ark, out var hint)) Echo(hint, $"hint{S.Ark}");
        }

        /// <summary>
        /// The Ark's reactor (levels.md): it covers everything to level 4. On level 5 it keeps what the colony used then,
        /// so growth needs the sun; from level 7 it gives nothing.
        /// </summary>
        public double ReactorNow(double demand)
        {
            if (S.Ark <= 4) return demand;
            if (S.Ark <= 6) return Math.Min(demand, S.ReactorCapKw);
            return 0;
        }

        /// <summary>Power by day over the use. Level 7 wants the panels alone at 1.5x (levels.md, level 6 step 6).</summary>
        public double DaytimeEnergyRatio(bool panelsOnly = false)
        {
            var demand = Math.Max(0.001, DemandKw());
            return (SolarDayKw() + (panelsOnly ? 0 : ReactorNow(demand))) / demand;
        }

        // =====================================================================
        // Colonists
        // =====================================================================

        /// <summary>Empty workplaces now, the one ECHO recommends first.</summary>
        public List<SlotRef> EmptySlots(Profession only = Profession.None)
        {
            var list = new List<SlotRef>();
            foreach (var b in S.Buildings)
            {
                if (!b.Built) continue;
                var def = Content.B(b.Id);
                if (!def.HasWorkplace) continue;
                var n = Content.Slots(b.Id, b.Level, S.ResearchUpgraded);
                SyncSlots(b, n);
                for (int i = 0; i < n; i++)
                    if (b.Workers[i] == 0 && (only == Profession.None || def.Worker == only))
                        list.Add(new SlotRef { Building = b.Id, Slot = i, Profession = def.Worker });
            }
            // The builder's console in the Ark (levels.md, level 13): only a builder works there.
            if (IsDone("builder_console") && S.Builder == 0 && (only == Profession.None || only == Profession.Builder))
                list.Add(new SlotRef { Building = "ark", Slot = 0, Profession = Profession.Builder });
            var rec = RecommendedSlot(list);
            if (rec != null) rec.Recommended = true;
            return list.OrderByDescending(x => x.Recommended).ThenBy(x => Priority(x.Building)).ToList();
        }

        static readonly string[] PriorityOrder =
        {
            "kitchen", "canteen", "drill", "pump", "veglab", "mine", "furnace", "greenhouse", "research", "processor", "solar",
            "greenhouse2", "smelter", "ark", "claypit", "kiln", "greenhouse3", "copperworks",
        };

        static int Priority(string id) => Array.IndexOf(PriorityOrder, id) is int i && i >= 0 ? i : 99;

        /// <summary>ECHO's choice for the next colonist (levels.md, "Какво прави играчът").</summary>
        SlotRef RecommendedSlot(List<SlotRef> list)
        {
            string want = S.Ark switch
            {
                3 => null,
                4 => "mine",
                5 => "mine",
                6 => "furnace",
                8 => "greenhouse",
                9 => "mine",
                10 => "research",
                _ => null,
            };
            return list.FirstOrDefault(x => x.Building == want) ?? list.OrderBy(x => Priority(x.Building)).FirstOrDefault();
        }

        void SyncSlots(BuildingState b, int n)
        {
            while (b.Workers.Count < n) b.Workers.Add(0);
            while (b.Dig.Count < n) b.Dig.Add(Res.Stone);
        }

        /// <summary>Who wakes next: one of the first four on level 3, otherwise the profession of the place.</summary>
        public Texts.Person NextFixedPerson => Awake < 4 ? Texts.FirstFour[Awake] : null;

        public string WhyNotWake()
        {
            if (S.Ark < 3) return "The pods have no power yet (level 3)";
            if (!S.Has("home")) return "Build the Colonists' Home first";
            if (!S.Has("kitchen")) return "Build the Common Kitchen first";
            if (Awake >= Pods) return $"No more pods with power. The Ark gives one more on level {S.Ark + 1}";
            var fixedP = NextFixedPerson;
            if (fixedP != null && fixedP.Profession != Profession.Cook && EmptySlots(fixedP.Profession).Count == 0)
                return $"No place for a {Texts.ProfessionName(fixedP.Profession).ToLowerInvariant()}";
            if (fixedP == null && EmptySlots().Count == 0) return "No empty workplace";
            if (Awake >= Beds) return S.Level("home") >= 20 && !S.Has("brickhome") ? Texts.HomeFull : Texts.NoBed;
            if (Awake >= Seats) return Texts.NoSeat;
            return "";
        }

        /// <summary>Who the Ark would wake for a place (the first four are fixed; then the place decides the profession).</summary>
        public Texts.Person WhoFor(string building)
        {
            var fixedP = NextFixedPerson;
            if (fixedP != null) return fixedP;
            var prof = building == "ark" ? Profession.Builder : Content.B(building).Worker;
            return Texts.Pool.TryGetValue(prof, out var pool) ? pool.FirstOrDefault(p => !S.UsedNames.Contains(p.Name)) ?? Texts.Anyone(prof, S.NextColonistId)
                : Texts.Anyone(prof, S.NextColonistId);
        }

        /// <summary>Wake a colonist into a workplace. The first four are fixed; then the place decides the profession.</summary>
        public ColonistState Wake(string building, int slot)
        {
            if (WhyNotWake() != "") return null;
            var who = WhoFor(building);
            if (NextFixedPerson != null && who.Profession == Profession.Cook) { building = "kitchen"; slot = 0; }
            ColonistState c;
            if (building == "ark")
            {
                if (!IsDone("builder_console") || S.Builder != 0 || who.Profession != Profession.Builder) return null;
                c = NewColonist(who, "ark", 0);
                S.Builder = c.Id;
            }
            else
            {
                var b = S.Get(building);
                if (b == null || !b.Built) return null;
                if (Content.B(building).Worker != who.Profession) return null;
                SyncSlots(b, Content.Slots(building, b.Level, S.ResearchUpgraded));
                if (slot < 0 || slot >= b.Workers.Count || b.Workers[slot] != 0) return null;
                c = NewColonist(who, building, slot);
                b.Workers[slot] = c.Id;
                if (building == "mine") b.Dig[slot] = BestDig(b);
                // An idle building hands its bubble over when someone starts working there.
                CollectInto(b);
            }
            Emit(Ev.Woken, c.Id.ToString(), $"{c.Name}: \"{c.Earth}\"");
            if (Awake == Seats && S.Ark >= 7 && S.Ark <= 10) Echo(Texts.KitchenFull, "kitchenfull");
            if (Awake == 20 && S.Level("home") >= 20) Echo(Texts.HomeFull, "homefull");
            return c;
        }

        ColonistState NewColonist(Texts.Person who, string work, int slot)
        {
            var c = new ColonistState
            {
                Id = S.NextColonistId++, Name = who.Name, Story = who.Story, Earth = who.Earth, Profession = who.Profession,
                Work = work, Slot = slot, Happiness = 60,
            };
            S.UsedNames.Add(who.Name);
            S.Colonists.Add(c);
            return c;
        }

        Res BestDig(BuildingState mine)
        {
            var mats = Content.MineMaterials(mine.Level);
            var dug = mine.Dig.Take(mine.Workers.Count).Where((d, i) => mine.Workers[i] != 0).ToList();
            foreach (var r in new[] { Res.Copper, Res.Iron, Res.Quartz })
                if (mats.Contains(r) && !dug.Contains(r)) return r;
            return Res.Stone;
        }

        public bool SetDig(int slot, Res res)
        {
            var m = S.Get("mine");
            if (m == null || slot < 0 || slot >= m.Dig.Count) return false;
            if (!Content.MineMaterials(m.Level).Contains(res)) return false;
            m.Dig[slot] = res;
            return true;
        }

        public bool SetCrop(string crop)
        {
            var c = Content.Crops.FirstOrDefault(x => x.Id == crop);
            if (c == null || S.Level("veglab") < c.LabLevel) return false;
            S.Crop = crop;
            if (!S.CropsTried.Contains(crop)) S.CropsTried.Add(crop);
            return true;
        }

        // =====================================================================
        // Bubbles, debris, robot, impulse
        // =====================================================================

        public Bag Collect(string id)
        {
            var b = S.Get(id);
            if (b == null) return new Bag();
            var got = CollectInto(b);
            if (!got.IsEmpty)
            {
                Emit(Ev.Collected, id, got.ToString());
                if (S.Tutorial == TStep.Collect && id == "drill" && ++S.TutorialCollects >= 3) AdvanceTutorial();
            }
            return got;
        }

        Bag CollectInto(BuildingState b)
        {
            var got = new Bag();
            foreach (var r in ResInfo.All)
            {
                var a = b.Buffer[r];
                if (a <= 0) continue;
                var room = Math.Max(0, Capacity - S.Stock[r]);
                var take = Math.Min(a, room);
                S.Stock[r] += take;
                b.Buffer[r] = a - take;
                got[r] = take;
            }
            return got;
        }

        public bool ClearDebris()
        {
            if (S.DebrisCleared) return false;
            if (InTutorial && S.Tutorial != TStep.Debris) return false;
            S.DebrisCleared = true;
            var r = S.Get("research");
            r.Built = true; r.Level = 1; r.ShownLevel = 1;
            Emit(Ev.Debris);
            if (S.Tutorial == TStep.Debris) AdvanceTutorial();
            return true;
        }

        /// <summary>With the antenna and a target on the map the robot goes farther: longer trips, more cargo (proposal).</summary>
        bool RobotFar => S.AntennaFixed && S.RobotTarget != "";

        double RobotTripSeconds => 30 * 60 * (IsDone("fast_robot") ? 0.7 : 1) * (RobotFar ? 1.3 : 1);

        void LaunchRobot()
        {
            var rb = S.Robot;
            rb.Back = false;
            rb.Total = rb.Left = Math.Max(RobotTripSeconds, 25 * Cfg.Tempo); // at least 25 real seconds of driving
            Emit(Ev.RobotOut);
        }

        void RobotArrives()
        {
            var rb = S.Robot;
            rb.Back = true;
            rb.Trips++;
            var roll = rng.NextDouble();
            var trip = RobotTripSeconds / 60.0;
            var big = (IsDone("big_cargo") ? 1.5 : 1.0) * (RobotFar ? 1.5 : 1.0);
            var boost = RobotFar ? S.RobotTarget == "boost" : roll < 0.15 && rb.Trips > 1;
            if (boost)
            {
                rb.Boost = true; rb.Amount = 0;
            }
            else
            {
                rb.Boost = false;
                rb.Cargo = RobotFar ? (S.RobotTarget == "stone" ? Res.Stone : Res.Carbon) : roll < 0.6 ? Res.Carbon : Res.Stone;
                var rate = Math.Max(5, RatePerMin[rb.Cargo]);
                rb.Amount = Math.Round(Math.Max(10, rate * trip * 0.15 * big));
            }
            Emit(Ev.RobotBack, null, rb.Boost ? "a speed-up" : $"{Fmt.Num(rb.Amount)} {ResInfo.Name(rb.Cargo).ToLowerInvariant()}");
        }

        /// <summary>Tap on the robot: unload it and send it out again.</summary>
        public string UnloadRobot()
        {
            var rb = S.Robot;
            if (!rb.Unlocked || !rb.Back) return null;
            string got;
            if (rb.Boost)
            {
                var cut = 10 * 60.0; // a speed-up: 10 game minutes off every running timer (proposal)
                foreach (var b in S.Buildings)
                {
                    if (b.Upgrading) b.UpgradeLeft = Math.Max(1, b.UpgradeLeft - cut);
                    if (!b.Built && b.BuildTotal > 0) b.BuildLeft = Math.Max(1, b.BuildLeft - cut);
                }
                foreach (var r in S.Running) r.Left = Math.Max(1, r.Left - cut);
                if (S.ArkLeft > 0) S.ArkLeft = Math.Max(1, S.ArkLeft - cut);
                if (S.FrameLeft > 0) S.FrameLeft = Math.Max(1, S.FrameLeft - cut);
                got = "Speed-up: 10 minutes off every timer";
            }
            else
            {
                Gain(rb.Cargo, rb.Amount);
                got = $"+{Fmt.Num(rb.Amount)} {ResInfo.Name(rb.Cargo).ToLowerInvariant()}";
            }
            LaunchRobot();
            return got;
        }

        public bool ImpulseReady => S.Ark >= 2 && S.ImpulseCooldown <= 0;

        /// <summary>ECHO's impulse (concept.md, proposal): a building works twice as fast for 5 minutes; recharges in an hour.</summary>
        public bool Impulse(string id)
        {
            var b = S.Get(id);
            if (!ImpulseReady || b == null || !b.Working) return false;
            b.ImpulseLeft = 5 * 60;
            S.ImpulseCooldown = 60 * 60;
            Emit(Ev.Impulse, id);
            return true;
        }

        // =====================================================================
        // The tutorial (levels.md level 1; concept.md "The first 10 minutes with ECHO")
        // =====================================================================

        public static class TStep
        {
            public const int Landing = 0, Geolocator = 1, Drill = 2, Collect = 3, Pump = 4, Processor = 5, Lab = 6,
                Debris = 7, Research = 8, UpgradeToLevel2 = 9, UpgradeArk = 10, Done = 11;
        }

        public bool InTutorial => S.Tutorial < TStep.Done;

        public string TutorialBuilding => S.Tutorial switch
        {
            TStep.Geolocator => "geolocator",
            TStep.Drill => "drill",
            TStep.Pump => "pump",
            TStep.Processor => "processor",
            TStep.Lab => "veglab",
            _ => null,
        };

        public string TutorialLine => S.Tutorial switch
        {
            TStep.Landing => Texts.Hello,
            TStep.Geolocator => Texts.Tutorial.Containers,
            TStep.Drill => Texts.Tutorial.Atmo,
            TStep.Collect => Texts.Tutorial.Collect,
            TStep.Pump => Texts.Tutorial.Water,
            TStep.Processor => Texts.Tutorial.Processor,
            TStep.Lab => Texts.Tutorial.Lab,
            TStep.Debris => Texts.Tutorial.Debris,
            TStep.Research => Texts.Tutorial.Research,
            TStep.UpgradeToLevel2 => Texts.Tutorial.Requirements,
            TStep.UpgradeArk => Texts.Tutorial.UpgradeArk,
            _ => null,
        };

        /// <summary>The landing scene is over: ECHO starts leading.</summary>
        public void LandingDone()
        {
            if (S.Tutorial == TStep.Landing) AdvanceTutorial();
        }

        void AdvanceTutorial()
        {
            S.Tutorial++;
            Emit(Ev.TutorialStep, S.Tutorial.ToString());
            var line = TutorialLine;
            if (line != null) Echo(line, $"tut{S.Tutorial}");
            if (S.Tutorial == TStep.Research)
            {
                StartResearch("drills");
                AdvanceTutorial();
            }
        }

        void TutorialOnBuilt(string id)
        {
            if (TutorialBuilding == id)
            {
                if (S.Tutorial == TStep.Lab) { AdvanceTutorial(); return; } // -> Debris
                AdvanceTutorial();
            }
        }

        void TutorialCheck()
        {
            if (S.Tutorial == TStep.UpgradeToLevel2 && Requirements().All(x => x.Done)) AdvanceTutorial();
        }

        // =====================================================================
        // Goals (from level 2): three goals that lead to the next level (concept.md)
        // =====================================================================

        public List<string> Goals()
        {
            var goals = new List<string>();
            if (InTutorial) { if (TutorialLine != null) goals.Add(TutorialLine); return goals; }
            var req = NextReq;
            if (req == null) { goals.Add("Chapter 2 is complete."); return goals; }
            // 1. A new building or its blueprint.
            foreach (var def in Content.Buildings)
            {
                if (def.Id == "research" || S.Has(def.Id) || UnlockOf(def) > S.Ark) continue;
                if (Content.RequiredLevel(req, def.Id) <= 0 && !req.Built.Contains(def.Id) && !(IsGreenhouse(def.Id) && req.ForEveryone)) continue;
                if (def.Blueprint != null && !IsDone(def.Blueprint)) goals.Add($"Research \"{Content.R(def.Blueprint).Name}\"");
                else goals.Add($"Build the {def.Name}");
                break;
            }
            foreach (var id in req.Research) if (!IsDone(id)) { goals.Add($"Research \"{Content.R(id).Name}\""); break; }
            if (!req.ForEveryone && req.Colonists > Awake) goals.Add($"Wake colonist {req.Colonists}");
            if (req.ForEveryone && WhyNotWake() == "") goals.Add("A pod is glowing: wake the next colonist");
            if (req.Frame > S.Frame && WhyNotFrame() == "") goals.Add($"Build stage {S.Frame + 1} of the frame in the dock");
            if (S.AntennaReady) goals.Add("Tap \"Ready\" over the Ark: the antenna");
            var low = Content.Buildings.Where(d => S.Has(d.Id) && Content.RequiredLevel(req, d.Id) > S.Level(d.Id)).ToList();
            if (low.Count > 0)
                goals.Add(req.ForEveryone ? $"Upgrade the {low[0].Name} to level {Content.RequiredLevel(req, low[0].Id)}" : $"Upgrade {low.Count} building{(low.Count > 1 ? "s" : "")} to level {req.Level}");
            if (S.Atmo < req.Atmo) goals.Add($"Air {req.Atmo}%");
            foreach (var it in Requirements()) if (!it.Done && goals.Count < 6 && !goals.Any(g => g.Contains(it.Text))) goals.Add(it.Text);
            return goals.Take(3).ToList();
        }

        /// <summary>The cheapest upgrade available now (ECHO points at it when the player stands still).</summary>
        public string CheapestUpgrade()
        {
            string best = null; double bestCost = double.MaxValue;
            foreach (var b in S.Buildings)
            {
                if (!b.Built || WhyNotUpgrade(b.Id) != "") continue;
                var c = UpgradeCost(b);
                var sum = c.V.Sum();
                if (sum < bestCost) { bestCost = sum; best = b.Id; }
            }
            return best;
        }

        // =====================================================================
        // Time
        // =====================================================================

        /// <summary>Advance by real seconds while the player is in the game.</summary>
        public void Tick(double realSeconds)
        {
            var game = realSeconds * Cfg.Tempo;
            while (game > 1e-9)
            {
                var dt = Math.Min(game, 5);
                Step(dt, true, true);
                game -= dt;
            }
        }

        /// <summary>The time the game was closed. Workers keep producing for a while; timers run to the end. Returns what was made.</summary>
        public Bag CatchUp(double realSeconds)
        {
            var before = new Bag(S.Stock);
            var game = realSeconds * Cfg.Tempo;
            var window = Cfg.AwayHours * 3600 * (IsDone("long_shift") ? 2 : 1);
            // While the workers work: steps of 30 game seconds. After that nothing is made, only the timers and the
            // clock run, so the rest goes in at most about 2000 steps: a long absence at the test tempo once took so
            // many small steps that iOS stopped the game before it showed anything (20.11.2026).
            var coarse = Math.Max(30, (game - window) / 2000);
            double t = 0;
            while (t < game - 1e-9)
            {
                var working = t < window;
                var dt = Math.Min(game - t, working ? Math.Min(30, window - t) : coarse);
                Step(dt, false, working);
                t += dt;
            }
            var made = new Bag();
            for (int i = 0; i < ResInfo.Count; i++) made.V[i] = Math.Max(0, S.Stock.V[i] - before.V[i]);
            return made;
        }

        void Step(double dt, bool playing, bool workersOn)
        {
            S.GameTime += dt;
            if (S.ImpulseCooldown > 0) S.ImpulseCooldown = Math.Max(0, S.ImpulseCooldown - dt);
            DayNight(dt);
            Timers(dt);
            Produce(dt, playing, workersOn);
            People(dt, workersOn);
            if (playing) TutorialCheck();
        }

        void DayNight(double dt)
        {
            if (!DaysStarted) { S.Night = false; return; }
            var wasNight = S.Night;
            S.DayClock = (S.DayClock + dt / 60) % CycleMinutes;
            S.Night = S.DayClock >= CycleMinutes - NightMinutes;
            if (S.Night && !wasNight)
            {
                S.ShortageThisNight = false;
                S.NightsSeen++;
                Emit(Ev.NightFalls);
                if (S.NightsSeen == 1) Echo(Texts.FirstNight, "firstnight");
            }
            if (!S.Night && wasNight)
            {
                S.NightOk = !S.ShortageThisNight && S.Has("batteries");
                Emit(Ev.DayBreaks, null, S.NightOk ? "ok" : "short");
                if (S.NightOk) Echo("The batteries lasted until morning.", $"nightok{S.Ark}");
            }
        }

        void Timers(double dt)
        {
            foreach (var b in S.Buildings.ToList())
            {
                if (!b.Built && b.BuildTotal > 0)
                {
                    b.BuildLeft -= dt;
                    if (b.BuildLeft <= 0)
                    {
                        b.Built = true; b.Level = 1; b.ShownLevel = 1; b.BuildLeft = 0; b.BuildTotal = 0;
                        SyncSlots(b, Content.Slots(b.Id, 1, S.ResearchUpgraded));
                        Emit(Ev.Built, b.Id);
                        TutorialOnBuilt(b.Id);
                        OnBuiltEcho(b.Id);
                    }
                }
                if (b.ImpulseLeft > 0) b.ImpulseLeft = Math.Max(0, b.ImpulseLeft - dt);
                if (b.SwitchLeft > 0)
                {
                    b.SwitchLeft -= dt;
                    if (b.SwitchLeft <= 0) { b.SwitchLeft = 0; b.Food = b.FoodWanted; Emit(Ev.GreenhouseSwitched, b.Id); }
                }
                if (b.UpgradeLeft > 0)
                {
                    b.UpgradeLeft -= dt;
                    if (b.UpgradeLeft <= 0)
                    {
                        var from = b.Level;
                        b.UpgradeLeft = 0; b.UpgradeTotal = 0;
                        b.Level++;
                        if (b.Id == "research") { S.ResearchUpgraded = true; Echo("Two research projects at once now, and a desk for a scientist.", "research2"); }
                        SyncSlots(b, Content.Slots(b.Id, b.Level, S.ResearchUpgraded));
                        if (LooksDifferent(b.Id, from, b.Level)) { b.Ready = true; Emit(Ev.Ready, b.Id); }
                        else b.ShownLevel = b.Level;
                        Emit(Ev.Upgraded, b.Id, b.Level.ToString());
                        OnUpgradedEcho(b.Id, b.Level);
                    }
                }
            }
            foreach (var r in S.Running.ToList())
            {
                r.Left -= dt;
                if (r.Left <= 0) { S.Running.Remove(r); FinishResearch(r.Id); }
            }
            if (S.ArkLeft > 0)
            {
                S.ArkLeft -= dt;
                if (S.ArkLeft <= 0) { S.ArkLeft = 0; S.ArkTotal = 0; ArkLevelUp(); }
            }
            if (S.FrameLeft > 0)
            {
                S.FrameLeft -= dt;
                if (S.FrameLeft <= 0)
                {
                    S.FrameLeft = 0; S.FrameTotal = 0;
                    S.Frame++;
                    Emit(Ev.FrameDone, S.Frame.ToString());
                    Echo(S.Frame >= 4 ? Texts.FrameDone : $"Stage {S.Frame} of the frame stands in the dock.", $"framedone{S.Frame}");
                }
            }
            if (S.Robot.Unlocked && !S.Robot.Back)
            {
                S.Robot.Left -= dt;
                if (S.Robot.Left <= 0) RobotArrives();
            }
        }

        void OnBuiltEcho(string id)
        {
            switch (id)
            {
                case "geolocator": Emit(Ev.AtmoUp); break;
                case "mine": Echo("Stone at last. The robot will bring some too.", "mine"); break;
                case "home": Echo("The people will need to eat. The kitchen comes before we wake them.", "home"); break;
                case "kitchen": Echo("Beds and seats are ready. The pods are glowing: tap the Ark and wake them.", "kitchen"); break;
                case "furnace": Echo("The furnace smokes. We lose part of the air until it has a filter.", "furnace"); break;
                case "solar": Echo("Panels work by day. A worker who keeps the dust off gives 20% more.", "solar"); break;
                case "batteries": Echo("By day they fill from the surplus; at night they give it back. The bar is next to the power.", "batteries"); break;
                case "greenhouse": Echo("The greenhouse gives more air than the processor and the lab together.", "greenhouse"); break;
                case "warehouse": Echo("The store raises the ceiling of every stock.", "warehouse"); break;
                case "smelter": Echo(Texts.SmelterSmoke, "smelter"); break;
                case "claypit": Echo("Clay under the regolith, by the ice. The kiln will turn it into bricks.", "claypit"); break;
                case "kiln": Echo("The smelter and the kiln both eat a lot of power. The panels and the batteries must keep up.", "kiln"); break;
                case "copperworks": Echo("Our own cables, from our own copper.", "copperworks"); break;
                case "brickhome": Echo("Red walls, warm walls. The first home of our own bricks.", "brickhome"); break;
                case "canteen": Echo("A second place to eat. The colonists from the twenty-first on eat here.", "canteen"); break;
            }
        }

        void OnUpgradedEcho(string id, int level)
        {
            if (id == "veglab" && level == 5) Echo("Potatoes grow slower, but they feed more. Plant them before you leave.", "potato");
            if (id == "veglab" && level == 10) Echo("Beans: medium speed, more food than vegetables. Varied food makes people happier.", "bean");
            if (id == "veglab" && level == 15) Echo("Wheat: four seeds now. The kitchen bakes bread from it.", "wheat");
            if (id == "mine" && level == 5) Echo("Quartz, and room for a second miner.", "quartz");
            if (id == "mine" && level == 10) Echo(Texts.Iron, "iron");
            if (id == "mine" && level == 15) Echo("The first copper ore comes up with the wagons, and there's room for a fourth miner.", "copper");
            if (id == "greenhouse" && level == 16) Echo(Texts.GreenhouseFood, "ghfood");
            if (id == "home" && level >= 5 && level <= 10 && Awake < Pods) Echo("A new bed. The Ark has powered another pod.", $"bed{level}");
        }

        // ---------- Production ----------

        /// <summary>Power a building wants now, kW. Double glass: the greenhouses use 20% less at night (levels.md, level 11).</summary>
        double PowerOf(BuildingState b)
        {
            var kw = Row(b.Id, b.Level).EnergyKw;
            if (S.Night && IsGreenhouse(b.Id) && IsDone("double_glass")) kw *= 0.8;
            return kw;
        }

        /// <summary>Power the buildings want now, kW.</summary>
        public double DemandKw()
        {
            double d = 0;
            foreach (var b in S.Buildings)
                if (b.Working) d += PowerOf(b);
            return d;
        }

        public double SolarDayKw()
        {
            var b = S.Get("solar");
            if (b == null || !b.Working) return 0;
            var kw = Row("solar", b.Level).Get("kW by day");
            if (Staffed(b)) kw *= 1.2; // the worker keeps the dust off (levels.md)
            return kw;
        }

        /// <summary>What the batteries hold; the copper bars lose less as heat, so they last 10% longer (levels.md, level 18).</summary>
        public double BatteryCapacity
        {
            get
            {
                var b = S.Get("batteries");
                if (b == null || !b.Working) return 0;
                return Row("batteries", b.Level).Get("kWh") * Cfg.CycleScale * (IsDone("copper_bars") ? 1.1 : 1);
            }
        }

        double WorkerFactor(BuildingState b, int slot)
        {
            if (slot >= b.Workers.Count || b.Workers[slot] == 0) return 0;
            var c = S.Colonist(b.Workers[slot]);
            if (c == null) return 0;
            var f = 1.1 * (1 + StarBonus(Stars(c))) * HappyFactor(c); // a worker makes it a little faster (levels.md)
            if (Hungry) f *= 0.8;
            return f;
        }

        double Bonus(Res r)
        {
            double m = 1;
            if (r == Res.Carbon && IsDone("drills")) m *= 1.2;
            if (r == Res.Food && IsDone("fast_seeds")) m *= 1.2;
            if (r == Res.Water && IsDone("pump_plus")) m *= 1.2;
            if ((r == Res.Stone || r == Res.Quartz || r == Res.Iron || r == Res.Copper) && IsDone("wide_belts")) m *= 1.2;
            if (r == Res.Steel && IsDone("good_steel")) m *= 1.2;
            return m;
        }

        void Produce(double dt, bool playing, bool workersOn)
        {
            var min = dt / 60.0;
            for (int i = 0; i < ResInfo.Count; i++) { RatePerMin.V[i] = 0; UsePerMin.V[i] = 0; }
            AirBySource.Clear();

            // Energy
            EnergyDemand = 0;
            foreach (var b in S.Buildings)
            {
                if (!b.Working) continue;
                if (!playing && !Staffed(b)) continue;
                EnergyDemand += PowerOf(b);
            }
            SolarKw = S.Night ? 0 : SolarDayKw();
            ReactorKw = ReactorNow(EnergyDemand);
            var supply = SolarKw + ReactorKw;
            var cap = BatteryCapacity;
            if (supply >= EnergyDemand)
            {
                S.Battery = Math.Min(cap, S.Battery + (supply - EnergyDemand) * dt / 3600);
                EnergyRatio = 1;
            }
            else
            {
                var need = (EnergyDemand - supply) * dt / 3600;
                var take = Math.Min(S.Battery, need);
                S.Battery -= take;
                supply += take * 3600 / dt;
                EnergyRatio = EnergyDemand > 0 ? supply / EnergyDemand : 1;
                if (EnergyRatio < 0.999)
                {
                    if (S.Night) S.ShortageThisNight = true;
                    if (playing && S.Ark >= 5) Echo(S.Night && S.Has("batteries") ? Texts.BatteryEmpty : Texts.PowerShort, $"short{S.Ark}{(S.Night ? "n" : "d")}");
                }
            }
            EnergySupply = supply;
            S.LastEnergyRatio = EnergyRatio;
            var power = Math.Max(0.25, Math.Min(1, EnergyRatio)); // slower, never stopped (levels.md)
            var night = S.Night ? 0.95 : 1; // machines give 5% less at night (Joro, 11.11.2026)

            double air = 0, smokers = 0;
            foreach (var b in S.Buildings)
            {
                if (!b.Working) continue;
                var row = Row(b.Id, b.Level);
                var staffed = Staffed(b);
                var on = staffed ? workersOn : playing; // without a worker it works only while you play
                if (!on) continue;
                var k = power * night * (b.ImpulseLeft > 0 ? 2 : 1);
                switch (Kind(b.Id))
                {
                    case "drill": Make(b, Res.Carbon, row.Get("carbon/min") * k * Bonus(Res.Carbon) * Crew(b), min, staffed); break;
                    case "pump": Make(b, Res.Water, row.Get("water/min") * k * Bonus(Res.Water) * Crew(b), min, staffed); break;
                    case "veglab":
                    {
                        var crop = Content.Crops.First(c => c.Id == S.Crop);
                        Make(b, Res.Food, row.Get("food/min") * crop.Food * k * Bonus(Res.Food) * Crew(b), min, staffed);
                        var a = row.Get("air/min") * k * Crew(b);
                        AirBySource["Vegetable lab"] = a; air += a;
                        break;
                    }
                    case "processor":
                    {
                        var a = row.Get("air/min") * k * Crew(b) * (IsDone("processor_filter") ? 1.15 : 1);
                        AirBySource["Atmosphere processor"] = a; air += a;
                        break;
                    }
                    case "greenhouse":
                    {
                        // The seedling bed takes 10% of the rest; "air and food" gives about 70% of the air plus food (levels.md, 16-17).
                        var bed = b.Seedbed && IsDone("hardy_seedlings");
                        var less = bed ? 0.9 : 1;
                        var food = b.Food && b.Level >= 16;
                        var a = row.Get("air/min") * k * Crew(b) * less * (food ? 0.7 : 1);
                        var name = Content.B(b.Id).Name;
                        AirBySource[name] = a; air += a;
                        if (food) Make(b, Res.Food, row.Get("food/min") * k * Crew(b) * less * Bonus(Res.Food) * (IsDone("tomatoes") ? 1.2 : 1), min, staffed);
                        if (bed) Make(b, Res.Seedlings, row.Get("seedlings/min (from level 17)") * k * Crew(b), min, staffed);
                        break;
                    }
                    case "mine": MineWork(b, row, k, min, staffed); break;
                    case "furnace":
                        // quartz + carbon + power -> silicon: 2 quartz and 1 carbon for each (balance model)
                        Convert(b, Res.Silicon, row.Get("silicon/min") * k * Crew(b), (Res.Quartz, 2), (Res.Carbon, 1), min, staffed);
                        break;
                    case "smelter":
                        // iron ore + carbon + power -> steel: 2 iron ore and 1 carbon for each (balance model)
                        Convert(b, Res.Steel, row.Get("steel/min") * k * Crew(b) * Bonus(Res.Steel), (Res.Iron, 2), (Res.Carbon, 1), min, staffed);
                        break;
                    case "claypit": Make(b, Res.Clay, row.Get("clay/min") * k * Crew(b), min, staffed); break;
                    case "kiln":
                        // clay + power -> bricks: 2 clay for each (balance model)
                        Convert(b, Res.Bricks, row.Get("bricks/min") * k * Crew(b), (Res.Clay, 2), (Res.Clay, 0), min, staffed);
                        break;
                    case "copperworks":
                        // copper ore -> copper, with carbon insulation -> cables: 2 copper ore and 1 carbon for each (balance model)
                        Convert(b, Res.Cables, row.Get("cables/min") * k * Crew(b), (Res.Copper, 2), (Res.Carbon, 1), min, staffed);
                        break;
                }
                if ((b.Id == "furnace" && !IsDone("furnace_filter")) || (b.Id == "smelter" && !IsDone("smelter_filter"))) smokers++;
            }
            // Smoke from the furnace and the smelter until their filters (levels.md, levels 6 and 11): -15% of the air each (balance model).
            SmokeRate = air * 0.15 * smokers;
            AirRate = air - SmokeRate;
            S.Air += AirRate * min;
            while (S.Air >= Bal.AirFor(S.Atmo) && S.Atmo < 100)
            {
                S.Air -= Bal.AirFor(S.Atmo);
                S.Atmo++;
                Emit(Ev.AtmoUp, S.Atmo.ToString());
            }

            // Food: everyone awake eats; the cook in the kitchen makes it go a little further with each level (proposal).
            var eat = Bal.FoodPerColonistMin * Awake * min;
            var kitchen = S.Get("kitchen");
            if (kitchen != null && kitchen.Working && Staffed(kitchen)) eat *= Math.Max(0.8, 1 - 0.02 * (kitchen.Level - 1));
            UsePerMin[Res.Food] += Awake * Bal.FoodPerColonistMin;
            Hungry = Awake > 0 && S.Stock[Res.Food] < eat;
            S.Stock[Res.Food] = Math.Max(0, S.Stock[Res.Food] - eat);
        }

        /// <summary>A converter: as much output as its inputs in the store allow.</summary>
        void Convert(BuildingState b, Res output, double perMin, (Res r, double k) in1, (Res r, double k) in2, double min, bool staffed)
        {
            var want = perMin * min;
            var can = want;
            if (in1.k > 0) can = Math.Min(can, S.Stock[in1.r] / in1.k);
            if (in2.k > 0) can = Math.Min(can, S.Stock[in2.r] / in2.k);
            if (can <= 0) return;
            S.Stock[in1.r] -= in1.k * can; UsePerMin[in1.r] += in1.k * can / min;
            if (in2.k > 0) { S.Stock[in2.r] -= in2.k * can; UsePerMin[in2.r] += in2.k * can / min; }
            Make(b, output, can / min, min, staffed);
        }

        /// <summary>Single-workplace buildings: a worker's factor, or 1 while you play without one.</summary>
        double Crew(BuildingState b) => Staffed(b) ? WorkerFactor(b, 0) : 1;

        void MineWork(BuildingState b, BuildingRow row, double k, double min, bool staffed)
        {
            if (!staffed)
            {
                Make(b, Res.Stone, row.Get("stone/min per worker") * k * Bonus(Res.Stone), min, false);
                return;
            }
            for (int i = 0; i < b.Workers.Count; i++)
            {
                if (b.Workers[i] == 0) continue;
                var r = b.Dig[i];
                var key = $"{ResInfo.Key(r)}/min per worker";
                Make(b, r, row.Get(key) * k * Bonus(r) * WorkerFactor(b, i), min, true);
            }
        }

        void Make(BuildingState b, Res r, double perMin, double min, bool staffed)
        {
            if (perMin <= 0) return;
            RatePerMin[r] += perMin;
            var amount = perMin * min;
            if (staffed)
            {
                Gain(r, amount);
            }
            else
            {
                var limit = perMin * Cfg.BubbleMinutes;
                b.Buffer[r] = Math.Min(Math.Max(limit, b.Buffer[r]), b.Buffer[r] + amount);
            }
        }

        /// <summary>The home a colonist sleeps in: the first 20 in the first home, the rest in the brick home.</summary>
        public string HomeOf(ColonistState c)
        {
            var i = S.Colonists.IndexOf(c);
            return i >= 20 && S.Has("brickhome") ? "brickhome" : "home";
        }

        void People(double dt, bool workersOn)
        {
            var min = dt / 60.0;
            var kitchen = S.Get("kitchen");
            var cooked = kitchen != null && kitchen.Working && Staffed(kitchen);
            for (int i = 0; i < S.Colonists.Count; i++)
            {
                var c = S.Colonists[i];
                var homeLevel = S.Level(i >= 20 && S.Has("brickhome") ? "brickhome" : "home");
                // Happiness: the home's comfort, food, a cook, varied food (levels.md "Щастие"; numbers are a proposal).
                var target = 45 + Math.Min(30, 3 * homeLevel) + (cooked ? 10 : -10) + (Hungry ? -30 : 0) + 3 * (S.CropsTried.Count - 1);
                target = Math.Max(0, Math.Min(100, target));
                var step = 10 * dt / 3600.0; // 10 points per game hour
                c.Happiness += Math.Max(-step, Math.Min(step, target - c.Happiness));
                if (workersOn && !string.IsNullOrEmpty(c.Work)) c.WorkMinutes += min;
            }
        }

        // =====================================================================
        // For tests and the developer panel
        // =====================================================================

        /// <summary>Finish everything that runs now (developer panel).</summary>
        public void FinishTimers()
        {
            foreach (var b in S.Buildings)
            {
                if (!b.Built && b.BuildTotal > 0) b.BuildLeft = 0.001;
                if (b.UpgradeLeft > 0) b.UpgradeLeft = 0.001;
                if (b.SwitchLeft > 0) b.SwitchLeft = 0.001;
            }
            foreach (var r in S.Running) r.Left = 0.001;
            if (S.ArkLeft > 0) S.ArkLeft = 0.001;
            if (S.FrameLeft > 0) S.FrameLeft = 0.001;
            if (S.Robot.Unlocked && !S.Robot.Back) S.Robot.Left = 0.001;
            Step(0.01, true, true);
        }

        public void AddResources(double share)
        {
            foreach (var r in ResInfo.All) S.Stock[r] = Math.Min(Capacity, S.Stock[r] + Capacity * share);
        }

        public List<GameEvent> TakeEvents()
        {
            var e = new List<GameEvent>(Events);
            Events.Clear();
            return e;
        }
    }
}
