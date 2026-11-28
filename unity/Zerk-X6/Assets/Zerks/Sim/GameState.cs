using System;
using System.Collections.Generic;

namespace Zerks.Sim
{
    [Serializable]
    public sealed class BuildingState
    {
        public string Id;
        /// <summary>0 while the drone prints it.</summary>
        public int Level;
        public bool Built;
        /// <summary>Game seconds left of the print (only while not built).</summary>
        public double BuildLeft, BuildTotal;
        /// <summary>Game seconds left of the upgrade to Level + 1 (0 = no upgrade).</summary>
        public double UpgradeLeft, UpgradeTotal;
        /// <summary>The building grew on the outside: "Ready" over it until the drone re-prints it.</summary>
        public bool Ready;
        /// <summary>The level whose model is on the map (lags behind Level until "Ready" is tapped).</summary>
        public int ShownLevel;
        /// <summary>What it made while it had no worker: the bubble over it.</summary>
        public Bag Buffer = new Bag();
        /// <summary>Colonist in each workplace (0 = empty), by slot.</summary>
        public List<int> Workers = new List<int>();
        /// <summary>The mine: what each place digs.</summary>
        public List<Res> Dig = new List<Res>();
        /// <summary>ECHO's impulse: game seconds of double speed left.</summary>
        public double ImpulseLeft;
        /// <summary>A greenhouse from its level 16: "air and food" (true) or "air only" (levels.md, level 16).</summary>
        public bool Food;
        /// <summary>The setting the player chose; it takes hold after one cycle of the plants (about an hour).</summary>
        public bool FoodWanted;
        public double SwitchLeft;
        /// <summary>A greenhouse's seedling bed after "Hardy seedlings" (levels.md, level 17): seedlings, and 10% less of the rest.</summary>
        public bool Seedbed;
        /// <summary>The special upgrade "Insulation" (levels.md, level 29): game seconds left, then "Ready", then done.</summary>
        public double InsulateLeft, InsulateTotal;
        public bool InsulateReady, Insulated;
        /// <summary>The seed vault (levels.md, level 38): "grain" for the fields or "trees" for the forests.</summary>
        public string Mode = "";

        [Newtonsoft.Json.JsonIgnore] public bool Upgrading => UpgradeLeft > 0;
        [Newtonsoft.Json.JsonIgnore] public bool Working => Built && Level > 0;
    }

    [Serializable]
    public sealed class ColonistState
    {
        public int Id;
        public string Name, Story, Earth;
        public Profession Profession;
        /// <summary>Building id where the colonist works ("" = none yet).</summary>
        public string Work = "";
        public int Slot;
        /// <summary>Game minutes of work: the stars.</summary>
        public double WorkMinutes;
        public double Happiness = 60;
        /// <summary>Game minutes on this job since the last swap: after five stars a long time on one job gets boring (levels.md).</summary>
        public double JobMinutes;
        /// <summary>The work minutes kept for each profession the colonist has had: a swap back brings the old stars back (Joro, 23.11.2026).</summary>
        public List<int> SkillProf = new List<int>();
        public List<double> SkillMinutes = new List<double>();
    }

    /// <summary>A patch of the Green Belt (levels.md, levels 21-27): rock, lichen, moss, thin soil, grass, sea buckthorn.</summary>
    [Serializable]
    public sealed class PatchState
    {
        public string Id;
        /// <summary>0 bare rock, 1 lichen, 2 moss, 3 thin soil, 4 grass, 5 sea buckthorn.</summary>
        public int Stage;
        /// <summary>Game minutes grown in the stage it is in.</summary>
        public double Grow;
        /// <summary>The drone sows (lichen, grass) or the agronomist plants (buckthorn): game seconds left, and the stage it leads to.</summary>
        public double WorkLeft, WorkTotal;
        public int WorkTo;
    }

    /// <summary>Two colonists who learn each other's work in the university (levels.md, level 31).</summary>
    [Serializable]
    public sealed class StudyState
    {
        public int A, B;
        public double Left, Total;
        public bool Ready;
    }

    [Serializable]
    public sealed class ResearchRun
    {
        public string Id;
        public double Left, Total;
    }

    [Serializable]
    public sealed class RobotState
    {
        public bool Unlocked;
        /// <summary>Out in the canyon (false) or back at the base and full (true).</summary>
        public bool Back;
        public double Left, Total;
        public Res Cargo;
        public double Amount;
        public bool Boost;
        public int Trips;
    }

    [Serializable]
    public sealed class EchoLog
    {
        public double GameTime;
        public string Text;
    }

    /// <summary>Everything that is saved. Times are in game seconds unless named otherwise.</summary>
    [Serializable]
    public sealed class GameState
    {
        public int Version = 1;
        public int Ark = 1;
        public double ArkLeft, ArkTotal;
        public int Atmo = Content.StartAtmo;
        public double Air;
        public Bag Stock = Content.StartStock();
        public List<BuildingState> Buildings = new List<BuildingState>();
        public List<ColonistState> Colonists = new List<ColonistState>();
        public List<string> Done = new List<string>();
        public List<ResearchRun> Running = new List<ResearchRun>();
        public bool ResearchUpgraded;
        public bool DebrisCleared;
        /// <summary>0 = the landing area, 1 = Zone I open (level 4), 2 = Zone II open (level 10).</summary>
        public int Zone;
        public double GameTime;
        /// <summary>Game minutes into the day; days start on Ark level 7.</summary>
        public double DayClock;
        public double Battery;
        public bool Night, NightOk, ShortageThisNight;
        public int NightsSeen;
        public RobotState Robot = new RobotState();
        /// <summary>Where the robot searches once the antenna works: "", "carbon", "stone" or "boost" (levels.md, level 18).</summary>
        public string RobotTarget = "";
        /// <summary>Stages of the ship's frame done in the dock (levels.md: four, on the levels 12, 14, 17 and 19).</summary>
        public int Frame;
        /// <summary>Game seconds left of the stage the fabricator and the cranes are building.</summary>
        public double FrameLeft, FrameTotal;
        /// <summary>The antenna research is done: "Ready" over the Ark until the drone unfolds the dish.</summary>
        public bool AntennaReady;
        public bool AntennaFixed;
        /// <summary>The colonist at the builder's console in the Ark (0 = none; levels.md, level 13).</summary>
        public int Builder;
        public bool Chapter2Done;
        public int Tutorial;
        public int TutorialCollects;
        public string Crop = "veg";
        public List<string> CropsTried = new List<string> { "veg" };
        public List<string> Sketches = new List<string>();
        public double ImpulseCooldown;
        public List<string> Said = new List<string>();
        public List<EchoLog> Notes = new List<EchoLog>();
        public List<string> UsedNames = new List<string>();
        public int NextColonistId = 1;
        public long SavedUtcTicks;
        public bool Chapter1Done;
        public double LastEnergyRatio = 1;
        /// <summary>kW the Ark's reactor still gives on levels 5-6: what the colony used when it reached level 5.</summary>
        public double ReactorCapKw;

        // ---------- chapters 3 and 4 (levels.md, levels 21-40) ----------

        public bool Chapter3Done, Chapter4Done;
        /// <summary>What the fabricator builds in the dock now: "" or "frame", "hull", "reactor" (FrameLeft is its timer).</summary>
        public string DockPart = "";
        /// <summary>Stages of the hull (22, 24, 27, 29) and of the ship's reactor (32, 34, 37, 39) done in the dock.</summary>
        public int Hull, Reactor;
        /// <summary>The fuel is in the reactor: "Ready" over the dock for the trial run (levels.md, level 39).</summary>
        public bool TrialReady, ReactorTested;
        public List<PatchState> Patches = new List<PatchState>();
        /// <summary>The dust storms (levels.md, general rule 13): game seconds to the next one, left of the one now, and its length.</summary>
        public double StormNext, StormLeft, StormTotal;
        public int Storms;
        /// <summary>ECHO has warned about the next storm; the colony was prepared for it (levels.md, level 37).</summary>
        public bool StormWarned, Prepared;
        /// <summary>How dusty the panels are after a storm (0..1), until their worker cleans them.</summary>
        public double PanelsDust;
        /// <summary>Stones the storm threw up, to collect with a tap.</summary>
        public int Rocks;
        /// <summary>The buildings for happiness that want care after a storm: "park", "medpost", "roaddepot" (levels.md, "Щастие").</summary>
        public List<string> Care = new List<string>();
        /// <summary>People who cough after a storm, until the doctor sees them or they get better on their own (levels.md, level 35).</summary>
        public int Coughing;
        public double CoughLeft;
        public StudyState Study;
        public int Swaps;
        /// <summary>The buildings the dispatcher manages (levels.md, level 33).</summary>
        public List<string> Managed = new List<string>();
        /// <summary>The street blocks that are paved ("d,s"), and the ones waiting for the road builder (levels.md, level 36).</summary>
        public List<string> Paved = new List<string>();
        public List<string> PaveQueue = new List<string>();
        public double PaveLeft, PaveTotal;
        /// <summary>The streets are dusty after a storm until the technician sweeps them.</summary>
        public double StreetsDust;
        public bool FirstSprout;

        public BuildingState Get(string id) => Buildings.Find(b => b.Id == id);

        /// <summary>After loading: a save from an earlier chapter holds fewer resources in each amount and none of the later lists.</summary>
        public void Fit()
        {
            if (Stock == null) Stock = new Bag();
            Stock.Fit();
            foreach (var b in Buildings) { if (b.Buffer == null) b.Buffer = new Bag(); b.Buffer.Fit(); if (b.Mode == null) b.Mode = ""; }
            if (RobotTarget == null) RobotTarget = "";
            if (DockPart == null) DockPart = "";
            if (Patches == null) Patches = new List<PatchState>();
            if (Care == null) Care = new List<string>();
            if (Managed == null) Managed = new List<string>();
            if (Paved == null) Paved = new List<string>();
            if (PaveQueue == null) PaveQueue = new List<string>();
            foreach (var c in Colonists) { if (c.SkillProf == null) c.SkillProf = new List<int>(); if (c.SkillMinutes == null) c.SkillMinutes = new List<double>(); }
        }
        public bool Has(string id) { var b = Get(id); return b != null && b.Built; }
        public int Level(string id) { var b = Get(id); return b != null && b.Built ? b.Level : 0; }
        public ColonistState Colonist(int id) => Colonists.Find(c => c.Id == id);
        public PatchState Patch(string id) => Patches.Find(p => p.Id == id);
    }
}
