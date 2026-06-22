import { SYNERGY_ELEMENTS, SYNERGY_NAME, SHOP_ITEMS } from './constants.js';
import { saveData } from './SaveData.js';
import {
  RARITIES,
  UPGRADE_TEMPLATES,
  buildUpgradeOffer,
  getTemplateId,
} from './Awards.js';

function fmtNum(v, decimals = 0) {
  if (decimals > 0) return Number(v).toFixed(decimals);
  return String(Math.round(v));
}

function fmtPct(v) {
  return `${Math.round(v * 100)}%`;
}

function fmtElements(elements) {
  if (!elements?.size) return 'None';
  return [...elements].map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
}

export function getUpgradePreview(player, upgrade) {
  const e = upgrade.effect;
  const lines = [];

  const add = (label, before, after, format = fmtNum) => {
    lines.push({
      label,
      before: format(before),
      after: format(after),
    });
  };

  if (e.projectileCount) {
    add('Projectiles', player.projectileCount, player.projectileCount + e.projectileCount);
  }
  if (e.pierce) {
    add('Pierce', player.projectilePierce, Math.min(5, player.projectilePierce + e.pierce));
  }
  if (e.damageMult) {
    add('Damage', player.damage, player.damage * (1 + e.damageMult), v => fmtNum(v));
  }
  if (e.attackRateMult) {
    add('Attack speed', player.attackRate, player.attackRate * (1 + e.attackRateMult), v => fmtNum(v, 1));
  }
  if (e.speedMult) {
    add('Move speed', player.speed, player.speed * (1 + e.speedMult), v => fmtNum(v, 1));
  }
  if (e.maxHp) {
    add('Max HP', player.maxHp, player.maxHp + e.maxHp);
    add('HP', player.hp, player.hp + (e.heal || e.maxHp));
  }
  if (e.pickupMult) {
    add('Pickup radius', player.pickupRadius, player.pickupRadius * (1 + e.pickupMult), v => fmtNum(v, 1));
  }
  if (e.areaMult) {
    add('Blast radius', player.area, player.area * (1 + e.areaMult), v => fmtNum(v, 2));
  }
  if (e.critChance) {
    add('Crit chance', player.critChance, player.critChance + e.critChance, fmtPct);
  }
  if (e.element) {
    const after = new Set(player.elements);
    after.add(e.element);
    add('Elements', fmtElements(player.elements), fmtElements(after), v => v);
  }
  if (e.familiars) {
    add('Familiars', player.familiars, player.familiars + e.familiars);
  }
  if (e.lifesteal) {
    add('Lifesteal', player.lifesteal, player.lifesteal + e.lifesteal, fmtPct);
  }
  if (e.thorns) {
    add('Thorns', player.thorns, player.thorns + e.thorns, v => fmtNum(v, 1));
  }
  if (e.doubleJump) {
    add('Air jumps', player.maxAirJumps, Math.min(5, player.maxAirJumps + e.doubleJump));
  }
  if (e.hpRegen) {
    add('HP regen', player.hpRegen, player.hpRegen + e.hpRegen, v => fmtNum(v, 2));
  }
  if (e.runXpMult) {
    add('XP gain', player.runXpMult, player.runXpMult + e.runXpMult, fmtPct);
  }
  if (e.killXpMult) {
    add('Kill XP', player.killXpMult, player.killXpMult + e.killXpMult, fmtPct);
  }
  if (e.coinMult) {
    add('Coin bonus', player.coinMult, player.coinMult + e.coinMult, fmtPct);
  }
  if (e.evasion) {
    add('Evasion', player.evasion, Math.min(0.75, player.evasion + e.evasion), fmtPct);
  }
  if (e.armor) {
    add('Armor', player.armor, Math.min(0.5, player.armor + e.armor), fmtPct);
  }
  if (e.jumpPeakMult) {
    add('Jump height', player.jumpPeakMult, player.jumpPeakMult + e.jumpPeakMult, fmtPct);
  }
  if (e.meleeBonus) {
    add('Melee dmg', player.meleeBonus, player.meleeBonus + e.meleeBonus, fmtPct);
  }
  if (e.airDamageMult) {
    add('Airborne dmg', player.airDamageMult, player.airDamageMult + e.airDamageMult, fmtPct);
  }
  if (e.critDamageMult) {
    add('Crit damage', player.critDamageMult, player.critDamageMult + e.critDamageMult, v => `${v.toFixed(1)}×`);
  }
  if (e.bossDamageMult) {
    add('Boss dmg', player.bossDamageMult, player.bossDamageMult + e.bossDamageMult, fmtPct);
  }
  if (e.poisonChance) {
    add('Poison chance', player.poisonChance, Math.min(1, player.poisonChance + e.poisonChance), fmtPct);
  }
  if (e.bonkChance) {
    add('Bonk chance', player.bonkChance, player.bonkChance + e.bonkChance, fmtPct);
  }
  if (e.explodeChance) {
    add('Explode chance', player.explodeChance, Math.min(1, player.explodeChance + e.explodeChance), fmtPct);
  }
  if (e.healOnKill) {
    add('Heal on kill', player.healOnKill, player.healOnKill + e.healOnKill, fmtPct);
  }
  if (e.projectileSpeedMult) {
    add('Proj speed', player.projectileSpeedMult, player.projectileSpeedMult + e.projectileSpeedMult, fmtPct);
  }
  if (e.magnetRadius) {
    add('Magnet radius', player.magnetRadius, player.magnetRadius + e.magnetRadius, v => fmtNum(v, 1));
  }
  if (e.fireTrail) {
    add('Fire trail', player.fireTrailLevel, player.fireTrailLevel + e.fireTrail);
  }
  if (e.damagePerKill) {
    add('Dmg per kill', player.killDamageBonus, Math.min(0.1, player.killDamageBonus + e.damagePerKill), fmtPct);
  }
  if (e.maxHpMult) {
    add('Max HP', player.maxHp, player.maxHp * (1 + e.maxHpMult));
  }
  if (e.upgradeBoost) {
    add('Future upgrades', player.upgradeBoost, player.upgradeBoost + e.upgradeBoost, fmtPct);
  }
  if (e.critSplash) {
    add('Crit splash', player.critSplash, player.critSplash + e.critSplash, fmtPct);
  }
  if (e.idleDamageMult) {
    add('Idle damage', player.idleDamageMult, player.idleDamageMult + e.idleDamageMult, fmtPct);
  }
  if (e.moveAtkSpeed) {
    add('Move atk spd', player.moveAtkSpeed, player.moveAtkSpeed + e.moveAtkSpeed, fmtPct);
  }
  if (e.hurtSpeedBurst) {
    add('Hurt speed', player.hurtSpeedBurst, player.hurtSpeedBurst + e.hurtSpeedBurst, fmtPct);
  }

  return lines;
}

export const LOOT_REWARD_ICONS = {
  xp: '✨',
  heal: '❤️',
  damage: '💥',
  speed: '👟',
  coins: '🪙',
  magnet: '🧲',
  crit: '🎯',
  regen: '🩹',
  armor: '🛡️',
  evasion: '💍',
  lifesteal: '🩸',
  maxhp: '❤️',
  area: '💫',
  proj: '🔫',
  xp_boost: '⌚',
};

export function getLootPreview(player, loot) {
  const lines = [];
  const add = (label, before, after, format = fmtNum) => {
    lines.push({ label, before: format(before), after: format(after) });
  };

  switch (loot.type) {
    case 'xp':
      add('XP', player.xp, player.xp + Math.floor(loot.value * player.xpMult));
      break;
    case 'heal':
      add('HP', player.hp, Math.min(player.maxHp, player.hp + loot.value));
      break;
    case 'damage':
      add('Damage', player.damage, player.damage * (1 + loot.value));
      break;
    case 'speed':
      add('Speed', player.speed, player.speed * (1 + loot.value), v => fmtNum(v, 1));
      break;
    case 'coins':
      add('Coins', 'Run', `+${loot.value}`, v => v);
      break;
    case 'magnet':
      add('Magnet', 'Off', 'Pulse', v => v);
      break;
    case 'crit':
      add('Crit chance', player.critChance, Math.min(0.75, player.critChance + loot.value), fmtPct);
      break;
    case 'regen':
      add('HP regen', player.hpRegen, player.hpRegen + loot.value, v => fmtNum(v, 2));
      break;
    case 'armor':
      add('Armor', player.armor, Math.min(0.5, player.armor + loot.value), fmtPct);
      break;
    case 'evasion':
      add('Evasion', player.evasion, Math.min(0.75, player.evasion + loot.value), fmtPct);
      break;
    case 'lifesteal':
      add('Lifesteal', player.lifesteal, player.lifesteal + loot.value, fmtPct);
      break;
    case 'maxhp':
      add('Max HP', player.maxHp, player.maxHp + loot.value);
      add('HP', player.hp, player.hp + loot.value);
      break;
    case 'area':
      add('Blast radius', player.area, player.area * (1 + loot.value), v => fmtNum(v, 2));
      break;
    case 'proj':
      add('Projectiles', player.projectileCount, player.projectileCount + loot.value);
      break;
    case 'xp_boost':
      add('XP gain', player.runXpMult, player.runXpMult + loot.value, fmtPct);
      break;
    default:
      break;
  }
  return lines;
}

export function getShrinePreview(player, sacrifice) {
  return [
    { label: 'HP', before: fmtNum(player.hp), after: fmtNum(player.hp - sacrifice) },
    { label: 'Damage', before: fmtNum(player.damage), after: fmtNum(player.damage * 1.25) },
    { label: 'Atk spd', before: fmtNum(player.attackRate, 1), after: fmtNum(player.attackRate * 1.15, 1) },
  ];
}

const ELEMENT_ICONS = {
  fire: '🔥',
  ice: '❄️',
  lightning: '⚡',
};

const SHOP_BUFF_ICONS = {
  meta_damage: '⚔️',
  meta_hp: '❤️',
  meta_speed: '👢',
  meta_xp: '📚',
  meta_start_level: '🎯',
  meta_magnet: '🧲',
};

function shopBuffAmount(item) {
  const meta = saveData.data.meta;
  const e = item.effect;
  if (e.metaDamage) return `+${Math.round(meta.damage * 100)}%`;
  if (e.metaHp) return `+${meta.hp}`;
  if (e.metaSpeed) return `+${Math.round(meta.speed * 100)}%`;
  if (e.metaXp) return `+${Math.round(meta.xp * 100)}%`;
  if (e.startLevel) return `L${1 + meta.startLevel}`;
  if (e.metaPickup) return `+${meta.pickup}`;
  return '✓';
}

/** Permanent village shop upgrades — always shown in the buff bar when owned. */
export function getMetaBuffs() {
  const purchased = new Set(saveData.data.purchasedShop);
  return SHOP_ITEMS
    .filter((item) => purchased.has(item.id))
    .map((item) => ({
      icon: SHOP_BUFF_ICONS[item.id] || '🏪',
      amount: shopBuffAmount(item),
      title: `${item.name} — ${item.desc}`,
      meta: true,
    }));
}

export function getActiveBuffs(player) {
  const metaBuffs = getMetaBuffs();
  const base = player.runBaseline;
  if (!base) return metaBuffs;

  const buffs = [];
  const add = (icon, amount, title) => buffs.push({ icon, amount, title });

  const extraProj = player.projectileCount - base.projectileCount;
  if (extraProj > 0) add('🔫', `+${extraProj}`, 'Projectiles');

  const extraPierce = player.projectilePierce - base.projectilePierce;
  if (extraPierce > 0) add('🏹', `+${extraPierce}`, 'Pierce');

  const dmgPct = Math.round((player.damage / base.damage - 1) * 100);
  if (dmgPct > 0) add('💥', `+${dmgPct}%`, 'Damage');

  const spdPct = Math.round((player.speed / base.speed - 1) * 100);
  if (spdPct > 0) add('👟', `+${spdPct}%`, 'Speed');

  const atkPct = Math.round((player.attackRate / base.attackRate - 1) * 100);
  if (atkPct > 0) add('⚡', `+${atkPct}%`, 'Attack speed');

  const hpExtra = Math.round(player.maxHp - base.maxHp);
  if (hpExtra > 0) add('❤️', `+${hpExtra}`, 'Max HP');

  const pickupPct = Math.round((player.pickupRadius / base.pickupRadius - 1) * 100);
  if (pickupPct > 0) add('🧲', `+${pickupPct}%`, 'Pickup');

  const areaPct = Math.round((player.area / base.area - 1) * 100);
  if (areaPct > 0) add('💫', `+${areaPct}%`, 'Area');

  const critPct = Math.round((player.critChance - base.critChance) * 100);
  if (critPct > 0) add('🎯', `+${critPct}%`, 'Crit');

  const critDmgPct = Math.round((player.critDamageMult / base.critDamageMult - 1) * 100);
  if (critDmgPct > 0) add('🍴', `+${critDmgPct}%`, 'Crit damage');

  const lsPct = Math.round((player.lifesteal - base.lifesteal) * 100);
  if (lsPct > 0) add('🩸', `+${lsPct}%`, 'Lifesteal');

  const thornExtra = Math.round((player.thorns - base.thorns) * 10) / 10;
  if (thornExtra > 0) add('🌵', `+${thornExtra}`, 'Thorns');

  const famExtra = player.familiars - base.familiars;
  if (famExtra > 0) add('🌀', `+${famExtra}`, 'Familiars');

  const jumpExtra = player.maxAirJumps - base.maxAirJumps;
  if (jumpExtra > 0) add('🦘', `+${jumpExtra}`, 'Air jumps');

  for (const el of player.elements) {
    if (!base.elements.has(el)) {
      add(ELEMENT_ICONS[el] || '✨', 'ON', `${el} element`);
    }
  }

  if (player.magnetActive) add('🧲', 'ON', 'Magnet pulse');

  if (player.hpRegen > 0) add('🩹', fmtNum(player.hpRegen, 1), 'HP regen');
  if (player.runXpMult > 0) add('⌚', fmtPct(player.runXpMult), 'XP gain');
  if (player.evasion > 0) add('💍', fmtPct(player.evasion), 'Evasion');
  if (player.armor > 0) add('🛡️', fmtPct(player.armor), 'Armor');
  if (player.meleeBonus > 0) add('👊', fmtPct(player.meleeBonus), 'Melee');
  if (player.airDamageMult > 0) add('🧣', fmtPct(player.airDamageMult), 'Air dmg');
  if (player.bossDamageMult > 0) add('💀', fmtPct(player.bossDamageMult), 'Boss dmg');
  if (player.poisonChance > 0) add('🧀', fmtPct(player.poisonChance), 'Poison');
  if (player.bonkChance > 0) add('🔨', fmtPct(player.bonkChance), 'Bonk');
  if (player.explodeChance > 0) add('🧆', fmtPct(player.explodeChance), 'Explode');
  if (player.killDamageBonus > 0) add('👿', fmtPct(player.killDamageBonus), 'Kill dmg');
  if (player.projectileSpeedMult > 0) add('💨', fmtPct(player.projectileSpeedMult), 'Proj speed');
  if (player.jumpPeakMult > 0) add('🪶', fmtPct(player.jumpPeakMult), 'Jump');
  if (player.fireTrailLevel > 0) add('🛢️', `L${player.fireTrailLevel}`, 'Greased Fire');
  if (player.coinMult > 0) add('🧤', fmtPct(player.coinMult), 'Coins');

  return [...metaBuffs, ...buffs];
}

export class UpgradeSystem {
  constructor() {
    this.taken = new Set();
  }

  reset() {
    this.taken = new Set();
  }

  _templateId(offerOrTemplate) {
    return getTemplateId(offerOrTemplate) || offerOrTemplate.id;
  }

  _isCapped(templateId, player) {
    if (!player) return false;
    const template = UPGRADE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return false;
    const e = template.baseEffect;
    if (templateId === 'double_jump' && player.maxAirJumps >= 5) return true;
    if (templateId === 'proj_pierce' && player.projectilePierce >= 5) return true;
    if (e.evasion && player.evasion >= 0.75) return true;
    if (e.armor && player.armor >= 0.5) return true;
    if (e.critChance && player.critChance >= 0.75) return true;
    if (e.poisonChance && player.poisonChance >= 1) return true;
    if (e.explodeChance && player.explodeChance >= 1) return true;
    if (e.damagePerKill && player.killDamageBonus >= 0.1) return true;
    return false;
  }

  _isTemplateAvailable(template, player) {
    const id = template.id;
    if (template.baseEffect.element && this.hasElement(template.baseEffect.element)) return false;
    if (id === 'fire' && this.hasElement('fire')) return false;
    if (id === 'ice' && this.hasElement('ice')) return false;
    if (id === 'lightning' && this.hasElement('lightning')) return false;
    if (this._isCapped(id, player)) return false;
    if (template.onceOnly && this.taken.has(id)) return false;
    return true;
  }

  _buildWeightedPool(player, excludeTemplates = new Set()) {
    const entries = [];
    for (const template of UPGRADE_TEMPLATES) {
      if (excludeTemplates.has(template.id)) continue;
      if (!this._isTemplateAvailable(template, player)) continue;
      for (const rarity of template.rarities) {
        entries.push({
          template,
          rarity,
          weight: RARITIES[rarity].weight,
        });
      }
    }
    return entries;
  }

  _pickWeighted(entries) {
    if (entries.length === 0) return null;
    let total = 0;
    for (const e of entries) total += e.weight;
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
  }

  getRandomChoices(count = 3, player = null) {
    const choices = [];
    const usedTemplates = new Set();
    let pool = this._buildWeightedPool(player);

    for (let i = 0; i < count && pool.length > 0; i++) {
      const available = pool.filter(e => !usedTemplates.has(e.template.id));
      const pick = this._pickWeighted(available);
      if (!pick) break;
      usedTemplates.add(pick.template.id);
      choices.push(buildUpgradeOffer(pick.template, pick.rarity));
      pool = pool.filter(e => e.template.id !== pick.template.id);
    }

    return choices;
  }

  hasElement(el) {
    return this.taken.has(el);
  }

  apply(upgrade, player) {
    const templateId = this._templateId(upgrade);
    const template = UPGRADE_TEMPLATES.find(t => t.id === templateId);
    if (template?.onceOnly) {
      this.taken.add(templateId);
    }
    if (upgrade.effect.element) this.taken.add(upgrade.effect.element);
    player.applyUpgrade(upgrade);
  }

  checkSynergy(player) {
    const hasAll = SYNERGY_ELEMENTS.every(e => player.elements.has(e));
    return hasAll;
  }

  getSynergyStatus(player) {
    return SYNERGY_ELEMENTS.map(e => player.elements.has(e));
  }
}

export { SYNERGY_NAME, RARITIES };
