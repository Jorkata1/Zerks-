using UnityEngine;

namespace Zerks.Game
{
    /// <summary>
    /// The camera of the approved map (decided 04.11.2026): orthographic, 36 degrees above the ground, along the
    /// diagonal of the street grid. One finger pans, two fingers zoom; it never turns.
    /// </summary>
    public sealed class CameraRig : MonoBehaviour
    {
        public const float Elevation = 36f;
        public Camera Cam { get; private set; }
        /// <summary>Metres across the screen width.</summary>
        public float View = 64;
        public Vector3 Target = new Vector3(0, 0, 4);
        public float MinView = 26, MaxView = 120;
        public Rect Limits = new Rect(-60, -60, 120, 120);

        Vector3 dir, right, away;
        Vector3? focusTo;
        float focusView;
        float focusSpeed;

        void Awake()
        {
            Cam = TryGetComponent<Camera>(out var c) ? c : gameObject.AddComponent<Camera>();
            Cam.orthographic = true;
            Cam.nearClipPlane = 1;
            Cam.farClipPlane = 1200;
            Cam.clearFlags = CameraClearFlags.SolidColor;
            Cam.backgroundColor = Look.DayBg;
            gameObject.tag = "MainCamera";
            var e = Elevation * Mathf.Deg2Rad;
            var h = Mathf.Cos(e) * Mathf.Sqrt(0.5f);
            dir = new Vector3(-h, Mathf.Sin(e), h).normalized;
            right = new Vector3(-1, 0, -1).normalized;
            away = new Vector3(1, 0, -1).normalized;
            Apply();
        }

        public void Apply()
        {
            View = Mathf.Clamp(View, MinView, MaxView);
            Target.x = Mathf.Clamp(Target.x, Limits.xMin, Limits.xMax);
            Target.z = Mathf.Clamp(Target.z, Limits.yMin, Limits.yMax);
            Target.y = 0;
            var aspect = Mathf.Max(0.1f, (float)Screen.width / Mathf.Max(1, Screen.height));
            Cam.orthographicSize = View / 2f / aspect;
            transform.position = Target + dir * 400;
            transform.rotation = Quaternion.LookRotation(-dir, Vector3.up);
        }

        void LateUpdate()
        {
            if (focusTo.HasValue)
            {
                var k = 1 - Mathf.Exp(-focusSpeed * Time.unscaledDeltaTime);
                Target = Vector3.Lerp(Target, focusTo.Value, k);
                View = Mathf.Lerp(View, focusView, k);
                if ((Target - focusTo.Value).sqrMagnitude < 0.04f && Mathf.Abs(View - focusView) < 0.2f) focusTo = null;
            }
            Apply();
        }

        /// <summary>Glide to a point (the camera that leads on the first build of each building).</summary>
        public void FocusOn(Vector3 p, float view = -1, float speed = 3)
        {
            focusTo = new Vector3(p.x, 0, p.z);
            focusView = view > 0 ? view : View;
            focusSpeed = speed;
        }

        public void StopFocus() => focusTo = null;

        float MetresPerPixel => View / Mathf.Max(1, Screen.width);

        /// <summary>Moves the map with the finger (screen pixels, y up).</summary>
        public void PanBy(Vector2 delta)
        {
            focusTo = null;
            var m = MetresPerPixel;
            Target -= right * (delta.x * m) + away * (delta.y * m / Mathf.Sin(Elevation * Mathf.Deg2Rad));
            Apply();
        }

        public Vector3? GroundAt(Vector2 screen)
        {
            var ray = Cam.ScreenPointToRay(screen);
            if (Mathf.Abs(ray.direction.y) < 1e-4f) return null;
            var t = -ray.origin.y / ray.direction.y;
            return t > 0 ? ray.origin + ray.direction * t : (Vector3?)null;
        }

        /// <summary>Zooms by factor (&lt; 1 = closer) keeping the ground under the screen point in place.</summary>
        public void ZoomAt(float factor, Vector2 screen)
        {
            focusTo = null;
            var before = GroundAt(screen);
            View *= factor;
            Apply();
            var after = GroundAt(screen);
            if (before.HasValue && after.HasValue) { Target += before.Value - after.Value; Apply(); }
        }

        public Vector2 ToScreen(Vector3 world) => Cam.WorldToScreenPoint(world);
    }
}
