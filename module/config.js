import {ClassFeatures} from "./classFeatures.js";

// Namespace Configuration Values
export const SKJAALD = {};

// ASCII Artwork
SKJAALD.ASCII = `_______________________________
______      ______ _____ _____
|  _  \\___  |  _  \\  ___|  ___|
| | | ( _ ) | | | |___ \\| |__
| | | / _ \\/\\ | | |   \\ \\  __|
| |/ / (_>  < |/ //\\__/ / |___
|___/ \\___/\\/___/ \\____/\\____/
_______________________________`;


/**
 * The set of Ability Scores used within the system.
 * @enum {string}
 */
SKJAALD.abilities = {
  str: "SKJAALD.AbilityStr",
  dex: "SKJAALD.AbilityDex",
  con: "SKJAALD.AbilityCon",
  int: "SKJAALD.AbilityInt",
  wis: "SKJAALD.AbilityWis",
  cha: "SKJAALD.AbilityCha"
};

/**
 * Localized abbreviations for Ability Scores.
 * @enum {string}
 */
SKJAALD.abilityAbbreviations = {
  str: "SKJAALD.AbilityStrAbbr",
  dex: "SKJAALD.AbilityDexAbbr",
  con: "SKJAALD.AbilityConAbbr",
  int: "SKJAALD.AbilityIntAbbr",
  wis: "SKJAALD.AbilityWisAbbr",
  cha: "SKJAALD.AbilityChaAbbr"
};

/* -------------------------------------------- */

/**
 * Character alignment options.
 * @enum {string}
 */
SKJAALD.alignments = {
  lg: "SKJAALD.AlignmentLG",
  ng: "SKJAALD.AlignmentNG",
  cg: "SKJAALD.AlignmentCG",
  ln: "SKJAALD.AlignmentLN",
  tn: "SKJAALD.AlignmentTN",
  cn: "SKJAALD.AlignmentCN",
  le: "SKJAALD.AlignmentLE",
  ne: "SKJAALD.AlignmentNE",
  ce: "SKJAALD.AlignmentCE"
};

/* -------------------------------------------- */

/**
 * An enumeration of item attunement types.
 * @enum {number}
 */
SKJAALD.attunementTypes = {
  NONE: 0,
  REQUIRED: 1,
  ATTUNED: 2
};

/**
 * An enumeration of item attunement states.
 * @type {{"0": string, "1": string, "2": string}}
 */
SKJAALD.attunements = {
  0: "SKJAALD.AttunementNone",
  1: "SKJAALD.AttunementRequired",
  2: "SKJAALD.AttunementAttuned"
};

/* -------------------------------------------- */

/**
 * General weapon categories.
 * @enum {string}
 */
SKJAALD.weaponProficiencies = {
  sim: "SKJAALD.WeaponSimpleProficiency",
  mar: "SKJAALD.WeaponMartialProficiency",
  bas: "SKJAALD.WeaponBasicProficiency",
  com: "SKJAALD.WeaponCombatProficiency",
  eli: "SKJAALD.WeaponEliteProficiency",
  spec: "SKJAALD.WeaponSpecialProficiency"
};

/**
 * A mapping between `SKJAALD.weaponTypes` and `SKJAALD.weaponProficiencies` that
 * is used to determine if character has proficiency when adding an item.
 * @enum {(boolean|string)}
 */
SKJAALD.weaponProficienciesMap = {
  natural: true,
  simpleM: "sim",
  simpleR: "sim",
  basicM: "bas",
  basicR: "bas",
  combatM: "com",
  combatR: "com",
  martialM: "mar",
  martialR: "mar",
  eliteM: "eli",
  eliteR: "eli",
  specM: "spec",
  specR: "spec"
};

/**
 * The basic weapon types in 5e. This enables specific weapon proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
SKJAALD.weaponIds = {
  battleaxe: "I0WocDSuNpGJayPb",
  blowgun: "wNWK6yJMHG9ANqQV",
  club: "nfIRTECQIG81CvM4",
  dagger: "0E565kQUBmndJ1a2",
  dart: "3rCO8MTIdPGSW6IJ",
  flail: "UrH3sMdnUDckIHJ6",
  glaive: "rOG1OM2ihgPjOvFW",
  greataxe: "1Lxk6kmoRhG8qQ0u",
  greatclub: "QRCsxkCwWNwswL9o",
  greatsword: "xMkP8BmFzElcsMaR",
  halberd: "DMejWAc8r8YvDPP1",
  handaxe: "eO7Fbv5WBk5zvGOc",
  handcrossbow: "qaSro7kFhxD6INbZ",
  heavycrossbow: "RmP0mYRn2J7K26rX",
  javelin: "DWLMnODrnHn8IbAG",
  lance: "RnuxdHUAIgxccVwj",
  lightcrossbow: "ddWvQRLmnnIS0eLF",
  lighthammer: "XVK6TOL4sGItssAE",
  longbow: "3cymOVja8jXbzrdT",
  longsword: "10ZP2Bu3vnCuYMIB",
  mace: "Ajyq6nGwF7FtLhDQ",
  maul: "DizirD7eqjh8n95A",
  morningstar: "dX8AxCh9o0A9CkT3",
  net: "aEiM49V8vWpWw7rU",
  pike: "tC0kcqZT9HHAO0PD",
  quarterstaff: "g2dWN7PQiMRYWzyk",
  rapier: "Tobce1hexTnDk4sV",
  scimitar: "fbC0Mg1a73wdFbqO",
  shortsword: "osLzOwQdPtrK3rQH",
  sickle: "i4NeNZ30ycwPDHMx",
  spear: "OG4nBBydvmfWYXIk",
  shortbow: "GJv6WkD7D2J6rP6M",
  sling: "3gynWO9sN4OLGMWD",
  trident: "F65ANO66ckP8FDMa",
  warpick: "2YdfjN1PIIrSHZii",
  warhammer: "F0Df164Xv1gWcYt0",
  whip: "QKTyxoO0YDnAsbYe"
};

/* -------------------------------------------- */

/**
 * The categories into which Tool items can be grouped.
 *
 * @enum {string}
 */
SKJAALD.toolTypes = {
  art: "SKJAALD.ToolArtisans",
  game: "SKJAALD.ToolGamingSet",
  music: "SKJAALD.ToolMusicalInstrument"
};

/**
 * The categories of tool proficiencies that a character can gain.
 *
 * @enum {string}
 */
SKJAALD.toolProficiencies = {
  ...SKJAALD.toolTypes,
  vehicle: "SKJAALD.ToolVehicle"
};

/**
 * The basic tool types in 5e. This enables specific tool proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
SKJAALD.toolIds = {
  alchemist: "SztwZhbhZeCqyAes",
  bagpipes: "yxHi57T5mmVt0oDr",
  brewer: "Y9S75go1hLMXUD48",
  calligrapher: "jhjo20QoiD5exf09",
  card: "YwlHI3BVJapz4a3E",
  carpenter: "8NS6MSOdXtUqD7Ib",
  cartographer: "fC0lFK8P4RuhpfaU",
  chess: "23y8FvWKf9YLcnBL",
  cobbler: "hM84pZnpCqKfi8XH",
  cook: "Gflnp29aEv5Lc1ZM",
  dice: "iBuTM09KD9IoM5L8",
  disg: "IBhDAr7WkhWPYLVn",
  drum: "69Dpr25pf4BjkHKb",
  dulcimer: "NtdDkjmpdIMiX7I2",
  flute: "eJOrPcAz9EcquyRQ",
  forg: "cG3m4YlHfbQlLEOx",
  glassblower: "rTbVrNcwApnuTz5E",
  herb: "i89okN7GFTWHsvPy",
  horn: "aa9KuBy4dst7WIW9",
  jeweler: "YfBwELTgPFHmQdHh",
  leatherworker: "PUMfwyVUbtyxgYbD",
  lute: "qBydtUUIkv520DT7",
  lyre: "EwG1EtmbgR3bM68U",
  mason: "skUih6tBvcBbORzA",
  navg: "YHCmjsiXxZ9UdUhU",
  painter: "ccm5xlWhx74d6lsK",
  panflute: "G5m5gYIx9VAUWC3J",
  pois: "il2GNi8C0DvGLL9P",
  potter: "hJS8yEVkqgJjwfWa",
  shawm: "G3cqbejJpfB91VhP",
  smith: "KndVe2insuctjIaj",
  thief: "woWZ1sO5IUVGzo58",
  tinker: "0d08g1i5WXnNrCNA",
  viol: "baoe3U5BfMMMxhCU",
  weaver: "ap9prThUB2y9lDyj",
  woodcarver: "xKErqkLo4ASYr5EP"
};

/* -------------------------------------------- */

/**
 * The various lengths of time over which effects can occur.
 * @enum {string}
 */
SKJAALD.timePeriods = {
  inst: "SKJAALD.TimeInst",
  turn: "SKJAALD.TimeTurn",
  round: "SKJAALD.TimeRound",
  minute: "SKJAALD.TimeMinute",
  hour: "SKJAALD.TimeHour",
  day: "SKJAALD.TimeDay",
  month: "SKJAALD.TimeMonth",
  year: "SKJAALD.TimeYear",
  perm: "SKJAALD.TimePerm",
  spec: "SKJAALD.Special"
};

/* -------------------------------------------- */

/**
 * Various ways in which an item or ability can be activated.
 * @enum {string}
 */
SKJAALD.abilityActivationTypes = {
  none: "SKJAALD.None",
  action: "SKJAALD.Action",
  bonus: "SKJAALD.HalfAction",
  reaction: "SKJAALD.Reaction",
  minute: SKJAALD.timePeriods.minute,
  hour: SKJAALD.timePeriods.hour,
  day: SKJAALD.timePeriods.day,
  special: SKJAALD.timePeriods.spec,
  legendary: "SKJAALD.LegendaryActionLabel",
  lair: "SKJAALD.LairActionLabel",
  crew: "SKJAALD.VehicleCrewAction"
};

/* -------------------------------------------- */

/**
 * Different things that an ability can consume upon use.
 * @enum {string}
 */
SKJAALD.abilityConsumptionTypes = {
  ammo: "SKJAALD.ConsumeAmmunition",
  attribute: "SKJAALD.ConsumeAttribute",
  material: "SKJAALD.ConsumeMaterial",
  charges: "SKJAALD.ConsumeCharges"
};

/* -------------------------------------------- */

/**
 * Creature sizes.
 * @enum {string}
 */
SKJAALD.actorSizes = {
  tiny: "SKJAALD.SizeTiny",
  sm: "SKJAALD.SizeSmall",
  med: "SKJAALD.SizeMedium",
  lg: "SKJAALD.SizeLarge",
  huge: "SKJAALD.SizeHuge",
  grg: "SKJAALD.SizeGargantuan"
};

/**
 * Default token image size for the values of `SKJAALD.actorSizes`.
 * @enum {number}
 */
SKJAALD.tokenSizes = {
  tiny: 0.5,
  sm: 1,
  med: 1,
  lg: 2,
  huge: 3,
  grg: 4
};

/**
 * Colors used to visualize temporary and temporary maximum HP in token health bars.
 * @enum {number}
 */
SKJAALD.tokenHPColors = {
  damage: 0xFF0000,
  healing: 0x00FF00,
  temp: 0x66CCFF,
  tempmax: 0x440066,
  negmax: 0x550000
};

/* -------------------------------------------- */

/**
 * Default types of creatures.
 * @enum {string}
 */
SKJAALD.creatureTypes = {
  aberration: "SKJAALD.CreatureAberration",
  beast: "SKJAALD.CreatureBeast",
  celestial: "SKJAALD.CreatureCelestial",
  construct: "SKJAALD.CreatureConstruct",
  dragon: "SKJAALD.CreatureDragon",
  elemental: "SKJAALD.CreatureElemental",
  fey: "SKJAALD.CreatureFey",
  fiend: "SKJAALD.CreatureFiend",
  giant: "SKJAALD.CreatureGiant",
  humanoid: "SKJAALD.CreatureHumanoid",
  monstrosity: "SKJAALD.CreatureMonstrosity",
  ooze: "SKJAALD.CreatureOoze",
  plant: "SKJAALD.CreaturePlant",
  undead: "SKJAALD.CreatureUndead"
};

/* -------------------------------------------- */

/**
 * Classification types for item action types.
 * @enum {string}
 */
SKJAALD.itemActionTypes = {
  mwak: "SKJAALD.ActionMWAK",
  rwak: "SKJAALD.ActionRWAK",
  msak: "SKJAALD.ActionMSAK",
  rsak: "SKJAALD.ActionRSAK",
  save: "SKJAALD.ActionSave",
  heal: "SKJAALD.ActionHeal",
  abil: "SKJAALD.ActionAbil",
  util: "SKJAALD.ActionUtil",
  other: "SKJAALD.ActionOther"
};

/* -------------------------------------------- */

/**
 * Different ways in which item capacity can be limited.
 * @enum {string}
 */
SKJAALD.itemCapacityTypes = {
  items: "SKJAALD.ItemContainerCapacityItems",
  weight: "SKJAALD.ItemContainerCapacityWeight"
};

/* -------------------------------------------- */

/**
 * List of various item rarities.
 * @enum {string}
 */
SKJAALD.itemRarity = {
  common: "SKJAALD.ItemRarityCommon",
  uncommon: "SKJAALD.ItemRarityUncommon",
  rare: "SKJAALD.ItemRarityRare",
  veryRare: "SKJAALD.ItemRarityVeryRare",
  legendary: "SKJAALD.ItemRarityLegendary",
  artifact: "SKJAALD.ItemRarityArtifact"
};

/* -------------------------------------------- */

/**
 * Enumerate the lengths of time over which an item can have limited use ability.
 * @enum {string}
 */
SKJAALD.limitedUsePeriods = {
  sr: "SKJAALD.ShortRest",
  lr: "SKJAALD.LongRest",
  day: "SKJAALD.Day",
  charges: "SKJAALD.Charges"
};

/* -------------------------------------------- */

/**
 * Specific equipment types that modify base AC.
 * @enum {string}
 */
SKJAALD.armorTypes = {
  light: "SKJAALD.EquipmentLight",
  medium: "SKJAALD.EquipmentMedium",
  heavy: "SKJAALD.EquipmentHeavy",
  natural: "SKJAALD.EquipmentNatural",
  shield: "SKJAALD.EquipmentShield"
};

/* -------------------------------------------- */

/**
 * Equipment types that aren't armor.
 * @enum {string}
 */
SKJAALD.miscEquipmentTypes = {
  clothing: "SKJAALD.EquipmentClothing",
  trinket: "SKJAALD.EquipmentTrinket",
  vehicle: "SKJAALD.EquipmentVehicle"
};

/* -------------------------------------------- */

/**
 * The set of equipment types for armor, clothing, and other objects which can be worn by the character.
 * @enum {string}
 */
SKJAALD.equipmentTypes = {
  ...SKJAALD.miscEquipmentTypes,
  ...SKJAALD.armorTypes
};

/* -------------------------------------------- */

/**
 * The various types of vehicles in which characters can be proficient.
 * @enum {string}
 */
SKJAALD.vehicleTypes = {
  air: "SKJAALD.VehicleTypeAir",
  land: "SKJAALD.VehicleTypeLand",
  water: "SKJAALD.VehicleTypeWater"
};

/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have.
 * @type {object}
 */
SKJAALD.armorProficiencies = {
  lgt: SKJAALD.equipmentTypes.light,
  med: SKJAALD.equipmentTypes.medium,
  hvy: SKJAALD.equipmentTypes.heavy,
  shl: "SKJAALD.EquipmentShieldProficiency"
};

/**
 * A mapping between `SKJAALD.equipmentTypes` and `SKJAALD.armorProficiencies` that
 * is used to determine if character has proficiency when adding an item.
 * @enum {(boolean|string)}
 */
SKJAALD.armorProficienciesMap = {
  natural: true,
  clothing: true,
  light: "lgt",
  medium: "med",
  heavy: "hvy",
  shield: "shl"
};

/**
 * The basic armor types in 5e. This enables specific armor proficiencies,
 * automated AC calculation in NPCs, and starting equipment.
 * @enum {string}
 */
SKJAALD.armorIds = {
  breastplate: "SK2HATQ4abKUlV8i",
  chainmail: "rLMflzmxpe8JGTOA",
  chainshirt: "p2zChy24ZJdVqMSH",
  halfplate: "vsgmACFYINloIdPm",
  hide: "n1V07puo0RQxPGuF",
  leather: "WwdpHLXGX5r8uZu5",
  padded: "GtKV1b5uqFQqpEni",
  plate: "OjkIqlW2UpgFcjZa",
  ringmail: "nsXZejlmgalj4he9",
  scalemail: "XmnlF5fgIO3tg6TG",
  splint: "cKpJmsJmU8YaiuqG",
  studded: "TIV3B1vbrVHIhQAm"
};

/**
 * The basic shield in 5e.
 * @enum {string}
 */
SKJAALD.shieldIds = {
  shield: "sSs3hSzkKBMNBgTs"
};

/**
 * Common armor class calculations.
 * @enum {{ label: string, [formula]: string }}
 */
SKJAALD.armorClasses = {
  flat: {
    label: "SKJAALD.ArmorClassFlat",
    formula: "@attributes.ac.flat"
  },
  natural: {
    label: "SKJAALD.ArmorClassNatural",
    formula: "@attributes.ac.flat"
  },
  default: {
    label: "SKJAALD.ArmorClassEquipment",
    formula: "@attributes.ac.base + @abilities.dex.mod"
  },
  mage: {
    label: "SKJAALD.ArmorClassMage",
    formula: "13 + @abilities.dex.mod"
  },
  draconic: {
    label: "SKJAALD.ArmorClassDraconic",
    formula: "13 + @abilities.dex.mod"
  },
  unarmoredMonk: {
    label: "SKJAALD.ArmorClassUnarmoredMonk",
    formula: "10 + @abilities.dex.mod + @abilities.wis.mod"
  },
  unarmoredBarb: {
    label: "SKJAALD.ArmorClassUnarmoredBarbarian",
    formula: "10 + @abilities.dex.mod + @abilities.con.mod"
  },
  custom: {
    label: "SKJAALD.ArmorClassCustom"
  }
};

/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system.
 * @enum {string}
 */
SKJAALD.consumableTypes = {
  ammo: "SKJAALD.ConsumableAmmunition",
  potion: "SKJAALD.ConsumablePotion",
  poison: "SKJAALD.ConsumablePoison",
  food: "SKJAALD.ConsumableFood",
  scroll: "SKJAALD.ConsumableScroll",
  wand: "SKJAALD.ConsumableWand",
  rod: "SKJAALD.ConsumableRod",
  trinket: "SKJAALD.ConsumableTrinket"
};

/* -------------------------------------------- */

/**
 * The valid currency denominations with localized labels, abbreviations, and conversions.
 * @enum {{
 *   label: string,
 *   abbreviation: string,
 *   [conversion]: {into: string, each: number}
 * }}
 */
SKJAALD.currencies = {
  pp: {
    label: "SKJAALD.CurrencyPP",
    abbreviation: "SKJAALD.CurrencyAbbrPP"
  },
  gp: {
    label: "SKJAALD.CurrencyGP",
    abbreviation: "SKJAALD.CurrencyAbbrGP",
    conversion: {into: "pp", each: 10}
  },
  ep: {
    label: "SKJAALD.CurrencyEP",
    abbreviation: "SKJAALD.CurrencyAbbrEP",
    conversion: {into: "gp", each: 2}
  },
  sp: {
    label: "SKJAALD.CurrencySP",
    abbreviation: "SKJAALD.CurrencyAbbrSP",
    conversion: {into: "ep", each: 5}
  },
  cp: {
    label: "SKJAALD.CurrencyCP",
    abbreviation: "SKJAALD.CurrencyAbbrCP",
    conversion: {into: "sp", each: 10}
  }
};

/* -------------------------------------------- */

/**
 * Types of damage the can be caused by abilities.
 * @enum {string}
 */
SKJAALD.damageTypes = {
  acid: "SKJAALD.DamageAcid",
  bludgeoning: "SKJAALD.DamageBludgeoning",
  cold: "SKJAALD.DamageCold",
  drakeFire: "SKJAALD.DamageDrakeFire",
  drakeFrost: "SKJAALD.DamageDrakeFrost",
  fire: "SKJAALD.DamageFire",
  force: "SKJAALD.DamageForce",
  lightning: "SKJAALD.DamageLightning",
  necrotic: "SKJAALD.DamageNecrotic",
  penetration: "SKJAALD.Penetration",
  piercing: "SKJAALD.DamagePiercing",
  poison: "SKJAALD.DamagePoison",
  psychic: "SKJAALD.DamagePsychic",
  radiant: "SKJAALD.DamageRadiant",
  rending: "SKJAALD.DamageRending",
  slashing: "SKJAALD.DamageSlashing",
  sonic: "SKJAALD.DamageSonic"
};

/**
 * Types of damage to which an actor can possess resistance, immunity, or vulnerability.
 * @enum {string}
 */
SKJAALD.damageResistanceTypes = {
  ...SKJAALD.damageTypes,
  physical: "SKJAALD.DamagePhysical"
};

/* -------------------------------------------- */

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
SKJAALD.movementTypes = {
  burrow: "SKJAALD.MovementBurrow",
  climb: "SKJAALD.MovementClimb",
  fly: "SKJAALD.MovementFly",
  swim: "SKJAALD.MovementSwim",
  walk: "SKJAALD.MovementWalk"
};

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
SKJAALD.movementUnits = {
  ft: "SKJAALD.DistFt",
  mi: "SKJAALD.DistMi",
  m: "SKJAALD.DistM",
  km: "SKJAALD.DistKm"
};

/**
 * The valid units of measure for the range of an action or effect.
 * This object automatically includes the movement units from `SKJAALD.movementUnits`.
 * @enum {string}
 */
SKJAALD.distanceUnits = {
  none: "SKJAALD.None",
  self: "SKJAALD.DistSelf",
  touch: "SKJAALD.DistTouch",
  spec: "SKJAALD.Special",
  any: "SKJAALD.DistAny",
  ...SKJAALD.movementUnits
};

/* -------------------------------------------- */

/**
 * Configure aspects of encumbrance calculation so that it could be configured by modules.
 * @enum {{ imperial: number, metric: number }}
 */
SKJAALD.encumbrance = {
  currencyPerWeight: {
    imperial: 50,
    metric: 110
  },
  strMultiplier: {
    imperial: 15,
    metric: 6.8
  },
  vehicleWeightMultiplier: {
    imperial: 2000, // 2000 lbs in an imperial ton
    metric: 1000 // 1000 kg in a metric ton
  }
};

/* -------------------------------------------- */

/**
 * The types of single or area targets which can be applied to abilities.
 * @enum {string}
 */
SKJAALD.targetTypes = {
  none: "SKJAALD.None",
  self: "SKJAALD.TargetSelf",
  creature: "SKJAALD.TargetCreature",
  ally: "SKJAALD.TargetAlly",
  enemy: "SKJAALD.TargetEnemy",
  object: "SKJAALD.TargetObject",
  space: "SKJAALD.TargetSpace",
  radius: "SKJAALD.TargetRadius",
  sphere: "SKJAALD.TargetSphere",
  cylinder: "SKJAALD.TargetCylinder",
  cone: "SKJAALD.TargetCone",
  square: "SKJAALD.TargetSquare",
  cube: "SKJAALD.TargetCube",
  line: "SKJAALD.TargetLine",
  wall: "SKJAALD.TargetWall"
};

/* -------------------------------------------- */

/**
 * Mapping between `SKJAALD.targetTypes` and `MeasuredTemplate` shape types to define
 * which templates are produced by which area of effect target type.
 * @enum {string}
 */
SKJAALD.areaTargetTypes = {
  cone: "cone",
  cube: "rect",
  cylinder: "circle",
  line: "ray",
  radius: "circle",
  sphere: "circle",
  square: "rect",
  wall: "ray"
};

/* -------------------------------------------- */

/**
 * Different types of healing that can be applied using abilities.
 * @enum {string}
 */
SKJAALD.healingTypes = {
  healing: "SKJAALD.Healing",
  temphp: "SKJAALD.HealingTemp"
};

/* -------------------------------------------- */

/**
 * Denominations of hit dice which can apply to classes.
 * @type {string[]}
 */
SKJAALD.hitDieTypes = ["d6", "d8", "d10", "d12"];

/* -------------------------------------------- */

/**
 * The set of possible sensory perception types which an Actor may have.
 * @enum {string}
 */
SKJAALD.senses = {
  blindsight: "SKJAALD.SenseBlindsight",
  darkvision: "SKJAALD.SenseDarkvision",
  tremorsense: "SKJAALD.SenseTremorsense",
  truesight: "SKJAALD.SenseTruesight"
};

/* -------------------------------------------- */

/**
 * The set of skill which can be trained.
 * @enum {string}
 */
SKJAALD.skills = {
  acr: "SKJAALD.SkillAcr",
  ani: "SKJAALD.SkillAni",
  arc: "SKJAALD.SkillArc",
  ath: "SKJAALD.SkillAth",
  dec: "SKJAALD.SkillDec",
  his: "SKJAALD.SkillHis",
  ins: "SKJAALD.SkillIns",
  itm: "SKJAALD.SkillItm",
  inv: "SKJAALD.SkillInv",
  med: "SKJAALD.SkillMed",
  nat: "SKJAALD.SkillNat",
  prc: "SKJAALD.SkillPrc",
  prf: "SKJAALD.SkillPrf",
  per: "SKJAALD.SkillPer",
  rel: "SKJAALD.SkillRel",
  slt: "SKJAALD.SkillSlt",
  ste: "SKJAALD.SkillSte",
  sur: "SKJAALD.SkillSur"
};

/* -------------------------------------------- */

/**
 * Various different ways a spell can be prepared.
 */
SKJAALD.spellPreparationModes = {
  prepared: "SKJAALD.SpellPrepPrepared",
  pact: "SKJAALD.PactMagic",
  always: "SKJAALD.SpellPrepAlways",
  atwill: "SKJAALD.SpellPrepAtWill",
  innate: "SKJAALD.SpellPrepInnate"
};

/**
 * Subset of `SKJAALD.spellPreparationModes` that consume spell slots.
 * @type {boolean[]}
 */
SKJAALD.spellUpcastModes = ["always", "pact", "prepared"];

/**
 * Ways in which a class can contribute to spellcasting levels.
 * @enum {string}
 */
SKJAALD.spellProgression = {
  none: "SKJAALD.SpellNone",
  full: "SKJAALD.SpellProgFull",
  half: "SKJAALD.SpellProgHalf",
  third: "SKJAALD.SpellProgThird",
  pact: "SKJAALD.SpellProgPact",
  artificer: "SKJAALD.SpellProgArt"
};

/* -------------------------------------------- */

/**
 * The available choices for how spell damage scaling may be computed.
 * @enum {string}
 */
SKJAALD.spellScalingModes = {
  none: "SKJAALD.SpellNone",
  cantrip: "SKJAALD.SpellCantrip",
  level: "SKJAALD.SpellLevel"
};

/* -------------------------------------------- */

/**
 * The set of types which a weapon item can take.
 * @enum {string}
 */
SKJAALD.weaponTypes = {
  simpleM: "SKJAALD.WeaponSimpleM",
  simpleR: "SKJAALD.WeaponSimpleR",
  basicM: "SKJAALD.WeaponBasicM",
  basicR: "SKJAALD.WeaponBasicR",
  combatM: "SKJAALD.WeaponCombatM",
  combatR: "SKJAALD.WeaponCombatR",
  martialM: "SKJAALD.WeaponMartialM",
  martialR: "SKJAALD.WeaponMartialR",
  eliteM: "SKJAALD.WeaponEliteM",
  eliteR: "SKJAALD.WeaponEliteR",
  specialM: "SKJAALD.WeaponSpecialM",
  specialR: "SKJAALD.WeaponSpecialR"
};

/* -------------------------------------------- */

/**
 * The set of weapon property flags which can exist on a weapon.
 * @enum {string}
 */
SKJAALD.weaponProperties = {
  acc: "SKJAALD.WeaponPropertiesAcc",
  amm: "SKJAALD.WeaponPropertiesAmm",
  arp: "SKJAALD.WeaponPropertiesArp",
  bal: "SKJAALD.WeaponPropertiesBal",
  cle: "SKJAALD.WeaponPropertiesCle",
  def: "SKJAALD.WeaponPropertiesDef",
  dem: "SKJAALD.WeaponPropertiesDem",
  ext: "SKJAALD.WeaponPropertiesExt",
  fin: "SKJAALD.WeaponPropertiesFin",
  foc: "SKJAALD.WeaponPropertiesFoc",
  gri: "SKJAALD.WeaponPropertiesGri",
  hvy: "SKJAALD.WeaponPropertiesHvy",
  ind: "SKJAALD.WeaponPropertiesInd",
  kee: "SKJAALD.WeaponPropertiesKee",
  lgt: "SKJAALD.WeaponPropertiesLgt",
  mgc: "SKJAALD.WeaponPropertiesMgc",
  mom: "SKJAALD.WeaponPropertiesMom",
  pen: "SKJAALD.WeaponPropertiesPen",
  qui: "SKJAALD.WeaponPropertiesQui",
  rch: "SKJAALD.WeaponPropertiesRch",
  rel: "SKJAALD.WeaponPropertiesRel",
  ret: "SKJAALD.WeaponPropertiesRet",
  sie: "SKJAALD.WeaponPropertiesSie",
  spc: "SKJAALD.WeaponPropertiesSpc",
  swe: "SKJAALD.WeaponPropertiesSwe",
  thr: "SKJAALD.WeaponPropertiesThr",
  two: "SKJAALD.WeaponPropertiesTwo",
  unw: "SKJAALD.WeaponPropertiesUnw",
  ver: "SKJAALD.WeaponPropertiesVer",
  vis: "SKJAALD.WeaponPropertiesVis", 
};

/**
 * Types of components that can be required when casting a spell.
 * @enum {string}
 */
SKJAALD.spellComponents = {
  V: "SKJAALD.ComponentVerbal",
  S: "SKJAALD.ComponentSomatic",
  M: "SKJAALD.ComponentMaterial"
};

/**
 * Schools to which a spell can belong.
 * @enum {string}
 */
SKJAALD.spellSchools = {
  abj: "SKJAALD.SchoolAbj",
  con: "SKJAALD.SchoolCon",
  div: "SKJAALD.SchoolDiv",
  enc: "SKJAALD.SchoolEnc",
  evo: "SKJAALD.SchoolEvo",
  ill: "SKJAALD.SchoolIll",
  nec: "SKJAALD.SchoolNec",
  trs: "SKJAALD.SchoolTrs",
  bio: "SKJAALD.SchoolBio",
  nat: "SKJAALD.SchoolNat",
  din: "SKJAALD.SchoolDin"
};

/**
 * Times a spell can resolve.
 * @enum {string}
 */
 SKJAALD.spellResolution = {
  sp: "SKJAALD.ResolutionSpellPhase",
  in: "SKJAALD.ResolutionInstant"
};

/**
 * Valid spell levels.
 * @enum {string}
 */
SKJAALD.spellLevels = {
  0: "SKJAALD.SpellLevel0",
  1: "SKJAALD.SpellLevel1",
  2: "SKJAALD.SpellLevel2",
  3: "SKJAALD.SpellLevel3",
  4: "SKJAALD.SpellLevel4",
  5: "SKJAALD.SpellLevel5",
  6: "SKJAALD.SpellLevel6",
  7: "SKJAALD.SpellLevel7",
  8: "SKJAALD.SpellLevel8",
  9: "SKJAALD.SpellLevel9"
};

/**
 * Spell scroll item ID within the `SKJAALD.sourcePacks` compendium for each level.
 * @enum {string}
 */
SKJAALD.spellScrollIds = {
  0: "rQ6sO7HDWzqMhSI3",
  1: "9GSfMg0VOA2b4uFN",
  2: "XdDp6CKh9qEvPTuS",
  3: "hqVKZie7x9w3Kqds",
  4: "DM7hzgL836ZyUFB1",
  5: "wa1VF8TXHmkrrR35",
  6: "tI3rWx4bxefNCexS",
  7: "mtyw4NS1s7j2EJaD",
  8: "aOrinPg7yuDZEuWr",
  9: "O4YbkJkLlnsgUszZ"
};

/**
 * Compendium packs used for localized items.
 * @enum {string}
 */
SKJAALD.sourcePacks = {
  ITEMS: "skjaald.items"
};

/**
 * Define the standard slot progression by character level.
 * The entries of this array represent the spell slot progression for a full spell-caster.
 * @type {number[][]}
 */
SKJAALD.SPELL_SLOT_TABLE = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

/* -------------------------------------------- */

/**
 * Settings to configure how actors are merged when polymorphing is applied.
 * @enum {string}
 */
SKJAALD.polymorphSettings = {
  keepPhysical: "SKJAALD.PolymorphKeepPhysical",
  keepMental: "SKJAALD.PolymorphKeepMental",
  keepSaves: "SKJAALD.PolymorphKeepSaves",
  keepSkills: "SKJAALD.PolymorphKeepSkills",
  mergeSaves: "SKJAALD.PolymorphMergeSaves",
  mergeSkills: "SKJAALD.PolymorphMergeSkills",
  keepClass: "SKJAALD.PolymorphKeepClass",
  keepFeats: "SKJAALD.PolymorphKeepFeats",
  keepSpells: "SKJAALD.PolymorphKeepSpells",
  keepItems: "SKJAALD.PolymorphKeepItems",
  keepBio: "SKJAALD.PolymorphKeepBio",
  keepVision: "SKJAALD.PolymorphKeepVision"
};

/* -------------------------------------------- */

/**
 * Skill, ability, and tool proficiency levels.
 * The key for each level represents its proficiency multiplier.
 * @enum {string}
 */
SKJAALD.proficiencyLevels = {
  0: "SKJAALD.NotProficient",
  1: "SKJAALD.Proficient",
  0.5: "SKJAALD.HalfProficient",
  2: "SKJAALD.Expertise"
};

/* -------------------------------------------- */

/**
 * The amount of cover provided by an object. In cases where multiple pieces
 * of cover are in play, we take the highest value.
 * @enum {string}
 */
SKJAALD.cover = {
  0: "SKJAALD.None",
  .5: "SKJAALD.CoverHalf",
  .75: "SKJAALD.CoverThreeQuarters",
  1: "SKJAALD.CoverTotal"
};

/* -------------------------------------------- */

/**
 * A selection of actor attributes that can be tracked on token resource bars.
 * @type {string[]}
 */
SKJAALD.trackableAttributes = [
  "attributes.ac.value", "attributes.init.value", "attributes.movement", "attributes.senses", "attributes.spelldc",
  "attributes.spellLevel", "details.cr", "details.spellLevel", "details.xp.value", "skills.*.passive",
  "abilities.*.value", "attributes.acted.value"
];

/* -------------------------------------------- */

/**
 * A selection of actor and item attributes that are valid targets for item resource consumption.
 * @type {string[]}
 */
SKJAALD.consumableResources = [
  "item.quantity", "item.weight", "item.duration.value", "currency", "details.xp.value", "abilities.*.value",
  "attributes.senses", "attributes.movement", "attributes.ac.flat", "item.armor.value", "item.target", "item.range",
  "item.save.dc"
];

/* -------------------------------------------- */

/**
 * Conditions that can effect an actor.
 * @enum {string}
 */
SKJAALD.conditionTypes = {
  blinded: "SKJAALD.ConBlinded",
  charmed: "SKJAALD.ConCharmed",
  deafened: "SKJAALD.ConDeafened",
  diseased: "SKJAALD.ConDiseased",
  exhaustion: "SKJAALD.ConExhaustion",
  frightened: "SKJAALD.ConFrightened",
  grappled: "SKJAALD.ConGrappled",
  incapacitated: "SKJAALD.ConIncapacitated",
  invisible: "SKJAALD.ConInvisible",
  paralyzed: "SKJAALD.ConParalyzed",
  petrified: "SKJAALD.ConPetrified",
  poisoned: "SKJAALD.ConPoisoned",
  prone: "SKJAALD.ConProne",
  restrained: "SKJAALD.ConRestrained",
  stunned: "SKJAALD.ConStunned",
  unconscious: "SKJAALD.ConUnconscious"
};

/**
 * Languages a character can learn.
 * @enum {string}
 */
SKJAALD.languages = {
  common: "SKJAALD.LanguagesCommon",
  aarakocra: "SKJAALD.LanguagesAarakocra",
  abyssal: "SKJAALD.LanguagesAbyssal",
  aquan: "SKJAALD.LanguagesAquan",
  auran: "SKJAALD.LanguagesAuran",
  celestial: "SKJAALD.LanguagesCelestial",
  deep: "SKJAALD.LanguagesDeepSpeech",
  draconic: "SKJAALD.LanguagesDraconic",
  druidic: "SKJAALD.LanguagesDruidic",
  dwarvish: "SKJAALD.LanguagesDwarvish",
  elvish: "SKJAALD.LanguagesElvish",
  giant: "SKJAALD.LanguagesGiant",
  gith: "SKJAALD.LanguagesGith",
  gnomish: "SKJAALD.LanguagesGnomish",
  goblin: "SKJAALD.LanguagesGoblin",
  gnoll: "SKJAALD.LanguagesGnoll",
  halfling: "SKJAALD.LanguagesHalfling",
  ignan: "SKJAALD.LanguagesIgnan",
  infernal: "SKJAALD.LanguagesInfernal",
  orc: "SKJAALD.LanguagesOrc",
  primordial: "SKJAALD.LanguagesPrimordial",
  sylvan: "SKJAALD.LanguagesSylvan",
  terran: "SKJAALD.LanguagesTerran",
  cant: "SKJAALD.LanguagesThievesCant",
  undercommon: "SKJAALD.LanguagesUndercommon"
};

/**
 * XP required to achieve each character level.
 * @type {number[]}
 */
SKJAALD.CHARACTER_EXP_LEVELS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

/**
 * XP granted for each challenge rating.
 * @type {number[]}
 */
SKJAALD.CR_EXP_LEVELS = [
  10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000,
  20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
];

/**
 * Character features automatically granted by classes & subclasses at certain levels.
 * @type {object}
 */
SKJAALD.classFeatures = ClassFeatures;

/**
 * Special character flags.
 * @enum {{
 *   name: string,
 *   hint: string,
 *   [abilities]: string[],
 *   [skills]: string[],
 *   section: string,
 *   type: any,
 *   placeholder: any
 * }}
 */
SKJAALD.characterFlags = {
  diamondSoul: {
    name: "SKJAALD.FlagsDiamondSoul",
    hint: "SKJAALD.FlagsDiamondSoulHint",
    section: "SKJAALD.Feats",
    type: Boolean
  },
  elvenAccuracy: {
    name: "SKJAALD.FlagsElvenAccuracy",
    hint: "SKJAALD.FlagsElvenAccuracyHint",
    section: "SKJAALD.RacialTraits",
    type: Boolean
  },
  halflingLucky: {
    name: "SKJAALD.FlagsHalflingLucky",
    hint: "SKJAALD.FlagsHalflingLuckyHint",
    section: "SKJAALD.RacialTraits",
    type: Boolean
  },
  initiativeAdv: {
    name: "SKJAALD.FlagsInitiativeAdv",
    hint: "SKJAALD.FlagsInitiativeAdvHint",
    section: "SKJAALD.Feats",
    type: Boolean
  },
  initiativeAlert: {
    name: "SKJAALD.FlagsAlert",
    hint: "SKJAALD.FlagsAlertHint",
    section: "SKJAALD.Feats",
    type: Boolean
  },
  jackOfAllTrades: {
    name: "SKJAALD.FlagsJOAT",
    hint: "SKJAALD.FlagsJOATHint",
    section: "SKJAALD.Feats",
    type: Boolean
  },
  observantFeat: {
    name: "SKJAALD.FlagsObservant",
    hint: "SKJAALD.FlagsObservantHint",
    skills: ["prc", "inv"],
    section: "SKJAALD.Feats",
    type: Boolean
  },
  powerfulBuild: {
    name: "SKJAALD.FlagsPowerfulBuild",
    hint: "SKJAALD.FlagsPowerfulBuildHint",
    section: "SKJAALD.RacialTraits",
    type: Boolean
  },
  reliableTalent: {
    name: "SKJAALD.FlagsReliableTalent",
    hint: "SKJAALD.FlagsReliableTalentHint",
    section: "SKJAALD.Feats",
    type: Boolean
  },
  remarkableAthlete: {
    name: "SKJAALD.FlagsRemarkableAthlete",
    hint: "SKJAALD.FlagsRemarkableAthleteHint",
    abilities: ["str", "dex", "con"],
    section: "SKJAALD.Feats",
    type: Boolean
  },
  weaponCriticalThreshold: {
    name: "SKJAALD.FlagsWeaponCritThreshold",
    hint: "SKJAALD.FlagsWeaponCritThresholdHint",
    section: "SKJAALD.Feats",
    type: Number,
    placeholder: 20
  },
  spellCriticalThreshold: {
    name: "SKJAALD.FlagsSpellCritThreshold",
    hint: "SKJAALD.FlagsSpellCritThresholdHint",
    section: "SKJAALD.Feats",
    type: Number,
    placeholder: 20
  },
  meleeCriticalDamageDice: {
    name: "SKJAALD.FlagsMeleeCriticalDice",
    hint: "SKJAALD.FlagsMeleeCriticalDiceHint",
    section: "SKJAALD.Feats",
    type: Number,
    placeholder: 0
  }
};

/**
 * Flags allowed on actors. Any flags not in the list may be deleted during a migration.
 * @type {string[]}
 */
SKJAALD.allowedActorFlags = ["isPolymorphed", "originalActor"].concat(Object.keys(SKJAALD.characterFlags));
