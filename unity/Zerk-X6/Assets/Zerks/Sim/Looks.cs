using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace Zerks.Sim
{
    /// <summary>How one person looks (art/3d/characters/looks.json, a proposal of 14.11.2026).</summary>
    public sealed class PersonLook
    {
        public string Profession = "engineer";
        /// <summary>"#rrggbb".</summary>
        public string Skin = "#eebf98", Hair = "#4a3326";
        /// <summary>short, bun or full.</summary>
        public string Style = "short";
        public bool Beard;
    }

    /// <summary>
    /// The colours of the professions and the look of the Commander and the named colonists (Joro, 14.11.2026:
    /// "A and ECHO 2"; the colours and the faces are a proposal). The JSON is copied by Zerks > Sync from repo.
    /// </summary>
    public sealed class Looks
    {
        public readonly Dictionary<string, string> Accent = new Dictionary<string, string>();
        public readonly Dictionary<string, PersonLook> People = new Dictionary<string, PersonLook>();

        public static Looks Parse(string json)
        {
            var l = new Looks();
            if (string.IsNullOrEmpty(json)) return l;
            var root = JObject.Parse(json);
            if (root["accent"] is JObject acc)
                foreach (var p in acc.Properties()) l.Accent[p.Name] = (string)p.Value;
            if (root["people"] is JObject ppl)
                foreach (var p in ppl.Properties())
                {
                    var o = (JObject)p.Value;
                    l.People[p.Name] = new PersonLook
                    {
                        Profession = (string)o["profession"] ?? "engineer",
                        Skin = (string)o["skin"] ?? "#eebf98",
                        Hair = (string)o["hair"] ?? "#4a3326",
                        Style = (string)o["style"] ?? "short",
                        Beard = (bool?)o["beard"] ?? false,
                    };
                }
            return l;
        }

        public static string Key(Profession p) => p switch
        {
            Profession.Cook => "cook",
            Profession.Agronomist => "agronomist",
            Profession.Geologist => "geologist",
            Profession.Engineer => "engineer",
            Profession.Scientist => "scientist",
            Profession.Builder => "builder",
            _ => "engineer",
        };

        /// <summary>
        /// The look for a name; someone looks.json does not know gets the colour of their profession and the face of
        /// one of the named people, chosen by the name, so the same person always looks the same.
        /// </summary>
        public PersonLook For(string name, Profession profession)
        {
            if (name != null && People.TryGetValue(name, out var known)) return known;
            var faces = new List<PersonLook>();
            foreach (var kv in People) if (kv.Value.Profession != "commander") faces.Add(kv.Value);
            var h = 0;
            foreach (var ch in name ?? "") h = h * 31 + ch;
            var face = faces.Count > 0 ? faces[(h & 0x7fffffff) % faces.Count] : new PersonLook();
            return new PersonLook { Profession = Key(profession), Skin = face.Skin, Hair = face.Hair, Style = face.Style, Beard = face.Beard };
        }
    }
}
