using System;
using System.Collections.Generic;

namespace Zerks.Game
{
    // The shape of the canyon, ported from game/src/view/canyon.ts (stage 2), which follows the approved mockup
    // (mockup/src/map-details.js; Joro 14.11.2026: "I like it ... yes, make them permanent"). Pure arithmetic, no
    // UnityEngine, so it can run on a worker thread when a zone opens and the ground under its plots is flattened.
    //
    // Coordinates are those of three.js (x, z), as in the mockup: Unity's world is the same with x negated (Look.Plot).
    // The canyon's own directions: a across it (to the right of the screen), t along it (towards the camera).

    /// <summary>The random numbers of the mockup (mulberry32), so the canyon has the same shape as there.</summary>
    public sealed class Rng
    {
        uint s;
        public Rng(uint seed) { s = seed; }
        public float Next()
        {
            s += 0x6D2B79F5;
            uint t = (s ^ (s >> 15)) * (1 | s);
            t = (t + ((t ^ (t >> 7)) * (61 | t))) ^ t;
            return (float)((t ^ (t >> 14)) / 4294967296.0);
        }
    }

    /// <summary>Smooth noise between 0 and 1 (value noise on a shuffled lattice, as noise2 in canyon.ts).</summary>
    public sealed class Noise2
    {
        readonly int[] perm = new int[256];
        readonly float[] val = new float[256];

        public Noise2(uint seed)
        {
            var r = new Rng(seed);
            for (int i = 0; i < 256; i++) perm[i] = i;
            for (int i = 0; i < 256; i++) val[i] = r.Next();
            for (int i = 255; i > 0; i--) { int k = (int)(r.Next() * (i + 1)); (perm[i], perm[k]) = (perm[k], perm[i]); }
        }

        float H(int i, int j) => val[perm[(perm[i & 255] + j) & 255]];

        public float At(float x, float y)
        {
            int xi = (int)Math.Floor(x), yi = (int)Math.Floor(y);
            float xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
            float a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
            return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
        }
    }

    /// <summary>A block of the street grid: plot (d, s), its centre in three.js metres, and whether it is open.</summary>
    public struct Block
    {
        public int D, S;
        public float Cx, Cz;
        /// <summary>Inside the open zones (the floor is flat there).</summary>
        public bool Built;
        /// <summary>0 open from the start, 1 zone I, 2 zone II, 3 beyond (closed for chapter 1), -1 never a plot.</summary>
        public int Zone;
    }

    public static class Cm
    {
        public const float R2 = 0.70710678f;
        /// <summary>From the canyon's (a, t) to three.js (x, z).</summary>
        public static (float x, float z) P(float a, float t) => ((a + t) * R2, (t - a) * R2);
        /// <summary>From three.js (x, z) to the canyon's (a, t).</summary>
        public static (float a, float t) AT(float x, float z) => ((x - z) * R2, (x + z) * R2);
        public static float Clamp(float v, float lo = 0, float hi = 1) => v < lo ? lo : v > hi ? hi : v;
        public static float Smooth(float v) { v = Clamp(v); return v * v * (3 - 2 * v); }
        public static float Fbm(Noise2 n, float x, float y, int oct = 4)
        {
            float s = 0, a = 0.5f, f = 1, w = 0;
            for (int i = 0; i < oct; i++) { s += a * n.At(x * f, y * f); w += a; a *= 0.5f; f *= 2; }
            return s / w;
        }
        public static float Hypot(float x, float y) => (float)Math.Sqrt(x * x + y * y);
    }

    /// <summary>The canyon round the colony: everything else stands on this shape.</summary>
    public sealed class CanyonShape
    {
        public const float HEAD = -100;   // where the round head of the canyon begins
        public const float TOP = 23;      // how high the plain above the canyon lies
        public const float RISE = 26;     // the walls climb to it over 26 m ...
        public const int STEPS = 3;       // ... in three terraces
        /// <summary>The Ice Hollow: across, along, half-width, half-length.</summary>
        public static readonly float[] ICE = { -22, 76, 17, 9.5f };
        public static readonly float[][] CRATERS = { new[] { -30f, 98, 5.2f }, new[] { 28f, 86, 3.4f }, new[] { 40f, -66, 4.2f }, new[] { -42f, 40, 2.6f }, new[] { 10f, 116, 2.4f } };
        /// <summary>Where the robot drives out to the plain (across, along).</summary>
        public static readonly float[][] TRACK = { new[] { 0f, 58 }, new[] { 3f, 66 }, new[] { 9f, 76 }, new[] { 18f, 90 }, new[] { 30f, 104 }, new[] { 46f, 122 }, new[] { 60f, 136 } };

        /// <summary>A point on a polyline at f (0..1), with the direction it runs.</summary>
        public static (float a, float t, float q) Along(float[][] pts, float f)
        {
            int n = pts.Length - 1, k = Math.Min(n - 1, (int)Math.Floor(f * n));
            float u = f * n - k;
            float a1 = pts[k][0], t1 = pts[k][1], a2 = pts[k + 1][0], t2 = pts[k + 1][1];
            return (a1 + (a2 - a1) * u, t1 + (t2 - t1) * u, (float)Math.Atan2(t2 - t1, a2 - a1));
        }

        public readonly Noise2 N = new Noise2(17), N2 = new Noise2(23), N3 = new Noise2(31), N4 = new Noise2(53);
        const float RH = 62, S = TOP / STEPS;
        readonly List<Block> built = new List<Block>();
        readonly float[] trackA = new float[41], trackT = new float[41];

        public CanyonShape(IEnumerable<Block> blocks)
        {
            foreach (var b in blocks) if (b.Built) built.Add(b);
            for (int i = 0; i <= 40; i++) { var p = Along(TRACK, i / 40f); trackA[i] = p.a; trackT[i] = p.t; }
        }

        /// <summary>How wide the floor is on each side at a place along the canyon; past the colony the walls fall back (the mouth).</summary>
        public float HalfW(float t, int side)
        {
            float w = 53 + 4.5f * (float)Math.Sin(t * 0.031f + (side < 0 ? 0.6f : 2.4f)) + 8 * (Cm.Fbm(N, t * 0.02f + (side < 0 ? 10 : 50), 1.7f, 3) - 0.5f);
            if (t > 96) w += (t - 96) * 0.95f;
            return w;
        }

        /// <summary>How far outside the floor a point lies (negative on the floor); spurs and gullies break the line.</summary>
        public float Outside(float a, float t)
        {
            int side = a < 0 ? -1 : 1;
            float d;
            if (t >= HEAD) d = Math.Abs(a) - HalfW(t, side);
            else { float w = HalfW(HEAD, side); d = (Cm.Hypot(Math.Abs(a) / w, (HEAD - t) / RH) - 1) * Math.Min(w, RH); }
            return d + (Cm.Fbm(N2, a * 0.045f, t * 0.045f, 3) - 0.5f) * 9;
        }

        float FlatDist(float a, float t)
        {
            var (x, z) = Cm.P(a, t);
            float m = 1e9f;
            foreach (var b in built)
            {
                float dx = Math.Max(Math.Abs(x - b.Cx) - 8.4f, 0), dz = Math.Max(Math.Abs(z - b.Cz) - 8.4f, 0);
                float d = Cm.Hypot(dx, dz);
                if (d < m) m = d;
            }
            return m;
        }

        public float TrackDist(float a, float t)
        {
            float m = 1e9f;
            for (int i = 0; i <= 40; i++) { float d = Cm.Hypot(a - trackA[i], t - trackT[i]); if (d < m) m = d; }
            return m;
        }

        public static float IceR(float a, float t)
        {
            float da = (a - ICE[0]) / ICE[2], dt = (t - ICE[1]) / ICE[3], q = (float)Math.Atan2(dt, da);
            return Cm.Hypot(da, dt) / (1 + 0.07f * (float)Math.Sin(q * 3 + 1) + 0.05f * (float)Math.Sin(q * 5 + 2));
        }

        /// <summary>
        /// The floor: flat where the colony stands and gentle where the robot drives; beyond, low dunes across the
        /// wind; a rise to the foot of the walls; the Ice Hollow is a basin, the craters are bowls with rims.
        /// </summary>
        public float Floor(float a, float t, float d)
        {
            float fd = FlatDist(a, t), e = IceR(a, t);
            float w = Cm.Smooth((fd - 4) / 16) * (0.3f + 0.7f * Cm.Smooth((TrackDist(a, t) - 1.5f) / 5)) * Cm.Smooth((e - 1.15f) / 0.7f);
            float ridge = 1 - Math.Abs(2 * N4.At(a * 0.03f + 7, t * 0.085f) - 1);
            float h = w * (1.9f * ridge * ridge + 1.1f * (Cm.Fbm(N4, a * 0.022f, t * 0.03f, 3) - 0.5f));
            h += 2.4f * Cm.Smooth((d + 14) / 14) * Cm.Smooth((fd - 3) / 8);
            if (e < 1.22f) h -= 1.15f * Cm.Smooth((1.22f - e) / 0.3f);
            foreach (var c in CRATERS)
            {
                float r = Cm.Hypot(a - c[0], t - c[1]) / c[2];
                if (r < 1.6f) h += -0.8f * Cm.Smooth((0.85f - r) / 0.85f) + 0.34f * (float)Math.Exp(-((r - 1) / 0.24f) * ((r - 1) / 0.24f));
            }
            return h;
        }

        public float Floor(float a, float t) => Floor(a, t, Outside(a, t));

        /// <summary>The walls: a steep face, then a ledge, three times; then the plain above, never quite flat.</summary>
        public float Wall(float a, float t, float d)
        {
            float k = STEPS * Cm.Clamp(d / RISE), fl = (float)Math.Floor(k);
            if (d > RISE) return TOP + (Cm.Fbm(N, a * 0.03f + 40, t * 0.03f, 3) - 0.5f) * 2.4f * Cm.Smooth((d - RISE) / 22);
            return (fl + Cm.Smooth((k - fl) / 0.3f)) * S + (Cm.Fbm(N3, a * 0.16f, t * 0.16f, 2) - 0.5f) * 0.7f * Cm.Smooth(d / 2.5f);
        }

        public float Land(float a, float t)
        {
            float d = Outside(a, t), f = Floor(a, t, d);
            return d > 0 ? Math.Max(Wall(a, t, d), f) : f;
        }
    }
}
