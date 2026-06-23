import * as THREE from 'three';
import { MAX_PROJECTILES } from './constants.js';
import { buildProjectileGeometry } from './EntityVisuals.js';
import { assert } from '../lib/assert.js';

const dummy = new THREE.Object3D();
const _color = new THREE.Color();
const ELEMENT_COLORS = {
  fire: 0xff6633,
  ice: 0x66ccff,
  lightning: 0xffee44,
};

export class ProjectileManager {
  constructor(scene) {
    this.scene = scene;
    const geo = buildProjectileGeometry();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_PROJECTILES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);

    this.projectiles = [];
    this.freeSlots = [];
    for (let i = MAX_PROJECTILES - 1; i >= 0; i--) this.freeSlots.push(i);
  }

  reset() {
    this.projectiles = [];
    this.freeSlots = [];
    for (let i = MAX_PROJECTILES - 1; i >= 0; i--) this.freeSlots.push(i);
    this.mesh.count = 0;
  }

  fire(px, py, pz, angle, speed, damage, area, element, pierce = 0, targetEnemy = null, isCrit = false, lightningChains = 3) {
    assert(this.freeSlots.length > 0, 'PROJECTILE_POOL_EMPTY');
    const slot = this.freeSlots.pop();
    assert(slot !== undefined && slot >= 0 && slot < MAX_PROJECTILES, 'PROJECTILE_SLOT_INVALID');
    const p = {
      slot, px, py, pz,
      vx: Math.sin(angle) * speed,
      vz: Math.cos(angle) * speed,
      speed,
      damage, area, element,
      pierce,
      lightningChains,
      isCrit,
      hitEnemies: new Set(),
      targetEnemy,
      life: 3,
      alive: true,
    };
    this.projectiles.push(p);
    this.mesh.count = Math.max(this.mesh.count, slot + 1);
    this.updateInstance(p);
  }

  fireVolley(px, py, pz, targetEnemies, speed, damage, area, element, pierce = 0, isCrit = false, lightningChains = 3) {
    for (const enemy of targetEnemies) {
      const angle = Math.atan2(enemy.x - px, enemy.z - pz);
      this.fire(px, py, pz, angle, speed, damage, area, element, pierce, enemy, isCrit, lightningChains);
    }
  }

  _steerToward(p, tx, tz, dt) {
    const dx = tx - p.px;
    const dz = tz - p.pz;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;

    const desiredAngle = Math.atan2(dx, dz);
    const curAngle = Math.atan2(p.vx, p.vz);
    let diff = desiredAngle - curAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const maxTurn = 10 * dt;
    const newAngle = curAngle + Math.max(-maxTurn, Math.min(maxTurn, diff));
    p.vx = Math.sin(newAngle) * p.speed;
    p.vz = Math.cos(newAngle) * p.speed;
  }

  _getCollisionTargets(p, enemyManager) {
    if (p.targetEnemy?.alive && !p.hitEnemies.has(p.targetEnemy)) {
      const enemy = p.targetEnemy;
      return [{ enemy, dist: Math.hypot(enemy.x - p.px, enemy.z - p.pz) }];
    }
    return enemyManager.getNearby(p.px, p.pz, p.area + 0.8);
  }

  updateInstance(p) {
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    if (!p.alive) {
      dummy.scale.set(0, 0, 0);
    } else {
      dummy.position.set(p.px, p.py, p.pz);
      dummy.scale.set(p.area, p.area, p.area);
      dummy.rotation.y = Math.atan2(p.vx, p.vz);
    }
    dummy.updateMatrix();
    this.mesh.setMatrixAt(p.slot, dummy.matrix);
    const tint = p.element ? ELEMENT_COLORS[p.element] : 0xf7c948;
    this.mesh.setColorAt(p.slot, _color.setHex(tint));
  }

  update(dt, enemyManager, arena, onHit) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { this.remove(p); continue; }

      if (p.targetEnemy) {
        if (!p.targetEnemy.alive) {
          p.targetEnemy = null;
        } else if (!p.hitEnemies.has(p.targetEnemy)) {
          this._steerToward(p, p.targetEnemy.x, p.targetEnemy.z, dt);
        }
      }

      p.px += p.vx * dt;
      p.pz += p.vz * dt;

      const hitRadius = Math.max(0.12, p.area * 0.4);
      if (arena?.isProjectileBlocked(p.px, p.pz, hitRadius, p.py)) {
        this.remove(p);
        continue;
      }

      const nearby = this._getCollisionTargets(p, enemyManager);
      for (const { enemy } of nearby) {
        if (!enemy.alive || p.hitEnemies.has(enemy)) continue;
        if (Math.hypot(enemy.x - p.px, enemy.z - p.pz) < p.area + enemy.scale * 0.4) {
          p.hitEnemies.add(enemy);
          if (p.targetEnemy === enemy) p.targetEnemy = null;
          const hitX = enemy.x;
          const hitZ = enemy.z;
          const result = enemyManager.damageEnemy(enemy, p.damage, p.element);
          onHit(p.damage, result, p.element, enemy, p.isCrit);

          if (p.element === 'lightning') {
            this.chainLightning(
              hitX,
              hitZ,
              p.damage * 0.6,
              enemyManager,
              onHit,
              p.lightningChains,
              new Set([enemy])
            );
          }

          if (p.hitEnemies.size >= p.pierce + 1) {
            this.remove(p);
            break;
          }
        }
      }
      this.updateInstance(p);
    }
    this._compactDead();
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  _compactDead() {
    let w = 0;
    for (let r = 0; r < this.projectiles.length; r++) {
      if (this.projectiles[r].alive) {
        if (w !== r) this.projectiles[w] = this.projectiles[r];
        w++;
      }
    }
    this.projectiles.length = w;
  }

  chainLightning(fromX, fromZ, damage, enemyManager, onHit, chainsLeft, hitSet) {
    if (chainsLeft <= 0) return;
    const nearby = enemyManager.getNearby(fromX, fromZ, 7);
    let best = null;
    let bestDist = Infinity;
    for (const { enemy, dist } of nearby) {
      if (!enemy.alive || hitSet.has(enemy)) continue;
      if (dist < bestDist) { bestDist = dist; best = enemy; }
    }
    if (!best) return;
    hitSet.add(best);
    const result = enemyManager.damageEnemy(best, damage, 'lightning');
    onHit(damage, result, 'lightning', best);
    this.chainLightning(best.x, best.z, damage * 0.7, enemyManager, onHit, chainsLeft - 1, hitSet);
  }

  remove(p) {
    if (!p.alive) return;
    p.alive = false;
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    this.mesh.setMatrixAt(p.slot, dummy.matrix);
    this.freeSlots.push(p.slot);
  }

  get aliveCount() {
    let n = 0;
    for (const p of this.projectiles) {
      if (p.alive) n++;
    }
    return n;
  }
}
