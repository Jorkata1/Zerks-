using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Zerks.Sim;

namespace Zerks.Tests
{
    public class ColonyTests
    {
        static Balance bal;

        static Balance Bal => bal ??= Balance.Parse(File.ReadAllText("Assets/Zerks/Resources/balance.json"));

        static Colony NewColony(double tempo = 1) => new Colony(Bal, new GameState(), new Settings { Tempo = tempo });

        [Test]
        public void BalanceHasEveryBuildingToLevel40()
        {
            foreach (var def in Content.Buildings)
            {
                var b = Bal.B(def.Kind);
                Assert.That(b.Rows.Count, Is.GreaterThanOrEqualTo(40), def.Id);
            }
            Assert.That(Bal.AirFor(33), Is.GreaterThan(0));
            Assert.That(Bal.AirFor(39), Is.GreaterThan(0));
            Assert.That(Content.Requirements.Keys.Max(), Is.EqualTo(40));
        }

        [Test]
        public void TutorialStartsWithTheGeolocatorAndNothingElse()
        {
            var c = NewColony();
            c.LandingDone();
            Assert.That(c.WhyNotBuild("geolocator", out _), Is.EqualTo(""));
            Assert.That(c.WhyNotBuild("drill", out _), Is.Not.EqualTo(""));
            Assert.That(c.WhyNotUpgrade("geolocator"), Is.Not.EqualTo(""));
            Assert.That(c.Build("geolocator"), Is.True);
            Assert.That(c.Build("geolocator"), Is.False);
        }

        [Test]
        public void ContainersPayForTheFiveTutorialBuildings()
        {
            var cost = new Bag();
            foreach (var id in Content.TutorialOrder) cost.Add(Bal.B(id).BuildCost);
            var start = Content.StartStock();
            foreach (var r in ResInfo.All) Assert.That(start[r], Is.GreaterThanOrEqualTo(cost[r]), r.ToString());
        }

        [Test]
        public void IdleBuildingsFillTheirBubbleOnlyWhilePlaying()
        {
            var c = NewColony();
            c.LandingDone();
            c.Build("geolocator"); c.Tick(60);
            c.Build("drill"); c.Tick(60);
            Assert.That(c.S.Get("drill").Buffer[Res.Carbon], Is.GreaterThan(0));
            var before = c.S.Get("drill").Buffer[Res.Carbon];
            c.CatchUp(600);
            Assert.That(c.S.Get("drill").Buffer[Res.Carbon], Is.EqualTo(before).Within(0.001), "no worker: nothing while away");
            var got = c.Collect("drill");
            Assert.That(got[Res.Carbon], Is.GreaterThan(0));
        }

        [Test]
        public void StoreCapacityFollowsLevelsMd()
        {
            Assert.That(Content.StoreCapacity(1), Is.EqualTo(1000));
            Assert.That(Content.StoreCapacity(2), Is.EqualTo(1400));
            Assert.That(Content.StoreCapacity(7), Is.EqualTo(7530).Within(10));
            Assert.That(Content.StoreCapacity(10), Is.EqualTo(20660).Within(10));
            // from level 12 the store grows 1.1 times a level (levels.md, the table to level 30)
            Assert.That(Content.StoreCapacity(12), Is.EqualTo(31820).Within(10));
            Assert.That(Content.StoreCapacity(20), Is.EqualTo(68200).Within(20));
            Assert.That(Content.StoreCapacity(21), Is.EqualTo(75020).Within(20));
        }

        [Test]
        public void HomeAndKitchenPlaces()
        {
            Assert.That(Content.Beds(1), Is.EqualTo(4));
            Assert.That(Content.Beds(4), Is.EqualTo(4));
            Assert.That(Content.Beds(5), Is.EqualTo(5));
            Assert.That(Content.Beds(11), Is.EqualTo(11));
            Assert.That(Content.Seats(1), Is.EqualTo(8));
            Assert.That(Content.Seats(8), Is.EqualTo(8));
            Assert.That(Content.Seats(9), Is.EqualTo(9));
            Assert.That(Content.Beds(20), Is.EqualTo(20));
            Assert.That(Content.Seats(20), Is.EqualTo(20));
        }

        [Test]
        public void ASaveFromChapter1LoadsWithTheNewResources()
        {
            var s = Jump.To(Bal, 6, new Settings { Tempo = 1 });
            // an old save: seven amounts in every bag
            var old = Newtonsoft.Json.Linq.JObject.Parse(Save.ToJson(s));
            old["Stock"]["V"] = new Newtonsoft.Json.Linq.JArray(1, 2, 3, 4, 5, 6, 7);
            var back = Save.FromJson(old.ToString());
            Assert.That(back, Is.Not.Null);
            Assert.That(back.Stock.V.Length, Is.EqualTo(ResInfo.Count));
            Assert.That(back.Stock[Res.Iron], Is.EqualTo(7));
            Assert.That(back.Stock[Res.Steel], Is.EqualTo(0));
        }

        [Test]
        public void TheSecondGreenhouseComesOnLevel11OnTheSouthSlope()
        {
            var c10 = new Colony(Bal, Jump.To(Bal, 10, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            Assert.That(c10.WhyNotBuild("greenhouse2", out var lvl), Is.EqualTo("Level 11"));
            Assert.That(lvl, Is.EqualTo(11));
            var c11 = new Colony(Bal, Jump.To(Bal, 11, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            Assert.That(c11.S.Zone, Is.EqualTo(2));
            Assert.That(c11.NextOfKind("greenhouse").Id, Is.EqualTo("greenhouse2"));
            Assert.That(c11.Row("greenhouse2", 5).Get("air/min"), Is.EqualTo(c11.Row("greenhouse", 5).Get("air/min")));
        }

        [Test]
        public void Level6AsksForNoSecondMiner()
        {
            // levels.md 2.16 (Joro, 27.11.2026: A): two miners could lock the game, when levels 4 and 5 woke engineers.
            var c = new Colony(Bal, Jump.To(Bal, 5, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            Assert.That(c.NextReq.Level, Is.EqualTo(6));
            var req = c.Requirements().Select(r => r.Text).ToList();
            Assert.That(req, Has.None.Contains("miner"));
            Assert.That(req, Has.Some.StartsWith("Mine level"));
        }

        [Test]
        public void FromLevel12OnlyTheKeyBuildingsAreAskedFor()
        {
            var c = new Colony(Bal, Jump.To(Bal, 12, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            var req = c.Requirements().Select(r => r.Text).ToList();
            Assert.That(req, Has.Some.StartsWith("Smelter level 6"));
            Assert.That(req, Has.Some.EqualTo("Store level 13"));
            Assert.That(req, Has.Some.StartsWith("Every workplace taken"));
            Assert.That(req, Has.None.StartsWith("Carbon drill level"), "no more \"all buildings\" (levels.md, rule 2)");
        }

        [Test]
        public void TheFrameIsBuiltFromSteelInTheDock()
        {
            var c = new Colony(Bal, Jump.To(Bal, 12, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            c.S.Stock[Res.Steel] = 250;
            Assert.That(c.WhyNotFrame(), Is.EqualTo(""));
            Assert.That(c.BuildFrame(), Is.True);
            Assert.That(c.S.Stock[Res.Steel], Is.EqualTo(50).Within(0.001));
            c.FinishTimers();
            Assert.That(c.S.Frame, Is.EqualTo(1));
            Assert.That(c.WhyNotFrame(), Is.EqualTo("Stage 2 on level 14"));
        }

        [Test]
        public void AGreenhouseOnLevel16CanGiveFoodAfterOneCycle()
        {
            var c = new Colony(Bal, Jump.To(Bal, 16, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            var g = c.S.Get("greenhouse");
            g.Level = 16;
            Assert.That(c.SetGreenhouseFood("greenhouse", true), Is.True);
            Assert.That(g.Food, Is.False, "the plants change over after one cycle");
            c.Tick(30 * 60);
            Assert.That(g.Food, Is.False);
            c.Tick(31 * 60);
            Assert.That(g.Food, Is.True);
        }

        [Test]
        public void TheBuilderWorksInTheArkAndMakesUpgradesFaster()
        {
            var c = new Colony(Bal, Jump.To(Bal, 14, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            Assert.That(c.S.Builder, Is.Not.EqualTo(0));
            Assert.That(c.S.Colonist(c.S.Builder).Profession, Is.EqualTo(Profession.Builder));
            Assert.That(c.S.Colonist(c.S.Builder).Work, Is.EqualTo("ark"));
            Assert.That(c.BuilderCut, Is.EqualTo(0.1).Within(1e-9));
        }

        [Test]
        public void SaveAndLoadKeepTheState()
        {
            var s = Jump.To(Bal, 6, new Settings { Tempo = 1 });
            var json = Save.ToJson(s);
            var back = Save.FromJson(json);
            Assert.That(back, Is.Not.Null);
            Assert.That(back.Ark, Is.EqualTo(6));
            Assert.That(back.Colonists.Count, Is.EqualTo(s.Colonists.Count));
            Assert.That(back.CropsTried.Count, Is.EqualTo(s.CropsTried.Count), "lists are replaced, not appended");
            Assert.That(back.Stock[Res.Carbon], Is.EqualTo(s.Stock[Res.Carbon]).Within(0.01));
        }

        [Test]
        public void JumpGivesTheColonistsOfTheLevel([Values(4, 6, 9, 10, 12, 14, 17, 20, 21)] int level)
        {
            var s = Jump.To(Bal, level, new Settings { Tempo = 1 });
            Assert.That(s.Colonists.Count, Is.EqualTo(Content.ColonistsAfter[level - 1]));
            Assert.That(s.Colonists.All(x => x.Work != ""), Is.True);
            if (level >= 12)
            {
                // from level 11 the colonists come with the work: every workplace is taken, and everyone has a bed and a seat
                var c = new Colony(Bal, s, new Settings { Tempo = 1 });
                var (taken, all) = c.Jobs();
                Assert.That(taken, Is.EqualTo(all));
                Assert.That(c.Beds, Is.GreaterThanOrEqualTo(c.Awake));
                Assert.That(c.Seats, Is.GreaterThanOrEqualTo(c.Awake));
            }
        }

        /// <summary>A long absence at a fast test tempo must not hold up the start: iOS stops a game that does not show up in time (20.11.2026).</summary>
        [Test]
        public void ALongAbsenceIsWorkedOutQuickly()
        {
            var c = new Colony(Bal, Jump.To(Bal, 21, new Settings { Tempo = 600 }), new Settings { Tempo = 600 });
            var sw = System.Diagnostics.Stopwatch.StartNew();
            c.CatchUp(24 * 3600); // a day away at x600: 600 game days
            Assert.That(sw.ElapsedMilliseconds, Is.LessThan(1500));
        }

        [Test]
        public void WorkersKeepProducingWhileAway()
        {
            var c = new Colony(Bal, Jump.To(Bal, 4, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            var made = c.CatchUp(3600);
            Assert.That(made[Res.Carbon] + made[Res.Water] + made[Res.Food], Is.GreaterThan(0));
        }

        // ---------------------------------------------------------------- chapters 3 and 4

        static Colony At(int level) => new Colony(Bal, Jump.To(Bal, level, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });

        [Test]
        public void ZoneIIIOpensTheGreenBeltAndThePatchesGrowStepByStep()
        {
            var c = At(21);
            c.S.StormNext = 0; // no storm in the middle of the check: a storm stops the growth
            Assert.That(c.WhyNotPatch("patch1"), Does.StartWith("Closed"));
            c.S.Done.Add("zone3"); c.S.Zone = 3; c.S.Done.Add("lichens");
            Assert.That(c.WhyNotPatch("patch1"), Is.EqualTo(""));
            Assert.That(c.WorkPatch("patch1"), Is.True);
            Assert.That(c.WhyNotPatch("patch2"), Does.Contain("another"), "the drone sows one patch at a time");
            c.Tick(11 * 60);
            Assert.That(c.S.Patch("patch1").Stage, Is.EqualTo(1), "lichen");
            c.Tick(c.PatchGrowMinutes(1) * 60 + 60);
            Assert.That(c.S.Patch("patch1").Stage, Is.EqualTo(2), "moss");
            Assert.That(c.AirBySource.ContainsKey("Green Belt"), Is.True);
        }

        [Test]
        public void TheHullAndTheReactorAreBuiltInTheDockAfterTheFrame()
        {
            var c = At(22);
            Assert.That(c.S.Frame, Is.EqualTo(4));
            Assert.That(c.NextDock.Part, Is.EqualTo("hull"));
            c.S.Stock[Res.Steel] = 5000; c.S.Stock[Res.Cables] = 500;
            if (!c.IsDone("steel_sheets")) Assert.That(c.WhyNotDock(), Does.Contain("Steel sheets"));
            c.S.Done.Add("steel_sheets");
            Assert.That(c.BuildDock(), Is.True);
            c.FinishTimers();
            Assert.That(c.S.Hull, Is.EqualTo(1));
            var r = At(39);
            Assert.That(r.NextDock.Part, Is.EqualTo("reactor"));
            Assert.That(r.NextDock.Stage, Is.EqualTo(4));
            Assert.That(r.BuildDock(), Is.True, "the fuel is in the Ark's hold");
            r.FinishTimers();
            Assert.That(r.S.TrialReady, Is.True);
            Assert.That(r.TrialRun(), Is.True);
            Assert.That(r.S.ReactorTested, Is.True);
        }

        [Test]
        public void InsulationIsASpecialUpgradeWithReady()
        {
            var c = At(29);
            c.S.Done.Add("insulation");
            c.S.Stock[Res.Wool] = 1000;
            Assert.That(c.Insulate("brickhome"), Is.True);
            Assert.That(c.WhyNotInsulate("home"), Is.Not.EqualTo(""), "the first home stays without (Joro, 27.11.2026: A)");
            var lv = c.S.Level("brickhome");
            c.FinishTimers();
            Assert.That(c.S.Get("brickhome").Ready, Is.True);
            c.Reprint("brickhome");
            Assert.That(c.S.Get("brickhome").Insulated, Is.True);
            Assert.That(c.S.Level("brickhome"), Is.EqualTo(lv), "it does not raise the level");
        }

        [Test]
        public void TheUniversitySwapsTwoAndKeepsTheirOldStars()
        {
            var c = At(32);
            Assert.That(c.Teacher, Is.Not.Null);
            var (a, b) = c.SuggestPair();
            var ca = c.S.Colonist(a); var cb = c.S.Colonist(b);
            var (wa, wb, pa, pb) = (ca.Work, cb.Work, ca.Profession, cb.Profession);
            ca.WorkMinutes = 2000;
            Assert.That(c.Study(a, b), Is.True);
            c.FinishTimers();
            Assert.That(c.S.Study.Ready, Is.True);
            Assert.That(c.Swap(), Is.True);
            Assert.That(ca.Work, Is.EqualTo(wb)); Assert.That(cb.Work, Is.EqualTo(wa));
            Assert.That(ca.Profession, Is.EqualTo(pb));
            Assert.That(c.Stars(ca), Is.EqualTo(2), "two stars on the new work");
            Assert.That(c.Jobs().taken, Is.EqualTo(c.Jobs().all), "no place stays empty");
            c.S.Study = new StudyState { A = a, B = b, Ready = true };
            c.Swap();
            Assert.That(ca.Work, Is.EqualTo(wa));
            Assert.That(c.Stars(ca), Is.EqualTo(5), "back to the old work with the old stars (Joro, 23.11.2026)");
        }

        [Test]
        public void TheDispatchManagesTwoOnLevel1AndSevenOnLevel5()
        {
            Assert.That(Colony.DispatchSlots(1), Is.EqualTo(2));
            Assert.That(Colony.DispatchSlots(5), Is.EqualTo(7));
            Assert.That(Colony.DispatchSlots(10), Is.EqualTo(13));
            Assert.That(Colony.DispatchSlots(20), Is.EqualTo(25));
            var c = At(34);
            Assert.That(c.DispatchBonus("smelter"), Is.GreaterThanOrEqualTo(0.10));
            Assert.That(c.SetManaged("home", true), Is.False, "the homes have no worker");
        }

        [Test]
        public void AStormDimsThePanelsAndLeavesStonesAndSigns()
        {
            var c = At(36);
            c.TakeEvents();
            var day = c.SolarDayKw();
            c.S.StormNext = 30;
            c.Tick(60);
            Assert.That(c.StormNow, Is.True);
            Assert.That(c.SolarDayKw(), Is.LessThan(day * 0.5));
            c.Tick(c.S.StormLeft + 30);
            Assert.That(c.StormNow, Is.False);
            Assert.That(c.S.Rocks, Is.GreaterThan(0));
            Assert.That(c.S.Care, Does.Contain("park").And.Contain("medpost"));
            Assert.That(c.Tend("park"), Is.True);
            Assert.That(c.CollectRocks(), Is.GreaterThan(0));
        }

        [Test]
        public void TheRoadBuilderPavesTheStreetsRoundTheArk()
        {
            var c = At(37);
            c.S.Paved.Clear(); // the jump paves the square of level 36; pave it again here
            var b = c.S.Get("roaddepot");
            Assert.That(b != null && b.Workers.Count > 1 && b.Workers[0] != 0, Is.True, "the road builder and the technician after the jump");
            c.S.Stock[Res.Stone] = 20000;
            foreach (var k in Content.ArkStreets) Assert.That(c.Pave(k), Is.True);
            for (int i = 0; i < 4; i++) c.FinishTimers();
            Assert.That(Content.ArkStreets.All(k => c.S.Paved.Contains(k)), Is.True);
        }

        [Test]
        public void TheNewThingsSurviveTheSave()
        {
            var c = At(37);
            c.S.Hull = 4; c.S.Reactor = 3; c.S.Care.Add("park"); c.S.Paved.Add("0,0"); c.S.Stock[Res.Glass] = 123;
            var back = Save.FromJson(Save.ToJson(c.S));
            Assert.That(back, Is.Not.Null);
            Assert.That(back.Reactor, Is.EqualTo(3));
            Assert.That(back.Stock[Res.Glass], Is.EqualTo(123));
            Assert.That(back.Patches.Count, Is.EqualTo(Content.PatchPlots.Length));
            Assert.That(back.Paved, Does.Contain("0,0"));
        }

        /// <summary>Chapter 3 played by the auto-player from the start of level 21: it must reach level 31.</summary>
        [Test]
        public void Chapter3CanBePlayedToTheEnd() => PlayChapter(21, 31, 31, 90);

        /// <summary>Chapter 4 played by the auto-player from the start of level 31: it must reach level 40.</summary>
        [Test]
        public void Chapter4CanBePlayedToTheEnd() => PlayChapter(31, 40, 40, 90);

        static void PlayChapter(int from, int to, int people, double maxHours)
        {
            var c = At(from);
            var log = new StringBuilder();
            var levelStart = c.S.GameTime;
            var lastArk = c.S.Ark;
            for (int minute = 0; minute < 150 * 60 && c.S.Ark < to; minute++)
            {
                AutoPlayer.Act(c);
                c.Tick(60);
                if (c.S.Ark != lastArk)
                {
                    log.AppendLine($"level {lastArk} -> {c.S.Ark}: {(c.S.GameTime - levelStart) / 60:0} min, people {c.Awake}, air {c.S.Atmo}%");
                    levelStart = c.S.GameTime;
                    lastArk = c.S.Ark;
                }
                c.TakeEvents();
            }
            var hours = c.S.GameTime / 3600;
            log.AppendLine($"total {hours:0.0} h, colonists {c.Awake}, air {c.S.Atmo}%, hull {c.S.Hull}/4, reactor {c.S.Reactor}/4");
            TestContext.WriteLine(log.ToString());
            if (c.S.Ark < to)
            {
                var missing = string.Join("; ", c.Requirements().Where(x => !x.Done).Select(x => $"{x.Text} (have {x.Have})"));
                Assert.Fail($"Stuck on level {c.S.Ark} after {hours:0.0} h. Missing: {missing}\n{log}");
            }
            Assert.That(c.Awake, Is.EqualTo(people), "each chapter wakes 10 colonists (levels.md)");
            Assert.That(hours, Is.LessThan(maxHours));
        }

        /// <summary>The whole of chapter 1 played by the auto-player: it must reach level 11 and not get stuck.</summary>
        [Test]
        public void Chapter1CanBePlayedToTheEnd()
        {
            var c = NewColony(1);
            var log = new StringBuilder();
            var levelStart = 0.0;
            var lastArk = 1;
            for (int minute = 0; minute < 60 * 60 && !c.S.Chapter1Done; minute++)
            {
                AutoPlayer.Act(c);
                c.Tick(60);
                if (c.S.Ark != lastArk)
                {
                    log.AppendLine($"level {lastArk} -> {c.S.Ark}: {(c.S.GameTime - levelStart) / 60:0} min");
                    levelStart = c.S.GameTime;
                    lastArk = c.S.Ark;
                }
                c.TakeEvents();
            }
            var hours = c.S.GameTime / 3600;
            log.AppendLine($"total {hours:0.0} h, colonists {c.Awake}, air {c.S.Atmo}%");
            TestContext.WriteLine(log.ToString());
            if (!c.S.Chapter1Done)
            {
                var missing = string.Join("; ", c.Requirements().Where(x => !x.Done).Select(x => $"{x.Text} (have {x.Have})"));
                Assert.Fail($"Stuck on level {c.S.Ark} after {hours:0.0} h. Missing: {missing}\n{log}");
            }
            Assert.That(hours, Is.LessThan(40), "chapter 1 is about 18 hours in the balance model");
        }

        /// <summary>Chapter 2 played by the auto-player from the start of level 11: it must reach level 21 and not get stuck.</summary>
        [Test]
        public void Chapter2CanBePlayedToTheEnd()
        {
            var c = new Colony(Bal, Jump.To(Bal, 11, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            var log = new StringBuilder();
            var levelStart = c.S.GameTime;
            var lastArk = c.S.Ark;
            for (int minute = 0; minute < 90 * 60 && !c.S.Chapter2Done; minute++)
            {
                AutoPlayer.Act(c);
                c.Tick(60);
                if (c.S.Ark != lastArk)
                {
                    log.AppendLine($"level {lastArk} -> {c.S.Ark}: {(c.S.GameTime - levelStart) / 60:0} min, people {c.Awake}, air {c.S.Atmo}%");
                    levelStart = c.S.GameTime;
                    lastArk = c.S.Ark;
                }
                c.TakeEvents();
            }
            var hours = c.S.GameTime / 3600;
            log.AppendLine($"total {hours:0.0} h, colonists {c.Awake}, air {c.S.Atmo}%, frame {c.S.Frame}/4");
            TestContext.WriteLine(log.ToString());
            if (!c.S.Chapter2Done)
            {
                var missing = string.Join("; ", c.Requirements().Where(x => !x.Done).Select(x => $"{x.Text} (have {x.Have})"));
                Assert.Fail($"Stuck on level {c.S.Ark} after {hours:0.0} h. Missing: {missing}\n{log}");
            }
            Assert.That(c.Awake, Is.EqualTo(21), "chapter 2 wakes 10 colonists (levels.md)");
            Assert.That(c.S.Frame, Is.EqualTo(4), "the frame is complete");
            Assert.That(hours, Is.LessThan(80), "chapter 2 is about 48 hours in the balance model");
        }
    }
}
