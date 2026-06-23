import { CRIT_CHANCE_CAP } from './constants.js';

/** Award rarity tiers — weight controls drop rate, effectMult scales bonuses. */
export const RARITIES = {
  common: { id: 'common', label: 'Common', weight: 52, effectMult: 0.55, color: '#b0b8c8' },
  rare: { id: 'rare', label: 'Rare', weight: 28, effectMult: 0.82, color: '#4da6ff' },
  epic: { id: 'epic', label: 'Epic', weight: 14, effectMult: 1.0, color: '#b56cff' },
  legendary: { id: 'legendary', label: 'Legendary', weight: 6, effectMult: 1.42, color: '#f7c948' },
};

const ALL = ['common', 'rare', 'epic', 'legendary'];
const RARE_UP = ['rare', 'epic', 'legendary'];
const EPIC_UP = ['epic', 'legendary'];
const LEGENDARY_ONLY = ['legendary'];

/** Base award templates — rarity rolled at offer time. */
export const UPGRADE_TEMPLATES = [
  { id: 'gym_sauce', name: 'Gym Sauce', icon: '💪', baseEffect: { damageMult: 0.12 }, rarities: ALL },
  { id: 'battery', name: 'Battery', icon: '🔋', baseEffect: { attackRateMult: 0.1 }, rarities: ALL },
  { id: 'turbo_socks', name: 'Turbo Socks', icon: '👟', baseEffect: { speedMult: 0.14 }, rarities: ALL },
  { id: 'oats', name: 'Oats', icon: '🥣', baseEffect: { maxHp: 22, heal: 22 }, rarities: ALL },
  { id: 'medkit', name: 'Medkit', icon: '🩹', baseEffect: { hpRegen: 0.7 }, rarities: ALL },
  { id: 'time_bracelet', name: 'Time Bracelet', icon: '⌚', baseEffect: { runXpMult: 0.1 }, rarities: ALL },
  { id: 'lucky_clover', name: 'Clover', icon: '🍀', baseEffect: { critChance: 0.07 }, rarities: ALL },
  { id: 'golden_glove', name: 'Golden Glove', icon: '🧤', baseEffect: { coinMult: 0.14 }, rarities: RARE_UP },
  { id: 'magnet_heart', name: 'Magnet Heart', icon: '🧲', baseEffect: { pickupMult: 0.45 }, rarities: RARE_UP },
  { id: 'blast_radius', name: 'Spicy Meatball', icon: '🧆', baseEffect: { areaMult: 0.18 }, rarities: RARE_UP },
  { id: 'slippery_ring', name: 'Slippery Ring', icon: '💍', baseEffect: { evasion: 0.12 }, rarities: RARE_UP },
  { id: 'spiky_shield', name: 'Spiky Shield', icon: '🛡️', baseEffect: { armor: 0.09 }, rarities: RARE_UP },
  { id: 'feathers', name: 'Feathers', icon: '🪶', baseEffect: { jumpPeakMult: 0.22 }, rarities: RARE_UP },
  { id: 'proj_velocity', name: 'Turbo Bolt', icon: '💨', baseEffect: { projectileSpeedMult: 0.14 }, rarities: RARE_UP },
  { id: 'vampiric', name: 'Leeching Crystal', icon: '🩸', baseEffect: { lifesteal: 0.05 }, rarities: RARE_UP },
  { id: 'thorn_aura', name: 'Cactus', icon: '🌵', baseEffect: { thorns: 7 }, rarities: RARE_UP },
  { id: 'borgar', name: 'Borgar', icon: '🍔', baseEffect: { healOnKill: 0.02 }, rarities: RARE_UP },
  { id: 'echo_shard', name: 'Echo Shard', icon: '💎', baseEffect: { killXpMult: 0.1 }, rarities: RARE_UP },
  { id: 'forbidden_juice', name: 'Forbidden Juice', icon: '🧃', baseEffect: { critChance: 0.09 }, rarities: EPIC_UP },
  { id: 'brass_knuckles', name: 'Brass Knuckles', icon: '👊', baseEffect: { meleeBonus: 0.22 }, rarities: EPIC_UP },
  { id: 'scarf', name: 'Scarf', icon: '🧣', baseEffect: { airDamageMult: 0.45 }, rarities: EPIC_UP },
  { id: 'giant_fork', name: 'Giant Fork', icon: '🍴', baseEffect: { critDamageMult: 0.45 }, rarities: EPIC_UP },
  { id: 'boss_buster', name: 'Boss Buster', icon: '💀', baseEffect: { bossDamageMult: 0.14 }, rarities: EPIC_UP },
  { id: 'moldy_cheese', name: 'Moldy Cheese', icon: '🧀', baseEffect: { poisonChance: 0.35 }, rarities: EPIC_UP },
  { id: 'spicy_proc', name: 'Power Gloves', icon: '🧤', baseEffect: { explodeChance: 0.22 }, rarities: EPIC_UP },
  { id: 'beer', name: 'Beer', icon: '🍺', baseEffect: { damageMult: 0.18, maxHpMult: -0.05 }, rarities: EPIC_UP },
  { id: 'sucky_magnet', name: 'Sucky Magnet', icon: '🌀', baseEffect: { magnetRadius: 2.5, magnetCooldownMult: -0.22 }, rarities: EPIC_UP },
  { id: 'turbo_skates', name: 'Turbo Skates', icon: '⛸️', baseEffect: { moveAtkSpeed: 0.35 }, rarities: EPIC_UP },
  { id: 'cowards_cloak', name: "Coward's Cloak", icon: '🧥', baseEffect: { speedMult: 0.05, hurtSpeedBurst: 0.85 }, rarities: EPIC_UP },
  { id: 'proj_count', name: 'Backpack', icon: '🎒', baseEffect: { projectileCount: 1 }, rarities: RARE_UP, integerEffect: true },
  { id: 'double_jump', name: 'Air Zonk', icon: '🦘', baseEffect: { doubleJump: 1 }, rarities: EPIC_UP, integerEffect: true },
  { id: 'familiar', name: 'Soul Orb', icon: '🌀', baseEffect: { familiars: 1 }, rarities: EPIC_UP, integerEffect: true },
  { id: 'greased_fire', name: 'Greased Fire', icon: '🛢️', baseEffect: { fireTrail: 1 }, rarities: EPIC_UP, integerEffect: true },
  { id: 'fire', name: 'Dragonfire', icon: '🔥', baseEffect: { element: 'fire' }, rarities: EPIC_UP, onceOnly: true },
  { id: 'ice', name: 'Ice Cube', icon: '❄️', baseEffect: { element: 'ice' }, rarities: EPIC_UP, onceOnly: true },
  { id: 'lightning', name: 'Lightning Orb', icon: '⚡', baseEffect: { element: 'lightning', lightningChains: 2 }, rarities: LEGENDARY_ONLY, onceOnly: true },
  { id: 'proj_pierce', name: 'Pierce Zonk', icon: '🏹', baseEffect: { pierce: 1 }, rarities: LEGENDARY_ONLY, integerEffect: true, fixedEffect: true },
  { id: 'big_bonk', name: 'Big Bonk', icon: '🔨', baseEffect: { bonkChance: 0.02 }, rarities: LEGENDARY_ONLY },
  { id: 'grandmas_tonic', name: "Grandma's Tonic", icon: '🍵', baseEffect: { critSplash: 0.45 }, rarities: LEGENDARY_ONLY },
  { id: 'idle_juice', name: 'Idle Juice', icon: '🧋', baseEffect: { idleDamageMult: 0.85 }, rarities: LEGENDARY_ONLY },
  { id: 'demonic_soul', name: 'Demonic Soul', icon: '👿', baseEffect: { damagePerKill: 0.001 }, rarities: LEGENDARY_ONLY },
  { id: 'anvil', name: 'Anvil', icon: '🔩', baseEffect: { upgradeBoost: 0.22 }, rarities: LEGENDARY_ONLY, onceOnly: true, fixedEffect: true },
];

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
  let roll = Math.random() * total;
  for (const r of allowedRarities) {
    roll -= RARITIES[r].weight;
    if (roll <= 0) return r;
  }
  return allowedRarities[allowedRarities.length - 1];
}
