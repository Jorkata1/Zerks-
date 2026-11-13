using System.Collections.Generic;
using UnityEngine;

namespace Zerks.Game
{
    /// <summary>The building drone: lives on the Ark's balcony, measures with a laser, prints, re-prints, comes home.</summary>
    public sealed class Drone : MonoBehaviour
    {
        public Vector3 Home;
        Vector3 vel;
        LineRenderer laser;
        float t;

        public static Drone Make(Transform parent, Vector3 home)
        {
            var go = new GameObject("drone");
            go.transform.SetParent(parent, false);
            var d = go.AddComponent<Drone>();
            d.Home = home;
            go.transform.position = home;
            Models.Spawn("drone", "drone", go.transform);
            var lr = new GameObject("laser").AddComponent<LineRenderer>();
            lr.transform.SetParent(go.transform, false);
            lr.material = Look.Glow(Look.Teal, 1.2f, true, 0);
            lr.widthMultiplier = 0.12f;
            lr.useWorldSpace = true;
            lr.positionCount = 0;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            d.laser = lr;
            return d;
        }

        /// <summary>
        /// target = the plot being printed or re-printed (null = go home); phase 0..1 of the print;
        /// height = the printed height now (for the nozzle).
        /// </summary>
        public void Drive(BuildingView target, float phase, bool reprint)
        {
            t += Time.deltaTime;
            Vector3 goal;
            laser.positionCount = 0;
            if (target == null) goal = Home;
            else
            {
                var c = target.transform.position;
                var h = target.Height;
                if (!reprint && phase < 0.15f)
                {
                    // Measure: hover over a corner and draw the outline of the plot with the laser.
                    goal = c + new Vector3(0, h + 5, 0);
                    var k = Mathf.Clamp01(phase / 0.15f) * 4;
                    var corners = new[] { c + new Vector3(-6, 0.1f, -6), c + new Vector3(6, 0.1f, -6), c + new Vector3(6, 0.1f, 6), c + new Vector3(-6, 0.1f, 6), c + new Vector3(-6, 0.1f, -6) };
                    var whole = Mathf.Min(4, Mathf.FloorToInt(k));
                    var pts = new List<Vector3> { transform.position };
                    for (int i = 0; i <= whole; i++) pts.Add(corners[i]);
                    if (whole < 4) pts.Add(Vector3.Lerp(corners[whole], corners[whole + 1], k - whole));
                    laser.positionCount = pts.Count;
                    laser.SetPositions(pts.ToArray());
                }
                else
                {
                    // Print: circle the plot at the height of the fresh layer, like a nozzle.
                    var printed = reprint ? h : h * Mathf.InverseLerp(0.3f, 1f, phase);
                    var ang = t * (reprint ? 2.4f : 1.4f);
                    goal = c + new Vector3(Mathf.Cos(ang) * 5.5f, printed + 2.2f, Mathf.Sin(ang) * 5.5f);
                    if (phase >= 0.3f || reprint)
                    {
                        laser.positionCount = 2;
                        laser.SetPosition(0, transform.position);
                        laser.SetPosition(1, new Vector3(c.x + Mathf.Cos(ang) * 4.2f, c.y + printed, c.z + Mathf.Sin(ang) * 4.2f));
                    }
                }
            }
            transform.position = Vector3.SmoothDamp(transform.position, goal, ref vel, 0.45f, 26f);
            var flat = new Vector3(vel.x, 0, vel.z);
            if (flat.sqrMagnitude > 0.5f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(flat), 6 * Time.deltaTime);
            transform.position += Vector3.up * Mathf.Sin(t * 3) * 0.004f;
        }
    }

    /// <summary>The collector robot (Joro, 11.11.2026): drives out of the base, around the canyon, back with a load.</summary>
    public sealed class Rover : MonoBehaviour
    {
        public Vector3 Park;
        public Vector3[] Route;
        GameObject body, fullLight;
        float along;

        public static Rover Make(Transform parent, Vector3 park, Vector3[] route)
        {
            var go = new GameObject("rover");
            go.transform.SetParent(parent, false);
            var r = go.AddComponent<Rover>();
            r.Park = park; r.Route = route;
            r.body = Models.Spawn("rover", "rover", go.transform);
            r.fullLight = Look.Decal(go.transform, new Vector3(0, 0.05f, 0), 6, Look.Glow(Look.Teal, 0.6f));
            var col = go.AddComponent<SphereCollider>();
            col.radius = 3; col.center = new Vector3(0, 1, 0);
            go.transform.position = park;
            return r;
        }

        /// <summary>out = 0..1 of the trip (it is seen leaving and coming back), back = parked and full.</summary>
        public void Show(bool unlocked, bool back, float trip)
        {
            gameObject.SetActive(unlocked);
            if (!unlocked) return;
            fullLight.SetActive(back);
            GetComponent<Collider>().enabled = back;
            if (back)
            {
                transform.position = Vector3.Lerp(transform.position, Park, 4 * Time.deltaTime);
                body.SetActive(true);
                return;
            }
            // Leaving on the first 30% of the trip, coming back on the last 30%; in between it is out in the canyon.
            float s = trip < 0.3f ? trip / 0.3f : trip > 0.7f ? (1 - trip) / 0.3f : 1;
            body.SetActive(s < 0.98f);
            var p = Along(s);
            var dir = Along(Mathf.Min(1, s + 0.01f)) - p;
            if (trip > 0.7f) dir = -dir;
            transform.position = p;
            if (dir.sqrMagnitude > 1e-4f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), 8 * Time.deltaTime);
        }

        Vector3 Along(float s)
        {
            if (Route == null || Route.Length < 2) return Park;
            float total = 0;
            for (int i = 1; i < Route.Length; i++) total += Vector3.Distance(Route[i - 1], Route[i]);
            var d = s * total;
            for (int i = 1; i < Route.Length; i++)
            {
                var seg = Vector3.Distance(Route[i - 1], Route[i]);
                if (d <= seg) return Vector3.Lerp(Route[i - 1], Route[i], seg > 0 ? d / seg : 0);
                d -= seg;
            }
            return Route[Route.Length - 1];
        }
    }

    /// <summary>A person in a suit (simple shapes until Joro's models are ready, 13.11.2026), walking on the streets.</summary>
    public sealed class Figure : MonoBehaviour
    {
        readonly Queue<Vector3> path = new Queue<Vector3>();
        Transform armL, armR, legL, legR, bodyT;
        float walk, wave;
        public float Speed = 3.2f;
        public bool Walking => path.Count > 0;
        public int ColonistId;

        public static Figure Make(Transform parent, Color suit, string name, float scale = 1)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var f = go.AddComponent<Figure>();
            var root = new GameObject("body").transform;
            root.SetParent(go.transform, false);
            root.localScale = Vector3.one * 1.25f * scale;
            f.bodyT = root;
            var white = Look.Lit(Look.Cream);
            var suitM = Look.Lit(suit);
            Look.Prim(PrimitiveType.Capsule, root, new Vector3(0, 1.05f, 0), new Vector3(0.62f, 0.5f, 0.5f), suitM);
            Look.Prim(PrimitiveType.Sphere, root, new Vector3(0, 1.72f, 0), new Vector3(0.55f, 0.55f, 0.55f), white);
            Look.Prim(PrimitiveType.Sphere, root, new Vector3(0, 1.74f, 0.17f), new Vector3(0.4f, 0.3f, 0.3f), Look.Lit(Look.Visor, 0.8f));
            Look.Prim(PrimitiveType.Cube, root, new Vector3(0, 1.1f, -0.27f), new Vector3(0.36f, 0.42f, 0.16f), white); // air pack
            f.armL = Limb(root, new Vector3(-0.38f, 1.38f, 0), suitM);
            f.armR = Limb(root, new Vector3(0.38f, 1.38f, 0), suitM);
            f.legL = Limb(root, new Vector3(-0.15f, 0.62f, 0), white);
            f.legR = Limb(root, new Vector3(0.15f, 0.62f, 0), white);
            var col = go.AddComponent<CapsuleCollider>();
            col.center = new Vector3(0, 1.3f, 0); col.height = 3; col.radius = 0.9f;
            return f;
        }

        static Transform Limb(Transform root, Vector3 at, Material m)
        {
            var pivot = new GameObject("limb").transform;
            pivot.SetParent(root, false);
            pivot.localPosition = at;
            Look.Prim(PrimitiveType.Capsule, pivot, new Vector3(0, -0.3f, 0), new Vector3(0.18f, 0.3f, 0.18f), m);
            return pivot;
        }

        public void GoTo(IEnumerable<Vector3> points)
        {
            path.Clear();
            foreach (var p in points) path.Enqueue(p);
        }

        public void Wave() => wave = 2.2f;

        void Update()
        {
            if (path.Count > 0)
            {
                var target = path.Peek();
                var to = target - transform.position;
                to.y = 0;
                var step = Speed * Time.deltaTime;
                if (to.magnitude <= step) { transform.position = target; path.Dequeue(); }
                else
                {
                    transform.position += to.normalized * step;
                    transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(to), 10 * Time.deltaTime);
                }
                walk += Time.deltaTime * 9;
            }
            else walk = Mathf.MoveTowards(walk % (Mathf.PI * 2), 0, Time.deltaTime * 6);
            var sw = Mathf.Sin(walk) * 35;
            if (legL) { legL.localRotation = Quaternion.Euler(sw, 0, 0); legR.localRotation = Quaternion.Euler(-sw, 0, 0); }
            if (armL) armL.localRotation = Quaternion.Euler(-sw * 0.7f, 0, 0);
            if (wave > 0)
            {
                wave -= Time.deltaTime;
                if (armR) armR.localRotation = Quaternion.Euler(0, 0, 150 + Mathf.Sin(wave * 14) * 20);
            }
            else if (armR) armR.localRotation = Quaternion.Euler(sw * 0.7f, 0, 0);
            if (bodyT) bodyT.localPosition = new Vector3(0, Mathf.Abs(Mathf.Sin(walk)) * 0.06f, 0);
        }
    }

    /// <summary>ECHO, the little guide robot (simple shapes for now): floats where it points.</summary>
    public sealed class EchoBot : MonoBehaviour
    {
        public Vector3 Goal;
        Vector3 vel;
        Material eye;
        float t;

        public static EchoBot Make(Transform parent)
        {
            var go = new GameObject("echo");
            go.transform.SetParent(parent, false);
            var e = go.AddComponent<EchoBot>();
            var cream = Look.Lit(Look.Cream, 0.4f);
            Look.Prim(PrimitiveType.Sphere, go.transform, Vector3.zero, Vector3.one * 1.6f, cream);
            Look.Prim(PrimitiveType.Cylinder, go.transform, new Vector3(0, -0.05f, 0), new Vector3(1.75f, 0.08f, 1.75f), Look.Lit(Look.Orange));
            e.eye = Look.Emissive(Look.Teal, 2f);
            Look.Prim(PrimitiveType.Sphere, go.transform, new Vector3(0, 0.15f, 0.62f), new Vector3(0.7f, 0.42f, 0.4f), e.eye);
            Look.Prim(PrimitiveType.Cylinder, go.transform, new Vector3(0, 0.95f, 0), new Vector3(0.06f, 0.25f, 0.06f), Look.Lit(Look.Navy));
            Look.Prim(PrimitiveType.Sphere, go.transform, new Vector3(0, 1.25f, 0), Vector3.one * 0.22f, Look.Emissive(Look.Orange, 2));
            var col = go.AddComponent<SphereCollider>();
            col.radius = 1.6f;
            return e;
        }

        void Update()
        {
            t += Time.deltaTime;
            var g = Goal + new Vector3(0, Mathf.Sin(t * 2.2f) * 0.35f, 0);
            transform.position = Vector3.SmoothDamp(transform.position, g, ref vel, 0.6f, 30);
            var cam = Camera.main;
            if (cam != null)
            {
                var look = cam.transform.position - transform.position;
                look.y = 0;
                if (look.sqrMagnitude > 0.01f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(look), 4 * Time.deltaTime);
            }
        }
    }
}
