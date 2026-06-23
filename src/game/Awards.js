import { CRIT_CHANCE_CAP } from './constants.js';
import { RARITIES, UPGRADE_TEMPLATES } from './gameData.js';
import { runRandom } from '../lib/runRandom.js';

export { RARITIES, UPGRADE_TEMPLATES };

const FIXED_KEYS = new Set(['pierce', 'element', 'doubleJump', 'familiars', 'projectileCount', 'lightningChains']);

function scaleValue(key, value, mult, template) {
  if (template.fixedEffect && FIXED_KEYS.has(key)) return value;
  if (key === 'element') return value;
  if (key === 'pierce') return 1;
  if (key === 'lightningChains') return value;
  if (template.integerEffect && Number.isInteger(value)) {
    return Math.max(1, Math.ceil(value * mult));
  }
  if (Number.isInteger(value)) return Math.max(1, Math.round(value * mult));
  return value * mult;
}

export function scaleEffectForRarity(baseEffect, rarity, template) {
  const mult = RARITIES[rarity].effectMult;
  const effect = {};
  for (const [key, val] of Object.entries(baseEffect)) {
    effect[key] = scaleValue(key, val, mult, template);
  }
  return effect;
}

export function formatOfferDesc(template, effect) {
  if (effect.damageMult != null && effect.maxHpMult != null) {
    return `+${Math.round(effect.damageMult * 100)}% damage, ${Math.round(effect.maxHpMult * 100)}% max HP`;
  }
  if (effect.damageMult) return `+${Math.round(effect.damageMult * 100)}% damage`;
  if (effect.attackRateMult) return `+${Math.round(effect.attackRateMult * 100)}% attack speed`;
  if (effect.speedMult) return `+${Math.round(effect.speedMult * 100)}% move speed`;
  if (effect.maxHp) return `+${Math.round(effect.maxHp)} max HP & heal`;
  if (effect.hpRegen) return `+${effect.hpRegen.toFixed(2)} HP regen / sec`;
  if (effect.runXpMult) return `+${Math.round(effect.runXpMult * 100)}% XP gain`;
  if (effect.critChance) {
    return `+${Math.round(effect.critChance * 100)}% crit chance (max ${Math.round(CRIT_CHANCE_CAP * 100)}%)`;
  }
  if (effect.coinMult) return `+${Math.round(effect.coinMult * 100)}% coins from kills`;
  if (effect.pickupMult) return `+${Math.round(effect.pickupMult * 100)}% pickup radius`;
  if (effect.areaMult) return `+${Math.round(effect.areaMult * 100)}% blast radius`;
  if (effect.evasion) return `+${Math.round(effect.evasion * 100)}% evasion`;
  if (effect.armor) return `+${Math.round(effect.armor * 100)}% armor`;
  if (effect.jumpPeakMult) return `+${Math.round(effect.jumpPeakMult * 100)}% jump height`;
  if (effect.projectileSpeedMult) return `+${Math.round(effect.projectileSpeedMult * 100)}% projectile speed`;
  if (effect.lifesteal) return `Heal ${Math.round(effect.lifesteal * 100)}% of damage dealt`;
  if (effect.thorns) return `+${Math.round(effect.thorns)} thorn damage`;
  if (effect.healOnKill) return `${Math.round(effect.healOnKill * 100)}% chance to heal on kill`;
  if (effect.killXpMult) return `+${Math.round(effect.killXpMult * 100)}% kill XP`;
  if (effect.meleeBonus) return `+${Math.round(effect.meleeBonus * 100)}% close range damage`;
  if (effect.airDamageMult) return `+${Math.round(effect.airDamageMult * 100)}% airborne damage`;
  if (effect.critDamageMult) return `+${Math.round(effect.critDamageMult * 100)}% crit damage`;
  if (effect.bossDamageMult) return `+${Math.round(effect.bossDamageMult * 100)}% boss damage`;
  if (effect.poisonChance) return `${Math.round(effect.poisonChance * 100)}% poison on hit`;
  if (effect.explodeChance) return `${Math.round(effect.explodeChance * 100)}% explode on hit`;
  if (effect.bonkChance) return `${Math.round(effect.bonkChance * 100)}% BONK (20× damage)`;
  if (effect.critSplash) return `${Math.round(effect.critSplash * 100)}% crit splash`;
  if (effect.idleDamageMult) return `+${Math.round(effect.idleDamageMult * 100)}% damage while idle`;
  if (effect.moveAtkSpeed) return `Up to +${Math.round(effect.moveAtkSpeed * 100)}% attack speed while moving`;
  if (effect.hurtSpeedBurst) return `Speed burst after taking damage`;
  if (effect.damagePerKill) return `+${(effect.damagePerKill * 100).toFixed(2)}% damage per kill`;
  if (effect.upgradeBoost) return `Future upgrades +${Math.round(effect.upgradeBoost * 100)}% stronger`;
  if (effect.projectileCount) return `+${effect.projectileCount} projectile${effect.projectileCount > 1 ? 's' : ''}`;
  if (effect.pierce) return `Projectiles penetrate +1 enemy`;
  if (effect.doubleJump) return `+${effect.doubleJump} air jump`;
  if (effect.familiars) return `+${effect.familiars} orbiting familiar`;
  if (effect.element) return `${effect.element.charAt(0).toUpperCase() + effect.element.slice(1)} element${effect.lightningChains ? `, +${effect.lightningChains} chain jumps` : ''}`;
  if (effect.magnetRadius) return `+${effect.magnetRadius.toFixed(1)} magnet radius`;
  if (effect.fireTrail) return `Drop burning oil (+${effect.fireTrail} trail level)`;
  return template.name;
}

export function buildUpgradeOffer(template, rarity) {
  const effect = scaleEffectForRarity(template.baseEffect, rarity, template);
  return {
    templateId: template.id,
    id: `${template.id}:${rarity}`,
    name: template.name,
    icon: template.icon,
    rarity,
    effect,
    desc: formatOfferDesc(template, effect),
  };
}

export function getTemplateId(offer) {
  return offer.templateId || offer.id?.split(':')[0];
}

export function rollWeightedRarity(allowedRarities) {
  let total = 0;
  for (const r of allowedRarities) total += RARITIES[r].weight;
  let roll = runRandom() * total;
  for (const r of allowedRarities) {
    roll -= RARITIES[r].weight;
    if (roll <= 0) return r;
  }
  return allowedRarities[allowedRarities.length - 1];
}
