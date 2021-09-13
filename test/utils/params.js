const _sizes = ["Camp", "Hamlet", "Village", "Town", "District", "Precinct", "Capitol", "State"];
const _spirits = ["Earth", "Fire", "Water", "Air", "Astral"];
const _ages = [
    "Ancient",
    "Classical",
    "Medieval",
    "Renaissance",
    "Industrial",
    "Modern",
    "Information",
    "Future",
];
const _resources = ["Iron", "Gold", "Silver", "Wood", "Wool", "Water", "Grass", "Grain"];
const _morales = [
    "Expectant",
    "Enlightened",
    "Dismissive",
    "Unhappy",
    "Happy",
    "Undecided",
    "Warring",
    "Scared",
    "Unruly",
    "Anarchist",
];
const _governments = [
    "Democracy",
    "Communism",
    "Socialism",
    "Oligarchy",
    "Aristocracy",
    "Monarchy",
    "Theocracy",
    "Colonialism",
    "Dictatorship",
];
const _realms = ["Genesis", "Valhalla", "Keskella", "Shadow", "Plains", "Ends"];

const civMultipliers = [1, 2, 3, 4, 5, 6, 7, 8];
const realmMultipliers = [6, 5, 4, 3, 2, 1];
const moraleMultipliers = [2, 3, 1, 1, 3, 2, 1, 1, 1, 2];

const climateMultipliers = [5, 4, 3, 2, 1, 1];
const terrainMultipliers = [3, 3, 2, 1];

const speedMultipliers = [10, 15, 35, 40, 40];
const lengthMultipliers = [10, 20, 20, 50, 60];

const names = ["Canoe", "Longship", "Clipper", "Galleon", "Man-of-war"];
const expeditions = ["Trader", "Explorer", "Pirate", "Military", "Diplomat"];
const nameToMaxRouteLength = [2, 3, 4, 5, 5];
const expeditionMultipliers = [3, 2, 2, 1, 1];

const setlNameMultipliers = [1, 2, 2, 4, 4];
const setlExpeditionMultipliers = [1, 3, 1, 2, 2];

module.exports = {
    _sizes,
    _spirits,
    _ages,
    _resources,
    _morales,
    _governments,
    _realms,
    civMultipliers,
    realmMultipliers,
    moraleMultipliers,
    climateMultipliers,
    terrainMultipliers,
    speedMultipliers,
    lengthMultipliers,
    names,
    expeditions,
    nameToMaxRouteLength,
    expeditionMultipliers,
    setlNameMultipliers,
    setlExpeditionMultipliers,
};
