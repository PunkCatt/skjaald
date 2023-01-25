/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {Promise}
 */
export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Shared Partials
    "systems/skjaald/templates/actors/parts/active-effects.html",

    // Actor Sheet Partials
    "systems/skjaald/templates/actors/parts/actor-traits.html",
    "systems/skjaald/templates/actors/parts/actor-inventory.html",
    "systems/skjaald/templates/actors/parts/actor-features.html",
    "systems/skjaald/templates/actors/parts/actor-spellbook.html",
    "systems/skjaald/templates/actors/parts/actor-warnings.html",
    "systems/skjaald/templates/actors/parts/core-stats.html",
    "systems/skjaald/templates/actors/parts/combat-stats.html",
    "systems/skjaald/templates/actors/parts/core-health.html",
    "systems/skjaald/templates/actors/parts/combat-health.html",
    "systems/skjaald/templates/actors/parts/core-resources.html",
    "systems/skjaald/templates/actors/parts/combat-resources.html",
    "systems/skjaald/templates/actors/parts/core-conditions.html",
    "systems/skjaald/templates/actors/parts/non-combat-features.html",
    "systems/skjaald/templates/actors/parts/actor-combat.html",
    "systems/skjaald/templates/actors/parts/actor-attributes.html",
    "systems/skjaald/templates/actors/parts/combat-spell-stats.html",
    "systems/skjaald/templates/actors/parts/combat-attacks.html",
    "systems/skjaald/templates/actors/parts/combat-features.html",
    "systems/skjaald/templates/actors/parts/actor-biography.html",
    "systems/skjaald/templates/actors/parts/actor-notes.html",
    "systems/skjaald/templates/actors/parts/actor-equipment.html",
    "systems/skjaald/templates/actors/parts/combat-attributes.html",
    "systems/skjaald/templates/actors/parts/actor-textblocks.html",
    "systems/skjaald/templates/actors/parts/actor-tool-profs.html",
    "systems/skjaald/templates/actors/parts/actor-learning.html",
    "systems/skjaald/templates/actors/parts/actor-spelllist.html",
    "systems/skjaald/templates/actors/parts/actor-spell-learning-list.html",
    "systems/skjaald/templates/actors/parts/actor-learning-list.html",
    "systems/skjaald/templates/actors/parts/classes.html",
    "systems/skjaald/templates/actors/parts/resource-list.html",
    "systems/skjaald/templates/actors/parts/template-paths.html",
    "systems/skjaald/templates/actors/parts/spell-template.html",






    

    // Item Sheet Partials
    "systems/skjaald/templates/items/parts/item-action.html",
    "systems/skjaald/templates/items/parts/item-action-weapon.html",
    "systems/skjaald/templates/items/parts/item-activation.html",
    "systems/skjaald/templates/items/parts/item-description.html",
    "systems/skjaald/templates/items/parts/item-mountable.html"
  ]);
};
