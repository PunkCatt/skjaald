import ProficiencySelector from "../apps/proficiency-selector.js";
import TraitSelector from "../apps/trait-selector.js";
import ActiveEffect5e from "../active-effect.js";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types.
 * @extends {ItemSheet}
 */
export default class ItemSheet5e extends ItemSheet {
  constructor(...args) {
    super(...args);

    // Expand the default size of the class sheet
    if ( this.object.data.type === "class" ) {
      this.options.width = this.position.width = 600;
      this.options.height = this.position.height = 680;
    }

    //get focuses list
    // listOfFocuses= this._getItemConsumptionTargets(itemData, "charges");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 560,
      height: 400,
      classes: ["skjaald", "sheet", "item"],
      resizable: true,
      scrollY: [".tab.details"],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    const path = "systems/skjaald/templates/items/";
    return `${path}/${this.item.data.type}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const data = super.getData(options);
    const itemData = data.data;
    data.labels = this.item.labels;
    data.config = CONFIG.SKJAALD;

    // Item Type, Status, and Details
    data.itemType = game.i18n.localize(`ITEM.Type${data.item.type.titleCase()}`);
    data.itemStatus = this._getItemStatus(itemData);
    data.itemProperties = this._getItemProperties(itemData);
    data.baseItems = await this._getItemBaseTypes(itemData);
    data.isPhysical = itemData.data.hasOwnProperty("quantity");
    data.isWeapon = data.itemType == "Weapon";
    data.notArmWeap = data.itemType !== "Weapon" && !this.item.isArmor;
    if (this.item.actor != null ){
      data.race = this.item.actor.data.data.details.race;
    }


    // Potential consumption targets
    
    data.abilityConsumptionTargetsAmmo = this._getItemConsumptionTargets(itemData, "ammo");
    data.abilityConsumptionTargetsAttribute = this._getItemConsumptionTargets(itemData, "attribute");
    data.abilityConsumptionTargetsCharges = this._getItemConsumptionTargets(itemData, "charges");
    data.abilityConsumptionTargetsMaterial = this._getItemConsumptionTargets(itemData, "material");
    data.abilityConsumptionTargetsItemUse = this._getItemConsumptionTargets(itemData, "itemUse");
    console.log("consuptionCharges");
    console.log(data);

 
    // Action Details
    data.hasAttackRoll = this.item.hasAttack;
    data.hasNonAttackRoll = this.item.hasAttack;
    data.isHealing = itemData.data.actionType === "heal";
    data.isFlatDC = getProperty(itemData, "data.save.scaling") === "flat";
    data.isLine = ["line", "wall"].includes(itemData.data.target?.type);

    // Original maximum uses formula
    const sourceMax = foundry.utils.getProperty(this.item.data._source, "data.uses.max");
    if ( sourceMax ) itemData.data.uses.max = sourceMax;

    // Vehicles
    data.isCrewed = itemData.data.activation?.type === "crew";
    data.isMountable = this._isItemMountable(itemData);

    // Armor Class
    data.isArmor = this.item.isArmor;
    data.hasAC = data.isArmor || data.isMountable;
    data.hasDexModifier = data.isArmor && (itemData.data.armor?.type !== "shield");

    // Prepare Active Effects
    data.effects = ActiveEffect5e.prepareActiveEffectCategories(this.item.effects);

    // Re-define the template data references (backwards compatible)
    data.item = itemData;
    data.data = itemData.data;

    // LearningNow Toggle for Learning Lists
    if(data.data.learningNow === "true"){
      this.item.update({"data.learningNow": false});
      this.item.update({"data.learning.currently": true});
    }

    if(data.data.learningNow == false && data.data.learning.currently == false && data.data.proficient == 0){
      ui.notifications.error("You just unclicked CURRENTLY LEARNING on an item you have no proficiency in. This item will remain in your learning list until you are proficient or delete it by clicking the trash can.", {permanent: true});
      ui.notifications.error("Fuck you! You can't do that!");
      this.item.update({"data.learning.currently": true});
    }

     // spell calculations
     if(data.itemType == "Spell"){
      if(data.data.learning.currently){
        var level = data.data.learning.level;
        if(level == ""){
          level = 0;
        }
        var newHoursNeeded = ((parseInt(level) * 10) + 10)- data.data.learning.hours;
        data.data.learning.arcanaNeeded = ((parseInt(level) * 100) + 100) - data.data.learning.arcana;
        data.data.learning.arcanaTotal = (parseInt(level) * 100) + 100;
        data.data.learning.hoursTotal = (parseInt(level) * 10) + 10;
        this.item.update({"data.learning.hoursNeeded": newHoursNeeded});
      }

    }

    // regular learning calculation
    if(data.itemType == "Proficiency" || data.itemType == "Other Learning"){
      if(data.data.learning.currently){
        if (data.data.learning.level == 1){
          data.data.learning.hoursNeeded = 1000 - data.data.learning.hours;
          data.data.learning.hoursTotal = 1000;

        } else if (data.data.learning.level == 2){
          data.data.learning.hoursNeeded = 10000 - data.data.learning.hours;
          data.data.learning.hoursTotal = 10000;
        } else if (data.data.learning.level == 3) {
          data.data.learning.hoursNeeded = 100000 - data.data.learning.hours;
          data.data.learning.hoursTotal = 100000;
        }
      }

    }



    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get the base weapons and tools based on the selected type.
   *
   * @param {object} item        Item data for the item being displayed
   * @returns {Promise<object>}  Object with base items for this type formatted for selectOptions.
   * @protected
   */
  async _getItemBaseTypes(item) {
    const type = item.type === "equipment" ? "armor" : item.type;
    const ids = CONFIG.SKJAALD[`${type}Ids`];
    if ( ids === undefined ) return {};
    const typeProperty = type === "armor" ? "armor.type" : `${type}Type`;


    const baseType = foundry.utils.getProperty(item.data, typeProperty);

  const items = await Object.entries(ids).reduce(async (acc, [name, id]) => {
      const baseItem = await ProficiencySelector.getBaseItem(id);
      const obj = await acc;
      if ( baseType !== foundry.utils.getProperty(baseItem.data, typeProperty) ) return obj;
      obj[name] = baseItem.name;
      return obj;
    }, {});


    return Object.fromEntries(Object.entries(items).sort((lhs, rhs) => lhs[1].localeCompare(rhs[1])));
  }

  /* -------------------------------------------- */

  /**
   * Get the valid item consumption targets which exist on the actor
   * @param {object} item         Item data for the item being displayed
   * @param {string} category         category of items to display
   * @returns {{string: string}}   An object of potential consumption targets
   * @private
   */
  _getItemConsumptionTargets(item, category) {
    // const consume = item.data.consume || {};


    // if ( !consume.type ) return [];
    if ( !actor ) return {};

    const actor = this.item.actor;
    const items = actor.data.items;


    
      // Ammunition
      if ( category === "ammo" ) {
        // add equiped to check
        return actor.itemTypes.consumable.reduce((ammo, i) => {
          if ( i.data.data.consumableType === "ammo" ) {
            if ( i.data.data.equipped){
              ammo[i.id] = `${i.name} (${i.data.data.quantity})`;
            }
          }
          return ammo;
        }, {});
      }

      // Attributes
      else if ( category === "attribute" ) {
        const attributes = TokenDocument.implementation.getConsumedAttributes(actor.data.data);
        //console.log(attributes);
        attributes.bar.forEach(a => {a.push("value"); console.log(a);});
        return attributes.bar.concat(attributes.value).reduce((obj, a) => {
          //console.log(obj);
          let k = a.join(".");
          obj[k] = k;
          return obj;
        }, {});
      }

      // Materials
      else if ( category === "material" ) {
        return actor.items.reduce((obj, i) => {

          if ( ["loot"].includes(i.data.type) ) {
            obj[i.id] = `${i.name} (${i.data.data.quantity})`;
          } else if(["consumable"].includes(i.data.type)) {
            if(i.data.data.consumableType != "focus" && i.data.data.consumableType != "ammo"){
              obj[i.id] = `${i.name} (${i.data.data.quantity})`;
            }
          }
          return obj;
        }, {});
      }

      // Charges
      //add equiped to check
      else if ( category === "charges" ) {
        return actor.itemTypes.consumable.reduce((focus, i) => {
          if ( i.data.data.consumableType === "focus" ) {
            if ( i.data.data.equipped){
              focus[i.id] = `${i.name} (${i.data.data.ammoDie.current})`;
            }
          }
          return focus;
        }, {});
      }  
      
      else if ( category === "itemUse" ) {
        return actor.items.reduce((obj, i) => {
          // Limited-use items
          const uses = i.data.data.uses || {};
          if ( uses.per && uses.max ) {
            const label = uses.per === "charges"
              ? ` (${game.i18n.format("SKJAALD.AbilityUseChargesLabel", {value: uses.value})})`
              : ` (${game.i18n.format("SKJAALD.AbilityUseConsumableLabel", {max: uses.max, per: uses.per})})`;
            obj[i.id] = i.name + label;
          }
  
          // Recharging items
          const recharge = i.data.data.recharge || {};
          if ( recharge.value ) obj[i.id] = `${i.name} (${game.i18n.format("SKJAALD.Recharge")})`;
          return obj;
        }, {});
      }
      else return {};



  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet.
   * @param {object} item    Copy of the item data being prepared for display.
   * @returns {string|null}  Item status string if applicable to item's type.
   * @private
   */
  _getItemStatus(item) {
    if ( item.type === "spell" ) {
      return CONFIG.SKJAALD.spellPreparationModes[item.data.preparation];
    }
    else if ( ["weapon", "equipment"].includes(item.type) ) {
      return game.i18n.localize(item.data.equipped ? "SKJAALD.Equipped" : "SKJAALD.Unequipped");
    }
    else if ( item.type === "tool" ) {
      return game.i18n.localize(item.data.proficient ? "SKJAALD.Proficient" : "SKJAALD.NotProficient");
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab.
   * @param {object} item  Copy of the item data being prepared for display.
   * @returns {string[]}   List of property labels to be shown.
   * @private
   */
  _getItemProperties(item) {
    const props = [];
    const labels = this.item.labels;

    if ( item.type === "weapon" ) {
      props.push(...Object.entries(item.data.properties)
        .filter(e => e[1] === true)
        .map(e => CONFIG.SKJAALD.weaponProperties[e[0]]));
    }

    else if ( item.type === "spell" ) {
      props.push(
        labels.components,
        labels.materials,
        item.data.components.concentration ? game.i18n.localize("SKJAALD.Concentration") : null,
        item.data.components.ritual ? game.i18n.localize("SKJAALD.Ritual") : null
      );
    }

    else if ( item.type === "equipment" ) {
      props.push(CONFIG.SKJAALD.equipmentTypes[item.data.armor.type]);
      if ( this.item.isArmor || this._isItemMountable(item) ) props.push(labels.armor);
    }

    else if ( item.type === "feat" ) {
      props.push(labels.featType);
    }

    // Action type
    if ( item.data.actionType ) {
      props.push(CONFIG.SKJAALD.itemActionTypes[item.data.actionType]);
    }

    // Action usage
    if ( (item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation) ) {
      props.push(
        labels.activation,
        labels.range,
        labels.target,
        labels.duration
      );
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP.
   * @param {object} item  Copy of item data being prepared for display.
   * @returns {boolean}    Is item siege weapon or vehicle equipment?
   * @private
   */
  _isItemMountable(item) {
    const data = item.data;
    return (item.type === "weapon" && data.weaponType === "siege")
      || (item.type === "equipment" && data.armor.type === "vehicle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  setPosition(position={}) {
    if ( !(this._minimized || position.height) ) {
      position.height = (this._tabs[0].active === "details") ? "auto" : this.options.height;
    }
    return super.setPosition(position);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData={}) {

    // Create the expanded update data object
    const fd = new FormDataExtended(this.form, {editors: this.editors});
    let data = fd.toObject();
    if ( updateData ) data = mergeObject(data, updateData);
    else data = expandObject(data);

    // Handle Damage array
    const damage = data.data?.damage;
    if ( damage ) damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);

    // Check max uses formula
    if ( data.data?.uses?.max ) {
      const maxRoll = new Roll(data.data.uses.max);
      if ( !maxRoll.isDeterministic ) {
        data.data.uses.max = this.object.data._source.data.uses.max;
        this.form.querySelector("input[name='data.uses.max']").value = data.data.uses.max;
        ui.notifications.error(game.i18n.format("SKJAALD.FormulaCannotContainDiceWarn", {
          name: game.i18n.localize("SKJAALD.LimitedUses")
        }));
      }
    }

    // Return the flattened submission data
    return flattenObject(data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find(".attack-control").click(this._onAttackControl.bind(this));
      html.find(".spell-effect-control").click(this._onEffectControl.bind(this));
      html.find(".spell-template-control").click(this._onTemplateControl.bind(this));
      html.find(".equip-slots").click(this._toggleEquipmentSlots.bind(this));
      html.find(".trait-selector").click(this._onConfigureTraits.bind(this));
      html.find(".effect-control").click(ev => {
        if ( this.item.isOwned ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported and will be added in a subsequent update.");
        ActiveEffect5e.onManageActiveEffect(ev, this.item);
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Add or remove a damage part from the damage formula.
   * @param {Event} event             The original click event.
   * @returns {Promise<Item5e>|null}  Item with updates applied.
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parts[2];

      const name = "data.attacks." + index + ".damageparts";
      



      const attacks = Object.values(this.item.data.data.attacks[index].damageparts || []); 
      attacks.push({0: "", 1: ""});
      return this.item.update({[name]: attacks}, {});
    }

    if ( a.classList.contains("add-damage-spell") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parts[2];

      const name = "data.effects." + index + ".damageparts";     

      const attacks = Object.values(this.item.data.data.effects[index].damageparts || []); 
      attacks.push({0: "", 1: ""});
      return this.item.update({[name]: attacks}, {});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");


      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const index2 = parseInt(parts[3]);
      const name = "data.attacks." + index + ".damageparts";



      const attacks =  Object.values(this.item.data.data.attacks[index].damageparts || []);
      attacks.splice(index2, 1);
      return this.item.update({ [name]: attacks}, {});

    }

    if ( a.classList.contains("delete-damage-spell") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");


      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const index2 = parseInt(parts[3]);
      const name = "data.effects." + index + ".damageparts";



      const attacks =  Object.values(this.item.data.data.effects[index].damageparts || []);
      attacks.splice(index2, 1);
      return this.item.update({ [name]: attacks}, {});

    }
  }

  /* -------------------------------------------- */

  /**
 * Add or remove a weapon attack part from a weapon.
 * @param {Event} event             The original click event.
 * @returns {Promise<Item5e>|null}  Item with updates applied.
 * @private
 */
    async _onAttackControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-attack") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const attacks = Object.values(this.item.data.data.attacks || []); 
      attacks.push({name: "Weapon Attack", actionType: null, criticalThreshold: "20"});
      return this.item.update({"data.attacks": attacks}, {});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-attack") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const attacks =  Object.values(this.item.data.data.attacks || []);
      attacks.splice(index, 1);
      return this.item.update({ "data.attacks": attacks}, {});
    }
  }

    /* -------------------------------------------- */

  /**
 * Add or remove a weapon attack part from a weapon.
 * @param {Event} event             The original click event.
 * @returns {Promise<Item5e>|null}  Item with updates applied.
 * @private
 */
   async _onEffectControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-effect") ) {
      await this._onSubmit(event);  // Submit any unsaved 
      const effects = Object.values(this.item.data.data.effects || []); 
      effects.push({name: "Spell Effect", actionType: null});
      return this.item.update({"data.effects": effects}, {});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-effect") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const effects =  Object.values(this.item.data.data.effects || []);
      effects.splice(index, 1);
      return this.item.update({ "data.effects": effects}, {});
    }
  }


  
    /* -------------------------------------------- */

  /**
 * Add or remove a weapon attack part from a weapon.
 * @param {Event} event             The original click event.
 * @returns {Promise<Item5e>|null}  Item with updates applied.
 * @private
 */
  async _onTemplateControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-path") ) {
      await this._onSubmit(event);  // Submit any unsaved 
      const paths = Object.values(this.item.data.data.templatePaths || []); 
      paths.push({name: "Template Path", spells: null});
      return this.item.update({"data.templatePaths": paths}, {});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-path") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const paths =  Object.values(this.item.data.data.templatePaths || []);
      paths.splice(index, 1);
      return this.item.update({ "data.templatePaths": paths}, {});
    }

    // Add new damage component
    if ( a.classList.contains("add-template") ) {
      await this._onSubmit(event);  // Submit any unsaved 
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const templates = Object.values(this.item.data.data.templatePaths[index].spells || []); 
      templates.push({name: "Template Spell", minLevel: -1});
      //UPDATE HERE
      return this.item.update({data: {
        templatePaths: {
          [index]: {spells: templates}
        }
      }});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-template") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const target = event.currentTarget.className;
      const parts = target.split(' ');
      const index = parseInt(parts[2]);
      const index2 = parseInt(parts[3]);
      const name = "data.templatePaths." + index + ".spells";

      const paths =  Object.values(this.item.data.data.templatePaths[index].spells || []);
      paths.splice(index2, 1);
      return this.item.update({ [name]: paths}, {});
    }
  }


   /* -------------------------------------------- */

 /**
 * Handle cycling equipped value of armor.
 * @param {Event} event   A click or contextmenu event which triggered the handler.
 * @returns {Promise}     Updated data for this actor after changes are applied.
 * @private
 */
  _toggleEquipmentSlots(event) {
  event.preventDefault();


  var changedTo = event.currentTarget.checked;
  var itemID = event.currentTarget.classList[1];
  if (changedTo == false){
    var item = this.actor.data.items.get(itemID);
    var slot = event.currentTarget.name;
    var slot = slot.split(".")[1];
    var actor = item.actor;
    if(slot != "rings"){
      var equipedItem = actor.data.data.attributes.wornArmor[slot];
      if(equipedItem != "none"){
        if(itemID == equipedItem){
          var name = "data.attributes.wornArmor." + slot;
          actor.update({ [name] : "none"});
          item.update({"data.equipped": false});
        }
      }
    } else if(slot == "rings"){
      if(actor.data.data.attributes.wornArmor.ring1 == itemID){
        actor.update({"data.attributes.wornArmor.ring1": "none"});
        item.update({"data.equipped": false});
      }else if(actor.data.data.attributes.wornArmor.ring2 == itemID){
        actor.update({"data.attributes.wornArmor.ring2": "none"});
        item.update({"data.equipped": false});
      }else if(actor.data.data.attributes.wornArmor.ring3 == itemID){
        actor.update({"data.attributes.wornArmor.ring3": "none"});
        item.update({"data.equipped": false});
      }else if(actor.data.data.attributes.wornArmor.ring4 == itemID){
        actor.update({"data.attributes.wornArmor.ring4": "none"});
        item.update({"data.equipped": false});
      }
    }  
  } 

  return this._onSubmit(event);
}
  /* -------------------------------------------- */



  /**
   * Handle spawning the TraitSelector application for selection various options.
   * @param {Event} event   The click event which originated the selection.
   * @private
   */
  _onConfigureTraits(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.dataset.target,
      title: a.parentElement.innerText,
      choices: [],
      allowCustom: false
    };
    switch (a.dataset.options) {
      case "saves":
        options.choices = CONFIG.SKJAALD.abilities;
        options.valueKey = null;
        break;
      case "skills.choices":
        options.choices = CONFIG.SKJAALD.skills;
        options.valueKey = null;
        break;
      case "skills":
        const skills = this.item.data.data.skills;
        const choiceSet = skills.choices?.length ? skills.choices : Object.keys(CONFIG.SKJAALD.skills);
        options.choices =
          Object.fromEntries(Object.entries(CONFIG.SKJAALD.skills).filter(([skill]) => choiceSet.includes(skill)));
        options.maximum = skills.number;
        break;
    }
    new TraitSelector(this.item, options).render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }
}
