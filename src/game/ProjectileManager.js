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
/** Instanced bolt size — gameplay blast radius is separate (BlastRadiusFx on hit). */
const PROJECTILE_VISUAL_SCALE = 1;

/** World distance at which a projectile detonates on an enemy (blast shell + body). */
export function enemyHitReach(area, enemyScale = 1) {
  return area + enemyScale * 0.4;
}

/** Blast center on the approach shell — where the sphere meets the target, not the enemy core. */
export function blastOriginAtRadius(px, pz, enemyX, enemyZ, area, enemyScale = 1) {
  const dx = px - enemyX;
  const dz = pz - enemyZ;
  const dist = Math.hypot(dx, dz) || 0.001;
  const reach = enemyHitReach(area, enemyScale);
  const nx = dx / dist;
  const nz = dz / dist;
  return { x: enemyX + nx * reach, z: enemyZ + nz * reach };
}

export function isWithinEnemyHitReach(px, pz, enemyX, enemyZ, area, enemyScale = 1) {
  return Math.hypot(enemyX - px, enemyZ - pz) <= enemyHitReach(area, enemyScale);
}

/** Enemies whose bodies overlap the blast sphere centered at (originX, originZ). */
export function collectBlastVictims(originX, originZ, area, enemies, hitSet = null) {
  const victims = [];
  for (const enemy of enemies) {
    if (!enemy?.alive) continue;
    if (hitSet?.has(enemy)) continue;
    const dist = Math.hypot(enemy.x - originX, enemy.z - originZ);
    if (dist <= enemyHitReach(area, enemy.scale ?? 1)) {
      victims.push(enemy);
    }
  }
  return victims;
}

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
    this._nearbyScratch = [];
    for (let i = MAX_PROJECTILES - 1; i >= 0; i--) this.freeSlots.push(i);
  }

  reset() {
    this.projectiles = [];
    this.freeSlots = [];
    this._nearbyScratch = this._nearbyScratch ?? [];
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

  _findDetonationAnchor(p, enemyManager) {
    if (p.targetEnemy?.alive && !p.hitEnemies.has(p.targetEnemy)) {
      const te = p.targetEnemy;
      if (isWithinEnemyHitReach(p.px, p.pz, te.x, te.z, p.area, te.scale)) {
        return te;
      }
      return null;
    }

    const nearby = enemyManager.getNearby(p.px, p.pz, p.area + 0.8, this._nearbyScratch);
    let best = null;
    let bestDist = Infinity;
    for (const { enemy, dist } of nearby) {
      if (!enemy.alive || p.hitEnemies.has(enemy)) continue;
      if (!isWithinEnemyHitReach(p.px, p.pz, enemy.x, enemy.z, p.area, enemy.scale)) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  _detonate(p, enemyManager, onHit, onBlast) {
    const anchor = this._findDetonationAnchor(p, enemyManager);
    if (!anchor) return false;

    const origin = blastOriginAtRadius(p.px, p.pz, anchor.x, anchor.z, p.area, anchor.scale);
    const nearby = enemyManager.getNearby(origin.x, origin.z, p.area + 0.8, this._nearbyScratch);
    const candidates = nearby.map((entry) => entry.enemy);
    const victims = collectBlastVictims(origin.x, origin.z, p.area, candidates, p.hitEnemies);
    if (victims.length === 0) return false;

    const allowProcs = p.hitEnemies.size === 0;
    let chainX = anchor.x;
    let chainZ = anchor.z;

    for (const enemy of victims) {
      p.hitEnemies.add(enemy);
      if (p.targetEnemy === enemy) p.targetEnemy = null;
      const result = enemyManager.damageEnemy(enemy, p.damage, p.element);
      onHit(p.damage, result, p.element, enemy, p.isCrit, { skipProcs: !allowProcs });
      chainX = enemy.x;
      chainZ = enemy.z;
    }

    onBlast?.(origin.x, p.py, origin.z, p.area, p.element);

    if (p.element === 'lightning') {
      this.chainLightning(
        chainX,
        chainZ,
        p.damage * 0.6,
        enemyManager,
        onHit,
        p.lightningChains,
        new Set(victims)
      );
    }

    this.remove(p);
    return true;
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
      dummy.scale.setScalar(PROJECTILE_VISUAL_SCALE);
      dummy.rotation.y = Math.atan2(p.vx, p.vz);
    }
    dummy.updateMatrix();
    this.mesh.setMatrixAt(p.slot, dummy.matrix);
    const tint = p.element ? ELEMENT_COLORS[p.element] : 0xf7c948;
    this.mesh.setColorAt(p.slot, _color.setHex(tint));
  }

  update(dt, enemyManager, arena, onHit, onBlast = null) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { this.remove(p); continue; }

      if (p.targetEnemy?.alive && !p.hitEnemies.has(p.targetEnemy)) {
        const te = p.targetEnemy;
        const dist = Math.hypot(te.x - p.px, te.z - p.pz);
        if (dist > enemyHitReach(p.area, te.scale)) {
          this._steerToward(p, te.x, te.z, dt);
        }
      } else if (p.targetEnemy && !p.targetEnemy.alive) {
        p.targetEnemy = null;
      }

      p.px += p.vx * dt;
      p.pz += p.vz * dt;

      const hitRadius = Math.max(0.12, p.area * 0.4);
      if (arena?.isProjectileBlocked(p.px, p.pz, hitRadius, p.py)) {
        this.remove(p);
        continue;
      }

      if (this._detonate(p, enemyManager, onHit, onBlast)) {
        continue;
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
    const nearby = enemyManager.getNearby(fromX, fromZ, 7, this._nearbyScratch);
    let best = null;
    let bestDist = Infinity;
    for (const { enemy, dist } of nearby) {
      if (!enemy.alive || hitSet.has(enemy)) continue;
      if (dist < bestDist) { bestDist = dist; best = enemy; }
    }
    if (!best) return;
    hitSet.add(best);
    const result = enemyManager.damageEnemy(best, damage, 'lightning');
    onHit(damage, result, 'lightning', best, false, { skipProcs: true });
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
