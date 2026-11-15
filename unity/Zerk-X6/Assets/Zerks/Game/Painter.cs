using System;

namespace Zerks.Game
{
    /// <summary>
    /// A small picture painted in memory, with the few strokes the mockup paints on its canvases (round lines, ellipses,
    /// round gradients, filled shapes), blended "source over" with soft edges as a browser does. Pure arithmetic, so the
    /// ground can be painted on a worker thread. Row 0 is the top of the picture, as on a canvas.
    /// </summary>
    public sealed class Painter
    {
        public readonly int W, H;
        public readonly byte[] Rgb;

        public Painter(int w, int h) { W = w; H = h; Rgb = new byte[w * h * 3]; }

        public struct Rgba
        {
            public float R, G, B, A;
            public Rgba(float r, float g, float b, float a) { R = r; G = g; B = b; A = a; }
            public static Rgba Hex(uint rgb, float a = 1) => new Rgba((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, a);
        }

        public void Set(int x, int y, float r, float g, float b)
        {
            int q = (y * W + x) * 3;
            Rgb[q] = B8(r); Rgb[q + 1] = B8(g); Rgb[q + 2] = B8(b);
        }

        static byte B8(float v) => (byte)(v <= 0 ? 0 : v >= 255 ? 255 : (int)(v + 0.5f));

        /// <summary>Blends a colour over one pixel with a strength 0..1.</summary>
        public void Blend(int x, int y, Rgba c, float k)
        {
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            float a = c.A * k;
            if (a <= 0.001f) return;
            int q = (y * W + x) * 3;
            Rgb[q] = B8(Rgb[q] + (c.R - Rgb[q]) * a);
            Rgb[q + 1] = B8(Rgb[q + 1] + (c.G - Rgb[q + 1]) * a);
            Rgb[q + 2] = B8(Rgb[q + 2] + (c.B - Rgb[q + 2]) * a);
        }

        static float SegDist(float px, float py, float x1, float y1, float x2, float y2)
        {
            float dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
            float f = l > 0 ? Math.Max(0, Math.Min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
            float ex = x1 + dx * f - px, ey = y1 + dy * f - py;
            return (float)Math.Sqrt(ex * ex + ey * ey);
        }

        /// <summary>One straight stroke with round caps (a canvas moveTo, lineTo, stroke).</summary>
        public void Line(float x1, float y1, float x2, float y2, float width, Rgba c)
        {
            float hw = width / 2;
            int xa = (int)Math.Floor(Math.Min(x1, x2) - hw - 1), xb = (int)Math.Ceiling(Math.Max(x1, x2) + hw + 1);
            int ya = (int)Math.Floor(Math.Min(y1, y2) - hw - 1), yb = (int)Math.Ceiling(Math.Max(y1, y2) + hw + 1);
            xa = Math.Max(0, xa); ya = Math.Max(0, ya); xb = Math.Min(W - 1, xb); yb = Math.Min(H - 1, yb);
            for (int y = ya; y <= yb; y++)
                for (int x = xa; x <= xb; x++)
                {
                    float cov = Cm.Clamp(hw - SegDist(x + 0.5f, y + 0.5f, x1, y1, x2, y2) + 0.5f);
                    if (cov > 0) Blend(x, y, c, cov);
                }
        }

        /// <summary>A path of many points stroked once: where its pieces overlap the colour is laid only once.</summary>
        public void Polyline(float[] xs, float[] ys, float width, Rgba c)
        {
            float hw = width / 2;
            float minX = float.MaxValue, minY = float.MaxValue, maxX = float.MinValue, maxY = float.MinValue;
            for (int i = 0; i < xs.Length; i++) { minX = Math.Min(minX, xs[i]); maxX = Math.Max(maxX, xs[i]); minY = Math.Min(minY, ys[i]); maxY = Math.Max(maxY, ys[i]); }
            int xa = Math.Max(0, (int)Math.Floor(minX - hw - 1)), xb = Math.Min(W - 1, (int)Math.Ceiling(maxX + hw + 1));
            int ya = Math.Max(0, (int)Math.Floor(minY - hw - 1)), yb = Math.Min(H - 1, (int)Math.Ceiling(maxY + hw + 1));
            if (xb < xa || yb < ya) return;
            int bw = xb - xa + 1, bh = yb - ya + 1;
            var cover = new float[bw * bh];
            for (int i = 0; i + 1 < xs.Length; i++)
            {
                float x1 = xs[i], y1 = ys[i], x2 = xs[i + 1], y2 = ys[i + 1];
                int sx0 = Math.Max(xa, (int)Math.Floor(Math.Min(x1, x2) - hw - 1)), sx1 = Math.Min(xb, (int)Math.Ceiling(Math.Max(x1, x2) + hw + 1));
                int sy0 = Math.Max(ya, (int)Math.Floor(Math.Min(y1, y2) - hw - 1)), sy1 = Math.Min(yb, (int)Math.Ceiling(Math.Max(y1, y2) + hw + 1));
                for (int y = sy0; y <= sy1; y++)
                    for (int x = sx0; x <= sx1; x++)
                    {
                        float cov = Cm.Clamp(hw - SegDist(x + 0.5f, y + 0.5f, x1, y1, x2, y2) + 0.5f);
                        int q = (y - ya) * bw + (x - xa);
                        if (cov > cover[q]) cover[q] = cov;
                    }
            }
            for (int y = 0; y < bh; y++) for (int x = 0; x < bw; x++) { float k = cover[y * bw + x]; if (k > 0) Blend(xa + x, ya + y, c, k); }
        }

        /// <summary>A filled ellipse turned by rot radians (canvas ellipse + fill).</summary>
        public void Ellipse(float cx, float cy, float rx, float ry, float rot, Rgba c)
        {
            float r = Math.Max(rx, ry) + 1;
            int xa = Math.Max(0, (int)Math.Floor(cx - r)), xb = Math.Min(W - 1, (int)Math.Ceiling(cx + r));
            int ya = Math.Max(0, (int)Math.Floor(cy - r)), yb = Math.Min(H - 1, (int)Math.Ceiling(cy + r));
            float cs = (float)Math.Cos(rot), sn = (float)Math.Sin(rot), m = Math.Min(rx, ry);
            for (int y = ya; y <= yb; y++)
                for (int x = xa; x <= xb; x++)
                {
                    float dx = x + 0.5f - cx, dy = y + 0.5f - cy, u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
                    float e = (float)Math.Sqrt(u * u + v * v);
                    float cov = Cm.Clamp((1 - e) * m + 0.5f);
                    if (cov > 0) Blend(x, y, c, cov);
                }
        }

        /// <summary>
        /// A round gradient (canvas createRadialGradient with one centre) from radius r0 to r1, filled inside the ellipse
        /// (rx, ry) round the same centre. Stops are (offset, colour), offsets rising from 0 to 1.
        /// </summary>
        public void Radial(float cx, float cy, float r0, float r1, float rx, float ry, (float at, Rgba c)[] stops)
        {
            float r = Math.Max(rx, ry) + 1;
            int xa = Math.Max(0, (int)Math.Floor(cx - r)), xb = Math.Min(W - 1, (int)Math.Ceiling(cx + r));
            int ya = Math.Max(0, (int)Math.Floor(cy - r)), yb = Math.Min(H - 1, (int)Math.Ceiling(cy + r));
            float m = Math.Min(rx, ry);
            for (int y = ya; y <= yb; y++)
                for (int x = xa; x <= xb; x++)
                {
                    float dx = x + 0.5f - cx, dy = y + 0.5f - cy;
                    float e = (float)Math.Sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry));
                    float cov = Cm.Clamp((1 - e) * m + 0.5f);
                    if (cov <= 0) continue;
                    float f = r1 > r0 ? ((float)Math.Sqrt(dx * dx + dy * dy) - r0) / (r1 - r0) : 0;
                    Blend(x, y, Stop(stops, f), cov);
                }
        }

        public static Rgba Stop((float at, Rgba c)[] stops, float f)
        {
            if (f <= stops[0].at) return stops[0].c;
            for (int i = 1; i < stops.Length; i++)
            {
                if (f > stops[i].at) continue;
                var (a0, c0) = stops[i - 1]; var (a1, c1) = stops[i];
                float u = a1 > a0 ? (f - a0) / (a1 - a0) : 1;
                // canvas mixes the colours with their strength (premultiplied), so a fade to nothing keeps its colour
                float A = c0.A + (c1.A - c0.A) * u;
                if (A <= 0) return new Rgba(c1.R, c1.G, c1.B, 0);
                return new Rgba((c0.R * c0.A + (c1.R * c1.A - c0.R * c0.A) * u) / A, (c0.G * c0.A + (c1.G * c1.A - c0.G * c0.A) * u) / A,
                    (c0.B * c0.A + (c1.B * c1.A - c0.B * c0.A) * u) / A, A);
            }
            return stops[stops.Length - 1].c;
        }

        /// <summary>
        /// Fills a shape that is round its centre, given by its radius in each direction (radius(angle) in pixels),
        /// with soft edges: the bank of the Ice Hollow.
        /// </summary>
        public void Star(float cx, float cy, float rx, float ry, Func<float, float> wave, Rgba c)
        {
            float r = Math.Max(rx, ry) * 1.2f + 2;
            int xa = Math.Max(0, (int)Math.Floor(cx - r)), xb = Math.Min(W - 1, (int)Math.Ceiling(cx + r));
            int ya = Math.Max(0, (int)Math.Floor(cy - r)), yb = Math.Min(H - 1, (int)Math.Ceiling(cy + r));
            float m = Math.Min(rx, ry);
            for (int y = ya; y <= yb; y++)
                for (int x = xa; x <= xb; x++)
                {
                    float u = (x + 0.5f - cx) / rx, v = (y + 0.5f - cy) / ry;
                    float q = (float)Math.Atan2(v, u), e = (float)Math.Sqrt(u * u + v * v) / wave(q);
                    float cov = Cm.Clamp((1 - e) * m + 0.5f);
                    if (cov > 0) Blend(x, y, c, cov);
                }
        }

        /// <summary>A gradient between two circles (canvas createRadialGradient with two centres), filling the picture.</summary>
        public void Conical(float x0, float y0, float r0, float x1, float y1, float r1, (float at, Rgba c)[] stops)
        {
            float cdx = x1 - x0, cdy = y1 - y0, dr = r1 - r0, A = cdx * cdx + cdy * cdy - dr * dr;
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    float pdx = x + 0.5f - x0, pdy = y + 0.5f - y0;
                    float B = pdx * cdx + pdy * cdy + r0 * dr, C = pdx * pdx + pdy * pdy - r0 * r0;
                    float t;
                    if (Math.Abs(A) < 1e-6f) t = C / (2 * B);
                    else
                    {
                        float disc = B * B - A * C;
                        if (disc < 0) continue;
                        float s = (float)Math.Sqrt(disc);
                        t = (B + s) / A;
                        if (r0 + t * dr < 0) t = (B - s) / A;
                    }
                    var c = Stop(stops, t);
                    Set(x, y, c.R, c.G, c.B);
                }
        }

        /// <summary>
        /// A band of rows from y0 to y1 (fractional) across one column, as canvas fillRect(col, y0, 1, y1 - y0) does:
        /// the rows at the ends get only their share.
        /// </summary>
        public void Rows(int col, float y0, float y1, Rgba c)
        {
            if (y1 < y0) (y0, y1) = (y1, y0);
            int a = Math.Max(0, (int)Math.Floor(y0)), b = Math.Min(H - 1, (int)Math.Ceiling(y1) - 1);
            for (int y = a; y <= b; y++)
            {
                float cov = Math.Min(y + 1, y1) - Math.Max(y, y0);
                if (cov > 0) Blend(col, y, c, Cm.Clamp(cov));
            }
        }

        /// <summary>The picture with its rows turned over (row 0 = the bottom), as a Unity texture wants it.</summary>
        public byte[] FlippedRows()
        {
            var o = new byte[Rgb.Length];
            int row = W * 3;
            for (int y = 0; y < H; y++) Buffer.BlockCopy(Rgb, y * row, o, (H - 1 - y) * row, row);
            return o;
        }
    }
}
