import { SYNERGY_ELEMENTS, SYNERGY_NAME, CRIT_CHANCE_CAP } from './constants.js';
import { fmtNum, fmtPct } from './UpgradeText.js';
import {
  RARITIES,
  UPGRADE_TEMPLATES,
  buildUpgradeOffer,
  getTemplateId,
} from './Awards.js';
import { runRandom } from '../lib/runRandom.js';
import { assert } from '../lib/assert.js';

/** Run bonus vs baseline — matches buff bar chips (e.g. +32%). */
function fmtRunMultBonus(value, baselineValue) {
  if (baselineValue == null || baselineValue === 0) return fmtNum(value);
  const pct = Math.round((value / baselineValue - 1) * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return '0%';
}

function addRunMultPreview(lines, label, current, after, baselineValue) {
  lines.push({
    label,
    before: fmtRunMultBonus(current, baselineValue),
    after: fmtRunMultBonus(after, baselineValue),
  });
}

function fmtElements(elements) {
  if (!elements?.size) return 'None';
  return [...elements].map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
}

export function getUpgradePreview(player, upgrade) {
  const e = upgrade?.effect ?? {};
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
    const base = player.runBaseline?.damage ?? player.damage;
    addRunMultPreview(lines, 'Damage', player.damage, player.damage * (1 + e.damageMult), base);
  }
  if (e.attackRateMult) {
    const base = player.runBaseline?.attackRate ?? player.attackRate;
    addRunMultPreview(lines, 'Attack speed', player.attackRate, player.attackRate * (1 + e.attackRateMult), base);
  }
  if (e.speedMult) {
    const base = player.runBaseline?.speed ?? player.speed;
    addRunMultPreview(lines, 'Move speed', player.speed, player.speed * (1 + e.speedMult), base);
  }
  if (e.maxHp) {
    add('Max HP', player.maxHp, player.maxHp + e.maxHp);
    add('HP', player.hp, player.hp + (e.heal || e.maxHp));
  }
  if (e.pickupMult) {
    const base = player.runBaseline?.pickupRadius ?? player.pickupRadius;
    addRunMultPreview(lines, 'Pickup radius', player.pickupRadius, player.pickupRadius * (1 + e.pickupMult), base);
  }
  if (e.areaMult) {
    const base = player.runBaseline?.area ?? player.area;
    addRunMultPreview(lines, 'Blast radius', player.area, player.area * (1 + e.areaMult), base);
  }
  if (e.critChance) {
    const boost = 1 + (player.upgradeBoost ?? 0);
    add(
      'Crit chance',
      player.critChance,
      Math.min(CRIT_CHANCE_CAP, player.critChance + e.critChance * boost),
      fmtPct
    );
  }
  if (e.element) {
    const after = new Set(player.elements);
    after.add(e.element);
    add('Elements', fmtElements(player.elements), fmtElements(after), v => v);
  }
  if (e.lightningChains) {
    add('Lightning chains', player.lightningChains, player.lightningChains + e.lightningChains);
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
    add('Close range dmg', player.meleeBonus, player.meleeBonus + e.meleeBonus, fmtPct);
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
    const base = player.runBaseline?.maxHp ?? player.maxHp;
    addRunMultPreview(lines, 'Max HP', player.maxHp, player.maxHp * (1 + e.maxHpMult), base);
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

  return sortPreviewLines(lines);
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
    case 'damage': {
      const base = player.runBaseline?.damage ?? player.damage;
      addRunMultPreview(lines, 'Damage', player.damage, player.damage * (1 + loot.value), base);
      break;
    }
    case 'speed': {
      const base = player.runBaseline?.speed ?? player.speed;
      addRunMultPreview(lines, 'Speed', player.speed, player.speed * (1 + loot.value), base);
      break;
    }
    case 'coins':
      add('Coins', 'Run', `+${loot.value}`, v => v);
      break;
    case 'magnet':
      add('Magnet', 'Off', 'Pulse', v => v);
      break;
    case 'crit':
      add('Crit chance', player.critChance, Math.min(CRIT_CHANCE_CAP, player.critChance + loot.value), fmtPct);
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
    case 'area': {
      const base = player.runBaseline?.area ?? player.area;
      addRunMultPreview(lines, 'Blast radius', player.area, player.area * (1 + loot.value), base);
      break;
    }
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

const ELEMENT_NAMES = {
  fire: 'Fire',
  ice: 'Ice',
  lightning: 'Lightning',
};

export function formatBuffTooltip(buff) {
  const title = String(buff.title ?? '').trim();
  const amount = String(buff.amount ?? '').trim();
  if (!title) return amount || 'Unknown buff';
  if (!amount || amount === 'ON') return title;
  return `${title} (${amount})`;
}

const STAT_LABEL_TO_BUFF_ID = {
  Projectiles: 'extraProjectiles',
  Pierce: 'pierce',
  Damage: 'damage',
  'Attack speed': 'attackSpeed',
  'Move speed': 'moveSpeed',
  'Max HP': 'maxHp',
  'Pickup radius': 'pickupRadius',
  'Blast radius': 'blastRadius',
  'Crit chance': 'critChance',
  'Crit damage': 'critDamage',
  'Lightning chains': 'lightningChains',
  Familiars: 'familiars',
  Lifesteal: 'lifesteal',
  Thorns: 'thorns',
  'Air jumps': 'airJumps',
  'HP regen': 'hpRegen',
  'XP gain': 'xpGain',
  'Coin bonus': 'coinBonus',
  Evasion: 'evasion',
  Armor: 'armor',
  'Jump height': 'jumpHeight',
  'Close range dmg': 'meleeDamage',
  'Airborne dmg': 'airborneDamage',
  'Boss dmg': 'bossDamage',
  'Poison chance': 'poisonChance',
  'Bonk chance': 'bonkChance',
  'Explode chance': 'explodeChance',
  'Proj speed': 'projectileSpeed',
  'Fire trail': 'greasedFire',
  'Dmg per kill': 'killDamageBonus',
  'Kill XP': 'killXp',
  'Heal on kill': 'healOnKill',
  'Magnet radius': 'magnetRadius',
  'Future upgrades': 'upgradeBoost',
  'Crit splash': 'critSplash',
  'Idle damage': 'idleDamage',
  'Move atk spd': 'moveAtkSpeed',
  'Hurt speed': 'hurtSpeedBurst',
  Speed: 'moveSpeed',
  Magnet: 'magnetPulse',
};

const ELEMENT_NAME_TO_ID = {
  Fire: 'fire',
  Ice: 'ice',
  Lightning: 'lightning',
};

const BUFF_ID_DISPLAY = {
  extraProjectiles: { icon: '🔫', title: 'Extra projectiles' },
  pierce: { icon: '🏹', title: 'Pierce' },
  damage: { icon: '💥', title: 'Damage' },
  moveSpeed: { icon: '👟', title: 'Move speed' },
  attackSpeed: { icon: '⚡', title: 'Attack speed' },
  maxHp: { icon: '❤️', title: 'Max HP' },
  pickupRadius: { icon: '🧲', title: 'Pickup radius' },
  blastRadius: { icon: '💫', title: 'Blast radius' },
  critChance: { icon: '🎯', title: 'Crit chance' },
  critDamage: { icon: '🍴', title: 'Crit damage' },
  lifesteal: { icon: '🩸', title: 'Lifesteal' },
  thorns: { icon: '🌵', title: 'Thorns' },
  familiars: { icon: '🌀', title: 'Familiars' },
  airJumps: { icon: '🦘', title: 'Air jumps' },
  'element-fire': { icon: '🔥', title: 'Fire element' },
  'element-ice': { icon: '❄️', title: 'Ice element' },
  'element-lightning': { icon: '⚡', title: 'Lightning element' },
  lightningChains: { icon: '⚡', title: 'Lightning chains' },
  magnetPulse: { icon: '🧲', title: 'Magnet pulse' },
  hpRegen: { icon: '🩹', title: 'HP regen' },
  xpGain: { icon: '⌚', title: 'XP gain' },
  evasion: { icon: '💍', title: 'Evasion' },
  armor: { icon: '🛡️', title: 'Armor' },
  meleeDamage: { icon: '👊', title: 'Close range damage' },
  airborneDamage: { icon: '🧣', title: 'Airborne damage' },
  bossDamage: { icon: '💀', title: 'Boss damage' },
  poisonChance: { icon: '🧀', title: 'Poison chance' },
  bonkChance: { icon: '🔨', title: 'Bonk chance' },
  explodeChance: { icon: '🧆', title: 'Explode chance' },
  killDamageBonus: { icon: '👿', title: 'Kill damage bonus' },
  projectileSpeed: { icon: '💨', title: 'Projectile speed' },
  jumpHeight: { icon: '🪶', title: 'Jump height' },
  greasedFire: { icon: '🛢️', title: 'Greased Fire' },
  coinBonus: { icon: '🧤', title: 'Coin bonus' },
  killXp: { icon: '📖', title: 'Kill XP' },
  healOnKill: { icon: '💚', title: 'Heal on kill' },
  magnetRadius: { icon: '🛰️', title: 'Magnet radius' },
  upgradeBoost: { icon: '📈', title: 'Future upgrades' },
  critSplash: { icon: '💢', title: 'Crit splash' },
  idleDamage: { icon: '🧘', title: 'Idle damage' },
  moveAtkSpeed: { icon: '🏃', title: 'Move attack speed' },
  hurtSpeedBurst: { icon: '😤', title: 'Hurt speed burst' },
};

/** Canonical left-to-right order for buff bar chips (HUD + level-up). */
const BUFF_DISPLAY_ORDER = [
  'extraProjectiles',
  'pierce',
  'damage',
  'moveSpeed',
  'attackSpeed',
  'maxHp',
  'pickupRadius',
  'blastRadius',
  'critChance',
  'critDamage',
  'lifesteal',
  'thorns',
  'familiars',
  'airJumps',
  'element-fire',
  'element-ice',
  'element-lightning',
  'lightningChains',
  'magnetPulse',
  'hpRegen',
  'xpGain',
  'evasion',
  'armor',
  'meleeDamage',
  'airborneDamage',
  'bossDamage',
  'poisonChance',
  'bonkChance',
  'explodeChance',
  'killDamageBonus',
  'projectileSpeed',
  'jumpHeight',
  'greasedFire',
  'coinBonus',
  'killXp',
  'healOnKill',
  'magnetRadius',
  'upgradeBoost',
  'critSplash',
  'idleDamage',
  'moveAtkSpeed',
  'hurtSpeedBurst',
];

export function buffDisplayRank(id) {
  const idx = BUFF_DISPLAY_ORDER.indexOf(id);
  return idx >= 0 ? idx : 9999;
}

export function sortByBuffDisplayOrder(items, getId = (item) => item.id) {
  return [...items].sort((a, b) => {
    const idA = getId(a);
    const idB = getId(b);
    const rankA = buffDisplayRank(idA);
    const rankB = buffDisplayRank(idB);
    if (rankA !== rankB) return rankA - rankB;
    return String(idA).localeCompare(String(idB));
  });
}

function previewRowRank(row) {
  const ids = getBuffIdsForPreviewRow(row);
  if (ids.length) return buffDisplayRank(ids[0]);
  if (row.label === 'HP') return buffDisplayRank('maxHp') + 0.5;
  return 9999;
}

function sortPreviewLines(lines) {
  return [...lines].sort((a, b) => {
    const rankA = previewRowRank(a);
    const rankB = previewRowRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return a.label.localeCompare(b.label);
  });
}

function getBuffIdsForPreviewRow(row) {
  const ids = [];
  const push = (id) => {
    if (id && !ids.includes(id)) ids.push(id);
  };

  if (row.label === 'Elements') {
    const before = new Set(
      row.before === 'None' ? [] : String(row.before).split(', ').filter(Boolean)
    );
    const after = row.after === 'None' ? [] : String(row.after).split(', ').filter(Boolean);
    for (const name of after) {
      const el = ELEMENT_NAME_TO_ID[name];
      if (el && !before.has(name)) push(`element-${el}`);
    }
    return ids;
  }
  if (row.label === 'HP') return ids;
  push(STAT_LABEL_TO_BUFF_ID[row.label]);
  return ids;
}

export function getUpgradeBuffHighlights(player, upgrade) {
  const preview = getUpgradePreview(player, upgrade);
  const projectedBuffs = new Map(
    getActiveBuffs(player.previewAfterUpgrade(upgrade)).map((b) => [b.id, b])
  );
  const active = new Map(getActiveBuffs(player).map((b) => [b.id, b]));
  const highlights = [];
  const seen = new Set();

  for (const row of preview) {
    for (const id of getBuffIdsForPreviewRow(row)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const existing = active.get(id);
      const projected = projectedBuffs.get(id);
      const meta = BUFF_ID_DISPLAY[id] ?? { icon: '✨', title: row.label };
      const beforeNum = Number(row.before);
      const afterNum = Number(row.after);
      const isDebuff = !Number.isNaN(beforeNum) && !Number.isNaN(afterNum) && afterNum < beforeNum;
      highlights.push({
        id,
        isNew: !existing && !!projected,
        isDebuff: projected?.debuff ?? isDebuff,
        icon: projected?.icon ?? existing?.icon ?? (isDebuff ? '💔' : meta.icon),
        title: projected?.title ?? existing?.title ?? meta.title,
        amount: projected?.amount ?? row.after,
        previewAmount: projected?.amount ?? null,
        previewLabel: row.label === 'Elements' ? null : row.after,
        delta: `${row.before} → ${row.after}`,
      });
    }
  }

  return sortByBuffDisplayOrder(highlights);
}

export function getBuffTargetsFromStats(stats = []) {
  const ids = [];
  for (const row of stats) {
    for (const id of getBuffIdsForPreviewRow(row)) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

export function getActiveBuffs(player) {
  const base = player.runBaseline;
  if (!base) return [];

  const buffs = [];
  const add = (icon, amount, title, id, debuff = false) => buffs.push({ icon, amount, title, id, debuff });

  const extraProj = Math.round(player.projectileCount) - Math.round(base.projectileCount);
  if (extraProj > 0) add('🔫', `+${extraProj}`, 'Extra projectiles', 'extraProjectiles');

  const extraPierce = Math.round(player.projectilePierce) - Math.round(base.projectilePierce);
  if (extraPierce > 0) add('🏹', `+${extraPierce}`, 'Pierce', 'pierce');

  const dmgPct = Math.round((player.damage / base.damage - 1) * 100);
  if (dmgPct > 0) add('💥', `+${dmgPct}%`, 'Damage', 'damage');

  const spdPct = Math.round((player.speed / base.speed - 1) * 100);
  if (spdPct > 0) add('👟', `+${spdPct}%`, 'Move speed', 'moveSpeed');

  const atkPct = Math.round((player.attackRate / base.attackRate - 1) * 100);
  if (atkPct > 0) add('⚡', `+${atkPct}%`, 'Attack speed', 'attackSpeed');

  const hpExtra = Math.round(player.maxHp - base.maxHp);
  const hpPct = Math.round((player.maxHp / base.maxHp - 1) * 100);
  if (hpExtra > 0) add('❤️', `+${hpExtra}`, 'Max HP', 'maxHp');
  else if (hpExtra < 0) add('💔', `${hpPct}%`, 'Max HP', 'maxHp', true);

  const pickupPct = Math.round((player.pickupRadius / base.pickupRadius - 1) * 100);
  if (pickupPct > 0) add('🧲', `+${pickupPct}%`, 'Pickup radius', 'pickupRadius');

  const areaPct = Math.round((player.area / base.area - 1) * 100);
  if (areaPct > 0) add('💫', `+${areaPct}%`, 'Blast radius', 'blastRadius');

  const critRunGain = player.critChance - base.critChance;
  if (critRunGain > 0.0001) {
    const atCap = player.critChance >= CRIT_CHANCE_CAP - 0.0001;
    const total = Math.round(player.critChance * 100);
    add('🎯', `${total}%`, atCap ? 'Crit chance (max)' : 'Crit chance', 'critChance');
  }

  const critDmgBonus = Math.round((player.critDamageMult - base.critDamageMult) * 10) / 10;
  if (critDmgBonus > 0) {
    add('🍴', `+${critDmgBonus.toFixed(1)}×`, 'Crit damage', 'critDamage');
  }

  const lsPct = Math.round((player.lifesteal - base.lifesteal) * 100);
  if (lsPct > 0) add('🩸', `+${lsPct}%`, 'Lifesteal', 'lifesteal');

  const thornExtra = Math.round((player.thorns - base.thorns) * 10) / 10;
  if (thornExtra > 0) add('🌵', `+${thornExtra}`, 'Thorns', 'thorns');

  const famExtra = Math.round(player.familiars) - Math.round(base.familiars);
  if (famExtra > 0) add('🌀', `+${famExtra}`, 'Familiars', 'familiars');

  const jumpExtra = Math.round(player.maxAirJumps) - Math.round(base.maxAirJumps);
  if (jumpExtra > 0) add('🦘', `+${jumpExtra}`, 'Air jumps', 'airJumps');

  for (const el of SYNERGY_ELEMENTS) {
    if (player.elements.has(el) && !base.elements.has(el)) {
      const elName = ELEMENT_NAMES[el] || (el ? el.charAt(0).toUpperCase() + el.slice(1) : 'Unknown');
      add(ELEMENT_ICONS[el] || '✨', 'ON', `${elName} element`, `element-${el}`);
    }
  }
  if (player.lightningChains > 3) {
    add('⚡', `×${player.lightningChains}`, 'Lightning chains', 'lightningChains');
  }

  if (player.magnetActive) add('🧲', 'ON', 'Magnet pulse', 'magnetPulse');

  if (player.hpRegen > (base.hpRegen ?? 0)) add('🩹', fmtNum(player.hpRegen - (base.hpRegen ?? 0), 1), 'HP regen', 'hpRegen');
  if (player.runXpMult > (base.runXpMult ?? 0)) add('⌚', fmtPct(player.runXpMult - (base.runXpMult ?? 0)), 'XP gain', 'xpGain');
  if (player.evasion > (base.evasion ?? 0)) add('💍', fmtPct(player.evasion - (base.evasion ?? 0)), 'Evasion', 'evasion');
  if (player.armor > (base.armor ?? 0)) add('🛡️', fmtPct(player.armor - (base.armor ?? 0)), 'Armor', 'armor');
  if (player.meleeBonus > (base.meleeBonus ?? 0)) add('👊', fmtPct(player.meleeBonus - (base.meleeBonus ?? 0)), 'Close range damage', 'meleeDamage');
  if (player.airDamageMult > (base.airDamageMult ?? 0)) add('🧣', fmtPct(player.airDamageMult - (base.airDamageMult ?? 0)), 'Airborne damage', 'airborneDamage');
  if (player.bossDamageMult > (base.bossDamageMult ?? 0)) add('💀', fmtPct(player.bossDamageMult - (base.bossDamageMult ?? 0)), 'Boss damage', 'bossDamage');
  if (player.poisonChance > (base.poisonChance ?? 0)) add('🧀', fmtPct(player.poisonChance - (base.poisonChance ?? 0)), 'Poison chance', 'poisonChance');
  if (player.bonkChance > (base.bonkChance ?? 0)) add('🔨', fmtPct(player.bonkChance - (base.bonkChance ?? 0)), 'Bonk chance', 'bonkChance');
  if (player.explodeChance > (base.explodeChance ?? 0)) add('🧆', fmtPct(player.explodeChance - (base.explodeChance ?? 0)), 'Explode chance', 'explodeChance');
  if (player.killDamageBonus > (base.killDamageBonus ?? 0)) add('👿', fmtPct(player.killDamageBonus - (base.killDamageBonus ?? 0)), 'Kill damage bonus', 'killDamageBonus');
  if (player.projectileSpeedMult > (base.projectileSpeedMult ?? 0)) add('💨', fmtPct(player.projectileSpeedMult - (base.projectileSpeedMult ?? 0)), 'Projectile speed', 'projectileSpeed');
  if (player.jumpPeakMult > (base.jumpPeakMult ?? 0)) add('🪶', fmtPct(player.jumpPeakMult - (base.jumpPeakMult ?? 0)), 'Jump height', 'jumpHeight');
  const trailLevel = player.fireTrailLevel ?? 0;
  const baseTrail = base.fireTrailLevel ?? 0;
  if (trailLevel > baseTrail) add('🛢️', `L${trailLevel}`, 'Greased Fire', 'greasedFire');
  if (player.coinMult > (base.coinMult ?? 0)) add('🧤', fmtPct(player.coinMult - (base.coinMult ?? 0)), 'Coin bonus', 'coinBonus');

  const killXpExtra = player.killXpMult - (base.killXpMult ?? 0);
  if (killXpExtra > 0) add('📖', fmtPct(killXpExtra), 'Kill XP', 'killXp');

  const healKillExtra = player.healOnKill - (base.healOnKill ?? 0);
  if (healKillExtra > 0) add('💚', fmtPct(healKillExtra), 'Heal on kill', 'healOnKill');

  const magnetExtra = Math.round((player.magnetRadius - (base.magnetRadius ?? 0)) * 10) / 10;
  if (magnetExtra > 0) add('🛰️', `+${magnetExtra}`, 'Magnet radius', 'magnetRadius');

  const upgradeBoostExtra = player.upgradeBoost - (base.upgradeBoost ?? 0);
  if (upgradeBoostExtra > 0) add('📈', fmtPct(upgradeBoostExtra), 'Future upgrades', 'upgradeBoost');

  const critSplashExtra = player.critSplash - (base.critSplash ?? 0);
  if (critSplashExtra > 0) add('💢', fmtPct(critSplashExtra), 'Crit splash', 'critSplash');

  const idleExtra = player.idleDamageMult - (base.idleDamageMult ?? 0);
  if (idleExtra > 0) add('🧘', fmtPct(idleExtra), 'Idle damage', 'idleDamage');

  const moveAtkExtra = player.moveAtkSpeed - (base.moveAtkSpeed ?? 0);
  if (moveAtkExtra > 0) add('🏃', fmtPct(moveAtkExtra), 'Move attack speed', 'moveAtkSpeed');

  const hurtSpdExtra = player.hurtSpeedBurst - (base.hurtSpeedBurst ?? 0);
  if (hurtSpdExtra > 0) add('😤', fmtPct(hurtSpdExtra), 'Hurt speed burst', 'hurtSpeedBurst');

  return sortByBuffDisplayOrder(buffs);
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
    if (e.critChance && player.critChance >= CRIT_CHANCE_CAP) return true;
    if (e.poisonChance && player.poisonChance >= 1) return true;
    if (e.explodeChance && player.explodeChance >= 1) return true;
    if (e.damagePerKill && player.killDamageBonus >= 0.1) return true;
    return false;
  }

  _isTemplateAvailable(template, player) {
    const id = template.id;
    if (template.baseEffect.element && player?.elements?.has(template.baseEffect.element)) return false;
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
    let roll = runRandom() * total;
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
    assert(upgrade?.effect != null, 'UPGRADE_INVALID');
    assert(player != null, 'UPGRADE_NO_PLAYER');
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
