import Actor5e from "../entity.js";
import Item5e from "../../item/entity.js";
import ProficiencySelector from "../../apps/proficiency-selector.js";
import PropertyAttribution from "../../apps/property-attribution.js";
import TraitSelector from "../../apps/trait-selector.js";
import ActorArmorConfig from "../../apps/actor-armor.js";
import ActorSheetFlags from "../../apps/actor-flags.js";
import ActorHitDiceConfig from "../../apps/hit-dice-config.js";
import ActorMovementConfig from "../../apps/movement-config.js";
import ActorSensesConfig from "../../apps/senses-config.js";
import ActorSkillConfig from "../../apps/skill-config.js";
import ActorAbilityConfig from "../../apps/ability-config.js";
import ActorTypeConfig from "../../apps/actor-type.js";
import {SKJAALD} from "../../config.js";
import ActiveEffect5e from "../../active-effect.js";
import ActorResourceAdd from "../../apps/create-resource.js";
import ActorBioDescription from "../../apps/bio-description.js";


/**
 * Extend the basic ActorSheet class to suppose system-specific logic and functionality.
 * @abstract
 * @extends {ActorSheet}
 */
export default class ActorSheet5e extends ActorSheet {
  constructor(...args) {
    super(...args);

    /**
     * Track the set of item filters which are applied
     * @type {Set}
     */
    this._filters = {
      inventory: new Set(),
      spellbook: new Set(),
      features: new Set(),
      noncomfeatures: new Set(),
      effects: new Set()
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      scrollY: [
        ".inventory .inventory-list",
        ".features .inventory-list",
        ".spellbook .inventory-list",
        ".effects .inventory-list",
        ".window-content",
      ],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /* -------------------------------------------- */

  /**
   * A set of item types that should be prevented from being dropped on this type of actor sheet.
   * @type {Set<string>}
   */
  static unsupportedItemTypes = new Set();

  /* -------------------------------------------- */

  /** @override */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/skjaald/templates/actors/limited-sheet.html";
    return `systems/skjaald/templates/actors/${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {

    // Basic data
    let isOwner = this.actor.isOwner;
    const data = {
      owner: isOwner,
      limited: this.actor.limited,
      options: this.options,
      editable: this.isEditable,
      cssClass: isOwner ? "editable" : "locked",
      isCharacter: this.actor.type === "character",
      isNPC: this.actor.type === "npc",
      isVehicle: this.actor.type === "vehicle",
      config: CONFIG.SKJAALD,
      rollData: this.actor.getRollData.bind(this.actor)
    };

    // The Actor's data
    const actorData = this.actor.data.toObject(false);
    const source = this.actor.data._source.data;
    data.actor = actorData;
    data.data = actorData.data;

    

    // Owned Items
    data.items = actorData.items;
    for ( let i of data.items ) {
      const item = this.actor.items.get(i._id);
      i.labels = item.labels;
    }
    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Labels and filters
    data.labels = this.actor.labels || {};
    data.filters = this._filters;

    // Currency Labels
    data.labels.currencies = Object.entries(CONFIG.SKJAALD.currencies).reduce((obj, [k, c]) => {
      obj[k] = c.label;
      return obj;
    }, {});

    // Proficiency
    if ( game.settings.get("skjaald", "proficiencyModifier") === "dice" ) {
      data.labels.proficiency = `d${data.data.attributes.prof * 2}`;
    } else {
      data.labels.proficiency = `+${data.data.attributes.prof}`;
    }

    // Ability Scores
    for ( let [a, abl] of Object.entries(actorData.data.abilities)) {
      abl.icon = this._getProficiencyIcon(abl.proficient);
      abl.hover = CONFIG.SKJAALD.proficiencyLevels[abl.proficient];
      abl.label = CONFIG.SKJAALD.abilities[a];
      abl.baseProf = source.abilities[a].proficient;
    }

    // Skills
    if ( actorData.data.skills ) {
      for (let [s, skl] of Object.entries(actorData.data.skills)) {
        skl.ability = CONFIG.SKJAALD.abilityAbbreviations[skl.ability];
        skl.dability = CONFIG.SKJAALD.abilityAbbreviations[skl.dability];
        skl.icon = this._getProficiencyIcon(skl.value);
        skl.hover = CONFIG.SKJAALD.proficiencyLevels[skl.value];
        skl.label = CONFIG.SKJAALD.skills[s];
        skl.baseValue = source.skills[s].value;
      }
    }



    // ration/waterskin
    if(!data.isNPC){
      if (actorData.data.attributes.ration.value > 0 ) {
        actorData.data.attributes.ration.icon1 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.ration.value > 1 ) {
        actorData.data.attributes.ration.icon2 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.ration.value > 2 ) {
        actorData.data.attributes.ration.icon3 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.ration.value > 3) {
        actorData.data.attributes.ration.icon4 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.ration.value > 4 ) {
        actorData.data.attributes.ration.icon5 = '<i class="fas fa-check"></i>';
      }

      if (actorData.data.attributes.waterskin.value > 0 ) {
        actorData.data.attributes.waterskin.icon1 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.waterskin.value > 1 ) {
        actorData.data.attributes.waterskin.icon2 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.waterskin.value > 2 ) {
        actorData.data.attributes.waterskin.icon3 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.waterskin.value > 3) {
        actorData.data.attributes.waterskin.icon4 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.waterskin.value > 4 ) {
        actorData.data.attributes.waterskin.icon5 = '<i class="fas fa-check"></i>';
      }

      //inpiration/fate

      if (actorData.data.attributes.inspiration.point1 == true ) {
        actorData.data.attributes.inspiration.icon1 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.inspiration.point2 == true ) {
        actorData.data.attributes.inspiration.icon2 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.inspiration.point3 == true ) {
        actorData.data.attributes.inspiration.icon3 = '<i class="fas fa-check"></i>';
      }

      if (actorData.data.attributes.legend.point1 == true ) {
        actorData.data.attributes.legend.icon1 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.legend.point2 == true ) {
        actorData.data.attributes.legend.icon2 = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.legend.point3 == true ) {
        actorData.data.attributes.legend.icon3 = '<i class="fas fa-check"></i>';
      }

      if (actorData.data.attributes.fate.value >= 1){
        actorData.data.attributes.fate.icon = '<i class="fas fa-check"></i>';
      }

      //Death Icons
      if (actorData.data.attributes.death.save1 == "empty") {
        actorData.data.attributes.death.icon1 = '<i class="far fa-circle"></i>';
      } else if (actorData.data.attributes.death.save1 == "success") {
        actorData.data.attributes.death.icon1 = '<i class="fas fa-heart"></i>';
      } else if (actorData.data.attributes.death.save1 == "failure") {
        actorData.data.attributes.death.icon1 = '<i class="fas fa-skull-crossbones"></i>';
      }

      if (actorData.data.attributes.death.save2 == "empty") {
        actorData.data.attributes.death.icon2 = '<i class="far fa-circle"></i>';
      } else if (actorData.data.attributes.death.save2 == "success") {
        actorData.data.attributes.death.icon2 = '<i class="fas fa-heart"></i>';
      } else if (actorData.data.attributes.death.save2 == "failure") {
        actorData.data.attributes.death.icon2 = '<i class="fas fa-skull-crossbones"></i>';
      }

      if (actorData.data.attributes.death.save3 == "empty") {
        actorData.data.attributes.death.icon3 = '<i class="far fa-circle"></i>';
      } else if (actorData.data.attributes.death.save3 == "success") {
        actorData.data.attributes.death.icon3 = '<i class="fas fa-heart"></i>';
      } else if (actorData.data.attributes.death.save3 == "failure") {
        actorData.data.attributes.death.icon3 = '<i class="fas fa-skull-crossbones"></i>';
      }

      if (actorData.data.attributes.death.save12 == "empty") {
        actorData.data.attributes.death.icon12 = '<i class="far fa-circle"></i>';
      } else if (actorData.data.attributes.death.save12 == "success") {
        actorData.data.attributes.death.icon12 = '<i class="fas fa-heart"></i>';
      } else if (actorData.data.attributes.death.save12 == "failure") {
        actorData.data.attributes.death.icon12 = '<i class="fas fa-skull-crossbones"></i>';
      }

      if (actorData.data.attributes.death.save22 == "empty") {
        actorData.data.attributes.death.icon22 = '<i class="far fa-circle"></i>';
      } else if (actorData.data.attributes.death.save22 == "success") {
        actorData.data.attributes.death.icon22 = '<i class="fas fa-heart"></i>';
      } else if (actorData.data.attributes.death.save22 == "failure") {
        actorData.data.attributes.death.icon22 = '<i class="fas fa-skull-crossbones"></i>';
      }

      if (actorData.data.attributes.death.save32 == "empty") {
        actorData.data.attributes.death.icon32 = '<i class="far fa-circle"></i>';
      } else if (actorData.data.attributes.death.save32 == "success") {
        actorData.data.attributes.death.icon32 = '<i class="fas fa-heart"></i>';
      } else if (actorData.data.attributes.death.save32 == "failure") {
        actorData.data.attributes.death.icon32 = '<i class="fas fa-skull-crossbones"></i>';
      }

      // Acted Toggle
      if (actorData.data.attributes.acted.value == true ) {
        actorData.data.attributes.acted.icon = '<i class="fas fa-check"></i>';
      }

      // Action Toggles
      if (actorData.data.attributes.acted.action.value == true ) {
        actorData.data.attributes.acted.action.icon = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.acted.halfaction.value == true ) {
        actorData.data.attributes.acted.halfaction.icon = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.acted.reaction.value == true ) {
        actorData.data.attributes.acted.reaction.icon = '<i class="fas fa-check"></i>';
      }
      if (actorData.data.attributes.acted.movement.value == true ) {
        actorData.data.attributes.acted.movement.icon = '<i class="fas fa-check"></i>';
      }
    }

    // Movement speeds
    data.movement = this._getMovementSpeed(actorData);

    // Senses
    data.senses = this._getSenses(actorData);

    // Update traits
    this._prepareTraits(actorData.data.traits);

    // Prepare owned items
    this._prepareItems(data);

    // Prepare active effects
    data.effects = ActiveEffect5e.prepareActiveEffectCategories(this.actor.effects);

    // Prepare warnings
    data.warnings = this.actor._preparationWarnings;

    // Prepare armor slots
    var slotList = this._getArmorForSlotsList(data);

    //testing armor lists
    data.armorOptionsHead = this._getArmorForSlotsList(data, "head", "head", false);
    data.armorOptionsHeadSupp = this._getArmorForSlotsList(data, "head", "head", true);
    data.armorOptionsNeck = this._getArmorForSlotsList(data, "neck", "neck", false);
    data.armorOptionsNeckSupp = this._getArmorForSlotsList(data, "neck", "neck", true);
    data.armorOptionsShoulders = this._getArmorForSlotsList(data, "shoulders", "shoulders", false);
    data.armorOptionsShouldersSupp = this._getArmorForSlotsList(data, "shoulders", "shoulders", true);
    data.armorOptionsTorso = this._getArmorForSlotsList(data, "torso", "torso", false);
    data.armorOptionsTorsoSupp = this._getArmorForSlotsList(data, "torso", "torso", true);
    data.armorOptionsInner = this._getArmorForSlotsList(data, "inner", "inner", false);
    data.armorOptionsInnerSupp = this._getArmorForSlotsList(data, "inner", "inner", true);
    data.armorOptionsOuter = this._getArmorForSlotsList(data, "outer", "outer", false);
    data.armorOptionsOuterSupp = this._getArmorForSlotsList(data, "outer", "outer", true);
    data.armorOptionsWaist = this._getArmorForSlotsList(data, "waist", "waist", false);
    data.armorOptionsWaistSupp = this._getArmorForSlotsList(data, "waist", "waist", true);
    data.armorOptionsArm = this._getArmorForSlotsList(data, "arms", "arms", false);
    data.armorOptionsArmSupp = this._getArmorForSlotsList(data, "arms", "arms", true);
    data.armorOptionsRing1 = this._getArmorForSlotsList(data, "rings", "ring1", false);
    data.armorOptionsRing2 = this._getArmorForSlotsList(data, "rings", "ring2", false);
    data.armorOptionsRing3 = this._getArmorForSlotsList(data, "rings", "ring3", false);
    data.armorOptionsRing4 = this._getArmorForSlotsList(data, "rings", "ring4", false);
    data.armorOptionsHand = this._getArmorForSlotsList(data, "hands", "hands", false);
    data.armorOptionsHandSupp = this._getArmorForSlotsList(data, "hands", "hands", true);
    data.armorOptionsThigh = this._getArmorForSlotsList(data, "thighs", "thighs", false);
    data.armorOptionsThighSupp = this._getArmorForSlotsList(data, "thighs", "thighs", true);
    data.armorOptionsLeg = this._getArmorForSlotsList(data, "legs", "legs", false );
    data.armorOptionsWeapons = this._getArmorForSlotsList(data,"weapons", "weapons", false);

    if (data.effects.inactive.effects == ""){
      data.effects.inactive.effects = "test";
    }

    // Return data to the sheet
    return data;
  }

    /* -------------------------------------------- */

  /**
   * Produce a list of armor class attribution objects.
   * @param {object} data                 Actor data to determine the attributions from.
   * @returns {AttributionDescription[]}  List of attribution descriptions.
   * @protected
   */
   _getHitDieDenom(data) {
    const items = data.items;
    for (let i of items){
      if (i.type == "class" && i.data.classType == "base"){
        const hitDice = i.data.hitDice
        return hitDice;
      }
    }
    
    return "d3";
  }


  /* -------------------------------------------- */

  /**
   * Prepare the display of movement speed data for the Actor.
   * @param {object} data                The Actor data being prepared.
   * @param {string} slot 
   * @param {boolean} suppFlag           
   * @returns {{string: string}}
   * @private
   */
   _getArmorForSlotsList(data, slot, specific, suppFlag) {
    
    var armor = {};
    const wornArmor = data.actor.data.attributes.wornArmor;
    var equipped;

    data.items.forEach(item => {
      if (item.type == "equipment"){
        if (item.data[slot]){
          
          switch(specific){
            case "head":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.inner == item._id || 
               wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
               wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
               wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "neck":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "shoulders":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "torso":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.waist == item._id;
              break;
            case "inner":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "outer":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "waist":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id;
              break;
            case "arms":
              equipped = wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "ring1":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "ring2":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "ring3":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id ||
              wornArmor.ring2 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "ring4":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id ||
              wornArmor.ring2 == item._id || wornArmor.ring3 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "hands":
              equipped = wornArmor.arms == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "thighs":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.legs == item._id || wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
            case "legs":
              equipped = wornArmor.arms == item._id || wornArmor.hands == item._id || wornArmor.head == item._id || wornArmor.inner == item._id || 
              wornArmor.neck == item._id || wornArmor.outer == item._id || wornArmor.ring1 == item._id || wornArmor.ring2 == item._id ||
              wornArmor.ring3 == item._id || wornArmor.ring4 == item._id || wornArmor.shoulders == item._id || wornArmor.thighs == item._id || 
              wornArmor.torso == item._id || wornArmor.waist == item._id;
              break;
          }
          if(!equipped){
            armor[item._id] = item.name;
          }
        }
      } else if (item.typ == "weapon"){
        //populate weapons lists
      }
    });

    return armor;
  }

  

  /* -------------------------------------------- */

  /**
   * Prepare the display of movement speed data for the Actor.
   * @param {object} actorData                The Actor data being prepared.
   * @param {boolean} [largestPrimary=false]  Show the largest movement speed as "primary", otherwise show "walk".
   * @returns {{primary: string, special: string}}
   * @private
   */
  _getMovementSpeed(actorData, largestPrimary=false) {
    const movement = actorData.data.attributes.movement || {};

    // Prepare an array of available movement speeds
    let speeds = [
      [movement.burrow, `${game.i18n.localize("SKJAALD.MovementBurrow")} ${movement.burrow}`],
      [movement.climb, `${game.i18n.localize("SKJAALD.MovementClimb")} ${movement.climb}`],
      [movement.fly, `${game.i18n.localize("SKJAALD.MovementFly")} ${movement.fly}${movement.hover ? ` (${game.i18n.localize("SKJAALD.MovementHover")})` : ""}`],
      [movement.swim, `${game.i18n.localize("SKJAALD.MovementSwim")} ${movement.swim}`]
    ];
    if ( largestPrimary ) {
      speeds.push([movement.walk, `${game.i18n.localize("SKJAALD.MovementWalk")} ${movement.walk}`]);
    }

    // Filter and sort speeds on their values
    speeds = speeds.filter(s => !!s[0]).sort((a, b) => b[0] - a[0]);

    // Case 1: Largest as primary
    if ( largestPrimary ) {
      let primary = speeds.shift();
      return {
        primary: `${primary ? primary[1] : "0"} ${movement.units}`,
        special: speeds.map(s => s[1]).join(", ")
      };
    }

    // Case 2: Walk as primary
    else {
      return {
        primary: `${movement.walk || 0} ${movement.units}`,
        special: speeds.length ? speeds.map(s => s[1]).join(", ") : ""
      };
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare senses object for display.
   * @param {object} actorData  Copy of actor data being prepared for display.
   * @returns {object}          Senses grouped by key with localized and formatted string.
   * @protected
   */
  _getSenses(actorData) {
    const senses = actorData.data.attributes.senses || {};
    const tags = {};
    for ( let [k, label] of Object.entries(CONFIG.SKJAALD.senses) ) {
      const v = senses[k] ?? 0;
      if ( v === 0 ) continue;
      tags[k] = `${game.i18n.localize(label)} ${v} ${senses.units}`;
    }
    if ( senses.special ) tags.special = senses.special;
    return tags;
  }

  /* --------------------------------------------- */

  /**
   * Break down all of the Active Effects affecting a given target property.
   * @param {string} target               The data property being targeted.
   * @returns {AttributionDescription[]}  Any active effects that modify that property.
   * @protected
   */
  _prepareActiveEffectAttributions(target) {
    return this.actor.effects.reduce((arr, e) => {
      let source = e.sourceName;
      if ( e.data.origin === this.actor.uuid ) source = e.data.label;
      if ( !source || e.data.disabled || e.isSuppressed ) return arr;
      const value = e.data.changes.reduce((n, change) => {
        if ( (change.key !== target) || !Number.isNumeric(change.value) ) return n;
        if ( change.mode !== CONST.ACTIVE_EFFECT_MODES.ADD ) return n;
        return n + Number(change.value);
      }, 0);
      if ( !value ) return arr;
      arr.push({value, label: source, mode: CONST.ACTIVE_EFFECT_MODES.ADD});
      return arr;
    }, []);
  }

  /* -------------------------------------------- */

  /**
   * Produce a list of armor class attribution objects.
   * @param {object} data                 Actor data to determine the attributions from.
   * @returns {AttributionDescription[]}  List of attribution descriptions.
   * @protected
   */
  _prepareArmorClassAttribution(data) {
    const ac = data.attributes.ac;
    
    return ac;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data structure for traits data like languages, resistances & vulnerabilities, and proficiencies.
   * @param {object} traits   The raw traits data object from the actor data. *Will be mutated.*
   * @private
   */
  _prepareTraits(traits) {
    const map = {
      dr: CONFIG.SKJAALD.damageResistanceTypes,
      di: CONFIG.SKJAALD.damageResistanceTypes,
      dv: CONFIG.SKJAALD.damageResistanceTypes,
      ci: CONFIG.SKJAALD.conditionTypes,
      languages: CONFIG.SKJAALD.languages
    };
    for ( let [t, choices] of Object.entries(map) ) {
      const trait = traits[t];
      if ( !trait ) continue;
      let values = [];
      if ( trait.value ) {
        values = trait.value instanceof Array ? trait.value : [trait.value];
      }
      trait.selected = values.reduce((obj, t) => {
        obj[t] = choices[t];
        return obj;
      }, {});

      // Add custom entry
      if ( trait.custom ) {
        trait.custom.split(";").forEach((c, i) => trait.selected[`custom${i+1}`] = c.trim());
      }
      trait.cssClass = !isObjectEmpty(trait.selected) ? "" : "inactive";
    }

    // Populate and localize proficiencies
    for ( const t of ["armor", "weapon", "tool"] ) {
      const trait = traits[`${t}Prof`];
      if ( !trait ) continue;
      Actor5e.prepareProficiencies(trait, t);
      trait.cssClass = !isObjectEmpty(trait.selected) ? "" : "inactive";
    }
  }

  /* -------------------------------------------- */


  /**
   * Insert a spell into the spellbook object when rendering the character sheet.
   * @param {object} data      Copy of the Actor data being prepared for display.
   * @param {object[]} spells  Spells to be included in the spellbook.
   * @returns {object[]}       Spellbook sections in the proper order.
   * @private
   */
  _prepareSpellbook(data, spells) {
    const owner = this.actor.isOwner;
    const levels = data.data.spells;
    const spellbook = {};


    // Define some mappings
    const sections = {
      atwill: -20,
      innate: -10,
      pact: 0.5
    };

    // Label spell slot uses headers
    const useLabels = {
      "-20": "-",
      "-10": "-",
      0: "&infin;"
    };

    // Format a spellbook entry for a certain indexed level
    const registerSection = (sl, i, label, {prepMode="prepared", value, max, override}={}) => {
      spellbook[i] = {
        order: i,
        label: label,
        usesSlots: i > 0,
        canCreate: owner,
        canPrepare: (data.actor.type === "character") && (i >= 1),
        spells: [],
        uses: useLabels[i] || value || 0,
        slots: useLabels[i] || max || 0,
        override: override || 0,
        dataset: {type: "spell", level: prepMode in sections ? 1 : i, "preparation.mode": prepMode},
        prop: sl
      };
    };

    // Determine the maximum spell level which has a slot
    const maxLevel = Array.fromRange(10).reduce((max, i) => {
      if ( i === 0 ) return max;
      const level = levels[`spell${i}`];
      if ( (level.max || level.override ) && ( i > max ) ) max = i;
      return max;
    }, 0);

    // Level-based spellcasters have cantrips and leveled slots
    if ( maxLevel > 0 ) {
      registerSection("spell0", 0, CONFIG.SKJAALD.spellLevels[0]);
      for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const sl = `spell${lvl}`;
        registerSection(sl, lvl, CONFIG.SKJAALD.spellLevels[lvl], levels[sl]);
      }
    }

    // Pact magic users have cantrips and a pact magic section
    if ( levels.pact && levels.pact.max ) {
      if ( !spellbook["0"] ) registerSection("spell0", 0, CONFIG.SKJAALD.spellLevels[0]);
      const l = levels.pact;
      const config = CONFIG.SKJAALD.spellPreparationModes.pact;
      const level = game.i18n.localize(`SKJAALD.SpellLevel${levels.pact.level}`);
      const label = `${config} — ${level}`;
      registerSection("pact", sections.pact, label, {
        prepMode: "pact",
        value: l.value,
        max: l.max,
        override: l.override
      });
    }

    // Iterate over every spell item, adding spells to the spellbook by section
    spells.forEach(spell => {
      const mode = spell.data.preparation.mode || "prepared";
      let s = spell.data.level || 0;
      const sl = `spell${s}`;

      // Specialized spellcasting modes (if they exist)
      if ( mode in sections ) {
        s = sections[mode];
        if ( !spellbook[s] ) {
          const l = levels[mode] || {};
          const config = CONFIG.SKJAALD.spellPreparationModes[mode];
          registerSection(mode, s, config, {
            prepMode: mode,
            value: l.value,
            max: l.max,
            override: l.override
          });
        }
      }

      // Sections for higher-level spells which the caster "should not" have, but spell items exist for
      else if ( !spellbook[s] ) {
        registerSection(sl, s, CONFIG.SKJAALD.spellLevels[s], {levels: levels[sl]});
      }

      // Add the spell to the relevant heading
      spellbook[s].spells.push(spell);
    });

    // Sort the spellbook by section level
    const sorted = Object.values(spellbook);
    sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether an Owned Item will be shown based on the current set of filters.
   * @param {object[]} items       Copies of item data to be filtered.
   * @param {Set<string>} filters  Filters applied to the item list.
   * @returns {object[]}           Subset of input items limited by the provided filters.
   * @private
   */
  _filterItems(items, filters) {
    return items.filter(item => {
      const data = item.data;

      // Action usage
      for ( let f of ["action", "bonus", "reaction"] ) {
        if ( filters.has(f) ) {
          if ((data.activation && (data.activation.type !== f))) return false;
        }
      }

      // Spell-specific filters
      if ( filters.has("ritual") ) {
        if (data.components.ritual !== true) return false;
      }
      if ( filters.has("concentration") ) {
        if (data.components.concentration !== true) return false;
      }
      if ( filters.has("prepared") ) {
        if ( data.level === 0 || ["innate", "always"].includes(data.preparation.mode) ) return true;
        if ( this.actor.data.type === "npc" ) return true;
        return data.preparation.prepared;
      }

      // Equipment-specific filters
      if ( filters.has("equipped") ) {
        if ( data.equipped !== true ) return false;
      }
      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency.
   * @param {number} level  A proficiency mode defined in `CONFIG.SKJAALD.proficiencyLevels`.
   * @returns {string}      HTML string for the chosen icon.
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      0.5: '<i class="fas fa-adjust"></i>',
      1: '<i class="fas fa-check"></i>',
      2: '<i class="fas fa-check-double"></i>',
      3: '<i class="fas fa-star"></i>'
    };
    return icons[level] || icons[0];
  }

  /* -------------------------------------------- */

    /**
   * Get the font-awesome icon used to display a Inspiration/Legend/Fate point.
   * @param {number} level  A proficiency mode defined in `CONFIG.SKJAALD.proficiencyLevels`.
   * @returns {string}      HTML string for the chosen icon.
   * @private
   */
     _getInspireIcon(level) {
      const icons = {
        0: '<i class="far fa-circle"></i>',
        1: '<i class="fas fa-check"></i>',
      };
      return icons[level] || icons[0];
    }
  
    /* -------------------------------------------- */


  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {

    // Activate Item Filters
    const filterLists = html.find(".filter-list");
    filterLists.each(this._initializeFilterItemList.bind(this));
    filterLists.on("click", ".filter-item", this._onToggleFilter.bind(this));

    // Item summaries
    html.find(".item .item-name.rollable h4").click(event => this._onItemSummary(event));

    // View Item Sheets
    html.find(".item-edit").click(this._onItemEdit.bind(this));

    // Property attributions
    html.find(".attributable").mouseover(this._onPropertyAttribution.bind(this));



    // Editable Only Listeners
    if ( this.isEditable ) {

      // Duplicate resolution
      html.find(".duplicate").change(this._onDuplicateChange.bind(this));
      html.find(".duplicate-click").click(this._onDuplicateChangeClick.bind(this));

      // Input focus and update
      const inputs = html.find("input");
      inputs.focus(ev => ev.currentTarget.select());
      inputs.addBack().find('[data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));

      // Ability Proficiency
      html.find(".ability-proficiency").click(this._onToggleAbilityProficiency.bind(this));

      // Inspiartion/legend/fate Toggle
      html.find(".check-toggle-fate").click(this._onToggleCheckMarkFate.bind(this));
      html.find(".check-toggle-ration").click(this._onToggleCheckMarkRation.bind(this));
      html.find(".check-toggle-waterskin").click(this._onToggleCheckMarkWater.bind(this));

      html.find(".check-toggle").click(this._onToggleCheckMark.bind(this));

      // Toggle Death Saves
      html.find(".death-icon").click(this._onToggleDeath.bind(this));

      // Health Calculation Visual
      html.find(".health-calc").change(this._getHealthVisual(this));

      // Speed Manual Change
      html.find(".speed-input").change(this._onChangeSpeed.bind(this));

      // Toggle Skill Proficiency
      html.find(".skill-proficiency").on("click contextmenu", this._onCycleSkillProficiency.bind(this));

      // Trait Selector
      html.find(".proficiency-selector").click(this._onProficiencySelector.bind(this));
      html.find(".trait-selector").click(this._onTraitSelector.bind(this));

      // Configure Special Flags
      html.find(".config-button").click(this._onConfigMenu.bind(this));

      // Owned Item management
      html.find(".item-create").click(this._onItemCreate.bind(this));
      html.find(".history-create").click(this._onHistoryItemCreate.bind(this));
      html.find(".item-delete").click(this._onItemDelete.bind(this));
      html.find(".item-uses input").click(ev => ev.target.select()).change(this._onUsesChange.bind(this));
      html.find(".slot-max-override").click(this._onSpellSlotOverride.bind(this));

      //CES
      html.find(".hunger0").click(this._changeHunger.bind(this));
      html.find(".hunger1").click(this._changeHunger.bind(this));
      html.find(".hunger2").click(this._changeHunger.bind(this));
      html.find(".hunger3").click(this._changeHunger.bind(this));
      html.find(".hunger4").click(this._changeHunger.bind(this));
      html.find(".hunger5").click(this._changeHunger.bind(this));      
      html.find(".hunger6").click(this._changeHunger.bind(this));

      html.find(".thirst0").click(this._changeThirst.bind(this));
      html.find(".thirst1").click(this._changeThirst.bind(this));
      html.find(".thirst2").click(this._changeThirst.bind(this));
      html.find(".thirst3").click(this._changeThirst.bind(this));
      html.find(".thirst4").click(this._changeThirst.bind(this));
      html.find(".thirst5").click(this._changeThirst.bind(this));
      html.find(".thirst6").click(this._changeThirst.bind(this));

      html.find(".fatigue0").click(this._changeFatigue.bind(this));
      html.find(".fatigue1").click(this._changeFatigue.bind(this));
      html.find(".fatigue2").click(this._changeFatigue.bind(this));
      html.find(".fatigue3").click(this._changeFatigue.bind(this));
      html.find(".fatigue4").click(this._changeFatigue.bind(this));
      html.find(".fatigue5").click(this._changeFatigue.bind(this));
      html.find(".fatigue6").click(this._changeFatigue.bind(this));

      html.find(".temp0").click(this._changeTemperature.bind(this));
      html.find(".temp1").click(this._changeTemperature.bind(this));
      html.find(".temp2").click(this._changeTemperature.bind(this));
      html.find(".temp3").click(this._changeTemperature.bind(this));
      html.find(".temp4").click(this._changeTemperature.bind(this));
      html.find(".temp5").click(this._changeTemperature.bind(this));
      html.find(".temp6").click(this._changeTemperature.bind(this));

      //textboxes
      html.find(".bio-edit").click(this._editBioBox.bind(this));

      // Equipped Toggle
      html.find(".change-equip").change(this._toggleEquipped.bind(this));


      // Active Effect management
      html.find(".effect-control").click(ev => ActiveEffect5e.onManageActiveEffect(ev, this.actor));

      // Resource management
      html.find(".resource-control").click(this._onConfigMenu.bind(this));
    }

    // Owner Only Listeners
    if ( this.actor.isOwner ) {

      // Ability Checks
      html.find(".ability-name").click(this._onRollAbilityTest.bind(this));
      html.find(".ability-save-name").click(this._onRollAbilitySave.bind(this));


      // Roll Skill Checks
      html.find(".skill-name").click(this._onRollSkillCheck.bind(this));

      // Item Rolling
      html.find(".rollable .item-image").click(event => this._onItemRoll(event));
      html.find(".rollable-learning .item-image").click(event => this._onItemLearningRoll(event));

      html.find(".item .item-recharge").click(event => this._onItemRecharge(event));
    }

    // Otherwise remove rollable classes
    else {
      html.find(".rollable").each((i, el) => el.classList.remove("rollable"));
    }

    // Handle default listeners last so system listeners are triggered first
    super.activateListeners(html);
  }

  /* -------------------------------------------- */

  /**
   * Initialize Item list filters by activating the set of filters which are currently applied
   * @param {number} i  Index of the filter in the list.
   * @param {HTML} ul   HTML object for the list item surrounding the filter.
   * @private
   */
  _initializeFilterItemList(i, ul) {
    const set = this._filters[ul.dataset.filter];
    const filters = ul.querySelectorAll(".filter-item");
    for ( let li of filters ) {
      if ( set.has(li.dataset.filter) ) li.classList.add("active");
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
   * @param {Event} event  Triggering event.
   * @private
   */
  _onChangeInputDelta(event) {
    const input = event.target;
    const value = input.value;
    if ( ["+", "-"].includes(value[0]) ) {
      let delta = parseFloat(value);
      input.value = getProperty(this.actor.data, input.name) + delta;
    } else if ( value[0] === "=" ) {
      input.value = value.slice(1);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event   The click event which originated the selection.
   * @private
   */
  _onConfigMenu(event) {
    event.preventDefault();
    const button = event.currentTarget;
    let app;
    switch ( button.dataset.action ) {
      case "armor":
        app = new ActorArmorConfig(this.object);
        break;
      case "hit-dice":
        app = new ActorHitDiceConfig(this.object);
        break;
      case "movement":
        app = new ActorMovementConfig(this.object);
        break;
      case "flags":
        app = new ActorSheetFlags(this.object);
        break;
      case "senses":
        app = new ActorSensesConfig(this.object);
        break;
      case "type":
        app = new ActorTypeConfig(this.object);
        break;
      case "ability": {
        const ability = event.currentTarget.closest("[data-ability]").dataset.ability;
        app = new ActorAbilityConfig(this.object, null, ability);
        break;
      }
      case "skill": {
        const skill = event.currentTarget.closest("[data-skill]").dataset.skill;
        app = new ActorSkillConfig(this.object, null, skill);
        break;
      }
      case "resource": {
        app = new ActorResourceAdd(this.object);
      }
    }
    app?.render(true);
  }

  /* -------------------------------------------- */

  /**
 * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
 * @param {Event} event   The click event which originated the selection.
 * @private
 */
    _editBioBox(event) {
    event.preventDefault();
    const button = event.currentTarget.classList[2];
    let app = new ActorBioDescription(this.object, null, button);

    app?.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling proficiency in a Skill.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise}     Updated data for this actor after changes are applied.
   * @private
   */
  _onCycleSkillProficiency(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    const skillName = field.parentElement.dataset.skill;
    const source = this.actor.data._source.data.skills[skillName];
    const dup = (field.name).slice(-1) == "2";

    if ( !source ) return;


    if(dup == false){
      // Cycle to the next or previous skill level
      const levels = [0, 1, 0.5, 2, 3];
      let idx = levels.indexOf(source.value);
      const next = idx + (event.type === "click" ? 1 : 3);
      field.value = levels[next % 5];
    
      // Update the field value and save the form
      return this._onSubmit(event);
    } else{

      const levels = [0, 1, 0.5, 2, 3];
      let idx = levels.indexOf(source.value);
      const next = idx + (event.type === "click" ? 1 : 3);
      let value = levels[next % 5];
      let name = field.name.slice(0,-1);
      return this.actor.update({[name]: value});
    }

  }
    /* -------------------------------------------- */

      /**
   * Handle cycling equipped value of armor.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise}     Updated data for this actor after changes are applied.
   * @private
   */
  _toggleEquipped(event) {
    event.preventDefault();
  
    var changedTo = event.currentTarget.value;
    var changedFrom = event.currentTarget.classList[2];
    if (changedFrom != "none"){
      var item = this.actor.data.items.get(changedFrom);
      item.update({"data.equipped": false});
    } 
    if (changedTo != "none"){
      var item = this.actor.data.items.get(changedTo);
      item.update({"data.equipped": true});

    }

    // Update the field value and save the form
    return this._onSubmit(event);
  }
    /* -------------------------------------------- */

  /**
   * Handle manual change of walking speed.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise}     Updated data for this actor after changes are applied.
   * @private
   */
  _onChangeSpeed(event) {
    event.preventDefault();
    const newSpeed = event.target.value;
    if(isNaN(newSpeed)){
      return;
    }
    return this.actor.update({"data.attributes.movement.walk": newSpeed});
  }

  /* -------------------------------------------- */

  /**
 * Handle resolution of duplicated values/displays.
 * @param {Event} event   A click or contextmenu event which triggered the handler.
 * @returns {Promise}     Updated data for this actor after changes are applied.
 * @private
 */
   _onDuplicateChange(event) {
    event.preventDefault();
    const duplicateName = event.target.name;
    const originalName = duplicateName.slice(0, -1);
    const updateValue = event.currentTarget.value;

    return this.actor.update({[originalName]: updateValue});
  }

  /* -------------------------------------------- */

    /**
 * Handle resolution of duplicated values/displays.
 * @param {Event} event   A click or contextmenu event which triggered the handler.
 * @returns {Promise}     Updated data for this actor after changes are applied.
 * @private
 */
     _onDuplicateChangeClick(event) {

      return ;
    }
  
    /* -------------------------------------------- */

  /**
   * Handle manual change of CES Hunger.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise<Actor5e>}     Updated data for this actor after changes are applied.
   * @private
   */
  _changeHunger(event) {
    event.preventDefault();
    const trigger = event.currentTarget.className;
    var newValue;
    if(trigger.includes("hunger0")){
      newValue = 0;
    } else if(trigger.includes("hunger1")){
      newValue = 1;
    } else if(trigger.includes("hunger2")){
      newValue = 2;
    } else if(trigger.includes("hunger3")){
      newValue = 3;
    } else if(trigger.includes("hunger4")){
      newValue = 4;
    } else if(trigger.includes("hunger5")){
      newValue = 5;
    } else if(trigger.includes("hunger6")){
      newValue = 6;
    }
    return this.actor.update({"data.attributes.exhaustion.hunger.value": newValue});
  }

   /* -------------------------------------------- */

      /**
   * Handle manual change of CES Thirst.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise<Actor5e>}     Updated data for this actor after changes are applied.
   * @private
   */
  _changeThirst(event) {
    event.preventDefault();
    const trigger = event.currentTarget.className;
    var newValue;
    if(trigger.includes("thirst0")){
      newValue = 0;
    } else if(trigger.includes("thirst1")){
      newValue = 1;
    } else if(trigger.includes("thirst2")){
      newValue = 2;
    } else if(trigger.includes("thirst3")){
      newValue = 3;
    } else if(trigger.includes("thirst4")){
      newValue = 4;
    } else if(trigger.includes("thirst5")){
      newValue = 5;
    } else if(trigger.includes("thirst6")){
      newValue = 6;
    }
    return this.actor.update({"data.attributes.exhaustion.thirst.value": newValue});
  }

  /**
 * Handle manual change of CES Fatigue.
 * @param {Event} event   A click or contextmenu event which triggered the handler.
 * @returns {Promise<Actor5e>}     Updated data for this actor after changes are applied.
 * @private
 */
    _changeFatigue(event) {
      event.preventDefault();
      const trigger = event.currentTarget.className;
      var newValue;
      if(trigger.includes("fatigue0")){
        newValue = 0;
      } else if(trigger.includes("fatigue1")){
        newValue = 1;
      } else if(trigger.includes("fatigue2")){
        newValue = 2;
      } else if(trigger.includes("fatigue3")){
        newValue = 3;
      } else if(trigger.includes("fatigue4")){
        newValue = 4;
      } else if(trigger.includes("fatigue5")){
        newValue = 5;
      } else if(trigger.includes("fatigue6")){
        newValue = 6;
      }
      return this.actor.update({"data.attributes.exhaustion.fatigue.value": newValue});
    }

   /* -------------------------------------------- */

    /**
   * Handle manual change of CES Fatigue.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise<Actor5e>}     Updated data for this actor after changes are applied.
   * @private
   */
      _changeTemperature(event) {
        event.preventDefault();
        const trigger = event.currentTarget.className;
        var newValue;
        if(trigger.includes("temp0")){
          newValue = 0;
        } else if(trigger.includes("temp1")){
          newValue = 1;
        } else if(trigger.includes("temp2")){
          newValue = 2;
        } else if(trigger.includes("temp3")){
          newValue = 3;
        } else if(trigger.includes("temp4")){
          newValue = 4;
        } else if(trigger.includes("temp5")){
          newValue = 5;
        } else if(trigger.includes("temp6")){
          newValue = 6;
        }
        return this.actor.update({"data.attributes.exhaustion.temperature.value": newValue});
      }
  
     /* -------------------------------------------- */

  // /**
  //  * Handle change of exhaustion.
  //  * @param {Event} event   A click or contextmenu event which triggered the handler.
  //  * @returns {Promise}     Updated data for this actor after changes are applied.
  //  * @private
  //  */
  //    _onChangeExhaustion(event) {
  //     event.preventDefault();
  //     const actor = this.actor;
  //     const changed = event.originalEvent.target.name;
  //     const changedValue = parseInt(event.originalEvent.target.value);
  //     var base = parseInt(actor.data.data.attributes.exhaustion.base);
  //     var hunger =  parseInt(actor.data.data.attributes.exhaustion.hunger);
  //     var thirst =  parseInt(actor.data.data.attributes.exhaustion.thirst);
  //     var fatigue =  parseInt(actor.data.data.attributes.exhaustion.fatigue);
  //     var temp =  parseInt(actor.data.data.attributes.exhaustion.temperature);
      

  //     if(changed == "data.attributes.exhaustion.base"){
  //       base = changedValue;
  //     }

  //     var conditional = hunger + thirst + fatigue + temp;
  //     var total = conditional + base;
  //     return this.actor.update({});
  //   }
  
    /* -------------------------------------------- */

    /**
   * Handle manual change of AC.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise}     Updated data for this actor after changes are applied.
   * @private
   */

  _onChangeAC(event) {
  //   event.preventDefault();
  //   const newAC = event.target.value;
  //   console.log(newAC);
  //   if(isNaN(newAC)){
  //     return;
  //   }
  //   console.log(this.actor.data.data.attributes.ac.flat);
  //   return this.actor.update({"data.attributes.ac.flat": newAC});
   }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, data) {
    const canPolymorph = game.user.isGM || (this.actor.isOwner && game.settings.get("skjaald", "allowPolymorphing"));
    if ( !canPolymorph ) return false;

    // Get the target actor
    let sourceActor = null;
    if (data.pack) {
      const pack = game.packs.find(p => p.collection === data.pack);
      sourceActor = await pack.getDocument(data.id);
    } else {
      sourceActor = game.actors.get(data.id);
    }
    if ( !sourceActor ) return;

    // Define a function to record polymorph settings for future use
    const rememberOptions = html => {
      const options = {};
      html.find("input").each((i, el) => {
        options[el.name] = el.checked;
      });
      const settings = mergeObject(game.settings.get("skjaald", "polymorphSettings") || {}, options);
      game.settings.set("skjaald", "polymorphSettings", settings);
      return settings;
    };

    // Create and render the Dialog
    return new Dialog({
      title: game.i18n.localize("SKJAALD.PolymorphPromptTitle"),
      content: {
        options: game.settings.get("skjaald", "polymorphSettings"),
        i18n: SKJAALD.polymorphSettings,
        isToken: this.actor.isToken
      },
      default: "accept",
      buttons: {
        accept: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("SKJAALD.PolymorphAcceptSettings"),
          callback: html => this.actor.transformInto(sourceActor, rememberOptions(html))
        },
        wildshape: {
          icon: '<i class="fas fa-paw"></i>',
          label: game.i18n.localize("SKJAALD.PolymorphWildShape"),
          callback: html => this.actor.transformInto(sourceActor, {
            keepBio: true,
            keepClass: true,
            keepMental: true,
            mergeSaves: true,
            mergeSkills: true,
            transformTokens: rememberOptions(html).transformTokens
          })
        },
        polymorph: {
          icon: '<i class="fas fa-pastafarianism"></i>',
          label: game.i18n.localize("SKJAALD.Polymorph"),
          callback: html => this.actor.transformInto(sourceActor, {
            transformTokens: rememberOptions(html).transformTokens
          })
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      }
    }, {
      classes: ["dialog", "skjaald"],
      width: 600,
      template: "systems/skjaald/templates/apps/polymorph-prompt.html"
    }).render(true);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItemCreate(itemData) {

    // Check to make sure items of this type are allowed on this actor
    if ( this.constructor.unsupportedItemTypes.has(itemData.type) ) {
      return ui.notifications.warn(game.i18n.format("SKJAALD.ActorWarningInvalidItem", {
        itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
        actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
      }));
    }

    // Create a Consumable spell scroll on the Inventory tab
    if ( (itemData.type === "spell") && (this._tabs[0].active === "inventory") ) {
      const scroll = await Item5e.createScrollFromSpell(itemData);
      itemData = scroll.data;
    }

    if ( itemData.data ) {
      // Ignore certain statuses
      ["equipped", "proficient", "prepared"].forEach(k => delete itemData.data[k]);

      // Downgrade ATTUNED to REQUIRED
      itemData.data.attunement = Math.min(itemData.data.attunement, CONFIG.SKJAALD.attunementTypes.REQUIRED);
    }

    // Stack identical consumables
    if ( itemData.type === "consumable" && itemData.flags.core?.sourceId ) {
      const similarItem = this.actor.items.find(i => {
        const sourceId = i.getFlag("core", "sourceId");
        return sourceId && (sourceId === itemData.flags.core?.sourceId)
               && (i.type === "consumable") && (i.name === itemData.name);
      });
      if ( similarItem ) {
        return similarItem.update({
          "data.quantity": similarItem.data.data.quantity + Math.max(itemData.data.quantity, 1)
        });
      }
    }

    // Create the owned item as normal
    return super._onDropItemCreate(itemData);
  }

  /* -------------------------------------------- */

  /**
   * Handle enabling editing for a spell slot override value.
   * @param {MouseEvent} event    The originating click event.
   * @private
   */
  async _onSpellSlotOverride(event) {
    const span = event.currentTarget.parentElement;
    const level = span.dataset.level;
    const override = this.actor.data.data.spells[level].override || span.dataset.slots;
    const input = document.createElement("INPUT");
    input.type = "text";
    input.name = `data.spells.${level}.override`;
    input.value = override;
    input.placeholder = span.dataset.slots;
    input.dataset.dtype = "Number";

    // Replace the HTML
    const parent = span.parentElement;
    parent.removeChild(span);
    parent.appendChild(input);
  }

  /* -------------------------------------------- */

  /**
   * Change the uses amount of an Owned Item within the Actor.
   * @param {Event} event        The triggering click event.
   * @returns {Promise<Item5e>}  Updated item.
   * @private
   */
  async _onUsesChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    const uses = Math.clamped(0, parseInt(event.target.value), item.data.data.uses.max);
    event.target.value = uses;
    return item.update({ "data.uses.value": uses });
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling an item from the Actor sheet, obtaining the Item instance, and dispatching to its roll method.
   * @param {Event} event  The triggering click event.
   * @returns {Promise}    Results of the roll.
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if ( item ) return item.roll();
  }

    /* -------------------------------------------- */


    /**
   * Handle rolling an item from the Actor sheet, obtaining the Item instance, and dispatching to its roll method.
   * @param {Event} event  The triggering click event.
   * @returns {Promise}    Results of the roll.
   * @private
   */
     _onItemLearningRoll(event) {
      event.preventDefault();

      return roll("1d20");
    }

  /* -------------------------------------------- */

  /**
   * Handle attempting to recharge an item usage by rolling a recharge check.
   * @param {Event} event      The originating click event.
   * @returns {Promise<Roll>}  The resulting recharge roll.
   * @private
   */
  _onItemRecharge(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    return item.rollRecharge();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling and items expanded description.
   * @param {Event} event   Triggering event.
   * @private
   */
  _onItemSummary(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("item-id"));
    const chatData = item.getChatData({secrets: this.actor.isOwner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $('<div class="item-properties"></div>');
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset.
   * @param {Event} event          The originating click event.
   * @returns {Promise<Item5e[]>}  The newly created item.
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
      const itemData = {
        name: game.i18n.format("SKJAALD.ItemNew", {type: game.i18n.localize(`SKJAALD.ItemType${type.capitalize()}`)}),
        type: type,
        data: foundry.utils.deepClone(header.dataset)
      };
    if (type == "spell"){
      var level = event.currentTarget.classList[2];
      if (level == "Cantrips"){
        level = 0;
      }
      if (level == "Spell"){
        level = 0;
        itemData.data.learningNow = true;
      }
      itemData.data.level = level;
    }

    if (type == "prof"){
      if (event.currentTarget.classList[2] == "Tools"){
        itemData.data.category = "Tool";
      } else if (event.currentTarget.classList[2] == "Armor"){
        itemData.data.category = "Armor";
      } else if (event.currentTarget.classList[2] == "Weapon"){
        itemData.data.category = "Weapon";
      } else if (event.currentTarget.classList[2] == "Language"){
        itemData.data.category = "Language";
      }
    }
    if (type == "otherLearn"){
      if (event.currentTarget.classList[2] == "Other"){
        itemData.data.category = "other";
      } else if (event.currentTarget.classList[2] == "Skill"){
        itemData.data.category = "Skill";
      }
    }


    if (type == "prof" || type == "otherLearn"){
      if(event.currentTarget.classList[3] == "Learning"){
        itemData.data.learningNow = true;
      } else if (event.target.classList[3] == "Proficiency"){
        itemData.data.proficient = 1;
      }
    }

    delete itemData.data.type;
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /* -------------------------------------------- */

  /**
 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset.
 * @param {Event} event          The originating click event.
 * @returns {Promise<Item5e[]>}  The newly created item.
 * @private
 */
   _onHistoryItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const category = event.currentTarget.name;
    const type = header.dataset.type;
    header.dataset.category = category;

    const itemData = {
      name: game.i18n.format("SKJAALD.ItemNew", {type: game.i18n.localize(`SKJAALD.ItemType${type.capitalize()}`)}),
      type: type,
      data: foundry.utils.deepClone(header.dataset)
    };
    delete itemData.data.type;
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /* -------------------------------------------- */


  /**
   * Handle editing an existing Owned Item for the Actor.
   * @param {Event} event    The originating click event.
   * @returns {ItemSheet5e}  The rendered item sheet.
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);

    return item.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Owned Item for the Actor.
   * @param {Event} event  The originating click event.
   * @returns {Promise<Item5e>|undefined}  The deleted item if something was deleted.
   * @private
   */
  _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    if ( item ) return item.delete();
  }

  /* -------------------------------------------- */

  /**
   * Handle displaying the property attribution tooltip when a property is hovered over.
   * @param {Event} event   The originating mouse event.
   * @private
   */
  async _onPropertyAttribution(event) {
    const existingTooltip = event.currentTarget.querySelector("div.tooltip");
    const property = event.currentTarget.dataset.property;
    if ( existingTooltip || !property ) return;
    const data = this.actor.data.data;

    if ( !attributions ) return;
    const html = await new PropertyAttribution(this.actor, attributions, property).renderTooltip();
    event.currentTarget.insertAdjacentElement("beforeend", html[0]);
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling an Ability test or saving throw.
   * @param {Event} event      The originating click event.
   * @private
   */
  _onRollAbilityTest(event) {
    event.preventDefault();
    let ability;
    if(event.currentTarget.parentElement.dataset.ability == ""){
      ability = event.currentTarget.parentElement.dataset.skill;
    } else{
      ability = event.currentTarget.parentElement.dataset.ability;
    }
    this.actor.rollAbilityTest(ability, {event: event});
  }

  /* -------------------------------------------- */

    /**
   * Handle rolling an Ability saving throw.
   * @param {Event} event      The originating click event.
   * @private
   */
     _onRollAbilitySave(event) {
      event.preventDefault();
      let ability = event.currentTarget.classList[2];
      this.actor.rollAbilitySave(ability, {event: event});
    }
  
    /* -------------------------------------------- */

  /**
   * Handle rolling a Skill check.
   * @param {Event} event      The originating click event.
   * @returns {Promise<Roll>}  The resulting roll.
   * @private
   */
  _onRollSkillCheck(event) {
    event.preventDefault();
    const skill = event.currentTarget.closest("[data-skill]").dataset.skill;
    return this.actor.rollSkill(skill, {event: event});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling Ability score proficiency level.
   * @param {Event} event         The originating click event.
   * @returns {Promise<Actor5e>}  Updated actor instance.
   * @private
   */
  _onToggleAbilityProficiency(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    const dup = (field.name).slice(-1) == "2";
    let addField = field.name;
    if(dup) {
      addField = (field.name).slice(0, -1);
    } else {
      addField = field.name + "2";
    }
    return this.actor.update({[field.name]: 1 - parseInt(field.value), [addField]: 1 - parseInt(field.value)});
  }

  /* -------------------------------------------- */

  /**
 * Handle toggling Fate points.
 * @param {Event} event         The originating click event.
 * @returns {Promise<Actor5e>}  Updated actor instance.
 * @private
 */
  _onToggleCheckMarkFate(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    
    return this.actor.update({[field.name]: (parseInt(field.value) + 1) % 2});
  }
  
  /* -------------------------------------------- */

  /**
 * Handle toggling funciton of eat a ration, reducing exhaustion/hunger and removing a ration from inventory.
 * @param {Event} event         The originating click event.
 * @returns {Promise<Actor5e>}  Updated actor instance.
 * @private
 */
    _onToggleCheckMarkRation(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    const value = parseInt(field.value);
    var newValue;

    // check if a new ration needs to be openned
    if (value == 0){
      const openRation = true;
      var rationItem = false;

      // check if you have more rations to open
      for ( let i of this.actor.data.items ) {
        const item = i.name;
        if (item == "Ration" || item == "ration" || item == "Rations" || item == "rations"){
          rationItem = true;
          var rationQuantity = i.data.data.quantity;
          if (rationItem){
            if(rationQuantity > 0){
              rationQuantity -= 1;
              newValue = 5;
              this._modifyItemQuantity(i, rationQuantity);
              break;
            } else {
              console.log("notif no more rations");
              ui.notifications.warn(game.i18n.localize("SKJAALD.NoRationsLeft"));
            }
          }
        }
      }
      if(rationItem == false){
        ui.notifications.warn(game.i18n.localize("SKJAALD.NoRationItem"));

      }
    }else {
      newValue = (value - 1) % 5;
    }
    var hunger = this.actor.data.data.attributes.exhaustion.hunger.value;


    if ( value > 0 && hunger > 2) {
      hunger -= 1;
    }
    return this.actor.update({"data.attributes.ration.value": newValue, "data.attributes.exhaustion.hunger.value": hunger});
  }
  
  /* -------------------------------------------- */
  /**
 * modify the quantity of an item.
 * @param {Item} item         The item to modify
 * @param {int}  newQuantity  The new quantity of the item
 */

  _modifyItemQuantity(item, newQuantity){
    item.update({"data.quantity": newQuantity});
    return;
  }


  /* -------------------------------------------- */

  /**
 * Handle toggling Fate points.
 * @param {Event} event         The originating click event.
 * @returns {Promise<Actor5e>}  Updated actor instance.
 * @private
 */
   _onToggleCheckMarkWater(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    const value = parseInt(field.value);
    var newValue;


        // check if a new ration needs to be openned
        if (value == 0){
          const openWater = true;
          var waterItem = false;

          // check if you have more rations to open
          for ( let i of this.actor.data.items ) {
            const item = i.name;
            if (item == "Waterskin" || item == "waterskin" || item == "Waterskins" || item == "waterskins" || item == "Water" || item == "water"){
              waterItem = true;
              var waterQuantity = i.data.data.quantity;
              if (waterItem){
                if(waterQuantity > 0){
                  waterQuantity -= 1;
                  newValue = 5;
                  this._modifyItemQuantity(i, waterQuantity);
                  break;
                } else {
                  console.log("notif no more rations");
                  ui.notifications.warn(game.i18n.localize("SKJAALD.NoWaterLeft"));
                }
              }
            }
          }
          if(waterItem == false){
            ui.notifications.warn(game.i18n.localize("SKJAALD.NoWaterItem"));
    
          }
        }else {
          newValue = (value - 1) % 5;
        }



    var thirst = this.actor.data.data.attributes.exhaustion.thirst.value;


    if ( value > 0 && thirst > 2) {
      thirst -= 1;
    }
    return this.actor.update({"data.attributes.waterskin.value": newValue, "data.attributes.exhaustion.thirst.value": thirst});
  }
  
  /* -------------------------------------------- */


  /**
 * Handle toggling Inspiration/Legend points.
 * @param {Event} event         The originating click event.
 * @returns {Promise<Actor5e>}  Updated actor instance.
 * @private
 */
   _onToggleCheckMark(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    let value = false; 
    if(field.value == "false"){
      value = true;
    } else if (field.value == "true") {
      value = false;
    }

    return this.actor.update({[field.name]: value});
  }
  /* -------------------------------------------- */

    /**
 * Handle toggling death save icon.
 * @param {Event} event         The originating click event.
 * @returns {Promise<Actor5e>}  Updated actor instance.
 * @private
 */
     _onToggleDeath(event) {
      event.preventDefault();
      const field = event.currentTarget.previousElementSibling;
      let fieldName = field.name;
      let fieldNameOriginal = fieldName;
      let fieldNameDuplicate = fieldName;
      
      if (field.name == "data.attributes.death.save12" || field.name == "data.attributes.death.save22" || field.name == "data.attributes.death.save32"){
        fieldNameOriginal = fieldName.slice(0, -1);

      } else if (field.name == "data.attributes.death.save1" || field.name == "data.attributes.death.save2" || field.name == "data.attributes.death.save2"){
        fieldNameDuplicate = fieldName + "2";
      }

      let value = false; 
      if(field.value == "empty"){
        value = "success";
      } else if (field.value == "success") {
        value = "failure";
      } else if (field.value == "failure") {
        value = "empty";
      }
  
      return this.actor.update({[fieldNameOriginal]: value, [fieldNameDuplicate]: value});
    }

  /* -------------------------------------------- */

  /**
 * Handle updating health visual.
 * @param {Event} event         The originating click event.
 * @returns {Promise<Actor5e>}  Updated actor instance.
 * @private
 */
   _getHealthVisual(event) {
    let maxHP = this.actor.data.data.attributes.hp.max;
    let hp = this.actor.data.data.attributes.hp.value;
    let grit = this.actor.data.data.attributes.hp.grit;
    if (grit > 0 && hp == maxHP){
      let additional = grit / maxHP;
      if (additional >= .5) {
        return this.actor.update({"data.attributes.hp.visual": 0});
      } else if(additional >= .25) {
        return this.actor.update({"data.attributes.hp.visual": 1});
      } else {
        return this.actor.update({"data.attributes.hp.visual": 2});
      }
    } else {
      let percentage = hp / maxHP;
      if (hp == 1){
        return this.actor.update({"data.attributes.hp.visual": 6});
      } else if(percentage >= .75){
        return this.actor.update({"data.attributes.hp.visual": 2});
      } else if(percentage >= .5){
        return this.actor.update({"data.attributes.hp.visual": 3});
      } else if(percentage >= .25){
        return this.actor.update({"data.attributes.hp.visual": 4});
      } else if(percentage >= .1){
        return this.actor.update({"data.attributes.hp.visual": 5});
      } else {
        return this.actor.update({"data.attributes.hp.visual":6});
      }
    }
  }
  /* -------------------------------------------- */
  

  /**
   * Handle toggling of filters to display a different set of owned items.
   * @param {Event} event     The click event which triggered the toggle.
   * @returns {ActorSheet5e}  This actor sheet with toggled filters.
   * @private
   */
  _onToggleFilter(event) {
    event.preventDefault();
    const li = event.currentTarget;
    const set = this._filters[li.parentElement.dataset.filter];
    const filter = li.dataset.filter;
    if ( set.has(filter) ) set.delete(filter);
    else set.add(filter);
    return this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the ProficiencySelector application to configure armor, weapon, and tool proficiencies.
   * @param {Event} event            The click event which originated the selection.
   * @returns {ProficiencySelector}  Newly displayed application.
   * @private
   */
  _onProficiencySelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const label = a.parentElement.querySelector("label");
    const options = { name: a.dataset.target, title: `${label.innerText}: ${this.actor.name}`, type: a.dataset.type };
    return new ProficiencySelector(this.actor, options).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event      The click event which originated the selection.
   * @returns {TraitSelector}  Newly displayed application.
   * @private
   */
  _onTraitSelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const label = a.parentElement.querySelector("label");
    const choices = CONFIG.SKJAALD[a.dataset.options];
    const options = { name: a.dataset.target, title: `${label.innerText}: ${this.actor.name}`, choices };
    return new TraitSelector(this.actor, options).render(true);
  }

  /* -------------------------------------------- */

  /** @override */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    if ( this.actor.isPolymorphed ) {
      buttons.unshift({
        label: "SKJAALD.PolymorphRestoreTransformation",
        class: "restore-transformation",
        icon: "fas fa-backward",
        onclick: () => this.actor.revertOriginalForm()
      });
    }
    return buttons;
  }


}



  