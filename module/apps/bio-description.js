/**
 * A simple form to set save throw configuration for a given ability score.
 * @extends {DocumentSheet}
 * @param {Actor} actor                   The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options    Additional application configuration options.
 * @param {string} bioBox                 The Bio Box being edited
 */
 export default class ActorBioDescription extends DocumentSheet {

    constructor(actor, opts, bioBox) {
      super(actor, opts);
      this._box = bioBox;
    }
  
    /** @override */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["skjaald biography-boxes"],
        template: "systems/skjaald/templates/apps/bio-template.html",
        width: 500,
        height: "auto"
      });
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get title() {
      return `${game.i18n.format("SKJAALD.BioEditTitle", {box: CONFIG.SKJAALD.abilities[this._abilityId]})}: ${this.document.name}`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    getData(options) {
      return {
        biotype: this._box,
        ability: foundry.utils.getProperty(this.document.data._source, `data.abilities.${this._abilityId}`) || {},
        labelSaves: game.i18n.format("SKJAALD.AbilitySaveConfigure", {ability: CONFIG.SKJAALD.abilities[this._abilityId]}),
        labelChecks: game.i18n.format("SKJAALD.AbilityCheckConfigure", {ability: CONFIG.SKJAALD.abilities[this._abilityId]}),
        abilityId: this._abilityId,
        proficiencyLevels: {
          0: CONFIG.SKJAALD.proficiencyLevels[0],
          1: CONFIG.SKJAALD.proficiencyLevels[1]
        },
        bonusGlobalSave: getProperty(this.object.data._source, "data.bonuses.abilities.save"),
        bonusGlobalCheck: getProperty(this.object.data._source, "data.bonuses.abilities.check")
      };
    }
  }
  