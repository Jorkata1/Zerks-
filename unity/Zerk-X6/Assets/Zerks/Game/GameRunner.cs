using System.IO;
using System.Linq;
using UnityEngine;
using Zerks.Sim;

namespace Zerks.Game
{
    /// <summary>
    /// The game: loads the save (or lands the Ark), runs the colony, saves when you leave and shows on return
    /// what the workers made while you were away. Tempo 60 is the test version (Salamen, 13.11.2026).
    /// </summary>
    public sealed class GameRunner : MonoBehaviour
    {
        public Colony Colony { get; private set; }
        public WorldView World { get; private set; }
        public CameraRig Rig { get; private set; }
        public Hud Hud { get; private set; }
        public bool Auto;

        Balance bal;
        TouchInput input;
        float saveTimer, idleTimer, autoTimer, hintLeft;
        string hintTarget;
        readonly System.Collections.Generic.HashSet<string> firstBuild = new System.Collections.Generic.HashSet<string>();

        static string SavePath => Path.Combine(Application.persistentDataPath, "zerks-x6.json");
        const string TempoKey = "zerks.tempo";

        void Awake()
        {
            Application.targetFrameRate = 60;
            bal = Balance.Parse(Resources.Load<TextAsset>("balance").text);
            var camGo = new GameObject("Main Camera");
            Rig = camGo.AddComponent<CameraRig>();
            input = gameObject.AddComponent<TouchInput>();
            input.Rig = Rig;
            Hud = gameObject.AddComponent<Hud>();
            Hud.Init(this);
            input.UiTakes = Hud.Takes;
            input.OnTap = Tap;
            input.OnAnyInput = () => { idleTimer = 0; hintLeft = 0; };
            Load();
        }

        void Load()
        {
            var tempo = PlayerPrefs.GetFloat(TempoKey, 60);
            GameState state = null;
            if (File.Exists(SavePath)) state = Save.FromJson(File.ReadAllText(SavePath));
            var away = state != null ? Save.SecondsSince(state) : 0;
            Begin(state ?? new GameState(), tempo);
            if (away > 30)
            {
                var made = Colony.CatchUp(away);
                Colony.TakeEvents();
                if (!made.IsEmpty)
                    Hud.Modal("While you were away", $"{Fmt.Time(away)} away. The workers brought in:\n{made}", "The colony kept working. Your workers are getting better at it.", ("Good", null));
            }
        }

        void Begin(GameState state, double tempo)
        {
            if (World != null) Destroy(World.gameObject);
            Colony = new Colony(bal, state, new Settings { Tempo = tempo });
            var w = new GameObject("World");
            World = w.AddComponent<WorldView>();
            World.Rig = Rig;
            World.Build(Colony);
            Hud.ResetView();
            Rig.Target = state.Ark >= 4 ? new Vector3(-4, 0, 6) : new Vector3(0, 0, 0);
            Rig.View = state.Ark >= 4 ? 78 : 60;
            firstBuild.Clear();
            foreach (var b in state.Buildings) if (b.Built) firstBuild.Add(b.Id);
        }

        void Update()
        {
            var dt = Mathf.Min(Time.unscaledDeltaTime, 0.25f);
            if (World.LandingFinished) { World.LandingFinished = false; Colony.LandingDone(); }
            if (!World.Landing) Colony.Tick(dt);
            foreach (var e in Colony.TakeEvents()) OnEvent(e);
            Guide(dt);
            World.Sync(Colony, dt);
            if (Auto)
            {
                autoTimer -= dt;
                if (autoTimer <= 0) { autoTimer = 0.4f; AutoPlayer.Act(Colony); }
            }
            saveTimer -= dt;
            if (saveTimer <= 0) { saveTimer = 10; Persist(); }
        }

        void OnApplicationPause(bool paused) { if (paused) Persist(); }
        void OnApplicationQuit() => Persist();

        void Persist()
        {
            if (Colony == null) return;
            try { File.WriteAllText(SavePath, Save.ToJson(Colony.S)); }
            catch (IOException e) { Debug.LogWarning($"[Zerks] Save failed: {e.Message}"); }
        }

        // ---------------------------------------------------------------- what happens

        void OnEvent(GameEvent e)
        {
            switch (e.Kind)
            {
                case Ev.Echo: Hud.Say(e.Text); break;
                case Ev.BuildStarted:
                    // The camera leads only the first time each building is built (build-sequence.md).
                    if (firstBuild.Add(e.Id)) Rig.FocusOn(World.PlotOf(e.Id), 46, 2.2f);
                    World.PlacingId = null;
                    break;
                case Ev.Built:
                    World.CommanderTo(e.Id);
                    Hud.Toast($"{Content.B(e.Id).Name} is ready");
                    break;
                case Ev.Upgraded: break;
                case Ev.Ready: Hud.Toast($"{Content.B(e.Id).Name}: Ready. Tap it, the drone prints the new part."); break;
                case Ev.ArkLevel:
                    World.Commander.Wave();
                    Hud.Toast($"The Ark is on level {e.Id}");
                    if (e.Id == "10") Hud.ShowSketch();
                    break;
                case Ev.ResearchDone: Hud.Toast($"Research done: {Content.R(e.Id).Name}"); break;
                case Ev.RobotBack: Hud.Toast($"The robot is back with {e.Text}"); break;
                case Ev.Woken: break;
                case Ev.Chapter1Done:
                    Hud.Modal("Chapter 1 · Landing", "The colony breathes on its own: air, food, power by day and by night, eleven people.\nChapter 2, \"First Breath\", starts here.", "Time to make it a home.", ("Keep playing", null));
                    break;
                case Ev.ZoneOpened: Rig.FocusOn(e.Id == "1" ? World.PlotOf("warehouse") : Look.Plot(0, 5), 70, 1.6f); break;
            }
        }

        /// <summary>Where ECHO points: the next step of the tutorial, or the cheapest upgrade when the player stands still.</summary>
        void Guide(float dt)
        {
            var c = Colony;
            Vector3? point = null;
            if (c.InTutorial && !World.Landing)
            {
                var want = c.TutorialBuilding;
                World.PlacingId = want != null && c.WhyNotBuild(want, out _) == "" ? want : null;
                // ECHO leads the camera to each new step of the tutorial.
                var stepKey = c.S.Tutorial;
                if (stepKey != lastTutorialFocus)
                {
                    lastTutorialFocus = stepKey;
                    if (want != null) Rig.FocusOn(World.PlotOf(want), 54, 2.2f);
                    else if (stepKey == Colony.TStep.Debris) Rig.FocusOn(World.PlotOf("research"), 54, 2.2f);
                    else if (stepKey == Colony.TStep.UpgradeArk) Rig.FocusOn(Look.ArkAt, 60, 2.2f);
                }
                if (want != null) point = World.PlotOf(want);
                else if (c.S.Tutorial == Colony.TStep.Collect) point = World.WorldOf("drill");
                else if (c.S.Tutorial == Colony.TStep.Debris) point = World.PlotOf("research") + Vector3.up * 4;
                else if (c.S.Tutorial == Colony.TStep.UpgradeToLevel2)
                {
                    var next = Content.TutorialOrder.FirstOrDefault(id => c.S.Level(id) < 2 && !c.S.Get(id).Upgrading);
                    if (next != null) point = World.WorldOf(next);
                }
                else if (c.S.Tutorial == Colony.TStep.UpgradeArk) point = Look.ArkAt + Vector3.up * 30;
            }
            else
            {
                idleTimer += dt;
                // ECHO helps when the player stands still: it flies to the cheapest upgrade (concept.md).
                if (idleTimer > 60 && !Hud.SheetOpen && hintLeft <= 0)
                {
                    hintTarget = c.CheapestUpgrade();
                    if (hintTarget != null) { hintLeft = 6; Hud.Say(Texts.Idle); }
                    idleTimer = 0;
                }
                if (hintLeft > 0) { hintLeft -= dt; if (hintTarget != null) point = World.WorldOf(hintTarget); }
            }
            World.EchoPoint = point;
        }

        // ---------------------------------------------------------------- taps

        void Tap(Vector2 screen)
        {
            if (Hud.ModalOpen) return;
            var (kind, id) = World.Pick(screen);
            switch (kind)
            {
                case WorldView.PickKind.Plot: BuildHere(id); return;
                case WorldView.PickKind.Debris: TapDebris(); return;
                case WorldView.PickKind.Robot:
                    var got = Colony.UnloadRobot();
                    if (got != null) Hud.Toast(got);
                    return;
                case WorldView.PickKind.Echo:
                    if (Colony.ImpulseReady) { impulseArmed = true; Hud.Say(Texts.ImpulseReady); }
                    else Hud.Say(Colony.InTutorial ? Colony.TutorialLine : (Colony.Goals().FirstOrDefault() ?? Texts.Hello));
                    return;
                case WorldView.PickKind.Commander:
                    Hud.Say(string.Format(Texts.Commander[Random.Range(0, Texts.Commander.Length)], Colony.S.Ark));
                    return;
                case WorldView.PickKind.Colonist:
                    var col = Colony.S.Colonist(int.Parse(id));
                    if (col != null) Hud.Modal(col.Name, $"{Texts.ProfessionName(col.Profession)} · {Content.B(col.Work).Name}\n{col.Story}", col.Earth, ("Close", null));
                    return;
                case WorldView.PickKind.Ark:
                    if (Hud.SheetOpen) Hud.Close();
                    Hud.Open("ark");
                    return;
                case WorldView.PickKind.Building:
                    if (impulseArmed) { impulseArmed = false; if (Colony.Impulse(id)) { Hud.Toast("ECHO's impulse: twice as fast for 5 minutes"); return; } }
                    var b = Colony.S.Get(id);
                    if (b != null && b.Ready) { Colony.Reprint(id); World.Reprint(id); return; }
                    if (b != null && b.Built && !Colony.Staffed(b) && b.Buffer.V.Sum() >= 1 && (Colony.InTutorial || !Hud.SheetOpen))
                    {
                        var got2 = Colony.Collect(id);
                        var best = got2.NonZero().OrderByDescending(x => x.amount).FirstOrDefault();
                        if (best.amount > 0) { Hud.Toast($"+{Fmt.Num(best.amount)} {ResInfo.Name(best.res).ToLowerInvariant()}"); return; }
                    }
                    if (Colony.InTutorial && Colony.S.Tutorial < Colony.TStep.UpgradeToLevel2) return;
                    Hud.Open("building", id);
                    return;
                default:
                    if (Hud.SheetOpen) Hud.Close();
                    if (!Colony.InTutorial) World.PlacingId = null;
                    return;
            }
        }

        bool impulseArmed;
        int lastTutorialFocus = -1;

        public void TapDebris()
        {
            if (Colony.ClearDebris()) { Hud.Toast("A research station under the debris!"); World.CommanderTo("research"); }
        }

        public void StartPlacing(string id)
        {
            World.PlacingId = id;
            Rig.FocusOn(World.PlotOf(id), Mathf.Min(Rig.View, 60), 2.5f);
            Hud.Say($"Here: the plot for the {Content.B(id).Name}. Tap \"Build here\".");
        }

        public void BuildHere(string id)
        {
            if (World.PlacingId != id) return;
            if (Colony.Build(id)) World.PlacingId = null;
            else Hud.Toast(Colony.WhyNotBuild(id, out _));
        }

        // ---------------------------------------------------------------- the test panel

        public void SetTempo(double t)
        {
            Colony.Cfg.Tempo = t;
            PlayerPrefs.SetFloat(TempoKey, (float)t);
        }

        public void SimulateAway(double gameSeconds)
        {
            var real = gameSeconds / Colony.Cfg.Tempo;
            var made = Colony.CatchUp(real);
            Hud.Modal("While you were away", $"1 hour of the game passed. The workers brought in:\n{(made.IsEmpty ? "nothing (no workers yet)" : made.ToString())}", null, ("Good", null));
        }

        public void JumpTo(int level)
        {
            Auto = false;
            Begin(Jump.To(bal, level, new Settings { Tempo = Colony.Cfg.Tempo }), Colony.Cfg.Tempo);
            Persist();
        }

        public void NewGame()
        {
            Auto = false;
            if (File.Exists(SavePath)) File.Delete(SavePath);
            Begin(new GameState(), Colony.Cfg.Tempo);
        }
    }
}
