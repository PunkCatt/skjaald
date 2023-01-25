/**
 * A simple form to add Actor resources.
 * @extends {DocumentSheet}
 */
 export default class ActorResourceAdd extends DocumentSheet {

    /** @inheritdoc */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["skjaald"],
        template: "systems/skjaald/templates/apps/create-resource.html",
        width: 300,
        height: "auto"
      });
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    get title() {
      return `${game.i18n.localize("SKJAALD.ResourceAdd")}: ${this.document.name}`;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    getData(event) {
    }

    async _updateObject(event, formData) {

        const data = {
            name: formData.name,
            current: formData.current,
            max: formData.max
        };
        let currentResources = this.object.data.data.resources.other.value;
        currentResources.push(data);
        this.object.update({"data.resources.other.value": currentResources});


      }
  }