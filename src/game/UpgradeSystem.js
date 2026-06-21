import { UPGRADES, SYNERGY_ELEMENTS, SYNERGY_NAME } from './constants.js';

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

  return lines;
}

export const LOOT_REWARD_ICONS = {
  xp: '✨',
  heal: '❤️',
  damage: '💥',
  speed: '👟',
  coins: '🪙',
  magnet: '🧲',
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

export function getActiveBuffs(player) {
  const base = player.runBaseline;
  if (!base) return [];

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

  return buffs;
}

export class UpgradeSystem {
  constructor() {
    this.taken = new Set();
  }

  reset() {
    this.taken = new Set();
  }

  getRandomChoices(count = 3, player = null) {
    const available = UPGRADES.filter(u => {
      if (u.id === 'fire' && this.hasElement('fire')) return false;
      if (u.id === 'ice' && this.hasElement('ice')) return false;
      if (u.id === 'lightning' && this.hasElement('lightning')) return false;
      if (u.id === 'double_jump' && player && player.maxAirJumps >= 5) return false;
      if (u.id === 'proj_pierce' && player && player.projectilePierce >= 5) return false;
      if (u.id !== 'double_jump' && u.id !== 'proj_pierce' && this.taken.has(u.id)) return false;
      return true;
    });

    const choices = [];
    const pool = [...available];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    return choices;
  }

  hasElement(el) {
    return this.taken.has(el);
  }

  apply(upgrade, player) {
    if (upgrade.id !== 'double_jump' && upgrade.id !== 'proj_pierce') {
      this.taken.add(upgrade.id);
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

export { SYNERGY_NAME };
