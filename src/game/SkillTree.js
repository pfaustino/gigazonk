import { PLAYER_BASE, CRIT_CHANCE_CAP } from './constants.js';
import { SKILL_BRANCHES, SKILL_TREE } from './gameData.js';

export { SKILL_BRANCHES, SKILL_TREE };

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
 * 30-skill tree in three branches — data in data/skills.json via gameData.ts.
 * `requires`: prerequisite skill ids (each must be level ≥ 1).
 * `perLevel`: cumulative bonus per skill level, applied at run start (not shown in buff bar).
 */

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
  if (b.critChance != null) b.critChance = Math.min(CRIT_CHANCE_CAP, b.critChance);
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
