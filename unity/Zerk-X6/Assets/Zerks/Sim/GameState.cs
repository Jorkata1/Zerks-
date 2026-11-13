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

        public BuildingState Get(string id) => Buildings.Find(b => b.Id == id);
        public bool Has(string id) { var b = Get(id); return b != null && b.Built; }
        public int Level(string id) { var b = Get(id); return b != null && b.Built ? b.Level : 0; }
        public ColonistState Colonist(int id) => Colonists.Find(c => c.Id == id);
    }
}
