import fs from 'node:fs';
import { RARITIES, UPGRADE_TEMPLATES } from '../src/game/Awards.js';

const enemies = {
  gruntColors: [
    '#f04e45', '#ff8a3d', '#4da6ff', '#5b6dff', '#b84dff', '#ff5ecf',
    '#ffd93d', '#7bdc5c', '#5cb86a', '#ffaad5', '#e8e4dc', '#d4b896',
  ],
  types: {
    grunt: { hpHits: 1.25, speed: 2, damage: 8, xp: 3, color: '#f04e45', scale: 0.8, hpBarTop: 1.12 },
    runner: { hpHits: 1.0, speed: 4, damage: 5, xp: 2, color: '#aaaa22', scale: 0.6, hpBarTop: 0.95 },
    brute: { hpHits: 3.5, speed: 1.4, damage: 20, xp: 12, color: '#aa4444', scale: 1.4, hpBarTop: 1.48 },
    wisp: { hpHits: 0.85, speed: 3, damage: 3, xp: 1, color: '#44aaff', scale: 0.5, hpBarTop: 0.78 },
    elite: { hpHits: 6, speed: 1.75, damage: 25, xp: 25, color: '#ff44ff', scale: 1.6, hpBarTop: 1.85 },
  },
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/enemies.json', JSON.stringify(enemies, null, 2));
fs.writeFileSync('data/upgrades.json', JSON.stringify({ rarities: RARITIES, templates: UPGRADE_TEMPLATES }, null, 2));
console.log('data files written');
