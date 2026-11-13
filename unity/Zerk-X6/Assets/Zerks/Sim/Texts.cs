using System.Collections.Generic;

namespace Zerks.Sim
{
    /// <summary>
    /// ECHO's lines and the colonists, in English (the game's language, 03.11.2026). Translated from docs/levels.md
    /// and docs/concept.md; lines that are not in those files are a proposal for Joro to approve.
    /// </summary>
    public static class Texts
    {
        /// <summary>What ECHO says when the Ark reaches a level (levels.md, "Ковчегът става ниво L").</summary>
        public static readonly Dictionary<int, string> ArkLevelUp = new Dictionary<int, string>
        {
            [2] = "The Ark's systems are online. From now on you decide; I'll only give hints.",
            [3] = "We have food and air for the first of us. Let's give them a home.",
            [4] = "Four of us, and soon five. The food barely stretches. The lab can do more with better seeds.",
            [5] = "The Ark's reactor is worn out from the journey. To grow we need the sun, and for panels we need silicon, from quartz and carbon.",
            [6] = "The furnace gives us silicon, but also smoke. We lose part of the air we make.",
            [7] = "The Ark's reactor is almost spent. From now on, at night we only have what we saved during the day.",
            [8] = "The air is 24%. With water and light, plants will survive under glass. They'll make air for us.",
            [9] = "The mine reaches deeper. The geologists say there is iron under the quartz.",
            [10] = "This is not my file. Why does a rescue ship carry plans for a warship?",
            [11] = "The colony breathes on its own now. Time to make it a home.",
        };

        /// <summary>One line after the level-up line, about what comes next (levels.md).</summary>
        public static readonly Dictionary<int, string> LevelHint = new Dictionary<int, string>
        {
            [2] = "Next level we'll have air and food for the first people.",
            [3] = "Every building can take one person. Three people, five buildings: choose.",
            [4] = "Potatoes grow slower, but they feed more. Plant them before you leave.",
            [5] = "Panels are made of silicon. The furnace is the biggest drain on power.",
            [6] = "Soon we'll need to save power for the night.",
            [7] = "That's why we need batteries.",
            [8] = "The greenhouse wants light at night too. The batteries must last for it as well.",
            [9] = "We'll need the iron when we learn to make steel.",
            [10] = "The iron we're piling up will become steel. Then we'll see what this is.",
        };

        public const string Hello = "Good morning, Commander. Did you sleep well?";

        /// <summary>The tutorial (levels.md level 1, concept.md "Първите 10 минути с ЕХО").</summary>
        public static class Tutorial
        {
            public const string Containers = "The containers hold supplies for the first building. Here: the geolocator.";
            public const string Atmo = "At 100% we'll breathe without masks. There's a carbon deposit close by.";
            public const string Collect = "Tap the bubble to bring in the carbon. Without people, buildings only work while you watch.";
            public const string Water = "The geolocator found ice in the shadow of the rocks. Water is life.";
            public const string Processor = "The Ark's oxygen is for the first ones we wake. For everyone, the planet has to breathe.";
            public const string Lab = "We'll need food when we wake the people.";
            public const string Debris = "Something is buried under the debris from the landing. Tap it.";
            public const string Research = "A research station! I'll start the first project: hardened drills.";
            public const string Requirements = "Here's what the Ark needs for level 2. Tap a building to upgrade it.";
            public const string UpgradeArk = "Everything is ready. Tap the Ark and upgrade it.";
        }

        public const string NoBed = "We have work, but nowhere to sleep.";
        public const string NoSeat = "We have beds, but no seat in the kitchen.";
        public const string KitchenFull = "For the ninth we'll need another seat in the kitchen.";
        public const string FirstNight = "Here's why we need batteries.";
        public const string Night = "Night. The panels stop, the people go home, the machines work on their own.";
        public const string BatteryEmpty = "The batteries are empty. The buildings slow down until morning.";
        public const string PowerShort = "Not enough power: the buildings work slower.";
        public const string PowerSurplus = "Power to spare. Soon we'll have to save it for the night.";
        public const string Greenhouse = "For the first time the air grows more from plants than from machines.";
        public const string Iron = "The iron will matter when we learn to make steel.";
        public const string Idle = "Here's the cheapest upgrade.";
        public const string ImpulseReady = "Tap me, then a building: it works twice as fast for 5 minutes.";
        public const string Sketch = "This is not my file. Why does a rescue ship carry plans for a warship?";
        public const string FrameLater = "The frame needs steel. The smelter comes in chapter 2.";
        public const string Chapter2 = "Chapter 1 complete. Chapter 2, \"First Breath\", starts here.";

        // ---------- The colonists (proposal: names, stories and the sentence about Earth) ----------

        public sealed class Person
        {
            public string Name, Story, Earth;
            public Profession Profession;
        }

        /// <summary>The first four of level 3 are fixed: cook, agronomist, geologist, engineer (levels.md).</summary>
        public static readonly List<Person> FirstFour = new List<Person>
        {
            new Person { Name = "Maya Okafor", Profession = Profession.Cook, Story = "Ran a night kitchen in Lagos.",
                Earth = "I remember the smell of rain on hot streets." },
            new Person { Name = "Lena Sorensen", Profession = Profession.Agronomist, Story = "Grew wheat on the last farm in Jutland.",
                Earth = "We had a field so big the sky ended in it." },
            new Person { Name = "Tomas Varga", Profession = Profession.Geologist, Story = "Mapped salt mines under the Carpathians.",
                Earth = "Every stone there had a name I knew." },
            new Person { Name = "Ravi Menon", Profession = Profession.Engineer, Story = "Kept the desalination plants of Chennai running.",
                Earth = "The sea was loud at night. I miss loud." },
        };

        /// <summary>Who wakes for a profession after the first four, in order.</summary>
        public static readonly Dictionary<Profession, List<Person>> Pool = new Dictionary<Profession, List<Person>>
        {
            [Profession.Geologist] = new List<Person>
            {
                new Person { Name = "Ana Lima", Profession = Profession.Geologist, Story = "Studied volcanoes in the Andes.", Earth = "Snow on a volcano is the most honest thing I've seen." },
                new Person { Name = "Jonas Weber", Profession = Profession.Geologist, Story = "Drilled ice cores in Greenland.", Earth = "I counted ten thousand winters in a tube of ice." },
                new Person { Name = "Sofia Ruiz", Profession = Profession.Geologist, Story = "Looked for water under the Sahara.", Earth = "The desert at dawn was blue, not yellow." },
            },
            [Profession.Engineer] = new List<Person>
            {
                new Person { Name = "Kenji Mori", Profession = Profession.Engineer, Story = "Built solar farms on the coast of Japan.", Earth = "My daughter painted the panels with flowers." },
                new Person { Name = "Elif Kaya", Profession = Profession.Engineer, Story = "Ran a steel furnace in Izmir.", Earth = "Tea on the harbour wall, every evening." },
                new Person { Name = "Marek Novak", Profession = Profession.Engineer, Story = "Repaired trams in Prague.", Earth = "The bridges had statues that watched you cross." },
                new Person { Name = "Grace Mensah", Profession = Profession.Engineer, Story = "Wired villages in Ghana to the sun.", Earth = "The first light in a school is a loud thing." },
            },
            [Profession.Agronomist] = new List<Person>
            {
                new Person { Name = "Pablo Herrera", Profession = Profession.Agronomist, Story = "Grew tomatoes under glass in Almeria.", Earth = "A sea of greenhouses, and the real sea behind it." },
                new Person { Name = "Nadia Petrova", Profession = Profession.Agronomist, Story = "Kept a seed bank in Svalbard.", Earth = "I kept a million seeds cold for a day like this." },
            },
            [Profession.Scientist] = new List<Person>
            {
                new Person { Name = "Dr. Hana Sato", Profession = Profession.Scientist, Story = "Read old ship logs for the fleet.", Earth = "Libraries smelled of dust and patience." },
            },
            [Profession.Cook] = new List<Person>
            {
                new Person { Name = "Luca Bianchi", Profession = Profession.Cook, Story = "Cooked on the fleet's flagship.", Earth = "Basil on a windowsill in Genoa." },
            },
        };

        public static string ProfessionName(Profession p) => p switch
        {
            Profession.Cook => "Cook",
            Profession.Agronomist => "Agronomist",
            Profession.Geologist => "Geologist",
            Profession.Engineer => "Engineer",
            Profession.Scientist => "Scientist",
            _ => "",
        };

        /// <summary>The Commander's lines when tapped (concept.md: a short line and the Ark's level).</summary>
        public static readonly string[] Commander =
        {
            "Steady work. The Ark is on level {0}.",
            "One building at a time. Level {0}.",
            "They're counting on us. The Ark is on level {0}.",
        };
    }
}
