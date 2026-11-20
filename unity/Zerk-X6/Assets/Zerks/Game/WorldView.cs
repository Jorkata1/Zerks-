using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Zerks.Sim;

namespace Zerks.Game
{
    /// <summary>
    /// The canyon and everything on it: the street grid and the plots (mockup/map.html#lvl10), the dust over the
    /// zones that are still closed, the debris over the research station, the Ark, the drone, the robot, the people.
    /// </summary>
    public sealed class WorldView : MonoBehaviour
    {
        public CameraRig Rig;
        public readonly Dictionary<string, BuildingView> Views = new Dictionary<string, BuildingView>();
        public Transform ArkT;
        public Vector3 DronePad;
        public Drone DroneBot;
        public Rover Robot;
        public EchoBot Echo;
        public Figure Commander;
        /// <summary>The dock with the ship's frame, on the Ark's plot (levels.md, level 12; art/3d/buildings dock-0 … dock-4).</summary>
        public BuildingView DockV;
        /// <summary>Where the drone works when it unfolds the antenna's dish on top of the Ark (levels.md, level 18).</summary>
        BuildingView arkTop;
        GameObject arkModel;
        string arkModelName;
        float dockPrint = -1, antennaLeft;
        public readonly Dictionary<int, Figure> People = new Dictionary<int, Figure>();
        public Light Sun;
        public float NightK;
        /// <summary>For checks with pictures: 0 = always day, 1 = always night, below 0 = the clock of the game.</summary>
        [System.NonSerialized] public float ForceNight = -1;

        /// <summary>Plot the build menu asks for ("Build here"), or null.</summary>
        public string PlacingId;
        /// <summary>Where ECHO is pointing (world), or null.</summary>
        [System.NonSerialized] public Vector3? EchoPoint;

        readonly Dictionary<string, GameObject> plotPick = new Dictionary<string, GameObject>();
        readonly Dictionary<string, GameObject> plotGlow = new Dictionary<string, GameObject>();
        readonly List<(int zone, GameObject g)> zoneThings = new List<(int, GameObject)>();
        /// <summary>The canyon, the ground, the ice, the channel, the edge of the closed zone and the dust over it.</summary>
        public Canyon Land;
        readonly List<Material> nightPools = new List<Material>();
        GameObject debris, carbonDeposit, iceDeposit, podGlow, containers;
        Material podMat, carbonSpark;
        float debrisGone = -1;
        float time;
        Colony colony;
        string reprintId;
        float reprintLeft;

        // The street blocks of the map: (d, s) and their zone (0 open, 1 Zone I, 2 Zone II). Zone II, the South Slope, lies
        // at the back, up the canyon, where the approved map has the closed zone with its dust and the sign "ZONE II" (Joro,
        // 14.11.2026; the plots of stage 2): the front is the canyon's low end with the Ice Hollow. Every plot of the map
        // has a building of chapter 2 now (Content.Buildings), so no block stays empty.
        static readonly (int d, int s, int zone)[] EmptyBlocks = { };
        static readonly (int d, int s)[] ArkBlocks = { (0, -2), (-1, -1), (1, -1), (0, 0) };
        const float ArkHalf = 13.8f;
        // The service channel along the streets (three.js metres, game/src/view/layout.ts, level 10): it runs this far
        // inside the edge of the street.
        const float O = 1.35f;
        static readonly float[][] Lines =
        {
            new[] { 8 - O, -24 - O, 8 - O, 40 }, new[] { -24 - O, 8 - O, 40, 8 - O }, new[] { 24 - O, 8 - O, 24 - O, 24 },
            new[] { -24 - O, -24 - O, 8 - O, -24 - O }, new[] { -24 - O, -24 - O, -24 - O, 8 - O },
        };

        public void Build(Colony c)
        {
            colony = c;
            var env = new GameObject("environment").transform;
            env.SetParent(transform, false);

            // Light: the warm day of the mockup.
            Sun = new GameObject("sun").AddComponent<Light>();
            Sun.transform.SetParent(transform, false); // a jump or a new game rebuilds the world: no old suns left
            Sun.type = LightType.Directional;
            Sun.transform.rotation = Quaternion.Euler(52, 150, 0);
            Sun.shadows = LightShadows.Soft;
            Sun.shadowStrength = 0.55f;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;

            // The canyon round the colony (Joro, 14.11.2026): relief, layered walls, the Ice Hollow, the stones, the
            // service channel, the stakes and the sign at the edge of the closed zone and the dust over it.
            Land = Canyon.Make(transform, Blocks(), c.S.Zone, Kerbs(), Lines);
            if (Rig != null) Rig.Limits = new Rect(-75, -70, 145, 145);

            // Streets and plots.
            var road = Look.Lit(Look.Road, 0.1f);
            var pad = Look.Lit(Look.Pad, 0.1f);
            var edge = Look.Lit(Look.PadEdge, 0.1f);
            GameObject Block(int d, int s, int zone, bool plot)
            {
                var at = Look.Plot(d, s);
                var g = new GameObject($"block {d},{s}");
                g.transform.SetParent(env, false);
                g.transform.localPosition = at;
                Look.Prim(PrimitiveType.Cube, g.transform, new Vector3(0, 0.02f, 0), new Vector3(16.2f, 0.04f, 16.2f), road);
                if (plot)
                {
                    Look.Prim(PrimitiveType.Cube, g.transform, new Vector3(0, 0.06f, 0), new Vector3(12.6f, 0.08f, 12.6f), edge);
                    Look.Prim(PrimitiveType.Cube, g.transform, new Vector3(0, 0.1f, 0), new Vector3(12f, 0.1f, 12f), pad);
                }
                zoneThings.Add((zone, g));
                if (zone > c.S.Zone) g.SetActive(false);
                return g;
            }
            foreach (var def in Content.Buildings)
            {
                var g = Block(def.D, def.S, def.Zone, true);
                if (def.Dug) DugPlot(def, g, road, edge, pad);
            }
            foreach (var (d, s, z) in EmptyBlocks) Block(d, s, z, true);
            foreach (var (d, s) in ArkBlocks) Block(d, s, 0, false);

            // The Ark on its 2x2 plot, with the containers next to it; from level 18 with its dish unfolded.
            var ark = new GameObject("ark");
            ark.transform.SetParent(transform, false);
            ark.transform.localPosition = Look.ArkAt;
            ArkT = ark.transform;
            SetArk(c.S.AntennaFixed ? "ark-18" : "ark");
            var padNode = arkModel.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "drone_pad");
            DronePad = padNode != null ? padNode.position : Look.ArkAt + new Vector3(-6, 15.5f, 6);
            var arkCol = ark.AddComponent<BoxCollider>();
            arkCol.center = new Vector3(0, 14, 0); arkCol.size = new Vector3(18, 30, 18);
            podMat = Look.Glow(Look.Teal, 0);
            podGlow = Look.Decal(ark.transform, new Vector3(0, 0.3f, 0), 34, podMat, "pods");
            Look.Decal(ark.transform, new Vector3(0, 0.2f, 0), 30, Look.Glow(Look.Warm, 0.18f), "plaza");
            containers = new GameObject("containers");
            containers.transform.SetParent(transform, false);
            containers.transform.localPosition = Look.ArkAt + new Vector3(10, 0, -10);
            var cream = Look.Lit(Look.Cream); var orange = Look.Lit(Look.Orange);
            for (int i = 0; i < 3; i++)
            {
                var box = Look.Prim(PrimitiveType.Cube, containers.transform, new Vector3(i * 3.4f, 1.3f, (i % 2) * 2.4f), new Vector3(2.9f, 2.6f, 5.8f), cream);
                box.transform.rotation = Quaternion.Euler(0, 12 * i, 0);
                Look.Prim(PrimitiveType.Cube, box.transform, new Vector3(0, 0.1f, 0), new Vector3(1.02f, 0.12f, 1.02f), orange);
            }

            // The buildings, their plots and a warm pool of light under each for the night.
            foreach (var def in Content.Buildings)
            {
                Views[def.Id] = BuildingView.Make(def, transform);
                var pick = new GameObject("plot " + def.Id);
                pick.transform.SetParent(transform, false);
                pick.transform.localPosition = Look.Plot(def);
                var bc = pick.AddComponent<BoxCollider>();
                bc.center = new Vector3(0, 0.5f, 0); bc.size = new Vector3(12, 1, 12);
                pick.SetActive(false);
                plotPick[def.Id] = pick;
                var gm = Look.Glow(Look.Teal, 0);
                plotGlow[def.Id] = Look.Decal(transform, Look.Plot(def) + new Vector3(0, 0.25f, 0), 15, gm, "glow " + def.Id);
                var nm = Look.Glow(Look.Warm, 0);
                nightPools.Add(nm);
                Look.Decal(Views[def.Id].transform, new Vector3(0, 0.22f, 0), 16, nm, "night pool");
            }

            // The research station is buried under the debris of the landing (levels.md, level 1).
            debris = new GameObject("debris");
            debris.transform.SetParent(transform, false);
            debris.transform.localPosition = Look.Plot(Content.B("research"));
            var dr = new System.Random(3);
            for (int i = 0; i < 14; i++)
            {
                var s = 1.2f + (float)dr.NextDouble() * 2.6f;
                var r = Look.Prim(PrimitiveType.Sphere, debris.transform, new Vector3((float)dr.NextDouble() * 9 - 4.5f, s * 0.3f, (float)dr.NextDouble() * 9 - 4.5f),
                    new Vector3(s * 1.4f, s, s * 1.2f), Look.Lit(dr.NextDouble() < 0.5 ? Look.Rock : Look.Rock2, 0.05f));
                r.transform.rotation = Quaternion.Euler(0, (float)dr.NextDouble() * 360, 0);
            }
            var plate = Look.Prim(PrimitiveType.Cube, debris.transform, new Vector3(1, 1.6f, 0.5f), new Vector3(6, 0.25f, 3.5f), cream);
            plate.transform.rotation = Quaternion.Euler(22, 30, 14);
            Look.Prim(PrimitiveType.Cube, plate.transform, new Vector3(0, 0.6f, 0), new Vector3(1, 0.4f, 0.12f), orange);
            var dc = debris.AddComponent<BoxCollider>();
            dc.center = new Vector3(0, 2, 0); dc.size = new Vector3(12, 4, 12);

            // The carbon deposit and the ice in the shadow of the rocks (concept.md, the first 10 minutes).
            carbonDeposit = new GameObject("carbon deposit");
            carbonDeposit.transform.SetParent(transform, false);
            carbonDeposit.transform.localPosition = Look.Plot(Content.B("drill"));
            Look.Decal(carbonDeposit.transform, new Vector3(0, 0.16f, 0), 10, Look.Glow(Look.Carbon, 0.9f, false, 0.6f));
            carbonSpark = Look.Glow(Look.Teal, 0.3f);
            Look.Decal(carbonDeposit.transform, new Vector3(0, 0.18f, 0), 7, carbonSpark);
            for (int i = 0; i < 6; i++)
                Look.Prim(PrimitiveType.Sphere, carbonDeposit.transform, new Vector3(Mathf.Cos(i) * 3, 0.3f, Mathf.Sin(i * 1.7f) * 3), new Vector3(1.4f, 0.8f, 1.2f), Look.Lit(Look.Carbon, 0.6f));
            iceDeposit = new GameObject("ice");
            iceDeposit.transform.SetParent(transform, false);
            iceDeposit.transform.localPosition = Look.Plot(Content.B("pump"));
            Look.Decal(iceDeposit.transform, new Vector3(0, 0.16f, 0), 10, Look.Glow(Look.Ice, 0.9f, false, 0.7f));
            for (int i = 0; i < 7; i++)
                Look.Prim(PrimitiveType.Cube, iceDeposit.transform, new Vector3(Mathf.Cos(i * 2.1f) * 3.2f, 0.4f, Mathf.Sin(i * 1.3f) * 3.2f), new Vector3(1.2f, 0.8f, 1.0f), Look.Lit(Look.Ice, 0.7f));

            // The dock on the Ark's plot, in front of it on the crane's side: its centre is (2.32, -1.82) Blender units from
            // the Ark's origin at the Ark's 4.15 m a unit (art/3d/buildings/README.md), as on stage 2 (game/src/view/world.ts).
            var origin = arkModel.transform.GetChild(0).position;
            var dockDef = new BuildingDef { Id = "dock", Kind = "dock", Name = "Dock", Models = { [1] = "dock-0", [2] = "dock-1", [3] = "dock-2", [4] = "dock-3", [5] = "dock-4" } };
            DockV = BuildingView.Make(dockDef, transform);
            DockV.transform.position = origin + new Vector3(-2.32f * 4.15f, 0, 1.82f * 4.15f);
            var dcol = DockV.GetComponent<BoxCollider>();
            dcol.center = new Vector3(0, 2, 0); dcol.size = new Vector3(6.5f, 4, 13.5f);
            arkTop = new GameObject("ark top").AddComponent<BuildingView>();
            arkTop.transform.SetParent(transform, false);
            arkTop.transform.position = Look.ArkAt;
            arkTop.Height = 30;

            // Movers.
            DroneBot = Drone.Make(transform, DronePad);
            // The robot drives along the streets to the front corner of the colony, then on its tracks out through the
            // mouth of the canyon to the plain (Joro, 14.11.2026); it keeps to the ground of the canyon.
            var park = Look.ArkAt + new Vector3(-12, 0, 12);
            var route = new List<Vector3>(Route(park, U3.V(40, 0, 40)));
            route.Insert(0, park);
            for (int i = 1; i < CanyonShape.TRACK.Length; i++) route.Add(U3.At(CanyonShape.TRACK[i][0], CanyonShape.TRACK[i][1], 0));
            Robot = Rover.Make(transform, park, route.ToArray());
            Robot.Ground = Land.GroundY;
            Echo = EchoBot.Make(transform);
            Echo.transform.position = Look.ArkAt + new Vector3(-12, 10, 12);
            Commander = Figure.Make(transform, Zerks.Game.People.Looks.For("Commander", Profession.None), "commander");
            Commander.transform.position = Look.ArkAt + new Vector3(-10, 0, 10);
            if (c.S.Tutorial == Colony.TStep.Landing) StartLanding();
        }

        /// <summary>
        /// Every block of the grid (|d| &lt;= 3, |s| &lt;= 10, as on the mockup) with its zone: the plots of the colony and
        /// the Ark's (0), zone I (1), zone II at the back (2), the rest of the back up the canyon (3, closed for all of
        /// chapter 1), and the blocks beside and in front of the colony that are never plots (-1).
        /// </summary>
        static Block[] Blocks()
        {
            var zones = new Dictionary<(int, int), int>();
            foreach (var def in Content.Buildings) zones[(def.D, def.S)] = def.Zone;
            foreach (var (d, s, z) in EmptyBlocks) zones[(d, s)] = z;
            foreach (var (d, s) in ArkBlocks) zones[(d, s)] = 0;
            var list = new List<Block>();
            for (int i = -7; i <= 7; i++)
                for (int j = -7; j <= 7; j++)
                {
                    int d = i - j, s = i + j;
                    if (Mathf.Abs(d) > 3 || Mathf.Abs(s) > 10) continue;
                    var z = zones.TryGetValue((d, s), out var known) ? known : Mathf.Abs(d) <= 2 && s < -5 ? 3 : -1;
                    list.Add(new Block { D = d, S = s, Cx = i * Content.Pitch, Cz = j * Content.Pitch, Zone = z });
                }
            return list.ToArray();
        }

        /// <summary>
        /// A dug building's plot (the clay pit): once the pit stands, the road and the pad are laid round its opening
        /// instead of over it, and the ground is cut open there by the pit's own hole mask (HoleMask.shader).
        /// </summary>
        void DugPlot(BuildingDef def, GameObject block, Material road, Material edge, Material pad)
        {
            var tmp = new GameObject("measure");
            var m = Models.Spawn(def.ModelFor(1), def.Kind, tmp.transform, true);
            var hole = m.GetComponentsInChildren<Renderer>().Where(r => r.sharedMaterial != null && r.sharedMaterial.name.StartsWith("hole")).ToList();
            var open = hole.Count > 0 ? hole[0].bounds : new Bounds(Vector3.zero, new Vector3(8, 0, 8));
            foreach (var r in hole) open.Encapsulate(r.bounds);
            Destroy(tmp);
            var whole = new List<GameObject>();
            foreach (Transform t in block.transform) whole.Add(t.gameObject);
            var ring = new GameObject("round the pit");
            ring.transform.SetParent(block.transform, false);
            void Frame(float size, float y, float thick, Material mat)
            {
                float h = size / 2, x0 = Mathf.Max(-h, open.min.x), x1 = Mathf.Min(h, open.max.x), z0 = Mathf.Max(-h, open.min.z), z1 = Mathf.Min(h, open.max.z);
                void Piece(float a0, float a1, float b0, float b1)
                {
                    if (a1 - a0 < 0.01f || b1 - b0 < 0.01f) return;
                    Look.Prim(PrimitiveType.Cube, ring.transform, new Vector3((a0 + a1) / 2, y, (b0 + b1) / 2), new Vector3(a1 - a0, thick, b1 - b0), mat);
                }
                Piece(-h, x0, -h, h); Piece(x1, h, -h, h); Piece(x0, x1, -h, z0); Piece(x0, x1, z1, h);
            }
            Frame(16.2f, 0.02f, 0.04f, road);
            Frame(12.6f, 0.06f, 0.08f, edge);
            Frame(12f, 0.1f, 0.1f, pad);
            ring.SetActive(false);
            dugPlots[def.Id] = (whole, ring);
        }

        readonly Dictionary<string, (List<GameObject> whole, GameObject ring)> dugPlots = new Dictionary<string, (List<GameObject>, GameObject)>();

        /// <summary>The Ark's model: the dish folded, or unfolded after the antenna (art/3d/buildings ark.glb and ark-18.glb).</summary>
        public void SetArk(string model)
        {
            if (arkModelName == model && arkModel != null) return;
            if (arkModel != null) Destroy(arkModel);
            arkModel = Models.Spawn(model, "ark", ArkT);
            arkModelName = model;
            foreach (var t in arkModel.GetComponentsInChildren<Transform>(true).Where(t => t.name.StartsWith("parked_drone"))) t.gameObject.SetActive(false);
        }

        /// <summary>The dock opens on level 12: the drone prints its platform next to the Ark.</summary>
        public void PrintDock() => dockPrint = 0;

        /// <summary>The antenna's "Ready" is tapped: the drone comes for a few seconds and the dish unfolds.</summary>
        public void UnfoldAntenna()
        {
            antennaLeft = 3f;
            SetArk("ark-18");
        }

        /// <summary>The plots that get a box on the service channel: every building and the Ark (three.js metres).</summary>
        static IEnumerable<(string id, float cx, float cz, float half)> Kerbs()
        {
            yield return ("ark", -Look.ArkAt.x, Look.ArkAt.z, ArkHalf);
            foreach (var def in Content.Buildings) yield return (def.Id, def.X, def.Z, 6.3f);
        }

        // ---------------------------------------------------------------- the landing

        float landing = -1;
        public bool Landing => landing >= 0;

        void StartLanding()
        {
            landing = 0;
            ArkT.localPosition = Look.ArkAt + new Vector3(0, 90, 0);
            containers.SetActive(false);
            Commander.gameObject.SetActive(false);
            Echo.gameObject.SetActive(false);
        }

        /// <summary>The Ark lands in a cloud of dust, the Commander walks down the ramp, ECHO flies out of a container.</summary>
        void UpdateLanding(float dt)
        {
            if (landing < 0) return;
            landing += dt;
            var k = Mathf.Clamp01(landing / 4f);
            var ease = 1 - Mathf.Pow(1 - k, 3);
            ArkT.localPosition = Look.ArkAt + new Vector3(0, 90 * (1 - ease), 0);
            podMat.SetFloat("_Alpha", landing < 4.5f ? Mathf.Clamp01(landing - 3.2f) * 0.8f : 0);
            if (landing > 4.2f && !containers.activeSelf) containers.SetActive(true);
            if (landing > 4.6f && !Commander.gameObject.activeSelf)
            {
                Commander.gameObject.SetActive(true);
                Commander.transform.position = Look.ArkAt + new Vector3(-6, 0, 6);
                Commander.GoTo(new[] { Look.ArkAt + new Vector3(-13, 0, 13) });
            }
            if (landing > 6.2f && !Echo.gameObject.activeSelf)
            {
                Echo.gameObject.SetActive(true);
                Echo.transform.position = containers.transform.position + new Vector3(0, 2, 0);
            }
            if (landing > 7.5f) { landing = -1; LandingFinished = true; }
        }

        public bool LandingFinished;

        // ---------------------------------------------------------------- every frame

        public void Sync(Colony c, float dt)
        {
            colony = c;
            time += dt;
            var s = c.S;
            UpdateLanding(dt);
            NightK = ForceNight >= 0 ? ForceNight : Mathf.MoveTowards(NightK, NightTarget(c), dt * 0.5f);
            Lighting();

            foreach (var kv in Views)
            {
                var st = s.Get(kv.Key);
                var open = Content.B(kv.Key).Zone <= s.Zone;
                kv.Value.Sync(c, st, open, NightK);
            }
            // A dug plot: the road and the pad go round the opening once the pit is there.
            foreach (var kv in dugPlots)
            {
                var pit = Views[kv.Key].Visible;
                foreach (var g in kv.Value.whole) if (g.activeSelf == pit) g.SetActive(!pit);
                if (kv.Value.ring.activeSelf != pit) kv.Value.ring.SetActive(pit);
            }
            // The dock: from level 12, printed by the drone, then the frame grows stage by stage (dock-0 … dock-4).
            if (s.Ark < 12) { DockV.Hide(); DockV.GetComponent<BoxCollider>().enabled = false; }
            else
            {
                DockV.GetComponent<BoxCollider>().enabled = true;
                if (dockPrint >= 0)
                {
                    dockPrint += dt / 7f;
                    DockV.ShowPrint("dock-0", Mathf.Min(1, dockPrint));
                    if (dockPrint >= 1) dockPrint = -1;
                }
                else DockV.ShowStanding($"dock-{Mathf.Clamp(s.Frame, 0, 4)}", NightK);
            }
            if (s.AntennaFixed && !s.AntennaReady) SetArk("ark-18");
            for (int i = 0; i < nightPools.Count; i++) nightPools[i].SetFloat("_Alpha", 0.28f * NightK);

            // Zones open with their research: the dust settles, the ground under the plots is made flat, the plots show.
            foreach (var (zone, g) in zoneThings)
                if (zone > 0 && zone <= s.Zone && !g.activeSelf) g.SetActive(true);
            Land.SetZone(s.Zone);
            Land.Sync(dt, NightK);
            // a box on the channel at every building that stands (or is being printed), and always at the Ark
            foreach (var kv in Land.Kerbs)
                if (kv.Key != "ark" && Views.TryGetValue(kv.Key, out var bv) && kv.Value.activeSelf != bv.Visible) kv.Value.SetActive(bv.Visible);

            // Debris over the research station.
            if (s.DebrisCleared && debris.activeSelf)
            {
                if (debrisGone < 0) debrisGone = time;
                var k = Mathf.Clamp01((time - debrisGone) / 0.7f);
                debris.transform.localScale = Vector3.one * (1 - k);
                if (k >= 1) debris.SetActive(false);
            }
            carbonSpark.SetFloat("_Alpha", s.Has("drill") ? 0 : 0.25f + 0.2f * Mathf.Sin(time * 3));
            carbonDeposit.SetActive(!s.Has("drill") || s.Get("drill") == null);
            iceDeposit.SetActive(!s.Has("pump"));

            // The pods glow when someone can wake.
            if (!Landing) podMat.SetFloat("_Alpha", c.WhyNotWake() == "" ? 0.35f + 0.25f * Mathf.Sin(time * 4) : 0);

            // Plots: the one the build menu asked for glows, and can be tapped.
            foreach (var kv in plotGlow)
            {
                var on = PlacingId == kv.Key;
                kv.Value.GetComponent<Renderer>().sharedMaterial.SetFloat("_Alpha", on ? 0.55f + 0.3f * Mathf.Sin(time * 5) : 0);
                plotPick[kv.Key].SetActive(on);
            }

            // The drone: prints the building being built, or re-prints the one that grew; otherwise it rests.
            var printing = c.Printing;
            if (reprintLeft > 0) reprintLeft -= dt;
            if (antennaLeft > 0) antennaLeft -= dt;
            if (reprintLeft > 0 && reprintId != null) DroneBot.Drive(Views[reprintId], 1, true);
            else if (antennaLeft > 0) DroneBot.Drive(arkTop, 1, true);
            else if (dockPrint >= 0) DroneBot.Drive(DockV, dockPrint, false);
            else if (printing != null) DroneBot.Drive(Views[printing.Id], 1 - (float)(printing.BuildLeft / System.Math.Max(0.001, printing.BuildTotal)), false);
            else DroneBot.Drive(null, 0, false);

            // The robot.
            var rb = s.Robot;
            Robot.Show(rb.Unlocked, rb.Back, rb.Total > 0 ? 1 - (float)(rb.Left / rb.Total) : 0);

            // ECHO floats where it points, otherwise near the middle of the screen.
            if (!Landing && Echo.gameObject.activeSelf)
                Echo.Goal = EchoPoint.HasValue ? EchoPoint.Value + new Vector3(-3, 7, 3) : Rig.Target + new Vector3(-10, 9, 10);

            UpdatePeople(c);
        }

        float NightTarget(Colony c)
        {
            if (!c.DaysStarted) return 0;
            var cycle = (float)c.CycleMinutes; var night = (float)c.NightMinutes;
            var t = (float)c.S.DayClock;
            var dusk = cycle - night;
            var fade = cycle * 0.05f;
            if (t < fade) return 1 - t / fade;                  // dawn
            if (t < dusk - fade) return 0;                      // day
            if (t < dusk) return 1 - (dusk - t) / fade;         // dusk
            return 1;                                           // night
        }

        void Lighting()
        {
            var n = NightK;
            Rig.Cam.backgroundColor = Color.Lerp(Look.DayBg, Look.NightBg, n);
            Sun.color = Color.Lerp(Look.DaySun, Look.NightSun, n);
            Sun.intensity = Mathf.Lerp(1.6f, 0.18f, n);
            RenderSettings.ambientSkyColor = Color.Lerp(Look.DaySky * 0.9f, Look.NightSky * 0.32f, n);
            RenderSettings.ambientEquatorColor = Color.Lerp(Look.DayBounce * 0.8f, Look.NightBounce * 0.7f, n);
            RenderSettings.ambientGroundColor = Color.Lerp(Look.DayBounce * 0.5f, Look.NightBounce * 0.4f, n);
        }

        // ---------------------------------------------------------------- people

        readonly Dictionary<int, string> goingTo = new Dictionary<int, string>();

        void UpdatePeople(Colony c)
        {
            var s = c.S;
            for (int i = 0; i < s.Colonists.Count; i++)
            {
                var col = s.Colonists[i];
                if (!People.TryGetValue(col.Id, out var f))
                {
                    // the look comes from the name and the profession (looks.json, a proposal)
                    f = Figure.Make(transform, Zerks.Game.People.Looks.For(col.Name, col.Profession), col.Name);
                    f.ColonistId = col.Id;
                    f.transform.position = Look.ArkAt + new Vector3(-8, 0, 8); // out of the pod, down the ramp
                    People[col.Id] = f;
                }
                // By day at work, at night at home (levels.md: at night the people go home); from the 21st in the brick home.
                var dest = s.Night && s.Has("home") ? c.HomeOf(col) : col.Work;
                if (string.IsNullOrEmpty(dest) || !s.Has(dest)) dest = "ark";
                if (!goingTo.TryGetValue(col.Id, out var was) || was != dest)
                {
                    goingTo[col.Id] = dest;
                    f.gameObject.SetActive(true);
                    var spot = Spot(dest, i);
                    f.GoTo(Route(f.transform.position, spot));
                }
                // Inside the home at night: out of sight once there.
                var atHome = (dest == "home" || dest == "brickhome") && !f.Walking;
                f.gameObject.SetActive(!atHome);
            }
        }

        /// <summary>Where someone stands at a place: on the street in front of it.</summary>
        Vector3 Spot(string id, int i)
        {
            var c = id == "ark" ? Look.ArkAt + new Vector3(-12, 0, 12) : Look.Plot(Content.B(id));
            return c + new Vector3(((i % 3) - 1) * 1.6f, 0, 7.2f);
        }

        /// <summary>A walk along the streets (the lines between the plots), never through a building.</summary>
        public static IEnumerable<Vector3> Route(Vector3 a, Vector3 b)
        {
            float Street(float v) => Mathf.Round((v - 8) / 16f) * 16f + 8;
            var za = Street(a.z); var xb = Street(b.x); var zb = Street(b.z);
            yield return new Vector3(a.x, 0, za);
            yield return new Vector3(xb, 0, za);
            yield return new Vector3(xb, 0, zb);
            yield return new Vector3(b.x, 0, zb);
            yield return b;
        }

        public void CommanderTo(string buildingId)
        {
            if (Commander == null || !Commander.gameObject.activeSelf) return;
            Commander.GoTo(Route(Commander.transform.position, Spot(buildingId, 4) + new Vector3(2, 0, 0)));
        }

        public void Reprint(string id)
        {
            reprintId = id;
            reprintLeft = 2.6f;
        }

        // ---------------------------------------------------------------- picking

        public enum PickKind { None, Building, Ark, Debris, Robot, Echo, Commander, Colonist, Plot, Dock }

        public (PickKind kind, string id) Pick(Vector2 screen)
        {
            var ray = Rig.Cam.ScreenPointToRay(screen);
            var hits = Physics.RaycastAll(ray, 2000);
            if (hits.Length == 0) return (PickKind.None, null);
            System.Array.Sort(hits, (x, y) => x.distance.CompareTo(y.distance));
            foreach (var h in hits)
            {
                var t = h.collider.transform;
                if (t.name.StartsWith("plot ")) return (PickKind.Plot, t.name.Substring(5));
                if (t == debris.transform) return (PickKind.Debris, "research");
                if (t == Robot.transform) return (PickKind.Robot, null);
                if (t == Echo.transform) return (PickKind.Echo, null);
                if (t == Commander.transform) return (PickKind.Commander, null);
                var fig = t.GetComponent<Figure>();
                if (fig != null) return (PickKind.Colonist, fig.ColonistId.ToString());
                if (t == ArkT) return (PickKind.Ark, "ark");
                if (t == DockV.transform && colony.S.Ark >= 12) return (PickKind.Dock, "dock");
                var bv = t.GetComponent<BuildingView>();
                if (bv != null && bv.Visible) return (PickKind.Building, bv.Id);
            }
            return (PickKind.None, null);
        }

        public Vector3 WorldOf(string id) => id == "ark" ? Look.ArkAt + Vector3.up * 30 : id == "dock" ? DockV.Top : Views.TryGetValue(id, out var v) ? v.Top : Look.ArkAt;
        public Vector3 PlotOf(string id) => Look.Plot(Content.B(id));
    }
}
