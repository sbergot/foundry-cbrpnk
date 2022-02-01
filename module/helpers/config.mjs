export const CBRPNK = {};

/**
 * The set of Ability Scores used within the sytem.
 * @type {Object}
 */
CBRPNK.approaches = function (key) {
  return `CBRPNK.Approach.${key}`
};

CBRPNK.approachesDetail = function (key) {
  return `CBRPNK.Approach.detail.${key}`
};

CBRPNK.approachesGlitch = function (key) {
  return `CBRPNK.Approach.glitch.${key}`
};

CBRPNK.skills = function (key) {
  return `CBRPNK.Skill.${key}`
};
