export const ARENA_SIZE = 120;
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
  pickupRadius: 3,
  magnetRadius: 8,
  critChance: 0.05,
  area: 1,
};

export const ENEMY_TYPES = {
  grunt: { hpHits: 1.25, speed: 2, damage: 8, xp: 3, color: 0x44aa44, scale: 0.8 },
  runner: { hpHits: 1.0, speed: 4, damage: 5, xp: 2, color: 0xaaaa22, scale: 0.6 },
  brute: { hpHits: 3.5, speed: 1.4, damage: 20, xp: 12, color: 0xaa4444, scale: 1.4 },
  wisp: { hpHits: 0.85, speed: 3, damage: 3, xp: 1, color: 0x44aaff, scale: 0.5 },
  elite: { hpHits: 6, speed: 1.75, damage: 25, xp: 25, color: 0xff44ff, scale: 1.6 },
};

export const MAX_ENEMIES = 800;
export const MAX_PROJECTILES = 200;
export const MAX_GEMS = 500;

export const UPGRADES = [
  { id: 'proj_count', name: 'Multi-Zonk', icon: '🔫', desc: '+1 projectile', effect: { projectileCount: 1 } },
  { id: 'proj_pierce', name: 'Pierce Zonk', icon: '🏹', desc: 'Projectiles penetrate +1 enemy (max 5)', effect: { pierce: 1 } },
  { id: 'proj_power', name: 'Power Zonk', icon: '💥', desc: '+25% damage', effect: { damageMult: 0.25 } },
  { id: 'proj_speed', name: 'Rapid Zonk', icon: '⚡', desc: '+20% attack speed', effect: { attackRateMult: 0.2 } },
  { id: 'move_speed', name: 'Swift Zonk', icon: '👟', desc: '+15% move speed', effect: { speedMult: 0.15 } },
  { id: 'double_jump', name: 'Air Zonk', icon: '🦘', desc: '+1 mid-air boost jump (max 5)', effect: { doubleJump: 1 } },
  { id: 'max_hp', name: 'Thick Skin', icon: '❤️', desc: '+20 max HP & heal', effect: { maxHp: 20, heal: 20 } },
  { id: 'pickup', name: 'Magnet Heart', icon: '🧲', desc: '+50% pickup radius', effect: { pickupMult: 0.5 } },
  { id: 'area', name: 'Blast Radius', icon: '💫', desc: '+20% projectile size & AoE', effect: { areaMult: 0.2 } },
  { id: 'crit', name: 'Lucky Strike', icon: '🎯', desc: '+10% crit chance', effect: { critChance: 0.1 } },
  { id: 'fire', name: 'Flame Zonk', icon: '🔥', desc: 'Fire element — burn damage', effect: { element: 'fire' } },
  { id: 'ice', name: 'Frost Zonk', icon: '❄️', desc: 'Ice element — slow enemies', effect: { element: 'ice' } },
  { id: 'lightning', name: 'Storm Zonk', icon: '⚡', desc: 'Lightning — chain hits', effect: { element: 'lightning' } },
  { id: 'orbit', name: 'Zonk Familiar', icon: '🌀', desc: '+1 orbiting familiar', effect: { familiars: 1 } },
  { id: 'lifesteal', name: 'Vampiric Zonk', icon: '🩸', desc: 'Heal 5% of damage dealt', effect: { lifesteal: 0.05 } },
  { id: 'thorn', name: 'Thorn Aura', icon: '🌵', desc: 'Damage nearby enemies', effect: { thorns: 8 } },
];

export const SHOP_ITEMS = [
  { id: 'meta_damage', name: 'Sharpened Blades', desc: '+5% base damage (permanent)', cost: 50, effect: { metaDamage: 0.05 } },
  { id: 'meta_hp', name: 'Iron Constitution', desc: '+10 base HP (permanent)', cost: 40, effect: { metaHp: 10 } },
  { id: 'meta_speed', name: 'Light Boots', desc: '+5% base speed (permanent)', cost: 45, effect: { metaSpeed: 0.05 } },
  { id: 'meta_xp', name: 'Scholar Tome', desc: '+10% XP gain (permanent)', cost: 60, effect: { metaXp: 0.1 } },
  { id: 'meta_start_level', name: 'Head Start', desc: 'Begin runs at level 2', cost: 100, effect: { startLevel: 1 } },
  { id: 'meta_magnet', name: 'Silver Magnet', desc: '+2 pickup radius (permanent)', cost: 35, effect: { metaPickup: 2 } },
];

export const QUESTS = [
  { id: 'kill_50', desc: 'Slay 50 monsters', target: 50, type: 'kills', reward: 30 },
  { id: 'kill_200', desc: 'Slay 200 monsters', target: 200, type: 'kills', reward: 80 },
  { id: 'chests_3', desc: 'Open 3 chests', target: 3, type: 'chests', reward: 25 },
  { id: 'pots_10', desc: 'Break 10 pots', target: 10, type: 'pots', reward: 20 },
  { id: 'survive_5', desc: 'Survive 5 minutes', target: 300, type: 'time', reward: 50 },
  { id: 'level_10', desc: 'Reach level 10', target: 10, type: 'level', reward: 60 },
  { id: 'boss_1', desc: 'Defeat a Zonk Lord', target: 1, type: 'bosses', reward: 100 },
  { id: 'rift_1', desc: 'Enter a Zonk Rift', target: 1, type: 'rifts', reward: 40 },
];

export const SYNERGY_ELEMENTS = ['fire', 'ice', 'lightning'];
export const SYNERGY_NAME = 'Tri-Zonk Nova';

export const VILLAGE_NPCS = [
  { id: 'questgiver', name: 'Elder Zonka', role: 'Quests', pos: [-15, 0, -10], color: 0x6b4fd4 },
  { id: 'merchant', name: 'Merchant Bonk', role: 'Shop', pos: [15, 0, -10], color: 0xf7c948 },
  { id: 'portal', name: 'Arena Portal', role: 'Enter Arena', pos: [0, 0, 20], color: 0xff6b35 },
];

export const CHARACTERS = [
  {
    id: 'fox',
    name: 'Zonka Fox',
    icon: '🦊',
    desc: 'Nimble trickster. Blazing speed and rapid attacks.',
    color: 0xff8844,
    unlockCost: 0,
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
    mods: { speedMult: 1.05, hpMult: 1.1, damageMult: 1.15, lifesteal: 0.03, comboMult: 2 },
    startElement: null,
  },
];

export const BIOMES = [
  { id: 'grass', name: 'Zonk Meadows', ground: 0x4a8a48, fog: 0x1a3020, accent: 0x3a6b35, friction: 26 },
  { id: 'waste', name: 'Bonk Wastes', ground: 0xb89a72, fog: 0x2a2018, accent: 0xa08060, friction: 24 },
  { id: 'frost', name: 'Frost Zonk', ground: 0xd8eeff, fog: 0x1a2838, accent: 0x88bbdd, friction: 7 },
  { id: 'volcanic', name: 'Magma Pits', ground: 0x3a2018, fog: 0x2a1008, accent: 0x883311, friction: 14 },
];
