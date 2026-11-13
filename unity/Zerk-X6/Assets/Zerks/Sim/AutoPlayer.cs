using System;
using System.Linq;

namespace Zerks.Sim
{
    /// <summary>
    /// Plays the colony the way ECHO recommends: for the tests (can chapter 1 be finished, and how long does it take)
    /// and for the "Auto" switch in the developer panel.
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
            foreach (var b in s.Buildings.Where(b => b.Ready).ToList()) c.Reprint(b.Id);

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

            // Colonists.
            while (c.WhyNotWake() == "")
            {
                var fixedP = c.NextFixedPerson;
                var slots = fixedP != null ? c.EmptySlots(fixedP.Profession == Profession.Cook ? Profession.Cook : fixedP.Profession) : c.EmptySlots();
                var slot = fixedP != null && fixedP.Profession == Profession.Cook ? new SlotRef { Building = "kitchen", Slot = 0 } : slots.FirstOrDefault();
                if (slot == null || c.Wake(slot.Building, slot.Slot) == null) break;
            }

            // The mine digs what the next level is short of; the lab grows the richest crop.
            Mine(c);
            var crop = Content.Crops.Where(x => s.Level("veglab") >= x.LabLevel).OrderByDescending(x => x.Food).First();
            if (s.Crop != crop.Id) c.SetCrop(crop.Id);

            // Power first when it is short, then everything the Ark needs, cheapest first.
            if (s.Has("solar") && c.DaytimeEnergyRatio(true) < (s.Ark >= 6 ? 1.6 : 1.1)) c.Upgrade("solar");
            if (s.Has("batteries") && s.Ark >= 7 && c.BatteryCapacity < c.DemandKw() * c.NightMinutes / 60 * 1.3) c.Upgrade("batteries");
            if (s.Ark >= 10 && !s.ResearchUpgraded) c.Upgrade("research");
            var req = c.NextReq;
            if (req != null)
            {
                var store = s.Get("warehouse");
                var need = req.Res.V.Max();
                if (store != null && c.Capacity < need * 1.05) c.Upgrade("warehouse");
                var low = Content.Buildings
                    .Where(d => s.Has(d.Id) && Content.RequiredLevel(req, d.Id) > s.Level(d.Id) && !s.Get(d.Id).Upgrading)
                    .OrderBy(d => c.UpgradeCost(s.Get(d.Id)).V.Sum());
                foreach (var d in low) c.Upgrade(d.Id);
                if (s.Has("home") && c.Awake >= c.Beds && c.Awake < c.Pods) c.Upgrade("home");
                if (s.Has("kitchen") && c.Awake >= c.Seats && c.Awake < c.Pods) c.Upgrade("kitchen");
            }
            return null;
        }

        static void Mine(Colony c)
        {
            var m = c.S.Get("mine");
            if (m == null || !m.Built) return;
            var req = c.NextReq;
            var mats = Content.MineMaterials(m.Level);
            for (int i = 0; i < m.Workers.Count; i++)
            {
                if (m.Workers[i] == 0) continue;
                Res want = Res.Stone;
                if (i == 1 && mats.Contains(Res.Quartz)) want = Res.Quartz;
                if (i == 2 && mats.Contains(Res.Iron)) want = Res.Iron;
                if (i == 0 && mats.Contains(Res.Quartz) && m.Workers.Count(w => w != 0) == 1 && req != null &&
                    c.S.Stock[Res.Silicon] < req.Res[Res.Silicon] && c.S.Stock[Res.Stone] >= req.Res[Res.Stone]) want = Res.Quartz;
                if (m.Dig[i] != want) c.SetDig(i, want);
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
            var research = s.Get("research");
            research.Built = true; research.Level = 1; research.ShownLevel = 1;
            s.Ark = level;
            s.Robot.Unlocked = true; s.Robot.Back = true; s.Robot.Cargo = Res.Carbon; s.Robot.Amount = 20;
            foreach (var r in Content.Research.Where(r => r.ArkLevel < level)) s.Done.Add(r.Id);
            if (s.Done.Contains("zone1")) s.Zone = 1;
            var req = Content.Requirements.TryGetValue(level, out var q) ? q : null;
            foreach (var def in Content.Buildings)
            {
                if (def.Id == "research") continue;
                var unlock = bal.B(def.Id).Unlock;
                if (unlock >= level) continue;
                var lv = req != null ? Content.RequiredLevel(req, def.Id) : level;
                if (lv <= 0) lv = level;
                s.Buildings.Add(new BuildingState { Id = def.Id, Built = true, Level = lv, ShownLevel = lv });
            }
            s.Atmo = req?.Atmo ?? Content.StartAtmo;
            if (level >= 5) s.ReactorCapKw = level <= 6 ? c.DemandKw() * 0.9 : 0;
            for (int i = 0; i < ResInfo.Count; i++) s.Stock.V[i] = c.Capacity * 0.25;
            // Colonists as ECHO recommends, one for each level from 4 (and the first four on 3).
            var awake = level >= 4 ? level : 0;
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
            if (s.Level("veglab") >= 5) c.SetCrop(s.Level("veglab") >= 10 ? "bean" : "potato");
            if (s.Has("batteries")) s.Battery = c.BatteryCapacity;
            if (level >= 10) s.Sketches.Add("frame");
            foreach (var id in new[] { "ark2", "ark3", "ark4", "ark5", "ark6", "ark7", "ark8", "ark9", "ark10" }) s.Said.Add(id);
            c.TakeEvents();
            return s;
        }
    }
}
