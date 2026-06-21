import * as THREE from 'three';
import {
  ARENA_LOOT_MAX_RADIUS,
  ARENA_LOOT_MIN_RADIUS,
  ARENA_SHRINE_RADIUS,
  ARENA_SIZE,
} from './constants.js';
import { isLootSpotClear } from './TerrainFeatures.js';
import { getLootPreview, getShrinePreview, LOOT_REWARD_ICONS } from './UpgradeSystem.js';

const LOOT_TABLE = [
  { weight: 22, type: 'xp', value: 15, label: '+15 XP' },
  { weight: 14, type: 'heal', value: 25, label: 'Heal +25' },
  { weight: 12, type: 'damage', value: 0.1, label: '+10% Damage' },
  { weight: 10, type: 'speed', value: 0.1, label: '+10% Speed' },
  { weight: 8, type: 'coins', value: 5, label: '+5 Zonk Coins' },
  { weight: 8, type: 'magnet', value: 1, label: 'Instant Magnet!' },
  { weight: 6, type: 'crit', value: 0.05, label: '+5% Crit' },
  { weight: 6, type: 'regen', value: 0.25, label: '+0.25 HP/s' },
  { weight: 5, type: 'armor', value: 0.05, label: '+5% Armor' },
  { weight: 5, type: 'evasion', value: 0.05, label: '+5% Evasion' },
  { weight: 4, type: 'lifesteal', value: 0.02, label: '+2% Lifesteal' },
  { weight: 4, type: 'maxhp', value: 15, label: '+15 Max HP' },
  { weight: 3, type: 'area', value: 0.1, label: '+10% Area' },
  { weight: 2, type: 'proj', value: 1, label: '+1 Projectile' },
  { weight: 2, type: 'xp_boost', value: 0.05, label: '+5% XP Gain' },
];

function pickLoot() {
  const total = LOOT_TABLE.reduce((s, l) => s + l.weight, 0);
  let roll = Math.random() * total;
  for (const l of LOOT_TABLE) {
    roll -= l.weight;
    if (roll <= 0) return l;
  }
  return LOOT_TABLE[0];
}

export class Interactables {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  reset() {
    for (const item of this.items) {
      this.group.remove(item.mesh);
      item.mesh.geometry?.dispose();
      item.mesh.material?.dispose();
    }
    this.items = [];
  }

  spawnChest(x, z) {
    const geo = new THREE.BoxGeometry(1, 0.8, 0.8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf7c948 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.4, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.items.push({ type: 'chest', mesh, x, z, opened: false, radius: 2 });
  }

  spawnPot(x, z) {
    const geo = new THREE.CylinderGeometry(0.4, 0.5, 0.7, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xcc8844 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.35, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.items.push({ type: 'pot', mesh, x, z, broken: false, radius: 1.5 });
  }

  spawnShrine(x, z) {
    const geo = new THREE.ConeGeometry(0.6, 1.5, 6);
    const mat = new THREE.MeshLambertMaterial({ color: 0x9b59f5, emissive: 0x4a2080 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.75, z);
    this.group.add(mesh);
    this.items.push({ type: 'shrine', mesh, x, z, used: false, radius: 2.5 });
  }

  _randomScatterPoint(minR, maxR) {
    const angle = Math.random() * Math.PI * 2;
    const r = minR + Math.random() * (maxR - minR);
    const half = ARENA_SIZE / 2 - 4;
    const x = THREE.MathUtils.clamp(Math.cos(angle) * r, -half, half);
    const z = THREE.MathUtils.clamp(Math.sin(angle) * r, -half, half);
    return { x, z };
  }

  scatterField(_size, count, arena = null) {
    for (let i = 0; i < count; i++) {
      let x;
      let z;
      for (let attempt = 0; attempt < 32; attempt++) {
        ({ x, z } = this._randomScatterPoint(ARENA_LOOT_MIN_RADIUS, ARENA_LOOT_MAX_RADIUS));
        if (!arena || isLootSpotClear(x, z, arena.obstacles, arena.mesas)) break;
      }
      if (Math.random() < 0.7) this.spawnPot(x, z);
      else this.spawnChest(x, z);
    }
    const shrineCount = 3;
    for (let i = 0; i < shrineCount; i++) {
      const angle = (i / shrineCount) * Math.PI * 2;
      this.spawnShrine(
        Math.cos(angle) * ARENA_SHRINE_RADIUS,
        Math.sin(angle) * ARENA_SHRINE_RADIUS
      );
    }
  }

  getNearest(px, pz) {
    let nearest = null;
    let minDist = Infinity;
    for (const item of this.items) {
      if ((item.type === 'chest' && item.opened) || (item.type === 'pot' && item.broken) || (item.type === 'shrine' && item.used)) continue;
      const dist = Math.hypot(item.x - px, item.z - pz);
      if (dist < item.radius && dist < minDist) {
        minDist = dist;
        nearest = item;
      }
    }
    return nearest;
  }

  interact(item, player, callbacks) {
    if (!item) return null;

    if (item.type === 'chest' && !item.opened) {
      item.opened = true;
      this.removeMesh(item);
      const loot = pickLoot();
      const preview = getLootPreview(player, loot);
      this.applyLoot(loot, player, callbacks);
      callbacks.onChest?.();
      return {
        type: 'chest',
        loot,
        preview,
        icon: LOOT_REWARD_ICONS[loot.type] || '🎁',
        name: loot.label,
      };
    }

    if (item.type === 'pot' && !item.broken) {
      item.broken = true;
      this.removeMesh(item);
      const loot = pickLoot();
      const preview = getLootPreview(player, loot);
      this.applyLoot(loot, player, callbacks);
      callbacks.onPot?.();
      return {
        type: 'pot',
        loot,
        preview,
        icon: LOOT_REWARD_ICONS[loot.type] || '🏺',
        name: loot.label,
      };
    }

    if (item.type === 'shrine' && !item.used) {
      item.used = true;
      item.mesh.material.emissive.setHex(0x000000);
      const sacrifice = Math.floor(player.maxHp * 0.15);
      const preview = getShrinePreview(player, sacrifice);
      player.hp -= sacrifice;
      player.damage *= 1.25;
      player.attackRate *= 1.15;
      callbacks.onShrine?.();
      return {
        type: 'shrine',
        preview,
        icon: '🛕',
        name: 'Ascension',
        label: `Sacrificed ${sacrifice} HP for power!`,
      };
    }

    return null;
  }

  applyLoot(loot, player, callbacks) {
    switch (loot.type) {
      case 'xp': player.addXp(loot.value); break;
      case 'heal': player.heal(loot.value); break;
      case 'damage': player.damage *= (1 + loot.value); break;
      case 'speed': player.speed *= (1 + loot.value); break;
      case 'coins': callbacks.onCoins?.(loot.value); break;
      case 'magnet':
        player.magnetActive = true;
        setTimeout(() => { player.magnetActive = false; }, 2000);
        break;
      case 'crit':
        player.critChance = Math.min(0.75, player.critChance + loot.value);
        break;
      case 'regen':
        player.hpRegen += loot.value;
        break;
      case 'armor':
        player.armor = Math.min(0.5, player.armor + loot.value);
        break;
      case 'evasion':
        player.evasion = Math.min(0.75, player.evasion + loot.value);
        break;
      case 'lifesteal':
        player.lifesteal += loot.value;
        break;
      case 'maxhp':
        player.maxHp += loot.value;
        player.hp += loot.value;
        break;
      case 'area':
        player.area *= (1 + loot.value);
        break;
      case 'proj':
        player.projectileCount += loot.value;
        break;
      case 'xp_boost':
        player.runXpMult += loot.value;
        break;
    }
  }

  removeMesh(item) {
    if (!item.mesh) return;
    this.group.remove(item.mesh);
    item.mesh.geometry?.dispose();
    item.mesh.material?.dispose();
    item.mesh = null;
  }

  update(dt, px, pz) {
    const time = Date.now() * 0.004;
    for (const item of this.items) {
      if (!item.mesh) continue;
      const used = (item.type === 'chest' && item.opened)
        || (item.type === 'pot' && item.broken)
        || (item.type === 'shrine' && item.used);
      const inRange = !used && Math.hypot(item.x - px, item.z - pz) < item.radius;

      if (inRange) {
        item.mesh.rotation.x = Math.sin(time + item.x) * 0.45;
        item.mesh.rotation.z = Math.cos(time * 0.9 + item.z) * 0.35;
        item.mesh.rotation.y += dt * 2.8;
      } else {
        item.mesh.rotation.x *= 0.82;
        item.mesh.rotation.z *= 0.82;
        if (Math.abs(item.mesh.rotation.x) < 0.02) item.mesh.rotation.x = 0;
        if (Math.abs(item.mesh.rotation.z) < 0.02) item.mesh.rotation.z = 0;
      }
    }
  }
}
