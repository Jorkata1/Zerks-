using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Zerks.Sim;

namespace Zerks.Game
{
    /// <summary>
    /// The screen (concept.md "Екранът"): air, stock, power and people on top; Build, Colonists, Research, Map and
    /// Goals under the thumb; ECHO's line above them; panels that open on tap; tags over the map.
    /// </summary>
    public sealed class Hud : MonoBehaviour
    {
        GameRunner G;
        Colony C => G.Colony;
        UIDocument doc;
        VisualElement root, tagLayer, top, sheetLayer, modalLayer, echoBox, bottom;
        Label airValue, arkBadge, echoText, toast;
        VisualElement airFill, airBlock, chipsRow;
        readonly Dictionary<Res, (VisualElement chip, Label text, Label cap)> chips = new Dictionary<Res, (VisualElement, Label, Label)>();
        VisualElement energyChip, colonistChip, batteryFill;
        Label energyText, colonistText;
        Button bBuild, bColonists, bResearch, bMap, bGoals;
        readonly Queue<string> echoQueue = new Queue<string>();
        string echoNow;
        float echoLeft, toastLeft;
        string sheet, sheetArg, sheetSig;
        VisualElement sheetEl;
        readonly List<Action> live = new List<Action>();
        readonly Dictionary<string, VisualElement> tags = new Dictionary<string, VisualElement>();
        readonly HashSet<string> tagsSeen = new HashSet<string>();
        VisualElement arrow;
        public bool GoalsNew;
        float safeTop, safeBottom;

        static readonly Dictionary<Res, Color> ResColor = new Dictionary<Res, Color>
        {
            [Res.Carbon] = Look.Hex(0x2e2c33), [Res.Water] = Look.Hex(0x3fa7ff), [Res.Stone] = Look.Hex(0xb9643f),
            [Res.Food] = Look.Hex(0x5fbf47), [Res.Quartz] = Look.Hex(0xb79cff), [Res.Silicon] = Look.Hex(0x6b7fa8), [Res.Iron] = Look.Hex(0x9a4a3a),
        };
        static readonly Dictionary<Res, string> ResShort = new Dictionary<Res, string>
        {
            [Res.Carbon] = "C", [Res.Water] = "W", [Res.Stone] = "S", [Res.Food] = "F", [Res.Quartz] = "Q", [Res.Silicon] = "Si", [Res.Iron] = "Fe",
        };

        public void Init(GameRunner g)
        {
            G = g;
            doc = gameObject.AddComponent<UIDocument>();
            doc.panelSettings = Resources.Load<PanelSettings>("UI/Panel");
            root = doc.rootVisualElement;
            root.styleSheets.Add(Resources.Load<StyleSheet>("UI/Zerks"));
            root.AddToClassList("root");
            root.pickingMode = PickingMode.Ignore;
            var font = Resources.Load<Font>("Fonts/Roboto-Medium");
            if (font != null) root.style.unityFontDefinition = new StyleFontDefinition(FontDefinition.FromFont(font));

            tagLayer = Layer("tags");
            BuildTop();
            BuildBottom();
            BuildEcho();
            sheetLayer = Layer("sheets");
            modalLayer = Layer("modals");
            arrow = new VisualElement();
            arrow.AddToClassList("arrow");
            arrow.pickingMode = PickingMode.Ignore;
            tagLayer.Add(arrow);
            toast = new Label();
            toast.AddToClassList("toast");
            toast.pickingMode = PickingMode.Ignore;
            toast.style.display = DisplayStyle.None;
            root.Add(toast);
            var dev = new Button(() => Open("dev")) { text = "DEV" };
            dev.AddToClassList("dev-btn");
            root.Add(dev);
        }

        VisualElement Layer(string name)
        {
            var v = new VisualElement { name = name, pickingMode = PickingMode.Ignore };
            v.AddToClassList("layer");
            root.Add(v);
            return v;
        }

        // ================================================================ helpers

        static Label L(string text, string cls = null)
        {
            var l = new Label(text);
            if (cls != null) foreach (var c in cls.Split(' ')) l.AddToClassList(c);
            return l;
        }

        static Button B(string text, Action click, string cls = "btn", bool enabled = true)
        {
            var b = new Button(click) { text = text };
            foreach (var c in cls.Split(' ')) b.AddToClassList(c);
            b.SetEnabled(enabled);
            return b;
        }

        static VisualElement Row(string cls = "row")
        {
            var v = new VisualElement();
            foreach (var c in cls.Split(' ')) v.AddToClassList(c);
            return v;
        }

        static VisualElement Bar(float k, Color? color = null)
        {
            var bar = Row("bar");
            var fill = Row("bar-fill");
            fill.style.width = Length.Percent(Mathf.Clamp01(k) * 100);
            if (color.HasValue) fill.style.backgroundColor = color.Value;
            bar.Add(fill);
            return bar;
        }

        static string Cost(Bag cost, Bag stock)
        {
            var parts = new List<string>();
            foreach (var (r, a) in cost.NonZero())
            {
                var enough = stock[r] + 1e-6 >= a;
                parts.Add(enough ? $"{Fmt.Num(a)} {ResInfo.Name(r).ToLowerInvariant()}" : $"<color=#d9480f>{Fmt.Num(a)} {ResInfo.Name(r).ToLowerInvariant()}</color>");
            }
            return string.Join(" · ", parts);
        }

        string RealTime(double gameSeconds) => Fmt.Time(gameSeconds / C.Cfg.Tempo);

        // ================================================================ top bar

        void BuildTop()
        {
            top = Row("top");
            top.pickingMode = PickingMode.Ignore;
            root.Add(top);
            var row = Row("top-row");
            row.pickingMode = PickingMode.Ignore;
            top.Add(row);
            airBlock = new VisualElement();
            airBlock.AddToClassList("air");
            airBlock.Add(L("AIR", "air-label"));
            airValue = L("7%", "air-value");
            airBlock.Add(airValue);
            var bar = Row("air-bar");
            airFill = Row("air-fill");
            bar.Add(airFill);
            airBlock.Add(bar);
            airBlock.AddManipulator(new Clickable(AirInfo));
            row.Add(airBlock);
            chipsRow = Row("chips");
            chipsRow.pickingMode = PickingMode.Ignore;
            row.Add(chipsRow);
            arkBadge = L("ARK 1", "ark-badge");
            arkBadge.AddManipulator(new Clickable(() => Open("ark")));
            chipsRow.Add(arkBadge);
            foreach (var r in ResInfo.All)
            {
                var chip = Row("chip");
                var dot = L(ResShort[r], "chip-dot");
                dot.style.backgroundColor = ResColor[r];
                var text = L("0", "chip-text");
                var cap = L("", "chip-cap");
                chip.Add(dot); chip.Add(text); chip.Add(cap);
                var res = r;
                chip.AddManipulator(new Clickable(() => ResInfoModal(res)));
                chipsRow.Add(chip);
                chips[r] = (chip, text, cap);
            }
            energyChip = Row("chip");
            var ed = L("kW", "chip-dot");
            ed.style.backgroundColor = Look.Hex(0xffb21a);
            energyText = L("", "chip-text");
            var bat = Row("battery");
            batteryFill = Row("battery-fill");
            bat.Add(batteryFill);
            energyChip.Add(ed); energyChip.Add(energyText); energyChip.Add(bat);
            energyChip.AddManipulator(new Clickable(PowerInfo));
            chipsRow.Add(energyChip);
            colonistChip = Row("chip");
            var cd = L("P", "chip-dot");
            cd.style.backgroundColor = Look.Hex(0x9a7cff);
            colonistText = L("", "chip-text");
            colonistChip.Add(cd); colonistChip.Add(colonistText);
            colonistChip.AddManipulator(new Clickable(() => Open("colonists")));
            chipsRow.Add(colonistChip);
        }

        void RefreshTop()
        {
            var s = C.S;
            var shown = s.Has("geolocator") || !C.InTutorial;
            airBlock.style.display = shown ? DisplayStyle.Flex : DisplayStyle.None;
            airValue.text = $"{s.Atmo}%";
            airFill.style.width = Length.Percent((float)Math.Min(1, s.Air / G.Colony.Bal.AirFor(s.Atmo)) * 100);
            arkBadge.text = $"ARK {s.Ark}";
            var cap = C.Capacity;
            foreach (var r in ResInfo.All)
            {
                var (chip, text, capL) = chips[r];
                var show = r switch
                {
                    Res.Carbon => s.Has("drill") || s.Stock[r] > 0,
                    Res.Water => s.Has("pump") || s.Stock[r] > 0,
                    Res.Stone => s.Ark >= 2 || s.Stock[r] > 0,
                    Res.Food => s.Has("veglab"),
                    Res.Quartz => s.Level("mine") >= 5 || s.Stock[r] > 0,
                    Res.Silicon => s.Has("furnace") || s.Stock[r] > 0,
                    Res.Iron => s.Level("mine") >= 10 || s.Stock[r] > 0,
                    _ => true,
                };
                chip.style.display = show ? DisplayStyle.Flex : DisplayStyle.None;
                text.text = Fmt.Num(s.Stock[r]);
                capL.text = $"/{Fmt.Num(cap)}";
                chip.EnableInClassList("full", s.Stock[r] >= cap - 0.5);
            }
            energyChip.style.display = s.Ark >= 5 || s.Has("solar") ? DisplayStyle.Flex : DisplayStyle.None;
            energyText.text = $"{C.EnergySupply:0}/{C.EnergyDemand:0}";
            energyChip.EnableInClassList("energy-ok", C.EnergyRatio >= 0.999);
            energyChip.EnableInClassList("energy-short", C.EnergyRatio < 0.999);
            var bc = C.BatteryCapacity;
            batteryFill.parent.style.display = bc > 0 ? DisplayStyle.Flex : DisplayStyle.None;
            batteryFill.style.width = Length.Percent(bc > 0 ? (float)(s.Battery / bc) * 100 : 0);
            colonistChip.style.display = s.Ark >= 3 ? DisplayStyle.Flex : DisplayStyle.None;
            colonistText.text = $"{C.Awake}/{C.Beds}";
        }

        // ================================================================ bottom bar

        void BuildBottom()
        {
            bottom = Row("bottom");
            bottom.pickingMode = PickingMode.Ignore;
            root.Add(bottom);
            bBuild = Nav("+", "Build", () => Open("build"));
            bColonists = Nav("P", "Colonists", () => Open("colonists"));
            bResearch = Nav("R", "Research", () => Open("research"));
            bMap = Nav("M", "Map", () => Open("map"));
            bGoals = Nav("", "Goals", () => { GoalsNew = false; Open("goals"); });
            bGoals.AddToClassList("nav-echo");
            var eye = new VisualElement();
            eye.AddToClassList("echo-eye");
            bGoals.Q(className: "nav-icon").Add(eye);
        }

        Button Nav(string icon, string label, Action click)
        {
            var b = new Button(click);
            b.AddToClassList("nav");
            var i = L(icon, "nav-icon");
            i.style.alignItems = Align.Center; i.style.justifyContent = Justify.Center;
            b.Add(i);
            b.Add(L(label, "nav-label"));
            bottom.Add(b);
            return b;
        }

        void RefreshBottom()
        {
            var s = C.S;
            // The buttons appear when the player is ready for them (concept.md, "ЕХО като водач").
            Show(bResearch, s.DebrisCleared);
            Show(bBuild, s.Ark >= 2);
            Show(bGoals, s.Ark >= 2);
            Show(bColonists, s.Ark >= 3);
            Show(bMap, s.Zone >= 1 || s.Ark >= 4);
            bGoals.EnableInClassList("glow", GoalsNew);
            bResearch.EnableInClassList("glow", s.DebrisCleared && s.Running.Count < C.ResearchSlots && Content.Research.Any(r => C.WhyNotResearch(r.Id) == ""));
            bBuild.EnableInClassList("glow", !C.InTutorial && Content.Buildings.Any(d => C.WhyNotBuild(d.Id, out _) == ""));
        }

        static void Show(VisualElement v, bool on) => v.style.display = on ? DisplayStyle.Flex : DisplayStyle.None;

        // ================================================================ ECHO

        void BuildEcho()
        {
            echoBox = Row("echo");
            var face = new VisualElement();
            face.AddToClassList("echo-face");
            var eye = new VisualElement();
            eye.AddToClassList("echo-eye");
            face.Add(eye);
            echoBox.Add(face);
            echoText = L("", "echo-text");
            echoBox.Add(echoText);
            echoBox.AddManipulator(new Clickable(() => { echoLeft = 0; }));
            echoBox.style.display = DisplayStyle.None;
            root.Add(echoBox);
        }

        public void Say(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            if (echoNow == text || echoQueue.Contains(text)) return;
            echoQueue.Enqueue(text);
            GoalsNew = true;
        }

        void RefreshEcho(float dt)
        {
            echoLeft -= dt;
            if (echoLeft <= 0)
            {
                if (echoQueue.Count > 0)
                {
                    echoNow = echoQueue.Dequeue();
                    echoLeft = Mathf.Clamp(echoNow.Length / 16f, 3.5f, 9f);
                }
                else echoNow = C.InTutorial && !G.World.Landing ? C.TutorialLine : null;
            }
            echoBox.style.display = echoNow != null && sheet == null ? DisplayStyle.Flex : DisplayStyle.None;
            echoText.text = echoNow ?? "";
        }

        public void Toast(string text)
        {
            toast.text = text;
            toast.style.display = DisplayStyle.Flex;
            toastLeft = 1.8f;
        }

        // ================================================================ every frame

        float sheetTimer;

        void Update()
        {
            if (G == null || G.Colony == null) return;
            var dt = Time.unscaledDeltaTime;
            ApplySafeArea();
            RefreshTop();
            RefreshBottom();
            RefreshEcho(dt);
            RefreshTags();
            if (toastLeft > 0) { toastLeft -= dt; if (toastLeft <= 0) toast.style.display = DisplayStyle.None; }
            sheetTimer -= dt;
            if (sheet != null && sheetTimer <= 0)
            {
                sheetTimer = 0.25f;
                var sig = Signature();
                if (sig != sheetSig) RebuildSheet();
                foreach (var a in live) a();
            }
        }

        void ApplySafeArea()
        {
            if (root.panel == null) return;
            var sa = Screen.safeArea;
            var scale = root.layout.height > 0 ? root.layout.height / Mathf.Max(1, Screen.height) : 1;
            var t = (Screen.height - sa.yMax) * scale;
            var b = sa.y * scale;
            if (Mathf.Abs(t - safeTop) > 0.5f || Mathf.Abs(b - safeBottom) > 0.5f)
            {
                safeTop = t; safeBottom = b;
                top.style.top = 6 + t;
                bottom.style.bottom = 8 + b;
                echoBox.style.bottom = 76 + b;
            }
        }

        /// <summary>True when a screen point (pixels, y up) is on the interface, so the map should not get it.</summary>
        public bool Takes(Vector2 screen)
        {
            if (root?.panel == null) return false;
            var p = RuntimePanelUtils.ScreenToPanel(root.panel, new Vector2(screen.x, Screen.height - screen.y));
            var picked = root.panel.Pick(p);
            return picked != null && picked != root && picked.pickingMode == PickingMode.Position;
        }

        public bool SheetOpen => sheet != null;

        /// <summary>A new game or a jump: close everything that was open.</summary>
        public void ResetView()
        {
            Close();
            modalLayer?.Clear();
            echoQueue.Clear();
            echoNow = null; echoLeft = 0;
            foreach (var t in tags.Values) t.RemoveFromHierarchy();
            tags.Clear();
        }

        // ================================================================ tags over the map

        Vector2 ToPanel(Vector3 world)
        {
            return RuntimePanelUtils.CameraTransformWorldToPanel(root.panel, world, G.Rig.Cam);
        }

        VisualElement Tag(string key, string text, string cls, Vector3 world, Action click, float progress = -1, Color? dot = null)
        {
            tagsSeen.Add(key);
            if (!tags.TryGetValue(key, out var t))
            {
                t = new VisualElement();
                t.AddToClassList("tag");
                foreach (var c in cls.Split(' ')) t.AddToClassList(c);
                if (dot.HasValue)
                {
                    var d = L("", "chip-dot");
                    d.name = "dot";
                    t.Add(d);
                }
                t.Add(L(text, "tag-text"));
                if (progress >= 0) t.Add(Bar(0));
                if (click != null) t.AddManipulator(new Clickable(click));
                else t.pickingMode = PickingMode.Ignore;
                tagLayer.Add(t);
                tags[key] = t;
            }
            var behind = Vector3.Dot(world - G.Rig.Cam.transform.position, G.Rig.Cam.transform.forward) < 0;
            var p = ToPanel(world);
            t.style.display = behind ? DisplayStyle.None : DisplayStyle.Flex;
            // Keep the tag on the screen: half its width from each side.
            var half = Mathf.Max(30, t.resolvedStyle.width / 2);
            var w = root.layout.width > 0 ? root.layout.width : 390;
            t.style.left = Mathf.Clamp(p.x, half + 4, w - half - 4);
            t.style.top = Mathf.Max(p.y, 60);
            t.Q<Label>(className: "tag-text").text = text;
            if (dot.HasValue) { var d = t.Q<Label>("dot"); d.style.backgroundColor = dot.Value; }
            if (progress >= 0)
            {
                var fill = t.Q(className: "bar-fill");
                if (fill != null) fill.style.width = Length.Percent(Mathf.Clamp01(progress) * 100);
            }
            return t;
        }

        void RefreshTags()
        {
            tagsSeen.Clear();
            var s = C.S;
            var hideForSheet = sheet == "build" || sheet == "research" || sheet == "colonists" || sheet == "dev" || modalLayer.childCount > 0;
            if (!hideForSheet && !G.World.Landing)
            {
                foreach (var b in s.Buildings)
                {
                    var top = G.World.WorldOf(b.Id);
                    if (!b.Built && b.BuildTotal > 0)
                    {
                        var k = 1 - (float)(b.BuildLeft / b.BuildTotal);
                        Tag("t" + b.Id, $"Printing {RealTime(b.BuildLeft)}", "timer", top, null, k);
                        continue;
                    }
                    if (!b.Built) continue;
                    if (b.Ready) { Tag("r" + b.Id, "Ready", "ready", top, () => { C.Reprint(b.Id); G.World.Reprint(b.Id); }); continue; }
                    if (b.Upgrading)
                    {
                        var k = 1 - (float)(b.UpgradeLeft / b.UpgradeTotal);
                        Tag("t" + b.Id, $"Lv {b.Level + 1} · {RealTime(b.UpgradeLeft)}", "timer", top, null, k);
                        continue;
                    }
                    var best = b.Buffer.NonZero().OrderByDescending(x => x.amount).FirstOrDefault();
                    if (best.amount >= 1)
                    {
                        var id = b.Id;
                        Tag("b" + b.Id, $"+{Fmt.Num(best.amount)}", "bubble", top, () => Collect(id), -1, ResColor[best.res]);
                    }
                }
                var arkTop = Look.ArkAt + Vector3.up * 36;
                if (s.ArkLeft > 0) Tag("ark-t", $"Ark → {s.Ark + 1} · {RealTime(s.ArkLeft)}", "timer", arkTop, null, 1 - (float)(s.ArkLeft / s.ArkTotal));
                else if (C.WhyNotArk() == "") Tag("ark-up", $"Upgrade the Ark to {s.Ark + 1}", "action", arkTop, () => { if (C.UpgradeArk()) Toast("The Ark is upgrading"); });
                if (C.WhyNotWake() == "") Tag("ark-wake", "A pod is glowing: wake", "action", Look.ArkAt + Vector3.up * 24, OpenWake);
                if (s.Robot.Unlocked && s.Robot.Back)
                    Tag("robot", s.Robot.Boost ? "Robot: speed-up" : $"Robot: +{Fmt.Num(s.Robot.Amount)} {ResShort[s.Robot.Cargo]}", "bubble", G.World.Robot.transform.position + Vector3.up * 4, UnloadRobot);
                if (!s.DebrisCleared && (s.Tutorial >= Colony.TStep.Debris))
                    Tag("debris", "Clear the debris", "action", G.World.PlotOf("research") + Vector3.up * 6, () => G.TapDebris());
                if (G.World.PlacingId != null)
                {
                    var id = G.World.PlacingId;
                    Tag("place", $"Build here: {Content.B(id).Name}", "action", G.World.PlotOf(id) + Vector3.up * 3, () => G.BuildHere(id));
                }
            }
            foreach (var kv in tags) if (!tagsSeen.Contains(kv.Key)) kv.Value.style.display = DisplayStyle.None;
            // ECHO's arrow.
            var point = G.World.EchoPoint;
            if (point.HasValue && !hideForSheet && !G.World.Landing)
            {
                var p = ToPanel(point.Value + Vector3.up * (2 + Mathf.Abs(Mathf.Sin(Time.time * 4)) * 1.5f));
                arrow.style.display = DisplayStyle.Flex;
                arrow.style.left = p.x; arrow.style.top = p.y - 34;
            }
            else arrow.style.display = DisplayStyle.None;
        }

        void Collect(string id)
        {
            var got = C.Collect(id);
            var best = got.NonZero().OrderByDescending(x => x.amount).FirstOrDefault();
            if (best.amount > 0) Toast($"+{Fmt.Num(best.amount)} {ResInfo.Name(best.res).ToLowerInvariant()}");
            else Toast("The store is full");
        }

        void UnloadRobot()
        {
            var got = C.UnloadRobot();
            if (got != null) Toast(got);
        }

        // ================================================================ sheets

        public void Open(string which, string arg = null)
        {
            if (C.InTutorial && which != "building" && which != "ark" && which != "dev" && which != "research") return;
            sheet = which; sheetArg = arg; sheetSig = null;
            sheetTimer = 0;
            G.World.PlacingId = C.InTutorial ? G.World.PlacingId : null;
            RebuildSheet();
        }

        public void Close()
        {
            sheet = null; sheetArg = null;
            sheetLayer.Clear();
            live.Clear();
        }

        string Signature()
        {
            var s = C.S;
            var sig = $"{sheet}|{sheetArg}|{s.Ark}|{s.Atmo}|{s.Zone}|{s.Colonists.Count}|{s.Done.Count}|{s.Running.Count}|{s.ArkLeft > 0}|{s.Crop}|{s.ResearchUpgraded}|{s.Tutorial}";
            foreach (var b in s.Buildings) sig += $"|{b.Id}{b.Level}{b.Built}{b.Upgrading}{b.Ready}{string.Join(",", b.Workers)}{string.Join(",", b.Dig)}";
            // Affordability changes which buttons are on: count what can be paid now.
            if (sheet == "building" || sheet == "build" || sheet == "ark")
            {
                sig += "|" + string.Join("", Content.Buildings.Select(d => C.WhyNotBuild(d.Id, out _) == "" ? "1" : "0"));
                sig += "|" + string.Join("", s.Buildings.Select(b => C.WhyNotUpgrade(b.Id) == "" ? "1" : "0"));
                sig += "|" + (C.WhyNotArk() == "") + (C.WhyNotWake() == "") + string.Join("", C.Requirements().Select(r => r.Done ? "1" : "0"));
                sig += "|" + (sheet == "building" && s.Get(sheetArg ?? "") is BuildingState bs ? bs.Buffer.V.Sum() >= 1 : false);
            }
            return sig;
        }

        void RebuildSheet()
        {
            sheetSig = Signature();
            sheetLayer.Clear();
            live.Clear();
            if (sheet == null) return;
            sheetEl = new VisualElement();
            sheetEl.AddToClassList("sheet");
            sheetLayer.Add(sheetEl);
            var head = Row("sheet-head");
            var title = L("", "sheet-title");
            head.Add(title);
            head.Add(B("✕", Close, "close"));
            sheetEl.Add(head);
            var body = new ScrollView(ScrollViewMode.Vertical);
            sheetEl.Add(body);
            switch (sheet)
            {
                case "building": title.text = BuildingSheet(body, sheetArg); break;
                case "ark": title.text = ArkSheet(body); break;
                case "build": title.text = "Build"; BuildMenu(body); break;
                case "research": title.text = "Research"; ResearchSheet(body); break;
                case "colonists": title.text = "Colonists"; ColonistsSheet(body); break;
                case "map": title.text = "Map of the canyon"; MapSheet(body); break;
                case "goals": title.text = "Goals"; GoalsSheet(body); break;
                case "dev": title.text = "Test panel"; DevSheet(body); break;
            }
        }

        // ---------------------------------------------------------------- a building

        string BuildingSheet(VisualElement body, string id)
        {
            var s = C.S;
            var def = Content.B(id);
            var b = s.Get(id);
            if (b == null) { body.Add(L("Not built.", "sheet-sub")); return def.Name; }
            body.Add(L(def.About, "sheet-sub"));
            if (!b.Built)
            {
                var t = L("", "line-text");
                body.Add(t);
                var bar = Bar(0);
                body.Add(bar);
                live.Add(() => { t.text = $"The drone is printing it · {RealTime(b.BuildLeft)}"; bar.Q(className: "bar-fill").style.width = Length.Percent((1 - (float)(b.BuildLeft / b.BuildTotal)) * 100); });
                return def.Name;
            }

            // What it gives now and on the next level.
            var rowNow = C.Row(id, b.Level);
            var rowNext = C.Row(id, b.Level + 1);
            body.Add(L("NOW AND NEXT LEVEL", "section"));
            void Line(string what, double now, double next, string unit)
            {
                var r = Row("line");
                r.Add(L($"{what}", "line-text"));
                r.Add(L($"{Fmt.Num(now)} → {Fmt.Num(next)} {unit}", "muted"));
                body.Add(r);
            }
            switch (id)
            {
                case "drill": Line("Carbon", rowNow.Get("carbon/min"), rowNext.Get("carbon/min"), "/min"); break;
                case "pump": Line("Water", rowNow.Get("water/min"), rowNext.Get("water/min"), "/min"); break;
                case "veglab": Line("Food", rowNow.Get("food/min"), rowNext.Get("food/min"), "/min"); Line("Air", rowNow.Get("air/min"), rowNext.Get("air/min"), "/min"); break;
                case "processor": Line("Air", rowNow.Get("air/min"), rowNext.Get("air/min"), "/min"); break;
                case "greenhouse": Line("Air", rowNow.Get("air/min"), rowNext.Get("air/min"), "/min"); break;
                case "furnace": Line("Silicon", rowNow.Get("silicon/min"), rowNext.Get("silicon/min"), "/min (2 quartz + 1 carbon each)"); break;
                case "solar": Line("Power by day", rowNow.Get("kW by day"), rowNext.Get("kW by day"), "kW"); break;
                case "batteries": Line("Stores", rowNow.Get("kWh") * C.Cfg.CycleScale, rowNext.Get("kWh") * C.Cfg.CycleScale, "kWh"); break;
                case "mine":
                    foreach (var r in Content.MineMaterials(b.Level))
                        Line($"{ResInfo.Name(r)} per miner", rowNow.Get($"{ResInfo.Key(r)}/min per worker"), rowNext.Get($"{ResInfo.Key(r)}/min per worker"), "/min");
                    break;
                case "warehouse": Line("Each stock (with the Ark)", C.Capacity, Content.ArkCapacity + Content.StoreCapacity(b.Level + 1), ""); break;
                case "home": Line("Beds", Content.Beds(b.Level), Content.Beds(b.Level + 1), ""); break;
                case "kitchen": Line("Seats", Content.Seats(b.Level), Content.Seats(b.Level + 1), ""); break;
                case "geolocator": body.Add(L($"Air {s.Atmo}% · rising {C.AirRate:0.##} units/min" + (C.SmokeRate > 0 ? $" · smoke -{C.SmokeRate:0.##}" : ""), "line-text")); break;
                case "research": body.Add(L(s.ResearchUpgraded ? "Two projects at once, a desk for a scientist." : "One project at a time. On Ark level 10 it gets a second slot and a scientist.", "line-text")); break;
            }
            body.Add(L($"Power {rowNow.EnergyKw:0.#} kW", "muted"));

            // Next new thing (concept.md: how many levels to the next unlock and which Ark level it wants).
            var next = id switch
            {
                "mine" => b.Level < 5 ? "Level 5: quartz and a second miner" : b.Level < 10 ? "Level 10: iron ore and a third miner (the Ark on level 9)" : null,
                "veglab" => b.Level < 5 ? "Level 5: potatoes" : b.Level < 10 ? "Level 10: beans (the Ark on level 9)" : null,
                "home" => b.Level < 11 ? $"Level {Math.Max(5, b.Level + 1)}: one more bed" + (b.Level == 10 ? " and the second floor" : "") : null,
                "kitchen" => b.Level < 8 ? "Level 9: the ninth seat" : null,
                _ => null,
            };
            if (next != null) body.Add(L(next, "muted"));

            // Workers.
            if (def.HasWorkplace && Content.Slots(id, b.Level, s.ResearchUpgraded) > 0)
            {
                body.Add(L(id == "mine" ? "MINERS" : "WORKER", "section"));
                for (int i = 0; i < b.Workers.Count; i++)
                {
                    var cid = b.Workers[i];
                    var col = s.Colonist(cid);
                    var r = Row("line");
                    if (col != null)
                    {
                        r.Add(L($"{col.Name} · {Texts.ProfessionName(col.Profession)} {Stars(C.Stars(col))}", "line-text"));
                        body.Add(r);
                        if (id == "mine")
                        {
                            var picks = Row();
                            var slot = i;
                            foreach (var mat in Content.MineMaterials(b.Level))
                            {
                                var m = mat;
                                picks.Add(B(ResInfo.Name(mat), () => C.SetDig(slot, m), b.Dig[i] == mat ? "btn small picked" : "btn small"));
                            }
                            body.Add(picks);
                        }
                    }
                    else
                    {
                        r.Add(L("Empty", "muted"));
                        if (C.WhyNotWake() == "") r.Add(B("Wake someone", OpenWake, "btn small teal"));
                        body.Add(r);
                    }
                }
                if (!C.Staffed(b)) body.Add(L("No worker: it works only while you play, and you collect the bubble by hand.", "muted"));
            }
            if (id == "veglab")
            {
                body.Add(L("WHAT GROWS", "section"));
                var picks = Row();
                foreach (var crop in Content.Crops)
                {
                    var cr = crop;
                    var can = b.Level >= crop.LabLevel;
                    picks.Add(B(can ? crop.Name : $"{crop.Name} (lab {crop.LabLevel})", () => C.SetCrop(cr.Id), s.Crop == crop.Id ? "btn small picked" : "btn small", can));
                }
                body.Add(picks);
                body.Add(L(Content.Crops.First(x => x.Id == s.Crop).About, "muted"));
            }
            if (id == "research") body.Add(B("Open research", () => Open("research"), "btn alt"));

            // Bubble, impulse, upgrade.
            if (b.Buffer.V.Sum() >= 1) body.Add(B($"Collect {b.Buffer}", () => Collect(id), "btn teal"));
            if (C.ImpulseReady && id != "home" && id != "warehouse") body.Add(B("ECHO's impulse: twice as fast for 5 min", () => { if (C.Impulse(id)) Toast("ECHO's impulse"); }, "btn alt"));
            if (b.Ready) body.Add(B("Ready: the drone re-prints the new part", () => { C.Reprint(id); G.World.Reprint(id); }, "btn"));
            if (b.Upgrading)
            {
                var t = L("", "line-text");
                var bar = Bar(0);
                body.Add(t); body.Add(bar);
                live.Add(() => { t.text = $"Upgrading to level {b.Level + 1} · {RealTime(b.UpgradeLeft)}"; bar.Q(className: "bar-fill").style.width = Length.Percent((1 - (float)(b.UpgradeLeft / Math.Max(0.001, b.UpgradeTotal))) * 100); });
            }
            else
            {
                var why = C.WhyNotUpgrade(id);
                var cost = C.UpgradeCost(b);
                body.Add(L($"Level {b.Level} → {b.Level + 1}: {Cost(cost, s.Stock)} · {RealTime(C.UpgradeSeconds(b))}", "line-text"));
                body.Add(B(why == "" ? "Upgrade" : why, () => { if (C.Upgrade(id)) Toast($"{def.Name}: upgrading"); }, "btn", why == ""));
            }
            return $"{def.Name} · Level {b.Level}";
        }

        static string Stars(int n) => n <= 0 ? "" : new string('★', n);

        // ---------------------------------------------------------------- the Ark

        string ArkSheet(VisualElement body)
        {
            var s = C.S;
            body.Add(L("The rescue ship we came in. The level of the game is the level of the Ark.", "sheet-sub"));
            if (s.ArkLeft > 0)
            {
                var t = L("", "line-text");
                var bar = Bar(0);
                body.Add(t); body.Add(bar);
                live.Add(() => { t.text = $"Upgrading to level {s.Ark + 1} · {RealTime(s.ArkLeft)}"; bar.Q(className: "bar-fill").style.width = Length.Percent((1 - (float)(s.ArkLeft / Math.Max(0.001, s.ArkTotal))) * 100); });
            }
            else if (C.NextReq != null)
            {
                body.Add(L($"FOR LEVEL {s.Ark + 1}", "section"));
                foreach (var it in C.Requirements())
                {
                    var r = Row("line");
                    r.Add(L(it.Text, "line-text"));
                    r.Add(L(it.Done ? "✓" : it.Have ?? "—", it.Done ? "ok" : "no"));
                    body.Add(r);
                }
                var why = C.WhyNotArk();
                body.Add(B(why == "" ? $"Upgrade the Ark to level {s.Ark + 1}" : why, () => { if (C.UpgradeArk()) Toast("The Ark is upgrading"); }, "btn", why == ""));
            }
            else body.Add(L("Chapter 1 is complete.", "line-text"));

            body.Add(L("THE PODS", "section"));
            body.Add(L($"Pods with power {C.Pods} · awake {C.Awake} · beds {C.Beds} · kitchen seats {C.Seats}", "line-text"));
            var whyWake = C.WhyNotWake();
            if (whyWake == "") body.Add(B("A pod is glowing: wake a colonist", OpenWake, "btn teal"));
            else if (s.Ark >= 3) body.Add(L(whyWake, "muted"));

            body.Add(L("POWER", "section"));
            body.Add(L($"Use {C.EnergyDemand:0.#} kW · panels {C.SolarKw:0.#} kW · reactor {C.ReactorKw:0.#} kW" + (C.BatteryCapacity > 0 ? $" · batteries {s.Battery:0.#}/{C.BatteryCapacity:0.#} kWh" : ""), "line-text"));
            if (s.Sketches.Count > 0)
            {
                body.Add(L("SKETCHES", "section"));
                body.Add(B($"Sketches {s.Sketches.Count}/10: the frame", ShowSketch, "btn alt"));
            }
            return $"The Ark · Level {s.Ark}";
        }

        // ---------------------------------------------------------------- build menu

        void BuildMenu(VisualElement body)
        {
            var s = C.S;
            var grid = Row();
            body.Add(L("A building is printed by the drone on its own plot. One at a time.", "sheet-sub"));
            body.Add(grid);
            foreach (var def in Content.Buildings)
            {
                if (def.Id == "research") continue;
                var why = C.WhyNotBuild(def.Id, out var lvl);
                var built = why == "Built";
                var locked = why.StartsWith("Level ");
                var card = new VisualElement();
                card.AddToClassList("card");
                if (why == "") card.AddToClassList("can");
                var img = new VisualElement();
                img.AddToClassList("card-img");
                var rt = Thumbs.Get(def.Id, def.ModelFor(1), locked);
                if (rt != null) img.style.backgroundImage = new StyleBackground(Background.FromRenderTexture(rt));
                if (locked) img.Add(L("🔒", "card-lock"));
                card.Add(img);
                if (locked)
                {
                    // Salamen, 13.11.2026: padlock, black silhouette, the level under it, without the name.
                    card.Add(L($"Level {lvl}", "card-name"));
                }
                else
                {
                    card.Add(L(def.Name, "card-name"));
                    if (built) card.Add(L($"Built · level {s.Level(def.Id)}", "card-info"));
                    else
                    {
                        var bb = C.Bal.B(def.Id);
                        card.Add(L($"{Cost(bb.BuildCost, s.Stock)} · {RealTime(Math.Max(bb.BuildSeconds, C.Cfg.MinBuildReal * C.Cfg.Tempo))}", "card-info"));
                        if (why != "") card.Add(L(why, "card-info"));
                    }
                }
                if (why == "")
                {
                    var id = def.Id;
                    card.AddManipulator(new Clickable(() => { Close(); G.StartPlacing(id); }));
                }
                grid.Add(card);
            }
        }

        // ---------------------------------------------------------------- research

        void ResearchSheet(VisualElement body)
        {
            var s = C.S;
            body.Add(L($"{C.ResearchSlots} slot{(C.ResearchSlots > 1 ? "s" : "")}. ECHO marks what leads to the next level.", "sheet-sub"));
            foreach (var run in s.Running)
            {
                var def = Content.R(run.Id);
                var item = Row("item");
                item.style.flexDirection = FlexDirection.Column;
                var t = L("", "item-name");
                var bar = Bar(0, Look.Teal);
                item.Add(t); item.Add(bar);
                body.Add(item);
                var r = run;
                live.Add(() => { t.text = $"{def.Name} · {RealTime(r.Left)}"; bar.Q(className: "bar-fill").style.width = Length.Percent((1 - (float)(r.Left / Math.Max(0.001, r.Total))) * 100); });
            }
            var rec = Content.Recommended.TryGetValue(s.Ark, out var rr) ? rr : Array.Empty<string>();
            foreach (var branch in Content.Branches)
            {
                body.Add(L(branch.ToUpperInvariant(), "section"));
                foreach (var r in Content.Research.Where(x => x.Branch == branch).OrderBy(x => x.Order))
                {
                    if (r.ArkLevel > s.Ark + 2 && !C.IsDone(r.Id)) continue;
                    var why = C.WhyNotResearch(r.Id);
                    var item = new VisualElement();
                    item.AddToClassList("item");
                    if (why == "Done") item.AddToClassList("done");
                    if (why == "" && rec.Contains(r.Id)) item.AddToClassList("rec");
                    var line = Row("line");
                    line.Add(L(r.Name, "item-name"));
                    if (why == "") { var id = r.Id; line.Add(B("Start", () => { if (C.StartResearch(id)) Toast($"Research: {r.Name}"); }, "btn small")); }
                    else line.Add(L(why == "Done" ? "✓" : why, why == "Done" ? "ok" : "muted"));
                    item.Add(line);
                    item.Add(L($"{r.Effect} · {RealTime(C.ResearchSeconds(r.Id))}", "item-info"));
                    body.Add(item);
                }
            }
        }

        // ---------------------------------------------------------------- colonists

        void ColonistsSheet(VisualElement body)
        {
            var s = C.S;
            body.Add(L($"Awake {C.Awake} · beds {C.Beds} · kitchen seats {C.Seats} · pods with power {C.Pods}", "sheet-sub"));
            var whyWake = C.WhyNotWake();
            if (whyWake == "") body.Add(B("Wake a colonist", OpenWake, "btn teal"));
            else body.Add(L(whyWake, "muted"));
            foreach (var col in s.Colonists)
            {
                var item = new VisualElement();
                item.AddToClassList("item");
                var line = Row("line");
                line.Add(L(col.Name, "item-name"));
                line.Add(L(Stars(C.Stars(col)), "ok"));
                item.Add(line);
                var work = string.IsNullOrEmpty(col.Work) ? "no work" : Content.B(col.Work).Name;
                item.Add(L($"{Texts.ProfessionName(col.Profession)} · {work} · happy {col.Happiness:0}%", "item-info"));
                var c = col;
                item.AddManipulator(new Clickable(() => Dossier(c)));
                body.Add(item);
            }
            if (C.Hungry) body.Add(L("There is no food in the store: people work slower and are unhappy.", "no"));
        }

        void Dossier(ColonistState c)
        {
            Modal(c.Name, $"{Texts.ProfessionName(c.Profession)} · works at the {(string.IsNullOrEmpty(c.Work) ? "—" : Content.B(c.Work).Name)}\n{c.Story}\nExperience {Stars(C.Stars(c))} ({c.WorkMinutes / 60:0.#} h of work) · happiness {c.Happiness:0}%",
                c.Earth, ("Close", null));
        }

        // ---------------------------------------------------------------- wake

        public void OpenWake()
        {
            var why = C.WhyNotWake();
            if (why != "") { Toast(why); return; }
            var fixedP = C.NextFixedPerson;
            if (fixedP != null && fixedP.Profession == Profession.Cook)
            {
                Woke(C.Wake("kitchen", 0));
                return;
            }
            var slots = fixedP != null ? C.EmptySlots(fixedP.Profession) : C.EmptySlots();
            var dim = Dim();
            var m = new VisualElement();
            m.AddToClassList("modal");
            dim.Add(m);
            m.Add(L(fixedP != null ? $"{fixedP.Name}, {Texts.ProfessionName(fixedP.Profession).ToLowerInvariant()}" : "Who should wake?", "modal-title"));
            m.Add(L(fixedP != null ? "Where will they work?" : "Choose an empty place. The Ark wakes someone with the profession it needs.", "modal-text"));
            var sv = new ScrollView();
            sv.style.maxHeight = 340;
            m.Add(sv);
            foreach (var sl in slots)
            {
                var label = $"{Content.B(sl.Building).Name}{(sl.Building == "mine" ? $" (place {sl.Slot + 1})" : "")} · {Texts.ProfessionName(sl.Profession)}{(sl.Recommended ? " · ECHO recommends" : "")}";
                var s1 = sl;
                sv.Add(B(label, () => { modalLayer.Clear(); Woke(C.Wake(s1.Building, s1.Slot)); }, sl.Recommended ? "btn teal" : "btn alt"));
            }
            m.Add(B("Not now", () => modalLayer.Clear(), "btn small alt"));
        }

        void Woke(ColonistState c)
        {
            if (c == null) { Toast("Could not wake anyone"); return; }
            G.World.CommanderTo("home");
            Modal($"{c.Name} wakes up", $"{Texts.ProfessionName(c.Profession)}, for the {Content.B(c.Work).Name}.\n{c.Story}", c.Earth, ("Welcome", null));
        }

        // ---------------------------------------------------------------- map, goals

        void MapSheet(VisualElement body)
        {
            var s = C.S;
            body.Add(L("The base is at the bottom of the canyon. Each zone opens with research; the closed ones are under dust.", "sheet-sub"));
            void Zone(string name, string what, bool open, string how)
            {
                var item = new VisualElement();
                item.AddToClassList("item");
                if (!open) item.AddToClassList("done");
                var line = Row("line");
                line.Add(L(name, "item-name"));
                line.Add(L(open ? "open" : how, open ? "ok" : "muted"));
                item.Add(line);
                item.Add(L(what, "item-info"));
                body.Add(item);
            }
            Zone("The landing", "The Ark, the first five buildings, the mine in the canyon wall, the home and the kitchen.", true, "");
            Zone("Zone I", "The next strip: the store, the furnace, the panels, the batteries, the greenhouse.", s.Zone >= 1, "Research on level 4");
            Zone("Zone II · the south slope", "Sun and room for the greenhouses of chapter 2.", s.Zone >= 2, "Research on level 10");
            Zone("Zone III · the Green Belt", "Chapter 3.", false, "Chapter 3");
        }

        void GoalsSheet(VisualElement body)
        {
            var s = C.S;
            body.Add(L($"FOR THE ARK ON LEVEL {s.Ark + 1}", "section"));
            foreach (var g in C.Goals())
            {
                var item = new VisualElement();
                item.AddToClassList("item");
                item.Add(L(g, "item-name"));
                body.Add(item);
            }
            if (s.Sketches.Count > 0) body.Add(B($"Sketches {s.Sketches.Count}/10", ShowSketch, "btn alt"));
            body.Add(L("ECHO'S NOTES", "section"));
            foreach (var n in s.Notes.AsEnumerable().Reverse().Take(14)) body.Add(L("· " + n.Text, "item-info"));
        }

        // ---------------------------------------------------------------- the test panel

        void DevSheet(VisualElement body)
        {
            var s = C.S;
            body.Add(L($"Tempo x{C.Cfg.Tempo:0} · game time {s.GameTime / 3600:0.0} h · auto-play {(G.Auto ? "on" : "off")}", "sheet-sub"));
            var tempo = Row();
            foreach (var t in new[] { 1, 10, 60, 600 }) { var tt = t; tempo.Add(B($"x{t}", () => { G.SetTempo(tt); RebuildSheet(); }, C.Cfg.Tempo == t ? "btn small picked" : "btn small")); }
            body.Add(L("SPEED", "section")); body.Add(tempo);
            body.Add(L("PLAY", "section"));
            var row = Row();
            row.Add(B(G.Auto ? "Auto: on" : "Auto: off", () => { G.Auto = !G.Auto; RebuildSheet(); }, "btn small alt"));
            row.Add(B("Finish timers", () => C.FinishTimers(), "btn small alt"));
            row.Add(B("+25% stock", () => C.AddResources(0.25), "btn small alt"));
            row.Add(B("Away 1 h", () => G.SimulateAway(3600), "btn small alt"));
            body.Add(row);
            body.Add(L("START OF ARK LEVEL", "section"));
            var jump = Row();
            for (int l = 1; l <= 11; l++) { var ll = l; jump.Add(B(l.ToString(), () => { Close(); G.JumpTo(ll); }, "btn small")); }
            body.Add(jump);
            body.Add(B("New game (delete the save)", () => { Close(); G.NewGame(); }, "btn alt"));
        }

        // ================================================================ modals

        VisualElement Dim()
        {
            modalLayer.Clear();
            var dim = new VisualElement();
            dim.AddToClassList("dim");
            modalLayer.Add(dim);
            return dim;
        }

        public void Modal(string title, string text, string quote, params (string label, Action action)[] buttons)
        {
            var dim = Dim();
            var m = new VisualElement();
            m.AddToClassList("modal");
            dim.Add(m);
            m.Add(L(title, "modal-title"));
            if (!string.IsNullOrEmpty(text)) m.Add(L(text, "modal-text"));
            if (!string.IsNullOrEmpty(quote)) m.Add(L($"\"{quote}\"", "quote"));
            foreach (var (label, action) in buttons)
                m.Add(B(label, () => { modalLayer.Clear(); action?.Invoke(); }, "btn"));
        }

        public bool ModalOpen => modalLayer.childCount > 0;

        void AirInfo()
        {
            var lines = string.Join("\n", C.AirBySource.Select(kv => $"{kv.Key}: +{kv.Value:0.##} units/min"));
            if (C.SmokeRate > 0) lines += $"\nSmoke from the furnace: -{C.SmokeRate:0.##} units/min";
            var need = C.Bal.AirFor(C.S.Atmo);
            Modal($"Air {C.S.Atmo}%", $"{lines}\nTo {C.S.Atmo + 1}%: {C.S.Air:0.#} of {need:0.#} units.\nAt 100% we breathe without masks.", null, ("Close", null));
        }

        void PowerInfo()
        {
            var s = C.S;
            Modal("Power", $"Use {C.EnergyDemand:0.#} kW\nPanels {C.SolarKw:0.#} kW · the Ark's reactor {C.ReactorKw:0.#} kW" +
                           (C.BatteryCapacity > 0 ? $"\nBatteries {s.Battery:0.#} of {C.BatteryCapacity:0.#} kWh" : "") +
                           (C.DaysStarted ? $"\n{(s.Night ? "Night" : "Day")} · a day is {C.CycleMinutes / C.Cfg.Tempo * 60 / 60:0.#} min here" : "") +
                           (C.EnergyRatio < 0.999 ? "\nNot enough power: the buildings work slower." : ""), null, ("Close", null));
        }

        void ResInfoModal(Res r)
        {
            Modal(ResInfo.Name(r), $"In stock {Fmt.Num(C.S.Stock[r])} of {Fmt.Num(C.Capacity)}\nMade {C.RatePerMin[r]:0.#}/min · used {C.UsePerMin[r]:0.#}/min" +
                                   (ResInfo.ArkSpends(r) ? "\nThe Ark takes it when it levels up." : "\nThe Ark only checks it is in the store."), null, ("Close", null));
        }

        public void ShowSketch()
        {
            var dim = Dim();
            var m = new VisualElement();
            m.AddToClassList("modal");
            dim.Add(m);
            m.Add(L("Sketch 1/10: the frame", "modal-title"));
            var bp = new VisualElement();
            bp.AddToClassList("blueprint");
            // A few lines of the frame of a warship, drawn in the light of the research station.
            void Beam(float x, float y, float w, float h)
            {
                var v = new VisualElement();
                v.style.position = Position.Absolute;
                v.style.left = Length.Percent(x); v.style.top = Length.Percent(y);
                v.style.width = Length.Percent(w); v.style.height = Length.Percent(h);
                v.style.backgroundColor = Look.Hex(0x5fe3d0, 0.85f);
                bp.Add(v);
            }
            Beam(10, 48, 80, 3); Beam(18, 28, 64, 2); Beam(18, 68, 64, 2);
            for (int i = 0; i < 7; i++) Beam(14 + i * 11, 26, 1.5f, 46);
            Beam(86, 40, 6, 18); Beam(4, 44, 6, 10);
            m.Add(bp);
            m.Add(L(Texts.Sketch, "quote"));
            m.Add(L(Texts.FrameLater, "modal-text"));
            m.Add(B("Close", () => modalLayer.Clear(), "btn"));
        }
    }
}
