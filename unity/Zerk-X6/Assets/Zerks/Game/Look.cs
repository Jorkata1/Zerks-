using System.Collections.Generic;
using UnityEngine;
using Zerks.Sim;

namespace Zerks.Game
{
    /// <summary>Colours of the approved map (game/src/view/props.ts, daynight.ts) and the materials made from them.</summary>
    public static class Look
    {
        public static Color Hex(uint rgb, float a = 1) =>
            new Color(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f, a);

        public static readonly Color Ground = Hex(0xee9f66);
        public static readonly Color GroundDark = Hex(0xe28c58);
        public static readonly Color Road = Hex(0xf6c590);
        public static readonly Color Pad = Hex(0xfff4e4);
        public static readonly Color PadEdge = Hex(0xe8b285);
        public static readonly Color Rock = Hex(0xcf7a52);
        public static readonly Color Rock2 = Hex(0xb9643f);
        public static readonly Color Cream = Hex(0xfbf3e6);
        public static readonly Color Orange = Hex(0xff7a2e);
        public static readonly Color Navy = Hex(0x2f3346);
        public static readonly Color Teal = Hex(0x5fe3d0);
        public static readonly Color Warm = Hex(0xffd58a);
        public static readonly Color Ice = Hex(0xcfeeff);
        public static readonly Color Carbon = Hex(0x2e2c33);
        public static readonly Color Dust = Hex(0xfde6d2);
        public static readonly Color Visor = Hex(0x3a6db5);
        public static readonly Color[] Suits = { Hex(0x6fb7ff), Hex(0x9a7cff), Hex(0x33c5a2), Hex(0xff8b3d), Hex(0xff5d8a), Hex(0xffc65c) };

        // Day and night (daynight.ts)
        public static readonly Color DayBg = Hex(0xee9f66), NightBg = Hex(0x1d2442);
        public static readonly Color DaySky = Hex(0xfff1e0), NightSky = Hex(0x7d8cc4);
        public static readonly Color DayBounce = Hex(0xe7925f), NightBounce = Hex(0x2a2f4a);
        public static readonly Color DaySun = Hex(0xfff0dc), NightSun = Hex(0xa8b8ff);

        static readonly Dictionary<string, Material> cache = new Dictionary<string, Material>();
        static Material Base(string name) => Resources.Load<Material>("Materials/" + name);

        /// <summary>A lit material of one colour (shared).</summary>
        public static Material Lit(Color c, float smooth = 0.15f)
        {
            var key = $"lit{c}{smooth}";
            if (cache.TryGetValue(key, out var m) && m != null) return m;
            m = new Material(Base("Lit"));
            m.SetColor("_BaseColor", c);
            m.SetFloat("_Smoothness", smooth);
            cache[key] = m;
            return m;
        }

        public static Material Emissive(Color c, float k = 1.5f)
        {
            var key = $"em{c}{k}";
            if (cache.TryGetValue(key, out var m) && m != null) return m;
            m = new Material(Base("Lit"));
            m.SetColor("_BaseColor", c);
            m.EnableKeyword("_EMISSION");
            m.SetColor("_EmissionColor", c * k);
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            cache[key] = m;
            return m;
        }

        /// <summary>A soft glow (lamp pool, laser, dust). New instance: the caller animates it.</summary>
        public static Material Glow(Color c, float alpha, bool additive = true, float soft = 1)
        {
            var m = new Material(Base("Glow"));
            m.SetColor("_Color", c);
            m.SetFloat("_Alpha", alpha);
            m.SetFloat("_Additive", additive ? 1 : 0);
            m.SetFloat("_Soft", soft);
            return m;
        }

        public static Material Print() => new Material(Base("Print"));
        public static Material Hologram() => new Material(Base("Hologram"));
        public static Material Unlit(Color c)
        {
            var m = new Material(Base("Unlit"));
            m.SetColor("_BaseColor", c);
            return m;
        }

        /// <summary>A world position on the street grid (three.js x mirrored, as glTFast mirrors the models).</summary>
        public static Vector3 Plot(BuildingDef d) => new Vector3(-d.X, 0, d.Z);
        public static Vector3 Plot(int dd, int ss) => new Vector3(-(ss + dd) / 2f * Content.Pitch, 0, (ss - dd) / 2f * Content.Pitch);
        public static readonly Vector3 ArkAt = new Vector3(8, 0, -8);

        public static GameObject Prim(PrimitiveType t, Transform parent, Vector3 pos, Vector3 scale, Material m, bool collider = false)
        {
            var g = GameObject.CreatePrimitive(t);
            if (!collider) Object.Destroy(g.GetComponent<Collider>());
            g.transform.SetParent(parent, false);
            g.transform.localPosition = pos;
            g.transform.localScale = scale;
            g.GetComponent<Renderer>().sharedMaterial = m;
            return g;
        }

        /// <summary>A flat quad lying on the ground (for pools and pads), facing up.</summary>
        public static GameObject Decal(Transform parent, Vector3 pos, float size, Material m, string name = "decal")
        {
            var g = GameObject.CreatePrimitive(PrimitiveType.Quad);
            g.name = name;
            Object.Destroy(g.GetComponent<Collider>());
            g.transform.SetParent(parent, false);
            g.transform.localPosition = pos;
            g.transform.localRotation = Quaternion.Euler(90, 0, 0);
            g.transform.localScale = new Vector3(size, size, 1);
            var r = g.GetComponent<Renderer>();
            r.sharedMaterial = m;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            return g;
        }
    }
}
