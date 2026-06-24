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
  ENEMY_FACE_SWAY_DEG,
  ENEMY_FACE_SWAY_SPEED,
  ENEMY_SEPARATION_SCALE,
  ENEMY_SEPARATION_QUERY,
  ENEMY_SEPARATION_STRENGTH,
  ENEMY_SEPARATION_MAX_PUSH,
  ENEMY_SEPARATION_PASSES,
  ENEMY_SEPARATION_HEAVY_COUNT,
  ENEMY_SEPARATION_PLAYER_RADIUS,
  ENEMY_HP_BAR_HORDE_LIMIT,
  pickGruntColor,
  BIOME_ENEMY_WEIGHTS,
} from './constants.js';
import { runRandom, runRandomInt } from '../lib/runRandom.js';
import { assert } from '../lib/assert.js';
import {
  ENEMY_MESH_CAPS,
  ENEMY_EYE_STYLES,
  buildEnemyBodyGeometry,
  buildEnemyEyeGeometry,
  createEnemyMaterial,
  createEnemyEyeMaterial,
  enemyMeshKey,
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
    this.eyeMeshes = {};
    this.freeSlots = {};
    this._meshCaps = {};
    this._dirtyMeshes = new Set();
    this._nearbyScratch = [];
    this._faceX = 0;
    this._faceZ = 1;
    this._swayPhase = 0;

    for (const type of Object.keys(ENEMY_TYPES)) {
      const cap = ENEMY_MESH_CAPS[type] || 100;
      const perStyle = Math.max(1, Math.ceil(cap / ENEMY_EYE_STYLES.length));
      for (const eyeStyle of ENEMY_EYE_STYLES) {
        const key = enemyMeshKey(type, eyeStyle);
        const bodyGeo = buildEnemyBodyGeometry(type);
        const mat = createEnemyMaterial();
        const mesh = new THREE.InstancedMesh(bodyGeo, mat, perStyle);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.count = 0;
        mesh.userData.enemyType = type;
        mesh.userData.eyeStyle = eyeStyle;
        scene.add(mesh);
        this.meshes[key] = mesh;

        const eyeGeo = buildEnemyEyeGeometry(type, eyeStyle);
        const eyeMat = createEnemyEyeMaterial();
        const eyeMesh = new THREE.InstancedMesh(eyeGeo, eyeMat, perStyle);
        eyeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        eyeMesh.frustumCulled = false;
        eyeMesh.castShadow = false;
        eyeMesh.renderOrder = 1;
        scene.add(eyeMesh);
        this.eyeMeshes[key] = eyeMesh;

        this._meshCaps[key] = perStyle;
        this.freeSlots[key] = [];
        for (let i = perStyle - 1; i >= 0; i--) this.freeSlots[key].push(i);
      }
    }
  }

  _slotsAvailable(type) {
    return ENEMY_EYE_STYLES.reduce(
      (total, eyeStyle) => total + (this.freeSlots[enemyMeshKey(type, eyeStyle)]?.length || 0),
      0
    );
  }

  _pickEyeStyle(type) {
    const styles = ENEMY_EYE_STYLES.filter(
      (eyeStyle) => this.freeSlots[enemyMeshKey(type, eyeStyle)]?.length
    );
    if (!styles.length) return null;
    return styles[runRandomInt(styles.length)];
  }

  _releaseSlot(enemy) {
    this.freeSlots[enemyMeshKey(enemy.type, enemy.eyeStyle || 'even')].push(enemy.slot);
  }

  reset() {
    this.count = 0;
    this.enemies = [];
    this.grid.clear();
    this.spawnTimer = 0;
    this._deadSinceCompact = 0;
    this._threatDmg = 10;
    this.lastGroupAnchor = null;
    this._swayPhase = 0;
    this._dirtyMeshes.clear();
    for (const key of Object.keys(this.meshes)) {
      const cap = this._meshCaps[key];
      this.freeSlots[key] = [];
      for (let i = cap - 1; i >= 0; i--) this.freeSlots[key].push(i);
      this.meshes[key].count = 0;
      this.eyeMeshes[key].count = 0;
    }
  }

  _meshFor(enemy) {
    const key = enemyMeshKey(enemy.type, enemy.eyeStyle || 'even');
    return this.meshes[key] || this.meshes[enemyMeshKey('grunt', 'even')];
  }

  _eyeMeshFor(enemy) {
    const key = enemyMeshKey(enemy.type, enemy.eyeStyle || 'even');
    return this.eyeMeshes[key] || this.eyeMeshes[enemyMeshKey('grunt', 'even')];
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

  flushInstances() {
    this._flushInstances();
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
    const eyeStyle = this._pickEyeStyle(type);
    if (!eyeStyle) return null;
    const pool = this.freeSlots[enemyMeshKey(type, eyeStyle)];
    if (!pool || pool.length === 0) return null;

    const def = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
    const hits = def.hpHits ?? 1.25;
    const maxHp = Math.max(1, threatDmg * hits * hpMult);
    const slot = pool.pop();
    assert(slot !== undefined && slot >= 0, 'ENEMY_SLOT_INVALID');
    const enemy = {
      slot,
      type,
      eyeStyle,
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
      _meshDirty: true,
      _colorDirty: true,
    };
    this.enemies.push(enemy);
    this.count++;
    this.updateInstance(enemy);
    return enemy;
  }

  _markMeshDirty(enemy) {
    enemy._meshDirty = true;
  }

  updateInstance(enemy) {
    const mesh = this._meshFor(enemy);
    const eyeMesh = this._eyeMeshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    if (!enemy.alive) {
      dummy.scale.set(0, 0, 0);
    } else {
      dummy.position.set(enemy.x, ENEMY_MESH_LIFT * enemy.scale + (enemy.groundY || 0), enemy.z);
      dummy.scale.set(enemy.scale, enemy.scale, enemy.scale);
      const dx = this._faceX - enemy.x;
      const dz = this._faceZ - enemy.z;
      if (dx * dx + dz * dz > 1e-6) {
        const baseYaw = Math.atan2(dx, dz);
        const swayMax = ENEMY_FACE_SWAY_DEG * (Math.PI / 180);
        const sway = Math.sin(this._swayPhase + enemy.slot * 0.61) * swayMax;
        dummy.rotation.y = baseYaw + sway;
      }
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    eyeMesh.setMatrixAt(enemy.slot, dummy.matrix);
    if (enemy._colorDirty) {
      mesh.setColorAt(enemy.slot, _color.setHex(enemy.color));
      enemy._colorDirty = false;
    }
    mesh.count = Math.max(mesh.count, enemy.slot + 1);
    eyeMesh.count = Math.max(eyeMesh.count, enemy.slot + 1);
    this._markDirty(mesh);
    this._markDirty(eyeMesh);
    enemy._meshDirty = false;
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

  getNearby(x, z, radius, out = null) {
    const results = out ?? [];
    results.length = 0;
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
    this._markMeshDirty(enemy);
  }

  _applyEnemySeparation(enemy, terrain, useTerrain) {
    const queryR = enemy.scale * ENEMY_SEPARATION_QUERY;
    const nearby = this.getNearby(enemy.x, enemy.z, queryR, this._nearbyScratch);
    if (nearby.length === 0) return;

    let pushX = 0;
    let pushZ = 0;
    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i].enemy;
      if (other === enemy || !other.alive) continue;

      const dx = enemy.x - other.x;
      const dz = enemy.z - other.z;
      const dist = Math.hypot(dx, dz);
      const minDist = (enemy.scale + other.scale) * ENEMY_SEPARATION_SCALE;
      if (dist >= minDist) continue;

      if (dist < 0.001) {
        const angle = (enemy.slot * 2.399963 + enemy.x * 0.31 + enemy.z * 0.17) % (Math.PI * 2);
        pushX += Math.cos(angle) * minDist;
        pushZ += Math.sin(angle) * minDist;
        continue;
      }

      const overlap = (minDist - dist) / dist;
      pushX += dx * overlap;
      pushZ += dz * overlap;
    }

    if (pushX === 0 && pushZ === 0) return;

    let mag = Math.hypot(pushX, pushZ);
    if (mag > ENEMY_SEPARATION_MAX_PUSH) {
      pushX = (pushX / mag) * ENEMY_SEPARATION_MAX_PUSH;
      pushZ = (pushZ / mag) * ENEMY_SEPARATION_MAX_PUSH;
    }

    pushX *= ENEMY_SEPARATION_STRENGTH;
    pushZ *= ENEMY_SEPARATION_STRENGTH;

    const newX = enemy.x + pushX;
    const newZ = enemy.z + pushZ;
    if (useTerrain && terrain && !this._canEnemyStep(enemy, enemy.x, enemy.z, newX, newZ, terrain)) {
      return;
    }
    enemy.x = newX;
    enemy.z = newZ;
    this._markMeshDirty(enemy);
  }

  _updateEnemyVertical(enemy, terrain, dt) {
    const prevY = enemy.groundY;
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
    if (Math.abs((enemy.groundY ?? 0) - (prevY ?? 0)) > 0.02) {
      this._markMeshDirty(enemy);
    }
  }

  _despawnEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    this.count--;
    this._deadSinceCompact++;
    const mesh = this._meshFor(enemy);
    const eyeMesh = this._eyeMeshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    eyeMesh.setMatrixAt(enemy.slot, dummy.matrix);
    this._markDirty(mesh);
    this._markDirty(eyeMesh);
    this._releaseSlot(enemy);
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
    this._faceX = playerPos.x;
    this._faceZ = playerPos.z;
    this._swayPhase += dt * ENEMY_FACE_SWAY_SPEED;
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
          this._markMeshDirty(e);
        }
      }
    }

    this.rebuildGrid();
    const sepPasses = this.count > ENEMY_SEPARATION_HEAVY_COUNT ? 1 : ENEMY_SEPARATION_PASSES;
    for (let pass = 0; pass < sepPasses; pass++) {
      if (pass > 0) this.rebuildGrid();
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const playerDist = Math.hypot(playerPos.x - e.x, playerPos.z - e.z);
        if (playerDist > ENEMY_SEPARATION_PLAYER_RADIUS) continue;
        const near = playerDist <= ENEMY_NEAR_RADIUS;
        this._applyEnemySeparation(e, terrain, near);
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;

      const dist = Math.hypot(playerPos.x - e.x, playerPos.z - e.z);
      const near = dist <= ENEMY_NEAR_RADIUS;

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
          this._markMeshDirty(e);
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
    this.rebuildGrid();
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
    const eyeMesh = this._eyeMeshFor(enemy);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(enemy.slot, dummy.matrix);
    eyeMesh.setMatrixAt(enemy.slot, dummy.matrix);
    this._markDirty(mesh);
    this._markDirty(eyeMesh);
    this._releaseSlot(enemy);
    return { xp, pos, isBoss: enemy.isBoss };
  }

  damageEnemy(enemy, amount, element) {
    if (!enemy.alive || amount <= 0) return null;
    if (enemy.isMesaGuardian) this._applyMesaGuardianHp(enemy);
    const showHpBar = enemy.isBoss || enemy.type === 'elite' || this.count < ENEMY_HP_BAR_HORDE_LIMIT;
    if (showHpBar) enemy.hpBarVisible = true;
    enemy.hp -= amount;
    if (element === 'fire') enemy.burnTimer = 3;
    if (element === 'ice') enemy.slowTimer = 2;
    if (element === 'lightning') enemy.slowTimer = Math.max(enemy.slowTimer, 0.45);
    if (enemy.hp <= 0) return this.killEnemy(enemy);
    return null;
  }

  /** Sum of touching enemies' contact damage (HP per hit; player i-frames throttle repeats). */
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
      if (!weight || !ENEMY_TYPES[type] || !this._slotsAvailable(type)) continue;
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
    if (this._slotsAvailable(type)) return type;
    const fallback = Object.keys(ENEMY_TYPES).find((t) => this._slotsAvailable(t) > 0);
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
    const ramp = 1 + Math.max(0, elapsed - 15) * 0.01;
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
    const timeHpBonus = 1 + Math.max(0, elapsed - 30) * 0.0018;
    const hpMult = timeHpBonus * diffMult * hpMultBonus * (isGigaspawn ? 1.1 : 1);
    const speedMult = (1 + Math.max(0, elapsed - 20) * 0.0018) * (1 + (diffMult - 1) * 0.3);
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
