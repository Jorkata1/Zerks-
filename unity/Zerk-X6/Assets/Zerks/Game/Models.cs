using System.Collections.Generic;
using UnityEngine;

namespace Zerks.Game
{
    /// <summary>
    /// The GLB models of art/3d/buildings (imported by glTFast from Resources/Models) and the sizes the approved
    /// map uses (game/src/view/world.ts): each building fits its plot, the Ark and the home keep a fixed scale.
    /// </summary>
    public static class Models
    {
        /// <summary>Footprint in metres a building's model fits into (the mockup's "fit").</summary>
        static readonly Dictionary<string, float> Fit = new Dictionary<string, float>
        {
            ["drill"] = 9.6f, ["pump"] = 8.2f, ["processor"] = 7.6f, ["veglab"] = 9.6f, ["kitchen"] = 10.2f,
            ["mine"] = 10f, ["furnace"] = 8.8f, ["warehouse"] = 10f, ["greenhouse"] = 10.4f, ["geolocator"] = 9.4f,
            ["solar"] = 11f, ["batteries"] = 6f, ["rover"] = 2.8f,
        };

        /// <summary>Fixed scales (the mockup's "atScale") for the buildings that grow with their level.</summary>
        static readonly Dictionary<string, float> Fixed = new Dictionary<string, float>
        {
            ["research"] = 4.3f, ["home"] = 4.3f, ["ark"] = 4.15f, ["drone"] = 1.1f * 4.15f,
        };

        /// <summary>The model whose size sets the scale of a family (drill-1, drill-10, drill-20 share drill's).</summary>
        static readonly Dictionary<string, string> Reference = new Dictionary<string, string>
        {
            ["mine"] = "mine", ["home"] = "home-10", ["research"] = "research-1",
        };

        static readonly Dictionary<string, float> scaleCache = new Dictionary<string, float>();

        public static GameObject Prefab(string model) => Resources.Load<GameObject>("Models/" + model);

        /// <summary>Bounds of a prefab's renderers at scale 1, in its own space.</summary>
        public static Bounds LocalBounds(GameObject prefab)
        {
            var go = Object.Instantiate(prefab);
            go.transform.position = Vector3.zero;
            go.transform.rotation = Quaternion.identity;
            go.transform.localScale = Vector3.one;
            var b = Encapsulate(go);
            Object.DestroyImmediate(go);
            return b;
        }

        public static Bounds Encapsulate(GameObject go)
        {
            var rs = go.GetComponentsInChildren<Renderer>();
            if (rs.Length == 0) return new Bounds(go.transform.position, Vector3.one);
            var b = rs[0].bounds;
            foreach (var r in rs) b.Encapsulate(r.bounds);
            return b;
        }

        /// <summary>The scale for a building family.</summary>
        public static float ScaleFor(string family)
        {
            if (scaleCache.TryGetValue(family, out var s)) return s;
            if (Fixed.TryGetValue(family, out var k)) s = k;
            else
            {
                var refName = Reference.TryGetValue(family, out var r) ? r : family;
                var p = Prefab(refName);
                if (p == null) { scaleCache[family] = 1; return 1; }
                var b = LocalBounds(p);
                var size = Fit.TryGetValue(family, out var f) ? f : 9.6f;
                s = size / Mathf.Max(0.01f, Mathf.Max(b.size.x, b.size.z));
            }
            scaleCache[family] = s;
            return s;
        }

        /// <summary>A copy of a model, standing on y = 0 and centred on its parent, at its family's scale.</summary>
        public static GameObject Spawn(string model, string family, Transform parent)
        {
            var prefab = Prefab(model);
            var holder = new GameObject(model);
            holder.transform.SetParent(parent, false);
            if (prefab == null)
            {
                var box = GameObject.CreatePrimitive(PrimitiveType.Cube);
                box.transform.SetParent(holder.transform, false);
                box.transform.localScale = new Vector3(6, 4, 6);
                box.transform.localPosition = new Vector3(0, 2, 0);
                Debug.LogWarning($"[Zerks] Model {model} is missing: Zerks > Sync from repo");
                return holder;
            }
            var scale = ScaleFor(family);
            var b = LocalBounds(prefab);
            var inst = Object.Instantiate(prefab, holder.transform, false);
            inst.transform.localScale = Vector3.one * scale;
            inst.transform.localPosition = new Vector3(-b.center.x * scale, -b.min.y * scale, -b.center.z * scale);
            foreach (var r in inst.GetComponentsInChildren<Renderer>())
            {
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
                r.receiveShadows = true;
            }
            return holder;
        }
    }
}
