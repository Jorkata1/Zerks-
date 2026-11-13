using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Zerks.Sim
{
    /// <summary>One level of a building, from docs/balance/balance.json (balance 0.1, approved by Joro 13.11.2026).</summary>
    public sealed class BuildingRow
    {
        public int Level;
        public Bag UpgradeCost = new Bag();
        /// <summary>Game seconds the upgrade to the next level takes.</summary>
        public double UpgradeSeconds;
        public double EnergyKw;
        /// <summary>Raw "produces" map: "carbon/min", "stone/min per worker", "kW by day", "kWh", "air/min" ...</summary>
        public Dictionary<string, double> Produces = new Dictionary<string, double>();

        public double Get(string key) => Produces.TryGetValue(key, out var v) ? v : 0;
    }

    public sealed class BuildingBalance
    {
        public string Id;
        public string En;
        public int Unlock;
        public double EnergyKw1;
        public Bag BuildCost = new Bag();
        public double BuildSeconds;
        public List<BuildingRow> Rows = new List<BuildingRow>();

        /// <summary>The row for a building level (clamped to the table).</summary>
        public BuildingRow Row(int level)
        {
            if (Rows.Count == 0) return new BuildingRow { Level = level };
            var i = Math.Max(1, Math.Min(level, Rows.Count)) - 1;
            return Rows[i];
        }
    }

    /// <summary>The numbers of the game, read from balance.json (made by game/tools/balance.ts; never edited by hand).</summary>
    public sealed class Balance
    {
        public string Version;
        public readonly Dictionary<string, BuildingBalance> Buildings = new Dictionary<string, BuildingBalance>();
        /// <summary>Air units to go from percent p to p+1.</summary>
        public readonly SortedDictionary<int, double> AirPerPercent = new SortedDictionary<int, double>();
        public double FoodPerColonistMin = 0.2;
        public double RobotShare = 0.06;
        public double NightMin = 8;
        public int TestTempo = 60;

        public BuildingBalance B(string id)
        {
            if (!Buildings.TryGetValue(id, out var b)) throw new ArgumentException($"balance.json has no building '{id}'");
            return b;
        }

        public double AirFor(int percent)
        {
            if (AirPerPercent.TryGetValue(percent, out var u)) return u;
            double last = 1;
            foreach (var kv in AirPerPercent) if (kv.Key <= percent) last = kv.Value;
            return last;
        }

        public static Balance Parse(string json)
        {
            var root = JObject.Parse(json);
            var bal = new Balance { Version = (string)root["version"] };
            var p = root["params"] as JObject;
            if (p != null)
            {
                bal.FoodPerColonistMin = (double?)p["FOOD_PER_COLONIST_MIN"] ?? 0.2;
                bal.RobotShare = (double?)p["ROBOT_SHARE"] ?? 0.06;
                bal.NightMin = (double?)p["NIGHT_MIN"] ?? 8;
                bal.TestTempo = (int?)p["TEST_TEMPO"] ?? 60;
            }
            foreach (var a in root["air"] as JArray ?? new JArray())
                bal.AirPerPercent[(int)a["p"]] = (double)a["units"];
            foreach (var jb in root["buildings"] as JArray ?? new JArray())
            {
                var b = new BuildingBalance
                {
                    Id = (string)jb["id"],
                    En = (string)jb["en"],
                    Unlock = (int)jb["unlock"],
                    EnergyKw1 = (double?)jb["energyKw1"] ?? 0,
                };
                var build = jb["build"];
                if (build != null)
                {
                    b.BuildCost = ParseBag(build["cost"] as JObject);
                    b.BuildSeconds = (double?)build["seconds"] ?? 30;
                }
                foreach (var jr in jb["rows"] as JArray ?? new JArray())
                {
                    var row = new BuildingRow
                    {
                        Level = (int)jr["n"],
                        UpgradeCost = ParseBag(jr["upgradeCost"] as JObject),
                        UpgradeSeconds = (double?)jr["upgradeSeconds"] ?? 20,
                        EnergyKw = (double?)jr["energyKw"] ?? 0,
                    };
                    if (jr["produces"] is JObject prod)
                        foreach (var kv in prod)
                            row.Produces[kv.Key] = (double)kv.Value;
                    b.Rows.Add(row);
                }
                bal.Buildings[b.Id] = b;
            }
            return bal;
        }

        static Bag ParseBag(JObject o)
        {
            var b = new Bag();
            if (o == null) return b;
            foreach (var kv in o)
                if (ResInfo.TryParse(kv.Key, out var r)) b[r] = (double)kv.Value;
            return b;
        }
    }
}
