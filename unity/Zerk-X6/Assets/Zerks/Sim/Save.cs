using System;
using Newtonsoft.Json;

namespace Zerks.Sim
{
    /// <summary>The save as JSON. Lists are replaced on load, not appended to the defaults.</summary>
    public static class Save
    {
        static readonly JsonSerializerSettings Settings = new JsonSerializerSettings
        {
            ObjectCreationHandling = ObjectCreationHandling.Replace,
            NullValueHandling = NullValueHandling.Ignore,
            MissingMemberHandling = MissingMemberHandling.Ignore,
        };

        public static string ToJson(GameState s)
        {
            s.SavedUtcTicks = DateTime.UtcNow.Ticks;
            return JsonConvert.SerializeObject(s, Formatting.None, Settings);
        }

        public static GameState FromJson(string json)
        {
            try
            {
                var s = JsonConvert.DeserializeObject<GameState>(json, Settings);
                return s != null && s.Version == 1 ? s : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>Real seconds since the save was written.</summary>
        public static double SecondsSince(GameState s)
        {
            if (s.SavedUtcTicks <= 0) return 0;
            var dt = (DateTime.UtcNow - new DateTime(s.SavedUtcTicks, DateTimeKind.Utc)).TotalSeconds;
            return Math.Max(0, dt);
        }
    }
}
