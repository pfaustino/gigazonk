import { runRandom } from '../lib/runRandom.js';

/** Boon + curse picks before each new arena run (see RUN_MODIFIERS_ENABLED). */
export const RUN_BOONS = [
  {
    id: 'iron_will',
    name: 'Iron Will',
    icon: '🛡️',
    desc: '+20% max HP',
    apply(player) {
      const scale = 1.2;
      player.maxHp = Math.round(player.maxHp * scale);
      player.hp = Math.min(player.maxHp, Math.round(player.hp * scale));
    },
  },
  {
    id: 'swift_zonk',
    name: 'Swift Zonk',
    icon: '👟',
    desc: '+12% move speed',
    apply(player) {
      player.speed *= 1.12;
    },
  },
  {
    id: 'overclock',
    name: 'Overclock',
    icon: '⚡',
    desc: '+15% attack rate',
    apply(player) {
      player.attackRate *= 1.15;
    },
  },
  {
    id: 'treasure_sense',
    name: 'Treasure Sense',
    icon: '🧲',
    desc: '+40% pickup radius',
    apply(player) {
      player.pickupRadius *= 1.4;
      player.magnetRadius = (player.magnetRadius ?? 0) + 1.2;
    },
  },
  {
    id: 'scholars_boon',
    name: "Scholar's Boon",
    icon: '📚',
    desc: '+18% run XP',
    apply(player) {
      player.runXpMult = (player.runXpMult ?? 0) + 0.18;
    },
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    icon: '💥',
    desc: '+22% damage',
    apply(player) {
      player.damage *= 1.22;
    },
  },
];

export const RUN_CURSES = [
  {
    id: 'heavy_boots',
    name: 'Heavy Boots',
    icon: '🥾',
    desc: '−12% move speed',
    apply(player) {
      player.speed *= 0.88;
    },
  },
  {
    id: 'glass_heart',
    name: 'Glass Heart',
    icon: '💔',
    desc: '−18% max HP',
    apply(player) {
      const scale = 0.82;
      player.maxHp = Math.max(1, Math.round(player.maxHp * scale));
      player.hp = Math.min(player.hp, player.maxHp);
    },
  },
  {
    id: 'swarm',
    name: 'Swarm',
    icon: '🦟',
    desc: '+20% enemy HP',
    apply(_player, game) {
      game.runModifierEnemyHpMult = (game.runModifierEnemyHpMult ?? 1) * 1.2;
    },
  },
  {
    id: 'panic',
    name: 'Panic',
    icon: '😱',
    desc: '+14% enemy speed',
    apply(_player, game) {
      game.runModifierEnemySpeedMult = (game.runModifierEnemySpeedMult ?? 1) * 1.14;
    },
  },
  {
    id: 'hungry_ghost',
    name: 'Hungry Ghost',
    icon: '👻',
    desc: '−25% run coins',
    apply(player) {
      player.coinMult = Math.max(0.1, (player.coinMult ?? 1) * 0.75);
    },
  },
  {
    id: 'rusty_trigger',
    name: 'Rusty Trigger',
    icon: '🪤',
    desc: '−12% attack rate',
    apply(player) {
      player.attackRate *= 0.88;
    },
  },
];

const BOON_BY_ID = Object.fromEntries(RUN_BOONS.map((b) => [b.id, b]));
const CURSE_BY_ID = Object.fromEntries(RUN_CURSES.map((c) => [c.id, c]));

function pickUnique(pool, count) {
  const copy = [...pool];
  const picks = [];
  while (picks.length < count && copy.length > 0) {
    const i = Math.floor(runRandom() * copy.length);
    picks.push(copy.splice(i, 1)[0]);
  }
  return picks;
}

/** Roll offer sets for the picker. */
export function rollRunModifierOffers(boonCount = 3, curseCount = 3) {
  return { boons: pickUnique(RUN_BOONS, boonCount), curses: pickUnique(RUN_CURSES, curseCount) };
}

export function getRunModifierDef(id, kind) {
  if (kind === 'boon') return BOON_BY_ID[id] ?? null;
  if (kind === 'curse') return CURSE_BY_ID[id] ?? null;
  return BOON_BY_ID[id] ?? CURSE_BY_ID[id] ?? null;
}

/** @param {{ boonId: string, curseId: string }} selection */
export function applyRunModifiers(player, game, selection) {
  game.runModifierEnemyHpMult = 1;
  game.runModifierEnemySpeedMult = 1;

  const boon = getRunModifierDef(selection.boonId, 'boon');
  const curse = getRunModifierDef(selection.curseId, 'curse');
  if (boon) boon.apply(player, game);
  if (curse) curse.apply(player, game);

  return { boon, curse };
}

export function formatRunModifiersToast(selection) {
  const boon = getRunModifierDef(selection?.boonId, 'boon');
  const curse = getRunModifierDef(selection?.curseId, 'curse');
  if (!boon || !curse) return null;
  return `${boon.icon} ${boon.name} · ${curse.icon} ${curse.name}`;
}
