import { CRIT_CHANCE_CAP, SYNERGY_NAME } from './constants.js';

/** Short gameplay blurbs for elemental level-up offers and HUD tooltips. */
export const ELEMENT_OFFER_INFO = {
  fire: {
    name: 'Fire',
    onHit: '3s burn',
    shotLine: 'Some attacks ignite foes',
  },
  ice: {
    name: 'Ice',
    onHit: '2s slow',
    shotLine: 'Some attacks chill foes',
  },
  lightning: {
    name: 'Lightning',
    onHit: 'chains to nearby foes',
    shotLine: 'Some attacks arc between enemies',
  },
};

export function formatElementOfferDesc(effect) {
  const info = ELEMENT_OFFER_INFO[effect.element];
  if (!info) return `${effect.element} element`;
  const chainLine = effect.lightningChains ? ` +${effect.lightningChains} extra chain jumps` : '';
  return `${info.shotLine} (${info.onHit}${chainLine}). Adds ${info.name} to your shot pool — collect all three for ${SYNERGY_NAME}.`;
}

/** Human-readable description for a scaled upgrade effect (level-up cards, tooltips). */
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
  if (effect.hurtSpeedBurst) return 'Speed burst after taking damage';
  if (effect.damagePerKill) return `+${(effect.damagePerKill * 100).toFixed(2)}% damage per kill`;
  if (effect.upgradeBoost) return `Future upgrades +${Math.round(effect.upgradeBoost * 100)}% stronger`;
  if (effect.projectileCount) return `+${effect.projectileCount} projectile${effect.projectileCount > 1 ? 's' : ''}`;
  if (effect.pierce) return 'Projectiles penetrate +1 enemy';
  if (effect.doubleJump) return `+${effect.doubleJump} air jump`;
  if (effect.familiars) return `+${effect.familiars} orbiting familiar`;
  if (effect.element) return formatElementOfferDesc(effect);
  if (effect.magnetRadius) return `+${effect.magnetRadius.toFixed(1)} magnet radius`;
  if (effect.fireTrail) return `Drop burning oil (+${effect.fireTrail} trail level)`;
  return template.name;
}

export function fmtNum(v, decimals = 0) {
  if (decimals > 0) return Number(v).toFixed(decimals);
  return String(Math.round(v));
}

export function fmtPct(v) {
  return `${Math.round(v * 100)}%`;
}
