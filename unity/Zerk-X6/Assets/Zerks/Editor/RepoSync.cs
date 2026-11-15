using System.IO;
using UnityEditor;
using UnityEngine;

namespace Zerks.EditorTools
{
    /// <summary>
    /// Copies what the game needs from the rest of the repo: the GLB models of art/3d/buildings (a copy that is not
    /// committed, docs/unity-plan.md step 7: whether to move them is Joro's decision) and docs/balance/balance.json.
    /// Runs by itself when the models are missing, and from the menu Zerks > Sync from repo.
    /// </summary>
    [InitializeOnLoad]
    public static class RepoSync
    {
        const string ModelsDir = "Assets/Zerks/Resources/Models";
        const string BalanceDst = "Assets/Zerks/Resources/balance.json";

        static string RepoRoot => Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));

        static RepoSync()
        {
            EditorApplication.delayCall += () =>
            {
                if (!Directory.Exists(ModelsDir) || Directory.GetFiles(ModelsDir, "*.glb").Length == 0) Sync();
            };
        }

        [MenuItem("Zerks/Sync from repo")]
        public static void Sync()
        {
            var src = Path.Combine(RepoRoot, "art", "3d", "buildings");
            if (!Directory.Exists(src))
            {
                Debug.LogWarning($"[Zerks] No models at {src}");
                return;
            }
            Directory.CreateDirectory(ModelsDir);
            int n = 0;
            foreach (var f in Directory.GetFiles(src, "*.glb"))
            {
                var dst = Path.Combine(ModelsDir, Path.GetFileName(f));
                if (File.Exists(dst) && File.GetLastWriteTimeUtc(dst) >= File.GetLastWriteTimeUtc(f)) continue;
                File.Copy(f, dst, true);
                n++;
            }
            // balance.json is compared and written with LF line endings: on Windows git checks docs/ out with CRLF,
            // and a plain copy would show the Unity copy as changed on every sync (docs/unity-plan.md, Windows).
            var bal = Path.Combine(RepoRoot, "docs", "balance", "balance.json");
            if (File.Exists(bal))
            {
                var text = File.ReadAllText(bal).Replace("\r\n", "\n");
                if (!File.Exists(BalanceDst) || File.ReadAllText(BalanceDst) != text)
                {
                    File.WriteAllText(BalanceDst, text);
                    n++;
                }
            }
            AssetDatabase.Refresh();
            Debug.Log($"[Zerks] Synced {n} files from the repo.");
        }
    }
}
