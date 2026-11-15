using System.Collections.Generic;
using UnityEngine;
using Zerks.Sim;

namespace Zerks.Game
{
    /// <summary>
    /// The people and ECHO (Joro, 14.11.2026: "A and ECHO 2"; art/3d/characters). One model for the Commander and
    /// every colonist: the materials accent, skin and hair take the person's colours (looks.json, a proposal), one
    /// hair style is shown, the beard if he has one, and the stripe and the aerial only on the Commander.
    /// The people are 1.4 times their real 1.7 m and ECHO 2.4 times its real half metre, as on the mockup, so they
    /// can be seen and tapped on the map (a proposal).
    /// </summary>
    public static class People
    {
        public const float PersonScale = 1.4f;
        public const float EchoScale = 2.4f;

        static Looks looks;
        public static Looks Looks
        {
            get
            {
                if (looks != null) return looks;
                var t = Resources.Load<TextAsset>("Models/looks");
                looks = Looks.Parse(t != null ? t.text : null);
                if (t == null) Debug.LogWarning("[Zerks] looks.json is missing: Zerks > Sync from repo");
                return looks;
            }
        }

        static readonly string[] Optional = { "hair_short", "hair_bun", "hair_full", "beard", "stripe", "aerial" };
        static readonly Dictionary<string, Material> tints = new Dictionary<string, Material>();

        public static bool HasModels => Models.Prefab("colonist") != null && Models.Prefab("echo") != null;

        /// <summary>A person on its own holder (the holder stands on the ground and looks along +z), or null.</summary>
        public static GameObject Person(Transform parent, PersonLook look)
        {
            if (Models.Prefab("colonist") == null) return null;
            var holder = Models.Spawn("colonist", "colonist", parent);
            var commander = look.Profession == "commander";
            var show = new HashSet<string> { "hair_" + look.Style };
            if (look.Beard) show.Add("beard");
            if (commander) { show.Add("stripe"); show.Add("aerial"); }
            foreach (var t in holder.GetComponentsInChildren<Transform>(true))
                if (System.Array.IndexOf(Optional, t.name) >= 0) t.gameObject.SetActive(show.Contains(t.name));
            var colour = new Dictionary<string, string>
            {
                ["accent"] = Looks.Accent.TryGetValue(look.Profession, out var a) ? a : null,
                ["skin"] = look.Skin,
                ["hair"] = look.Hair,
            };
            foreach (var r in holder.GetComponentsInChildren<Renderer>(true))
            {
                var mats = r.sharedMaterials;
                var changed = false;
                for (int i = 0; i < mats.Length; i++)
                {
                    var m = mats[i];
                    if (m == null || !colour.TryGetValue(m.name, out var hex) || hex == null) continue;
                    mats[i] = Tint(m, hex);
                    changed = true;
                }
                if (changed) r.sharedMaterials = mats;
            }
            Quiet(holder);
            return holder;
        }

        /// <summary>ECHO: the Ark's computer in a small flying body with two fans; the holder's origin is its feet.</summary>
        public static GameObject Echo(Transform parent)
        {
            if (Models.Prefab("echo") == null) return null;
            var holder = Models.Spawn("echo", "echo", parent);
            Quiet(holder);
            return holder;
        }

        public static Transform Find(GameObject root, string name)
        {
            foreach (var t in root.GetComponentsInChildren<Transform>(true)) if (t.name == name) return t;
            return null;
        }

        static Material Tint(Material m, string hex)
        {
            var key = m.name + hex;
            if (tints.TryGetValue(key, out var t) && t != null) return t;
            t = new Material(m) { name = m.name };
            if (ColorUtility.TryParseHtmlString(hex, out var c))
            {
                if (t.HasProperty("baseColorFactor")) t.SetColor("baseColorFactor", c);
                if (t.HasProperty("_BaseColor")) t.SetColor("_BaseColor", c);
            }
            tints[key] = t;
            return t;
        }

        /// <summary>The helmet glass neither throws a shadow on the face nor takes one (art/3d/characters: check in URP).</summary>
        static void Quiet(GameObject holder)
        {
            foreach (var r in holder.GetComponentsInChildren<Renderer>(true))
            {
                var glass = false;
                foreach (var m in r.sharedMaterials) if (m != null && m.renderQueue >= 3000) glass = true;
                if (!glass) continue;
                // the glass is one of the body's materials: the body keeps its shadow, the glass is drawn without one
                var mats = r.sharedMaterials;
                for (int i = 0; i < mats.Length; i++)
                {
                    if (mats[i] == null || mats[i].renderQueue < 3000) continue;
                    var key = mats[i].name + "#noshadow";
                    if (!tints.TryGetValue(key, out var g) || g == null)
                    {
                        g = new Material(mats[i]) { name = mats[i].name };
                        g.SetShaderPassEnabled("ShadowCaster", false);
                        tints[key] = g;
                    }
                    mats[i] = g;
                }
                r.sharedMaterials = mats;
            }
        }
    }
}
