using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;

namespace Zerks.Game
{
    /// <summary>
    /// Everything is done by tapping (decided 01.11.2026): a tap selects, one finger pans, two fingers zoom.
    /// In the Editor the mouse does the same (left drag pans, the wheel zooms).
    /// </summary>
    public sealed class TouchInput : MonoBehaviour
    {
        public CameraRig Rig;
        /// <summary>A tap on the screen (pixels, y up). Return true if the UI took it.</summary>
        public Func<Vector2, bool> UiTakes;
        public Action<Vector2> OnTap;
        public Action OnAnyInput;

        Vector2 downAt, last;
        float downTime;
        bool dragging, pressed, uiPress;
        float pinchDist;
        const float TapMove = 14f;

        void OnEnable() => EnhancedTouchSupport.Enable();
        void OnDisable() => EnhancedTouchSupport.Disable();

        void Update()
        {
            if (Rig == null) return;
            var touches = Touch.activeTouches;
            if (touches.Count >= 2)
            {
                OnAnyInput?.Invoke();
                var a = touches[0].screenPosition; var b = touches[1].screenPosition;
                var d = Vector2.Distance(a, b);
                var mid = (a + b) / 2;
                if (touches[1].phase == UnityEngine.InputSystem.TouchPhase.Began || pinchDist <= 0) pinchDist = d;
                else if (d > 1)
                {
                    Rig.ZoomAt(pinchDist / d, mid);
                    pinchDist = d;
                }
                dragging = true; pressed = false;
                return;
            }
            pinchDist = 0;

            var pointer = Pointer.current;
            if (pointer == null) return;
            var pos = pointer.position.ReadValue();
            var isDown = pointer.press.isPressed;

            if (Mouse.current != null)
            {
                var scroll = Mouse.current.scroll.ReadValue().y;
                if (Mathf.Abs(scroll) > 0.01f && (UiTakes == null || !UiTakes(pos)))
                {
                    Rig.ZoomAt(scroll > 0 ? 0.9f : 1.11f, pos);
                    OnAnyInput?.Invoke();
                }
            }

            if (isDown && !pressed)
            {
                pressed = true; dragging = false; downAt = last = pos; downTime = Time.unscaledTime;
                uiPress = UiTakes != null && UiTakes(pos);
                OnAnyInput?.Invoke();
            }
            else if (isDown && pressed)
            {
                if (!uiPress)
                {
                    if (!dragging && Vector2.Distance(pos, downAt) > TapMove) dragging = true;
                    if (dragging) Rig.PanBy(pos - last);
                }
                last = pos;
            }
            else if (!isDown && pressed)
            {
                pressed = false;
                if (!uiPress && !dragging && Time.unscaledTime - downTime < 0.6f) OnTap?.Invoke(pos);
                dragging = false;
            }
        }
    }
}
