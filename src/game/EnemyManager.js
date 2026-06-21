import * as THREE from 'three';
import { ENEMY_TYPES } from './constants.js';
import {
  ENEMY_MESH_CAPS,
  buildEnemyGeometry,
  createEnemyMaterial,
} from './EntityVisuals.js';

const dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.count = 0;
    this.enemies = [];
    this.spatialCell = 8;
    this.grid = new Map();
    this.spawnTimer = 0;

    this.meshes = {};
    this.freeSlots = {};

    for (const type of Object.keys(ENEMY_TYPES)) {
      const cap = ENEMY_MESH_CAPS[type] || 100;
      const geo = buildEnemyGeometry(type);
      const mat = createEnemyMaterial();
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.userData.enemyType = type;
      scene.add(mesh);
      this.meshes[type] = mesh;
      this.freeSlots[type] = [];
      for (let i = cap - 1; i >= 0; i--) this.freeSlots[type].push(i);
    }
  }

  reset() {
    this.count = 0;
    this.enemies = [];
    this.grid.clear();
    this.spawnTimer = 0;
    for (const type of Object.keys(this.meshes)) {
      const cap = ENEMY_MESH_CAPS[type] || 100;
      this.freeSlots[type] = [];
      for (let i = cap - 1; i >= 0; i--) this.freeSlots[type].push(i);
      this.meshes[type].count = 0;
    }
  }

  _meshFor(enemy) {
    return this.meshes[enemy.type] || this.meshes.grunt;
  }

  spawn(type, x, z, playerDmg = 10, hpMult = 1, speedMult = 1) {
    const pool = this.freeSlots[type];
    if (!pool || pool.length === 0) return null;

    const def = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
    const hits = def.hpHits ?? 1.25;
    const maxHp = Math.max(1, playerDmg * hits * hpMult);
    const slot = pool.pop();
    const enemy = {
      slot,
      type,
      x, z,
      hp: maxHp,
      maxHp,
      speed: def.speed * speedMult,
      damage: def.damage * hpMult,
      xp: def.xp,
      color: def.color,
      scale: def.scale,
      slowTimer: 0,
      burnTimer: 0,
      hpBarVisible: false,
      alive: true,
    };
    this.enemies.push(enemy);
    this.count++;
    this.updateInstance(enemy);
    return enemy;
  }

  updateInstance(enemy) {
    const mesh = this._meshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    if (!enemy.alive) {
      dummy.scale.set(0, 0, 0);
    } else {
      dummy.position.set(enemy.x, 0.9 * enemy.scale, enemy.z);
      dummy.scale.set(enemy.scale, enemy.scale, enemy.scale);
      dummy.rotation.y = Date.now() * 0.003 + enemy.slot;
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    mesh.setColorAt(enemy.slot, _color.setHex(enemy.color));
    mesh.count = Math.max(mesh.count, enemy.slot + 1);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  rebuildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const key = `${Math.floor(e.x / this.spatialCell)},${Math.floor(e.z / this.spatialCell)}`;
      if (!this.grid.has(key)) this.grid.set(key, []);
      this.grid.get(key).push(e);
    }
  }

  getNearby(x, z, radius) {
    const results = [];
    const r = Math.ceil(radius / this.spatialCell);
    const cx = Math.floor(x / this.spatialCell);
    const cz = Math.floor(z / this.spatialCell);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cell = this.grid.get(`${cx + dx},${cz + dz}`);
        if (!cell) continue;
        for (const e of cell) {
          const dist = Math.hypot(e.x - x, e.z - z);
          if (dist < radius) results.push({ enemy: e, dist });
        }
      }
    }
    return results;
  }

  update(dt, playerPos) {
    this.rebuildGrid();

    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.hp -= 5 * dt;
        if (e.hp <= 0) { this.killEnemy(e); continue; }
      }
      if (e.slowTimer > 0) e.slowTimer -= dt;

      const slowMult = e.slowTimer > 0 ? 0.5 : 1;
      const dx = playerPos.x - e.x;
      const dz = playerPos.z - e.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.1) {
        e.x += (dx / dist) * e.speed * slowMult * dt;
        e.z += (dz / dist) * e.speed * slowMult * dt;
      }
      this.updateInstance(e);
    }
  }

  killEnemy(enemy) {
    if (!enemy.alive) return null;
    enemy.alive = false;
    this.count--;
    const xp = enemy.xp;
    const pos = { x: enemy.x, z: enemy.z };
    const mesh = this._meshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    this.freeSlots[enemy.type].push(enemy.slot);
    return { xp, pos, isBoss: enemy.isBoss };
  }

  damageEnemy(enemy, amount, element) {
    if (!enemy.alive || amount <= 0) return null;
    enemy.hpBarVisible = true;
    enemy.hp -= amount;
    if (element === 'fire') enemy.burnTimer = 3;
    if (element === 'ice') enemy.slowTimer = 2;
    if (enemy.hp <= 0) return this.killEnemy(enemy);
    return null;
  }

  checkPlayerCollision(px, pz, radius = 0.8, diffMult = 1) {
    const nearby = this.getNearby(px, pz, radius + 1);
    let totalDamage = 0;
    for (const { enemy } of nearby) {
      if (enemy.alive && Math.hypot(enemy.x - px, enemy.z - pz) < radius + enemy.scale * 0.4) {
        totalDamage += enemy.damage * diffMult;
      }
    }
    return totalDamage;
  }

  spawnWave(playerPos, elapsed, inRift, diffMult = 1, dt = 0, hpMultBonus = 1, playerDmg = 10) {
    const baseInterval = 3;
    const minInterval = 0.55;
    const ramp = 1 + elapsed * 0.015;
    const interval = Math.max(
      minInterval,
      baseInterval / ramp / (inRift ? 1.35 : 1) / Math.sqrt(diffMult)
    );

    this.spawnTimer += dt;
    if (this.spawnTimer < interval || this.count >= 790) return;
    this.spawnTimer -= interval;

    const minDist = 12;
    const maxDist = 22;
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;

    const roll = Math.random();
    let type = 'grunt';
    if (elapsed > 60 && roll < 0.15) type = 'runner';
    if (elapsed > 120 && roll < 0.08) type = 'brute';
    if (elapsed > 30 && roll < 0.25) type = 'wisp';
    if (elapsed > 180 && roll < 0.03) type = 'elite';

    if (!this.freeSlots[type]?.length) {
      const fallback = Object.keys(this.freeSlots).find(t => this.freeSlots[t].length > 0);
      if (!fallback) return;
      type = fallback;
    }

    const timeHpBonus = 1 + elapsed * 0.002;
    const hpMult = timeHpBonus * diffMult * hpMultBonus;
    const speedMult = (1 + elapsed * 0.002) * (1 + (diffMult - 1) * 0.3);
    this.spawn(type, x, z, playerDmg, hpMult, speedMult);
  }

  spawnBoss(x, z, playerDmg = 10) {
    const boss = this.spawn('elite', x, z, playerDmg, 1, 0.8);
    if (boss) {
      const bossHits = 35;
      boss.hp = playerDmg * bossHits;
      boss.maxHp = boss.hp;
      boss.damage = 35;
      boss.xp = 100;
      boss.scale = 2.5;
      boss.isBoss = true;
      this.updateInstance(boss);
    }
    return boss;
  }

  get aliveCount() {
    return this.count;
  }
}
