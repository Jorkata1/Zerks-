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
        public void BalanceHasEveryBuildingOfChapter1()
        {
            foreach (var def in Content.Buildings)
            {
                var b = Bal.B(def.Id);
                Assert.That(b.Rows.Count, Is.GreaterThanOrEqualTo(11), def.Id);
            }
            Assert.That(Bal.AirFor(7), Is.GreaterThan(0));
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
        public void JumpGivesTheColonistsOfTheLevel([Values(4, 6, 9, 10)] int level)
        {
            var s = Jump.To(Bal, level, new Settings { Tempo = 1 });
            Assert.That(s.Colonists.Count, Is.EqualTo(level));
            Assert.That(s.Colonists.All(x => x.Work != ""), Is.True);
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
    }
}
