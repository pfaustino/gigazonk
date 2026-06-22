import { PLAYER_BASE } from './constants.js';

export const SKILL_MAX_LEVEL = 10;

/** Legacy shop id → skill id for save migration. */
export const SHOP_TO_SKILL_MIGRATION = {
  meta_damage: 'raw_power',
  meta_hp: 'thick_skin',
  meta_speed: 'quickstep',
  meta_xp: 'scholar',
  meta_start_level: 'head_start',
  meta_magnet: 'magnetize',
};

/**
 * 30-skill tree in three branches. Each skill upgrades up to 10 times with coins.
 * `requires`: prerequisite skill ids (each must be level ≥ 1).
 * `perLevel`: cumulative bonus per skill level, applied at run start (not shown in buff bar).
 */
export const SKILL_BRANCHES = [
  { id: 'strike', name: 'Strike', icon: '⚔️', color: '#f7c948' },
  { id: 'endure', name: 'Endure', icon: '🛡️', color: '#6b9fff' },
  { id: 'cunning', name: 'Cunning', icon: '📚', color: '#b56cff' },
];

export const SKILL_TREE = [
  // —— Strike ——
  { id: 'raw_power', name: 'Raw Power', icon: '💪', branch: 'strike', tier: 0,
    desc: '+3% base damage per level', requires: [],
    baseCost: 35, costStep: 18, perLevel: { damageMult: 0.03 } },
  { id: 'swift_strikes', name: 'Swift Strikes', icon: '⚡', branch: 'strike', tier: 1,
    desc: '+4% attack speed per level', requires: ['raw_power'],
    baseCost: 40, costStep: 20, perLevel: { attackRateMult: 0.04 } },
  { id: 'keen_edge', name: 'Keen Edge', icon: '🎯', branch: 'strike', tier: 1,
    desc: '+2% crit chance per level', requires: ['raw_power'],
    baseCost: 45, costStep: 22, perLevel: { critChance: 0.02 } },
  { id: 'deep_cuts', name: 'Deep Cuts', icon: '🍴', branch: 'strike', tier: 2,
    desc: '+4% crit damage per level', requires: ['keen_edge'],
    baseCost: 50, costStep: 24, perLevel: { critDamageMult: 0.04 } },
  { id: 'pierce_drill', name: 'Pierce Drill', icon: '🏹', branch: 'strike', tier: 2,
    desc: '+0.08 pierce per level', requires: ['swift_strikes'],
    baseCost: 55, costStep: 26, perLevel: { pierce: 0.08 } },
  { id: 'multishot', name: 'Multishot', icon: '🔫', branch: 'strike', tier: 3,
    desc: '+0.1 projectiles per level', requires: ['pierce_drill'],
    baseCost: 60, costStep: 28, perLevel: { projectileCount: 0.1 } },
  { id: 'blast_wave', name: 'Blast Wave', icon: '💫', branch: 'strike', tier: 4,
    desc: '+4% blast area per level', requires: ['multishot'],
    baseCost: 70, costStep: 32, perLevel: { areaMult: 0.04 } },
  { id: 'boss_breaker', name: 'Boss Breaker', icon: '💀', branch: 'strike', tier: 3,
    desc: '+3% boss damage per level', requires: ['deep_cuts'],
    baseCost: 65, costStep: 30, perLevel: { bossDamageMult: 0.03 } },
  { id: 'slaughter', name: 'Slaughter', icon: '👿', branch: 'strike', tier: 4,
    desc: '+0.2% kill damage per level', requires: ['boss_breaker'],
    baseCost: 75, costStep: 34, perLevel: { damagePerKill: 0.002 } },
  { id: 'weapon_master', name: 'Weapon Master', icon: '⚔️', branch: 'strike', tier: 5,
    desc: '+4% damage per level', requires: ['blast_wave', 'slaughter'],
    baseCost: 90, costStep: 40, perLevel: { damageMult: 0.04 } },

  // —— Endure ——
  { id: 'thick_skin', name: 'Thick Skin', icon: '❤️', branch: 'endure', tier: 0,
    desc: '+8 max HP per level', requires: [],
    baseCost: 35, costStep: 18, perLevel: { maxHp: 8 } },
  { id: 'recovery', name: 'Recovery', icon: '🩹', branch: 'endure', tier: 1,
    desc: '+0.12 HP regen per level', requires: ['thick_skin'],
    baseCost: 40, costStep: 20, perLevel: { hpRegen: 0.12 } },
  { id: 'plate_armor', name: 'Plate Armor', icon: '🛡️', branch: 'endure', tier: 1,
    desc: '+2% armor per level', requires: ['thick_skin'],
    baseCost: 42, costStep: 21, perLevel: { armor: 0.02 } },
  { id: 'slip_away', name: 'Slip Away', icon: '💍', branch: 'endure', tier: 2,
    desc: '+2% evasion per level', requires: ['plate_armor'],
    baseCost: 48, costStep: 24, perLevel: { evasion: 0.02 } },
  { id: 'spike_aura', name: 'Spike Aura', icon: '🌵', branch: 'endure', tier: 2,
    desc: '+1.2 thorns per level', requires: ['recovery'],
    baseCost: 50, costStep: 25, perLevel: { thorns: 1.2 } },
  { id: 'life_drain', name: 'Life Drain', icon: '🩸', branch: 'endure', tier: 3,
    desc: '+1% lifesteal per level', requires: ['spike_aura'],
    baseCost: 58, costStep: 28, perLevel: { lifesteal: 0.01 } },
  { id: 'endurance', name: 'Endurance', icon: '💪', branch: 'endure', tier: 3,
    desc: '+10 max HP per level', requires: ['slip_away'],
    baseCost: 55, costStep: 27, perLevel: { maxHp: 10 } },
  { id: 'stoneform', name: 'Stoneform', icon: '🪨', branch: 'endure', tier: 4,
    desc: '+2% max HP per level', requires: ['endurance'],
    baseCost: 68, costStep: 32, perLevel: { maxHpMult: 0.02 } },
  { id: 'soul_eater', name: 'Soul Eater', icon: '👻', branch: 'endure', tier: 4,
    desc: '+1% heal-on-kill per level', requires: ['life_drain'],
    baseCost: 72, costStep: 34, perLevel: { healOnKill: 0.01 } },
  { id: 'unyielding', name: 'Unyielding', icon: '🏰', branch: 'endure', tier: 5,
    desc: '+8 HP & +2% armor per level', requires: ['stoneform', 'soul_eater'],
    baseCost: 95, costStep: 42, perLevel: { maxHp: 8, armor: 0.02 } },

  // —— Cunning ——
  { id: 'scholar', name: 'Scholar', icon: '📚', branch: 'cunning', tier: 0,
    desc: '+8% XP gain per level', requires: [],
    baseCost: 40, costStep: 20, perLevel: { xpMult: 0.08 } },
  { id: 'magnetize', name: 'Magnetize', icon: '🧲', branch: 'cunning', tier: 1,
    desc: '+1.5 pickup radius per level', requires: ['scholar'],
    baseCost: 38, costStep: 19, perLevel: { pickup: 1.5 } },
  { id: 'combo_training', name: 'Combo Training', icon: '🔥', branch: 'cunning', tier: 1,
    desc: '+4% combo bonus per level', requires: ['scholar'],
    baseCost: 44, costStep: 22, perLevel: { comboMultBonus: 0.04 } },
  { id: 'lucky_paws', name: 'Lucky Paws', icon: '🪙', branch: 'cunning', tier: 2,
    desc: '+3% coin bonus per level', requires: ['magnetize'],
    baseCost: 48, costStep: 24, perLevel: { coinMult: 0.03 } },
  { id: 'quickstep', name: 'Quickstep', icon: '👟', branch: 'cunning', tier: 2,
    desc: '+3% move speed per level', requires: ['magnetize'],
    baseCost: 45, costStep: 23, perLevel: { speedMult: 0.03 } },
  { id: 'marathon', name: 'Marathon', icon: '🏃', branch: 'cunning', tier: 3,
    desc: '+2% move speed per level', requires: ['quickstep'],
    baseCost: 52, costStep: 26, perLevel: { speedMult: 0.02 } },
  { id: 'head_start', name: 'Head Start', icon: '🎯', branch: 'cunning', tier: 2,
    desc: '+0.1 starting levels per level', requires: ['combo_training'],
    baseCost: 80, costStep: 40, perLevel: { startLevel: 0.1 } },
  { id: 'sage', name: 'Sage', icon: '🦉', branch: 'cunning', tier: 3,
    desc: '+5% XP gain per level', requires: ['combo_training'],
    baseCost: 55, costStep: 28, perLevel: { xpMult: 0.05 } },
  { id: 'gold_rush', name: 'Gold Rush', icon: '💰', branch: 'cunning', tier: 3,
    desc: '+4% coin bonus per level', requires: ['lucky_paws'],
    baseCost: 58, costStep: 29, perLevel: { coinMult: 0.04 } },
  { id: 'legend', name: 'Zonker Legend', icon: '👑', branch: 'cunning', tier: 5,
    desc: '+6% XP & +3% coins per level', requires: ['sage', 'gold_rush'],
    baseCost: 100, costStep: 45, perLevel: { xpMult: 0.06, coinMult: 0.03 } },
];

const SKILL_BY_ID = Object.fromEntries(SKILL_TREE.map((s) => [s.id, s]));

export function getSkillById(id) {
  return SKILL_BY_ID[id];
}

export function getSkillsForBranch(branchId) {
  return SKILL_TREE.filter((s) => s.branch === branchId)
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

export function getSkillUpgradeCost(skill, currentLevel) {
  if (currentLevel >= SKILL_MAX_LEVEL) return null;
  return skill.baseCost + skill.costStep * currentLevel;
}

export function isSkillUnlocked(skill, skillLevels) {
  if (!skill.requires?.length) return true;
  return skill.requires.every((reqId) => (skillLevels[reqId] ?? 0) >= 1);
}

export function computeSkillBonuses(skillLevels = {}) {
  const b = {};
  for (const skill of SKILL_TREE) {
    const lv = skillLevels[skill.id] ?? 0;
    if (lv <= 0) continue;
    for (const [key, perLevel] of Object.entries(skill.perLevel)) {
      b[key] = (b[key] ?? 0) + perLevel * lv;
    }
  }
  if (b.pierce != null) b.pierce = Math.min(5, b.pierce);
  if (b.critChance != null) b.critChance = Math.min(0.75, b.critChance);
  if (b.evasion != null) b.evasion = Math.min(0.75, b.evasion);
  if (b.armor != null) b.armor = Math.min(0.5, b.armor);
  if (b.lifesteal != null) b.lifesteal = Math.min(0.5, b.lifesteal);
  if (b.healOnKill != null) b.healOnKill = Math.min(0.5, b.healOnKill);
  if (b.damagePerKill != null) b.damagePerKill = Math.min(0.01, b.damagePerKill);
  if (b.startLevel != null) b.startLevel = Math.floor(b.startLevel);
  if (b.projectileCount != null) b.projectileCount = Math.floor(b.projectileCount);
  return b;
}

/** Apply permanent skill bonuses onto a freshly reset player (before run baseline capture). */
export function applySkillBonusesToPlayer(player, charMods, skillLevels) {
  const b = computeSkillBonuses(skillLevels);
  const m = charMods || {};

  player.maxHp = (PLAYER_BASE.maxHp + (b.maxHp ?? 0)) * (m.hpMult || 1) * (1 + (b.maxHpMult ?? 0));
  player.hp = player.maxHp;
  player.speed = PLAYER_BASE.speed * (1 + (b.speedMult ?? 0)) * (m.speedMult || 1);
  player.damage = PLAYER_BASE.damage * (1 + (b.damageMult ?? 0)) * (m.damageMult || 1);
  player.attackRate = PLAYER_BASE.attackRate * (1 + (b.attackRateMult ?? 0)) * (m.attackRateMult || 1);
  player.projectileCount = PLAYER_BASE.projectileCount + (m.projectileCount || 0) + (b.projectileCount ?? 0);
  player.projectilePierce = PLAYER_BASE.projectilePierce + (b.pierce ?? 0);
  player.pickupRadius = PLAYER_BASE.pickupRadius + (b.pickup ?? 0);
  player.critChance = PLAYER_BASE.critChance + (m.critChance || 0) + (b.critChance ?? 0);
  player.critDamageMult = PLAYER_BASE.critDamageMult + (b.critDamageMult ?? 0);
  player.area = PLAYER_BASE.area * (1 + (b.areaMult ?? 0));
  player.lifesteal = (m.lifesteal || 0) + (b.lifesteal ?? 0);
  player.thorns = (m.thorns || 0) + (b.thorns ?? 0);
  player.hpRegen = b.hpRegen ?? 0;
  player.coinMult = b.coinMult ?? 0;
  player.evasion = b.evasion ?? 0;
  player.armor = b.armor ?? 0;
  player.bossDamageMult = b.bossDamageMult ?? 0;
  player.damagePerKill = b.damagePerKill ?? 0;
  player.healOnKill = b.healOnKill ?? 0;
  player.comboMultBonus = (m.comboMult || 1) + (b.comboMultBonus ?? 0);
  player.level = 1 + (b.startLevel ?? 0);
  player._skillXpMult = b.xpMult ?? 0;
}

export function migrateSkillLevels(parsed) {
  const levels = { ...(parsed.skillLevels ?? {}) };
  const legacy = parsed.shopLevels ?? {};
  for (const [oldId, lv] of Object.entries(legacy)) {
    const newId = SHOP_TO_SKILL_MIGRATION[oldId];
    if (newId && lv > (levels[newId] ?? 0)) levels[newId] = lv;
  }
  for (const [oldId, newId] of Object.entries(SHOP_TO_SKILL_MIGRATION)) {
    if (legacy[oldId] && !levels[newId]) levels[newId] = legacy[oldId];
  }
  return levels;
}
