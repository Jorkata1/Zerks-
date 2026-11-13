using System.Collections.Generic;
using UnityEngine;

namespace Zerks.Game
{
    /// <summary>
    /// Pictures of the buildings for the menu "Build": the model in colour, or a black silhouette for the locked ones
    /// (Salamen, 13.11.2026: padlock, black silhouette, the level under it, without the name).
    /// </summary>
    public static class Thumbs
    {
        const int Layer = 31;
        static readonly Dictionary<string, RenderTexture> cache = new Dictionary<string, RenderTexture>();

        public static RenderTexture Get(string id, string model, bool silhouette)
        {
            var key = id + (silhouette ? "#s" : "");
            if (cache.TryGetValue(key, out var rt) && rt != null) return rt;
            rt = new RenderTexture(160, 160, 16, RenderTextureFormat.ARGB32) { name = key };
            rt.Create();
            var root = new GameObject("thumb");
            root.transform.position = new Vector3(0, -500, 0);
            var m = Models.Spawn(model, id, root.transform);
            var black = silhouette ? Look.Unlit(new Color(0.09f, 0.09f, 0.12f)) : null;
            foreach (var t in root.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = Layer;
            foreach (var r in root.GetComponentsInChildren<Renderer>(true))
            {
                if (silhouette)
                {
                    var arr = new Material[r.sharedMaterials.Length];
                    for (int i = 0; i < arr.Length; i++) arr[i] = black;
                    r.sharedMaterials = arr;
                }
            }
            var b = Models.Encapsulate(m);
            var camGo = new GameObject("thumb cam");
            var cam = camGo.AddComponent<Camera>();
            cam.cullingMask = 1 << Layer;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0, 0, 0, 0);
            cam.orthographic = true;
            var size = Mathf.Max(b.size.x, b.size.y, b.size.z);
            cam.orthographicSize = size * 0.62f;
            var dir = new Vector3(-0.57f, 0.55f, 0.6f).normalized;
            cam.transform.position = b.center + dir * size * 4;
            cam.transform.LookAt(b.center);
            cam.nearClipPlane = 0.1f; cam.farClipPlane = size * 10;
            cam.targetTexture = rt;
            var light = new GameObject("thumb light").AddComponent<Light>();
            light.type = LightType.Directional;
            light.cullingMask = 1 << Layer;
            light.transform.rotation = Quaternion.Euler(45, 140, 0);
            light.intensity = 1.2f;
            var req = new UnityEngine.Rendering.RenderPipeline.StandardRequest { destination = rt };
            if (UnityEngine.Rendering.RenderPipeline.SupportsRenderRequest(cam, req))
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(cam, req);
            else cam.Render();
            cam.targetTexture = null;
            Object.Destroy(camGo); Object.Destroy(light.gameObject); Object.Destroy(root);
            cache[key] = rt;
            return rt;
        }
    }
}
