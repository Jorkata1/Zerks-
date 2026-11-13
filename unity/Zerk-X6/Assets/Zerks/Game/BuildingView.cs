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
            model = Models.Spawn(name, Family(Id), transform);
            modelName = name;
            originals.Clear(); steam.Clear(); glows.Clear();
            var instances = new Dictionary<Material, Material>();
            foreach (var r in model.GetComponentsInChildren<Renderer>())
            {
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
                foreach (var m in r.sharedMaterials)
                {
                    if (m == null) continue;
                    if (m.name.StartsWith("steam")) steam.Add(r);
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

        static string Family(string id) => id;

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
                // Printing: 0-15% the drone measures with the laser, 15-30% the plan on light layers, then the print.
                SetModel(Def.ModelFor(1));
                model.SetActive(true);
                var p = 1 - (float)(st.BuildLeft / System.Math.Max(0.001, st.BuildTotal));
                EnsurePrint();
                var baseY = transform.position.y;
                var planTop = baseY + Height * Mathf.InverseLerp(0.15f, 0.3f, p);
                holo.SetActive(p >= 0.15f);
                holoMat.SetFloat("_Top", planTop);
                holoMat.SetFloat("_Alpha", p < 0.3f ? 0.55f : 0.18f);
                printMat.SetFloat("_Height", p < 0.3f ? baseY - 1 : baseY + Height * 1.05f * Mathf.InverseLerp(0.3f, 1f, p));
                return;
            }
            if (printing) EndPrint();
            SetModel(Def.ModelFor(st.ShownLevel));
            model.SetActive(true);
            // The furnace smokes until its filter (levels.md, level 6).
            var smoke = Id == "furnace" && !c.IsDone("furnace_filter");
            foreach (var r in steam) if (r != null) r.enabled = smoke;
            // Windows and lamps glow brighter at night.
            foreach (var (m, e) in glows) if (m != null) m.SetColor("emissiveFactor", e * (1 + 1.6f * night));
            // A soft breath while it is being upgraded (the work over the building is drawn by the screen).
            if (st.Upgrading)
            {
                pulse += Time.deltaTime * 6;
                model.transform.localScale = Vector3.one * (1 + 0.012f * Mathf.Sin(pulse));
            }
            else model.transform.localScale = Vector3.one;
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
