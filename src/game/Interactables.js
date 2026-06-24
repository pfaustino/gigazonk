import * as THREE from 'three';
import {
  ARENA_LOOT_MAX_RADIUS,
  ARENA_LOOT_MIN_RADIUS,
  ARENA_SHRINE_RADIUS,
  ARENA_SIZE,
  CRIT_CHANCE_CAP,
} from './constants.js';
import { isLootSpotClear } from './TerrainFeatures.js';
import { getLootPreview, getShrinePreview, LOOT_REWARD_ICONS } from './UpgradeSystem.js';
import { runRandom } from '../lib/runRandom.js';

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

function pickLoot(table = LOOT_TABLE) {
  const total = table.reduce((s, l) => s + l.weight, 0);
  let roll = runRandom() * total;
  for (const l of table) {
    roll -= l.weight;
    if (roll <= 0) return l;
  }
  return table[0];
}

const MESA_LOOT_TABLE = [
  { weight: 16, type: 'xp', value: 45, label: '+45 XP' },
  { weight: 12, type: 'heal', value: 55, label: 'Heal +55' },
  { weight: 12, type: 'damage', value: 0.15, label: '+15% Damage' },
  { weight: 10, type: 'speed', value: 0.12, label: '+12% Speed' },
  { weight: 10, type: 'coins', value: 18, label: '+18 Zonk Coins' },
  { weight: 8, type: 'maxhp', value: 30, label: '+30 Max HP' },
  { weight: 7, type: 'crit', value: 0.08, label: '+8% Crit' },
  { weight: 6, type: 'area', value: 0.15, label: '+15% Area' },
  { weight: 5, type: 'proj', value: 1, label: '+1 Projectile' },
  { weight: 5, type: 'regen', value: 0.45, label: '+0.45 HP/s' },
  { weight: 4, type: 'lifesteal', value: 0.04, label: '+4% Lifesteal' },
  { weight: 3, type: 'xp_boost', value: 0.12, label: '+12% XP Gain' },
  { weight: 2, type: 'magnet', value: 1, label: 'Instant Magnet!' },
];

export class Interactables {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  reset() {
    for (const item of this.items) {
      this._disposeItemMeshes(item);
    }
    this.items = [];
  }

  _disposeItemMeshes(item) {
    for (const key of ['mesh', 'ringMesh', 'baseMesh']) {
      const m = item[key];
      if (!m) continue;
      this.group.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
      item[key] = null;
    }
  }

  spawnChest(x, z, surfaceY = 0) {
    const geo = new THREE.BoxGeometry(1, 0.8, 0.8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf7c948 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, surfaceY + 0.4, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.items.push({ type: 'chest', mesh, x, z, surfaceY, opened: false, radius: 2 });
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

  spawnMesaBeacon(x, z, surfaceY) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 0.35, 6),
      new THREE.MeshLambertMaterial({ color: 0x553366 })
    );
    base.position.set(x, surfaceY + 0.18, z);
    base.castShadow = true;
    this.group.add(base);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshLambertMaterial({ color: 0xb56cff, emissive: 0x4a2080 })
    );
    crystal.position.set(x, surfaceY + 1.05, z);
    this.group.add(crystal);

    const item = {
      type: 'mesa_beacon',
      mesh: crystal,
      baseMesh: base,
      x,
      z,
      surfaceY,
      radius: 2.5,
      guardian: null,
    };
    this.items.push(item);
    return item;
  }

  spawnMesaCache(x, z, surfaceY) {
    const geo = new THREE.BoxGeometry(1.15, 0.95, 0.95);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0x664400 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, surfaceY + 0.48, z);
    mesh.castShadow = true;
    this.group.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.08, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xffee88 })
    );
    ring.position.set(x, surfaceY + 0.12, z);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    this.items.push({
      type: 'mesa_cache',
      mesh,
      ringMesh: ring,
      x,
      z,
      surfaceY,
      opened: false,
      radius: 2.4,
    });
  }

  _mesaSpot(mesa) {
    const inset = 0.38;
    const maxDx = mesa.w * 0.5 * inset;
    const maxDz = mesa.d * 0.5 * inset;
    return {
      x: mesa.cx + (runRandom() - 0.5) * maxDx * 2,
      z: mesa.cz + (runRandom() - 0.5) * maxDz * 2,
      y: mesa.topY,
    };
  }

  populateMesas(mesas, enemyManager = null, playerDmg = 10) {
    if (!mesas?.length) return;
    let caches = 0;
    let guardians = 0;

    for (const mesa of mesas) {
      const spot = this._mesaSpot(mesa);
      const guardianRoll = runRandom() < 0.55;

      if (guardianRoll && enemyManager) {
        const guardian = enemyManager.spawnMesaGuardian(spot.x, spot.z, playerDmg, mesa);
        if (guardian) {
          const beacon = this.spawnMesaBeacon(spot.x, spot.z, mesa.topY);
          beacon.guardian = guardian;
          guardians++;
          continue;
        }
      }

      this.spawnMesaCache(spot.x, spot.z, mesa.topY);
      caches++;
    }

    return { caches, guardians };
  }

  spawnVillagePortal(x = 0, z = 0) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.22, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x6b4fd4 })
    );
    ring.position.set(x, 1.8, z);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x4a2080, emissive: 0x2a1050 })
    );
    pillar.position.set(x, 1.1, z);
    pillar.castShadow = true;
    this.group.add(pillar);

    this.items.push({ type: 'village_portal', mesh: ring, x, z, radius: 3.2 });
  }

  _pickScatterPoint(bandMin, bandMax, angle) {
    const r = bandMin + runRandom() * (bandMax - bandMin);
    const half = ARENA_SIZE / 2 - 4;
    const x = THREE.MathUtils.clamp(Math.cos(angle) * r, -half, half);
    const z = THREE.MathUtils.clamp(Math.sin(angle) * r, -half, half);
    return { x, z };
  }

  scatterField(_size, count, arena = null) {
    const radialBands = 10;
    const perBand = Math.ceil(count / radialBands);
    let placed = 0;

    for (let band = 0; band < radialBands && placed < count; band++) {
      const bandMin =
        ARENA_LOOT_MIN_RADIUS +
        (band / radialBands) * (ARENA_LOOT_MAX_RADIUS - ARENA_LOOT_MIN_RADIUS);
      const bandMax =
        ARENA_LOOT_MIN_RADIUS +
        ((band + 1) / radialBands) * (ARENA_LOOT_MAX_RADIUS - ARENA_LOOT_MIN_RADIUS);
      const inBand = Math.min(perBand, count - placed);

      for (let i = 0; i < inBand; i++) {
        const baseAngle = (i / inBand) * Math.PI * 2;
        const angle = baseAngle + (runRandom() - 0.5) * ((Math.PI * 2) / inBand);
        let x;
        let z;
        for (let attempt = 0; attempt < 24; attempt++) {
          ({ x, z } = this._pickScatterPoint(bandMin, bandMax, angle));
          if (!arena || isLootSpotClear(x, z, arena.obstacles, arena.mesas)) break;
          ({ x, z } = this._pickScatterPoint(bandMin, bandMax, angle + runRandom() * 0.8));
        }
        if (runRandom() < 0.7) this.spawnPot(x, z);
        else this.spawnChest(x, z);
        placed++;
      }
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

  removeMesaBeaconForGuardian(guardian) {
    const idx = this.items.findIndex(i => i.type === 'mesa_beacon' && i.guardian === guardian);
    if (idx === -1) return;
    this._disposeItemMeshes(this.items[idx]);
    this.items.splice(idx, 1);
  }

  getNearest(px, pz) {
    let nearest = null;
    let minDist = Infinity;
    for (const item of this.items) {
      if (item.type === 'pot' || item.type === 'mesa_beacon') continue;
      if ((item.type === 'chest' && item.opened)
        || (item.type === 'shrine' && item.used)
        || (item.type === 'mesa_cache' && item.opened)) continue;
      const dist = Math.hypot(item.x - px, item.z - pz);
      if (dist < item.radius && dist < minDist) {
        minDist = dist;
        nearest = item;
      }
    }
    return nearest;
  }

  getNearestPot(px, pz) {
    let nearest = null;
    let minDist = Infinity;
    for (const item of this.items) {
      if (item.type !== 'pot' || item.broken) continue;
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
      const levelsGained = this.applyLoot(loot, player, callbacks);
      callbacks.onChest?.();
      return {
        type: 'chest',
        loot,
        preview,
        levelsGained,
        icon: LOOT_REWARD_ICONS[loot.type] || '🎁',
        name: loot.label,
      };
    }

    if (item.type === 'pot' && !item.broken) {
      item.broken = true;
      this.removeMesh(item);
      const loot = pickLoot();
      const preview = getLootPreview(player, loot);
      const levelsGained = this.applyLoot(loot, player, callbacks);
      callbacks.onPot?.();
      return {
        type: 'pot',
        loot,
        preview,
        levelsGained,
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

    if (item.type === 'mesa_cache' && !item.opened) {
      item.opened = true;
      this._disposeItemMeshes(item);
      const loot = pickLoot(MESA_LOOT_TABLE);
      const preview = getLootPreview(player, loot);
      const levelsGained = this.applyLoot(loot, player, callbacks);
      callbacks.onMesaCache?.();
      return {
        type: 'mesa_cache',
        loot,
        preview,
        levelsGained,
        icon: LOOT_REWARD_ICONS[loot.type] || '🏔️',
        name: loot.label,
      };
    }

    if (item.type === 'village_portal') {
      callbacks.onVillagePortal?.();
      return { type: 'village_portal' };
    }

    return null;
  }

  applyLoot(loot, player, callbacks) {
    let levelsGained = 0;
    switch (loot.type) {
      case 'xp':
        levelsGained = player.addXp(loot.value);
        break;
      case 'heal': player.heal(loot.value); break;
      case 'damage': player.damage *= (1 + loot.value); break;
      case 'speed': player.speed *= (1 + loot.value); break;
      case 'coins': callbacks.onCoins?.(loot.value); break;
      case 'magnet':
        player.magnetActive = true;
        setTimeout(() => { player.magnetActive = false; }, 2000);
        break;
      case 'crit':
        player.critChance = Math.min(CRIT_CHANCE_CAP, player.critChance + loot.value);
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
    return levelsGained;
  }

  removeMesh(item) {
    this._disposeItemMeshes(item);
  }

  update(dt, px, pz) {
    const time = Date.now() * 0.004;
    for (const item of this.items) {
      if (!item.mesh) continue;
      const used = (item.type === 'chest' && item.opened)
        || (item.type === 'pot' && item.broken)
        || (item.type === 'shrine' && item.used)
        || (item.type === 'mesa_cache' && item.opened);
      const inRange = !used && Math.hypot(item.x - px, item.z - pz) < item.radius;

      if (item.type === 'mesa_beacon') {
        item.mesh.rotation.y += dt * 1.6;
        item.mesh.position.y = item.surfaceY + 1.05 + Math.sin(time + item.x) * 0.12;
        continue;
      }

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
