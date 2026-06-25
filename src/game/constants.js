export const ARENA_SIZE = 1200;
export const GAME_VERSION = '0.2.2';

export const ARENA_REFERENCE_SIZE = 120;
export const ARENA_GROUND_SEGMENTS = 96;
export const ARENA_SPAWN_PAD_RADIUS = 30;
export const VILLAGE_SKY = 0x7ab4d4;
export const TITLE_SKY = 0x80b8d8;
/** Sunny title-screen readability — lighting + terrain emissive. */
export const SCENE_TONE_EXPOSURE = 1.08;
/** Daylight tuned via dev panel: sky/ground ×1.35, ambient ×0, parallel ×3. */
export const SCENE_DAY_HEMI_INTENSITY = 0.702;
export const SCENE_DAY_AMBIENT_INTENSITY = 0;
export const SCENE_DAY_SUN_INTENSITY = 4.05;
/** Arena night floor (lerps up to SCENE_DAY_* by day). */
export const SCENE_NIGHT_HEMI_INTENSITY = 0.49;
export const SCENE_NIGHT_AMBIENT_INTENSITY = 0;
export const SCENE_NIGHT_SUN_INTENSITY = 2.38;
export const TERRAIN_EMISSIVE_INTENSITY = 0.24;
export const GROUND_TEXTURE_EMISSIVE_INTENSITY = 0.12;
export const ROCK_TEXTURE_EMISSIVE_INTENSITY = 0.14;
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

/** Keep NPCs, portal path, and spawn hub unobstructed (world XZ). */
export const VILLAGE_CLEAR_ZONES = [
  { x: 0, z: 20, r: 12 },
  { x: 0, z: 6, r: 7 },
  { x: -15, z: -10, r: 5.5 },
  { x: 15, z: -10, r: 5.5 },
  { x: -12, z: 12, r: 5.5 },
  { x: 12, z: 12, r: 5.5 },
  { x: -8, z: 0, r: 4.5 },
  { x: 8, z: -5, r: 4.5 },
  { x: 0, z: -18, r: 5.5 },
];

/** Fixed home slots — west/east rows, never on the north path to the portal. */
export const VILLAGE_BUILDING_SLOTS = [
  [-24, -14], [-24, -6], [-24, 2],
  [24, -14], [24, -6], [24, 2],
  [-18, -20], [18, -20],
  [-14, -24], [14, -24],
  [-20, 6], [20, 6],
];

/** Reputation unlocks — bonus applied at each arena run start (stacks). */
export const VILLAGE_REP_PERKS = [
  {
    minRep: 10,
    id: 'well',
    icon: '💧',
    name: 'Zonk Well',
    desc: '+8% max HP this run',
    maxHpMult: 0.08,
  },
  {
    minRep: 25,
    id: 'merchant',
    icon: '🛒',
    name: 'Bonk Merchant',
    desc: '+25 run coins at arena start',
    runCoins: 25,
  },
  {
    minRep: 30,
    id: 'banner',
    icon: '🏆',
    name: 'Victory Banner',
    desc: '+12% pickup radius',
    pickupMult: 0.12,
  },
  {
    minRep: 50,
    id: 'shrine',
    icon: '🛕',
    name: 'Ascension Shrine',
    desc: '+10% XP this run',
    xpMult: 0.1,
  },
  {
    minRep: 75,
    id: 'tower',
    icon: '🗼',
    name: 'Watch Tower',
    desc: '+15% damage vs bosses',
    bossDamageMult: 0.15,
  },
];

/** Active quest board contracts — small combat bump when you leave with 2+ quests. */
export const VILLAGE_QUEST_RALLY_MIN = 2;
export const VILLAGE_QUEST_RALLY_DAMAGE = 0.05;

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

/** Max HP removed per contact tick when many enemies overlap (before armor). */
export const ENEMY_CONTACT_DAMAGE_CAP = 28;
/** Enemy `damage` in data/enemies.json = HP per contact hit (player i-frames apply). */

/** Level N→N+1 XP = floor(XP_LEVEL_BASE * XP_LEVEL_GROWTH^(N-1)). Tune with XP_PICKUP_MULT. */
export const XP_LEVEL_BASE = 48;
export const XP_LEVEL_GROWTH = 1.172;
/** Scales kill/gem/chest XP before player xpMult (horde density runs hot otherwise). */
export const XP_PICKUP_MULT = 0.88;

import { runRandomInt } from '../lib/runRandom.js';
import { ENEMY_TYPES, GRUNT_COLORS } from './gameData.js';

export { ENEMY_TYPES, GRUNT_COLORS };

export function pickGruntColor() {
  return GRUNT_COLORS[runRandomInt(GRUNT_COLORS.length)];
}

/** Y offset baked into enemy instanced meshes — keep in sync with EnemyManager.updateInstance. */
export const ENEMY_MESH_LIFT = 0.9;
/** Max left/right wobble off player-facing yaw (degrees). */
export const ENEMY_FACE_SWAY_DEG = 8;
/** Sway cycle speed (radians per second of phase). */
export const ENEMY_FACE_SWAY_SPEED = 2.4;
/** Mouth sprite row advances per second (5-row sheet, ping-pong chew). */
export const ENEMY_MOUTH_CHEW_FPS = 10;
/** Extra distance beyond contact collider before switching to scream row. */
export const ENEMY_MOUTH_SCREAM_PAD = 1.5;
/** Scream mouth after taking damage (seconds). */
export const ENEMY_MOUTH_SCREAM_HIT_SEC = 0.45;

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
/** Min center distance = (scaleA + scaleB) * this (enemy–enemy personal space). */
export const ENEMY_SEPARATION_SCALE = 0.55;
/** Neighbor query radius multiplier on enemy scale. */
export const ENEMY_SEPARATION_QUERY = 1.75;
/** Overlap resolved per separation pass (0–1). */
export const ENEMY_SEPARATION_STRENGTH = 0.9;
/** Cap separation push per enemy per pass (world units). */
export const ENEMY_SEPARATION_MAX_PUSH = 1.4;
/** Separation passes per frame (grid rebuilt between passes). */
export const ENEMY_SEPARATION_PASSES = 1;
/** Above this alive count, use one separation pass to save CPU. */
export const ENEMY_SEPARATION_HEAVY_COUNT = 180;
/** Only separate enemies within this radius of the player (horde pile zone). */
export const ENEMY_SEPARATION_PLAYER_RADIUS = 28;
/** Horde size above which grunt HP bars are hidden (boss/elite still show). */
export const ENEMY_HP_BAR_HORDE_LIMIT = 32;
/** Batch kill FX / quest checks above this alive count (explode + pierce lag fix). */
export const COMBAT_HORDE_FX_LIMIT = 28;
/** Max explode/splash targets per proc during horde combat. */
export const COMBAT_AOE_PROC_MAX_TARGETS = 14;
export const MAX_PROJECTILES = 200;
export const MAX_GEMS = 1200;

export const GIGA_SPAWN_INTERVAL = 180;
export const BOSS_SPAWN_INTERVAL = 120;
export const BOSS_TELEGRAPH_SECONDS = 3;
/** Boss kill banner — keep visible before level-up / loot reward UI. */
export const BOSS_DEFEAT_BANNER_MS = 4800;
export const HIT_STOP_CRIT_SECONDS = 0.045;
/** Seconds before dodge (Q / LB) can be used again. */
export const DODGE_COOLDOWN_SECONDS = 2;
export const DODGE_DURATION_SECONDS = 0.25;
export const BASE_SPAWN_GROUP_SIZE = 3;
export const GROUP_CLUSTER_RADIUS = 4.5;
export const MAX_SPAWN_GROUP_SIZE = 7;
export const MAX_GIGA_GROUP_SIZE = 28;
/** Mesa guardians scale to this many hits of current effective damage when engaged. */
export const MESA_GUARDIAN_HP_HITS = 5;

// Level-up offers live in UpgradeOffers.js + data/upgrades.json (UPGRADE_TEMPLATES + rarity tiers).

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
  { id: 'questgiver', name: 'Elder Zonka', role: 'Quests', pos: [-15, 0, -10], color: 0x6b4fd4, minRep: 0 },
  { id: 'trainer', name: 'Coach Zonk', role: 'Skill Tree', pos: [15, 0, -10], color: 0xf7c948, minRep: 0 },
  { id: 'portal', name: 'Arena Portal', role: 'Enter Arena', pos: [0, 0, 20], color: 0xff6b35, minRep: 0 },
  { id: 'merchant', name: 'Bonk Merchant', role: 'Wares', pos: [-12, 0, 12], color: 0x44aa66, minRep: 25 },
  { id: 'shrine', name: 'Ascension Shrine', role: 'Shrine Lore', pos: [12, 0, 12], color: 0xaa44ff, minRep: 50 },
];

/** Reputation unlocks — decorative landmarks in Zonka Village. */
export const VILLAGE_LANDMARKS = [
  { id: 'well', label: 'Zonk Well', minRep: 10, pos: [-8, 0, 0], color: 0x4488cc },
  { id: 'banner', label: 'Victory Banner', minRep: 30, pos: [8, 0, -5], color: 0xf7c948 },
  { id: 'tower', label: 'Watch Tower', minRep: 75, pos: [0, 0, -18], color: 0x8899aa },
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
    playable: true,
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
    playable: true,
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
    playable: true,
    mods: { speedMult: 1.05, hpMult: 1.1, damageMult: 1.15, lifesteal: 0.03, comboMult: 2 },
    startElement: null,
  },
];

export const DEFAULT_PLAYABLE_CHARACTER = 'fox';

export function isCharacterPlayable(id) {
  const char = CHARACTERS.find((c) => c.id === id);
  return char != null && char.playable !== false;
}

/** Rock / mesa color per biome — terrain uses the same palette. */
export function getBiomeRockColor(biome) {
  switch (biome?.id) {
    case 'frost': return 0x788898;
    case 'volcanic': return 0x886858;
    case 'waste': return 0x887868;
    default: return 0x9a8878;
  }
}

/** Outer arena ring — meadow edge / cobble surround. */
export function getBiomeOuterColor(biome) {
  switch (biome?.id) {
    case 'frost': return 0x587088;
    case 'volcanic': return 0x584838;
    case 'waste': return 0x685848;
    default: return 0x5a9860;
  }
}

export const BIOMES = [
  { id: 'grass', name: 'Zonk Meadows', ground: 0x62b868, sky: 0x80b8d8, accent: 0x3a7840, friction: 28 },
  { id: 'waste', name: 'Bonk Wastes', ground: 0xb89878, sky: 0xd8b888, accent: 0x806050, friction: 22 },
  { id: 'frost', name: 'Frost Zonk', ground: 0x6a8898, sky: 0x7ab4d8, accent: 0x486880, friction: 5 },
  { id: 'volcanic', name: 'Magma Pits', ground: 0x704838, sky: 0xd8a878, accent: 0x381808, friction: 10 },
];

/** Per-biome spawn weights (must sum ~1). Gates by elapsed time still apply in EnemyManager. */
export const BIOME_ENEMY_WEIGHTS = {
  grass: { grunt: 0.42, wisp: 0.18, runner: 0.2, brute: 0.12, elite: 0.04, frostling: 0, ember: 0.04 },
  waste: { grunt: 0.35, wisp: 0.1, runner: 0.22, brute: 0.18, elite: 0.05, frostling: 0, ember: 0.1 },
  frost: { grunt: 0.2, wisp: 0.15, runner: 0.12, brute: 0.1, elite: 0.03, frostling: 0.35, ember: 0.05 },
  volcanic: { grunt: 0.18, wisp: 0.08, runner: 0.15, brute: 0.14, elite: 0.08, frostling: 0.05, ember: 0.32 },
};
