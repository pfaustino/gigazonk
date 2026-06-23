export const ARENA_SIZE = 1200;

/** Bump this on each release. */
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

export const ENEMY_TYPES = {
  grunt: { hpHits: 1.25, speed: 2, damage: 8, xp: 3, color: 0x44aa44, scale: 0.8, hpBarTop: 1.12 },
  runner: { hpHits: 1.0, speed: 4, damage: 5, xp: 2, color: 0xaaaa22, scale: 0.6, hpBarTop: 0.95 },
  brute: { hpHits: 3.5, speed: 1.4, damage: 20, xp: 12, color: 0xaa4444, scale: 1.4, hpBarTop: 1.48 },
  wisp: { hpHits: 0.85, speed: 3, damage: 3, xp: 1, color: 0x44aaff, scale: 0.5, hpBarTop: 0.78 },
  elite: { hpHits: 6, speed: 1.75, damage: 25, xp: 25, color: 0xff44ff, scale: 1.6, hpBarTop: 1.85 },
};

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
export const ZONK_DOME_FOLLOWUP_DELAY = 0.45;
export const ZONK_DOME_FOLLOWUP_DAMAGE_MULT = 0.65;

export const VILLAGE_NPCS = [
  { id: 'questgiver', name: 'Elder Zonka', role: 'Quests', pos: [-15, 0, -10], color: 0x6b4fd4 },
  { id: 'trainer', name: 'Coach Zonk', role: 'Skill Tree', pos: [15, 0, -10], color: 0xf7c948 },
  { id: 'portal', name: 'Arena Portal', role: 'Enter Arena', pos: [0, 0, 20], color: 0xff6b35 },
];

export const QUESTS = [
  { id: 'kill_50', desc: 'Slay 50 monsters', target: 50, type: 'kills', reward: 30 },
  { id: 'kill_100', desc: 'Slay 100 monsters', target: 100, type: 'kills', reward: 45 },
  { id: 'kill_200', desc: 'Slay 200 monsters', target: 200, type: 'kills', reward: 80 },
  { id: 'kill_500', desc: 'Slay 500 monsters', target: 500, type: 'kills', reward: 150 },
  { id: 'kill_1000', desc: 'Slay 1000 monsters', target: 1000, type: 'kills', reward: 300 },
  { id: 'kill_2500', desc: 'Slay 2500 monsters', target: 2500, type: 'kills', reward: 500 },
  { id: 'kill_5000', desc: 'Slay 5000 monsters', target: 5000, type: 'kills', reward: 800 },
  { id: 'chests_3', desc: 'Open 3 chests', target: 3, type: 'chests', reward: 25 },
  { id: 'chests_20', desc: 'Open 20 chests', target: 20, type: 'chests', reward: 65 },
  { id: 'chests_50', desc: 'Open 50 chests', target: 50, type: 'chests', reward: 120 },
  { id: 'pots_10', desc: 'Break 10 pots', target: 10, type: 'pots', reward: 20 },
  { id: 'pots_59', desc: 'Break 59 pots', target: 59, type: 'pots', reward: 55 },
  { id: 'pots_100', desc: 'Break 100 pots', target: 100, type: 'pots', reward: 90 },
  { id: 'pots_200', desc: 'Break 200 pots', target: 200, type: 'pots', reward: 150 },
  { id: 'gems_100', desc: 'Pick up 100 gems', target: 100, type: 'gems', reward: 40 },
  { id: 'gems_250', desc: 'Pick up 250 gems', target: 250, type: 'gems', reward: 75 },
  { id: 'gems_500', desc: 'Pick up 500 gems', target: 500, type: 'gems', reward: 130 },
  { id: 'guardians_10', desc: 'Slay 10 guardians', target: 10, type: 'guardians', reward: 55 },
  { id: 'guardians_25', desc: 'Slay 25 guardians', target: 25, type: 'guardians', reward: 100 },
  { id: 'guardians_50', desc: 'Slay 50 guardians', target: 50, type: 'guardians', reward: 180 },
  { id: 'elites_10', desc: 'Slay 10 elite monsters', target: 10, type: 'elites', reward: 70 },
  { id: 'elites_25', desc: 'Slay 25 elite monsters', target: 25, type: 'elites', reward: 140 },
  { id: 'survive_5', desc: 'Survive 5 minutes', target: 300, type: 'time', reward: 50 },
  { id: 'survive_10', desc: 'Survive 10 minutes', target: 600, type: 'time', reward: 90 },
  { id: 'survive_15', desc: 'Survive 15 minutes', target: 900, type: 'time', reward: 140 },
  { id: 'survive_20', desc: 'Survive 20 minutes', target: 1200, type: 'time', reward: 200 },
  { id: 'wave_10', desc: 'Reach wave 10', target: 10, type: 'wave', reward: 60 },
  { id: 'wave_15', desc: 'Reach wave 15', target: 15, type: 'wave', reward: 100 },
  { id: 'wave_20', desc: 'Reach wave 20', target: 20, type: 'wave', reward: 160 },
  { id: 'wave_25', desc: 'Reach wave 25', target: 25, type: 'wave', reward: 240 },
  { id: 'level_10', desc: 'Reach level 10', target: 10, type: 'level', reward: 60 },
  { id: 'level_15', desc: 'Reach level 15', target: 15, type: 'level', reward: 90 },
  { id: 'level_20', desc: 'Reach level 20', target: 20, type: 'level', reward: 130 },
  { id: 'level_25', desc: 'Reach level 25', target: 25, type: 'level', reward: 180 },
  { id: 'level_30', desc: 'Reach level 30', target: 30, type: 'level', reward: 250 },
  { id: 'boss_1', desc: 'Defeat a Zonk Lord', target: 1, type: 'bosses', reward: 100 },
  { id: 'boss_3', desc: 'Defeat 3 Zonk Lords', target: 3, type: 'bosses', reward: 200 },
  { id: 'boss_5', desc: 'Defeat 5 Zonk Lords', target: 5, type: 'bosses', reward: 320 },
  { id: 'boss_10', desc: 'Defeat 10 Zonk Lords', target: 10, type: 'bosses', reward: 550 },
  { id: 'rift_1', desc: 'Enter a Zonk Rift', target: 1, type: 'rifts', reward: 40 },
  { id: 'rift_5', desc: 'Enter 5 Zonk Rifts', target: 5, type: 'rifts', reward: 110 },
  { id: 'rift_10', desc: 'Enter 10 Zonk Rifts', target: 10, type: 'rifts', reward: 200 },
  { id: 'gigaspawn_1', desc: 'Survive a Gigaspawn', target: 1, type: 'gigaspawns', reward: 75 },
  { id: 'gigaspawn_3', desc: 'Survive 3 Gigaspawns', target: 3, type: 'gigaspawns', reward: 180 },
  { id: 'gigaspawn_5', desc: 'Survive 5 Gigaspawns', target: 5, type: 'gigaspawns', reward: 320 },
  { id: 'gigaspawn_8', desc: 'Survive 8 Gigaspawns', target: 8, type: 'gigaspawns', reward: 450 },
  { id: 'gigaspawn_12', desc: 'Survive 12 Gigaspawns', target: 12, type: 'gigaspawns', reward: 650 },
  { id: 'coins_25', desc: 'Earn 25 run coins', target: 25, type: 'coins', reward: 35 },
  { id: 'coins_100', desc: 'Earn 100 run coins', target: 100, type: 'coins', reward: 80 },
  { id: 'coins_250', desc: 'Earn 250 run coins', target: 250, type: 'coins', reward: 150 },
  { id: 'combo_25', desc: 'Reach a 25 kill combo', target: 25, type: 'combo', reward: 45 },
  { id: 'combo_50', desc: 'Reach a 50 kill combo', target: 50, type: 'combo', reward: 90 },
  { id: 'combo_100', desc: 'Reach a 100 kill combo', target: 100, type: 'combo', reward: 160 },
  { id: 'shrine_1', desc: 'Use an Ascension Shrine', target: 1, type: 'shrines', reward: 50 },
  { id: 'shrine_3', desc: 'Use 3 Ascension Shrines', target: 3, type: 'shrines', reward: 120 },
];

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
