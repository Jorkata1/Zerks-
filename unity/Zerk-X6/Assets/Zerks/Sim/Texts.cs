using System;
using System.Collections.Generic;

namespace Zerks.Sim
{
    /// <summary>
    /// ECHO's lines and the colonists, in English (the game's language, 03.11.2026), chapters 1 to 4. Translated from docs/levels.md
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
            // chapters 3 and 4 (levels.md, "Ковчегът става ниво L")
            [22] = "The frame is ready. Now it needs a skin. One smelter won't be enough.",
            [23] = "We use a lot of water and it runs away. Up there the patches drink only frost.",
            [24] = "Both smelters wait for ore. The mine has to dig more.",
            [25] = "Thirty-five percent. The grass will hold.",
            [26] = "The grass has taken. Now we need something with roots to stop the wind.",
            [27] = "The hull will keep people. Inside it must be warm.",
            [28] = "Thirty-six percent. And behind the smelters a mountain of slag is growing.",
            [29] = "At night we lose the warmth through the walls. The wool is enough for us too.",
            [30] = "The hull is ready, but it has no heart. Here it is.",
            [31] = "Tomas has been drilling since level 3. Five stars, but he doesn't smile anymore. Not only him.",
            [32] = "We learn, we work, but we have nowhere to go out. Outside it's only stone and dust.",
            [33] = "Thirty-three people, more than twenty buildings. I see everything, but nobody plans the shifts.",
            [34] = "Thirty-eight percent. Two more to the blue sky, and the air comes mostly from the greenhouses.",
            [35] = "After every storm half the colony coughs. The doctor sleeps in a pod, with nowhere to see anyone.",
            [36] = "Thirty-six people, and between the homes we still wade in dust. Everyone carries it to the airlock.",
            [37] = "The cameras in orbit see the storm, but not when it will reach us. We need a station down here.",
            [38] = "On level 40 we'll sow fields and forests. Earth's seeds are in the Ark's bank, but only a handful of each.",
            [39] = "The hull is whole, and its heart is almost ready. The fuel is left.",
            [40] = "Forty percent. Look up: the sky is blue.",
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
            // chapters 3 and 4 (proposal)
            [21] = "Two slots: Zone III and lichens. Then tap the Green Belt and plant the patches.",
            [22] = "Tap the dock: the hull's first stage wants 2,000 steel and 100 cables.",
            [23] = "The treatment plant sends the water up to the patches: they grow twice as fast.",
            [24] = "The mine on level 20 opens a fifth place.",
            [25] = "On thin soil, tap a patch: sow grass.",
            [26] = "The nursery's agronomist plants the buckthorn by hand, 20 saplings a patch.",
            [27] = "Stage 3 of the hull wants rock wool between the steel sheets.",
            [28] = "The slag mill gives iron back to the smelters and fertiliser to the patches.",
            [29] = "Tap the brick home, the canteen and each greenhouse: Insulation.",
            [30] = "The glassworks needs lime from the slag mill.",
            [31] = "In the university, choose two to learn each other's work.",
            [32] = "After a storm, tap the sign over the park: the gardener sees to it.",
            [33] = "In the dispatch, choose the buildings it manages: each gives more.",
            [34] = "The fourth greenhouse needs our glass and steel.",
            [35] = "After a storm, tap the sign over the medical post.",
            [36] = "Tap the road depot: pave the streets round the Ark first.",
            [37] = "Before a storm, the station's button prepares the colony.",
            [38] = "In the seed vault: grain for the fields, or seeds for the forests.",
            [39] = "Tap the dock: load the fuel, then the trial run.",
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
        public const string Chapter4 = "Chapter 3 complete. Chapter 4, \"Life\", starts here.";
        public const string Chapter4Done = "Chapter 4 complete. Level 40 and the fields come next.";

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

        // ---------- Chapters 3 and 4 (levels.md, levels 21-39; lines that are not in levels.md are a proposal) ----------

        public const string Zone3 = "The dust is settling over the terrace above the south slope: the Green Belt.";
        public const string Lichens = "Lichens from the Ark's bank. Tap the Green Belt: the patches light up.";
        public const string FirstLichen = "The lichens are on the rock. Their acids crumble it, slowly.";
        public const string FirstMoss = "The first moss on the patches.";
        public const string ThinSoil = "The soil up there is a thin layer now. At 35% we can try grasses.";
        public const string Hydroseeding = "The drone can sow grass on the thin soil now.";
        public const string FirstGrass = "The first patch is green.";
        public const string Buckthorn = "Sea buckthorn: deep roots, nitrogen for the soil, and berries.";
        public const string FirstBuckthorn = "The buckthorn is in, in strips across the slope.";
        public const string SteelSheets = "The fabricator rolls sheets now. Tap the dock: the hull.";
        public const string HullFirst = "The middle of both sides first.";
        public const string HullDone = "It looks like a ship now.";
        public const string Insulation = "Tap the brick home, the canteen and each greenhouse: Insulation.";
        public const string InsulationDone = "The brick home, the canteen and the three greenhouses are insulated.";
        public const string ReactorSketch = "The hull is ready, but it has no heart. Here it is.";
        public const string ReactorLater = "The reactor will grow in the middle of the hull, in four stages, in chapter 4.";
        public const string CleanGlass = "Clearer glass: more light in every greenhouse.";
        public const string ReactorVessel = "The fabricator can forge the vessel now. Tap the dock.";
        public const string Fuel = "Earth sent it for the ship, not for us.";
        public const string FuelIn = "The fuel is in. Tap the dock: the trial run.";
        public const string TrialRun = "The heart beats. Now it will sleep until the engines come.";
        public static string ReactorStage(int n) => n == 1 ? "This is where its heart will beat." : n == 2 ? "The vessel is in its compartment." : "The pipes, the pumps and the turbine are in.";
        public const string WeatherBlueprint = "The weather station goes on the highest terrace.";

        public const string FirstStorm = "I can't see the sun. The panels have almost stopped; the batteries are taking over.";
        public const string FirstStormEnd = "That's why the seedlings must stand dust. Outside there will be days like this.";
        public const string Storm = "A dust storm. The panels give little; the batteries hold. Nothing breaks.";
        public const string StormEnd = "The storm has passed. The panels' worker is cleaning them, and there are stones to pick up.";
        public const string StormWarning = "The cameras in orbit see a storm coming. About an hour.";
        public static string StormForecast(double minutes, string strength) =>
            $"A {strength} storm in about {(minutes >= 90 ? $"{Math.Round(minutes / 60)} hours" : "an hour")}. The station's button prepares the colony.";
        public const string Prepared = "The panels turn their edge to the wind, the covers come down, the robot comes home, the batteries are full.";

        public const string StudyStarts = "They'll learn in the evenings, without stopping work.";
        public const string StudyDone = "They've both learned. Tap the university: swap them.";
        public const string FirstSwap = "{0} goes to the {1}, {2} to the {3}. Both smile again.";
        public const string Swap = "The swap is done. New work, and the old stars are kept.";
        public const string FirstPaved = "The first paved street. Less dust in the airlocks.";
        public const string PlazaPaved = "The square round the Ark is paved. For the first time the colony looks like a town.";
        public const string FirstSprout = "The rye has sprouted.";

        public const string Smelter2 = "Two smelters now. The panels and the batteries must keep up.";
        public const string Treatment = "The water comes down from the homes on its own and goes up to the Green Belt.";
        public const string FieldStation = "The agronomist will gather the grass seeds: the belt will sow itself.";
        public const string Nursery = "The seeds sprout under the glass; in the yard the saplings get used to the cold.";
        public const string WoolWorks = "Stone into wool. It eats a lot of power.";
        public const string SlagMill = "The slag goes: the iron back to the smelters, the fertiliser up to the Green Belt.";
        public const string Glassworks = "The last panes from the containers went to the greenhouses. Now we make our own.";
        public const string University = "Now two can learn each other's work in the evenings.";
        public const string Park = "The first place where we simply rest.";
        public const string Dispatch = "Choose the buildings to manage. I'd start with the smelter and the glassworks.";
        public const string Greenhouse4 = "The first greenhouse all of our own glass.";
        public const string MedPost = "A doctor, at last. After a storm, tap the sign over the post.";
        public const string RoadDepot = "Tap the road depot to pave a street. Round the Ark first.";
        public const string Weather = "Now we'll know when the storm comes, and how strong.";
        public const string SeedVault = "Earth's seeds are safe here, frozen without power.";

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
                // chapters 3 and 4 (proposal)
                new Person { Name = "Arjun Patel", Profession = Profession.Geologist, Story = "Ran an iron mine in the hills of Odisha.", Earth = "The red dust got into everything, even the songs." },
                new Person { Name = "Freya Lund", Profession = Profession.Geologist, Story = "Sorted the slag heaps of an old steelworks for iron.", Earth = "We turned a black hill into a green one." },
                new Person { Name = "Kwame Asante", Profession = Profession.Geologist, Story = "Followed gold in the rivers of Ghana.", Earth = "The river told you where to dig, if you listened." },
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
                // chapters 3 and 4 (proposal)
                new Person { Name = "Tariq Aziz", Profession = Profession.Engineer, Story = "Ran a water plant on the Nile.", Earth = "Clean water out of a dirty river feels like magic every time." },
                new Person { Name = "Hanna Virtanen", Profession = Profession.Engineer, Story = "Spun rock wool in a Finnish works.", Earth = "Inside the spinners the stone turns to cotton." },
                new Person { Name = "Lucas Moreau", Profession = Profession.Engineer, Story = "Kept a second furnace going in Lorraine.", Earth = "The old mill town sang when the furnace was lit." },
                new Person { Name = "Zainab Bello", Profession = Profession.Engineer, Story = "Ground slag into cement in Lagos.", Earth = "We built a whole school from what others threw away." },
                new Person { Name = "Matteo Ricci", Profession = Profession.Engineer, Story = "Blew glass on Murano, then rolled it in a plant.", Earth = "Glass is sand that remembers the fire." },
                new Person { Name = "Soo-ah Park", Profession = Profession.Engineer, Story = "Ran a float glass line in Busan.", Earth = "A sheet of glass a kilometre long, and not one crack." },
                new Person { Name = "Emre Demir", Profession = Profession.Engineer, Story = "Kept the furnaces of a glassworks in Anatolia.", Earth = "My grandfather made bottles; I made windows." },
                new Person { Name = "Nora Quinn", Profession = Profession.Engineer, Story = "Kept the grid of an island in Scotland.", Earth = "When the wind blew, the whole island had light." },
            },
            [Profession.Agronomist] = new List<Person>
            {
                new Person { Name = "Pablo Herrera", Profession = Profession.Agronomist, Story = "Grew tomatoes under glass in Almeria.", Earth = "A sea of greenhouses, and the real sea behind it." },
                new Person { Name = "Nadia Petrova", Profession = Profession.Agronomist, Story = "Kept a seed bank in Svalbard.", Earth = "I kept a million seeds cold for a day like this." },
                new Person { Name = "Amara Diallo", Profession = Profession.Agronomist, Story = "Grew millet at the edge of the Sahel.", Earth = "We planted trees against the sand, one row a year." },
                new Person { Name = "Tom Fischer", Profession = Profession.Agronomist, Story = "Ran a tomato greenhouse in the Netherlands.", Earth = "In winter the glass houses glowed pink for miles." },
                new Person { Name = "Yuki Tanaka", Profession = Profession.Agronomist, Story = "Bred rice for cold mountain valleys.", Earth = "The terraces held the sky like mirrors." },
                // chapters 3 and 4 (proposal)
                new Person { Name = "Bayarmaa Dorj", Profession = Profession.Agronomist, Story = "Sowed grass on the eroded steppe of Mongolia.", Earth = "The steppe was green for a month, and we lived for that month." },
                new Person { Name = "Liu Wei", Profession = Profession.Agronomist, Story = "Planted sea buckthorn on the Loess Plateau.", Earth = "Our shrubs held a whole hillside together." },
                new Person { Name = "Elena Popescu", Profession = Profession.Agronomist, Story = "Kept a city park in Bucharest.", Earth = "Old people played chess under my lime trees." },
                new Person { Name = "Samuel Okoro", Profession = Profession.Agronomist, Story = "Grew tomatoes in a greenhouse on a roof in Nairobi.", Earth = "From the roof you could see the giraffes on the edge of town." },
                new Person { Name = "Ingeborg Dahl", Profession = Profession.Agronomist, Story = "Kept the seed vault of the north.", Earth = "Rye from a thousand years ago still sprouted for me." },
                new Person { Name = "Rafael Costa", Profession = Profession.Agronomist, Story = "Bred cold rye in the south of Brazil.", Earth = "Frost on the fields at dawn, and the rye still standing." },
            },
            [Profession.Scientist] = new List<Person>
            {
                new Person { Name = "Dr. Hana Sato", Profession = Profession.Scientist, Story = "Read old ship logs for the fleet.", Earth = "Libraries smelled of dust and patience." },
                // chapters 3 and 4 (proposal)
                new Person { Name = "Prof. Daniel Adeyemi", Profession = Profession.Scientist, Story = "Taught engineering to farmers' children in Ibadan.", Earth = "The best questions came from the back row." },
                new Person { Name = "Dr. Astrid Nyberg", Profession = Profession.Scientist, Story = "Measured dust storms with a lidar in the Sahara.", Earth = "A green line into the night sky, and the dust answered." },
                new Person { Name = "Dr. Kofi Mensah", Profession = Profession.Scientist, Story = "Forecast monsoons for the fishermen of Kerala.", Earth = "They trusted my maps with their boats." },
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
                new Person { Name = "Mateus Silva", Profession = Profession.Builder, Story = "Laid the stone streets of Lisbon.", Earth = "Every paver in the old town was put down by a hand." },
            },
            // chapters 3 and 4: the new professions (levels.md 33, 35, 36; proposal)
            [Profession.Dispatcher] = new List<Person>
            {
                new Person { Name = "Ilse Brandt", Profession = Profession.Dispatcher, Story = "Ran the control room of a steelworks in the Ruhr.", Earth = "Forty screens, and I knew every machine by its sound." },
            },
            [Profession.Doctor] = new List<Person>
            {
                new Person { Name = "Dr. Amina Yusuf", Profession = Profession.Doctor, Story = "Was a doctor in a mining town in the desert.", Earth = "After a sandstorm the whole town came to my door." },
            },
            [Profession.Technician] = new List<Person>
            {
                new Person { Name = "Viktor Horak", Profession = Profession.Technician, Story = "Kept the streets of Brno clean at night.", Earth = "At four in the morning the city belonged to me." },
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
            Profession.Dispatcher => "Dispatcher",
            Profession.Doctor => "Doctor",
            Profession.Technician => "Technician",
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
