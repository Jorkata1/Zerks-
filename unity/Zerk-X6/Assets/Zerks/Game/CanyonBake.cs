using System;
using System.Collections.Generic;
using UnityEngine;

namespace Zerks.Game
{
    /// <summary>Vertices of a mesh made in memory (Unity coordinates), so a worker thread can make it.</summary>
    public sealed class MeshData
    {
        public Vector3[] Pos;
        public Vector2[] Uv;
        public Color[] Col;
        public int[] Tris;

        public Mesh ToMesh(string name)
        {
            var m = new Mesh { name = name, indexFormat = Pos.Length > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
            m.vertices = Pos;
            if (Uv != null) m.uv = Uv;
            if (Col != null) m.colors = Col;
            m.triangles = Tris;
            m.RecalculateNormals();
            m.RecalculateBounds();
            return m;
        }
    }

    /// <summary>From three.js (x, y, z) to Unity: x negated (glTFast does the same with the models, Look.Plot).</summary>
    public static class U3
    {
        public static Vector3 V(float x, float y, float z) => new Vector3(-x, y, z);
        public static Vector3 At(float a, float t, float y) { var (x, z) = Cm.P(a, t); return new Vector3(-x, y, z); }
    }

    /// <summary>
    /// Everything of the canyon that is computed, not modelled: the height of the floor every metre and its picture,
    /// the walls, the ice, the stones and the dust (game/src/view/canyon.ts). No Unity objects are made here.
    /// </summary>
    public static class CanyonBake
    {
        // ---------- the floor: one picture as big as the floor, so nothing repeats ----------
        // 8 pixels to the metre, 168 m across and 324 m along.
        public const int PXM = 8, GA = 84, GT0 = -174, GT1 = 150, GW = 2 * GA, GL = GT1 - GT0;
        static float Gx(float a) => (a + GA) * PXM;
        static float Gy(float t) => (t - GT0) * PXM;

        public sealed class Field { public float[] H, D; public int Row; }

        public static Field FloorField(CanyonShape shape)
        {
            int row = GW + 1;
            var f = new Field { Row = row, H = new float[row * (GL + 1)], D = new float[row * (GL + 1)] };
            for (int j = 0; j <= GL; j++)
                for (int i = 0; i <= GW; i++)
                {
                    int q = j * row + i;
                    f.D[q] = shape.Outside(i - GA, GT0 + j);
                    f.H[q] = shape.Floor(i - GA, GT0 + j, f.D[q]);
                }
            return f;
        }

        /// <summary>The height of the floor at (a, t), from the field (bilinear).</summary>
        public static float FieldHeight(Field f, float a, float t)
        {
            float fx = Mathf.Clamp(a + GA, 0, GW - 0.001f), fy = Mathf.Clamp(t - GT0, 0, GL - 0.001f);
            int i = (int)fx, j = (int)fy;
            float u = fx - i, v = fy - j;
            int q = j * f.Row + i;
            return (f.H[q] * (1 - u) + f.H[q + 1] * u) * (1 - v) + (f.H[q + f.Row] * (1 - u) + f.H[q + f.Row + 1] * u) * v;
        }

        /// <summary>
        /// Big soft patches of lighter and darker dust, a stonier band under the walls and fine grain; on it the wind
        /// ripples, the dry cracks, the shade in the craters and under the stones, the frost on the bank of the Ice
        /// Hollow and the tracks of the robot.
        /// </summary>
        public static Painter PaintFloor(CanyonShape shape, List<Vector3> placed, Field field)
        {
            int w = GW * PXM, h = GL * PXM, row = GW + 1;
            var pic = new Painter(w, h);
            var n1 = new Noise2(71); var n2 = new Noise2(73); var g = new Rng(79); var r = new Rng(29);
            var tone = new float[row * (GL + 1)];
            var H = field.H;
            for (int j = 0; j <= GL; j++)
                for (int i = 0; i <= GW; i++)
                {
                    float a = i - GA, t = GT0 + j, edge = Cm.Smooth(Math.Min(GA - Math.Abs(a), Math.Min(t - GT0, GT1 - t)) / 14);
                    float big = Cm.Smooth((Cm.Fbm(n1, a * 0.016f, t * 0.016f, 3) - 0.3f) / 0.4f) - 0.5f, mid = Cm.Fbm(n2, a * 0.08f, t * 0.08f, 2) - 0.5f;
                    int q = j * row + i;
                    // the slopes that face the sun (it stands to the left) are a little lighter, the ones turned away darker
                    int i0 = Math.Max(0, i - 1), i1 = Math.Min(GW, i + 1), j0 = Math.Max(0, j - 1), j1 = Math.Min(GL, j + 1);
                    float sunny = Cm.Clamp(0.5f * (0.57f * (H[j * row + i1] - H[j * row + i0]) / (i1 - i0) - 0.14f * (H[j1 * row + i] - H[j0 * row + i]) / (j1 - j0)), -0.16f, 0.16f);
                    tone[q] = edge * (big * 0.16f + mid * 0.07f - 0.06f * Cm.Smooth((field.D[q] + 10) / 10)) + sunny;
                }
            for (int py = 0; py < h; py++)
            {
                float fy = py / (float)PXM; int j = Math.Min(GL - 1, (int)fy); float v = fy - j;
                for (int px = 0; px < w; px++)
                {
                    float fx = px / (float)PXM; int i = Math.Min(GW - 1, (int)fx); float u = fx - i; int o = j * row + i;
                    float tn = (tone[o] * (1 - u) + tone[o + 1] * u) * (1 - v) + (tone[o + row] * (1 - u) + tone[o + row + 1] * u) * v, gr = (g.Next() - 0.5f) * 0.034f;
                    float kg = tn > 0 ? 1.45f : 1.15f, kb = tn > 0 ? 1.9f : 1.45f;   // lighter dust is paler, darker dust a little redder
                    pic.Set(px, py, 238 * (1 + tn * 0.45f + gr), 159 * (1 + tn * kg + gr), 102 * (1 + tn * kb + gr));
                }
            }
            float k = PXM / 10f;   // the mockup's strokes were drawn at 10 pixels to the metre
            // wind ripples: short waves in fields that fade at their edges
            float[][] ripples = {
                new[] { -14f, 84, 30, 16 }, new[] { 22f, 104, 34, 18 }, new[] { -34f, 112, 24, 14 }, new[] { 6f, 124, 30, 12 }, new[] { -46f, -18, 10, 30 }, new[] { 47f, 14, 9, 34 },
                new[] { 46f, 66, 10, 26 }, new[] { -44f, -84, 16, 22 }, new[] { 40f, -96, 18, 20 }, new[] { 2f, -118, 34, 14 }, new[] { 34f, 84, 20, 14 }, new[] { -52f, 130, 26, 12 }, new[] { 56f, 122, 22, 12 } };
            var light = new Painter.Rgba(255, 226, 188, 1); var dark = new Painter.Rgba(186, 104, 66, 1);
            foreach (var f in ripples)
            {
                float a0 = f[0], t0 = f[1], fw = f[2], fl = f[3], turn = (r.Next() - 0.5f) * 0.5f, cs = (float)Math.Cos(turn), sn = (float)Math.Sin(turn);
                for (int kk = 0; kk < fl / 1.5f; kk++)
                {
                    float v = kk * 1.5f - fl / 2, ph = r.Next() * 6;
                    for (float uu = -fw / 2; uu < fw / 2; uu += 1)
                    {
                        float fade = Math.Max(0, 1 - (2 * uu / fw) * (2 * uu / fw)) * Math.Max(0, 1 - (2 * v / fl) * (2 * v / fl));
                        if (fade < 0.05f) continue;
                        (float, float) Pt(float s) { float vv = v + (float)Math.Sin(s * 0.45f + ph) * 0.5f; return (Gx(a0 + s * cs - vv * sn), Gy(t0 + s * sn + vv * cs)); }
                        var (x1, y1) = Pt(uu); var (x2, y2) = Pt(uu + 1.05f);
                        light.A = 0.4f * fade; pic.Line(x1, y1, x2, y2, 4 * k, light);
                        dark.A = 0.26f * fade; pic.Line(x1, y1 + 4.2f * k, x2, y2 + 4.2f * k, 2.8f * k, dark);
                    }
                }
            }
            // dry cracks: a few patches of thin branching lines
            float[][] cracks = { new[] { 30f, 70, 7 }, new[] { -40f, 62, 6 }, new[] { 14f, 92, 6 }, new[] { -8f, 108, 7 }, new[] { 44f, -40, 5 }, new[] { -46f, 22, 5 }, new[] { -30f, -70, 6 }, new[] { 24f, -74, 6 } };
            var crack = new Painter.Rgba(160, 86, 54, 1);
            void Walk(float a, float t, float dir, int len, float wd)
            {
                for (int i = 0; i < len; i++)
                {
                    float na = a + (float)Math.Cos(dir) * 0.9f, nt = t + (float)Math.Sin(dir) * 0.9f;
                    crack.A = 0.3f * (1 - i / (float)len) + 0.08f;
                    pic.Line(Gx(a), Gy(t), Gx(na), Gy(nt), wd * k, crack);
                    a = na; t = nt; dir += (r.Next() - 0.5f) * 0.9f;
                    if (r.Next() < 0.12f && len > 3) Walk(a, t, dir + (r.Next() < 0.5f ? 1 : -1), len >> 1, wd * 0.8f);
                }
            }
            foreach (var c in cracks)
                for (int kk = 0; kk < c[2]; kk++)
                {
                    float a = c[0] + (r.Next() - 0.5f) * 7, t = c[1] + (r.Next() - 0.5f) * 7, dir = r.Next() * 6.3f; int len = 5 + (int)(r.Next() * 6);
                    Walk(a, t, dir, len, 2.1f);
                }
            // the craters: the darker dust that gathers in them and the pale rim
            var craterStops = new[] { (0f, new Painter.Rgba(170, 92, 60, .38f)), (0.6f, new Painter.Rgba(186, 104, 68, .22f)), (0.82f, new Painter.Rgba(255, 224, 184, .42f)), (1f, new Painter.Rgba(255, 224, 184, 0)) };
            foreach (var c in CanyonShape.CRATERS)
            {
                float R = c[2] * PXM * 1.3f;
                pic.Radial(Gx(c[0]), Gy(c[1]), 0, R, R, R, craterStops);
            }
            // stonier ground under the walls
            for (int i = 0; i < 3600; i++)
            {
                int side = r.Next() < 0.5f ? -1 : 1;
                float t = GT0 + 8 + r.Next() * (GL - 16);
                float rr = r.Next() * r.Next();
                float a = side * (shape.HalfW(t, side) - 10 * rr);
                var col = new Painter.Rgba(166, 90, 58, 0.16f + r.Next() * 0.3f);
                float rx = (2 + r.Next() * 6) * k, ry = (1.3f + r.Next() * 3.6f) * k, rot = r.Next() * 3;
                pic.Ellipse(Gx(a), Gy(t), rx, ry, rot, col);
            }
            // a soft shade where each stone sits
            var shadeStops = new[] { (0f, new Painter.Rgba(150, 80, 52, .34f)), (1f, new Painter.Rgba(150, 80, 52, 0)) };
            foreach (var p in placed)
            {
                float a = p.x, t = p.y, s = p.z, cx = Gx(a + s * 0.25f), cy = Gy(t + s * 0.12f), R = s * 1.7f * PXM;
                pic.Radial(cx, cy, R * 0.25f, R, R, R * 0.72f, shadeStops);
            }
            // the bank of the Ice Hollow: damp and darker outside, frost towards the ice
            float ia = CanyonShape.ICE[0], it = CanyonShape.ICE[1], ra = CanyonShape.ICE[2], rt = CanyonShape.ICE[3];
            float Wave(float q) => 1 + 0.07f * (float)Math.Sin(q * 3 + 1) + 0.05f * (float)Math.Sin(q * 5 + 2);
            pic.Star(Gx(ia), Gy(it), ra * 1.36f * PXM, rt * 1.36f * PXM, Wave, new Painter.Rgba(156, 84, 56, .28f));
            pic.Star(Gx(ia), Gy(it), ra * 1.27f * PXM, rt * 1.27f * PXM, Wave, new Painter.Rgba(156, 84, 56, .2f));
            pic.Star(Gx(ia), Gy(it), ra * 1.19f * PXM, rt * 1.19f * PXM, Wave, new Painter.Rgba(255, 240, 220, .5f));
            pic.Star(Gx(ia), Gy(it), ra * 1.14f * PXM, rt * 1.14f * PXM, Wave, new Painter.Rgba(255, 248, 238, .55f));
            // the tracks of the robot: two ruts, and fainter ones beside them from other days
            var rt2 = new Rng(5);
            foreach (var off in new[] { -0.85f, 0.85f })
                for (int pass = 0; pass < 3; pass++)
                {
                    float sway = (rt2.Next() - 0.5f) * 0.5f;
                    var col = pass > 0 ? new Painter.Rgba(176, 96, 62, .2f) : new Painter.Rgba(156, 82, 52, .5f);
                    var xs = new float[261]; var ys = new float[261];
                    for (int i = 0; i <= 260; i++)
                    {
                        var (a, t, q) = CanyonShape.Along(CanyonShape.TRACK, i / 260f);
                        float o = off + (pass > 0 ? sway + (float)Math.Sin(i * 0.14f + pass) * 0.25f : 0);
                        xs[i] = Gx(a - (float)Math.Sin(q) * o); ys[i] = Gy(t + (float)Math.Cos(q) * o);
                    }
                    pic.Polyline(xs, ys, (pass > 0 ? 2.6f : 3.8f) * k, col);
                }
            return pic;
        }

        /// <summary>The floor as a mesh, every 2 m, out to 3 m past the foot of the walls.</summary>
        public static MeshData FloorMesh(Field field)
        {
            const int STEP = 2;
            int nx = GW / STEP + 1, nz = GL / STEP + 1;
            var pos = new Vector3[nx * nz]; var uv = new Vector2[nx * nz]; var keep = new bool[nx * nz];
            for (int j = 0; j < nz; j++)
                for (int i = 0; i < nx; i++)
                {
                    int q = j * nx + i, fq = j * STEP * field.Row + i * STEP;
                    pos[q] = U3.At(i * STEP - GA, GT0 + j * STEP, field.H[fq]);
                    uv[q] = new Vector2(i * STEP / (float)GW, 1 - j * STEP / (float)GL);
                    keep[q] = field.D[fq] < 3;
                }
            return new MeshData { Pos = pos, Uv = uv, Tris = Grid(nx, nz, keep) };
        }

        /// <summary>Two triangles per cell where any corner is kept, wound for Unity (the mirror turns three.js's order over).</summary>
        static int[] Grid(int nx, int nz, bool[] keep)
        {
            var idx = new List<int>();
            for (int j = 0; j + 1 < nz; j++)
                for (int i = 0; i + 1 < nx; i++)
                {
                    int p = j * nx + i, q = p + nx;
                    if (!(keep[p] || keep[p + 1] || keep[q] || keep[q + 1])) continue;
                    idx.Add(p); idx.Add(p + 1); idx.Add(q);
                    idx.Add(p + 1); idx.Add(q + 1); idx.Add(q);
                }
            return idx.ToArray();
        }

        // ---------- the walls of the canyon and the plain above ----------
        // Each face is a layer of rock in its own colour with thin lines of strata; the colour is painted by height, so
        // the layers stay level and sharp whatever the shape of the wall, and dust lies on the ledges.
        public static Painter Strata()
        {
            const int H = 1024;
            var pic = new Painter(2, H);
            float S = CanyonShape.TOP / CanyonShape.STEPS, TOP = CanyonShape.TOP;
            float YOf(float hh) => (1 - (hh + 1) / (TOP + 2)) * H;
            var r = new Rng(47);
            void Band(int col, float h0, float h1, Painter.Rgba c) => pic.Rows(col, YOf(h1), YOf(h0) + 1, c);
            var rocks = new[] { 0xc8744eu, 0xb6603cu, 0xd0865cu };
            for (int col = 0; col < 2; col++)
            {
                Band(col, -1, TOP + 1, Painter.Rgba.Hex(0xee9f66));
                for (int kk = 0; kk < 3; kk++)
                {
                    Band(col, kk * S + 0.45f, (kk + 1) * S - 0.45f, Painter.Rgba.Hex(rocks[kk]));
                    for (float hh = kk * S + 0.9f; hh < (kk + 1) * S - 0.7f; hh += 0.9f + r.Next() * 1.3f)
                    {
                        float top = hh + 0.16f + r.Next() * 0.2f;
                        var c = r.Next() < 0.5f ? new Painter.Rgba(90, 40, 20, .2f) : new Painter.Rgba(255, 214, 170, .28f);
                        Band(col, hh, top, c);
                    }
                }
                if (col == 1)
                {
                    // beside the mine the layers hold the iron ore and the quartz it digs
                    Band(col, 2.5f, 4.5f, Painter.Rgba.Hex(0x8a4a36)); Band(col, 3.3f, 3.55f, Painter.Rgba.Hex(0x6f3a2a));
                    Band(col, S + 2.2f, S + 3.7f, Painter.Rgba.Hex(0xf1e6ff)); Band(col, S + 2.8f, S + 2.95f, Painter.Rgba.Hex(0xd9c8f5));
                }
                for (int kk = 1; kk <= CanyonShape.STEPS; kk++) Band(col, kk * S - 0.45f, kk * S + 0.45f, Painter.Rgba.Hex(kk == CanyonShape.STEPS ? 0xeaa878u : 0xe6a274u));
                Band(col, TOP + 0.45f, TOP + 1, Painter.Rgba.Hex(0xeaa878));
            }
            return pic;
        }

        public static MeshData Land(CanyonShape shape)
        {
            const float STEP = 1.5f, A0 = -170, A1 = 170, T0 = -310, T1 = 268;
            int nx = (int)Math.Round((A1 - A0) / STEP) + 1, nz = (int)Math.Round((T1 - T0) / STEP) + 1;
            var pos = new Vector3[nx * nz]; var uv = new Vector2[nx * nz]; var col = new Color[nx * nz]; var keep = new bool[nx * nz];
            var n3 = shape.N3;
            for (int j = 0; j < nz; j++)
                for (int i = 0; i < nx; i++)
                {
                    float a = A0 + i * STEP, t = T0 + j * STEP, d = shape.Outside(a, t);
                    int q = j * nx + i;
                    // inside the picture of the floor the floor is its own surface; this one starts at the foot of the walls
                    keep[q] = d > 1.5f || Math.Abs(a) > GA - 1 || t < GT0 + 1 || t > GT1 - 1;
                    float f = shape.Floor(a, t, d), hh = d > 0 ? Math.Max(shape.Wall(a, t, d), f) : f - 0.04f;
                    pos[q] = U3.At(a, t, hh);
                    // the colour comes from the height (the layers waver a little); by the mine, from the column with the ore
                    float u = a < 0 ? Cm.Smooth((-a - 30) / 12) * Cm.Smooth((t + 32) / 8) * Cm.Smooth((40 - t) / 8) : 0;
                    float v = d <= 0 ? 0.002f : d > CanyonShape.RISE - 1 ? 0.998f : Cm.Clamp((hh + (Cm.Fbm(n3, a * 0.07f + 9, t * 0.07f, 2) - 0.5f) * 0.7f + 1) / (CanyonShape.TOP + 2), 0.002f, 0.998f);
                    uv[q] = new Vector2(0.25f + 0.5f * u, v);
                    // big soft patches of lighter and darker rock, so no ledge and no stretch of the plain is one flat colour
                    float tint = 1 + (Cm.Fbm(n3, a * 0.022f + 3, t * 0.022f, 3) - 0.5f) * 0.2f * Cm.Smooth(d / 4);
                    col[q] = new Color(tint, tint, tint, 1);
                }
            return new MeshData { Pos = pos, Uv = uv, Col = col, Tris = Grid(nx, nz, keep) };
        }

        // ---------- the Ice Hollow: the ice lies in its basin, below the ground round it ----------
        public const float ICE_Y = -0.5f;

        public static Painter IcePicture()
        {
            var pic = new Painter(768, 448);
            var r = new Rng(3);
            pic.Conical(300, 180, 20, 384, 224, 420, new[] { (0f, Painter.Rgba.Hex(0xf2fbff)), (0.55f, Painter.Rgba.Hex(0xcfeeff)), (1f, Painter.Rgba.Hex(0xa6d6f1)) });
            var white = new Painter.Rgba(255, 255, 255, .92f);
            for (int kk = 0; kk < 11; kk++)
            {
                float px = 80 + r.Next() * 608, py = 60 + r.Next() * 328, dir = r.Next() * 6.3f;
                for (int i = 0; i < 10; i++)
                {
                    float nxp = px + (float)Math.Cos(dir) * 26, nyp = py + (float)Math.Sin(dir) * 26;
                    pic.Line(px, py, nxp, nyp, 5 - i * 0.4f, white);
                    px = nxp; py = nyp; dir += (r.Next() - 0.5f) * 1.1f;
                }
            }
            var snow = new Painter.Rgba(255, 255, 255, .5f);
            for (int kk = 0; kk < 6; kk++)
            {
                float cx = 100 + r.Next() * 568, cy = 70 + r.Next() * 308, rx = 50 + r.Next() * 60, ry = 12 + r.Next() * 10;
                pic.Ellipse(cx, cy, rx, ry, -0.5f, snow);
            }
            return pic;
        }

        public static MeshData IceDisc()
        {
            const int N = 64; const float K = 1.1f;
            float a0 = CanyonShape.ICE[0], t0 = CanyonShape.ICE[1], ra = CanyonShape.ICE[2], rt = CanyonShape.ICE[3];
            var pos = new Vector3[N + 1]; var uv = new Vector2[N + 1]; var tris = new int[N * 3];
            pos[0] = U3.At(a0, t0, ICE_Y); uv[0] = new Vector2(0.5f, 0.5f);
            for (int i = 0; i < N; i++)
            {
                float q = i / (float)N * Mathf.PI * 2, wv = (1 + 0.07f * Mathf.Sin(q * 3 + 1) + 0.05f * Mathf.Sin(q * 5 + 2)) * K;
                float da = Mathf.Cos(q) * wv, dt = Mathf.Sin(q) * wv;
                pos[1 + i] = U3.At(a0 + da * ra, t0 + dt * rt, ICE_Y);
                uv[1 + i] = new Vector2(0.5f + da / 2.5f, 0.5f - dt / 2.5f);
            }
            for (int i = 0; i < N; i++) { tris[i * 3] = 0; tris[i * 3 + 1] = 1 + i; tris[i * 3 + 2] = 1 + (i + 1) % N; }
            return new MeshData { Pos = pos, Uv = uv, Tris = tris };
        }

        // ---------- the dust over the closed zone: a blanket of soft layers that lies on the ground ----------
        // Each layer is a sheet at its own height with holes of its own; seen from the map's camera the upper ones slide
        // over the lower ones, so the dust has depth and stones stand up out of it. Each picture holds three strengths
        // of dust (Dust.shader): over the plots of zone I (red), over the back of the canyon up to the street that zone II
        // clears (green), and what stays after that (blue).
        public const float DustW = 144, DustT0 = -176, DustT1 = 72;
        public const int DustPX = 2;

        public sealed class DustLayer
        {
            public float Y;
            public Color Day;
            public byte[] Rgb;
            public int W, H;
            public int Order;
        }

        /// <param name="front">Where the dust over the back begins while zone II is closed, and after it opens.</param>
        /// <param name="zone1">Centres (three.js x, z) of the plots of zone I that still lie under dust.</param>
        public static List<DustLayer> Dust(CanyonShape shape, float frontClosed, float frontOpen, List<Vector2> zone1)
        {
            float W = DustW, T0 = DustT0, L = DustT1 - DustT0;
            int w = (int)(W * DustPX), h = (int)Math.Round(L * DustPX);
            var HAZE = new Color32(246, 208, 172, 255); var SHADE = new Color32(218, 164, 126, 255);
            var LIT = new[] { new Color32(252, 226, 198, 255), new Color32(254, 234, 210, 255), new Color32(255, 240, 222, 255), new Color32(255, 246, 232, 255) };
            // height, strength, gaps (0 = none), colour, seed, pushed by (across, along)
            var layers = new List<(float y, float st, float gaps, Color32 col, int seed, float da, float dt)>
            {
                (0.4f, 0.3f, 0, HAZE, 0, 0, 0), (1.1f, 0.28f, 0, HAZE, 1, 0, 0), (2.0f, 0.26f, 0, new Color32(249, 216, 184, 255), 2, 0, 0),
            };
            var billows = new[] { (3.2f, 0.52f, 0.47f), (4.9f, 0.5f, 0.5f), (6.8f, 0.46f, 0.53f), (8.8f, 0.38f, 0.57f) };
            for (int kk = 0; kk < billows.Length; kk++)
            {
                var (y, st, gaps) = billows[kk];
                layers.Add((y - 0.3f, st * 0.78f, gaps, SHADE, 3 + kk, 2.8f, 1.5f));
                layers.Add((y, st * 1.12f, gaps, LIT[kk], 3 + kk, 0, 0));
            }
            var result = new List<DustLayer>();
            for (int order = 0; order < layers.Count; order++)
            {
                var (y, strength, gaps, col, seed, da, dt) = layers[order];
                var n = new Noise2((uint)(100 + seed * 13));
                var rgb = new byte[w * h * 3];
                for (int j = 0; j < h; j++)
                    for (int i = 0; i < w; i++)
                    {
                        float a = i / (float)DustPX - W / 2 - da, t = T0 + j / (float)DustPX - dt;
                        int side = a < 0 ? -1 : 1;
                        float wave = (Cm.Fbm(n, a * 0.05f + 3, 1.3f, 2) - 0.5f) * 16;
                        float walls = Cm.Smooth((shape.HalfW(Math.Max(t, CanyonShape.HEAD), side) + 5 - Math.Abs(a)) / 10) * Cm.Smooth((t - T0) / 12);
                        // where the dust begins: a little beyond the last street, the higher layers further back, the edge wavy
                        float dClosed = Cm.Smooth((frontClosed - seed * 2.2f + wave - t) / 15) * walls;
                        float dOpen = Cm.Smooth((frontOpen - seed * 2.2f + wave - t) / 15) * walls;
                        float dZone1 = 0;
                        if (zone1.Count > 0)
                        {
                            var (x, z) = Cm.P(a, t);
                            // over the whole plot and half the street round it, the edge wavy and softer higher up
                            float edge = 10f - seed * 0.35f + (Cm.Fbm(n, x * 0.07f + 5, z * 0.07f, 2) - 0.5f) * 4;
                            foreach (var c in zone1)
                            {
                                float cheb = Math.Max(Math.Abs(x - c.x), Math.Abs(z - c.y));
                                dZone1 = Math.Max(dZone1, Cm.Smooth((edge - cheb) / 3.5f));
                            }
                        }
                        int o = (j * w + i) * 3;
                        if (dClosed <= 0.002f && dZone1 <= 0.002f) continue;
                        float f = Cm.Fbm(n, a * 0.04f + seed * 7.3f, t * 0.056f - seed * 3.1f, 4);
                        float body = gaps > 0 ? Cm.Clamp((f - gaps) * 5.2f + 0.32f) : 0.6f + 0.4f * Cm.Clamp((f - 0.4f) * 3 + 0.5f);
                        byte Alpha(float dens, float b)
                        {
                            if (dens <= 0.002f) return 0;
                            float wisp = Cm.Clamp((f - 0.42f + dens * 0.95f) * 3.6f);
                            return (byte)Math.Round(255 * Cm.Clamp(strength * (float)Math.Pow(dens, 0.7) * wisp * b));
                        }
                        // a single plot is smaller than the gaps between the billows: over zone I they close up more
                        float bodyZone1 = gaps > 0 ? Cm.Clamp((f - gaps) * 5.2f + 0.7f) : body;
                        rgb[o] = Alpha(dZone1, bodyZone1); rgb[o + 1] = Alpha(dClosed, body); rgb[o + 2] = Alpha(dOpen, body);
                    }
                result.Add(new DustLayer { Y = y, Day = col, Rgb = rgb, W = w, H = h, Order = order });
            }
            return result;
        }

        // ---------- the stones: lumpy boulders with flat faces, dust on top, pebbles round the big ones ----------
        // A ball is pushed out and in by noise, then cut by a few planes, which leaves the flat faces a broken rock has;
        // the edges stay soft. The top of every stone is paler (dust lies on it), the underside darker.
        public sealed class RockShape { public Vector3[] Pos; public Color[] Col; public int[] Tris; }

        public static RockShape[] RockShapes(Rng r, int detail)
        {
            var shapes = new RockShape[8];
            var n = new Noise2(61);
            for (int v = 0; v < 8; v++)
            {
                var (pos, tris) = Icosphere(detail);
                float sx = 0.85f + r.Next() * 0.45f, sz = 0.85f + r.Next() * 0.45f, sy = 0.55f + r.Next() * 0.32f;
                int cutCount = 4 + (int)(r.Next() * 4);
                var cuts = new (Vector3 c, float d)[cutCount];
                for (int i = 0; i < cutCount; i++)
                {
                    float cx = r.Next() - 0.5f, cy = r.Next() * 0.9f - 0.15f, cz = r.Next() - 0.5f;
                    cuts[i] = (new Vector3(cx, cy, cz).normalized, 0.6f + r.Next() * 0.28f);
                }
                for (int i = 0; i < pos.Length; i++)
                {
                    var q = pos[i];
                    q *= 1 + 0.42f * (Cm.Fbm(n, q.x * 1.5f + v * 9 + q.z * 0.8f, q.y * 1.5f - q.z * 0.6f, 3) - 0.5f);
                    foreach (var (c, d) in cuts) { float over = Vector3.Dot(q, c) - d; if (over > 0) q -= c * (over * 0.93f); }
                    pos[i] = new Vector3(q.x * sx, Math.Max(q.y, -0.38f) * sy + 0.38f * sy, q.z * sz);
                }
                var nor = Normals(pos, tris);
                var col = new Color[pos.Length];
                for (int i = 0; i < pos.Length; i++)
                {
                    float up = nor[i].y, shade = 0.74f + 0.34f * Cm.Smooth((up + 0.25f) / 1.1f), dusty = Cm.Smooth((up - 0.5f) / 0.4f) * 0.55f;
                    col[i] = new Color(shade * (1 + dusty * 0.3f), shade * (1 + dusty * 0.42f), shade * (1 + dusty * 0.5f), 1);
                }
                shapes[v] = new RockShape { Pos = pos, Col = col, Tris = tris };
            }
            return shapes;
        }

        static Vector3[] Normals(Vector3[] pos, int[] tris)
        {
            var nor = new Vector3[pos.Length];
            for (int i = 0; i < tris.Length; i += 3)
            {
                var a = pos[tris[i]]; var b = pos[tris[i + 1]]; var c = pos[tris[i + 2]];
                var fn = Vector3.Cross(b - a, c - a);
                nor[tris[i]] += fn; nor[tris[i + 1]] += fn; nor[tris[i + 2]] += fn;
            }
            for (int i = 0; i < nor.Length; i++) nor[i] = nor[i].normalized;
            return nor;
        }

        /// <summary>The icosahedron of three.js split (detail + 1)^2 times per face and pushed out to a ball, with shared vertices.</summary>
        static (Vector3[] pos, int[] tris) Icosphere(int detail)
        {
            float t = (1 + Mathf.Sqrt(5)) / 2;
            var bv = new[] { new Vector3(-1, t, 0), new Vector3(1, t, 0), new Vector3(-1, -t, 0), new Vector3(1, -t, 0), new Vector3(0, -1, t), new Vector3(0, 1, t),
                new Vector3(0, -1, -t), new Vector3(0, 1, -t), new Vector3(t, 0, -1), new Vector3(t, 0, 1), new Vector3(-t, 0, -1), new Vector3(-t, 0, 1) };
            int[] bi = { 0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1 };
            var verts = new List<Vector3>(); var map = new Dictionary<(int, int, int), int>(); var tris = new List<int>();
            int Index(Vector3 p)
            {
                p = p.normalized;
                var key = ((int)Math.Round(p.x * 10000), (int)Math.Round(p.y * 10000), (int)Math.Round(p.z * 10000));
                if (map.TryGetValue(key, out var i)) return i;
                verts.Add(p); map[key] = verts.Count - 1; return verts.Count - 1;
            }
            int cols = detail + 1;
            for (int f = 0; f < bi.Length; f += 3)
            {
                var a = bv[bi[f]]; var b = bv[bi[f + 1]]; var c = bv[bi[f + 2]];
                var v = new int[cols + 1][];
                for (int i = 0; i <= cols; i++)
                {
                    var aj = Vector3.Lerp(a, c, i / (float)cols); var bj = Vector3.Lerp(b, c, i / (float)cols);
                    int rows = cols - i;
                    v[i] = new int[rows + 1];
                    for (int j = 0; j <= rows; j++) v[i][j] = j == 0 && i == cols ? Index(aj) : Index(Vector3.Lerp(aj, bj, rows == 0 ? 0 : j / (float)rows));
                }
                for (int i = 0; i < cols; i++)
                    for (int j = 0; j < 2 * (cols - i) - 1; j++)
                    {
                        int k = j / 2;
                        // the order of three.js: the shape is not mirrored, so its faces look out in Unity too
                        if (j % 2 == 0) { tris.Add(v[i][k + 1]); tris.Add(v[i + 1][k]); tris.Add(v[i][k]); }
                        else { tris.Add(v[i][k + 1]); tris.Add(v[i + 1][k + 1]); tris.Add(v[i + 1][k]); }
                    }
            }
            return (verts.ToArray(), tris.ToArray());
        }
    }
}
