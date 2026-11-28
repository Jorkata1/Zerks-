using System;
using System.Collections.Generic;
using System.Linq;

namespace Zerks.Sim
{
    /// <summary>
    /// Plays the colony the way ECHO recommends: for the tests (can chapters 1 to 4 be finished, and how long do they
    /// take) and for the "Auto" switch in the developer panel.
    /// </summary>
    public static class AutoPlayer
    {
        /// <summary>One decision round. Returns a short note of what it did (or null).</summary>
        public static string Act(Colony c)
        {
            var s = c.S;
            if (c.InTutorial) return Tutorial(c);

            foreach (var b in s.Buildings) if (!b.Buffer.IsEmpty) c.Collect(b.Id);
            if (s.Robot.Back) c.UnloadRobot();
            foreach (var b in s.Buildings.Where(b => b.Ready && b.Id != "university").ToList()) c.Reprint(b.Id);
            if (s.AntennaReady) c.FixAntenna();
            // chapters 3 and 4: the signs after a storm, the stones, the forecast, the trial run
            foreach (var id in s.Care.ToList()) c.Tend(id);
            while (s.Rocks > 0) c.CollectRocks();
            if (c.WhyNotPrepare() == "") c.Prepare();
            if (s.TrialReady) c.TrialRun();

            if (c.WhyNotArk() == "") { c.UpgradeArk(); return "ark"; }

            // Research: what leads to the next level first, then the rest of the chains.
            for (int guard = 0; guard < 3 && s.Running.Count < c.ResearchSlots; guard++)
            {
                var pick = Content.Recommended.Where(kv => kv.Key <= s.Ark).OrderByDescending(kv => kv.Key)
                    .SelectMany(kv => kv.Value).FirstOrDefault(id => c.WhyNotResearch(id) == "")
                    ?? Content.Research.FirstOrDefault(r => c.WhyNotResearch(r.Id) == "")?.Id;
                if (pick == null) break;
                c.StartResearch(pick);
            }

            // New buildings as soon as they can be built.
            foreach (var def in Content.Buildings)
                if (c.WhyNotBuild(def.Id, out _) == "") { c.Build(def.Id); break; }

            // The frame, the hull and the reactor in the dock, as soon as a stage can be built.
            if (c.WhyNotDock() == "") c.BuildDock();

            // The Green Belt: the first six patches, step by step (levels.md 21-26).
            foreach (var (id, _, _) in Content.PatchPlots.Take(6))
                if (c.WhyNotPatch(id) == "") c.WorkPatch(id);
            // Insulation, the dispatch's buildings, the streets round the Ark, the university, the seed vault.
            foreach (var d in Content.Buildings) if (c.WhyNotInsulate(d.Id) == "") c.Insulate(d.Id);
            if (s.Has("dispatch"))
                foreach (var id in new[] { "smelter", "glassworks", "smelter2", "woolworks", "copperworks", "furnace", "greenhouse" })
                    if (!s.Managed.Contains(id) && c.WhyNotManage(id) == "") c.SetManaged(id, true);
            var reqStone = c.NextReq?.Res[Res.Stone] ?? 0;
            foreach (var k in Content.ArkStreets)
                if (c.WhyNotPave(k) == "" && s.Stock[Res.Stone] >= reqStone * 0.5 + 3000) c.Pave(k);
            if (s.Study != null && s.Study.Ready) c.Swap();
            else if (s.Study == null && c.Teacher != null) { var (a, b) = c.SuggestPair(); if (a != 0) c.Study(a, b); }
            if (s.Get("seedvault") is BuildingState vault && vault.Built && vault.Mode == "") c.SetVaultMode("grain");

            // Colonists: the next one comes with the next empty workplace.
            while (c.WhyNotWake() == "")
            {
                var fixedP = c.NextFixedPerson;
                var slot = fixedP != null && fixedP.Profession == Profession.Cook
                    ? new SlotRef { Building = "kitchen", Slot = 0 }
                    : (fixedP != null ? c.EmptySlots(fixedP.Profession) : c.EmptySlots()).FirstOrDefault();
                if (slot == null || c.Wake(slot.Building, slot.Slot) == null) break;
            }

            // The mine digs what is short; the lab grows the richest crop; the greenhouses as levels.md asks.
            Mine(c);
            var crop = Content.Crops.Where(x => s.Level("veglab") >= x.LabLevel).OrderByDescending(x => x.Food).First();
            if (s.Crop != crop.Id) c.SetCrop(crop.Id);
            Greenhouses(c);

            // Power first when it is short, then everything the Ark needs, cheapest first.
            if (s.Has("solar") && c.DaytimeEnergyRatio(true) < (s.Ark >= 11 ? 1.9 : s.Ark >= 6 ? 1.6 : 1.1)) c.Upgrade("solar");
            if (s.Has("batteries") && s.Ark >= 7 && c.BatteryCapacity < c.DemandKw() * c.NightMinutes / 60 * 1.3) c.Upgrade("batteries");
            if (s.Ark >= 10 && !s.ResearchUpgraded) c.Upgrade("research");
            var req = c.NextReq;
            if (req != null)
            {
                var store = s.Get("warehouse");
                var need = req.Res.V.Max();
                if (store != null && (c.Capacity < need * 1.05 || s.Level("warehouse") < req.Store)) c.Upgrade("warehouse");
                var low = Content.Buildings
                    .Where(d => s.Has(d.Id) && Content.RequiredLevel(req, d.Id) > s.Level(d.Id) && !s.Get(d.Id).Upgrading)
                    .OrderBy(d => c.UpgradeCost(s.Get(d.Id)).V.Sum());
                foreach (var d in low) c.Upgrade(d.Id);
                // A bed and a seat for whoever the new workplace wakes (from level 11 the homes grow with the people).
                var waiting = c.EmptySlots().Count > 0 && c.Awake < c.Pods;
                if (waiting && c.Awake >= c.Beds) c.Upgrade(s.Level("home") < 20 ? "home" : "brickhome");
                if (waiting && c.Awake >= c.Seats) c.Upgrade(s.Level("kitchen") < 20 ? "kitchen" : "canteen");
                // From level 12 nothing else is asked for: the producers keep up with the Ark, as in the balance model.
                if (req.ForEveryone)
                {
                    var plan = Content.Buildings
                        .Where(d => s.Has(d.Id) && !s.Get(d.Id).Upgrading && Producer(d.Id) && s.Level(d.Id) < Content.PlanLevel(d.Id, s.Ark + 1))
                        .OrderBy(d => c.UpgradeCost(s.Get(d.Id)).V.Sum());
                    foreach (var d in plan) c.Upgrade(d.Id);
                }
            }
            return null;
        }

        /// <summary>The buildings that make something (not the homes, the kitchens, the store or the research station).</summary>
        static bool Producer(string id) => id != "home" && id != "brickhome" && id != "kitchen" && id != "canteen" && id != "research" && id != "warehouse";

        static void Greenhouses(Colony c)
        {
            var s = c.S;
            var req = c.NextReq;
            // levels.md, level 16: the first greenhouse gives air and food; the others keep making air.
            if (c.CanGiveFood(s.Get("greenhouse")) && !s.Get("greenhouse").FoodWanted) c.SetGreenhouseFood("greenhouse", true);
            if (!c.IsDone("hardy_seedlings")) return;
            // levels.md, level 17: a seedling bed in each greenhouse while seedlings are short.
            var want = Math.Max(req?.Res[Res.Seedlings] ?? 0, s.Ark >= 18 ? 300 : 100);
            var on = s.Stock[Res.Seedlings] < want * 1.02;
            foreach (var d in Content.OfKind("greenhouse"))
            {
                var b = s.Get(d.Id);
                if (b != null && b.Built && b.Seedbed != on) c.SetSeedbed(d.Id, on);
            }
        }

        /// <summary>Each miner digs what the colony is shortest of now (stone for the Ark, quartz, iron for steel, copper).</summary>
        static void Mine(Colony c)
        {
            var m = c.S.Get("mine");
            if (m == null || !m.Built) return;
            var s = c.S;
            var req = c.NextReq;
            var mats = Content.MineMaterials(m.Level);
            var miners = Enumerable.Range(0, m.Workers.Count).Where(i => m.Workers[i] != 0).ToList();
            if (miners.Count == 0) return;
            if (s.Ark <= 10)
            {
                // Chapter 1, as it was tested: stone, quartz, iron in that order of places.
                foreach (var i in miners)
                {
                    Res want = Res.Stone;
                    if (i == 1 && mats.Contains(Res.Quartz)) want = Res.Quartz;
                    if (i == 2 && mats.Contains(Res.Iron)) want = Res.Iron;
                    if (i == 0 && mats.Contains(Res.Quartz) && miners.Count == 1 && req != null &&
                        s.Stock[Res.Silicon] < req.Res[Res.Silicon] && s.Stock[Res.Stone] >= req.Res[Res.Stone]) want = Res.Quartz;
                    if (m.Dig[i] != want) c.SetDig(i, want);
                }
                return;
            }
            // How far each material is from what the next level and its stages need (0 = enough).
            // A little over the target, so a miner never stops one unit short.
            double Short(Res r, double target) => target <= 0 ? 0 : Math.Max(0, target * 1.05 + 5 - s.Stock[r]) / target;
            var dock = c.NextDock;
            var dockSoon = dock != null && dock.ArkLevel <= s.Ark + 1;
            var steelWant = (req?.Res[Res.Steel] ?? 0) + (dockSoon ? dock.Cost[Res.Steel] : 0) + (s.Ark <= 20 ? 0 : 500);
            var glassWant = (req?.Res[Res.Glass] ?? 0) + 300;
            // An ore that the furnaces eat at once stays short for ever: it counts only while what it makes is short (28.11.2026).
            var cablesWant = (req?.Res[Res.Cables] ?? 0) + (dockSoon ? dock.Cost[Res.Cables] : 0) + 300;
            var steelShort = Short(Res.Steel, steelWant);
            var siliconShort = Short(Res.Silicon, req?.Res[Res.Silicon] ?? 0) + (s.Has("glassworks") ? Short(Res.Glass, glassWant) : 0);
            var cablesShort = Short(Res.Cables, cablesWant);
            var need = s.Ark <= 20
                ? new Dictionary<Res, double>
                {
                    // chapters 1 and 2, as they were tested
                    [Res.Stone] = Short(Res.Stone, req?.Res[Res.Stone] ?? 0) + 0.05,
                    [Res.Quartz] = Short(Res.Quartz, 400) + Short(Res.Silicon, req?.Res[Res.Silicon] ?? 0),
                    [Res.Iron] = Short(Res.Iron, 600) + Short(Res.Steel, steelWant) * 1.5,
                    [Res.Copper] = Short(Res.Copper, Math.Max(req?.Res[Res.Copper] ?? 0, 300)) + Short(Res.Cables, req?.Res[Res.Cables] ?? 0),
                }
                : new Dictionary<Res, double>
                {
                    [Res.Stone] = Short(Res.Stone, (req?.Res[Res.Stone] ?? 0) + (s.Has("woolworks") ? 2000 : 0)) + 0.05,
                    [Res.Quartz] = siliconShort + (siliconShort > 0 ? Short(Res.Quartz, 400) : 0),
                    [Res.Iron] = steelShort * 1.5 + (steelShort > 0 ? Short(Res.Iron, 600) : 0),
                    [Res.Copper] = cablesShort + (cablesShort > 0 ? Short(Res.Copper, 300) : 0),
                };
            var count = new Dictionary<Res, int>();
            foreach (var i in miners)
            {
                var pick = mats.OrderByDescending(r => (need.TryGetValue(r, out var v) ? v : 0) / (1 + (count.TryGetValue(r, out var n) ? n : 0))).First();
                count[pick] = (count.TryGetValue(pick, out var k) ? k : 0) + 1;
                if (m.Dig[i] != pick) c.SetDig(i, pick);
            }
        }

        static string Tutorial(Colony c)
        {
            var s = c.S;
            switch (s.Tutorial)
            {
                case Colony.TStep.Landing: c.LandingDone(); return "landing";
                case Colony.TStep.Collect:
                    c.Collect("drill");
                    return "collect";
                case Colony.TStep.Debris: c.ClearDebris(); return "debris";
            }
            var want = c.TutorialBuilding;
            if (want != null && c.WhyNotBuild(want, out _) == "") { c.Build(want); return "build " + want; }
            foreach (var b in s.Buildings) if (!b.Buffer.IsEmpty) c.Collect(b.Id);
            if (s.Tutorial == Colony.TStep.UpgradeToLevel2)
                foreach (var id in Content.TutorialOrder)
                    if (s.Level(id) < 2) c.Upgrade(id);
            if (s.Tutorial == Colony.TStep.UpgradeArk) c.UpgradeArk();
            return null;
        }
    }

    /// <summary>The developer panel's jump: a colony at the start of an Ark level, built the way ECHO recommends.</summary>
    public static class Jump
    {
        public static GameState To(Balance bal, int level, Settings cfg)
        {
            level = Math.Max(1, Math.Min(Content.LastLevel, level));
            var c = new Colony(bal, new GameState(), cfg);
            if (level == 1) return c.S;
            var s = c.S;
            s.Tutorial = Colony.TStep.Done;
            s.DebrisCleared = true;
            s.Ark = level;
            var research = s.Get("research");
            research.Built = true; research.Level = level >= 11 ? 2 : 1; research.ShownLevel = research.Level;
            s.ResearchUpgraded = level >= 11;
            s.Robot.Unlocked = true; s.Robot.Back = true; s.Robot.Cargo = Res.Carbon; s.Robot.Amount = 20;
            foreach (var r in Content.Research.Where(r => r.ArkLevel < level)) s.Done.Add(r.Id);
            if (s.Done.Contains("zone1")) s.Zone = 1;
            if (s.Done.Contains("zone2")) s.Zone = 2;
            if (s.Done.Contains("zone3")) s.Zone = 3;
            var req = Content.Requirements.TryGetValue(level, out var q) ? q : null;
            foreach (var def in Content.Buildings)
            {
                if (def.Id == "research") continue;
                if (c.UnlockOf(def) >= level) continue; // it comes on its own level
                int lv;
                if (level <= 11) lv = req != null ? Content.RequiredLevel(req, def.Id) : level;
                else lv = req != null && req.Overrides.TryGetValue(def.Id, out var o) ? o : Content.PlanLevel(def.Id, level);
                if (lv <= 0) lv = level;
                s.Buildings.Add(new BuildingState { Id = def.Id, Built = true, Level = lv, ShownLevel = lv });
            }
            s.Atmo = req?.Atmo ?? Content.StartAtmo;
            if (level >= 5) s.ReactorCapKw = level <= 6 ? c.DemandKw() * 0.9 : 0;
            for (int i = 0; i < ResInfo.Count; i++) s.Stock.V[i] = c.Capacity * 0.25;
            // The ship and the antenna, as far as the levels before got them (levels.md).
            s.Frame = Content.Frame.Count(f => f.ArkLevel < level);
            s.AntennaFixed = level >= 19;
            // chapters 3 and 4: the hull and the reactor, the patches, the insulation, the paved square, the dispatch
            s.Hull = Content.Hull.Count(h => h.ArkLevel < level);
            s.Reactor = Content.ReactorStages.Count(r => r.ArkLevel < level);
            s.ReactorTested = level >= 40;
            var stage = level >= 27 ? 5 : level == 26 ? 4 : level == 25 ? 3 : level == 24 ? 2 : level >= 22 ? 1 : 0;
            foreach (var p in s.Patches.Take(6)) { p.Stage = stage; p.Grow = 0; }
            if (level >= 30) foreach (var d in Content.Buildings.Where(d => d.Insulates)) { var b = s.Get(d.Id); if (b != null) b.Insulated = true; }
            if (level >= 37) s.Paved.AddRange(Content.ArkStreets);
            if (level >= 34) s.Managed.AddRange(new[] { "smelter", "glassworks" });
            if (s.Get("seedvault") != null) s.Get("seedvault").Mode = "grain";
            if (level > 17) { s.Storms = 1; s.StormNext = 6 * 3600; }
            if (s.Has("greenhouse") && level >= 17) { var g = s.Get("greenhouse"); g.Food = g.FoodWanted = true; }
            // Colonists as ECHO recommends: as many as the levels before woke (levels.md).
            var awake = Content.ColonistsAfter.TryGetValue(level - 1, out var a) ? a : 0;
            while (c.Awake < awake)
            {
                var fixedP = c.NextFixedPerson;
                var slot = fixedP != null && fixedP.Profession == Profession.Cook
                    ? new SlotRef { Building = "kitchen", Slot = 0 }
                    : (fixedP != null ? c.EmptySlots(fixedP.Profession) : c.EmptySlots()).FirstOrDefault();
                if (slot == null) break;
                // Wake ignores the pods of the level we jumped to; the Ark gave them on the way.
                if (c.Wake(slot.Building, slot.Slot) == null) break;
            }
            var best = Content.Crops.Where(x => s.Level("veglab") >= x.LabLevel).OrderByDescending(x => x.Food).First();
            c.SetCrop(best.Id);
            if (s.Has("batteries")) s.Battery = c.BatteryCapacity;
            if (level >= 10) s.Sketches.Add("frame");
            if (level >= 20) s.Sketches.Add("hull");
            if (level >= 30) s.Sketches.Add("reactor");
            s.Chapter1Done = level >= 11;
            s.Chapter2Done = level >= 21;
            s.Chapter3Done = level >= 31;
            s.Chapter4Done = level >= 40;
            for (int l = 2; l <= level; l++) s.Said.Add($"ark{l}");
            foreach (var (key, from) in new[] { ("sketch", 10), ("framelater", 10), ("ch2", 11), ("dock", 12), ("frame1", 13), ("sketch2", 20),
                         ("ch3", 21), ("zone3", 22), ("lichens", 22), ("lichen1", 22), ("hull1", 23), ("moss1", 24), ("soil1", 25), ("grass1", 26),
                         ("buck1", 27), ("hulldone4", 30), ("insulated5", 30), ("sketch3", 30), ("ch4", 31), ("storm1", 18), ("stormend1", 18), ("trial", 40), ("ch4done", 40) })
                if (level >= from) s.Said.Add(key);
            c.TakeEvents();
            return s;
        }
    }
}
