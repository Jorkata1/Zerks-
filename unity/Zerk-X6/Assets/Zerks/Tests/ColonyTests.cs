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
        public void BalanceHasEveryBuildingOfChapters1And2()
        {
            foreach (var def in Content.Buildings)
            {
                var b = Bal.B(def.Kind);
                Assert.That(b.Rows.Count, Is.GreaterThanOrEqualTo(21), def.Id);
            }
            Assert.That(Bal.AirFor(33), Is.GreaterThan(0));
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

        [Test]
        public void WorkersKeepProducingWhileAway()
        {
            var c = new Colony(Bal, Jump.To(Bal, 4, new Settings { Tempo = 1 }), new Settings { Tempo = 1 });
            var made = c.CatchUp(3600);
            Assert.That(made[Res.Carbon] + made[Res.Water] + made[Res.Food], Is.GreaterThan(0));
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
