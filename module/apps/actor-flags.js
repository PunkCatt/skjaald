/**
 * An application class which provides advanced configuration for special character flags which modify an Actor
 * @implements {DocumentSheet}
 */
export default class ActorSheetFlags extends DocumentSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "actor-flags",
      classes: ["skjaald"],
      template: "systems/skjaald/templates/apps/actor-flags.html",
      width: 500,
      closeOnSubmit: true
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.localize("SKJAALD.FlagsTitle")}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = {};
    data.actor = this.object;
    data.classes = this._getClasses();
    data.flags = this._getFlags();
    data.bonuses = this._getBonuses();
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object of sorted classes.
   * @returns {object}
   * @private
   */
  _getClasses() {
    const classes = this.object.items.filter(i => i.type === "class");
    return classes.sort((a, b) => a.name.localeCompare(b.name)).reduce((obj, i) => {
      obj[i.id] = i.name;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object of flags data which groups flags by section
   * Add some additional data for rendering
   * @returns {object}
   * @private
   */
  _getFlags() {
    const flags = {};
    const baseData = this.document.toJSON();
    for ( let [k, v] of Object.entries(CONFIG.SKJAALD.characterFlags) ) {
      if ( !flags.hasOwnProperty(v.section) ) flags[v.section] = {};
      let flag = foundry.utils.deepClone(v);
      flag.type = v.type.name;
      flag.isCheckbox = v.type === Boolean;
      flag.isSelect = v.hasOwnProperty("choices");
      flag.value = getProperty(baseData.flags, `skjaald.${k}`);
      flags[v.section][`flags.skjaald.${k}`] = flag;
    }
    return flags;
  }

  /* -------------------------------------------- */

  /**
   * Get the bonuses fields and their localization strings
   * @returns {Array<object>}
   * @private
   */
  _getBonuses() {
    const bonuses = [
      {name: "data.bonuses.mwak.attack", label: "SKJAALD.BonusMWAttack"},
      {name: "data.bonuses.mwak.damage", label: "SKJAALD.BonusMWDamage"},
      {name: "data.bonuses.rwak.attack", label: "SKJAALD.BonusRWAttack"},
      {name: "data.bonuses.rwak.damage", label: "SKJAALD.BonusRWDamage"},
      {name: "data.bonuses.msak.attack", label: "SKJAALD.BonusMSAttack"},
      {name: "data.bonuses.msak.damage", label: "SKJAALD.BonusMSDamage"},
      {name: "data.bonuses.rsak.attack", label: "SKJAALD.BonusRSAttack"},
      {name: "data.bonuses.rsak.damage", label: "SKJAALD.BonusRSDamage"},
      {name: "data.bonuses.abilities.check", label: "SKJAALD.BonusAbilityCheck"},
      {name: "data.bonuses.abilities.save", label: "SKJAALD.BonusAbilitySave"},
      {name: "data.bonuses.abilities.skill", label: "SKJAALD.BonusAbilitySkill"},
      {name: "data.bonuses.spell.dc", label: "SKJAALD.BonusSpellDC"}
    ];
    for ( let b of bonuses ) {
      b.value = getProperty(this.object.data._source, b.name) || "";
    }
    return bonuses;
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const actor = this.object;
    let updateData = expandObject(formData);

    // Unset any flags which are "false"
    const flags = updateData.flags.skjaald;
    for ( let [k, v] of Object.entries(flags) ) {
      if ( [undefined, null, "", false, 0].includes(v) ) {
        delete flags[k];
        if ( hasProperty(actor.data._source.flags, `skjaald.${k}`) ) {
          flags[`-=${k}`] = null;
        }
      }
    }

    // Clear any bonuses which are whitespace only
    for ( let b of Object.values(updateData.data.bonuses ) ) {
      for ( let [k, v] of Object.entries(b) ) {
        b[k] = v.trim();
      }
    }

    // Diff the data against any applied overrides and apply
    await actor.update(updateData, {diff: false});
  }
}
