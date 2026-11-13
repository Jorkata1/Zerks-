using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Zerks.Sim
{
    /// <summary>The stock resources of chapter 1 (docs/levels.md). Air and energy are flows, not stock.</summary>
    public enum Res { Carbon, Water, Stone, Food, Quartz, Silicon, Iron }

    public static class ResInfo
    {
        public const int Count = 7;
        public static readonly Res[] All = { Res.Carbon, Res.Water, Res.Stone, Res.Food, Res.Quartz, Res.Silicon, Res.Iron };

        /// <summary>The key balance.json uses ("carbon", "water", ...).</summary>
        public static string Key(Res r) => r.ToString().ToLowerInvariant();

        /// <summary>The name in the game (English, decided 03.11.2026).</summary>
        public static string Name(Res r) => r switch
        {
            Res.Carbon => "Carbon",
            Res.Water => "Water",
            Res.Stone => "Stone",
            Res.Food => "Food",
            Res.Quartz => "Quartz",
            Res.Silicon => "Silicon",
            Res.Iron => "Iron ore",
            _ => r.ToString(),
        };

        public static bool TryParse(string key, out Res r)
        {
            foreach (var x in All)
                if (Key(x) == key) { r = x; return true; }
            r = Res.Carbon;
            return false;
        }

        /// <summary>The Ark takes these when it levels up; the rest it only checks (levels.md 2.4).</summary>
        public static bool ArkSpends(Res r) => r == Res.Carbon || r == Res.Water || r == Res.Stone;
    }

    /// <summary>An amount of each resource.</summary>
    [Serializable]
    public sealed class Bag
    {
        public double[] V = new double[ResInfo.Count];

        public Bag() { }
        public Bag(Bag other) { Array.Copy(other.V, V, ResInfo.Count); }

        [JsonIgnore]
        public double this[Res r]
        {
            get => V[(int)r];
            set => V[(int)r] = value;
        }

        [JsonIgnore]
        public bool IsEmpty
        {
            get
            {
                foreach (var x in V) if (x > 0.0001) return false;
                return true;
            }
        }

        public Bag Scaled(double k)
        {
            var b = new Bag();
            for (int i = 0; i < ResInfo.Count; i++) b.V[i] = V[i] * k;
            return b;
        }

        public void Add(Bag o, double k = 1)
        {
            for (int i = 0; i < ResInfo.Count; i++) V[i] += o.V[i] * k;
        }

        public IEnumerable<(Res res, double amount)> NonZero()
        {
            foreach (var r in ResInfo.All)
                if (V[(int)r] > 0.0001) yield return (r, V[(int)r]);
        }

        public override string ToString()
        {
            var parts = new List<string>();
            foreach (var (r, a) in NonZero()) parts.Add($"{Fmt.Num(a)} {ResInfo.Name(r).ToLowerInvariant()}");
            return string.Join(", ", parts);
        }
    }

    /// <summary>Number and time formats for the game's English text.</summary>
    public static class Fmt
    {
        public static string Num(double v)
        {
            if (v >= 100000) return $"{v / 1000:0}k";
            if (v >= 10000) return $"{v / 1000:0.#}k";
            if (v >= 100) return $"{Math.Floor(v):0}";
            if (v >= 10) return $"{Math.Floor(v):0}";
            return $"{Math.Floor(v * 10) / 10:0.#}";
        }

        /// <summary>Seconds of real time as "1 h 05 min", "3 min 20 s", "12 s".</summary>
        public static string Time(double seconds)
        {
            if (seconds < 0) seconds = 0;
            var s = (int)Math.Ceiling(seconds);
            if (s < 60) return $"{s} s";
            var m = s / 60;
            if (m < 60) return s % 60 == 0 ? $"{m} min" : $"{m} min {s % 60:00} s";
            var h = m / 60;
            return $"{h} h {m % 60:00} min";
        }
    }
}
