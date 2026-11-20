using System.Collections.Generic;
using UnityEngine;
using Zerks.Sim;

namespace Zerks.Game
{
    /// <summary>
    /// One building on its plot: hidden, printed by the drone (the plan on light layers, then the paste layer by
    /// layer: docs/build-sequence.md), standing, or waiting for the drone to re-print its new part ("Ready").
    /// </summary>
    public sealed class BuildingView : MonoBehaviour
    {
        public string Id;
        [System.NonSerialized] public BuildingDef Def;
        public float Height = 6;
        public bool Visible { get; private set; }

        GameObject model;
        string modelName;
        GameObject holo;
        Material printMat, holoMat;
        readonly List<(Renderer r, Material[] mats)> originals = new List<(Renderer, Material[])>();
        readonly List<Renderer> steam = new List<Renderer>();
        readonly List<(Material m, Color c)> glows = new List<(Material, Color)>();
        /// <summary>Rooms and windows: dark by day, warm light at night (the mockup's lvl10-night).</summary>
        readonly List<Material> rooms = new List<Material>();
        /// <summary>The opening of a dug building: drawn with the hole mask, never printed (HoleMask.shader).</summary>
        readonly List<Renderer> masks = new List<Renderer>();
        static Material holeMask;
        static readonly Color RoomLight = new Color(1f, 0.78f, 0.45f);
        bool printing;
        float pulse;

        public static BuildingView Make(BuildingDef def, Transform parent)
        {
            var go = new GameObject("b_" + def.Id);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = Look.Plot(def);
            var v = go.AddComponent<BuildingView>();
            v.Id = def.Id; v.Def = def;
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0, 3, 0);
            col.size = new Vector3(12, 6, 12);
            col.enabled = false;
            return v;
        }

        public Vector3 Top => transform.position + Vector3.up * (Height + 1.5f);

        void SetModel(string name)
        {
            if (name == modelName && model != null) return;
            if (model != null) Destroy(model);
            model = Models.Spawn(name, Family, transform, Def != null && Def.Dug);
            modelName = name;
            originals.Clear(); steam.Clear(); glows.Clear(); rooms.Clear(); masks.Clear();
            var instances = new Dictionary<Material, Material>();
            foreach (var r in model.GetComponentsInChildren<Renderer>())
            {
                if (r.sharedMaterials.Length == 1 && r.sharedMaterial != null && r.sharedMaterial.name.StartsWith("hole"))
                {
                    // the clay pit's opening: the ground of the map is not drawn over it
                    if (holeMask == null) holeMask = Resources.Load<Material>("Materials/HoleMask");
                    r.sharedMaterial = holeMask;
                    r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                    masks.Add(r);
                    continue;
                }
                // Own copies of the materials, so the night glow never changes the imported model.
                var mats = r.sharedMaterials;
                for (int i = 0; i < mats.Length; i++)
                {
                    if (mats[i] == null) continue;
                    if (!instances.TryGetValue(mats[i], out var inst)) { inst = new Material(mats[i]) { name = mats[i].name }; instances[mats[i]] = inst; }
                    mats[i] = inst;
                }
                r.sharedMaterials = mats;
                originals.Add((r, mats));
            }
            foreach (var r in model.GetComponentsInChildren<Renderer>())
            {
                if (masks.Contains(r)) continue;
                foreach (var m in r.sharedMaterials)
                {
                    if (m == null) continue;
                    if (m.name.StartsWith("steam")) steam.Add(r);
                    if ((m.name.StartsWith("room") || m.name.StartsWith("window")) && m.HasProperty("emissiveFactor") && !rooms.Contains(m)) rooms.Add(m);
                    if (m.HasProperty("emissiveFactor"))
                    {
                        var e = m.GetColor("emissiveFactor");
                        if (e.maxColorComponent > 0.01f) glows.Add((m, e));
                    }
                }
            }
            var b = Models.Encapsulate(model);
            Height = Mathf.Max(2, b.max.y - transform.position.y);
            if (holo != null) { Destroy(holo); holo = null; }
            printing = false;
        }

        /// <summary>The scale is shared by a kind: the second greenhouse has the first one's.</summary>
        string Family => Def != null ? Def.Kind : Id;

        /// <summary>Where the opening of a dug building is, in world space (or null).</summary>
        public Bounds? Opening
        {
            get
            {
                if (masks.Count == 0) return null;
                var b = masks[0].bounds;
                foreach (var r in masks) b.Encapsulate(r.bounds);
                return b;
            }
        }

        /// <summary>Called every frame with the building's state (null = not on the map).</summary>
        public void Sync(Colony c, BuildingState st, bool open, float night)
        {
            var col = GetComponent<BoxCollider>();
            if (st == null || (!st.Built && st.BuildTotal <= 0))
            {
                if (model != null) model.SetActive(false);
                if (holo != null) holo.SetActive(false);
                Visible = false;
                col.enabled = false;
                return;
            }
            Visible = true;
            col.enabled = open;
            if (!st.Built)
            {
                ShowPrint(Def.ModelFor(1), 1 - (float)(st.BuildLeft / System.Math.Max(0.001, st.BuildTotal)));
                return;
            }
            ShowStanding(Def.ModelFor(st.ShownLevel), night);
            // The furnace and the smelter smoke until their filters (levels.md, levels 6 and 11).
            var smoke = (Id == "furnace" && !c.IsDone("furnace_filter")) || (Id == "smelter" && !c.IsDone("smelter_filter"));
            foreach (var r in steam) if (r != null) r.enabled = smoke;
            // A soft breath while it is being upgraded (the work over the building is drawn by the screen).
            if (st.Upgrading)
            {
                pulse += Time.deltaTime * 6;
                model.transform.localScale = Vector3.one * (1 + 0.012f * Mathf.Sin(pulse));
            }
            else model.transform.localScale = Vector3.one;
        }

        /// <summary>Printing: 0-15% the drone measures with the laser, 15-30% the plan on light layers, then the print.</summary>
        public void ShowPrint(string modelName, float p)
        {
            Visible = true;
            SetModel(modelName);
            model.SetActive(true);
            EnsurePrint();
            var baseY = transform.position.y;
            var planTop = baseY + Height * Mathf.InverseLerp(0.15f, 0.3f, p);
            holo.SetActive(p >= 0.15f);
            holoMat.SetFloat("_Top", planTop);
            holoMat.SetFloat("_Alpha", p < 0.3f ? 0.55f : 0.18f);
            printMat.SetFloat("_Height", p < 0.3f ? baseY - 1 : baseY + Height * 1.05f * Mathf.InverseLerp(0.3f, 1f, p));
        }

        /// <summary>The building as it stands, its windows lit at night.</summary>
        public void ShowStanding(string modelName, float night)
        {
            Visible = true;
            if (printing) EndPrint();
            SetModel(modelName);
            model.SetActive(true);
            // Windows and lamps glow brighter at night.
            foreach (var (m, e) in glows) if (m != null) m.SetColor("emissiveFactor", e * (1 + 1.6f * night));
            foreach (var m in rooms)
            {
                if (m == null) continue;
                if (night > 0.02f) m.EnableKeyword("_EMISSIVE"); else m.DisableKeyword("_EMISSIVE");
                m.SetColor("emissiveFactor", RoomLight * (0.9f * night));
            }
        }

        public void Hide()
        {
            if (model != null) model.SetActive(false);
            if (holo != null) holo.SetActive(false);
            Visible = false;
        }

        void EnsurePrint()
        {
            if (printing) return;
            printing = true;
            printMat = Look.Print();
            foreach (var (r, mats) in originals)
            {
                if (r == null) continue;
                var arr = new Material[mats.Length];
                for (int i = 0; i < arr.Length; i++) arr[i] = printMat;
                r.sharedMaterials = arr;
            }
            holo = Instantiate(model, transform);
            holo.name = "plan";
            holoMat = Look.Hologram();
            foreach (var r in holo.GetComponentsInChildren<Renderer>())
            {
                if (r.sharedMaterial == holeMask && holeMask != null) { r.enabled = false; continue; }
                var arr = new Material[r.sharedMaterials.Length];
                for (int i = 0; i < arr.Length; i++) arr[i] = holoMat;
                r.sharedMaterials = arr;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            holo.transform.localPosition = model.transform.localPosition;
            holo.transform.localScale = model.transform.localScale * 1.01f;
        }

        void EndPrint()
        {
            printing = false;
            foreach (var (r, mats) in originals) if (r != null) r.sharedMaterials = mats;
            if (holo != null) { Destroy(holo); holo = null; }
        }
    }
}
