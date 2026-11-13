using System;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Zerks.EditorTools
{
    /// <summary>
    /// Zerks > Game view: iPhone 14 — the Game window at 1170 x 2532, portrait, so play and pictures in the Editor
    /// look like the phone (CLAUDE.md: look at frames in the size of a phone). Unity has no public API for this.
    /// </summary>
    public static class PhoneView
    {
        [MenuItem("Zerks/Game view: iPhone 14")]
        public static void Iphone14() => Set(1170, 2532, "iPhone 14 (portrait)");

        public static void Set(int w, int h, string label)
        {
            var asm = typeof(Editor).Assembly;
            var sizesType = asm.GetType("UnityEditor.GameViewSizes");
            var single = typeof(ScriptableSingleton<>).MakeGenericType(sizesType);
            var instance = single.GetProperty("instance").GetValue(null);
            var groupType = sizesType.GetProperty("currentGroupType").GetValue(instance);
            var group = sizesType.GetMethod("GetGroup").Invoke(instance, new[] { groupType });
            var groupT = group.GetType();
            var texts = (string[])groupT.GetMethod("GetDisplayTexts").Invoke(group, null);
            int index = Array.FindIndex(texts, t => t.StartsWith(label));
            if (index < 0)
            {
                var sizeT = asm.GetType("UnityEditor.GameViewSize");
                var kindT = asm.GetType("UnityEditor.GameViewSizeType");
                var fixedRes = Enum.Parse(kindT, "FixedResolution");
                var ctor = sizeT.GetConstructor(new[] { kindT, typeof(int), typeof(int), typeof(string) });
                var size = ctor.Invoke(new[] { fixedRes, w, h, label });
                groupT.GetMethod("AddCustomSize").Invoke(group, new[] { size });
                index = (int)groupT.GetMethod("GetTotalCount").Invoke(group, null) - 1;
            }
            var gvType = asm.GetType("UnityEditor.GameView");
            var gv = EditorWindow.GetWindow(gvType);
            var prop = gvType.GetProperty("selectedSizeIndex", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            prop?.SetValue(gv, index);
            gv.Repaint();
            Debug.Log($"[Zerks] Game view: {label} ({w} x {h})");
        }
    }
}
