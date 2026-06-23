export const ARENA_SIZE = 1200;
export const GAME_VERSION = '0.1.9';

export const ARENA_REFERENCE_SIZE = 120;
export const ARENA_GROUND_SEGMENTS = 96;
export const ARENA_SPAWN_PAD_RADIUS = 30;
export const VILLAGE_SKY = 0x7ab4d4;
export const TITLE_SKY = 0x80b8d8;
export const ARENA_ROCK_COUNT = 300;
/** Scatter rocks in the combat band (not the full 1200-unit arena plane). */
export const ARENA_ROCK_MIN_RADIUS = ARENA_SPAWN_PAD_RADIUS + 5;
export const ARENA_ROCK_MAX_RADIUS = 260;
export const ARENA_LOOT_MIN_RADIUS = ARENA_SPAWN_PAD_RADIUS + 5;
export const ARENA_LOOT_MAX_RADIUS = ARENA_SIZE * 0.5 - 24;
export const ARENA_LOOT_RING_AREA =
  Math.PI * (ARENA_LOOT_MAX_RADIUS ** 2 - ARENA_LOOT_MIN_RADIUS ** 2);
/** ~1 chest/pot per 3k sq units in the loot ring (~325 at current arena size). */
export const ARENA_INTERACTABLE_DENSITY = 3200;
export const ARENA_INTERACTABLE_COUNT = Math.max(
  80,
  Math.round(ARENA_LOOT_RING_AREA / ARENA_INTERACTABLE_DENSITY)
);
export const ARENA_SHRINE_RADIUS = ARENA_SIZE * 0.38;
export const VILLAGE_SIZE = 80;

export const PLAYER_BASE = {
  speed: 5.5,
  defaultFriction: 30,
  maxHp: 100,
  damage: 10,
  attackRate: 1.2,
  projectileCount: 1,
  projectilePierce: 0,
  projectileSpeed: 25,
  pickupRadius: 6,
  magnetRadius: 14,
  critChance: 0.05,
  critDamageMult: 2,
  area: 1,
};

/** Hard cap on crit chance (75%). Crit damage has no cap. */
export const CRIT_CHANCE_CAP = 0.75;

import { runRandomInt } from '../lib/runRandom.js';
import { ENEMY_TYPES, GRUNT_COLORS } from './gameData.js';

export { ENEMY_TYPES, GRUNT_COLORS };

export function pickGruntColor() {
  return GRUNT_COLORS[runRandomInt(GRUNT_COLORS.length)];
}

/** Y offset baked into enemy instanced meshes — keep in sync with EnemyManager.updateInstance. */
export const ENEMY_MESH_LIFT = 0.9;

export function getEnemyHpBarWorldY(enemy) {
  const surfaceY = enemy.groundY ?? enemy.feetY ?? 0;
  const scale = enemy.scale ?? 1;
  const typeKey = enemy.isMesaGuardian ? 'grunt' : (enemy.type || 'grunt');
  const def = ENEMY_TYPES[typeKey] ?? ENEMY_TYPES.grunt;
  const modelTop = def.hpBarTop ?? 1.12;
  const margin = enemy.isBoss ? 0.5 : 0.35;
  return surfaceY + scale * (ENEMY_MESH_LIFT + modelTop) + margin;
}

export const MAX_ENEMIES = 420;
/** Start slowing spawns above this count (~75% of cap). */
export const ENEMY_SOFT_CAP = 315;
/** Despawn non-boss enemies beyond this distance from the player. */
export const ENEMY_DESPAWN_DISTANCE = 58;
/** Max despawn per frame to avoid hitches. */
export const ENEMY_DESPAWN_BATCH = 24;
/** Full terrain physics only within this radius. */
export const ENEMY_NEAR_RADIUS = 42;
export const MAX_PROJECTILES = 200;
export const MAX_GEMS = 1200;

export const GIGA_SPAWN_INTERVAL = 180;
export const BASE_SPAWN_GROUP_SIZE = 3;
export const GROUP_CLUSTER_RADIUS = 3.5;
export const MAX_SPAWN_GROUP_SIZE = 7;
export const MAX_GIGA_GROUP_SIZE = 28;
/** Mesa guardians scale to this many hits of current effective damage when engaged. */
export const MESA_GUARDIAN_HP_HITS = 5;

// Level-up awards live in Awards.js (UPGRADE_TEMPLATES + rarity tiers).

export const ZONK_DOME_CAMP_RADIUS = 20;
export const ZONK_DOME_CAMP_TIME = 15;
export const ZONK_DOME_STILL_SPEED = 0.35;
/** Seconds for dome to expand to full hurt radius.
 *  Escape math (R=8m, ~0.3s reaction): walk 5.5 m/s needs T > 8/5.5+0.3 ≈ 1.75s;
 *  sprint 7.7 m/s needs T > 1.34s. 2.0s lets walkers outrun it; campers who hesitate get popped. */
export const ZONK_DOME_GROW_TIME = 2;
export const ZONK_DOME_HURT_RADIUS = 8;
export const ZONK_DOME_FOLLOWUP_COUNT = 4;
/** Seconds between each follow-up anti-camp bubble after the first dome. */
export const ZONK_DOME_FOLLOWUP_DELAY = 3;
export const ZONK_DOME_FOLLOWUP_DAMAGE_MULT = 0.65;

export const VILLAGE_NPCS = [
  { id: 'questgiver', name: 'Elder Zonka', role: 'Quests', pos: [-15, 0, -10], color: 0x6b4fd4 },
  { id: 'trainer', name: 'Coach Zonk', role: 'Skill Tree', pos: [15, 0, -10], color: 0xf7c948 },
  { id: 'portal', name: 'Arena Portal', role: 'Enter Arena', pos: [0, 0, 20], color: 0xff6b35 },
];

export { QUESTS } from './gameData.js';

export const SYNERGY_ELEMENTS = ['fire', 'ice', 'lightning'];
export const SYNERGY_NAME = 'Tri-Zonk Nova';

export const CHARACTERS = [
  {
    id: 'fox',
    name: 'Zonka',
    icon: '🦊',
    desc: 'Nimble trickster. Blazing speed and rapid attacks.',
    color: 0xff8844,
    unlockCost: 0,
    playable: true,
    mods: { speedMult: 1.2, hpMult: 0.9, attackRateMult: 1.1 },
    startElement: null,
  },
  {
    id: 'knight',
    name: 'Bonk Knight',
    icon: '⚔️',
    desc: 'Armored stalwart. High HP, thorn aura, crushing blows.',
    color: 0x8899aa,
    unlockCost: 0,
    playable: false,
    mods: { speedMult: 0.85, hpMult: 1.35, damageMult: 1.2, thorns: 5 },
    startElement: null,
  },
  {
    id: 'mage',
    name: 'Storm Witch',
    icon: '🔮',
    desc: 'Elemental savant. Starts with lightning, +crit.',
    color: 0x66ccff,
    unlockCost: 150,
    playable: false,
    mods: { speedMult: 0.95, hpMult: 0.85, critChance: 0.1 },
    startElement: 'lightning',
  },
  {
    id: 'berserker',
    name: 'Rage Boar',
    icon: '🐗',
    desc: 'Unstoppable fury. Combo bonus doubled, lifesteal.',
    color: 0xcc4444,
    unlockCost: 200,
    playable: false,
    mods: { speedMult: 1.05, hpMult: 1.1, damageMult: 1.15, lifesteal: 0.03, comboMult: 2 },
    startElement: null,
  },
];

export const DEFAULT_PLAYABLE_CHARACTER = 'fox';

export function isCharacterPlayable(id) {
  const char = CHARACTERS.find((c) => c.id === id);
  return char?.playable !== false;
}

/** Rock / mesa color per biome — terrain uses the same palette. */
export function getBiomeRockColor(biome) {
  switch (biome?.id) {
    case 'frost': return 0x5a6878;
    case 'volcanic': return 0x6a5848;
    case 'waste': return 0x6a6050;
    default: return 0x5e5448;
  }
}

/** Outer arena ring — slightly darker than pad/mesas but still readable. */
export function getBiomeOuterColor(biome) {
  switch (biome?.id) {
    case 'frost': return 0x384858;
    case 'volcanic': return 0x403028;
    case 'waste': return 0x403830;
    default: return 0x384858;
  }
}

export const BIOMES = [
  { id: 'grass', name: 'Zonk Meadows', ground: 0x4a9050, sky: 0x72b8d8, accent: 0x2d6030, friction: 26 },
  { id: 'waste', name: 'Bonk Wastes', ground: 0xa08060, sky: 0xc8a878, accent: 0x6a5040, friction: 24 },
  { id: 'frost', name: 'Frost Zonk', ground: 0x5a7080, sky: 0x6a9cb8, accent: 0x3a5870, friction: 7 },
  { id: 'volcanic', name: 'Magma Pits', ground: 0x5a3828, sky: 0xc89878, accent: 0x2a1408, friction: 14 },
];
