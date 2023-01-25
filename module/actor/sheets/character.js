import ActorSheet5e from "./base.js";

/**
 * An Actor sheet for player character type actors.
 * @extends {ActorSheet5e}
 */
export default class ActorSheet5eCharacter extends ActorSheet5e {

  /**
   * Define default rendering options for the NPC sheet.
   * @returns {object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["skjaald", "sheet", "actor", "character"],
      width: 720,
      height: 680
    });
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   * @returns {object}  Prepared copy of the actor data ready to be displayed.
   */
  getData() {
    const sheetData = super.getData();

    // Temporary HP
    let hp = sheetData.data.attributes.hp;
    if (hp.temp === 0) delete hp.temp;
    if (hp.tempmax === 0) delete hp.tempmax;

    // Resources
    sheetData.resources = ["primary", "secondary", "tertiary"].reduce((arr, r) => {
      
      const res = sheetData.data.resources[r] || {};
      res.name = r;
      res.placeholder = game.i18n.localize(`SKJAALD.Resource${r.titleCase()}`);
      if (res && res.value === 0) delete res.value;
      if (res && res.max === 0) delete res.max;

      return arr.concat([res]);
    }, []);

    // Experience Tracking
    sheetData.disableExperience = game.settings.get("skjaald", "disableExperienceTracking");
    sheetData.classLabels = this.actor.itemTypes.class.map(c => c.name).join(", ");
    sheetData.multiclassLabels = this.actor.itemTypes.class.map(c => {
      return [c.data.data.subclass, c.name, c.data.data.levels].filterJoin(" ");
    }).join(", ");

    // Weight unit
    sheetData.weightUnit = game.settings.get("skjaald", "metricWeightUnits")
      ? game.i18n.localize("SKJAALD.AbbreviationKgs")
      : game.i18n.localize("SKJAALD.AbbreviationLbs");

     

    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Owned Items for Character sheets
   * @param {object} data  Copy of the actor data being prepared for display. *Will be mutated.*
   * @private
   */
  _prepareItems(data) {



    // Categorize items as inventory, spellbook, features, and classes
    const inventory = {
      weapon: { label: "SKJAALD.ItemTypeWeaponPl", items: [], dataset: {type: "weapon"} },
      equipment: { label: "SKJAALD.ItemTypeEquipmentPl", items: [], dataset: {type: "equipment"} },
      consumable: { label: "SKJAALD.ItemTypeConsumablePl", items: [], dataset: {type: "consumable"} },
      tool: { label: "SKJAALD.ItemTypeToolPl", items: [], dataset: {type: "tool"} },
      backpack: { label: "SKJAALD.ItemTypeContainerPl", items: [], dataset: {type: "backpack"} },
      loot: { label: "SKJAALD.ItemTypeLootPl", items: [], dataset: {type: "loot"} }
    };

    // Partition items by category
    let [items, spells, feats, classes, history, otherLearn, prof] = data.items.reduce((arr, item) => {

      // Item details
      item.img = item.img || CONST.DEFAULT_TOKEN;
      item.isStack = Number.isNumeric(item.data.quantity) && (item.data.quantity !== 1);
      item.attunement = {
        [CONFIG.SKJAALD.attunementTypes.REQUIRED]: {
          icon: "fa-sun",
          cls: "not-attuned",
          title: "SKJAALD.AttunementRequired"
        },
        [CONFIG.SKJAALD.attunementTypes.ATTUNED]: {
          icon: "fa-sun",
          cls: "attuned",
          title: "SKJAALD.AttunementAttuned"
        }
      }[item.data.attunement];

      // Item usage
      item.hasUses = item.data.uses && (item.data.uses.max > 0);
      item.isOnCooldown = item.data.recharge && !!item.data.recharge.value && (item.data.recharge.charged === false);
      item.isDepleted = item.isOnCooldown && (item.data.uses.per && (item.data.uses.value > 0));
      item.hasTarget = !!item.data.target && !(["none", ""].includes(item.data.target.type));

      // Item toggle state
      this._prepareItemToggleState(item);

      // Primary Class
      if ( item.type === "class" ) item.isOriginalClass = ( item._id === this.actor.data.data.details.originalClass );

      // Classify items into types
      if ( item.type === "spell" ) arr[1].push(item);
      else if ( item.type === "feat" ) arr[2].push(item);
      else if ( item.type === "class" ) arr[3].push(item);
      else if ( Object.keys(inventory).includes(item.type ) ) arr[0].push(item);
      else if ( item.type === "history" ) arr[4].push(item);
      else if ( item.type === "otherLearn" ) arr [5].push(item);
      else if (item.type === "prof") arr[6].push(item);
      return arr;
    }, [[], [], [], [], [], [], []]);

    // Apply active item filters
    items = this._filterItems(items, this._filters.inventory);
    spells = this._filterItems(spells, this._filters.spellbook);
    feats = this._filterItems(feats, this._filters.features);
    
    // resources
    const resources = {
      resource: { label: "SKJAALD.ItemTypeResource", items: [], dataset: {type: "consumable"} }
    };

    for( let i of items){
      if (i.type == "consumable") resources.resource.items.push(i);
    }

    // Attacks
    const attacks = {
      weapon: { label: "SKJAALD.WeaponAttacks", items: [], dataset: { type: 'weapon'}},
      spell: { label: "SKJAALD.MagicAttacks", items: [], dataset: { type: "spell"}}
    }

    for (let i of items){
      if (i.type == "weapon") attacks.weapon.items.push(i);
    }

    for (let s of spells){
      if (s.type == "spell") attacks.spell.items.push(s);
    }


    // Tool Proficient

    const toolprofs = {
      toolprofs:  { label: "SKJAALD.ItemToolProficiency", items: [], dataset: { type: "prof" } },
      langprofs:  { label: "SKJAALD.ItemLanguageProficiency", items: [], dataset: { type: "prof" } },
      weapprofs:  { label: "SKJAALD.ItemWeaponProficiency", items: [], dataset: { type: "prof" } },
      armprofs:  { label: "SKJAALD.ItemArmorProficiency", items: [], dataset: { type: "prof" } }
    }



    for (let p of prof){
      if(p.data.proficient > 0){
        if( p.data.category == "Tool") toolprofs.toolprofs.items.push(p);
        if( p.data.category == "Armor") toolprofs.armprofs.items.push(p);
        if( p.data.category == "Weapon") toolprofs.weapprofs.items.push(p);
        if( p.data.category == "Language") toolprofs.langprofs.items.push(p);
      }  
    }

    // Organize items
    for ( let i of items ) {
      i.data.quantity = i.data.quantity || 0;
      i.data.weight = i.data.weight || 0;
      i.totalWeight = (i.data.quantity * i.data.weight).toNearest(0.1);
      inventory[i.type].items.push(i);
    }

    //Learning Items

    const regularLearning = {
      skill: { label: "SKJAALD.SkillsLearning", items: [], dataset: {type: "otherLearn"}, type: otherLearn},
      weapon: { label: "SKJAALD.WeaponsLearning", items: [], dataset: {type: "prof"}, type: prof},
      armor: { label: "SKJAALD.ArmorLearning", items: [], dataset: {type: "prof"}, type: prof },
      tool: { label: "SKJAALD.ToolsLearning", items: [], dataset: {type: "prof"}, type: prof },
      language: { label: "SKJAALD.LanguagesLearning", items: [], dataset: {type: "prof"}, type: prof },
      other: { label: "SKJAALD.OtherLearning", items: [], dataset: {type: "otherLearn"}, type: otherLearn}
    }

    for (let l of otherLearn){
      if ( l.data.category == "other"){
        regularLearning.other.items.push(l);
      } else if (l.data.category == "Skill"){
        regularLearning.skill.items.push(l);
      }
    }
    for (let p of prof){
      if (p.data.learning.currently || p.data.learningNow){
        if (p.data.category == "Tool"){
          regularLearning.tool.items.push(p);
        }
        else if( p.data.category == "Armor"){
          regularLearning.armor.items.push(p);
        } else if (p.data.category == "Weapon"){
          regularLearning.weapon.items.push(p);
        } else if (p.data.category == "Language"){
          regularLearning.language.items.push(p);
        }
      }
    }


    // Organize Spellbook and count the number of prepared spells (excluding always, at will, etc...)
    const spellbook = this._prepareSpellbook(data, spells);
    const nPrepared = spells.filter(s => {
      return (s.data.level > 0) && (s.data.preparation.mode === "prepared") && s.data.preparation.prepared;
    }).length;

    //Sort Spells

    const spellCantrip = {
      cantrip: {label: "SKJAALD.Cantrips", items: [], dataset: {type: spells}},
    }
    const spellOne = {
      one: {label: "SKJAALD.One", items: [], dataset: {type: spells}},
    }
    const spellTwo = {
      two: {label: "SKJAALD.Two", items: [], dataset: {type: spells}},
    }
    const spellThree = {
      three: {label: "SKJAALD.Three", items: [], dataset: {type: spells}},
    }
    const spellFour = {
      four: {label: "SKJAALD.Four", items: [], dataset: {type: spells}},
    }
    const spellFive = {
      five: {label: "SKJAALD.Five", items: [], dataset: {type: spells}},
    }
    const spellSix = {
      six: {label: "SKJAALD.Six", items: [], dataset: {type: spells}},
    }
    const spellSeven = {
      seven: {label: "SKJAALD.Seven", items: [], dataset: {type: spells}},
    }
    const spellEight = {
      eight: {label: "SKJAALD.Eight", items: [], dataset: {type: spells}},
    }
    const spellNine = {
      nine: {label: "SKJAALD.Nine", items: [], dataset: {type: spells}}
    }
    const spellLearning = {
      learning: {label: "SKJAALD.SpellLearning", items: [], dataset: { type: spells}}
    }

    for (let s of spells){
      if (s.data.learning.currently || s.data.learningNow){
        spellLearning.learning.items.push(s);
        if ( s.data.learned.nine ) {spellNine.nine.items.push(s);}
        else if( s.data.learned.eight ) spellEight.eight.items.push(s);
        else if( s.data.learned.seven ) spellSeven.seven.items.push(s);
        else if( s.data.learned.six ) spellSix.six.items.push(s);
        else if( s.data.learned.five ) spellFive.five.items.push(s);
        else if( s.data.learned.four ) spellFour.four.items.push(s);
        else if( s.data.learned.three ) spellThree.three.items.push(s);
        else if( s.data.learned.two ) spellTwo.two.items.push(s);
        else if( s.data.learned.one ) spellOne.one.items.push(s);
        else if( s.data.learned.cantrip ) spellCantrip.cantrip.items.push(s);

      } else if ((s.data.learned.nine || s.data.learned.eight || s.data.learned.seven || s.data.learned.six || s.data.learned.five || s.data.learned.four || s.data.learned.three || s.data.learned.two || s.data.learned.one || s.data.learned.cantrip)){
        if ( s.data.learned.nine ) {spellNine.nine.items.push(s);}
        else if( s.data.learned.eight ) spellEight.eight.items.push(s);
        else if( s.data.learned.seven ) spellSeven.seven.items.push(s);
        else if( s.data.learned.six ) spellSix.six.items.push(s);
        else if( s.data.learned.five ) spellFive.five.items.push(s);
        else if( s.data.learned.four ) spellFour.four.items.push(s);
        else if( s.data.learned.three ) spellThree.three.items.push(s);
        else if( s.data.learned.two ) spellTwo.two.items.push(s);
        else if( s.data.learned.one ) spellOne.one.items.push(s);
        else if( s.data.learned.cantrip ) spellCantrip.cantrip.items.push(s);
    } else{
        if (s.labels.level == "Cantrip") spellCantrip.cantrip.items.push(s);
        else if(s.labels.level == "1st Level") spellOne.one.items.push(s);
        else if(s.labels.level == "2nd Level") spellTwo.two.items.push(s);
        else if(s.labels.level == "3rd Level") spellThree.three.items.push(s);
        else if(s.labels.level == "4th Level") spellFour.four.items.push(s);
        else if(s.labels.level == "5th Level") spellFive.five.items.push(s);
        else if(s.labels.level == "6th Level") spellSix.six.items.push(s);
        else if(s.labels.level == "7th Level") spellSeven.seven.items.push(s);
        else if(s.labels.level == "8th Level") spellEight.eight.items.push(s);
        else if(s.labels.level == "9th Level") spellNine.nine.items.push(s);
      }
    }


    // Organize Features
    const features = {
      classes: { label: "SKJAALD.ItemTypeClassPl", items: [], hasActions: false, dataset: {type: "class"}, isClass: true },
    };

    const noncomfeatures = {
      noncombat: { label: "SKJAALD.FeatureNonCombat", items: [], dataset: {type: "feat"} },
    };
    const comfeatures = {
      combat: { label: "SKJAALD.FeatureCombat", items: [], dataset: {type: "feat"} },
    };

    for ( let f of feats ) {
      if ( f.data.combatFeature && f.data.noncombatFeature == false ) comfeatures.combat.items.push(f);
      if ( f.data.noncombatFeature && f.data.combatFeature == false ) noncomfeatures.noncombat.items.push(f);
      if ( f.data.combatFeature != true && f.data.noncombatFeature != true || f.data.combatFeature && f.data.noncombatFeature) {
        comfeatures.combat.items.push(f);
        noncomfeatures.noncombat.items.push(f);
      }
    }
    classes.sort((a, b) => b.data.levels - a.data.levels);
    features.classes.items = classes;

    // History Sort

    const events = {
      events: {label: "SKJAALD.MemoryEvent", items: [], category: "event", dataset: {type: "history"}}
    };

    const allies = {
      allies: {label: "SKJAALD.Allies", items: [], category: "allies", dataset: {type: "history"}}
    };

    const notes = {
      notes: { label: "SKJAALD.Notes", items: [], category: "notes", dataset: {type: "history"} }
    };

    const backstory = {
      backstory: { label: "SKJAALD.Backstory", items: [], category: "backstory", dataset: {type: "history"}}
    };

    for ( let h of history ) {
      if (h.data.category == "event") events.events.items.push(h);
      if (h.data.category == "allies") allies.allies.items.push(h);
      if (h.data.category == "notes") notes.notes.items.push(h);
      if (h.data.category == "backstory") backstory.backstory.items.push(h);
    };


    // Assign and return
    data.inventory = Object.values(inventory);
    data.spellbook = spellbook;
    data.preparedSpells = nPrepared;
    data.classes = Object.values(features);
    data.noncomfeatures = Object.values(noncomfeatures);
    data.comfeatures = Object.values(comfeatures);
    data.resourceList = Object.values(resources);
    data.events = Object.values(events);
    data.allies = Object.values(allies);
    data.notes = Object.values(notes);
    data.backstory = Object.values(backstory);
    data.proficiencies = Object.values(toolprofs);
    data.spellCantrip = Object.values(spellCantrip);
    data.spellOne = Object.values(spellOne);
    data.spellTwo = Object.values(spellTwo);
    data.spellThree = Object.values(spellThree);
    data.spellFour = Object.values(spellFour);
    data.spellFive = Object.values(spellFive);
    data.spellSix = Object.values(spellSix);
    data.spellSeven = Object.values(spellSeven);
    data.spellEight = Object.values(spellEight);
    data.spellNine = Object.values(spellNine);
    data.spellLearningList = Object.values(spellLearning);
    data.regularLearning = Object.values(regularLearning);
    data.attacksSpellcasting = Object.values(attacks);

  }

  /* -------------------------------------------- */




  /**
   * A helper method to establish the displayed preparation state for an item.
   * @param {Item5e} item  Item being prepared for display. *Will be mutated.*
   * @private
   */
  _prepareItemToggleState(item) {
    if (item.type === "spell") {
      const isAlways = getProperty(item.data, "preparation.mode") === "always";
      const isPrepared = getProperty(item.data, "preparation.prepared");
      item.toggleClass = isPrepared ? "active" : "";
      if ( isAlways ) item.toggleClass = "fixed";
      if ( isAlways ) item.toggleTitle = CONFIG.SKJAALD.spellPreparationModes.always;
      else if ( isPrepared ) item.toggleTitle = CONFIG.SKJAALD.spellPreparationModes.prepared;
      else item.toggleTitle = game.i18n.localize("SKJAALD.SpellUnprepared");
    }
    else {
      const isActive = getProperty(item.data, "equipped");
      item.toggleClass = isActive ? "active" : "";
      item.toggleTitle = game.i18n.localize(isActive ? "SKJAALD.Equipped" : "SKJAALD.Unequipped");
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML.
   * @param {jQuery} html   The prepared HTML object ready to be rendered into the DOM.
   */
  activateListeners(html) {
    super.activateListeners(html);
    if ( !this.isEditable ) return;

    // Item State Toggling
    html.find(".item-toggle").click(this._onToggleItem.bind(this));
  

    // Short and Long Rest
    html.find(".short-rest").click(this._onShortRest.bind(this));
    html.find(".long-rest").click(this._onLongRest.bind(this));

    // Rollable sheet actions
    html.find(".rollable[data-action]").click(this._onSheetAction.bind(this));
  }

  /* -------------------------------------------- */


  /**
   * Handle mouse click events for character sheet actions.
   * @param {MouseEvent} event  The originating click event.
   * @returns {Promise}         Dialog or roll result.
   * @private
   */
  _onSheetAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "convertCurrency":
        return Dialog.confirm({
          title: `${game.i18n.localize("SKJAALD.CurrencyConvert")}`,
          content: `<p>${game.i18n.localize("SKJAALD.CurrencyConvertHint")}</p>`,
          yes: () => this.actor.convertCurrency()
        });
      case "rollDeathSave":
        return this.actor.rollDeathSave({event: event});
      case "rollInitiative":
        return this.actor.rollInitiative({createCombatants: true});
      case "rollHitDice":
        return this.actor.rollHitDie({event: event});
      case "rollLearning":
        return this.actor.rollLearning({event: event});
      case "rollSpellLearning":
        return this.actor.rollSpellLearning({event: event});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the state of an Owned Item within the Actor.
   * @param {Event} event        The triggering click event.
   * @returns {Promise<Item5e>}  Item with the updates applied.
   * @private
   */
  _onToggleItem(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    const attr = item.data.type === "spell" ? "data.preparation.prepared" : "data.equipped";
    return item.update({[attr]: !getProperty(item.data, attr)});
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @private
   */
  async _onShortRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @private
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItemCreate(itemData) {

    // Increment the number of class levels a character instead of creating a new item
    if ( itemData.type === "class" ) {
      const cls = this.actor.itemTypes.class.find(c => c.name === itemData.name);
      let priorLevel = cls?.data.data.levels ?? 0;
      if ( cls ) {
        const next = Math.min(priorLevel + 1, 20 + priorLevel - this.actor.data.data.details.level);
        if ( next > priorLevel ) {
          itemData.levels = next;
          return cls.update({"data.levels": next});
        }
      }
    }

    // Default drop handling if levels were not added
    return super._onDropItemCreate(itemData);
  }
}
