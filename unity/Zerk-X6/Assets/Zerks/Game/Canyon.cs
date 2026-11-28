using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;

namespace Zerks.Game
{
    /// <summary>
    /// The canyon round the colony, as decided by Joro on 14.11.2026 ("I like it", "yes, make them permanent"; the
    /// mockup's mockup/src/map-details.js, ported for the phone in game/src/view/canyon.ts):
    ///   the canyon   a floor that winds, three terraces of layered rock up to the plain above, a round head, a mouth
    ///   the ground   real relief: flat where the colony stands, low dunes beyond it, one picture as big as the floor
    ///   the ice      the Ice Hollow at the low end of the canyon
    ///   the lines    a covered service channel along the streets, a box with a light at every building
    ///   the robot    its tracks out through the mouth (it drives them, Rover)
    ///   the zone     stakes with flags along the edge of the closed zone, and a sign
    ///   the dust     a blanket of soft layers over the closed zone, drifting slowly
    ///   the stones   lumpy boulders with flat faces, dust on top, pebbles round the big ones
    /// When a zone opens, the ground under its plots is made flat again (on a worker thread), its stones go and its
    /// dust settles.
    /// </summary>
    public sealed class Canyon : MonoBehaviour
    {
        Block[] blocks;
        int zone = -1;
        CanyonShape shape;
        CanyonBake.Field field;
        GameObject floorGo, stonesGo, ice, stakesGo, signGo;
        Material floorMat, stoneMat, glow;
        Texture2D floorTex;
        readonly List<Material> dustMats = new List<Material>();
        readonly List<Color> dustDay = new List<Color>();
        readonly Dictionary<int, GameObject> channel = new Dictionary<int, GameObject>();
        public readonly Dictionary<string, GameObject> Kerbs = new Dictionary<string, GameObject>();
        float open1 = 1, open2 = 1, open3 = 1, time;
        /// <summary>Where the dust stays after zone III, in the rows of the dust picture: just beyond the last row of the Green Belt (s = -13).</summary>
        static float Front3Row => (-13 * 11.314f - 12 - CanyonBake.DustT0) / (CanyonBake.DustT1 - CanyonBake.DustT0);
        Task<Rebake> pending;

        static readonly Color DustNight = Look.Hex(0x56596e);
        static readonly Color GlowColour = Look.Hex(0x33d1a8);
        const float Road = 0.04f; // the top of the Unity streets (WorldView), where the three.js streets had 0.08

        // ---------------------------------------------------------------- stones

        struct Stone { public float A, T, K, Sx, Sy, Sz, Ry; public int Shape, Tone, Group; public bool Fine; }
        readonly List<Stone> stones = new List<Stone>();
        CanyonBake.RockShape[] fine, coarse;
        static readonly Color[] Tones = { Look.Hex(0xc8744e), Look.Hex(0xb5613d), Look.Hex(0xd68a5f), Look.Hex(0xa9583a) };
        Color[] tonesLinear;

        /// <summary>The block (d, s) of the grid with i = (s + d) / 2, j = (s - d) / 2, or null.</summary>
        static Block? At(Block[] arr, int i, int j)
        {
            foreach (var b in arr) if (b.D == i - j && b.S == i + j) return b;
            return null;
        }

        static bool OnIceOrTrack(CanyonShape shape, float a, float t, float s)
        {
            var I = CanyonShape.ICE;
            float ea = (a - I[0]) / (I[2] * 1.4f), et = (t - I[1]) / (I[3] * 1.5f);
            if (ea * ea + et * et < 1) return true;
            return shape.TrackDist(a, t) < 2.6f + s;
        }

        /// <summary>
        /// Bare rock on the blocks outside the open zones (each block with its own random numbers, so its stones stay
        /// the same whatever opens around it; about a quarter left out), fallen stones under the walls, a few on the
        /// ledges and on the plain above.
        /// </summary>
        void PlaceStones(CanyonShape shape)
        {
            void Put(Rng r, float x, float z, float k, int group)
            {
                var (a, t) = Cm.AT(x, z);
                stones.Add(new Stone { A = a, T = t, K = k, Sx = k * (0.92f + r.Next() * 0.2f), Sy = k * (0.85f + r.Next() * 0.35f), Sz = k * (0.92f + r.Next() * 0.2f),
                    Ry = r.Next() * 6.3f, Shape = (int)(r.Next() * 8), Tone = (int)(r.Next() * 4), Group = group, Fine = k >= 0.55f });
            }
            void Around(Rng r, float x, float z, float k, int group)
            {
                int c = k > 1.05f ? 2 + (int)(r.Next() * 3) : r.Next() < 0.45f ? 1 : 0;
                for (int i = 0; i < c; i++)
                {
                    float q = r.Next() * 6.3f, d = k * (1.05f + r.Next() * 0.9f), kk = k * (0.13f + r.Next() * 0.2f);
                    Put(r, x + Mathf.Cos(q) * d, z + Mathf.Sin(q) * d, kk, group);
                }
            }
            foreach (var b in blocks)
            {
                if (b.Zone == 0) continue; // open from the start (and the Ark's plot)
                var r = new Rng((uint)(73 + (b.D + 10) * 131 + (b.S + 20) * 7));
                for (int i = 0; i < 6; i++)
                {
                    float x = b.Cx - 6 + r.Next() * 12, z = b.Cz - 6 + r.Next() * 12, s = 0.6f + r.Next() * 1.4f;
                    var (a, t) = Cm.AT(x, z);
                    if (OnIceOrTrack(shape, a, t, s) || r.Next() < 0.26f) continue;
                    float k = s * (0.8f + r.Next() * 0.55f);
                    Put(r, x, z, k, b.Zone); Around(r, x, z, k, b.Zone);
                }
            }
            var w = new Rng(74);
            for (int i = 0; i < 150; i++)
            {
                int side = w.Next() < 0.5f ? -1 : 1;
                float t = CanyonShape.HEAD + w.Next() * 190, rr = w.Next() * w.Next();
                var (x, z) = Cm.P(side * (shape.HalfW(t, side) - 2 - rr * 9), t);
                float k = 0.35f + w.Next() * w.Next() * 1.9f;
                Put(w, x, z, k, -1); if (k > 1.2f) Around(w, x, z, k, -1);
            }
            for (int i = 0; i < 110; i++)
            {
                int side = w.Next() < 0.5f ? -1 : 1;
                float t = CanyonShape.HEAD + w.Next() * 210; int step = (int)(w.Next() * 3);
                float out1 = step < 2 ? CanyonShape.RISE * (step + 0.5f + w.Next() * 0.42f) / CanyonShape.STEPS : CanyonShape.RISE + 5 + w.Next() * 45;
                var (x, z) = Cm.P(side * (shape.HalfW(t, side) + out1), t);
                float k = 0.3f + w.Next() * w.Next() * 1.5f;
                Put(w, x, z, k, -1); if (k > 1.1f) Around(w, x, z, k, -1);
            }
        }

        /// <summary>A stone's group still lies on the ground: its zone is closed, or it never opens (-1). Zone III opens in chapter 3.</summary>
        bool Shown(int group, int z) => group < 0 || group > z;

        /// <summary>The stones that show, in one mesh with their colours (and where each sits on the floor, for its shade).</summary>
        (MeshData mesh, List<Vector3> placed) StoneMesh(CanyonShape s, int z)
        {
            var pos = new List<Vector3>(); var col = new List<Color>(); var tris = new List<int>(); var placed = new List<Vector3>();
            foreach (var st in stones)
            {
                if (!Shown(st.Group, z)) continue;
                var shapeSet = st.Fine ? fine : coarse;
                var rock = shapeSet[st.Shape];
                float y = s.Land(st.A, st.T) - 0.07f * st.K;
                if (s.Outside(st.A, st.T) < 0) placed.Add(new Vector3(st.A, st.T, st.K));
                var (x3, z3) = Cm.P(st.A, st.T);
                var at = U3.V(x3, y, z3);
                // turned by -Ry about y (the mirror turns three.js angles round), by hand: this runs on a worker thread
                float cs = Mathf.Cos(-st.Ry), sn = Mathf.Sin(-st.Ry);
                var tone = tonesLinear[st.Tone];
                int b0 = pos.Count;
                for (int i = 0; i < rock.Pos.Length; i++)
                {
                    var p = rock.Pos[i];
                    float px = p.x * st.Sx, py = p.y * st.Sy, pz = p.z * st.Sz;
                    pos.Add(new Vector3(at.x + cs * px + sn * pz, at.y + py, at.z - sn * px + cs * pz));
                    var c = rock.Col[i]; col.Add(new Color(c.r * tone.r, c.g * tone.g, c.b * tone.b, 1));
                }
                foreach (var ti in rock.Tris) tris.Add(b0 + ti);
            }
            return (new MeshData { Pos = pos.ToArray(), Col = col.ToArray(), Tris = tris.ToArray() }, placed);
        }

        // ---------------------------------------------------------------- building

        sealed class Rebake
        {
            public CanyonShape Shape;
            public CanyonBake.Field Field;
            public byte[] Picture;
            public MeshData Floor, Stones;
            public int Zone;
        }

        Block[] WithZone(int z)
        {
            var o = (Block[])blocks.Clone();
            for (int i = 0; i < o.Length; i++) o[i].Built = o[i].Zone >= 0 && o[i].Zone <= z;
            return o;
        }

        Rebake Bake(int z)
        {
            var s = new CanyonShape(WithZone(z));
            var f = CanyonBake.FloorField(s);
            var (stoneMesh, placed) = StoneMesh(s, z);
            var pic = CanyonBake.PaintFloor(s, placed, f);
            return new Rebake { Shape = s, Field = f, Picture = pic.FlippedRows(), Floor = CanyonBake.FloorMesh(f), Stones = stoneMesh, Zone = z };
        }

        /// <param name="all">Every block of the grid with its zone (WorldView).</param>
        /// <param name="kerbs">The plots that get a box on the channel: building id, centre (three.js x, z), half-size.</param>
        /// <param name="runs">The service channel along the streets: x1, z1, x2, z2 (three.js).</param>
        public static Canyon Make(Transform parent, Block[] all, int startZone, IEnumerable<(string id, float cx, float cz, float half)> kerbs, float[][] runs)
        {
            var go = new GameObject("canyon");
            go.transform.SetParent(parent, false);
            var c = go.AddComponent<Canyon>();
            c.blocks = all;
            c.Build(startZone, kerbs.ToList(), runs);
            return c;
        }

        void Build(int startZone, List<(string id, float cx, float cz, float half)> kerbs, float[][] runs)
        {
            zone = startZone;
            var clock = System.Diagnostics.Stopwatch.StartNew();
            var groundBase = Resources.Load<Material>("Materials/Ground");
            floorMat = new Material(groundBase) { name = "floor" };
            var landMat = new Material(groundBase) { name = "canyon" };
            stoneMat = new Material(groundBase) { name = "stones" };
            glow = new Material(Look.Emissive(GlowColour, 1.2f)) { name = "glow" };

            // the shape with every chapter 1 plot open is the one the walls are made from: the walls lie far from the
            // plots, so they never change when a zone opens
            var wallShape = new CanyonShape(WithZone(2));
            tonesLinear = Tones.Select(t => t.linear).ToArray();
            fine = CanyonBake.RockShapes(new Rng(91), 2);
            coarse = CanyonBake.RockShapes(new Rng(91), 1);
            PlaceStones(new CanyonShape(WithZone(startZone)));
            var zone1 = blocks.Where(b => b.Zone == 1 && b.Zone > startZone).Select(b => new Vector2(b.Cx, b.Cz)).ToList();
            if (startZone >= 1) zone1.Clear();

            // the heavy parts at once, each on its own core
            var tFloor = Task.Run(() => Bake(startZone));
            var tLand = Task.Run(() => CanyonBake.Land(wallShape));
            var tStrata = Task.Run(() => CanyonBake.Strata().FlippedRows());
            var tIce = Task.Run(() => CanyonBake.IcePicture().FlippedRows());
            var tDust = Task.Run(() => CanyonBake.Dust(wallShape, Front(3), Front(5), zone1));
            Task.WaitAll(tFloor, tLand, tStrata, tIce, tDust);

            Apply(tFloor.Result);

            var strata = new Texture2D(2, 1024, TextureFormat.RGB24, false) { name = "strata", wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            strata.SetPixelData(tStrata.Result, 0); strata.Apply(false, true);
            landMat.SetTexture("_BaseMap", strata);
            Solid("canyon", tLand.Result.ToMesh("canyon"), landMat, true, true);

            // plain ground far beyond the land that is shaped
            var far = GameObject.CreatePrimitive(PrimitiveType.Plane);
            Destroy(far.GetComponent<Collider>());
            far.name = "far";
            far.transform.SetParent(transform, false);
            far.transform.localPosition = new Vector3(0, -2, 0);
            far.transform.localScale = new Vector3(180, 1, 180);
            far.GetComponent<Renderer>().sharedMaterial = Look.Lit(Look.Ground, 0);

            // the Ice Hollow: the ice lies in its basin, with blocks of ice on its edge
            var iceTex = new Texture2D(768, 448, TextureFormat.RGB24, true) { name = "ice", wrapMode = TextureWrapMode.Clamp };
            iceTex.SetPixelData(tIce.Result, 0); iceTex.Apply(true, true);
            var iceMat = new Material(groundBase) { name = "ice" };
            iceMat.SetTexture("_BaseMap", iceTex);
            ice = Solid("ice", CanyonBake.IceDisc().ToMesh("ice"), iceMat, false, true);
            IceBlocks(wallShape);

            Dust(tDust.Result);
            Channel(runs);
            foreach (var k in kerbs) Kerb(k.id, k.cx, k.cz, k.half, runs);
            ZoneEdge();
            open1 = startZone >= 1 ? 0 : 1;
            open2 = startZone >= 2 ? 0 : 1;
            open3 = startZone >= 3 ? 0 : 1;
            Debug.Log($"[Zerks] The canyon is made in {clock.ElapsedMilliseconds} ms ({stones.Count} stones)");
        }

        /// <summary>Where the dust over the back begins: a little beyond the last street of the open zones (reach rows back).</summary>
        static float Front(int reach) => -47 - (reach - 3) * 11.314f;

        void Apply(Rebake r)
        {
            shape = r.Shape;
            field = r.Field;
            // a new picture each time (the old one goes), so no copy of it stays in memory beside the one the GPU has
            var old = floorTex;
            floorTex = new Texture2D(CanyonBake.GW * CanyonBake.PXM, CanyonBake.GL * CanyonBake.PXM, TextureFormat.RGB24, true) { name = "floor", wrapMode = TextureWrapMode.Clamp, anisoLevel = 4 };
            floorTex.SetPixelData(r.Picture, 0);
            floorTex.Apply(true, true);
            floorMat.SetTexture("_BaseMap", floorTex);
            if (old != null) Destroy(old);
            if (floorGo != null) Destroy(floorGo.GetComponent<MeshFilter>().sharedMesh);
            if (floorGo == null) floorGo = Solid("floor", r.Floor.ToMesh("floor"), floorMat, false, true);
            else floorGo.GetComponent<MeshFilter>().sharedMesh = r.Floor.ToMesh("floor");
            if (stonesGo != null) { Destroy(stonesGo.GetComponent<MeshFilter>().sharedMesh); Destroy(stonesGo); }
            stonesGo = Solid("stones", r.Stones.ToMesh("stones"), stoneMat, true, true);
        }

        GameObject Solid(string name, Mesh mesh, Material mat, bool cast, bool receive)
        {
            var g = new GameObject(name);
            g.transform.SetParent(transform, false);
            g.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = g.AddComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = cast ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = receive;
            return g;
        }

        void IceBlocks(CanyonShape s)
        {
            var mat = Look.Lit(Look.Hex(0xdff5ff), 0.75f);
            var r = new Rng(7); var I = CanyonShape.ICE;
            var batch = new Batch();
            for (int k = 0; k < 10; k++)
            {
                float q = r.Next() * 6.3f, sz = 0.5f + r.Next() * 0.9f;
                float a = I[0] + Mathf.Cos(q) * I[2] * (0.78f + r.Next() * 0.3f), t = I[1] + Mathf.Sin(q) * I[3] * (0.78f + r.Next() * 0.3f);
                var (x, z) = Cm.P(a, t);
                float rx = (r.Next() - 0.5f) * 0.3f, ry = r.Next() * 6, rz = (r.Next() - 0.5f) * 0.3f;
                var rot = Quaternion.AngleAxis(rx * Mathf.Rad2Deg, Vector3.right) * Quaternion.AngleAxis(-ry * Mathf.Rad2Deg, Vector3.up) * Quaternion.AngleAxis(-rz * Mathf.Rad2Deg, Vector3.forward);
                batch.Add(Shapes.RoundedBox(sz * 1.4f, sz, sz * 1.1f, 0.25f), Matrix4x4.TRS(U3.V(x, Mathf.Max(s.Floor(a, t), CanyonBake.ICE_Y) + sz * 0.36f, z), rot, Vector3.one), mat);
            }
            batch.Build(transform, "ice blocks");
        }

        // ---------------------------------------------------------------- the dust

        void Dust(List<CanyonBake.DustLayer> layers)
        {
            var baseMat = Resources.Load<Material>("Materials/Dust");
            float W = CanyonBake.DustW, T0 = CanyonBake.DustT0, T1 = CanyonBake.DustT1;
            foreach (var l in layers)
            {
                var tex = new Texture2D(l.W, l.H, TextureFormat.RGB24, true, true) { name = "dust", wrapMode = TextureWrapMode.Clamp };
                tex.SetPixelData(l.Rgb, 0); tex.Apply(true, true);
                var m = new Material(baseMat) { name = "dust " + l.Order, renderQueue = 3004 + l.Order };
                m.SetTexture("_BaseMap", tex);
                // the mockup's neutral tone mapping makes its unlit dust about 7% darker than the colours it is given
                var day = (Color)l.Day * 0.93f; day.a = 1;
                m.SetColor("_Color", day);
                dustMats.Add(m); dustDay.Add(day);
                // a sheet over the canyon at the layer's height: its picture's rows run along the canyon from T0 to T1
                var md = new MeshData
                {
                    Pos = new[] { U3.At(-W / 2, T0, l.Y), U3.At(W / 2, T0, l.Y), U3.At(-W / 2, T1, l.Y), U3.At(W / 2, T1, l.Y) },
                    Uv = new[] { new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1), new Vector2(1, 1) },
                    Tris = new[] { 0, 1, 2, 1, 3, 2 },
                };
                Solid("dust " + l.Order, md.ToMesh("dust"), m, false, false);
            }
        }

        // ---------------------------------------------------------------- the service channel

        /// <summary>
        /// Water and power under covers along the streets (each piece shows once a plot beside it is open), and a box
        /// with a light at the kerb of every building.
        /// </summary>
        void Channel(float[][] runs)
        {
            var batches = new Dictionary<int, Batch>();
            foreach (var q in runs)
            {
                float x1 = q[0], z1 = q[1], x2 = q[2], z2 = q[3], L = Mathf.Sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1));
                int pieces = Mathf.Max(1, Mathf.RoundToInt(L / 16));
                for (int p = 0; p < pieces; p++)
                {
                    float f0 = p / (float)pieces, f1 = (p + 1) / (float)pieces;
                    float ax = x1 + (x2 - x1) * f0, az = z1 + (z2 - z1) * f0, bx = x1 + (x2 - x1) * f1, bz = z1 + (z2 - z1) * f1;
                    int z = ZoneNear((ax + bx) / 2, (az + bz) / 2);
                    if (z > 2) continue;
                    if (!batches.TryGetValue(z, out var b)) batches[z] = b = new Batch();
                    Run(b, ax, az, bx, bz, false);
                }
            }
            foreach (var kv in batches) channel[kv.Key] = kv.Value.Build(transform, "channel " + kv.Key);
        }

        /// <summary>The lowest zone of the blocks beside a point of a street (three.js x, z).</summary>
        int ZoneNear(float x, float z)
        {
            int best = 99;
            foreach (var b in blocks)
                if (b.Zone >= 0 && Mathf.Max(Mathf.Abs(x - b.Cx), Mathf.Abs(z - b.Cz)) <= 10.5f) best = Mathf.Min(best, b.Zone);
            return best;
        }

        static void Run(Batch b, float x1, float z1, float x2, float z2, bool flush)
        {
            var baseM = Look.Lit(Look.Hex(0x6b4a36), 0.1f); var cover = Look.Lit(Look.Hex(0xf7e6cc), 0.1f);
            bool alongX = Mathf.Abs(x2 - x1) > Mathf.Abs(z2 - z1);
            float L = Mathf.Sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1)), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
            var turn = Quaternion.Euler(0, alongX ? 0 : 90, 0);
            b.Add(Shapes.RoundedBox(L + 0.5f, 0.08f, 0.5f, 0.03f), Matrix4x4.TRS(U3.V(mx, (flush ? 0.09f : 0.11f) - Road, mz), turn, Vector3.one), baseM);
            int n = Mathf.Max(1, Mathf.RoundToInt(L / 2));
            for (int i = 0; i < n; i++)
            {
                float f = (i + 0.5f) / n;
                b.Add(Shapes.RoundedBox(L / n - 0.1f, 0.08f, 0.52f, 0.03f), Matrix4x4.TRS(U3.V(x1 + (x2 - x1) * f, (flush ? 0.12f : 0.16f) - Road, z1 + (z2 - z1) * f), turn, Vector3.one), cover);
            }
        }

        static (float x, float z, float d) Near(float[][] runs, float x, float z)
        {
            (float, float, float) best = (x, z, 1e9f);
            foreach (var q in runs)
            {
                float dx = q[2] - q[0], dz = q[3] - q[1], f = Mathf.Clamp01(((x - q[0]) * dx + (z - q[1]) * dz) / (dx * dx + dz * dz));
                float px = q[0] + dx * f, pz = q[1] + dz * f, d = Mathf.Sqrt((px - x) * (px - x) + (pz - z) * (pz - z));
                if (d < best.Item3) best = (px, pz, d);
            }
            return best;
        }

        void Kerb(string id, float cx, float cz, float half, float[][] runs)
        {
            var (px, pz, _) = Near(runs, cx, cz);
            // the side of the plot that looks at the channel, and the box on its kerb
            float dx = px - cx, dz = pz - cz;
            bool sideX = Mathf.Abs(dx) > Mathf.Abs(dz);
            float kx = sideX ? cx + Mathf.Sign(dx) * half : Mathf.Clamp(px, cx - half + 1.2f, cx + half - 1.2f);
            float kz = sideX ? Mathf.Clamp(pz, cz - half + 1.2f, cz + half - 1.2f) : cz + Mathf.Sign(dz) * half;
            var (nx, nz, far) = Near(runs, kx, kz);
            // the plots of chapters 3 and 4 up the Green Belt are far from the channel of the colony: no box there (proposal)
            if (far > 14) return;
            var b = new Batch();
            if (Mathf.Sqrt((nx - kx) * (nx - kx) + (nz - kz) * (nz - kz)) > 0.7f) Run(b, nx, nz, kx, kz, true);   // across the street, flush with it
            var at = Matrix4x4.TRS(U3.V(kx, id == "ark" ? Road : 0.1f, kz), Quaternion.Euler(0, sideX ? 90 : 0, 0), Vector3.one);
            b.Add(Shapes.RoundedBox(0.9f, 0.7f, 0.6f, 0.12f), at * Matrix4x4.Translate(new Vector3(0, 0.35f, 0)), Look.Lit(Look.Cream, 0.15f));
            b.Add(Shapes.RoundedBox(0.94f, 0.1f, 0.64f, 0.04f), at * Matrix4x4.Translate(new Vector3(0, 0.5f, 0)), Look.Lit(Look.Hex(0xff8b3d), 0.15f));
            b.Add(Shapes.Sphere, at * Matrix4x4.TRS(new Vector3(0, 0.76f, 0), Quaternion.identity, Vector3.one * 0.22f), glow);
            Kerbs[id] = b.Build(transform, "kerb " + id);
        }

        // ---------------------------------------------------------------- the edge of the closed zone

        /// <summary>
        /// Stakes with flags on the streets that border a closed plot (the plots of zone I while it waits, the back of
        /// the canyon up to zone II), and the sign at the head of the street that runs up into the closed back.
        /// </summary>
        void ZoneEdge()
        {
            if (stakesGo != null) Destroy(stakesGo);
            if (signGo != null) Destroy(signGo);
            var pole = Look.Lit(Look.Navy, 0.2f); var flag = Look.Lit(Look.Hex(0xff8b3d), 0.15f);
            var b = new Batch();
            void Stake(float x, float z)
            {
                var at = Matrix4x4.TRS(U3.V(x, Road, z), Quaternion.Euler(0, -45, 0), Vector3.one);
                b.Add(Shapes.Cylinder, at * Matrix4x4.TRS(new Vector3(0, 0.95f, 0), Quaternion.identity, new Vector3(0.12f, 0.95f, 0.12f)), pole);
                b.Add(Shapes.RoundedBox(0.62f, 0.36f, 0.04f, 0.02f), at * Matrix4x4.Translate(new Vector3(-0.33f, 1.62f, 0)), flag);
                b.Add(Shapes.Sphere, at * Matrix4x4.TRS(new Vector3(0, 1.95f, 0), Quaternion.identity, Vector3.one * 0.18f), glow);
            }
            // zone III (chapters 3-4) is marked only once zone II is open, so the map of chapters 1 and 2 stays as approved
            bool Closed(Block? n) => n.HasValue && !n.Value.Built && n.Value.Zone >= 1 && n.Value.Zone > zone && (n.Value.Zone < 3 || zone >= 2);
            var now = WithZone(zone);
            foreach (var bl in now)
            {
                if (!bl.Built) continue;
                int i = (bl.S + bl.D) / 2, j = (bl.S - bl.D) / 2;
                foreach (var (di, dj) in new[] { (-1, 0), (0, -1), (1, 0), (0, 1) })
                {
                    if (!Closed(At(now, i + di, j + dj))) continue;
                    foreach (var u in new[] { -5f, 0, 5 }) Stake(bl.Cx + (di != 0 ? di * 8.7f : u), bl.Cz + (dj != 0 ? dj * 8.7f : u));
                }
            }
            stakesGo = b.Build(transform, "zone stakes");

            // the sign: at the head of the street that runs up into the closed zone, a row behind the last open one;
            // once zone III is open nothing up the canyon waits for research yet (chapter 5 is not written)
            if (zone >= 3) return;
            int reach = zone >= 2 ? 5 : 3;
            var (sx, sz) = Cm.P(13.1f, -(reach * 11.314f) - 13.2f);
            signGo = new GameObject("zone sign");
            signGo.transform.SetParent(transform, false);
            signGo.transform.localPosition = U3.V(sx, Road, sz);
            signGo.transform.localRotation = Quaternion.Euler(0, -45, 0);
            var sb = new Batch();
            sb.Add(Shapes.RoundedBox(3.2f, 1.2f, 0.14f, 0.06f), Matrix4x4.Translate(new Vector3(0, 2.0f, 0)), Look.Lit(Look.Cream, 0.15f));
            sb.Add(Shapes.RoundedBox(3.2f, 0.22f, 0.16f, 0.05f), Matrix4x4.Translate(new Vector3(0, 2.49f, 0)), flag);
            foreach (var ux in new[] { -1.2f, 1.2f }) sb.Add(Shapes.Cylinder, Matrix4x4.TRS(new Vector3(ux, 0.8f, 0), Quaternion.identity, new Vector3(0.14f, 0.8f, 0.14f)), pole);
            sb.Build(signGo.transform, "board");
            Text(signGo.transform, zone >= 2 ? "ZONE III" : "ZONE II", new Vector3(0, 2.08f, 0.09f), 0.105f, new Color32(0x3b, 0x26, 0x18, 255));
            Text(signGo.transform, "opens with research", new Vector3(0, 1.68f, 0.09f), 0.045f, new Color32(0x9a, 0x7a, 0x62, 255));
        }

        static void Text(Transform parent, string s, Vector3 at, float size, Color32 colour)
        {
            var font = Resources.Load<Font>("Fonts/Roboto-Bold");
            var g = new GameObject("text");
            g.transform.SetParent(parent, false);
            g.transform.localPosition = at;
            g.transform.localRotation = Quaternion.Euler(0, 180, 0); // a TextMesh reads from behind: turn it to face out
            var t = g.AddComponent<TextMesh>();
            t.text = s; t.anchor = TextAnchor.MiddleCenter; t.alignment = TextAlignment.Center;
            t.fontSize = 64; t.characterSize = size; t.color = colour;
            if (font != null) { t.font = font; g.GetComponent<MeshRenderer>().sharedMaterial = font.material; }
        }

        // ---------------------------------------------------------------- every frame

        /// <summary>A zone opens: its dust settles, its stones go and the ground under its plots is made flat again.</summary>
        public void SetZone(int z)
        {
            if (z == zone || pending != null) return;
            int target = z;
            pending = Task.Run(() => Bake(target));
        }

        public void Sync(float dt, float night)
        {
            time += dt;
            if (pending != null && pending.IsCompleted)
            {
                var t = pending; pending = null;
                if (t.Status == TaskStatus.RanToCompletion)
                {
                    zone = t.Result.Zone;
                    Apply(t.Result);
                    ZoneEdge();
                }
                else Debug.LogException(t.Exception);
            }
            open1 = Mathf.MoveTowards(open1, zone >= 1 ? 0 : 1, dt / 2.5f);
            open2 = Mathf.MoveTowards(open2, zone >= 2 ? 0 : 1, dt / 2.5f);
            open3 = Mathf.MoveTowards(open3, zone >= 3 ? 0 : 1, dt / 2.5f);
            foreach (var kv in channel) kv.Value.SetActive(kv.Key <= Mathf.Max(zone, 0));
            // the dust: darker at night, drifting slowly, each layer its own way
            for (int i = 0; i < dustMats.Count; i++)
            {
                var m = dustMats[i];
                var day = dustDay[i];
                m.SetColor("_Color", Color.Lerp(day, new Color(day.r * DustNight.r, day.g * DustNight.g, day.b * DustNight.b, 1), night));
                m.SetFloat("_Open1", open1);
                m.SetFloat("_Open2", open2);
                m.SetFloat("_Open3", open3);
                m.SetFloat("_Front3", Front3Row);
                m.SetVector("_Drift", new Vector4(Mathf.Sin(time * 0.07f + i * 1.3f) * 1.4f / CanyonBake.DustW, Mathf.Cos(time * 0.05f + i * 0.9f) * 1.0f / (CanyonBake.DustT1 - CanyonBake.DustT0), 0, 0));
            }
            glow.SetColor("_EmissionColor", GlowColour * Mathf.Lerp(1.2f, 2.2f, night));
        }

        /// <summary>The height of the floor under a point of the map (Unity world coordinates).</summary>
        public float GroundY(Vector3 p)
        {
            if (field == null) return 0;
            var (a, t) = Cm.AT(-p.x, p.z);
            return CanyonBake.FieldHeight(field, a, t);
        }
    }

    /// <summary>Many small parts with a few materials, merged into one mesh per material.</summary>
    public sealed class Batch
    {
        readonly Dictionary<Material, List<CombineInstance>> parts = new Dictionary<Material, List<CombineInstance>>();

        public void Add(Mesh mesh, Matrix4x4 m, Material mat)
        {
            if (!parts.TryGetValue(mat, out var l)) parts[mat] = l = new List<CombineInstance>();
            l.Add(new CombineInstance { mesh = mesh, transform = m });
        }

        public GameObject Build(Transform parent, string name)
        {
            var root = new GameObject(name);
            root.transform.SetParent(parent, false);
            foreach (var kv in parts)
            {
                var g = new GameObject(kv.Key.name);
                g.transform.SetParent(root.transform, false);
                var mesh = new Mesh { name = name, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
                mesh.CombineMeshes(kv.Value.ToArray(), true, true);
                g.AddComponent<MeshFilter>().sharedMesh = mesh;
                g.AddComponent<MeshRenderer>().sharedMaterial = kv.Key;
            }
            return root;
        }
    }

    /// <summary>The soft shapes of the mockup's props: rounded boxes, and Unity's own cylinder and sphere.</summary>
    public static class Shapes
    {
        static readonly Dictionary<string, Mesh> cache = new Dictionary<string, Mesh>();
        static Mesh cylinder, sphere;

        public static Mesh Cylinder => cylinder != null ? cylinder : cylinder = Primitive(PrimitiveType.Cylinder);
        public static Mesh Sphere => sphere != null ? sphere : sphere = Primitive(PrimitiveType.Sphere);

        static Mesh Primitive(PrimitiveType t)
        {
            var g = GameObject.CreatePrimitive(t);
            var m = g.GetComponent<MeshFilter>().sharedMesh;
            Object.Destroy(g);
            return m;
        }

        /// <summary>A box with round edges and corners (as RoundedBoxGeometry of three.js), centred on its origin.</summary>
        public static Mesh RoundedBox(float w, float h, float d, float r, int seg = 3)
        {
            r = Mathf.Min(r, w / 2.05f, h / 2.05f, d / 2.05f);
            var key = $"{w:F3}/{h:F3}/{d:F3}/{r:F3}/{seg}";
            if (cache.TryGetValue(key, out var mesh) && mesh != null) return mesh;
            var half = new Vector3(w / 2, h / 2, d / 2);
            var inner = half - Vector3.one * r;
            float[] Coords(float hf, float ir)
            {
                var c = new List<float>();
                for (int k = 0; k <= seg; k++) c.Add(-hf + (hf - ir) * k / seg);
                for (int k = 0; k <= seg; k++) c.Add(ir + (hf - ir) * k / seg);
                return c.ToArray();
            }
            float[][] axis = { Coords(half.x, inner.x), Coords(half.y, inner.y), Coords(half.z, inner.z) };
            var pos = new List<Vector3>(); var nor = new List<Vector3>(); var tris = new List<int>();
            for (int n = 0; n < 3; n++)
                foreach (var sgn in new[] { -1f, 1f })
                {
                    int ua = (n + 1) % 3, va = (n + 2) % 3;
                    var cu = axis[ua]; var cv = axis[va];
                    int b0 = pos.Count;
                    var faceN = Vector3.zero; faceN[n] = sgn;
                    for (int j = 0; j < cv.Length; j++)
                        for (int i = 0; i < cu.Length; i++)
                        {
                            var p = Vector3.zero; p[n] = sgn * half[n]; p[ua] = cu[i]; p[va] = cv[j];
                            var pi = new Vector3(Mathf.Clamp(p.x, -inner.x, inner.x), Mathf.Clamp(p.y, -inner.y, inner.y), Mathf.Clamp(p.z, -inner.z, inner.z));
                            var dir = p - pi;
                            var nn = dir.sqrMagnitude > 1e-10f ? dir.normalized : faceN;
                            pos.Add(pi + nn * r); nor.Add(nn);
                        }
                    for (int j = 0; j + 1 < cv.Length; j++)
                        for (int i = 0; i + 1 < cu.Length; i++)
                        {
                            int a = b0 + j * cu.Length + i, b = a + 1, c = a + cu.Length, e = c + 1;
                            // wound so the face looks out (Unity draws a triangle whose cross product points at the camera)
                            var cr = Vector3.Cross(pos[b] - pos[a], pos[c] - pos[a]);
                            if (Vector3.Dot(cr, faceN) >= 0) { tris.Add(a); tris.Add(b); tris.Add(c); tris.Add(b); tris.Add(e); tris.Add(c); }
                            else { tris.Add(a); tris.Add(c); tris.Add(b); tris.Add(b); tris.Add(c); tris.Add(e); }
                        }
                }
            mesh = new Mesh { name = "rounded box" };
            mesh.SetVertices(pos); mesh.SetNormals(nor); mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();
            cache[key] = mesh;
            return mesh;
        }
    }
}
