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
        public readonly Dictionary<int, Figure> People = new Dictionary<int, Figure>();
        public Light Sun;
        public float NightK;

        /// <summary>Plot the build menu asks for ("Build here"), or null.</summary>
        public string PlacingId;
        /// <summary>Where ECHO is pointing (world), or null.</summary>
        [System.NonSerialized] public Vector3? EchoPoint;

        readonly Dictionary<string, GameObject> plotPick = new Dictionary<string, GameObject>();
        readonly Dictionary<string, GameObject> plotGlow = new Dictionary<string, GameObject>();
        readonly List<(int zone, Renderer r, Material m, float a)> dust = new List<(int, Renderer, Material, float)>();
        readonly List<(int zone, GameObject g)> zoneThings = new List<(int, GameObject)>();
        readonly List<Material> nightPools = new List<Material>();
        GameObject debris, carbonDeposit, iceDeposit, podGlow, containers;
        Material podMat, carbonSpark;
        float dustOpen1 = -1, dustOpen2 = -1, debrisGone = -1;
        float time;
        Colony colony;
        string reprintId;
        float reprintLeft;

        // The street blocks of the level 10 map: (d, s) and their zone (0 open, 1 Zone I, 2 Zone II).
        static readonly (int d, int s, int zone)[] EmptyBlocks = { (-2, 4, 1), (2, 4, 1), (-1, 5, 2), (1, 5, 2), (-2, 6, 2), (0, 6, 2), (2, 6, 2) };
        static readonly (int d, int s)[] ArkBlocks = { (0, -2), (-1, -1), (1, -1), (0, 0) };

        public void Build(Colony c)
        {
            colony = c;
            var env = new GameObject("environment").transform;
            env.SetParent(transform, false);

            // Light: the warm day of the mockup.
            Sun = new GameObject("sun").AddComponent<Light>();
            Sun.type = LightType.Directional;
            Sun.transform.rotation = Quaternion.Euler(52, 150, 0);
            Sun.shadows = LightShadows.Soft;
            Sun.shadowStrength = 0.55f;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;

            // Ground and the canyon walls.
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            Destroy(ground.GetComponent<Collider>());
            ground.transform.SetParent(env, false);
            ground.transform.localScale = new Vector3(80, 1, 80);
            ground.GetComponent<Renderer>().sharedMaterial = Look.Lit(Look.Ground, 0.05f);
            var rng = new System.Random(11);
            for (int i = 0; i < 26; i++)
            {
                foreach (var side in new[] { -1, 1 })
                {
                    var at = Look.Plot(side * (4 + (int)(rng.NextDouble() * 2)) + (i % 2 == 0 ? 0 : side), -8 + i);
                    var s = 6 + (float)rng.NextDouble() * 6;
                    var rock = Look.Prim(PrimitiveType.Sphere, env, at + new Vector3((float)rng.NextDouble() * 6 - 3, s * 0.1f, (float)rng.NextDouble() * 6 - 3),
                        new Vector3(s * 1.4f, s * (0.5f + (float)rng.NextDouble() * 0.5f), s * 1.2f), Look.Lit(rng.NextDouble() < 0.5 ? Look.Rock : Look.Rock2, 0.05f));
                    rock.transform.rotation = Quaternion.Euler(0, (float)rng.NextDouble() * 360, 0);
                }
            }
            // Back wall behind the Ark and the research station.
            for (int d = -4; d <= 4; d++)
            {
                var at = Look.Plot(d, -7 - (d & 1));
                var s = 8 + (float)rng.NextDouble() * 5;
                Look.Prim(PrimitiveType.Sphere, env, at + new Vector3(0, s * 0.05f, 0), new Vector3(s * 1.6f, s * 0.7f, s * 1.3f), Look.Lit(Look.Rock2, 0.05f));
            }

            // Streets and plots.
            var road = Look.Lit(Look.Road, 0.1f);
            var pad = Look.Lit(Look.Pad, 0.1f);
            var edge = Look.Lit(Look.PadEdge, 0.1f);
            void Block(int d, int s, int zone, bool plot)
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
                if (zone > 0) { Dust(env, at, zone, 5); g.SetActive(false); }
            }
            foreach (var def in Content.Buildings) Block(def.D, def.S, def.Zone, true);
            foreach (var (d, s, z) in EmptyBlocks) Block(d, s, z, true);
            foreach (var (d, s) in ArkBlocks) Block(d, s, 0, false);
            // Dust also lies beyond the map, where the canyon goes on.
            for (int s = 7; s <= 10; s++) for (int d = -3; d <= 3; d++) if (((d + s) & 1) == 0) Dust(env, Look.Plot(d, s), 3, 2);

            // The Ark on its 2x2 plot, with the containers next to it.
            var ark = new GameObject("ark");
            ark.transform.SetParent(transform, false);
            ark.transform.localPosition = Look.ArkAt;
            var arkModel = Models.Spawn("ark", "ark", ark.transform);
            ArkT = ark.transform;
            var padNode = arkModel.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "drone_pad");
            DronePad = padNode != null ? padNode.position : Look.ArkAt + new Vector3(-6, 15.5f, 6);
            foreach (var t in arkModel.GetComponentsInChildren<Transform>(true).Where(t => t.name.StartsWith("parked_drone"))) t.gameObject.SetActive(false);
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

            // Movers.
            DroneBot = Drone.Make(transform, DronePad);
            var park = Look.ArkAt + new Vector3(-12, 0, 12);
            var route = new[] { park, Look.Plot(0, 1) + new Vector3(8, 0, 8), Look.Plot(0, 5) + new Vector3(8, 0, 8), Look.Plot(0, 9) + new Vector3(8, 0, 8), Look.Plot(2, 12) };
            Robot = Rover.Make(transform, park, route);
            Echo = EchoBot.Make(transform);
            Echo.transform.position = Look.ArkAt + new Vector3(-12, 10, 12);
            Commander = Figure.Make(transform, Look.Orange, "commander", 1.05f);
            Commander.transform.position = Look.ArkAt + new Vector3(-10, 0, 10);
            if (c.S.Tutorial == Colony.TStep.Landing) StartLanding();
        }

        void Dust(Transform parent, Vector3 at, int zone, int n)
        {
            var r = new System.Random(at.GetHashCode());
            for (int i = 0; i < n; i++)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Destroy(q.GetComponent<Collider>());
                q.name = "dust";
                q.transform.SetParent(parent, false);
                var s = 13 + (float)r.NextDouble() * 6;
                q.transform.localPosition = at + new Vector3((float)r.NextDouble() * 6 - 3, 1.2f + (float)r.NextDouble() * 2.5f, (float)r.NextDouble() * 6 - 3);
                q.transform.localScale = new Vector3(s, s * 0.62f, 1);
                q.transform.rotation = Rig != null ? Rig.transform.rotation : Quaternion.Euler(36, 135, 0);
                var a = 0.82f + (float)r.NextDouble() * 0.15f;
                var m = Look.Glow(Look.Dust, a, false, 0.55f);
                var rend = q.GetComponent<Renderer>();
                rend.sharedMaterial = m;
                rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                dust.Add((zone, rend, m, a));
            }
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
            NightK = Mathf.MoveTowards(NightK, NightTarget(c), dt * 0.5f);
            Lighting();

            foreach (var kv in Views)
            {
                var st = s.Get(kv.Key);
                var open = Content.B(kv.Key).Zone <= s.Zone;
                kv.Value.Sync(c, st, open, NightK);
            }
            for (int i = 0; i < nightPools.Count; i++) nightPools[i].SetFloat("_Alpha", 0.28f * NightK);

            // Zones open with their research: the dust settles.
            if (s.Zone >= 1 && dustOpen1 < 0) dustOpen1 = time;
            if (s.Zone >= 2 && dustOpen2 < 0) dustOpen2 = time;
            foreach (var (zone, g) in zoneThings)
                if (zone > 0 && zone <= s.Zone && !g.activeSelf) g.SetActive(true);
            foreach (var (zone, r, m, a) in dust)
            {
                var opened = zone == 1 ? dustOpen1 : zone == 2 ? dustOpen2 : -1;
                if (opened < 0) { m.SetFloat("_Alpha", a * (1 - 0.6f * NightK)); continue; }
                var k = Mathf.Clamp01((time - opened) / 2.5f);
                m.SetFloat("_Alpha", a * (1 - k));
                if (k >= 1 && r.gameObject.activeSelf) r.gameObject.SetActive(false);
            }

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
            if (reprintLeft > 0 && reprintId != null) DroneBot.Drive(Views[reprintId], 1, true);
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
            Sun.intensity = Mathf.Lerp(1.6f, 0.35f, n);
            RenderSettings.ambientSkyColor = Color.Lerp(Look.DaySky, Look.NightSky * 0.6f, n) * 0.9f;
            RenderSettings.ambientEquatorColor = Color.Lerp(Look.DayBounce, Look.NightBounce, n) * 0.8f;
            RenderSettings.ambientGroundColor = Color.Lerp(Look.DayBounce * 0.6f, Look.NightBounce * 0.5f, n);
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
                    f = Figure.Make(transform, Look.Suits[i % Look.Suits.Length], col.Name);
                    f.ColonistId = col.Id;
                    f.transform.position = Look.ArkAt + new Vector3(-8, 0, 8); // out of the pod, down the ramp
                    People[col.Id] = f;
                }
                // By day at work, at night at home (levels.md: at night the people go home).
                var dest = s.Night && s.Has("home") ? "home" : col.Work;
                if (string.IsNullOrEmpty(dest) || !s.Has(dest)) dest = "ark";
                if (!goingTo.TryGetValue(col.Id, out var was) || was != dest)
                {
                    goingTo[col.Id] = dest;
                    f.gameObject.SetActive(true);
                    var spot = Spot(dest, i);
                    f.GoTo(Route(f.transform.position, spot));
                }
                // Inside the home at night: out of sight once there.
                var atHome = dest == "home" && !f.Walking;
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

        public enum PickKind { None, Building, Ark, Debris, Robot, Echo, Commander, Colonist, Plot }

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
                var bv = t.GetComponent<BuildingView>();
                if (bv != null && bv.Visible) return (PickKind.Building, bv.Id);
            }
            return (PickKind.None, null);
        }

        public Vector3 WorldOf(string id) => id == "ark" ? Look.ArkAt + Vector3.up * 30 : Views.TryGetValue(id, out var v) ? v.Top : Look.ArkAt;
        public Vector3 PlotOf(string id) => Look.Plot(Content.B(id));
    }
}
