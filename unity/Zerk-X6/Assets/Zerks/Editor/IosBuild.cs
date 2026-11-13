using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Zerks.EditorTools
{
    /// <summary>
    /// Zerks > Build for iPhone: the player settings for iOS and the Xcode project in Builds/iOS, for the test on
    /// Salamen's and Joro's iPhones (docs/unity-plan.md, "Пробата на iPhone"). The Apple team is not stored here:
    /// Xcode signs with the account added in Xcode > Settings > Accounts.
    /// From the shell: unity build . --target iOS --execute-method Zerks.EditorTools.IosBuild.Build
    /// </summary>
    public static class IosBuild
    {
        public const string BundleId = "com.zerks.zerksx6";
        const string DefaultOut = "Builds/iOS";

        [MenuItem("Zerks/Build for iPhone")]
        public static void Build()
        {
            Configure();
            var opts = new BuildPlayerOptions
            {
                scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray(),
                locationPathName = OutputPath(),
                target = BuildTarget.iOS,
                targetGroup = BuildTargetGroup.iOS,
                options = BuildOptions.None,
            };
            var report = BuildPipeline.BuildPlayer(opts);
            var s = report.summary;
            Debug.Log($"[Zerks] iOS build: {s.result}, {s.totalErrors} errors, {s.totalTime.TotalSeconds:0}s, {opts.locationPathName}");
            if (Application.isBatchMode) EditorApplication.Exit(s.result == BuildResult.Succeeded ? 0 : 1);
        }

        /// <summary>Portrait iPhone app with automatic signing; safe to run again.</summary>
        public static void Configure()
        {
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, BundleId);
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
            PlayerSettings.iOS.targetDevice = iOSTargetDevice.iPhoneOnly;
            PlayerSettings.iOS.sdkVersion = iOSSdkVersion.DeviceSDK;
            PlayerSettings.iOS.appleEnableAutomaticSigning = true;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.statusBarHidden = true;
            AssetDatabase.SaveAssets();
        }

        static string OutputPath()
        {
            var args = Environment.GetCommandLineArgs();
            int i = Array.IndexOf(args, "-buildOutput");
            var path = i >= 0 && i + 1 < args.Length ? args[i + 1] : DefaultOut;
            Directory.CreateDirectory(path);
            return path;
        }
    }
}
