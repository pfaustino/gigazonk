import * as THREE from 'three';
import {
  ENEMY_TYPES,
  BASE_SPAWN_GROUP_SIZE,
  GROUP_CLUSTER_RADIUS,
  ARENA_SIZE,
  MAX_ENEMIES,
  ENEMY_SOFT_CAP,
  ENEMY_DESPAWN_DISTANCE,
  ENEMY_DESPAWN_BATCH,
  ENEMY_NEAR_RADIUS,
  MAX_SPAWN_GROUP_SIZE,
  MAX_GIGA_GROUP_SIZE,
  MESA_GUARDIAN_HP_HITS,
  ENEMY_MESH_LIFT,
  pickGruntColor,
  BIOME_ENEMY_WEIGHTS,
} from './constants.js';
import { runRandom, runRandomInt } from '../lib/runRandom.js';
import { assert } from '../lib/assert.js';
import {
  ENEMY_MESH_CAPS,
  buildEnemyGeometry,
  createEnemyMaterial,
} from './EntityVisuals.js';
import { isOnMesaPlateau } from './TerrainFeatures.js';

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
    this._deadSinceCompact = 0;
    this._threatDmg = 10;
    this.biomeId = 'grass';

    this.meshes = {};
    this.freeSlots = {};
    this._dirtyMeshes = new Set();

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
    this._deadSinceCompact = 0;
    this._threatDmg = 10;
    this.lastGroupAnchor = null;
    this._dirtyMeshes.clear();
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

  _markDirty(mesh) {
    this._dirtyMeshes.add(mesh);
  }

  _flushInstances() {
    for (const mesh of this._dirtyMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this._dirtyMeshes.clear();
  }

  setThreatDamage(dmg) {
    this._threatDmg = Math.max(1, dmg);
  }

  _applyMesaGuardianHp(enemy) {
    if (!enemy?.isMesaGuardian || enemy._hpScaled) return;
    enemy._hpScaled = true;
    const hp = Math.max(1, this._threatDmg * MESA_GUARDIAN_HP_HITS);
    enemy.hp = hp;
    enemy.maxHp = hp;
    enemy.hpBarVisible = false;
    this.updateInstance(enemy);
  }

  spawn(type, x, z, threatDmg = 10, hpMult = 1, speedMult = 1) {
    const pool = this.freeSlots[type];
    if (!pool || pool.length === 0) return null;

    const def = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
    const hits = def.hpHits ?? 1.25;
    const maxHp = Math.max(1, threatDmg * hits * hpMult);
    const slot = pool.pop();
    assert(slot !== undefined && slot >= 0, 'ENEMY_SLOT_INVALID');
    const enemy = {
      slot,
      type,
      x, z,
      hp: maxHp,
      maxHp,
      speed: def.speed * speedMult,
      damage: def.damage * hpMult,
      xp: def.xp,
      color: type === 'grunt' ? pickGruntColor() : def.color,
      scale: def.scale,
      slowTimer: 0,
      burnTimer: 0,
      hpBarVisible: false,
      alive: true,
      feetY: null,
      airborne: false,
      verticalVel: 0,
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
      dummy.position.set(enemy.x, ENEMY_MESH_LIFT * enemy.scale + (enemy.groundY || 0), enemy.z);
      dummy.scale.set(enemy.scale, enemy.scale, enemy.scale);
      dummy.rotation.y = Date.now() * 0.003 + enemy.slot;
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    mesh.setColorAt(enemy.slot, _color.setHex(enemy.color));
    mesh.count = Math.max(mesh.count, enemy.slot + 1);
    this._markDirty(mesh);
  }

  rebuildGrid() {
    if (this._deadSinceCompact >= 40) {
      this.enemies = this.enemies.filter(e => e.alive);
      this._deadSinceCompact = 0;
    }
    for (const arr of this.grid.values()) {
      arr.length = 0;
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const cx = Math.floor(e.x / this.spatialCell);
      const cz = Math.floor(e.z / this.spatialCell);
      const key = cx * 10000 + cz;
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(e);
    }
  }

  getNearby(x, z, radius) {
    const results = [];
    const r = Math.ceil(radius / this.spatialCell);
    const cx = Math.floor(x / this.spatialCell);
    const cz = Math.floor(z / this.spatialCell);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cell = this.grid.get((cx + dx) * 10000 + (cz + dz));
        if (!cell) continue;
        for (const e of cell) {
          const dist = Math.hypot(e.x - x, e.z - z);
          if (dist < radius) results.push({ enemy: e, dist });
        }
      }
    }
    return results;
  }

  _getEnemyFeetY(enemy, terrain, x, z) {
    const surfaceY = terrain?.getGroundHeight?.(x, z) ?? 0;
    if (enemy.airborne) return enemy.feetY ?? surfaceY;
    if (enemy.feetY == null || enemy.feetY < surfaceY - 0.1) return surfaceY;
    return enemy.feetY;
  }

  _canEnemyStep(enemy, fromX, fromZ, toX, toZ, terrain) {
    if (terrain?.canTraverse && !terrain.canTraverse(fromX, fromZ, toX, toZ)) {
      return false;
    }
    if (!terrain?.getGroundHeight) return true;

    const feet = this._getEnemyFeetY(enemy, terrain, fromX, fromZ);
    const toH = terrain.getGroundHeight(toX, toZ);
    if (!enemy.airborne && feet > toH + 0.55) {
      enemy.airborne = true;
      enemy.verticalVel = 0;
      return false;
    }
    return true;
  }

  _moveEnemyOnTerrain(enemy, moveX, moveZ, terrain) {
    const startX = enemy.x;
    const startZ = enemy.z;
    const total = Math.hypot(moveX, moveZ);
    if (total < 0.0001) return;

    const maxStep = 0.28;
    const steps = Math.max(1, Math.ceil(total / maxStep));
    let lastX = startX;
    let lastZ = startZ;

    for (let s = 1; s <= steps; s++) {
      const targetX = startX + moveX * (s / steps);
      const targetZ = startZ + moveZ * (s / steps);
      if (!this._canEnemyStep(enemy, lastX, lastZ, targetX, targetZ, terrain)) {
        break;
      }
      lastX = targetX;
      lastZ = targetZ;
    }

    if (lastX === startX && lastZ === startZ && terrain) {
      const endX = startX + moveX;
      const endZ = startZ + moveZ;
      if (this._canEnemyStep(enemy, startX, startZ, endX, startZ, terrain)) lastX = endX;
      else if (this._canEnemyStep(enemy, startX, startZ, startX, endZ, terrain)) lastZ = endZ;
    }

    enemy.x = lastX;
    enemy.z = lastZ;
  }

  _updateEnemyVertical(enemy, terrain, dt) {
    const terrainY = terrain?.getGroundHeight?.(enemy.x, enemy.z) ?? 0;
    if (enemy.feetY == null) enemy.feetY = terrainY;

    if (enemy.airborne) {
      enemy.verticalVel -= 28 * dt;
      enemy.feetY += enemy.verticalVel * dt;
      if (enemy.feetY <= terrainY + 0.05) {
        enemy.feetY = terrainY;
        enemy.airborne = false;
        enemy.verticalVel = 0;
      }
    } else if (enemy.feetY > terrainY + 0.55) {
      enemy.airborne = true;
      enemy.verticalVel = 0;
    } else if (enemy.feetY == null || enemy.feetY <= terrainY + 0.55) {
      enemy.feetY = terrainY;
    }

    enemy.groundY = enemy.feetY;
  }

  _despawnEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    this.count--;
    this._deadSinceCompact++;
    const mesh = this._meshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    this._markDirty(mesh);
    this.freeSlots[enemy.type].push(enemy.slot);
  }

  _cullDistant(playerPos) {
    let culled = 0;
    for (const e of this.enemies) {
      if (!e.alive || e.isBoss) continue;
      const dist = Math.hypot(e.x - playerPos.x, e.z - playerPos.z);
      if (dist <= ENEMY_DESPAWN_DISTANCE) continue;
      this._despawnEnemy(e);
      culled++;
      if (culled >= ENEMY_DESPAWN_BATCH) break;
    }
  }

  _pressureSpawnScale() {
    if (this.count <= ENEMY_SOFT_CAP) return 1;
    const over = (this.count - ENEMY_SOFT_CAP) / (MAX_ENEMIES - ENEMY_SOFT_CAP);
    return Math.max(0.12, 1 - over * 0.88);
  }

  update(dt, playerPos, terrain = null) {
    this.rebuildGrid();
    this._cullDistant(playerPos);

    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.hpBarVisible = true;
        e.hp -= 5 * dt;
        if (e.hp <= 0) { this.killEnemy(e); continue; }
      }
      if (e.slowTimer > 0) e.slowTimer -= dt;

      const slowMult = e.slowTimer > 0 ? 0.5 : 1;
      const dx = playerPos.x - e.x;
      const dz = playerPos.z - e.z;
      const dist = Math.hypot(dx, dz);
      const near = dist <= ENEMY_NEAR_RADIUS;

      if (e.isMesaGuardian && e.mesa) {
        if (!e.mesaAwake) {
          const wake = isOnMesaPlateau(playerPos.x, playerPos.z, e.mesa);
          if (wake) {
            e.mesaAwake = true;
            this._applyMesaGuardianHp(e);
          }
        }
      }
      const mesaGuardianIdle = e.isMesaGuardian && e.mesa && !e.mesaAwake;

      if (!mesaGuardianIdle && dist > 0.1) {
        const moveX = (dx / dist) * e.speed * slowMult * dt;
        const moveZ = (dz / dist) * e.speed * slowMult * dt;
        if (near) {
          this._moveEnemyOnTerrain(e, moveX, moveZ, terrain);
        } else {
          e.x += moveX;
          e.z += moveZ;
        }
      }

      if (near && terrain?.resolveObstacleCollision) {
        const prevX = e.x;
        const prevZ = e.z;
        // Always use ground-level collision for enemies so mesa side walls keep them on the plateau.
        const resolved = terrain.resolveObstacleCollision(e.x, e.z, e.scale * 0.42, 0);
        if (
          !terrain.canTraverse
          || terrain.canTraverse(prevX, prevZ, resolved.x, resolved.z)
        ) {
          e.x = resolved.x;
          e.z = resolved.z;
        }
      }

      if (near) {
        this._updateEnemyVertical(e, terrain, dt);
      } else {
        const terrainY = terrain?.getGroundHeight?.(e.x, e.z) ?? 0;
        e.feetY = terrainY;
        e.groundY = terrainY;
        e.airborne = false;
        e.verticalVel = 0;
      }

      this.updateInstance(e);
    }
    this._flushInstances();
  }

  killEnemy(enemy) {
    if (!enemy.alive) return null;
    enemy.alive = false;
    this.count--;
    this._deadSinceCompact++;
    const xp = enemy.xp;
    const pos = { x: enemy.x, z: enemy.z, y: enemy.groundY ?? enemy.feetY ?? 0 };
    const mesh = this._meshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    this._markDirty(mesh);
    this.freeSlots[enemy.type].push(enemy.slot);
    this._flushInstances();
    return { xp, pos, isBoss: enemy.isBoss };
  }

  damageEnemy(enemy, amount, element) {
    if (!enemy.alive || amount <= 0) return null;
    if (enemy.isMesaGuardian) this._applyMesaGuardianHp(enemy);
    enemy.hpBarVisible = true;
    enemy.hp -= amount;
    if (element === 'fire') enemy.burnTimer = 3;
    if (element === 'ice') enemy.slowTimer = 2;
    if (element === 'lightning') enemy.slowTimer = Math.max(enemy.slowTimer, 0.45);
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

  setBiome(biomeId) {
    this.biomeId = biomeId || 'grass';
  }

  _pickEnemyType(elapsed) {
    const weights = BIOME_ENEMY_WEIGHTS[this.biomeId] || BIOME_ENEMY_WEIGHTS.grass;
    const pool = [];
    for (const [type, weight] of Object.entries(weights)) {
      if (!weight || !ENEMY_TYPES[type] || !this.freeSlots[type]?.length) continue;
      if (type === 'elite' && elapsed <= 180) continue;
      if (type === 'brute' && elapsed <= 120) continue;
      if (type === 'runner' && elapsed <= 60) continue;
      if (type === 'wisp' && elapsed <= 30) continue;
      if (type === 'frostling' && elapsed <= 45) continue;
      if (type === 'ember' && elapsed <= 45) continue;
      pool.push({ type, weight });
    }
    if (pool.length === 0) return this._resolveType('grunt');

    let roll = runRandom();
    let total = pool.reduce((s, p) => s + p.weight, 0);
    for (const entry of pool) {
      roll -= entry.weight / total;
      if (roll <= 0) return this._resolveType(entry.type);
    }
    return this._resolveType(pool[pool.length - 1].type);
  }

  _resolveType(type) {
    if (this.freeSlots[type]?.length) return type;
    const fallback = Object.keys(this.freeSlots).find(t => this.freeSlots[t].length > 0);
    return fallback || type;
  }

  _getGroupSize(elapsed, isGigaspawn) {
    const base = Math.min(MAX_SPAWN_GROUP_SIZE, BASE_SPAWN_GROUP_SIZE + Math.floor(elapsed / 65));
    let size = base;
    if (isGigaspawn) {
      const mult = 2 + runRandomInt(2);
      size = Math.min(MAX_GIGA_GROUP_SIZE, base * mult);
    }
    const pressure = this._pressureSpawnScale();
    return Math.max(1, Math.floor(size * pressure));
  }

  _spawnCluster(anchorX, anchorZ, count, type, playerDmg, hpMult, speedMult) {
    type = this._resolveType(type);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      if (this.count >= MAX_ENEMIES) break;
      const angle = runRandom() * Math.PI * 2;
      const r = runRandom() * GROUP_CLUSTER_RADIUS;
      const x = anchorX + Math.cos(angle) * r;
      const z = anchorZ + Math.sin(angle) * r;
      if (this.spawn(type, x, z, playerDmg, hpMult, speedMult)) spawned++;
    }
    return spawned;
  }

  spawnWave(playerPos, elapsed, inRift, diffMult = 1, dt = 0, hpMultBonus = 1, playerDmg = 10, isGigaspawn = false) {
    this._cullDistant(playerPos);

    const baseInterval = 3;
    const minInterval = 0.7;
    const ramp = 1 + elapsed * 0.012;
    let interval = Math.max(
      minInterval,
      baseInterval / ramp / (inRift ? 1.35 : 1) / Math.sqrt(diffMult)
    );
    if (this.count > ENEMY_SOFT_CAP) {
      const over = (this.count - ENEMY_SOFT_CAP) / (MAX_ENEMIES - ENEMY_SOFT_CAP);
      interval *= 1 + over * 3.5;
    }

    this.spawnTimer += dt;
    if (this.spawnTimer < interval || this.count >= MAX_ENEMIES) return { spawned: 0, isGigaspawn: false };
    this.spawnTimer -= interval;

    const minDist = 12;
    const maxDist = 22;
    const angle = runRandom() * Math.PI * 2;
    const dist = minDist + runRandom() * (maxDist - minDist);
    const anchorX = THREE.MathUtils.clamp(
      playerPos.x + Math.cos(angle) * dist,
      -ARENA_SIZE / 2 + 4,
      ARENA_SIZE / 2 - 4
    );
    const anchorZ = THREE.MathUtils.clamp(
      playerPos.z + Math.sin(angle) * dist,
      -ARENA_SIZE / 2 + 4,
      ARENA_SIZE / 2 - 4
    );
    this.lastGroupAnchor = { x: anchorX, z: anchorZ };

    const type = this._pickEnemyType(elapsed);
    const groupSize = this._getGroupSize(elapsed, isGigaspawn);
    const timeHpBonus = 1 + elapsed * 0.002;
    const hpMult = timeHpBonus * diffMult * hpMultBonus * (isGigaspawn ? 1.1 : 1);
    const speedMult = (1 + elapsed * 0.002) * (1 + (diffMult - 1) * 0.3);
    const spawned = this._spawnCluster(anchorX, anchorZ, groupSize, type, playerDmg, hpMult, speedMult);

    return { spawned, isGigaspawn, groupSize, anchorX, anchorZ };
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

  spawnMesaGuardian(x, z, threatDmg = 10, mesa) {
    const guardian = this.spawn('grunt', x, z, threatDmg, 1.05, 0.72);
    if (!guardian) return null;

    const topY = mesa?.topY ?? 0;
    guardian.hp = 1;
    guardian.maxHp = 1;
    guardian._hpScaled = false;
    guardian.damage = 18;
    guardian.xp = 45;
    guardian.scale = 2;
    guardian.color = 0xb56cff;
    guardian.isBoss = true;
    guardian.isMesaGuardian = true;
    guardian.mesa = mesa;
    guardian.mesaAwake = false;
    guardian.feetY = topY;
    guardian.groundY = topY;
    guardian.hpBarVisible = false;
    this.updateInstance(guardian);
    return guardian;
  }

  get aliveCount() {
    return this.count;
  }
}
