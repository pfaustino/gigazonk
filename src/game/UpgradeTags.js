/** Maps upgrade effect keys to build archetype labels for level-up cards. */
const EFFECT_TAG_MAP = {
  damageMult: 'Damage',
  attackRateMult: 'Damage',
  areaMult: 'Damage',
  meleeBonus: 'Damage',
  bossDamageMult: 'Damage',
  airDamageMult: 'Damage',
  idleDamageMult: 'Damage',
  damagePerKill: 'Damage',
  critChance: 'Crit',
  critDamageMult: 'Crit',
  critSplash: 'Crit',
  maxHp: 'Defense',
  maxHpMult: 'Defense',
  heal: 'Defense',
  hpRegen: 'Defense',
  armor: 'Defense',
  evasion: 'Defense',
  lifesteal: 'Defense',
  thorns: 'Defense',
  speedMult: 'Speed',
  moveAtkSpeed: 'Speed',
  hurtSpeedBurst: 'Speed',
  jumpPeakMult: 'Mobility',
  doubleJump: 'Mobility',
  projectileCount: 'Projectiles',
  pierce: 'Projectiles',
  projectileSpeedMult: 'Projectiles',
  fireTrail: 'Fire',
  lightningChains: 'Lightning',
  familiars: 'Summons',
  poisonChance: 'Procs',
  bonkChance: 'Procs',
  explodeChance: 'Procs',
  pickupMult: 'Utility',
  magnetRadius: 'Utility',
  coinMult: 'Utility',
  runXpMult: 'Utility',
  killXpMult: 'Utility',
  healOnKill: 'Utility',
  upgradeBoost: 'Power',
};

const TAG_ORDER = [
  'Fire', 'Ice', 'Lightning', 'Damage', 'Crit', 'Projectiles',
  'Defense', 'Speed', 'Mobility', 'Summons', 'Procs', 'Utility', 'Power',
];

export function getUpgradeTags(offer) {
  const tags = new Set();
  const effect = offer?.effect ?? {};
  for (const [key, val] of Object.entries(effect)) {
    if (key === 'element' && typeof val === 'string') {
      tags.add(val.charAt(0).toUpperCase() + val.slice(1));
      continue;
    }
    const tag = EFFECT_TAG_MAP[key];
    if (tag) tags.add(tag);
  }
  return TAG_ORDER.filter((tag) => tags.has(tag));
}

export function upgradeTagsHTML(tags) {
  if (!tags.length) return '';
  return `<div class="upgrade-tags">${tags.map((t) => `<span class="upgrade-tag">${t}</span>`).join('')}</div>`;
}
