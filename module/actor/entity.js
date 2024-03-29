import Proficiency from "./proficiency.js";
import { d20Roll, damageRoll } from "../dice.js";
import SelectItemsPrompt from "../apps/select-items-prompt.js";
import ShortRestDialog from "../apps/short-rest.js";
import LongRestDialog from "../apps/long-rest.js";
import ProficiencySelector from "../apps/proficiency-selector.js";
import {SKJAALD} from "../config.js";
import Item5e from "../item/entity.js";

/**
 * Extend the base Actor class to implement additional system-specific logic.
 * @extends {Actor}
 */
export default class Actor5e extends Actor {

  /**
   * The data source for Actor5e.classes allowing it to be lazily computed.
   * @type {object<string, Item5e>}
   * @private
   */
  _classes = undefined;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A mapping of classes belonging to this Actor.
   * @type {object<string, Item5e>}
   */
  get classes() {
    if ( this._classes !== undefined ) return this._classes;
    if ( !["character", "npc"].includes(this.data.type) ) return this._classes = {};
    return this._classes = this.items.filter(item => item.type === "class").reduce((obj, cls) => {
      obj[cls.name.slugify({strict: true})] = cls;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Is this Actor currently polymorphed into some other creature?
   * @type {boolean}
   */
  get isPolymorphed() {
    return this.getFlag("skjaald", "isPolymorphed") || false;
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  prepareData() {
    this._preparationWarnings = [];
    super.prepareData();

    // Iterate over owned items and recompute attributes that depend on prepared actor data
    this.items.forEach(item => item.prepareFinalAttributes());
  }

  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {
    this._prepareBaseArmorClass(this.data);
    switch ( this.data.type ) {
      case "character":
        return this._prepareCharacterData(this.data);
      case "npc":
        return this._prepareNPCData(this.data);
      case "vehicle":
        return this._prepareVehicleData(this.data);
    }
  }

  /* --------------------------------------------- */

  /** @override */
  applyActiveEffects() {
    // The Active Effects do not have access to their parent at preparation time so we wait until this stage to
    // determine whether they are suppressed or not.
    this.effects.forEach(e => e.determineSuppression());
    return super.applyActiveEffects();
  }

  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.skjaald || {};
    const bonuses = getProperty(data, "bonuses.abilities") || {};

    // Retrieve data for polymorphed actors
    let originalSaves = null;
    let originalSkills = null;
    if (this.isPolymorphed) {
      const transformOptions = this.getFlag("skjaald", "transformOptions");
      const original = game.actors?.get(this.getFlag("skjaald", "originalActor"));
      if (original) {
        if (transformOptions.mergeSaves) {
          originalSaves = original.data.data.abilities;
        }
        if (transformOptions.mergeSkills) {
          originalSkills = original.data.data.skills;
        }
      }
    }

    // Ability modifiers and saves
    const bonusData = this.getRollData();
    const joat = flags.jackOfAllTrades;
    const dcBonus = this._simplifyBonus(data.bonuses?.spell?.dc, bonusData);
    const saveBonus = this._simplifyBonus(bonuses.save, bonusData);
    const checkBonus = this._simplifyBonus(bonuses.check, bonusData);
    for (let [id, abl] of Object.entries(data.abilities)) {
      if ( flags.diamondSoul ) abl.proficient = 1;  // Diamond Soul is proficient in all saves
      abl.mod = Math.floor((abl.value - 10) / 2);

      const isRA = this._isRemarkableAthlete(id);
      abl.checkProf = new Proficiency(data.attributes.prof, (isRA || joat) ? 0.5 : 0, !isRA);
      const saveBonusAbl = this._simplifyBonus(abl.bonuses?.save, bonusData);
      abl.saveBonus = saveBonusAbl + saveBonus;

      abl.saveProf = new Proficiency(data.attributes.prof, abl.proficient);
      const checkBonusAbl = this._simplifyBonus(abl.bonuses?.check, bonusData);
      abl.checkBonus = checkBonusAbl + checkBonus;

      abl.save = abl.mod + abl.saveBonus;
      if ( Number.isNumeric(abl.saveProf.term) ) abl.save += abl.saveProf.flat;
      abl.dc = 8 + abl.mod + data.attributes.prof + dcBonus;

      // If we merged saves when transforming, take the highest bonus here.
      if (originalSaves && abl.proficient) {
        abl.save = Math.max(abl.save, originalSaves[id].save);
      }

      abl.value2 = abl.value;
      abl.proficient2 = abl.proficient;
    }

    // Exhaustion Levels

    data.attributes.exhaustion.conditional = this._computeConditionalExhaust(actorData);
    data.attributes.exhaustion.total = this._computeTotalExhaust(actorData);

    //CES setup
    //Hunger
    actorData.data.attributes.exhaustion.hunger.stuffed = false;
    actorData.data.attributes.exhaustion.hunger.wellfed = false;
    actorData.data.attributes.exhaustion.hunger.ok = false;
    actorData.data.attributes.exhaustion.hunger.peckish = false;
    actorData.data.attributes.exhaustion.hunger.hungry = false;
    actorData.data.attributes.exhaustion.hunger.ravenous = false;
    actorData.data.attributes.exhaustion.hunger.starving = false;
    switch ( String(actorData.data.attributes.exhaustion.hunger.value) ) {
      case "0":
        actorData.data.attributes.exhaustion.hunger.stuffed = true;
        break;
      case "1":
        actorData.data.attributes.exhaustion.hunger.wellfed = true;
        break;
      case "2":
        actorData.data.attributes.exhaustion.hunger.ok = true;
        break;
      case "3":
        actorData.data.attributes.exhaustion.hunger.peckish = true;
        break;
      case "4":
        actorData.data.attributes.exhaustion.hunger.hungry = true;
        break;
      case "5":
        actorData.data.attributes.exhaustion.hunger.ravenous = true;
        break;
      case "6":
        actorData.data.attributes.exhaustion.hunger.starving = true;
        break;
    }

    //Thirst
    actorData.data.attributes.exhaustion.thirst.quenched = false;
    actorData.data.attributes.exhaustion.thirst.refreshed = false;
    actorData.data.attributes.exhaustion.thirst.ok = false;
    actorData.data.attributes.exhaustion.thirst.parched = false;
    actorData.data.attributes.exhaustion.thirst.thirsty = false;
    actorData.data.attributes.exhaustion.thirst.dry = false;
    actorData.data.attributes.exhaustion.thirst.dehydrated = false;
    switch ( String(actorData.data.attributes.exhaustion.thirst.value) ) {
      case "0":
        actorData.data.attributes.exhaustion.thirst.quenched = true;
        break;
      case "1":
        actorData.data.attributes.exhaustion.thirst.refreshed = true;
        break;
      case "2":
        actorData.data.attributes.exhaustion.thirst.ok = true;
        break;
      case "3":
        actorData.data.attributes.exhaustion.thirst.parched = true;
        break;
      case "4":
        actorData.data.attributes.exhaustion.thirst.thirsty = true;
        break;
      case "5":
        actorData.data.attributes.exhaustion.thirst.dry = true;
        break;
      case "6":
        actorData.data.attributes.exhaustion.thirst.dehydrated = true;
        break;
    }

    //Fatigue
    actorData.data.attributes.exhaustion.fatigue.energised = false;
    actorData.data.attributes.exhaustion.fatigue.wellrested = false;
    actorData.data.attributes.exhaustion.fatigue.ok = false;
    actorData.data.attributes.exhaustion.fatigue.tired = false;
    actorData.data.attributes.exhaustion.fatigue.sleepy = false;
    actorData.data.attributes.exhaustion.fatigue.verysleepy = false;
    actorData.data.attributes.exhaustion.fatigue.barelyawake = false;
    switch ( String(actorData.data.attributes.exhaustion.fatigue.value) ) {
      case "0":
        actorData.data.attributes.exhaustion.fatigue.energised = true;
        break;
      case "1":
        actorData.data.attributes.exhaustion.fatigue.wellrested = true;
        break;
      case "2":
        actorData.data.attributes.exhaustion.fatigue.ok = true;
        break;
      case "3":
        actorData.data.attributes.exhaustion.fatigue.tired = true;
        break;
      case "4":
        actorData.data.attributes.exhaustion.fatigue.sleepy = true;
        break;
      case "5":
        actorData.data.attributes.exhaustion.fatigue.verysleepy = true;
        break;
      case "6":
        actorData.data.attributes.exhaustion.fatigue.barelyawake = true;
        break;
    }

    //Temperature
    actorData.data.attributes.exhaustion.temperature.perfect = false;
    actorData.data.attributes.exhaustion.temperature.comfortable = false;
    actorData.data.attributes.exhaustion.temperature.ok = false;
    actorData.data.attributes.exhaustion.temperature.noticable = false;
    actorData.data.attributes.exhaustion.temperature.uncomfortable = false;
    actorData.data.attributes.exhaustion.temperature.overwhelming = false;
    actorData.data.attributes.exhaustion.temperature.unbearable = false;
    switch ( String(actorData.data.attributes.exhaustion.temperature.value) ) {
      case "0":
        actorData.data.attributes.exhaustion.temperature.perfect = true;
        break;
      case "1":
        actorData.data.attributes.exhaustion.temperature.comfortable = true;
        break;
      case "2":
        actorData.data.attributes.exhaustion.temperature.ok = true;
        break;
      case "3":
        actorData.data.attributes.exhaustion.temperature.noticable = true;
        break;
      case "4":
        actorData.data.attributes.exhaustion.temperature.uncomfortable = true;
        break;
      case "5":
        actorData.data.attributes.exhaustion.temperature.overwhelming = true;
        break;
      case "6":
        actorData.data.attributes.exhaustion.temperature.unbearable = true;
        break;
    }

    //Exhaustion
    actorData.data.attributes.exhaustion.exhaust0 = false;
    actorData.data.attributes.exhaustion.exhaust1 = false;
    actorData.data.attributes.exhaustion.exhaust2 = false;
    actorData.data.attributes.exhaustion.exhaust3 = false;
    actorData.data.attributes.exhaustion.exhaust4 = false;
    actorData.data.attributes.exhaustion.exhaust5 = false;
    actorData.data.attributes.exhaustion.exhaust6 = false;
    actorData.data.attributes.exhaustion.exhaust7 = false;
    actorData.data.attributes.exhaustion.exhaust8 = false;
    actorData.data.attributes.exhaustion.exhaust9 = false;
    actorData.data.attributes.exhaustion.exhaust10 = false;
    switch ( String(actorData.data.attributes.exhaustion.total) ) {
      case "0":
        actorData.data.attributes.exhaustion.exhaust0 = true;
        break;
      case "1":
        actorData.data.attributes.exhaustion.exhaust1 = true;
        break;
      case "2":
        actorData.data.attributes.exhaustion.exhaust2 = true;
        break;
      case "3":
        actorData.data.attributes.exhaustion.exhaust3 = true;
        break;
      case "4":
        actorData.data.attributes.exhaustion.exhaust4= true;
        break;
      case "5":
        actorData.data.attributes.exhaustion.exhaust5 = true;
        break;
      case "6":
        actorData.data.attributes.exhaustion.exhaust6  = true;
        break;
      case "7":
        actorData.data.attributes.exhaustion.exhaust7  = true;
        break;
      case "8":
        actorData.data.attributes.exhaustion.exhaust8  = true;
        break;
      case "9":
        actorData.data.attributes.exhaustion.exhaust9  = true;
        break;
      case "10":
        actorData.data.attributes.exhaustion.exhaust10  = true;
        break;
    }

    if (actorData.data.attributes.exhaustion.total < 0){
      actorData.data.attributes.exhaustion.exhaust0 = true;
    }
    if (actorData.data.attributes.exhaustion.total > 10){
      actorData.data.attributes.exhaustion.exhaust10  = true;
    }
    if (isNaN(actorData.data.attributes.exhaustion.base)){
      actorData.data.attributes.exhaustion.base = 0;
    }

    //Health
    actorData.data.attributes.hp.robust = false;
    actorData.data.attributes.hp.healthy = false;
    actorData.data.attributes.hp.ok = false;
    actorData.data.attributes.hp.hit = false;
    actorData.data.attributes.hp.bloodied = false;
    actorData.data.attributes.hp.hurt = false;
    actorData.data.attributes.hp.critical = false;
    switch ( String(actorData.data.attributes.hp.visual) ) {
      case "0":
        actorData.data.attributes.hp.robust = true;
        break;
      case "1":
        actorData.data.attributes.hp.healthy  = true;
        break;
      case "2":
        actorData.data.attributes.hp.ok = true;
        break;
      case "3":
        actorData.data.attributes.hp.hit = true;
        break;
      case "4":
        actorData.data.attributes.hp.bloodied= true;
        break;
      case "5":
        actorData.data.attributes.hp.hurt = true;
        break;
      case "6":
        actorData.data.attributes.hp.critical  = true;
        break;
    }

    // ration/waterskin icons


    actorData.data.attributes.ration.icon1 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.ration.icon2 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.ration.icon3 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.ration.icon4 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.ration.icon5 = '<i class="far fa-circle"></i>';

    actorData.data.attributes.waterskin.icon1 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.waterskin.icon2 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.waterskin.icon3 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.waterskin.icon4 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.waterskin.icon5 = '<i class="far fa-circle"></i>';


    // fate/inspiration/legend icons
    
    actorData.data.attributes.inspiration.icon1 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.inspiration.icon2 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.inspiration.icon3 = '<i class="far fa-circle"></i>';


    actorData.data.attributes.legend.icon1 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.legend.icon2 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.legend.icon3 = '<i class="far fa-circle"></i>';

    actorData.data.attributes.fate.icon = '<i class="far fa-circle"></i>';


    //Death save Icons
    actorData.data.attributes.death.icon1 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.death.icon2 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.death.icon3 = '<i class="far fa-circle"></i>';

    actorData.data.attributes.death.icon12 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.death.icon22 = '<i class="far fa-circle"></i>';
    actorData.data.attributes.death.icon32 = '<i class="far fa-circle"></i>';

    // Acted Icon
    actorData.data.attributes.acted.icon = '<i class="far fa-circle"></i>';

    // Action Icons
    actorData.data.attributes.acted.action.icon = '<i class="far fa-circle"></i>';
    actorData.data.attributes.acted.halfaction.icon = '<i class="far fa-circle"></i>';
    actorData.data.attributes.acted.reaction.icon = '<i class="far fa-circle"></i>';
    actorData.data.attributes.acted.movement.icon = '<i class="far fa-circle"></i>';

    // Inventory encumbrance
    data.attributes.encumbrance = this._computeEncumbrance(actorData);

    // Prepare skills
    this._prepareSkills(actorData, bonusData, bonuses, checkBonus, originalSkills);

    // Reset class store to ensure it is updated with any changes
    this._classes = undefined;

    // Determine Initiative Modifier
    this._computeInitiativeModifier(actorData, checkBonus, bonusData);

    // Cache labels
    this.labels = {};
    if ( this.type === "npc" ) {
      this.labels.creatureType = this.constructor.formatCreatureType(data.details.type);
    }

    // Prepare spell-casting data
    this._computeSpellcastingProgression(this.data);

    // Prepare armor class data
    // const ac = this._computeArmorClass(data);
    // this.armor = ac.equippedArmor || null;
    // this.shield = ac.equippedShield || null;
    // if ( ac.warnings ) this._preparationWarnings.push(...ac.warnings);

    // COMBAT PAGE DUPLICATES

    actorData.data.attributes.hp.grit2 = actorData.data.attributes.hp.grit;
    actorData.data.attributes.hp.value2 = actorData.data.attributes.hp.value;
    actorData.data.attributes.hp.max2 = actorData.data.attributes.hp.max;
    actorData.data.attributes.hp.hitDicecurrent2 = actorData.data.attributes.hp.hitDicecurrent;
    actorData.data.attributes.hp.hitDiceMax2 = actorData.data.attributes.hp.hitDiceMax;

    actorData.data.attributes.death.save12 = actorData.data.attributes.death.save1;
    actorData.data.attributes.death.save22 = actorData.data.attributes.death.save2;
    actorData.data.attributes.death.save32 = actorData.data.attributes.death.save3;
    
    actorData.data.resources.primary.value2 = actorData.data.resources.primary.value;
    actorData.data.resources.primary.max2 = actorData.data.resources.primary.max;
    actorData.data.resources.primary.label2 = actorData.data.resources.primary.label;
    actorData.data.resources.secondary.value2 = actorData.data.resources.secondary.value;
    actorData.data.resources.secondary.max2 = actorData.data.resources.secondary.max;
    actorData.data.resources.secondary.label2 = actorData.data.resources.secondary.label;
    actorData.data.resources.tertiary.value2 = actorData.data.resources.tertiary.value;
    actorData.data.resources.tertiary.max2 = actorData.data.resources.tertiary.max;
    actorData.data.resources.tertiary.label2 = actorData.data.resources.tertiary.label;

    actorData.data.attributes.ac.foo2 = actorData.data.attributes.ac.foo;
    actorData.data.attributes.dp.value2 = actorData.data.attributes.dp.value;
    actorData.data.attributes.hp.wounds2 = actorData.data.attributes.hp.wounds;
    actorData.data.attributes.dp.max2 = actorData.data.attributes.dp.max;


    // Spell Attack Bonus
    if(actorData.data.abilities[actorData.data.attributes.spellcasting.ability] == undefined){
      actorData.data.attributes.spellcasting.spellbonus = 0;
    } else{
      actorData.data.attributes.spellcasting.spellbonus = actorData.data.abilities[actorData.data.attributes.spellcasting.ability].mod;
    }

    
    actorData.data.attributes.hp.hitDiceDenom = this._getHitDieDenom(actorData);

    actorData.data.details.xp.value = actorData.data.attributes.acted.value;

  }
    
    /* -------------------------------------------- */

    /**
   * Assign hit die denominator.
   * @param {object} data                 Actor data to determine the attributions from.
   * @returns {AttributionDescription[]}  List of attribution descriptions.
   * @protected
   */
     _getHitDieDenom(data) {
      const items = data.items;
      for (let i of items){
        if (i.data.type == "class" && i.data.data.classType == "base"){
          const hitDice = i.data.data.hitDice
          return hitDice;
        }
      }
      
      return "d3";
    }
  


  /* -------------------------------------------- */

  /**
   * Return the amount of experience required to gain a certain character level.
   * @param {number} level  The desired level.
   * @returns {number}      The XP required.
   */
  getLevelExp(level) {
    const levels = CONFIG.SKJAALD.CHARACTER_EXP_LEVELS;
    return levels[Math.min(level, levels.length - 1)];
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience granted by killing a creature of a certain CR.
   * @param {number} cr     The creature's challenge rating.
   * @returns {number}      The amount of experience granted per kill.
   */
  getCRExp(cr) {
    if (cr < 1.0) return Math.max(200 * cr, 10);
    return CONFIG.SKJAALD.CR_EXP_LEVELS[cr];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    const data = super.getRollData();
    data.prof = new Proficiency(this.data.data.attributes.prof, 1);
    data.classes = Object.entries(this.classes).reduce((obj, e) => {
      const [slug, cls] = e;
      obj[slug] = cls.data.data;
      return obj;
    }, {});
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Given a list of items to add to the Actor, optionally prompt the
   * user for which they would like to add.
   * @param {Item5e[]} items         The items being added to the Actor.
   * @param {boolean} [prompt=true]  Whether or not to prompt the user.
   * @returns {Promise<Item5e[]>}
   */
  async addEmbeddedItems(items, prompt=true) {
    let itemsToAdd = items;
    if ( !items.length ) return [];

    // Obtain the array of item creation data
    let toCreate = [];
    if (prompt) {
      const itemIdsToAdd = await SelectItemsPrompt.create(items, {
        hint: game.i18n.localize("SKJAALD.AddEmbeddedItemPromptHint")
      });
      for (let item of items) {
        if (itemIdsToAdd.includes(item.id)) toCreate.push(item.toObject());
      }
    } else {
      toCreate = items.map(item => item.toObject());
    }

    // Create the requested items
    if (itemsToAdd.length === 0) return [];
    return Item5e.createDocuments(toCreate, {parent: this});
  }

  /* -------------------------------------------- */

  /**
   * Get a list of features to add to the Actor when a class item is updated.
   * Optionally prompt the user for which they would like to add.
   * @param {object} [options]
   * @param {string} [options.className]     Name of the class if it has been changed.
   * @param {string} [options.subclassName]  Name of the selected subclass if it has been changed.
   * @param {number} [options.level]         New class level if it has been changed.
   * @returns {Promise<Item5e[]>}            Any new items that should be added to the actor.
   */
  async getClassFeatures({className, subclassName, level}={}) {
    const existing = new Set(this.items.map(i => i.name));
    const features = await Actor5e.loadClassFeatures({className, subclassName, level});
    return features.filter(f => !existing.has(f.name)) || [];
  }

  /* -------------------------------------------- */

  /**
   * Return the features which a character is awarded for each class level.
   * @param {object} [options]
   * @param {string} [options.className]     Name of the class being added or updated.
   * @param {string} [options.subclassName]  Name of the subclass of the class being added, if any.
   * @param {number} [options.level]         The number of levels in the added class.
   * @param {number} [options.priorLevel]    The previous level of the added class.
   * @returns {Promise<Item5e[]>}            Items that should be added based on the changes made.
   */
  static async loadClassFeatures({className="", subclassName="", level=1, priorLevel=0}={}) {
    className = className.toLowerCase();
    subclassName = subclassName.slugify();

    // Get the configuration of features which may be added
    const clsConfig = CONFIG.SKJAALD.classFeatures[className];
    if (!clsConfig) return [];

    // Acquire class features
    let ids = [];
    for ( let [l, f] of Object.entries(clsConfig.features || {}) ) {
      l = parseInt(l);
      if ( (l <= level) && (l > priorLevel) ) ids = ids.concat(f);
    }

    // Acquire subclass features
    const subConfig = clsConfig.subclasses[subclassName] || {};
    for ( let [l, f] of Object.entries(subConfig.features || {}) ) {
      l = parseInt(l);
      if ( (l <= level) && (l > priorLevel) ) ids = ids.concat(f);
    }

    // Load item data for all identified features
    const features = [];
    for ( let id of ids ) {
      features.push(await fromUuid(id));
    }

    // Class spells should always be prepared
    for ( const feature of features ) {
      if ( feature.type === "spell" ) {
        const preparation = feature.data.data.preparation;
        preparation.mode = "always";
        preparation.prepared = true;
      }
    }
    return features;
  }

  /* -------------------------------------------- */
  /*  Data Preparation Helpers                    */
  /* -------------------------------------------- */

  /**
   * Perform any Character specific preparation.
   * @param {object} actorData  Copy of the data for the actor being prepared. *Will be mutated.*
   */
  _prepareCharacterData(actorData) {
    const data = actorData.data;

    // Determine character level and available hit dice based on owned Class items
    const [level, hd] = this.items.reduce((arr, item) => {
      if ( item.type === "class" ) {
        const classLevels = parseInt(item.data.data.levels) || 1;
        arr[0] += classLevels;
        arr[1] += classLevels - (parseInt(item.data.data.hitDiceUsed) || 0);
      }
      return arr;
    }, [0, 0]);
    data.details.level = level;
    data.attributes.hd = hd;

    // Character proficiency bonus
    data.attributes.prof = Math.floor((level + 7) / 4);

    // Experience required for next level
    const xp = data.details.xp;
    xp.max = this.getLevelExp(level || 1);
    const prior = this.getLevelExp(level - 1 || 0);
    const required = xp.max - prior;
    const pct = Math.round((xp.value - prior) * 100 / required);
    xp.pct = Math.clamped(pct, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Perform any NPC specific preparation.
   * @param {object} actorData  Copy of the data for the actor being prepared. *Will be mutated.*
   */
  _prepareNPCData(actorData) {
    const data = actorData.data;

    // Kill Experience
    data.details.xp.value = this.getCRExp(data.details.cr);

    // Proficiency
    data.attributes.prof = Math.floor((Math.max(data.details.cr, 1) + 7) / 4);

    // Spellcaster Level
    if ( data.attributes.spellcasting && !Number.isNumeric(data.details.spellLevel) ) {
      data.details.spellLevel = Math.max(data.details.cr, 1);
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform any Vehicle specific preparation.
   * @param {object} actorData  Copy of the data for the actor being prepared. *Will be mutated.*
   * @private
   */
  _prepareVehicleData(actorData) {
    const data = actorData.data;

    // Proficiency
    data.attributes.prof = 0;
  }

  /* -------------------------------------------- */

  /**
   * Prepare skill checks.
   * @param {object} actorData       Copy of the data for the actor being prepared. *Will be mutated.*
   * @param {object} bonusData       Data produced by `getRollData` to be applied to bonus formulas.
   * @param {object} bonuses         Global bonus data.
   * @param {number} checkBonus      Global ability check bonus.
   * @param {object} originalSkills  A transformed actor's original actor's skills.
   * @private
   */
  _prepareSkills(actorData, bonusData, bonuses, checkBonus, originalSkills) {
    if (actorData.type === "vehicle") return;

    const data = actorData.data;
    const flags = actorData.flags.skjaald || {};

    // Skill modifiers
    const feats = SKJAALD.characterFlags;
    const joat = flags.jackOfAllTrades;
    const observant = flags.observantFeat;
    const skillBonus = this._simplifyBonus(bonuses.skill, bonusData);
    for (let [id, skl] of Object.entries(data.skills)) {
      skl.value = Math.clamped(Number(skl.value).toNearest(0.5), 0, 3) ?? 0;
      const baseBonus = this._simplifyBonus(skl.bonuses?.check, bonusData);
      let roundDown = true;

      // Remarkable Athlete
      if ( this._isRemarkableAthlete(skl.ability) && (skl.value < 0.5) ) {
        skl.value = 0.5;
        roundDown = false;
      }

      // Jack of All Trades
      else if ( joat && (skl.value < 0.5) ) {
        skl.value = 0.5;
      }

      // Polymorph Skill Proficiencies
      if ( originalSkills ) {
        skl.value = Math.max(skl.value, originalSkills[id].value);
      }

      // Compute modifier
      const checkBonusAbl = this._simplifyBonus(data.abilities[skl.ability]?.bonuses?.check, bonusData);
      skl.bonus = baseBonus + checkBonus + checkBonusAbl + skillBonus;
      skl.mod = data.abilities[skl.ability].mod;
      skl.prof = new Proficiency(data.attributes.prof, skl.value, roundDown);
      skl.proficient = skl.value;
      skl.total = skl.mod + skl.bonus;
      if ( Number.isNumeric(skl.prof.term) ) skl.total += skl.prof.flat;

      // Compute passive bonus
      const passive = observant && (feats.observantFeat.skills.includes(id)) ? 5 : 0;
      const passiveBonus = this._simplifyBonus(skl.bonuses?.passive, bonusData);
      skl.passive = 5 + skl.mod + skl.bonus + skl.prof.flat + passive + passiveBonus;

      skl.proficient2;
      skl.ability2 = skl.ability;
      skl.value2;
    }
  }

  /* -------------------------------------------- */

  /**
   * Convert a bonus value to a simple integer for displaying on the sheet.
   * @param {number|string|null} bonus  Actor's bonus value.
   * @param {object} data               Actor data to use for replacing @ strings.
   * @returns {number}                  Simplified bonus as an integer.
   * @protected
   */
  _simplifyBonus(bonus, data) {
    if ( !bonus ) return 0;
    if ( Number.isNumeric(bonus) ) return Number(bonus);
    try {
      const roll = new Roll(bonus, data);
      if ( !roll.isDeterministic ) return 0;
      roll.evaluate({ async: false });
      return roll.total;
    } catch(error) {
      console.error(error);
      return 0;
    }
  }

  /* -------------------------------------------- */

  /**
   * Initialize derived AC fields for Active Effects to target.
   * @param {object} actorData  Copy of the data for the actor being prepared. *Will be mutated.*
   * @private
   */
  _prepareBaseArmorClass(actorData) {
    const ac = actorData.data.attributes.ac;
    // ac.base = 10;
    // ac.shield = ac.bonus = ac.cover = 0;
    // this.armor = null;
    // this.shield = null;
  }

  /* -------------------------------------------- */

  /**
   * Calculate the initiative bonus to display on a character sheet
   *
   * @param {object} actorData         The actor data being prepared.
   * @param {number} globalCheckBonus  The simplified global ability check bonus for this actor
   * @param {object} bonusData         Actor data to use for replacing formula variables in bonuses
   */
  _computeInitiativeModifier(actorData, globalCheckBonus, bonusData) {
    const data = actorData.data;
    const flags = actorData.flags.skjaald || {};
    const init = data.attributes.init;

    // Initiative modifiers
    const joat = flags.jackOfAllTrades;
    const athlete = flags.remarkableAthlete;
    const dexCheckBonus = this._simplifyBonus(data.abilities.dex.bonuses?.check, bonusData);

    // Compute initiative modifier
    init.mod = data.abilities.dex.mod + data.abilities.int.mod;
    init.prof = new Proficiency(data.attributes.prof, (joat || athlete) ? 0.5 : 0, !athlete);
    init.value = init.value ?? 0;
    init.bonus = init.value + (flags.initiativeAlert ? 5 : 0);
    init.total = init.mod + init.bonus + dexCheckBonus + globalCheckBonus;
    if ( Number.isNumeric(init.prof.term) ) init.total += init.prof.flat;
  }

  /**
   * Prepare data related to the spell-casting capabilities of the Actor.
   * @param {object} actorData  Copy of the data for the actor being prepared. *Will be mutated.*
   * @private
   */
  _computeSpellcastingProgression(actorData) {
    if (actorData.type === "vehicle") return;
    const ad = actorData.data;
    const spells = ad.spells;
    const isNPC = actorData.type === "npc";

    // Spellcasting DC
    const spellcastingAbility = ad.abilities[ad.attributes.spellcasting.ability];
    console.log("spell DC");
    if(ad.classes.wizard != undefined){
      ad.attributes.spellcasting.spelldc = 8 + ad.abilities.int.mod + ad.classes.wizard.levels;
    } else{
      ad.attributes.spellcasting.spelldc = 0;
    }

    // Translate the list of classes into spell-casting progression
    const progression = {
      total: 0,
      slot: 0,
      pact: 0
    };

    // Keep track of the last seen caster in case we're in a single-caster situation.
    let caster = null;

    // Tabulate the total spell-casting progression
    const classes = this.data.items.filter(i => i.type === "class");
    for ( let cls of classes ) {
      const d = cls.data.data;
      if ( d.spellcasting.progression === "none" ) continue;
      const levels = d.levels;
      const prog = d.spellcasting.progression;

      // Accumulate levels
      if ( prog !== "pact" ) {
        caster = d;
        progression.total++;
      }
      switch (prog) {
        case "third": progression.slot += Math.floor(levels / 3); break;
        case "half": progression.slot += Math.floor(levels / 2); break;
        case "full": progression.slot += levels; break;
        case "artificer": progression.slot += Math.ceil(levels / 2); break;
        case "pact": progression.pact += levels; break;
      }
    }

    // EXCEPTION: single-classed non-full progression rounds up, rather than down
    const isSingleClass = (progression.total === 1) && (progression.slot > 0);
    if (!isNPC && isSingleClass && ["half", "third"].includes(caster.spellcasting.progression) ) {
      const denom = caster.spellcasting.progression === "third" ? 3 : 2;
      progression.slot = Math.ceil(caster.levels / denom);
    }

    // EXCEPTION: NPC with an explicit spell-caster level
    if (isNPC && actorData.data.details.spellLevel) {
      progression.slot = actorData.data.details.spellLevel;
    }

    // Look up the number of slots per level from the progression table
    const levels = Math.clamped(progression.slot, 0, 20);
    const slots = SKJAALD.SPELL_SLOT_TABLE[levels - 1] || [];
    for ( let [n, lvl] of Object.entries(spells) ) {
      let i = parseInt(n.slice(-1));
      if ( Number.isNaN(i) ) continue;
      if ( Number.isNumeric(lvl.override) ) lvl.max = Math.max(parseInt(lvl.override), 0);
      else lvl.max = slots[i-1] || 0;
      lvl.value = parseInt(lvl.value);
    }

    // Determine the Actor's pact magic level (if any)
    let pl = Math.clamped(progression.pact, 0, 20);
    spells.pact = spells.pact || {};
    if ( (pl === 0) && isNPC && Number.isNumeric(spells.pact.override) ) pl = actorData.data.details.spellLevel;

    // Determine the number of Warlock pact slots per level
    if ( pl > 0) {
      spells.pact.level = Math.ceil(Math.min(10, pl) / 2);
      if ( Number.isNumeric(spells.pact.override) ) spells.pact.max = Math.max(parseInt(spells.pact.override), 1);
      else spells.pact.max = Math.max(1, Math.min(pl, 2), Math.min(pl - 8, 3), Math.min(pl - 13, 4));
      spells.pact.value = Math.min(spells.pact.value, spells.pact.max);
    } else {
      spells.pact.max = parseInt(spells.pact.override) || 0;
      spells.pact.level = spells.pact.max > 0 ? 1 : 0;
    }
  }

  /* -------------------------------------------- */

  /**
   * Determine a character's AC value from their equipped armor and shield.
   * @param {object} data  Copy of the data for the actor being prepared. *Will be mutated.*
   * @returns {{
   *   calc: string,
   *   value: number,


   * }}
   * @private
   */
  _computeArmorClass(data) {

    // Get AC configuration and apply automatic migrations for older data structures
    const ac = data.attributes.ac;
    // ac.warnings = [];
    // let cfg = CONFIG.SKJAALD.armorClasses[ac.calc];
    // if ( !cfg ) {
    //   ac.calc = "flat";
    //   if ( Number.isNumeric(ac.value) ) ac.flat = Number(ac.value);
    //   cfg = CONFIG.SKJAALD.armorClasses.flat;
    // }

    // // Identify Equipped Items
    // const armorTypes = new Set(Object.keys(CONFIG.SKJAALD.armorTypes));
    // const {armors, shields} = this.itemTypes.equipment.reduce((obj, equip) => {
    //   const armor = equip.data.data.armor;
    //   if ( !equip.data.data.equipped || !armorTypes.has(armor?.type) ) return obj;
    //   if ( armor.type === "shield" ) obj.shields.push(equip);
    //   else obj.armors.push(equip);
    //   return obj;
    // }, {armors: [], shields: []});

    // // Determine base AC
    // switch ( ac.calc ) {

    //   // Flat AC (no additional bonuses)
    //   case "flat":
    //     ac.value = Number(ac.flat);
    //     return ac;

    //   // Natural AC (includes bonuses)
    //   case "natural":
    //     ac.base = Number(ac.flat);
    //     break;

    //   // Equipment-based AC
    //   case "default":
    //     if ( armors.length ) {
    //       if ( armors.length > 1 ) ac.warnings.push("SKJAALD.WarnMultipleArmor");
    //       const armorData = armors[0].data.data.armor;
    //       const isHeavy = armorData.type === "heavy";
    //       ac.dex = isHeavy ? 0 : Math.min(armorData.dex ?? Infinity, data.abilities.dex.mod);
    //       ac.base = (armorData.value ?? 0) + ac.dex;
    //       ac.equippedArmor = armors[0];
    //     } else {
    //       ac.dex = data.abilities.dex.mod;
    //       ac.base = 10 + ac.dex;
    //     }
    //     break;

    //   // Formula-based AC
    //   default:
    //     let formula = ac.calc === "custom" ? ac.formula : cfg.formula;
    //     const rollData = this.getRollData();
    //     try {
    //       const replaced = Roll.replaceFormulaData(formula, rollData);
    //       ac.base = Roll.safeEval(replaced);
    //     } catch(err) {
    //       ac.warnings.push("SKJAALD.WarnBadACFormula");
    //       const replaced = Roll.replaceFormulaData(CONFIG.SKJAALD.armorClasses.default.formula, rollData);
    //       ac.base = Roll.safeEval(replaced);
    //     }
    //     break;
    // }

    // // Equipped Shield
    // if ( shields.length ) {
    //   if ( shields.length > 1 ) ac.warnings.push("SKJAALD.WarnMultipleShields");
    //   ac.shield = shields[0].data.data.armor.value ?? 0;
    //   ac.equippedShield = shields[0];
    // }

    // // Compute total AC and return
    // ac.value = ac.base + ac.shield + ac.bonus + ac.cover;
    return ac;
  }

  /* -------------------------------------------- */

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   * @param {object} actorData      The data object for the Actor being rendered
   * @returns {{max: number, value: number, pct: number}}  An object describing the character's encumbrance level
   * @private
   */
  _computeEncumbrance(actorData) {

    // Get the total weight from items
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    let weight = actorData.items.reduce((weight, i) => {
      if ( !physicalItems.includes(i.type) ) return weight;
      const q = i.data.data.quantity || 0;
      const w = i.data.data.weight || 0;
      return weight + (q * w);
    }, 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    if ( game.settings.get("skjaald", "currencyWeight") && actorData.data.currency ) {
      const currency = actorData.data.currency;
      const numCoins = Object.values(currency).reduce((val, denom) => val += Math.max(denom, 0), 0);

      const currencyPerWeight = game.settings.get("skjaald", "metricWeightUnits")
        ? CONFIG.SKJAALD.encumbrance.currencyPerWeight.metric
        : CONFIG.SKJAALD.encumbrance.currencyPerWeight.imperial;

      weight += numCoins / currencyPerWeight;
    }

    // Determine the encumbrance size class
    let mod = {
      tiny: 0.5,
      sm: 1,
      med: 1,
      lg: 2,
      huge: 4,
      grg: 8
    }[actorData.data.traits.size] || 1;
    if ( this.getFlag("skjaald", "powerfulBuild") ) mod = Math.min(mod * 2, 8);

    // Compute Encumbrance percentage
    weight = weight.toNearest(0.1);

    const strengthMultiplier = game.settings.get("skjaald", "metricWeightUnits")
      ? CONFIG.SKJAALD.encumbrance.strMultiplier.metric
      : CONFIG.SKJAALD.encumbrance.strMultiplier.imperial;

    const max = (actorData.data.abilities.str.value * strengthMultiplier * mod).toNearest(0.1);
    const pct = Math.clamped((weight * 100) / max, 0, 100);
    return { value: weight.toNearest(0.1), max, pct, encumbered: pct > (200/3) };
  }

  /* -------------------------------------------- */

  /**
   * Compute the conditional exhaustion for an Actor.
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   * @param {object} actorData      The data object for the Actor being rendered
   * @returns {number}              An object describing the character's encumbrance level
   * @private
   */
  _computeConditionalExhaust(actorData){
    var conditional = 0;
    var hunger = parseInt(actorData.data.attributes.exhaustion.hunger.value);
    var thirst = parseInt(actorData.data.attributes.exhaustion.thirst.value);
    var fatigue = parseInt(actorData.data.attributes.exhaustion.fatigue.value);
    var temperature = parseInt(actorData.data.attributes.exhaustion.temperature.value);
    switch(hunger){
      case 0: conditional += -2; break;
      case 1: conditional += -1; break;
      case 2: conditional += 0; break;
      case 3: conditional += 0; break;
      case 4: conditional += 1; break;
      case 5: conditional += 2; break;
      case 6: conditional += 3; break;
    }

    switch(thirst){
      case 0: conditional += -2; break;
      case 1: conditional += -1; break;
      case 2: conditional += 0; break;
      case 3: conditional += 0; break;
      case 4: conditional += 1; break;
      case 5: conditional += 2; break;
      case 6: conditional += 3; break;
    }

    switch(fatigue){
      case 0: conditional += -2; break;
      case 1: conditional += -1; break;
      case 2: conditional += 0; break;
      case 3: conditional += 0; break;
      case 4: conditional += 1; break;
      case 5: conditional += 2; break;
      case 6: conditional += 3; break;
    }

    switch(temperature){
      case 0: conditional += -2; break;
      case 1: conditional += -1; break;
      case 2: conditional += 0; break;
      case 3: conditional += 0; break;
      case 4: conditional += 1; break;
      case 5: conditional += 2; break;
      case 6: conditional += 3; break;
    }
    return conditional;
  }

  /* -------------------------------------------- */

  /**
   * Compute the total exhaustion for an Actor.
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   * @param {object} actorData      The data object for the Actor being rendered
   * @returns {number}              An object describing the character's encumbrance level
   * @private
   */
   _computeTotalExhaust(actorData){
    var total;
    var conditional = parseInt(actorData.data.attributes.exhaustion.conditional);
    var base = parseInt(actorData.data.attributes.exhaustion.base);
    total = conditional + base;
    if(total < 0){
      total = 0;
    }

    return total;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const sourceId = this.getFlag("core", "sourceId");
    if ( sourceId?.startsWith("Compendium.") ) return;

    // Some sensible defaults for convenience
    // Token size category
    const s = CONFIG.SKJAALD.tokenSizes[this.data.data.traits.size || "med"];
    this.data.token.update({width: s, height: s});

    // Player character configuration
    if ( this.type === "character" ) {
      this.data.token.update({vision: true, actorLink: true, disposition: 1});
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    // Apply changes in Actor size to Token width/height
    const newSize = foundry.utils.getProperty(changed, "data.traits.size");
    if ( newSize && (newSize !== foundry.utils.getProperty(this.data, "data.traits.size")) ) {
      let size = CONFIG.SKJAALD.tokenSizes[newSize];
      if ( !foundry.utils.hasProperty(changed, "token.width") ) {
        changed.token = changed.token || {};
        changed.token.height = size;
        changed.token.width = size;
      }
    }

    // Reset death save counters
    const isDead = this.data.data.attributes.hp.value <= 0;
    if ( isDead && (foundry.utils.getProperty(changed, "data.attributes.hp.value") > 0) ) {
      foundry.utils.setProperty(changed, "data.attributes.death.success", 0);
      foundry.utils.setProperty(changed, "data.attributes.death.failure", 0);
    }
  }

  /* -------------------------------------------- */

  /**
   * Assign a class item as the original class for the Actor based on which class has the most levels.
   * @returns {Promise<Actor5e>}  Instance of the updated actor.
   * @protected
   */
  _assignPrimaryClass() {
    const classes = this.itemTypes.class.sort((a, b) => b.data.data.levels - a.data.data.levels);
    const newPC = classes[0]?.id || "";
    return this.update({"data.details.originalClass": newPC});
  }

  /* -------------------------------------------- */
  /*  Gameplay Mechanics                          */
  /* -------------------------------------------- */

  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    if ( attribute === "attributes.hp" ) {
      const hp = getProperty(this.data.data, attribute);
      const delta = isDelta ? (-1 * value) : (hp.value + hp.temp) - value;
      return this.applyDamage(delta);
    }
    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  /* -------------------------------------------- */

  /**
   * Apply a certain amount of damage or healing to the health pool for Actor
   * @param {number} amount       An amount of damage (positive) or healing (negative) to sustain
   * @param {number} multiplier   A multiplier which allows for resistance, vulnerability, or healing
   * @returns {Promise<Actor5e>}  A Promise which resolves once the damage has been applied
   */
  async applyDamage(amount=0, multiplier=1) {
    amount = Math.floor(parseInt(amount) * multiplier);
    const hp = this.data.data.attributes.hp;

    // Deduct damage from temp HP first
    const tmp = parseInt(hp.temp) || 0;
    const dt = amount > 0 ? Math.min(tmp, amount) : 0;

    // Remaining goes to health
    const tmpMax = parseInt(hp.tempmax) || 0;
    const dh = Math.clamped(hp.value - (amount - dt), 0, hp.max + tmpMax);

    // Update the Actor
    const updates = {
      "data.attributes.hp.temp": tmp - dt,
      "data.attributes.hp.value": dh
    };

    // Delegate damage application to a hook
    // TODO replace this in the future with a better modifyTokenAttribute function in the core
    const allowed = Hooks.call("modifyTokenAttribute", {
      attribute: "attributes.hp",
      value: amount,
      isDelta: false,
      isBar: true
    }, updates);
    return allowed !== false ? this.update(updates, {dhp: -amount}) : this;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the provided ability is usable for remarkable athlete.
   *
   * @param {string} ability  Ability type to check.
   * @returns {boolean}       Whether the actor has the remarkable athlete flag and the ability is physical.
   * @private
   */
  _isRemarkableAthlete(ability) {
    return this.getFlag("skjaald", "remarkableAthlete") && SKJAALD.characterFlags.remarkableAthlete.abilities.includes(ability);
  }

  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} skillId      The skill id (e.g. "ins")
   * @param {object} options      Options which configure how the skill check is rolled
   * @returns {Promise<Roll>}     A Promise which resolves to the created Roll instance
   */
  rollSkill(skillId, options={}) {
    const skl = this.data.data.skills[skillId];
    const abl = this.data.data.abilities[skl.ability];
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};

    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    data.mod = skl.mod;

    // Include proficiency bonus
    if ( skl.prof.hasProficiency ) {
      parts.push("@prof");
      data.prof = skl.prof.term;
    }

    // Global ability check bonus
    if ( bonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = Roll.replaceFormulaData(bonuses.check, data);
    }

    // Ability-specific check bonus
    if ( abl?.bonuses?.check ) {
      const checkBonusKey = `${skl.ability}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
    }

    // Skill-specific skill bonus
    if ( skl.bonuses?.check ) {
      const checkBonusKey = `${skillId}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      data[checkBonusKey] = Roll.replaceFormulaData(skl.bonuses.check, data);
    }

    // Global skill check bonus
    if ( bonuses.skill ) {
      parts.push("@skillBonus");
      data.skillBonus = Roll.replaceFormulaData(bonuses.skill, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Reliable Talent applies to any skill check we have full or better proficiency in
    const reliableTalent = (skl.value >= 1 && this.getFlag("skjaald", "reliableTalent"));

    // Roll and return
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.format("SKJAALD.SkillPromptTitle", {skill: CONFIG.SKJAALD.skills[skillId]})}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      reliableTalent: reliableTalent,
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.skjaald.roll": {type: "skill", skillId }
      }
    });
    return d20Roll(rollData);
  }

  /* -------------------------------------------- */

  /**
   * Roll a generic ability test or saving throw.
   * Prompt the user for input on which variety of roll they want to do.
   * @param {string} abilityId    The ability id (e.g. "str")
   * @param {object} options      Options which configure how ability tests or saving throws are rolled
   */
  rollAbility(abilityId, options={}) {
    const label = CONFIG.SKJAALD.abilities[abilityId];
    new Dialog({
      title: `${game.i18n.format("SKJAALD.AbilityPromptTitle", {ability: label})}: ${this.name}`,
      content: `<p>${game.i18n.format("SKJAALD.AbilityPromptText", {ability: label})}</p>`,
      buttons: {
        test: {
          label: game.i18n.localize("SKJAALD.ActionAbil"),
          callback: () => this.rollAbilityTest(abilityId, options)
        }
      }
    }).render(true);
  }

  //   /**
  //  * Roll a generic ability test or saving throw.
  //  * Prompt the user for input on which variety of roll they want to do.
  //  * @param {string} abilityId    The ability id (e.g. "str")
  //  * @param {object} options      Options which configure how ability tests or saving throws are rolled
  //  */
  //    rollAbilitySave(abilityId, options={}) {
  //     const label = CONFIG.SKJAALD.abilities[abilityId];
  //     new Dialog({
  //       title: `${game.i18n.format("SKJAALD.AbilityPromptTitle", {ability: label})}: ${this.name}`,
  //       content: `<p>${game.i18n.format("SKJAALD.AbilityPromptText", {ability: label})}</p>`,
  //       buttons: {
  //         save: {
  //           label: game.i18n.localize("SKJAALD.ActionSave"),
  //           callback: () => this.rollAbilitySave(abilityId, options)
  //         }
  //       }
  //     }).render(true);
  //   }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Test
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} abilityId    The ability ID (e.g. "str")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<Roll>}     A Promise which resolves to the created Roll instance
   */
  rollAbilityTest(abilityId, options={}) {
    const label = CONFIG.SKJAALD.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];
    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    
    data.mod = abl.mod;

    // Include proficiency bonus
    console.log(abl);
    if ( abl.checkProf.hasProficiency ) {
      parts.push("@prof");
      data.prof = abl.checkProf.term;
    }

    // Add ability-specific check bonus
    if ( abl.bonuses?.check ) {
      const checkBonusKey = `${abilityId}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
    }

    // Add global actor bonus
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = Roll.replaceFormulaData(bonuses.check, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Roll and return
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.format("SKJAALD.AbilityPromptTitle", {ability: label})}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.skjaald.roll": {type: "ability", abilityId }
      }
    });
    return d20Roll(rollData);
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Test
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} abilityId    The ability ID (e.g. "str")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<Roll>}     A Promise which resolves to the created Roll instance
   */
  rollProfTest(item, event, options={}) {
    console.log("in prof roll");

    console.log(item);
    const label = item.data.name;
    const parts = [];
    const abilityId = item.data.data.ability;
    const abl = this.data.data.abilities[abilityId];

    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    
    data.mod = abl.mod;

    // Include proficiency bonus
    if ( item.data.data.proficient >= 1) {
      console.log("proficient");
      var proficiency = this.data.data.attributes.prof;
      console.log(this.data.data.attributes.prof);
      parts.push("@prof");
      var level = item.data.data.proficient;
      if(level == 1){
        data.prof = proficiency;
      }else if(level == 2){
        data.prof = (2 * proficiency);
      }else if(level == 3){
        data.prof = (3 * proficiency);
      }
    }

    // Add ability-specific check bonus
    if ( abl.bonuses?.check ) {
      const checkBonusKey = `${abilityId}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
    }

    // Add global actor bonus
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = Roll.replaceFormulaData(bonuses.check, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Roll and return
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.format("SKJAALD.ToolPromptTitle", {ability: label})}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.skjaald.roll": {type: "prof", abilityId }
      }
    });
    return d20Roll(rollData);
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} abilityId    The ability ID (e.g. "str")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<Roll>}     A Promise which resolves to the created Roll instance
   */
  rollAbilitySave(abilityId, options={}) {
    const label = CONFIG.SKJAALD.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];

    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    data.mod = abl.mod;

    // Include proficiency bonus
    if ( abl.saveProf.hasProficiency ) {
      parts.push("@prof");
      data.prof = abl.saveProf.term;
    }

    // Include ability-specific saving throw bonus
    if ( abl.bonuses?.save ) {
      const saveBonusKey = `${abilityId}SaveBonus`;
      parts.push(`@${saveBonusKey}`);
      data[saveBonusKey] = Roll.replaceFormulaData(abl.bonuses.save, data);
    }

    // Include a global actor ability save bonus
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = Roll.replaceFormulaData(bonuses.save, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Roll and return
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.format("SKJAALD.SavePromptTitle", {ability: label})}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.skjaald.roll": {type: "save", abilityId }
      }
    });
    return d20Roll(rollData);
  }

  /* -------------------------------------------- */

  /**
   * Perform a death saving throw, rolling a d20 plus any global save bonuses
   * @param {object} options        Additional options which modify the roll
   * @returns {Promise<Roll|null>}  A Promise which resolves to the Roll instance
   */
  async rollDeathSave(options={}) {

    // Evaluate a global saving throw bonus
    const parts = [];
    const data = this.getRollData();
    const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});

    // // Diamond Soul adds proficiency
    // if ( this.getFlag("skjaald", "diamondSoul") ) {
    //   parts.push("@prof");
    //   data.prof = new Proficiency(this.data.data.attributes.prof, 1).term;
    // }

    // Include a global actor ability save bonus
    const bonuses = foundry.utils.getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = Roll.replaceFormulaData(bonuses.save, data);
    }

    parts.push(data.abilities.con.mod);
    parts.push(data.abilities.wis.mod);
    // Evaluate the roll
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.localize("SKJAALD.DeathSavingThrow")}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      targetValue: 15,
      messageData: {
        speaker: speaker,
        "flags.skjaald.roll": {type: "death"}
      }
    });
    const roll = await d20Roll(rollData);
    if ( !roll ) return null;

    // Take action depending on the result
    const success = roll.total >= 15;
    const d20 = roll.dice[0].total;

    let chatString;

    // // Save success
    // if ( success ) {
    //   let successes = (death.success || 0) + 1;

    //   // Critical Success = revive with 1hp
    //   if ( d20 === 20 ) {
    //     await this.update({
    //       "data.attributes.death.success": 0,
    //       "data.attributes.death.failure": 0,
    //       "data.attributes.hp.value": 1
    //     });
    //     chatString = "SKJAALD.DeathSaveCriticalSuccess";
    //   }

    //   // 3 Successes = survive and reset checks
    //   else if ( successes === 3 ) {
    //     await this.update({
    //       "data.attributes.death.success": 0,
    //       "data.attributes.death.failure": 0
    //     });
    //     chatString = "SKJAALD.DeathSaveSuccess";
    //   }

    //   // Increment successes
    //   else await this.update({"data.attributes.death.success": Math.clamped(successes, 0, 3)});
    // }

    // // Save failure
    // else {
    //   let failures = (death.failure || 0) + (d20 === 1 ? 2 : 1);
    //   await this.update({"data.attributes.death.failure": Math.clamped(failures, 0, 3)});
    //   if ( failures >= 3 ) {  // 3 Failures = death
    //     chatString = "SKJAALD.DeathSaveFailure";
    //   }
    // }

    // Display success/failure chat message
    if ( chatString ) {
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData);
    }

    // Return the rolled result
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Perform a Learning throw, rolling a d20 plus any global save bonuses
   * @param {object} options        Additional options which modify the roll
   * @returns {Promise<Roll|null>}  A Promise which resolves to the Roll instance
   */
   async rollLearning(options={}) {
    
    //Get Item
    const itemId = options.event.currentTarget.parentNode.dataset.itemId;
    const item = this.items.get(itemId);
    const itemName = item.data.name;

    //Identify Perfect Student/Class Bonus/Expert of Experts
    const perfectStudent = item.data.data.perfectstudent;
    const classProfMod = item.data.data.classProfMod;
    const classExptMod = item.data.data.classExptMod;
    const classMastMod = item.data.data.classMastMod;

    // Evaluate a global saving throw bonus
    const parts = ['1d20', '1d100','1d100', '@prof', "@mod", '@conseq'];
    const data = this.getRollData();
    const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});


    // Evaluate the roll
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.localize("SKJAALD.LearningThrow")}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      skillLearning: true,
      chooseModifier: true,
      messageData: {
        speaker: speaker,
        "flags.skjaald.roll": {type: "learning"}
      }
    });
    const roll = await d20Roll(rollData);
    if ( !roll ) return null;


    // Take action depending on the result
    console.log(roll);
    
    const total = roll._total;
    const success = roll.total >= 10;
    const d20 = roll.dice[0].total;

    let chatString;

    var selectedRoll = "";
    var otherRoll = "";
    var selectedPercentile = "";
    var otherPercentile = "";

    let roll1 = roll.terms[0].results[0].result;
    let roll2 = roll.terms[2].results[0].result;
    let percentile = roll.terms[4].results[0].result;
    let percentile2 = roll.terms[6].results[0].result;
    var calculatedRoll;
    var passDC = false;
    var profBonus = 0;
    let consecBonus = 0;
    var output ;
    var newHoursNeeded = 0;
    var rollOutput;
    var exhaustion = 0;
    var tired = false;
    var originalHours = parseInt(item.data.data.learning.hoursNeeded);
    var hours;
    var originalConsecBonus = 0;
    var minHours = false;
    var moreHours;
    var fatigue = data.attributes.exhaustion.fatigue.value;
    var crit = false;
    var doubleCrit = false;
    let skillLevel = item.data.data.learning.level;
    const pb = data.attributes.prof;
    let lastLearned = data.attributes.learning.lastLearnedID;
    var abilityMod = roll.terms[10].total;
    let intensity = parseInt(roll.options.intensity);
    let pass = false;
    let finalChat = "";
    var advantageMode = roll.options.advantageMode;
    var doubleAdvantage = false;
    const intMod = data.abilities.int.mod;



    // set prof bonus
    if (skillLevel == 1){
      profBonus = 0;
    } else if (skillLevel == 0.5){
      //ui notification
      ui.notifications.info(`Unfortunately you cannot learn half proficiency. Please set your learning level to Proficient.`, {permanent: false});
      //chat message
      chatString = "Unfortunately you cannot learn half proficiency. Please set your learning level to Proficient.";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData);
      return;
    } else if (skillLevel == 2){
      profBonus = pb;
    }else if (skillLevel == 3){
      profBonus = (2*pb);
    } else {
      //ui notification
      ui.notifications.info(`You didn't set up your learning item correctly. What level of proficiency are you trying to learn?`, {permanent: false});
      //chat message
      chatString = "You didn't set up your learning item correctly. What level of proficiency are you trying to learn?";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData);
      return;
      //trigger error message -> stop roll
    }

      //Get hours trained
      if(roll.options.hours ===""){
      //ui notification
      ui.notifications.info(`Welp, you can't get much done in 0 hours, can you.`, {permanent: false});
      hours = 0;
      //chat message
      chatString = "Welp, you can't get much done in 0 hours, can you.";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData);
      return;
    } else {
      hours = parseInt(roll.options.hours);
    }
    // get conseq bonus
    consecBonus = parseInt((item.data.data.learning.conseqBonus));


    //determine trainer Bonus
    var trainerBonus = roll.terms[14].total;
    if (roll.terms[13].operator === "-"){
      trainerBonus = -trainerBonus;
    }

    // determine if need to modify advantageMode
    if(intensity == 2){
      advantageMode += 1;
    }

    // resolve advantage/disadvantage

    if (advantageMode == 1){
      // Advantage Roll
        //d20
        if(roll1 > roll2){
          selectedRoll = roll1;
          otherRoll = roll2;
        } else if (roll2 > roll1){
          selectedRoll = roll2;
          otherRoll = roll1;
        } else if (roll1 == roll2){
          selectedRoll = roll1;
          otherRoll = roll2;
        } else{
          console.log("error selecting advantage roll");
        }
        //d100
        if(percentile > percentile2){
          selectedPercentile = percentile;
          otherPercentile = percentile2;
        } else if (percentile2 > percentile){
          selectedPercentile = percentile2;
          otherPercentile = percentile;
        } else if (percentile == percentile2){
          selectedPercentile = percentile;
          otherPercentile = percentile2;
        } else{
          console.log("error selecting advantage roll");
        }
    } else if(advantageMode == 0){
      //Normal Roll
      selectedRoll = roll1;
      selectedPercentile = percentile;
    } else if(advantageMode == -1){
      // Disadvantage Roll
      //d20
      if(roll1 < roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else if (roll1 > roll2){
        selectedRoll = roll2;
        otherRoll = roll1;
      } else if (roll1 == roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else{
        console.log("error selecting disadvantage roll");
      }
      //d100
      if(percentile < percentile2){
        selectedPercentile = percentile;
        otherPercentile = percentile2;
      } else if (percentile > percentile2){
        selectedPercentile = percentile2;
        otherPercentile = percentile;
      } else if (percentile == percentile2){
        selectedPercentile = percentile;
        otherPercentile = percentile2;
      } else{
        console.log("error selecting disadvantage roll");
      }
    } else if(advantageMode == 2){
      // Double Advantage
      doubleAdvantage = true;
      if(roll1 > roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else if (roll2 > roll1){
        selectedRoll = roll2;
        otherRoll = roll1;
      } else if (roll1 == roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else{
        console.log("error selecting double advantage roll");
      }
      //d100
      if(percentile > percentile2){
        selectedPercentile = percentile;
        otherPercentile = percentile2;
      } else if (percentile2 > percentile){
        selectedPercentile = percentile2;
        otherPercentile = percentile;
      } else if (percentile == percentile2){
        selectedPercentile = percentile;
        otherPercentile = percentile2;
      } else{
        console.log("error selecting double advantage roll");
      }
    } else{
      console.log("AdvantageMode Error...");
      ui.notifications.info("Something went wrong when calculating your advantage/disadvantage type.... Damnit, Catharine!", {permanent: false});
      chatString = "Spell Learning: " + spellName + "<br><br>ALERT! TECHNICAL ERROR! What'd you mess up this time Catharine?";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 
    }

    //Deterimine Pass/Fail 
    
    if(intensity == 0){
      // Light training

      calculatedRoll = selectedRoll + selectedPercentile + abilityMod + profBonus + consecBonus + trainerBonus;


      if(hours>=1){
        minHours = true;
      } else{
        //ui notification
        ui.notifications.info(`Hey! ` + hours + " hour doesn't qualify as Light Training! You must spend at least 1 hour training for it to be conisdered Light.", {permanent: false});
        //chat message
        chatString = "Hey! " + hours + " hour doesn't qualify as Light Training! You must spend at least 1 hour training for it to be conisdered Light.";
        let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
        ChatMessage.applyRollMode(chatData, roll.options.rollMode);
        await ChatMessage.create(chatData);
        return;
      }
      if(selectedRoll == 20 || selectedPercentile == 100){
        crit = true;
      }
      if(selectedRoll == 20 && selectedPercentile == 100){
        doubleCrit = true;
      }

      if(calculatedRoll >=75){
        console.log("Passed DC");
        if(doubleCrit){
          hours = hours + (100 * hours);
        }else if(crit == true) {
          hours = hours + hours;
        } else{
          hours = hours;
        }
        pass=true;


        finalChat += "<b><u>Learning: " + itemName + "</u></b>";
        finalChat += "<br>Successful Light Training!";

        if(perfectStudent){
          finalChat += "<br><br>Perfect Student Applied";
        }
        if(classProfMod){
          finalChat += "<br>Class Proficiency Learning Modifier Applied";
        }
        if(classExptMod){
          finalChat += "<br>Class Expertise Learning Modifier Applied";
        }
        if(classMastMod){
          finalChat += "<br>Class Mastery Learning Modifier Applied";
        }
        if(classProfMod || classExptMod){
          //class modifier and maybe perfect student
          finalChat += "<br><br>Hours: ";
          if(perfectStudent){
            finalChat += "(" + hours + " + " + intMod + " (int mod) + " + pb + " (prof))";
            hours = hours + intMod + pb;
          }else{
            finalChat += hours;
          }
          hours = hours * 2;
          finalChat += " * 2 = " + hours;
        }else if(perfectStudent){
          //perfect student but no class multiplier
          finalChat += "hours + " + " + intMod + " (intMod) + " + pb + " (pb);
          hours = hours + intMod + pb;
        }else{
        }
        finalChat += "<br><br>You've completed " + hours + " hours of training";
        if(advantageMode == -1){
          finalChat += "<br><br>Rolled with Disadvantage";
        }else if(advantageMode == 1){
          finalChat += "<br><br>Rolled with Advantage";
        }else if(advantageMode == 2){
          finalChat += "<br><br>Rolled with 2x Advantage";
        }
        finalChat += "<br><br>d100: " + selectedPercentile + "<br>d20: " + selectedRoll + "<br>Trainer Bonus: "+ trainerBonus + "<br>Consecutive Bonus: " + consecBonus + "<br>Ability Mod: " + abilityMod + "<br>Proficiency: " + profBonus + "<br>Total: " + calculatedRoll + "<br>";
        
        if(advantageMode == -1 || advantageMode == 1 || advantageMode == 2){
          finalChat += "<br><br><u>Other Rolls:</u><br>d100: " + otherPercentile + "<br>d20: " + otherRoll;
        }
      }else{
        console.log("Failed DC");
        hours = hours * .5;
        if(doubleCrit == true){
          hours = hours + (hours * 100);
        }else if(crit == true){
          hours = hours + hours;
        }else{
          hours = hours;
        }


  
        finalChat += "<b><u>Learning: " + itemName + "</u></b><br>";
        finalChat += "Failed Light Training....";

        if(perfectStudent){
          finalChat += "<br><br>Perfect Student Applied";
        }
        if(classProfMod){
          finalChat += "<br>Class Proficiency Learning Modifier Applied";
        }
        if(classExptMod){
          finalChat += "<br>Class Expertise Learning Modifier Applied";
        }
        if(classMastMod){
          finalChat += "<br>Class Mastery Learning Modifier Applied";
        }
        if(classProfMod || classExptMod){
          //class modifier and maybe perfect student
          finalChat += "<br<br>>Hours: ";
          if(perfectStudent){
            finalChat += "(" + hours + " + " + intMod + " (int mod) + " + pb + " (prof))";
            hours = hours + intMod + pb;
          }else{
            finalChat += hours;
          }
          hours = hours * 2;
          finalChat += " * 2 = " + hours;
        }else if(perfectStudent){
          //perfect student but no class multiplier
          finalChat +="<br>" + hours + " + " + intMod + " (intMod) + " + pb + " (pb)";
          hours = hours + intMod + pb;
        }else{
        }
        finalChat += "<br><br>You've completed " + hours + " hours of training";
        if(advantageMode == -1){
          finalChat += "<br><br>Rolled with Disadvantage";
        }else if(advantageMode == 1){
          finalChat += "<br><br>Rolled with Advantage";
        }else if(advantageMode == 2){
          finalChat += "<br><br>Rolled with 2x Advantage";
        }
        finalChat += "<br><br>d100: " + selectedPercentile + "<br>d20: " + selectedRoll + "<br>Trainer Bonus: "+ trainerBonus + "<br>Consecutive Bonus: " + consecBonus + "<br>Ability Mod: " + abilityMod + "<br>Proficiency: " + profBonus + "<br>Total: " + calculatedRoll + "<br>";
        
        if(advantageMode == -1 || advantageMode == 1 || advantageMode == 2){
          finalChat += "<br><br><u>Other Rolls:</u><br>d100: " + otherPercentile + "<br>d20: " + otherRoll;
        }
      }
    } else if(intensity == 1){
      // Heavy Training
      console.log("Heavy training");

      if(hours>= 5){
        minHours = true;
      } else {
        ui.notifications.info(`Hey! ` + hours + " hours doesn't qualify as Heavy Training! You must spend at least 5 hours training for it to be conisdered Heavy.", {permanent: false});
        //chat message
        chatString = "Hey! " + hours + " hours doesn't qualify as Heavy Training! You must spend at least 5 hours training for it to be conisdered Heavy.";
        let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
        ChatMessage.applyRollMode(chatData, roll.options.rollMode);
        await ChatMessage.create(chatData); 
        return;
      }
      console.log(selectedRoll)
      if(selectedRoll == 20 || selectedPercentile == 100){
        crit = true;
      }
      if(selectedRoll == 20 && selectedPercentile == 100){
        doubleCrit = true;
      }

      calculatedRoll = selectedRoll + selectedPercentile + abilityMod + profBonus + consecBonus + trainerBonus;

      if(calculatedRoll >= 90){
        console.log("Passed DC");
        if(doubleCrit == true){
            hours = (hours * 5) + (100 * hours);
        }else if(crit == true){
            hours = (hours * 5) + hours;
        }else{
            hours = hours * 5;
        }
        pass = true;
        finalChat += "<b><u>Learning: " + itemName + "</u></b><br>";
        finalChat += "Successful Heavy Training!";

        if(perfectStudent){
          finalChat += "<br><br>Perfect Student Applied";
        }
        if(classProfMod){
          finalChat += "<br>Class Proficiency Learning Modifier Applied";
        }
        if(classExptMod){
          finalChat += "<br>Class Expertise Learning Modifier Applied";
        }
        if(classMastMod){
          finalChat += "<br>Class Mastery Learning Modifier Applied";
        }
        if(classProfMod || classExptMod){
          //class modifier and maybe perfect student
          finalChat += "<br<br>>Hours: ";
          if(perfectStudent){
            finalChat += "(" + hours + " + " + intMod + " (int mod) + " + pb + " (prof))";
            hours = hours + intMod + pb;
          }else{
            finalChat += hours;
          }
          hours = hours * 2;
          finalChat += " * 2 = " + hours;
        }else if(perfectStudent){
          //perfect student but no class multiplier
          finalChat += "hours + " + " + intMod + " (intMod) + " + pb + " (pb);
          hours = hours + intMod + pb;
        }else{
        }
        finalChat += "<br>You've completed " + hours + " hours of training";
        if(advantageMode == -1){
          finalChat += "<br><br>Rolled with Disadvantage";
        }else if(advantageMode == 1){
          finalChat += "<br><br>Rolled with Advantage";
        }else if(advantageMode == 2){
          finalChat += "<br><br>Rolled with 2x Advantage";
        }
        finalChat += "<br><br>d100: " + selectedPercentile + "<br>d20: " + selectedRoll + "<br>Trainer Bonus: "+ trainerBonus + "<br>Consecutive Bonus: " + consecBonus + "<br>Ability Mod: " + abilityMod + "<br>Proficiency: " + profBonus + "<br>Total: " + calculatedRoll + "<br>";
        
        if(advantageMode == -1 || advantageMode == 1 || advantageMode == 2){
          finalChat += "<br><br><u>Other Rolls:</u><br>d100: " + otherPercentile + "<br>d20: " + otherRoll;
        }
     }else{
        console.log("failed DC");
        hours = hours * .5;
        if(doubleCrit == true){
            hours = hours + (100 * hours);
        }else if(crit == true){
            hours = hours + hours;
        }else{
            hours = hours;
        }
        finalChat += "<b><u>Learning: " + itemName + "</u></b><br>";
        finalChat += "Failed Heavy Training....";

        if(perfectStudent){
          finalChat += "<br><br>Perfect Student Applied";
        }
        if(classProfMod){
          finalChat += "<br>Class Proficiency Learning Modifier Applied";
        }
        if(classExptMod){
          finalChat += "<br>Class Expertise Learning Modifier Applied";
        }
        if(classMastMod){
          finalChat += "<br>Class Mastery Learning Modifier Applied";
        }
        if(classProfMod || classExptMod){
          //class modifier and maybe perfect student
          finalChat += "<br<br>>Hours: ";
          if(perfectStudent){
            finalChat += "(" + hours + " + " + intMod + " (int mod) + " + pb + " (prof))";
            hours = hours + intMod + pb;
          }else{
            finalChat += hours;
          }
          hours = hours * 2;
          finalChat += " * 2 = " + hours;
        }else if(perfectStudent){
          //perfect student but no class multiplier
          finalChat += "hours + " + " + intMod + " (intMod) + " + pb + " (pb);
          hours = hours + intMod + pb;
        }else{
        }
        finalChat += "<br>You've completed " + hours + " hours of training";
        if(advantageMode == -1){
          finalChat += "<br><br>Rolled with Disadvantage";
        }else if(advantageMode == 1){
          finalChat += "<br><br>Rolled with Advantage";
        }else if(advantageMode == 2){
          finalChat += "<br><br>Rolled with 2x Advantage";
        }
        finalChat += "<br><br>d100: " + selectedPercentile + "<br>d20: " + selectedRoll + "<br>Trainer Bonus: "+ trainerBonus + "<br>Consecutive Bonus: " + consecBonus + "<br>Ability Mod: " + abilityMod + "<br>Proficiency: " + profBonus + "<br>Total: " + calculatedRoll + "<br>";
        
        if(advantageMode == -1 || advantageMode == 1 || advantageMode == 2){
          finalChat += "<br><br><u>Other Rolls:</u><br>d100: " + otherPercentile + "<br>d20: " + otherRoll;
        }
      }

    } else if(intensity == 2){
      // Exhaustive Training
      console.log("Exhaustive training");
      var fatHours = hours;
            while(fatHours >= 4){
                exhaustion += 1;
                fatHours = fatHours - 4;
            }
            console.log("Exhaustion Levels: " + exhaustion);

            if((fatigue + exhaustion)> 6){
                tired = true;
                //ui notification
                ui.notifications.info(`Zzzzzzz, You're too tired for that training! Change the number of hours or type of training, please.`, {permanent: false});
                //chat message
                chatString = "Zzzzzzz, You're too tired for that training! Change the number of hours or type of training, please.";
                let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
                ChatMessage.applyRollMode(chatData, roll.options.rollMode);
                await ChatMessage.create(chatData); 
                return;
            }else{
                fatigue = fatigue + exhaustion;
                this.update({"data.attributes.exhaustion.fatigue.value": fatigue});
            }
            if(hours >= 8){
                minHours = true;
            } else{
              //ui notification
              ui.notifications.info(`Hey! ` + hours + " hours doesn't qualify as Exhaustive Training! You must spend at least 8 hours training for it to be conisdered Exhaustive.", {permanent: false});
              //chat message
             chatString = "Hey! " + hours + " hours doesn't qualify as Exhaustive Training! You must spend at least 8 hours training for it to be conisdered Exhaustive.";
              let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
              ChatMessage.applyRollMode(chatData, roll.options.rollMode);
              await ChatMessage.create(chatData); 
              return;
            }
            
            if(selectedRoll == 20 || selectedPercentile == 100){
                crit = true;
            }
            if(selectedRoll == 20 && selectedPercentile == 100){
                doubleCrit = true;
            }

            calculatedRoll = selectedRoll + selectedPercentile + abilityMod + profBonus + consecBonus + trainerBonus;
            if(doubleAdvantage){
              calculatedRoll += 2;
            }

            if(calculatedRoll >= 100){
                console.log("Passed DC");
                if(doubleCrit == true){
                    hours = (hours * 10) + (100 * hours);
                }else if(crit == true){
                    hours = (hours * 10) + hours;
                }else{
                    hours = hours * 10;
                }
                pass = true;
                finalChat += "<b><u>Learning: " + itemName + "</u></b><br>";
                finalChat += "Successful Exhuastive Training!";

                if(perfectStudent){
                  finalChat += "<br><br>Perfect Student Applied";
                }
                if(classProfMod){
                  finalChat += "<br>Class Proficiency Learning Modifier Applied";
                }
                if(classExptMod){
                  finalChat += "<br>Class Expertise Learning Modifier Applied";
                }
                if(classMastMod){
                  finalChat += "<br>Class Mastery Learning Modifier Applied";
                }
                if(classProfMod || classExptMod){
                  //class modifier and maybe perfect student
                  finalChat += "<br<br>>Hours: ";
                  if(perfectStudent){
                    finalChat += "(" + hours + " + " + intMod + " (int mod) + " + pb + " (prof))";
                    hours = hours + intMod + pb;
                  }else{
                    finalChat += hours;
                  }
                  hours = hours * 2;
                  finalChat += " * 2 = " + hours;
                }else if(perfectStudent){
                  //perfect student but no class multiplier
                  finalChat += "hours + " + " + intMod + " (intMod) + " + pb + " (pb);
                  hours = hours + intMod + pb;
                }else{
                }
                finalChat += "<br>You've completed " + hours + " hours of training<br>Fatigue levels Gained: " + exhaustion;   
                if(advantageMode == -1){
                  finalChat += "<br><br>Rolled with Disadvantage";
                }else if(advantageMode == 1){
                  finalChat += "<br><br>Rolled with Advantage";
                }else if(advantageMode == 2){
                  finalChat += "<br><br>Rolled with 2x Advantage";
                }  
                finalChat += "<br><br>d100: " + selectedPercentile + "<br>d20: " + selectedRoll + "<br>Trainer Bonus: "+ trainerBonus + "<br>Consecutive Bonus: " + consecBonus + "<br>Ability Mod: " + abilityMod + "<br>Proficiency: " + profBonus;
                if(doubleAdvantage){
                  finalChat += "<br>Advantage Bonus: 2";
                }
                finalChat += "<br>Total: " + calculatedRoll + "<br>";
                
                if(advantageMode == -1 || advantageMode == 1 || advantageMode == 2){
                  finalChat += "<br><br><u>Other Rolls:</u><br>d100: " + otherPercentile + "<br>d20: " + otherRoll;
                }   
            }else{
                console.log("failed DC");
                hours = hours * .5;
                if(doubleCrit == true){
                    hours = hours + (100 * hours);
                }else if(crit == true){
                    hours = hours + hours;
                }else{
                    hours = hours;
                }
                finalChat += "<b><u>Learning: " + itemName + "</u></b>";
                finalChat += "<br>Failed Exhaustive Training..."

                if(perfectStudent){
                  finalChat += "<br><br>Perfect Student Applied";
                }
                if(classProfMod){
                  finalChat += "<br>Class Proficiency Learning Modifier Applied";
                }
                if(classExptMod){
                  finalChat += "<br>Class Expertise Learning Modifier Applied";
                }
                if(classMastMod){
                  finalChat += "<br>Class Mastery Learning Modifier Applied";
                }
                if(classProfMod || classExptMod){
                  //class modifier and maybe perfect student
                  finalChat += "<br<br>>Hours: ";
                  if(perfectStudent){
                    finalChat += "(" + hours + " + " + intMod + " (int mod) + " + pb + " (prof))";
                    hours = hours + intMod + pb;
                  }else{
                    finalChat += hours;
                  }
                  hours = hours * 2;
                  finalChat += " * 2 = " + hours;
                }else if(perfectStudent){
                  //perfect student but no class multiplier
                  finalChat += "hours + " + " + intMod + " (intMod) + " + pb + " (pb);
                  hours = hours + intMod + pb;
                }else{
                }
                finalChat += "<br>You've completed " + hours + " hours of training<br>Fatigue levels Gained: " + exhaustion + "<br>";

                if(advantageMode == -1){
                  finalChat += "<br>Rolled with Disadvantage";
                }else if(advantageMode == 1){
                  finalChat += "<br>Rolled with Advantage";
                }else if(advantageMode == 2){
                  finalChat += "<br>Rolled with 2x Advantage";
                }
                finalChat += "<br>d100: " + selectedPercentile + "<br>d20: " + selectedRoll + "<br>Trainer Bonus: "+ trainerBonus + "<br>Consecutive Bonus: " + consecBonus + "<br>Ability Mod: " + abilityMod + "<br>Proficiency: " + profBonus;
                if(doubleAdvantage){
                  finalChat += "<br>Advantage Bonus: 2";
                }
                finalChat += "<br>Total: " + calculatedRoll;

                if(advantageMode == -1 || advantageMode == 1 || advantageMode == 2){
                  finalChat += "<br><br><u>Other Rolls:</u><br>d100: " + otherPercentile + "<br>d20: " + otherRoll;
                }
            }

    } else{
      console.log("Intensity: Error");
    }

    //update hours needed based on roll
    newHoursNeeded = originalHours - hours;
    if (newHoursNeeded < 0){
      newHoursNeeded = 0;
    }
    console.log("hours earned: " + hours);

    var totalHoursEarned = parseInt(item.data.data.learning.hours) + hours;
    item.update({
      "data.learning.hours": totalHoursEarned, "data.learning.hoursNeeded": newHoursNeeded
    });

    let skillLevelWord = "";
    if(skillLevel = 1){
      skillLevelWord = "Proficient";
    } else if (skillLevel = 2){
      skillLevelWord = "An Expert";
    } else if (skillLevel = 3){
      skillLevelWord = "A Master";
    }

    if(newHoursNeeded == 0){
      chatString = "Wooooooo! Congratulations! You are now " + skillLevelWord + " at " + itemName + ".";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 
      if(skillLevel < 4){
        skillLevel = skillLevel;
      item.update({"data.proficient": skillLevel, "data.learning.currently": false, "data.learning.hours": 0});
      }
    }

    
    let chatData = { content: game.i18n.format(finalChat, {name: this.name}), speaker };
    ChatMessage.applyRollMode(chatData, roll.options.rollMode);
    await ChatMessage.create(chatData); 

    // update conseq bonus
    if(lastLearned == item.data._id){ // check if conseq bonus applies to roll
      consecBonus = parseInt((item.data.data.learning.conseqBonus)) + 1;
      await item.update({"data.learning.conseqBonus": (parseInt(item.data.data.learning.conseqBonus) + 1)});
    } 
    else{
      //save last learned
      const oldLastLearn = lastLearned;
      // update the lastLearnedID & name
      await this.update({"data.attributes.learning.lastLearnedID": [item.data._id], "data.attributes.learning.lastLearnedName": [item.data.name]});
      // remove conseq bonus from previous skill
      if (oldLastLearn != ""){ // check if last item has a value - Has character learned something before or is there nothing to update yet
        let lastItem = this.items.get(oldLastLearn[0]);
        if (lastItem != undefined){ // check if last item has been deleted
          await lastItem.update({"data.learning.conseqBonus": 0});
        }
      }
      //increment conseqBonus
      item.update({"data.learning.conseqBonus": (item.data.data.learning.conseqBonus + 1)});
    }

    return roll;
  }


  /* -------------------------------------------- */

  /**
   * Perform a Learning throw, rolling a d20 plus any global save bonuses
   * @param {object} options        Additional options which modify the roll
   * @returns {Promise<Roll|null>}  A Promise which resolves to the Roll instance
   */
  async rollSpellLearning(options={}) {
    
    //Get Item
    const itemId = options.event.currentTarget.parentNode.dataset.itemId;
    const item = this.items.get(itemId);
    const itemName = item.data.name;

    // Evaluate a global saving throw bonus
    const parts = ['1d20', '1d100','1d100', '@prof', "@mod", '@conseq'];
    const data = this.getRollData();
    const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});


    // Evaluate the roll
    const rollData = foundry.utils.mergeObject(options, {
      parts: parts,
      data: data,
      title: `${game.i18n.localize("SKJAALD.LearningThrow")}: ${this.name}`,
      halflingLucky: this.getFlag("skjaald", "halflingLucky"),
      spellLearning: true,
      chooseModifier: true,
      messageData: {
        speaker: speaker,
        "flags.skjaald.roll": {type: "learning"}
      }
    });

    const roll = await d20Roll(rollData);
    if ( !roll ) return null;

    //Identify Perfect Student/Class Bonus/Expert of Experts
    const perfectStudent = item.data.data.perfectstudent;
    const classProfMod = item.data.data.classProfMod;



    // Take action depending on the result
    console.log(roll);
    const actorID = speaker.actor;
    const actor = game.actors.get(actorID).data;
    const total = roll._total;
    const success = roll.total >= 10;
    const d20 = roll.dice[0].total;

    let chatString;

    var selectedRoll = "";
    var otherRoll = "";
    var selectedPercentile = "";
    var otherPercentile = "";

    let roll1 = roll.terms[0].results[0].result;
    let roll2 = roll.terms[2].results[0].result;
    var selectedRoll = 0;
    let percentile = roll.terms[4].results[0].result;
    var calculatedRoll;
    var dc = 0;
    var profBonus = 0;
    var rollOutput;
    var totalHoursNeeded = item.data.data.learning.hoursTotal;
    var totalArcanaNeeded = item.data.data.learning.arcanaTotal;
    var newHoursNeeded = 0;
    var newArcanaNeeded = 0;
    var hoursLearned = 0;
    var crit = false;
    var doubleCrit = false;
    let spellLevel = item.data.data.learning.level;
    const pb = data.attributes.prof;
    var abilityMod = roll.terms[10].total;
    let finalChat = "";
    var wizLevel = 0;
    var totalArcana = 0;
    var pass = false;
    var advantageMode = roll.options.advantageMode;
    var arcanabonus = data.skills.arc.total;
    var wizLevel = 0;
    var baseHours = 1;
    var templateModifier = -1000;
    var baseArcana = 0;
    var hours = 1;
    var templatePaths = item.data.data.templatePaths; 
    var templatePathName = "";
    var noTemplatePaths = false;
    var itemList = actor.items;
    var spellName = item.data.name;
    var previousArcana = parseInt(item.data.data.learning.arcana);
    var previousHours = parseInt(item.data.data.learning.hours);
    const intMod = data.abilities.int.mod;



    // Calculate DC for roll
    dc = 10 + (2 * spellLevel);

    // check for use spell charge
    var useSpellCharge = roll.options.useSpellCharge;

    if(useSpellCharge === false){
      advantageMode -= 1;
    }

    // resolve advantage/disadvantage
    if (advantageMode == 1){
      // Advantage Roll
        if(roll1 > roll2){
          selectedRoll = roll1;
          otherRoll = roll2;
        } else if (roll2 > roll1){
          selectedRoll = roll2;
          otherRoll = roll1;
        } else if (roll1 == roll2){
          selectedRoll = roll1;
          otherRoll = roll2;
        } else{
          console.log("error selecting advantage roll");
        }
    } else if(advantageMode == 0){
      //Normal Roll
      selectedRoll = roll1;
    } else if(advantageMode == -1){
      // Disadvantage Roll
      if(roll1 < roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else if (roll1 > roll2){
        selectedRoll = roll2;
        otherRoll = roll1;
      } else if (roll1 == roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else{
        console.log("error selecting disadvantage roll");
      }
    } else if(advantageMode == -2){
      // Double Disadvantage
      if(roll1 < roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else if (roll1 > roll2){
        selectedRoll = roll2;
        otherRoll = roll1;
      } else if (roll1 == roll2){
        selectedRoll = roll1;
        otherRoll = roll2;
      } else{
        console.log("error selecting disadvantage roll");
      }
    } else{
      console.log("AdvantageMode Error...");
      ui.notifications.info("Something went wrong when calculating your advantage/disadvantage type.... Damnit, Catharine!", {permanent: false});
      chatString = "Spell Learning: " + spellName + "<br><br>ALERT! TECHNICAL ERROR! What'd you mess up this time Catharine?";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 
    }

    // check for crit
    if(selectedRoll == 20){
      console.log("Crit!");
      crit = true;
    }
    console.log(data);

    //calculate final arcana value
    if(advantageMode == -2){
      totalArcana = selectedRoll + arcanabonus - 2;
    } else{
    totalArcana = selectedRoll + arcanabonus;
    }


    // Get Wizard Level
    var classes = data.classes;
    for (const key in classes) {
      if (key == "Wizard" || key == "wizard"){
        if(wizLevel == 0){
          wizLevel = `${classes[key].levels}`;
          wizLevel = parseInt(wizLevel);
        } else{
          console.log("Error Multiple Wizard Levels Found");
          ui.notifications.info("Wow! You're talented enough to be a wizard twice? Must not be THAT good if you're still trying to learn spells.... Go check your classes!", {permanent: false});
          chatString = "Spell Learning: " + spellName + "<br><br>Roll Cancelled<br>Wow! You're talented enough to be a wizard twice? Why are you still trying to learn spells???<br><br> You have multiple wizrd classes. Go delete one please.";
          let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
          ChatMessage.applyRollMode(chatData, roll.options.rollMode);
          await ChatMessage.create(chatData); 
          return;
        }
      }
    }
    if(wizLevel == 0){
      console.log("Error: No Wizard Class found");
      ui.notifications.info("You're NOT a wizard, Harry! Go check your classes!", {permanent: false});
      chatString = "Spell Learning: " + spellName + "<br><br>Roll Cancelled<br>You're not a wizard, Harry!<br><br> No wizard level found. Please make sure you have a wizard class, and that the class name is spelled correctly.";
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 
      return;
    }

    // Check DC Pass/Fail
    if(totalArcana >= dc){
      pass = true;
      console.log("Passed DC");
    } else{
      console.log("Failed DC");

      // chat message
      chatString = "Spell Learning: " + spellName + "<br><br>Better luck next time!<br>DC Failed. No learning accomplished.<br><br>";
      if(perfectStudent){
        chatString += "But Gnomes never really fail at learning....<br>";
        var perfectStudentHours;
        if(classProfMod){
          perfectStudentHours = intMod * 2;
          chatString += perfectStudentHours + " hours gained<br> Perfect Student & Class Proficiency Modifier Applied!<br>(int mod * 2)<br><br>";
          var newArcana = previousArcana + perfectStudentHours;
          var updatedArcanaNeeded = totalArcanaNeeded - newArcana;

          item.update({"data.learning.arcana": newArcana , "data.learning.arcanaNeeded": updatedArcanaNeeded});


        }else{
          perfectStudentHours = intMod;
          chatString +="<b>" + perfectStudentHours + " hours gained</b><br> Perfect Student Applied!<br>";
          var newArcana = previousArcana + perfectStudentHours;
          var updatedArcanaNeeded = totalArcanaNeeded - newArcana;

          item.update({"data.learning.arcana": newArcana , "data.learning.arcanaNeeded": updatedArcanaNeeded});

        }



      }
      if(advantageMode == 1 || advantageMode == -1){
        chatString += "D20: " + selectedRoll + "<br>Other D20: " + otherRoll;
      } else if(advantageMode == 0){
        chatString += "D20: " + selectedRoll;
      }else if(advantageMode == -2){
        chatString += "D20: " + selectedRoll + "<br>Other D20: " + otherRoll + "<br>Additional Disadvantage Modifier: -2";
      } else {
        chatString += "Error configuring chat message";
      }
      chatString += "<br>Arcana bonus: " + arcanabonus + "<br><br>Roll Calculation: D20 + Arcana bonus<br>" + selectedRoll + " + "  + arcanabonus;
      if(advantageMode == -2){
        chatString += " - 2";
      }
      chatString += " = " + totalArcana + "<br>DC: " + dc;
      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 

      return;
    }

    // resolve crit
    if (crit == true){
      totalArcana += percentile;
      hours = 4;
    }

    // template knowledge - add/subtract from base arcana value - does not effect hours - no modifier if there are no templates to spell
      // modifier # template spells known - not known

    if(templatePaths != undefined){

      // iterate through template paths
      for (const [key, value] of Object.entries(templatePaths)){
        var spells = value.spells;
        var unknownSpells = 0;
        var knownSpells = 0;
        // iterate through template spells
        for (const [key2, value2] of Object.entries(spells)){
          var spellName = value2.name;
          var spellKnown = false;
          //iternate through items to find spells
          itemList.forEach(item => {
            // if item is a spell check if match
            if (item.data.type == "spell"){
              // if spell matches template spell
              if ((item.data.name).toLowerCase() === spellName.toLowerCase()){
                var minimumLevel = value2.minLevel;
                var learned = item.data.data.learned;
                //if minimum level is N/A add to known else factor in minimum level
                if(minimumLevel == -1){
                  if(learned.cantrip === true || learned.one === true || learned.two === true || learned.three === true || learned.four === true || learned.five === true || learned.six === true || learned.seven === true || learned.eight === true || learned.nine === true || learned.ten === true || learned.eleven === true || learned.twelve === true || learned.thirteen === true){
                    spellKnown = true;
                  }
                } else{
                  var maxLevelKnown = -1;
                  if(learned.cantrip === true){
                    maxLevelKnown = 0;
                  }
                  if(learned.one === true){
                    maxLevelKnown = 1;
                  }
                  if(learned.two === true){
                    maxLevelKnown = 2;
                  }
                  if(learned.three === true){
                    maxLevelKnown = 3;
                  }
                  if(learned.four === true){
                    maxLevelKnown = 4;
                  }
                  if(learned.five === true){
                    maxLevelKnown = 5;
                  }
                  if(learned.six === true){
                    maxLevelKnown = 6;
                  }
                  if(learned.seven === true){
                    maxLevelKnown = 7;
                  }
                  if(learned.eight === true){
                    maxLevelKnown = 8;
                  }
                  if(learned.nine === true){
                    maxLevelKnown = 9;
                  }
                  if(learned.ten === true){
                    maxLevelKnown = 10;
                  }
                  if(learned.eleven === true){
                    maxLevelKnown = 11;
                  }
                  if(learned.twelve === true){
                    maxLevelKnown = 12;
                  }
                  if(learned.thirteen === true){
                    maxLevelKnown = 13;
                  }
                  if (maxLevelKnown >= minimumLevel){
                    spellKnown += 1;
                  }
                }

              }
            }
          })
          if(spellKnown === true){
            knownSpells += 1;
          }else{
            unknownSpells += 1;
          }
        }
        var currentModifier = knownSpells - unknownSpells;
        if (currentModifier > templateModifier){
          templateModifier = currentModifier;
          templatePathName = value.name;
        }
      }
    }
    // base values (include crit & template)
    if (templateModifier == -1000){
      baseArcana = totalArcana;
      templateModifier = 0;
      noTemplatePaths = true;
    }else {
     baseArcana = totalArcana + templateModifier;
    }




    // resolve pillars from base

    var knownPillar =  data.spell.pillar;
    var knownSpec = data.spell.specialty;
    var knownMinor1 = data.spell.minor1;
    var knownMinor2 = data.spell.minor2;
    var pillarMatch = false;
    var specMatch = false;
    var minorMatch = false;
    var spellSchools = item.data.data.school;
    var checkedSpellSchools = [];
    var pillarArcanaAdd = 0;
    var pillarArcanaMult = 0;
    var pillarHourAdd = 0;
    var pillarHourMult = 0;
    var pillarArcana = 0;
    var pillarHours = 0;

    // Get list of spell schools
    for (const [key, value] of Object.entries(spellSchools)){
      if(value){
        checkedSpellSchools.push(key);
      }
    }
    // Check for Pillar Match
    if (knownPillar !== "none"){
      var spellPillar = [];
      if(item.data.data.school.abj || item.data.data.school.evo){
        spellPillar.push("arc");
      }
      if (item.data.data.school.con|| item.data.data.school.trs){
        spellPillar.push("mas");
      }
      if(item.data.data.school.nec || item.data.data.school.bio){
        spellPillar.push("ess");
      }
      if(item.data.data.school.enc || item.data.data.school.ill || item.data.data.school.div){
        spellPillar.push("psi");
      }
      if(item.data.data.school.nat){
        spellPillar.push("nat");
      }
      if(item.data.data.school.din){
        spellPillar.push("div");
      }
      spellPillar.forEach(pillar => {
        if(pillar === knownPillar){
          pillarMatch = true;
          console.log("Pillar Bonus!");
        }
      })
    } else{
      console.log("No Pillar");
    }

    //resolve specialization
    if (knownSpec !== "none"){
      console.log("Specialization selected");
      checkedSpellSchools.forEach(school => {
        if (school == knownSpec){
          specMatch = true;
          console.log("Specialty Bonus!"); 
        }
      })
    } else{
      console.log("No Specialization");
    }

    //resolve minors - in both minors only apply minor bonus once
    if (knownMinor1 !== "none" || knownMinor2 !== "none"){
      console.log("Minor(s) selected");
      console.log(knownMinor1);
      console.log(knownMinor2);
      checkedSpellSchools.forEach(school => {
        if (school == knownMinor1 || school == knownMinor2){
          console.log(school);
          console.log(checkedSpellSchools);
          minorMatch = true;
          console.log("Minor Bonus!"); 
        }
      })
    } else{
      console.log("No Minors");
    }

    //Apply pillars to base
    if(pillarMatch){
      pillarArcanaAdd += wizLevel;
      pillarHourMult += 1.5;
    }
    if(specMatch){
      pillarArcanaMult += 2;
      pillarHourMult += 2;
    }
    if(minorMatch){
      pillarArcanaAdd += wizLevel;
      pillarHourMult += 1.5;
    }

    if(pillarArcanaMult != 0){
      pillarArcana = (baseArcana * pillarArcanaMult) + pillarArcanaAdd;
    } else{
      if(pillarArcanaAdd != 0){
        pillarArcana = baseArcana + pillarArcanaAdd;
      }else{
        pillarArcana = 0;
      }
    }
    if(pillarHourMult != pillarHours){
      pillarHours = (baseHours * pillarHourMult) + pillarHourAdd;
    } else{
      pillarHours = baseHours + pillarHourAdd;
    }
    console.log("Pillar hours: " + pillarHours);
    console.log("Pillar Arcana: " + pillarArcana);

    // resolve aids 
    var aidBonusArcanaAdd = 0;
    var aidBonusArcanaMult = 0;
    var aidBonusHoursAdd = 0;
    var aidBonusHoursMult = 0;
    var aidArcana = 0;
    var aidHours = 0;

    //scroll bonus
    if(roll.options.scrollBonus){
      aidBonusHoursMult += 3;
    }

    //spellbook bonus
    if(roll.options.spellbookBonus){
      aidBonusArcanaMult += 3;
      aidBonusHoursMult += 3;
    }

    //instructor Bonus
    if(roll.options.instructorAdditiveBonusArcana != ""){
      aidBonusArcanaAdd += parseInt(roll.options.instructorAdditiveBonusArcana);
    }
    if(roll.options.instructorAdditiveBonusHour != ""){
      aidBonusHoursAdd += parseInt(roll.options.instructorAdditiveBonusHour);
    }
    if(roll.options.instructorMultipleBonusArcana != ""){
      aidBonusArcanaMult += parseInt(roll.options.instructorMultipleBonusArcana);
    }
    if(roll.options.instructorMultipleBonusHour != ""){
      aidBonusHoursMult += parseInt(roll.options.instructorMultipleBonusHour);
    }

    // other aid Bonus
    if(roll.options.otherAdditiveBonusArcana != ""){
      aidBonusArcanaAdd += parseInt(roll.options.otherAdditiveBonusArcana);
    }
    if(roll.options.otherAdditiveBonusHour != ""){
      aidBonusHoursAdd += parseInt(roll.options.otherAdditiveBonusHour);
    }
    if(roll.options.otherMultipleBonusArcana != ""){
      aidBonusArcanaMult += parseInt(roll.options.otherMultipleBonusArcana);
    }
    if(roll.options.otherMultipleBonusHour != ""){
      aidBonusHoursMult += parseInt(roll.options.otherMultipleBonusHour);
    }

    if(aidBonusHoursMult != 0){
      aidHours = (baseHours * aidBonusHoursMult) + aidBonusHoursAdd;
    } else{
      if(aidBonusHoursAdd == 0){
        aidHours = 0;
      }else{
        aidHours = baseHours + aidBonusHoursAdd;
      }
    }

    if(aidBonusArcanaMult != 0){
      aidArcana = (baseArcana * aidBonusArcanaMult) + aidBonusArcanaAdd;
    } else{
      if(aidBonusArcanaAdd == 0){
        aidArcana = 0;
      }else{
        aidArcana = baseArcana + aidBonusArcanaAdd;
      }
    }

    // add together pillar and aids
    var totalArcana = aidArcana + pillarArcana;
    var totalHours = aidHours + pillarHours;
 
    if(totalArcana == 0){
      totalArcana = baseArcana;
    }
    if(totalHours ==0 ){
      totalHours = baseHours;
    }
    // Complexity - very end of calculations
      // divides final amount of arcana by complexity level ( 3 or 4 levels) - spell details

    var complexity = parseInt(item.data.data.complexity);
    var precomplexityArcana = totalArcana;
    totalArcana = totalArcana/complexity;


    // modify hours/arcana needed totals


    var gainedArcana = totalArcana;
    var gainedHours = totalHours;

    if(perfectStudent){
      totalArcana = totalArcana + intMod;
      gainedArcana = gainedArcana + intMod;
    }
    if(classProfMod){
      totalArcana = totalArcana * 2;
      gainedArcana = gainedArcana * 2;
    }
    totalArcana = previousArcana + totalArcana;
    totalHours = previousHours + totalHours;
    newHoursNeeded = totalHoursNeeded - totalHours;
    newArcanaNeeded = totalArcanaNeeded - totalArcana;


    //check for negative numbers - set to zero
    if(newArcanaNeeded < 0){
      newArcanaNeeded = 0;
    }
    if(newHoursNeeded < 0){
      newHoursNeeded = 0;
    }
    //check if completely learned?
    if(newHoursNeeded == 0 && newArcanaNeeded == 0){
      var levelLearned = "";
      //update level learned
      if(spellLevel == 0){
        levelLearned = "data.learned.cantrip";
      } else if(spellLevel == 1){
        levelLearned = "data.learned.one";
      } else if(spellLevel == 2){
        levelLearned = "data.learned.two";
      } else if(spellLevel == 3){
        levelLearned = "data.learned.three";
      } else if(spellLevel == 4){
        levelLearned = "data.learned.four";
      } else if(spellLevel == 5){
        levelLearned = "data.learned.five";
      } else if(spellLevel == 6){
        levelLearned = "data.learned.six";
      } else if(spellLevel == 7){
        levelLearned = "data.learned.seven";
      } else if(spellLevel == 8){
        levelLearned = "data.learned.eight";
      } else if(spellLevel == 9){
        levelLearned = "data.learned.nine";
      } else if(spellLevel == 10){
        levelLearned = "data.learned.ten";
      } else if(spellLevel == 11){
        levelLearned = "data.learned.eleven";
      } else if(spellLevel == 12){
        levelLearned = "data.learned.twelve";
      } else if(spellLevel == 13){
        levelLearned = "data.learned.thirteen";
      }

      var levelDescription = "";
      if (spellLevel == 0){
        levelDescription = "cantrip";
      } else {
        levelDescription = "level " + spellLevel;
      }
      // chat output for completed learning
      chatString = "Spell Learning: " + spellName + "Wooooooo! Congratulations! You have learned " + levelDescription + " " + spellName +  "!<br>";
      // other chat details


      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 

      item.update({[levelLearned]: true, "data.learning.currently": false, "data.learning.arcana": 0 , "data.learning.hours": 0, "data.learning.hoursNeeded": 0, "data.learning.arcanaNeeded": 0})
    } else{
      chatString = "<b>Spell Learning: " + spellName + "</b><br><br>"; 
      chatString += "Learning Successful!<br>" +  gainedHours + " Hours gained & " + gainedArcana + " Arcana gained<br><br>";

      if(perfectStudent){
        chatString += "Perfect Student Applied<br>";
      }
      if(classProfMod){
        chatString += "Class Proficiency Modifier Applied<br>";
      }

      //rolls
      if(advantageMode == 1 || advantageMode == -1){
        if(advantageMode == 1){
          chatString += "<br>Rolled with Advantage<br>";
        } else{
          chatString += "<br>Rolled with Disadvantage<br>";
        }
        chatString += "<br>D20: " + selectedRoll + "<br>Other D20: " + otherRoll;
      } else if(advantageMode == 0){
        chatString += "D20: " + selectedRoll;
      }else if(advantageMode == -2){
        chatString += "Rolled with 2x Disadvantage<br>D20: " + selectedRoll + "<br>Other D20: " + otherRoll + "<br>Additional Disadvantage Modifier: -2";
      } else {
        chatString += "Error configuring chat message";
      }
      chatString += "<br>Arcana bonus: " + arcanabonus + "<br><br><u><b>Arcana(DC) Calculation:</b></u><br> D20 + Arcana bonus";


      if(advantageMode == -2){
        chatString += " + Disadvantage Modifier";
      }

      chatString +="<br>" + selectedRoll + " + "  + arcanabonus;

      var dcValue = selectedRoll + arcanabonus;

      if(advantageMode == -2){
        chatString += " - 2";
        dcValue -=2;
      }
   
      chatString += " = " + dcValue + "<br>DC: " + dc + "<br>";

      // crit & template paths
      if(crit){
        chatString += "<br><br>Critical Success! (+3 hours and +1d100 arcana) <br>";
        chatString += "D100: " + percentile + "<br><br>";
      }
      if(noTemplatePaths){
        chatString += "<br>Template Path: No template path or spells are included with this spell<br>"
      }else{
        chatString += "Template Path: " + templatePathName + "<br>Template Modifier: " + templateModifer; 
      }
      //tradiditon bonuses
      chatString += "<br><u><b>Tradition Bonuses:</b></u><br>"
      if(pillarMatch){
        chatString += "Pillar Specialization (+Wiz Level and 1.5x hours)<br>";
      }
      if(specMatch){
        chatString += "Magical Tradition (2x arcana and 2x hours)<br>";
      }
      if(minorMatch){
        chatString += "Minor Matgical Tradition (+Wiz Level)<br>";
      }
      if(!pillarMatch && !specMatch && !minorMatch){
        chatString += "No Bonuses<br>";
      }
      if(pillarArcana != 0 && pillarHours != 0){
        chatString += "<br>Arcana from Traditions: " + pillarArcana + "<br>Hours from Traditions: "  + pillarHours;
      }

      //aid bonuses
      chatString += "<br><br><b><u>Aid Bonuses:</u></b><br>";
      if(roll.options.scrollBonus){
        chatString += "Scroll Bonus (x3 hours)<br>";
      }
      if(roll.options.spellbookBonus){
        chatString += "Spellbook Bonus (x3 hours and x3 arcana)<br>";
      }
      if(roll.options.instructorAdditiveBonusArcana != "" || roll.options.instructorAdditiveBonusHour != "" || roll.options.instructorMultipleBonusArcana != "" || roll.options.instructorMultipleBonusHour != "" || roll.options.otherAdditiveBonusArcana != "" || roll.options.otherAdditiveBonusHour != "" || roll.options.otherMultipleBonusArcana != "" || roll.options.otherMultipleBonusHour != ""){
        chatString += "Instructor & Other Aid:<br>Arcana Additive: " + aidBonusArcanaAdd + "<br>Arcana Multiple: " + aidBonusArcanaMult + "<br>Hours Additive: " + aidBonusHoursAdd + "<br>Hours Multiple: " + aidBonusHoursMult + "<br>";
      }
      if(roll.options.instructorAdditiveBonusArcana != "" || roll.options.instructorAdditiveBonusHour != "" || roll.options.instructorMultipleBonusArcana != "" || roll.options.instructorMultipleBonusHour != "" || roll.options.otherAdditiveBonusArcana != "" || roll.options.otherAdditiveBonusHour != "" || roll.options.otherMultipleBonusArcana != "" || roll.options.otherMultipleBonusHour != "" ||  roll.options.spellbookBonus || roll.options.scrollBonus){
        chatString += "<br>Aid total arcana: " + aidArcana + "<br>Aid total hours: " + aidHours + "<br>";
      }else{
        chatString += "No Bonuses<br>";
      }

      if(aidArcana == 0 && aidHours == 0 && pillarArcana == 0 && pillarHours == 0 ){
        chatString += "<br>Base Hours Only: " + hours + "<br>Base Arcana Only: " + baseArcana + "<br>";
      }

      //total numbers
      chatString += "<br>Arcana / Complexity: " + precomplexityArcana + " / " + complexity + " = " + (precomplexityArcana/complexity);
      if(perfectStudent){
        if(classProfMod){
          chatString += "<br> Perfect Student & Class Proficiency Modifier: (Arcana + int mod) * 2 = " + ((dcValue + intMod)*2);

        }else{
          chatString += "<br> Perfect Student: Arcana + int mod = " + (dcValue + intMod);
        }
      } else if(classProfMod){
        chatString += "<br>Class Proficiency Modifier: Arcana * 2 = " + (dcValue *2);
      }



      chatString += "<br>Total Arcana: " + gainedArcana;
      chatString += "<br>Total Hours: " + gainedHours;

      // use spell charge


      let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData); 

    item.update({"data.learning.arcana": totalArcana , "data.learning.hours": totalHours, "data.learning.hoursNeeded": newHoursNeeded, "data.learning.arcanaNeeded": newArcanaNeeded});
    }
  
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier
   * @param {string} [denomination]   The hit denomination of hit die to roll. Example "d8".
   *                                  If no denomination is provided, the first available HD will be used
   * @param {boolean} [dialog]        Show a dialog prompt for configuring the hit die roll?
   * @returns {Promise<Roll|null>}    The created Roll instance, or null if no hit die was rolled
   */
  async rollHitDie(event, {dialog=true}={}) {

    const denomination = event.event.target.getAttribute("data-hd-denom");

    // Prepare roll data
    const parts = [`1${denomination}`, "@abilities.con.mod"];
    const title = `${game.i18n.localize("SKJAALD.HitDiceRoll")}: ${this.name}`;
    const rollData = foundry.utils.deepClone(this.data.data);
    const focus = false;

    // Call the roll helper utility
    const roll = await damageRoll({
      event: new Event("hitDie"),
      parts: parts,
      data: rollData,
      title: title,
      allowCritical: false,
      focusRoll: false,
      fastForward: !dialog,
      dialogOptions: {width: 350},
      messageData: {
        speaker: ChatMessage.getSpeaker({actor: this}),
        "flags.skjaald.roll": {type: "hitDie"}
      }
    });
    if ( !roll ) return null;


    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Results from a rest operation.
   *
   * @typedef {object} RestResult
   * @property {number} dhp            Hit points recovered during the rest.
   * @property {number} dhd            Hit dice recovered or spent during the rest.
   * @property {object} updateData     Updates applied to the actor.
   * @property {object[]} updateItems  Updates applied to actor's items.
   * @property {boolean} longRest      Whether the rest type was a long rest.
   * @property {boolean} newDay        Whether a new day occurred during the rest.
   */

  /* -------------------------------------------- */

  /**
   * Take a short rest, possibly spending hit dice and recovering resources, item uses, and pact slots.
   *
   * @param {object} [options]
   * @param {boolean} [options.dialog=true]         Present a dialog window which allows for rolling hit dice as part
   *                                                of the Short Rest and selecting whether a new day has occurred.
   * @param {boolean} [options.chat=true]           Summarize the results of the rest workflow as a chat message.
   * @param {boolean} [options.autoHD=false]        Automatically spend Hit Dice if you are missing 3 or more hit
   *                                                points.
   * @param {boolean} [options.autoHDThreshold=3]   A number of missing hit points which would trigger an automatic HD
   *                                                roll.
   * @returns {Promise<RestResult>}                 A Promise which resolves once the short rest workflow has completed.
   */
  async shortRest({dialog=true, chat=true, autoHD=false, autoHDThreshold=3}={}) {
    // Take note of the initial hit points and number of hit dice the Actor has
    const hd0 = this.data.data.attributes.hd;
    const hp0 = this.data.data.attributes.hp.value;
    let newDay = false;

    // Display a Dialog for rolling hit dice
    if ( dialog ) {
      try {
        newDay = await ShortRestDialog.shortRestDialog({actor: this, canRoll: hd0 > 0});
      } catch(err) {
        return;
      }
    }

    // Automatically spend hit dice
    else if ( autoHD ) {
      await this.autoSpendHitDice({ threshold: autoHDThreshold });
    }
    return this._rest(
      chat, newDay, false, this.data.data.attributes.hd - hd0, this.data.data.attributes.hp.value - hp0);
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering hit points, hit dice, resources, item uses, and spell slots.
   *
   * @param {object} [options]
   * @param {boolean} [options.dialog=true]  Present a confirmation dialog window whether or not to take a long rest.
   * @param {boolean} [options.chat=true]    Summarize the results of the rest workflow as a chat message.
   * @param {boolean} [options.newDay=true]  Whether the long rest carries over to a new day.
   * @returns {Promise<RestResult>}          A Promise which resolves once the long rest workflow has completed.
   */
  async longRest({dialog=true, chat=true, newDay=true}={}) {
    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        newDay = await LongRestDialog.longRestDialog({actor: this});
      } catch(err) {
        return;
      }
    }

    return this._rest(chat, newDay, true);
  }

  /* -------------------------------------------- */

  /**
   * Perform all of the changes needed for a short or long rest.
   *
   * @param {boolean} chat           Summarize the results of the rest workflow as a chat message.
   * @param {boolean} newDay         Has a new day occurred during this rest?
   * @param {boolean} longRest       Is this a long rest?
   * @param {number} [dhd=0]         Number of hit dice spent during so far during the rest.
   * @param {number} [dhp=0]         Number of hit points recovered so far during the rest.
   * @returns {Promise<RestResult>}  Consolidated results of the rest workflow.
   * @private
   */
  async _rest(chat, newDay, longRest, dhd=0, dhp=0) {
    let hitPointsRecovered = 0;
    let hitPointUpdates = {};
    let hitDiceRecovered = 0;
    let hitDiceUpdates = [];

    // Recover hit points & hit dice on long rest
    if ( longRest ) {
      ({ updates: hitPointUpdates, hitPointsRecovered } = this._getRestHitPointRecovery());
      ({ updates: hitDiceUpdates, hitDiceRecovered } = this._getRestHitDiceRecovery());
    }

    // Figure out the rest of the changes
    const result = {
      dhd: dhd + hitDiceRecovered,
      dhp: dhp + hitPointsRecovered,
      updateData: {
        ...hitPointUpdates,
        ...this._getRestResourceRecovery({ recoverShortRestResources: !longRest, recoverLongRestResources: longRest }),
        ...this._getRestSpellRecovery({ recoverSpells: longRest })
      },
      updateItems: [
        ...hitDiceUpdates,
        ...this._getRestItemUsesRecovery({ recoverLongRestUses: longRest, recoverDailyUses: newDay })
      ],
      longRest,
      newDay
    };

    // Perform updates
    await this.update(result.updateData);
    await this.updateEmbeddedDocuments("Item", result.updateItems);

    // Display a Chat Message summarizing the rest effects
    if ( chat ) await this._displayRestResultMessage(result, longRest);

    // Call restCompleted hook so that modules can easily perform actions when actors finish a rest
    Hooks.callAll("restCompleted", this, result);

    // Return data summarizing the rest effects
    return result;
  }

  /* -------------------------------------------- */

  /**
   * Display a chat message with the result of a rest.
   *
   * @param {RestResult} result         Result of the rest operation.
   * @param {boolean} [longRest=false]  Is this a long rest?
   * @returns {Promise<ChatMessage>}    Chat message that was created.
   * @protected
   */
  async _displayRestResultMessage(result, longRest=false) {
    const { dhd, dhp, newDay } = result;
    const diceRestored = dhd !== 0;
    const healthRestored = dhp !== 0;
    const length = longRest ? "Long" : "Short";

    let restFlavor;
    let message;

    // Summarize the rest duration
    switch (game.settings.get("skjaald", "restVariant")) {
      case "normal": restFlavor = (longRest && newDay) ? "SKJAALD.LongRestOvernight" : `SKJAALD.${length}RestNormal`; break;
      case "gritty": restFlavor = (!longRest && newDay) ? "SKJAALD.ShortRestOvernight" : `SKJAALD.${length}RestGritty`; break;
      case "epic": restFlavor = `SKJAALD.${length}RestEpic`; break;
    }

    // Determine the chat message to display
    if ( diceRestored && healthRestored ) message = `SKJAALD.${length}RestResult`;
    else if ( longRest && !diceRestored && healthRestored ) message = "SKJAALD.LongRestResultHitPoints";
    else if ( longRest && diceRestored && !healthRestored ) message = "SKJAALD.LongRestResultHitDice";
    else message = `SKJAALD.${length}RestResultShort`;

    // Create a chat message
    let chatData = {
      user: game.user.id,
      speaker: {actor: this, alias: this.name},
      flavor: game.i18n.localize(restFlavor),
      content: game.i18n.format(message, {
        name: this.name,
        dice: longRest ? dhd : -dhd,
        health: dhp
      })
    };
    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
    return ChatMessage.create(chatData);
  }

  /* -------------------------------------------- */

  /**
   * Automatically spend hit dice to recover hit points up to a certain threshold.
   *
   * @param {object} [options]
   * @param {number} [options.threshold=3]  A number of missing hit points which would trigger an automatic HD roll.
   * @returns {Promise<number>}             Number of hit dice spent.
   */
  async autoSpendHitDice({ threshold=3 }={}) {
    const max = this.data.data.attributes.hp.max + this.data.data.attributes.hp.tempmax;

    let diceRolled = 0;
    while ( (this.data.data.attributes.hp.value + threshold) <= max ) {
      const r = await this.rollHitDie(undefined, {dialog: false});
      if ( r === null ) break;
      diceRolled += 1;
    }

    return diceRolled;
  }

  /* -------------------------------------------- */

  /**
   * Recovers actor hit points and eliminates any temp HP.
   *
   * @param {object} [options]
   * @param {boolean} [options.recoverTemp=true]     Reset temp HP to zero.
   * @param {boolean} [options.recoverTempMax=true]  Reset temp max HP to zero.
   * @returns {object}                               Updates to the actor and change in hit points.
   * @protected
   */
  _getRestHitPointRecovery({ recoverTemp=true, recoverTempMax=true }={}) {
    const data = this.data.data;
    let updates = {};
    let max = data.attributes.hp.max;

    if ( recoverTempMax ) {
      updates["data.attributes.hp.tempmax"] = 0;
    } else {
      max += data.attributes.hp.tempmax;
    }
    updates["data.attributes.hp.value"] = max;
    if ( recoverTemp ) {
      updates["data.attributes.hp.temp"] = 0;
    }

    return { updates, hitPointsRecovered: max - data.attributes.hp.value };
  }

  /* -------------------------------------------- */

  /**
   * Recovers actor resources.
   * @param {object} [options]
   * @param {boolean} [options.recoverShortRestResources=true]  Recover resources that recharge on a short rest.
   * @param {boolean} [options.recoverLongRestResources=true]   Recover resources that recharge on a long rest.
   * @returns {object}                                          Updates to the actor.
   * @protected
   */
  _getRestResourceRecovery({recoverShortRestResources=true, recoverLongRestResources=true}={}) {
    let updates = {};
    for ( let [k, r] of Object.entries(this.data.data.resources) ) {
      if ( Number.isNumeric(r.max) && ((recoverShortRestResources && r.sr) || (recoverLongRestResources && r.lr)) ) {
        updates[`data.resources.${k}.value`] = Number(r.max);
      }
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Recovers spell slots and pact slots.
   *
   * @param {object} [options]
   * @param {boolean} [options.recoverPact=true]     Recover all expended pact slots.
   * @param {boolean} [options.recoverSpells=true]   Recover all expended spell slots.
   * @returns {object}                               Updates to the actor.
   * @protected
   */
  _getRestSpellRecovery({ recoverPact=true, recoverSpells=true }={}) {
    let updates = {};
    if ( recoverPact ) {
      const pact = this.data.data.spells.pact;
      updates["data.spells.pact.value"] = pact.override || pact.max;
    }

    if ( recoverSpells ) {
      for ( let [k, v] of Object.entries(this.data.data.spells) ) {
        updates[`data.spells.${k}.value`] = Number.isNumeric(v.override) ? v.override : (v.max ?? 0);
      }
    }

    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Recovers class hit dice during a long rest.
   *
   * @param {object} [options]
   * @param {number} [options.maxHitDice]  Maximum number of hit dice to recover.
   * @returns {object}                     Array of item updates and number of hit dice recovered.
   * @protected
   */
  _getRestHitDiceRecovery({ maxHitDice=undefined }={}) {
    // Determine the number of hit dice which may be recovered
    if ( maxHitDice === undefined ) {
      maxHitDice = Math.max(Math.floor(this.data.data.details.level / 2), 1);
    }

    // Sort classes which can recover HD, assuming players prefer recovering larger HD first.
    const sortedClasses = Object.values(this.classes).sort((a, b) => {
      return (parseInt(b.data.data.hitDice.slice(1)) || 0) - (parseInt(a.data.data.hitDice.slice(1)) || 0);
    });

    let updates = [];
    let hitDiceRecovered = 0;
    for ( let item of sortedClasses ) {
      const d = item.data.data;
      if ( (hitDiceRecovered < maxHitDice) && (d.hitDiceUsed > 0) ) {
        let delta = Math.min(d.hitDiceUsed || 0, maxHitDice - hitDiceRecovered);
        hitDiceRecovered += delta;
        updates.push({_id: item.id, "data.hitDiceUsed": d.hitDiceUsed - delta});
      }
    }

    return { updates, hitDiceRecovered };
  }

  /* -------------------------------------------- */

  /**
   * Recovers item uses during short or long rests.
   *
   * @param {object} [options]
   * @param {boolean} [options.recoverShortRestUses=true]  Recover uses for items that recharge after a short rest.
   * @param {boolean} [options.recoverLongRestUses=true]   Recover uses for items that recharge after a long rest.
   * @param {boolean} [options.recoverDailyUses=true]      Recover uses for items that recharge on a new day.
   * @returns {Array<object>}                              Array of item updates.
   * @protected
   */
  _getRestItemUsesRecovery({ recoverShortRestUses=true, recoverLongRestUses=true, recoverDailyUses=true }={}) {
    let recovery = [];
    if ( recoverShortRestUses ) recovery.push("sr");
    if ( recoverLongRestUses ) recovery.push("lr");
    if ( recoverDailyUses ) recovery.push("day");

    let updates = [];
    for ( let item of this.items ) {
      const d = item.data.data;
      if ( d.uses && recovery.includes(d.uses.per) ) {
        updates.push({_id: item.id, "data.uses.value": d.uses.max});
      }
      if ( recoverLongRestUses && d.recharge && d.recharge.value ) {
        updates.push({_id: item.id, "data.recharge.charged": true});
      }
    }

    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Convert all carried currency to the highest possible denomination to reduce the number of raw coins being
   * carried by an Actor.
   * @returns {Promise<Actor5e>}
   */
  convertCurrency() {
    const curr = foundry.utils.deepClone(this.data.data.currency);
    const conversion = Object.entries(CONFIG.SKJAALD.currencies);
    conversion.reverse();
    for ( let [c, data] of conversion ) {
      const t = data.conversion;
      if ( !t ) continue;
      let change = Math.floor(curr[c] / t.each);
      curr[c] -= (change * t.each);
      curr[t.into] += change;
    }
    return this.update({"data.currency": curr});
  }

  /* -------------------------------------------- */

  /**
   * Transform this Actor into another one.
   *
   * @param {Actor5e} target            The target Actor.
   * @param {object} [options]
   * @param {boolean} [options.keepPhysical]    Keep physical abilities (str, dex, con)
   * @param {boolean} [options.keepMental]      Keep mental abilities (int, wis, cha)
   * @param {boolean} [options.keepSaves]       Keep saving throw proficiencies
   * @param {boolean} [options.keepSkills]      Keep skill proficiencies
   * @param {boolean} [options.mergeSaves]      Take the maximum of the save proficiencies
   * @param {boolean} [options.mergeSkills]     Take the maximum of the skill proficiencies
   * @param {boolean} [options.keepClass]       Keep proficiency bonus
   * @param {boolean} [options.keepFeats]       Keep features
   * @param {boolean} [options.keepSpells]      Keep spells
   * @param {boolean} [options.keepItems]       Keep items
   * @param {boolean} [options.keepBio]         Keep biography
   * @param {boolean} [options.keepVision]      Keep vision
   * @param {boolean} [options.transformTokens] Transform linked tokens too
   * @returns {Promise<Array<Token>>|null}      Updated token if the transformation was performed.
   */
  async transformInto(target, { keepPhysical=false, keepMental=false, keepSaves=false, keepSkills=false,
    mergeSaves=false, mergeSkills=false, keepClass=false, keepFeats=false, keepSpells=false,
    keepItems=false, keepBio=false, keepVision=false, transformTokens=true}={}) {

    // Ensure the player is allowed to polymorph
    const allowed = game.settings.get("skjaald", "allowPolymorphing");
    if ( !allowed && !game.user.isGM ) {
      return ui.notifications.warn(game.i18n.localize("SKJAALD.PolymorphWarn"));
    }

    // Get the original Actor data and the new source data
    const o = this.toJSON();
    o.flags.skjaald = o.flags.skjaald || {};
    o.flags.skjaald.transformOptions = {mergeSkills, mergeSaves};
    const source = target.toJSON();

    // Prepare new data to merge from the source
    const d = {
      type: o.type, // Remain the same actor type
      name: `${o.name} (${source.name})`, // Append the new shape to your old name
      data: source.data, // Get the data model of your new form
      items: source.items, // Get the items of your new form
      effects: o.effects.concat(source.effects), // Combine active effects from both forms
      img: source.img, // New appearance
      permission: o.permission, // Use the original actor permissions
      folder: o.folder, // Be displayed in the same sidebar folder
      flags: o.flags // Use the original actor flags
    };

    // Specifically delete some data attributes
    delete d.data.resources; // Don't change your resource pools
    delete d.data.currency; // Don't lose currency
    delete d.data.bonuses; // Don't lose global bonuses

    // Specific additional adjustments
    d.data.details.alignment = o.data.details.alignment; // Don't change alignment
    d.data.attributes.exhaustion = o.data.attributes.exhaustion; // Keep your prior exhaustion level
    d.data.attributes.inspiration = o.data.attributes.inspiration; // Keep inspiration
    d.data.spells = o.data.spells; // Keep spell slots
    d.data.attributes.ac.flat = target.data.data.attributes.ac.value; // Override AC

    // Token appearance updates
    d.token = {name: d.name};
    for ( let k of ["width", "height", "scale", "img", "mirrorX", "mirrorY", "tint", "alpha", "lockRotation"] ) {
      d.token[k] = source.token[k];
    }
    const vision = keepVision ? o.token : source.token;
    for ( let k of ["dimSight", "brightSight", "dimLight", "brightLight", "vision", "sightAngle"] ) {
      d.token[k] = vision[k];
    }
    if ( source.token.randomImg ) {
      const images = await target.getTokenImages();
      d.token.img = images[Math.floor(Math.random() * images.length)];
    }

    // Transfer ability scores
    const abilities = d.data.abilities;
    for ( let k of Object.keys(abilities) ) {
      const oa = o.data.abilities[k];
      const prof = abilities[k].proficient;
      if ( keepPhysical && ["str", "dex", "con"].includes(k) ) abilities[k] = oa;
      else if ( keepMental && ["int", "wis", "cha"].includes(k) ) abilities[k] = oa;
      if ( keepSaves ) abilities[k].proficient = oa.proficient;
      else if ( mergeSaves ) abilities[k].proficient = Math.max(prof, oa.proficient);
    }

    // Transfer skills
    if ( keepSkills ) d.data.skills = o.data.skills;
    else if ( mergeSkills ) {
      for ( let [k, s] of Object.entries(d.data.skills) ) {
        s.value = Math.max(s.value, o.data.skills[k].value);
      }
    }

    // Keep specific items from the original data
    d.items = d.items.concat(o.items.filter(i => {
      if ( i.type === "class" ) return keepClass;
      else if ( i.type === "feat" ) return keepFeats;
      else if ( i.type === "spell" ) return keepSpells;
      else return keepItems;
    }));

    // Transfer classes for NPCs
    if (!keepClass && d.data.details.cr) {
      d.items.push({
        type: "class",
        name: game.i18n.localize("SKJAALD.PolymorphTmpClass"),
        data: { levels: d.data.details.cr }
      });
    }

    // Keep biography
    if (keepBio) d.data.details.biography = o.data.details.biography;

    // Keep senses
    if (keepVision) d.data.traits.senses = o.data.traits.senses;

    // Set new data flags
    if ( !this.isPolymorphed || !d.flags.skjaald.originalActor ) d.flags.skjaald.originalActor = this.id;
    d.flags.skjaald.isPolymorphed = true;

    // Update unlinked Tokens in place since they can simply be re-dropped from the base actor
    if (this.isToken) {
      const tokenData = d.token;
      tokenData.actorData = d;
      delete tokenData.actorData.token;
      return this.token.update(tokenData);
    }

    // Update regular Actors by creating a new Actor with the Polymorphed data
    await this.sheet.close();
    Hooks.callAll("skjaald.transformActor", this, target, d, {
      keepPhysical, keepMental, keepSaves, keepSkills, mergeSaves, mergeSkills,
      keepClass, keepFeats, keepSpells, keepItems, keepBio, keepVision, transformTokens
    });
    const newActor = await this.constructor.create(d, {renderSheet: true});

    // Update placed Token instances
    if ( !transformTokens ) return;
    const tokens = this.getActiveTokens(true);
    const updates = tokens.map(t => {
      const newTokenData = foundry.utils.deepClone(d.token);
      newTokenData._id = t.data._id;
      newTokenData.actorId = newActor.id;
      newTokenData.actorLink = true;
      return newTokenData;
    });
    return canvas.scene?.updateEmbeddedDocuments("Token", updates);
  }

  /* -------------------------------------------- */

  /**
   * If this actor was transformed with transformTokens enabled, then its
   * active tokens need to be returned to their original state. If not, then
   * we can safely just delete this actor.
   * @returns {Promise<Actor>|null}  Original actor if it was reverted.
   */
  async revertOriginalForm() {
    if ( !this.isPolymorphed ) return;
    if ( !this.isOwner ) {
      return ui.notifications.warn(game.i18n.localize("SKJAALD.PolymorphRevertWarn"));
    }

    // If we are reverting an unlinked token, simply replace it with the base actor prototype
    if ( this.isToken ) {
      const baseActor = game.actors.get(this.token.data.actorId);
      const prototypeTokenData = await baseActor.getTokenData();
      const tokenUpdate = {actorData: {}};
      for ( let k of ["width", "height", "scale", "img", "mirrorX", "mirrorY", "tint", "alpha", "lockRotation", "name"] ) {
        tokenUpdate[k] = prototypeTokenData[k];
      }
      await this.token.update(tokenUpdate, {recursive: false});
      await this.sheet.close();
      const actor = this.token.getActor();
      actor.sheet.render(true);
      return actor;
    }

    // Obtain a reference to the original actor
    const original = game.actors.get(this.getFlag("skjaald", "originalActor"));
    if ( !original ) return;

    // Get the Tokens which represent this actor
    if ( canvas.ready ) {
      const tokens = this.getActiveTokens(true);
      const tokenData = await original.getTokenData();
      const tokenUpdates = tokens.map(t => {
        const update = duplicate(tokenData);
        update._id = t.id;
        delete update.x;
        delete update.y;
        return update;
      });
      canvas.scene.updateEmbeddedDocuments("Token", tokenUpdates);
    }

    // Delete the polymorphed version of the actor, if possible
    const isRendered = this.sheet.rendered;
    if ( game.user.isGM ) await this.delete();
    else if ( isRendered ) this.sheet.close();
    if ( isRendered ) original.sheet.render(isRendered);
    return original;
  }

  /* -------------------------------------------- */

  /**
   * Add additional system-specific sidebar directory context menu options for Actor documents
   * @param {jQuery} html         The sidebar HTML
   * @param {Array} entryOptions  The default array of context menu options
   */
  static addDirectoryContextOptions(html, entryOptions) {
    const useEntity = foundry.utils.isNewerVersion("9", game.version ?? game.data.version);
    const idAttr = useEntity ? "entityId" : "documentId";
    entryOptions.push({
      name: "SKJAALD.PolymorphRestoreTransformation",
      icon: '<i class="fas fa-backward"></i>',
      callback: li => {
        const actor = game.actors.get(li.data(idAttr));
        return actor.revertOriginalForm();
      },
      condition: li => {
        const allowed = game.settings.get("skjaald", "allowPolymorphing");
        if ( !allowed && !game.user.isGM ) return false;
        const actor = game.actors.get(li.data(idAttr));
        return actor && actor.isPolymorphed;
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Format a type object into a string.
   * @param {object} typeData          The type data to convert to a string.
   * @returns {string}
   */
  static formatCreatureType(typeData) {
    if ( typeof typeData === "string" ) return typeData; // Backwards compatibility
    let localizedType;
    if ( typeData.value === "custom" ) {
      localizedType = typeData.custom;
    } else {
      let code = CONFIG.SKJAALD.creatureTypes[typeData.value];
      localizedType = game.i18n.localize(typeData.swarm ? `${code}Pl` : code);
    }
    let type = localizedType;
    if ( typeData.swarm ) {
      type = game.i18n.format("SKJAALD.CreatureSwarmPhrase", {
        size: game.i18n.localize(CONFIG.SKJAALD.actorSizes[typeData.swarm]),
        type: localizedType
      });
    }
    if (typeData.subtype) type = `${type} (${typeData.subtype})`;
    return type;
  }

  /* -------------------------------------------- */

  /**
   * Populate a proficiency object with a `selected` field containing a combination of
   * localizable group & individual proficiencies from `value` and the contents of `custom`.
   *
   * @param {object} data          Object containing proficiency data.
   * @param {string[]} data.value  Array of standard proficiency keys.
   * @param {string} data.custom   Semicolon-separated string of custom proficiencies.
   * @param {string} type          "armor", "weapon", or "tool"
   */
  static prepareProficiencies(data, type) {
    const profs = CONFIG.SKJAALD[`${type}Proficiencies`];
    const itemTypes = CONFIG.SKJAALD[`${type}Ids`];

    let values = [];
    if ( data.value ) {
      values = data.value instanceof Array ? data.value : [data.value];
    }

    data.selected = {};
    for ( const key of values ) {
      if ( profs[key] ) {
        data.selected[key] = profs[key];
      } else if ( itemTypes && itemTypes[key] ) {
        const item = ProficiencySelector.getBaseItem(itemTypes[key], { indexOnly: true });
        if ( item ) data.selected[key] = item.name;
      } else if ( type === "tool" && CONFIG.SKJAALD.vehicleTypes[key] ) {
        data.selected[key] = CONFIG.SKJAALD.vehicleTypes[key];
      }
    }

    // Add custom entries
    if ( data.custom ) {
      data.custom.split(";").forEach((c, i) => data.selected[`custom${i+1}`] = c.trim());
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    this._displayScrollingDamage(options.dhp);
  }

  /* -------------------------------------------- */

  /**
   * Display changes to health as scrolling combat text.
   * Adapt the font size relative to the Actor's HP total to emphasize more significant blows.
   * @param {number} dhp      The change in hit points that was applied
   * @private
   */
  _displayScrollingDamage(dhp) {
    if ( !dhp ) return;
    dhp = Number(dhp);
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    for ( let t of tokens ) {
      if ( !t?.hud?.createScrollingText ) continue;  // This is undefined prior to v9-p2
      const pct = Math.clamped(Math.abs(dhp) / this.data.data.attributes.hp.max, 0, 1);
      t.hud.createScrollingText(dhp.signedString(), {
        anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
        fontSize: 16 + (32 * pct), // Range between [16, 48]
        fill: CONFIG.SKJAALD.tokenHPColors[dhp < 0 ? "damage" : "healing"],
        stroke: 0x000000,
        strokeThickness: 4,
        jitter: 0.25
      });
    }
  }

  /* -------------------------------------------- */
  /*  DEPRECATED METHODS                          */
  /* -------------------------------------------- */

  /**
   * Retrieve the spell save DC for the provided ability.
   * @param {string} ability  Ability key as defined in `CONFIG.SKJAALD.abilities`.
   * @returns {number}        Spell save DC for provided ability.
   * @deprecated since skjaald 0.97
   */
  getSpellDC(ability) {
    console.warn("The Actor5e#getSpellDC(ability) method has been deprecated in favor of Actor5e#data.data.abilities[ability].dc");
    return this.data.data.abilities[ability]?.dc;
  }

  /* -------------------------------------------- */

  /**
   * Cast a Spell, consuming a spell slot of a certain level
   * @param {Item5e} item   The spell being cast by the actor
   * @param {Event} event   The originating user interaction which triggered the cast
   * @returns {Promise<ChatMessage|object|void>}  Dialog if `configureDialog` is true, else prepared dialog data.
   * @deprecated since skjaald 1.2.0
   */
  async useSpell(item, {configureDialog=true}={}) {
    console.warn("The Actor5e#useSpell method has been deprecated in favor of Item5e#roll");
    if ( item.data.type !== "spell" ) throw new Error("Wrong Item type");
    return item.roll();
  }


}
