/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/cbrpnk/templates/actor/parts/actor-features.html",
    "systems/cbrpnk/templates/actor/parts/actor-items.html",
    "systems/cbrpnk/templates/actor/parts/actor-spells.html",
    "systems/cbrpnk/templates/actor/parts/actor-effects.html",
    "systems/cbrpnk/templates/actor/parts/actor-edit.html",
    "systems/cbrpnk/templates/actor/parts/actor-play.html",
  ]);
};
