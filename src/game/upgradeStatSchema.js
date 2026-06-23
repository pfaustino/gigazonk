import { CRIT_CHANCE_CAP } from './constants.js';

/** Player stat caps applied when stacking upgrade effects (see Player.applyUpgrade). */
export const UPGRADE_STAT_CAPS = {
  projectilePierce: 5,
  maxAirJumps: 5,
  evasion: 0.75,
  armor: 0.5,
  critChance: CRIT_CHANCE_CAP,
  poisonChance: 1,
  explodeChance: 1,
  killDamageBonus: 0.1,
};

/** Maps upgrade baseEffect keys to player fields for cap checks. */
export const UPGRADE_EFFECT_TO_PLAYER = {
  pierce: 'projectilePierce',
  doubleJump: 'maxAirJumps',
  evasion: 'evasion',
  armor: 'armor',
  critChance: 'critChance',
  poisonChance: 'poisonChance',
  explodeChance: 'explodeChance',
  damagePerKill: 'killDamageBonus',
};

/** Effect keys that ignore rarity multiplier scaling (see UpgradeOffers.scaleEffectForRarity). */
export const RARITY_FIXED_EFFECT_KEYS = new Set([
  'pierce',
  'element',
  'doubleJump',
  'familiars',
  'projectileCount',
  'lightningChains',
]);

export function isUpgradeTemplateCapped(_templateId, baseEffect, player) {
  if (!player || !baseEffect) return false;
  for (const [effectKey, playerKey] of Object.entries(UPGRADE_EFFECT_TO_PLAYER)) {
    if (baseEffect[effectKey] == null) continue;
    const cap = UPGRADE_STAT_CAPS[playerKey];
    if (cap != null && player[playerKey] >= cap) return true;
  }
  return false;
}
