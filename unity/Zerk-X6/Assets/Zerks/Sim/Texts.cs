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
            [12] = "The Ark opens its dock. The fabricator makes the beams from steel, the cranes set them.",
            [13] = "The drone manages, but no one leads it. In the pods there are people who have built cities.",
            [14] = "The geologists say there's copper under the iron. We'll need it for the cables and for the ship.",
            [15] = "Our home is made of the canyon's stone. The next one will be of bricks we baked ourselves.",
            [16] = "More grows under the glass than we need for air. Let's try some for eating.",
            [17] = "The plants in the greenhouses are strong. Some will survive outside, once we have soil.",
            [18] = "The antenna hasn't worked since the landing. Let's see what it hears.",
            [19] = "The cable from the containers is running out. The copper from the mine has to become cables.",
            [20] = "It's not only the frame. There will be a hull. Whoever put these files here knew what was waiting for us.",
            [21] = "The colony breathes. The seedlings are ready, and the hardiest plants can go outside.",
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
            [11] = "We have air and food. What's left is the iron. If we make it into steel, we'll see what this frame is.",
            [12] = "Tap the dock next to the Ark: the first stage of the frame wants 200 steel.",
            [13] = "The clay by the ice is for the bricks of the next home.",
            [14] = "The mine on level 15 reaches the copper. The lab on 15 grows wheat.",
            [15] = "The smelter and the kiln both eat a lot of power. Watch the panels and the batteries.",
            [16] = "The first greenhouse on level 16: in its panel, air only, or air and food.",
            [17] = "A seedling bed in each greenhouse. While seedlings grow there, it gives 10% less of the rest.",
            [18] = "The copper bars make the batteries last longer. They cost 200 copper ore.",
            [19] = "The new buildings on the next level will want our own cables.",
            [20] = "The next home will be of our bricks and with our cables.",
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
        public const string Chapter3 = "Chapter 2 complete. Chapter 3, \"Green Belt\", starts here.";

        // ---------- Chapter 2 (levels.md, levels 11-20; lines that are not in levels.md are a proposal) ----------

        public const string SmelterSmoke = "Same as with the furnace. We know how to fix it.";
        public const string DockOpen = "The drone has printed the dock next to the Ark. The ship will grow there.";
        public const string FrameFirst = "The ship will be bigger than the Ark. Someone thought about this long before we took off.";
        public const string FrameDone = "The frame stands whole in the dock.";
        public const string Console = "The builder's console is ready. A builder in the Ark leads the drone: builds and upgrades go faster.";
        public const string GreenhouseFood = "Level 16: the greenhouse can give food too. Air only, or air and food: it's in its panel.";
        public const string Seedbeds = "Hardy seedlings: each greenhouse can grow a seedling bed. Turn it on in its panel.";
        public const string AntennaFixed = "The containers up there hear us. We can see the planet from above now.";
        public const string Signal = "I hear something. It may be from the fleet. It may be nothing.";
        public const string HomeFull = "The next one we wake won't have a bed here.";
        public const string BrickHome = "The next home will be of our bricks and with our cables.";
        public const string HullSketch = "It's not only the frame. There will be a hull. Whoever put these files here knew what was waiting for us.";
        public const string HullLater = "The hull will be built in the dock in chapter 3, from steel, with our cables.";

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
                new Person { Name = "Aiyana Begay", Profession = Profession.Geologist, Story = "Read the clay of river banks in Arizona.", Earth = "After rain the red earth smelled like iron and bread." },
                new Person { Name = "Piotr Zielinski", Profession = Profession.Geologist, Story = "Ran a copper mine in Silesia.", Earth = "Down there you hear the whole mountain breathe." },
                new Person { Name = "Mei Lin", Profession = Profession.Geologist, Story = "Mapped the karst of Guilin.", Earth = "The hills stood in the river like teeth in mist." },
            },
            [Profession.Engineer] = new List<Person>
            {
                new Person { Name = "Kenji Mori", Profession = Profession.Engineer, Story = "Built solar farms on the coast of Japan.", Earth = "My daughter painted the panels with flowers." },
                new Person { Name = "Elif Kaya", Profession = Profession.Engineer, Story = "Ran a steel furnace in Izmir.", Earth = "Tea on the harbour wall, every evening." },
                new Person { Name = "Marek Novak", Profession = Profession.Engineer, Story = "Repaired trams in Prague.", Earth = "The bridges had statues that watched you cross." },
                new Person { Name = "Grace Mensah", Profession = Profession.Engineer, Story = "Wired villages in Ghana to the sun.", Earth = "The first light in a school is a loud thing." },
                new Person { Name = "Olaf Berg", Profession = Profession.Engineer, Story = "Kept a brickworks running in Norway.", Earth = "The kiln was the warmest room in the whole valley." },
                new Person { Name = "Farah Haddad", Profession = Profession.Engineer, Story = "Built power lines across Jordan.", Earth = "From the pylons you could see three countries." },
                new Person { Name = "Diego Santos", Profession = Profession.Engineer, Story = "Drew copper wire in Chile.", Earth = "The wire came off the drum singing." },
                new Person { Name = "Ingrid Holm", Profession = Profession.Engineer, Story = "Rolled steel in Sweden.", Earth = "Hot steel at night lights the whole hall orange." },
            },
            [Profession.Agronomist] = new List<Person>
            {
                new Person { Name = "Pablo Herrera", Profession = Profession.Agronomist, Story = "Grew tomatoes under glass in Almeria.", Earth = "A sea of greenhouses, and the real sea behind it." },
                new Person { Name = "Nadia Petrova", Profession = Profession.Agronomist, Story = "Kept a seed bank in Svalbard.", Earth = "I kept a million seeds cold for a day like this." },
                new Person { Name = "Amara Diallo", Profession = Profession.Agronomist, Story = "Grew millet at the edge of the Sahel.", Earth = "We planted trees against the sand, one row a year." },
                new Person { Name = "Tom Fischer", Profession = Profession.Agronomist, Story = "Ran a tomato greenhouse in the Netherlands.", Earth = "In winter the glass houses glowed pink for miles." },
                new Person { Name = "Yuki Tanaka", Profession = Profession.Agronomist, Story = "Bred rice for cold mountain valleys.", Earth = "The terraces held the sky like mirrors." },
            },
            [Profession.Scientist] = new List<Person>
            {
                new Person { Name = "Dr. Hana Sato", Profession = Profession.Scientist, Story = "Read old ship logs for the fleet.", Earth = "Libraries smelled of dust and patience." },
            },
            [Profession.Cook] = new List<Person>
            {
                new Person { Name = "Luca Bianchi", Profession = Profession.Cook, Story = "Cooked on the fleet's flagship.", Earth = "Basil on a windowsill in Genoa." },
                new Person { Name = "Rosa Alvarez", Profession = Profession.Cook, Story = "Fed a whole street in Oaxaca every Sunday.", Earth = "The market smelled of chili and wet stone." },
            },
            [Profession.Builder] = new List<Person>
            {
                new Person { Name = "Hamid Rahimi", Profession = Profession.Builder, Story = "Built new towns on the coast of the Gulf.", Earth = "A crane at sunset is the most patient thing in the world." },
                new Person { Name = "Clara Moreau", Profession = Profession.Builder, Story = "Printed houses from earth in the south of France.", Earth = "Our walls were the colour of the fields around them." },
            },
        };

        public static string ProfessionName(Profession p) => p switch
        {
            Profession.Cook => "Cook",
            Profession.Agronomist => "Agronomist",
            Profession.Geologist => "Geologist",
            Profession.Engineer => "Engineer",
            Profession.Scientist => "Scientist",
            Profession.Builder => "Builder",
            _ => "",
        };

        /// <summary>Someone the lists above do not hold any more (they run out only past chapter 2).</summary>
        public static Person Anyone(Profession p, int id) => new Person
        {
            Name = $"Colonist {id}", Profession = p, Story = $"{ProfessionName(p)} from the fleet.", Earth = "I remember the sea.",
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
