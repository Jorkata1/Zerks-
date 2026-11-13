using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace Zerks.EditorTools
{
    /// <summary>
    /// Zerks > Set up project: the materials, the UI panel, the scene and the player settings of the test version
    /// (portrait, iPhone 13 and 14). Safe to run again: it only fills in what is missing.
    /// </summary>
    public static class ProjectSetup
    {
        const string Mats = "Assets/Zerks/Resources/Materials";
        const string UiRes = "Assets/Zerks/Resources/UI";
        const string ScenePath = "Assets/Zerks/Scenes/Colony.unity";

        [MenuItem("Zerks/Set up project")]
        public static void Run()
        {
            Directory.CreateDirectory(Mats);
            Directory.CreateDirectory(UiRes);
            Material("Lit", "Universal Render Pipeline/Lit", m => m.SetFloat("_Smoothness", 0.15f));
            Material("Print", "Zerks/Print", null);
            Material("Hologram", "Zerks/Hologram", null);
            Material("Glow", "Zerks/Glow", null);
            Material("Unlit", "Universal Render Pipeline/Unlit", null);

            var tssPath = UiRes + "/ZerksTheme.tss";
            if (!File.Exists(tssPath))
            {
                File.WriteAllText(tssPath, "@import url(\"unity-theme://default\");\n");
                AssetDatabase.ImportAsset(tssPath);
            }
            var panelPath = UiRes + "/Panel.asset";
            var panel = AssetDatabase.LoadAssetAtPath<PanelSettings>(panelPath);
            if (panel == null)
            {
                panel = ScriptableObject.CreateInstance<PanelSettings>();
                AssetDatabase.CreateAsset(panel, panelPath);
            }
            panel.themeStyleSheet = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(tssPath);
            panel.scaleMode = PanelScaleMode.ScaleWithScreenSize;
            panel.referenceResolution = new Vector2Int(390, 844); // iPhone 13/14 in points
            panel.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight;
            panel.match = 0f;
            EditorUtility.SetDirty(panel);

            PlayerSettings.companyName = "Zerks";
            PlayerSettings.productName = "Zerks-X6";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.runInBackground = true;

            if (!File.Exists(ScenePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(ScenePath));
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                var go = new GameObject("Zerks");
                go.AddComponent<Zerks.Game.GameRunner>();
                EditorSceneManager.SaveScene(scene, ScenePath);
            }
            var scenes = EditorBuildSettings.scenes;
            if (scenes.Length == 0 || scenes[0].path != ScenePath)
                EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("[Zerks] Project set up.");
        }

        [MenuItem("Zerks/Open the colony scene")]
        public static void OpenScene()
        {
            if (!File.Exists(ScenePath)) Run();
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        }

        static void Material(string name, string shader, System.Action<Material> init)
        {
            var path = $"{Mats}/{name}.mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null) return;
            var sh = Shader.Find(shader);
            if (sh == null) { Debug.LogError($"[Zerks] Shader {shader} not found"); return; }
            var m = new Material(sh);
            init?.Invoke(m);
            AssetDatabase.CreateAsset(m, path);
        }
    }
}
