import * as THREE from 'three';
import { isOnAnyMesaPlateau } from './TerrainFeatures.js';
import {
  ZONK_DOME_CAMP_RADIUS,
  ZONK_DOME_CAMP_TIME,
  ZONK_DOME_STILL_SPEED,
  ZONK_DOME_GROW_TIME,
  ZONK_DOME_HURT_RADIUS,
  ZONK_DOME_FOLLOWUP_COUNT,
  ZONK_DOME_FOLLOWUP_DELAY,
  FAMILIAR_ORBIT_RADIUS,
  FAMILIAR_ZAP_RANGE,
  FAMILIAR_BOLT_LIFE,
  FAMILIAR_ORBIT_SPEED,
  FAMILIAR_ZAP_DAMAGE_MULT,
} from './constants.js';
import { runRandom } from '../lib/runRandom.js';

const _targetScratch = [];

function zapCooldown(attackRate) {
  return 1 / Math.max(0.05, attackRate);
}

/** Scaled lightning zap damage (respects player damage perks per target). */
export function familiarZapDamage(enemy, player) {
  if (!player) return Math.max(1, enemy.hp);
  return Math.max(1, Math.round(player.computeDamageForEnemy(enemy) * FAMILIAR_ZAP_DAMAGE_MULT));
}

/** Orbiting soul orbs — visible lightning zaps on the player's attack cadence. */
export class FamiliarManager {
  constructor(scene) {
    this.scene = scene;
    this.orbs = [];
    this.bolts = [];
    this.group = new THREE.Group();
    this.group.name = 'familiars';
    scene.add(this.group);
    this.angle = 0;
  }

  reset() {
    for (const orb of this.orbs) {
      this.group.remove(orb.mesh);
      orb.mesh.geometry?.dispose();
      orb.mesh.material?.dispose();
      for (const child of orb.mesh.children) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    }
    this.orbs = [];
    this._clearBolts();
    this.angle = 0;
  }

  _clearBolts() {
    for (const bolt of this.bolts) {
      this.group.remove(bolt.line);
      bolt.geo.dispose();
      bolt.mat.dispose();
    }
    this.bolts = [];
  }

  _spawnOrbMesh() {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffaa })
    );
    group.add(outer, core);
    return group;
  }

  setCount(count, attackRate = 1.2) {
    const cd = zapCooldown(attackRate);
    while (this.orbs.length < count) {
      const mesh = this._spawnOrbMesh();
      this.group.add(mesh);
      this.orbs.push({
        mesh,
        attackTimer: runRandom() * cd,
        flash: 0,
      });
    }
    while (this.orbs.length > count) {
      const orb = this.orbs.pop();
      this.group.remove(orb.mesh);
      orb.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
  }

  _findClosestTarget(ex, ez, enemyManager) {
    const nearby = enemyManager.getNearby(ex, ez, FAMILIAR_ZAP_RANGE, _targetScratch);
    let best = null;
    let bestDist = Infinity;
    for (const { enemy } of nearby) {
      if (!enemy.alive || enemy.isMesaGuardian) continue;
      const d = Math.hypot(enemy.x - ex, enemy.z - ez);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    return best;
  }

  _spawnBolt(fromX, fromY, fromZ, toX, toY, toZ) {
    const points = [];
    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jag = i > 0 && i < segments ? (runRandom() - 0.5) * 0.55 : 0;
      points.push(new THREE.Vector3(
        THREE.MathUtils.lerp(fromX, toX, t) + jag,
        THREE.MathUtils.lerp(fromY, toY, t) + jag * 0.5,
        THREE.MathUtils.lerp(fromZ, toZ, t) + jag
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffff66,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 40;
    this.group.add(line);
    this.bolts.push({ line, geo, mat, life: FAMILIAR_BOLT_LIFE });
  }

  _updateBolts(dt) {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.life -= dt;
      bolt.mat.opacity = Math.max(0, bolt.life / FAMILIAR_BOLT_LIFE);
      if (bolt.life <= 0) {
        this.group.remove(bolt.line);
        bolt.geo.dispose();
        bolt.mat.dispose();
        this.bolts.splice(i, 1);
      }
    }
  }

  update(dt, playerPos, enemyManager, attackRate, { onHit, onZap, playerY = 0, player = null } = {}) {
    const count = this.orbs.length;
    if (count === 0) return;

    const cd = zapCooldown(attackRate);
    this.angle += dt * FAMILIAR_ORBIT_SPEED;
    const orbitCenterY = playerY + 1.55;

    for (let i = 0; i < count; i++) {
      const orb = this.orbs[i];
      const a = this.angle + (i / count) * Math.PI * 2;
      const ox = playerPos.x + Math.sin(a) * FAMILIAR_ORBIT_RADIUS;
      const oz = playerPos.z + Math.cos(a) * FAMILIAR_ORBIT_RADIUS;
      const oy = orbitCenterY + Math.sin(this.angle * 2 + i) * 0.12;
      orb.mesh.position.set(ox, oy, oz);
      orb.mesh.rotation.y += dt * 3.5;

      if (orb.flash > 0) {
        orb.flash -= dt;
        const s = 1 + Math.min(orb.flash, 0.12) * 2.5;
        orb.mesh.scale.setScalar(s);
      } else {
        orb.mesh.scale.setScalar(1);
      }

      orb.attackTimer -= dt;
      if (orb.attackTimer > 0) continue;

      orb.attackTimer = cd;
      const target = this._findClosestTarget(ox, oz, enemyManager);
      if (!target) continue;

      const ty = (target.groundY ?? target.feetY ?? 0) + target.scale * 0.55;
      this._spawnBolt(ox, oy, oz, target.x, ty, target.z);
      orb.flash = 0.18;
      onZap?.();

      const dmg = familiarZapDamage(target, player);
      const result = enemyManager.damageEnemy(target, dmg, 'lightning');
      if (result) onHit?.(dmg, result);
    }

    this._updateBolts(dt);
  }
}

export class RiftManager {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.mesh = null;
    this.pos = { x: 0, z: 0 };
    this.timer = 0;
    this.spawnInterval = 90;
  }

  reset() {
    this.removeRift();
    this.active = false;
    this.timer = 0;
  }

  update(dt, elapsed, playerPos) {
    this.timer += dt;
    if (!this.active && this.timer >= this.spawnInterval) {
      this.spawnRift(playerPos);
      this.timer = 0;
    }

    if (this.active && this.mesh) {
      this.mesh.rotation.y += dt;
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      this.mesh.scale.set(scale, scale, scale);
    }
  }

  spawnRift(nearPos) {
    const angle = runRandom() * Math.PI * 2;
    const dist = 15 + runRandom() * 10;
    this.pos.x = nearPos.x + Math.cos(angle) * dist;
    this.pos.z = nearPos.z + Math.sin(angle) * dist;

    const geo = new THREE.TorusGeometry(2, 0.3, 8, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.7 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(this.pos.x, 2, this.pos.z);
    this.mesh.rotation.x = Math.PI / 2;
    this.scene.add(this.mesh);
    this.active = true;
  }

  removeRift() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    this.active = false;
  }

  isPlayerInside(px, pz) {
    if (!this.active) return false;
    return Math.hypot(px - this.pos.x, pz - this.pos.z) < 3;
  }
}

export class SynergyNova {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.ring = null;
  }

  reset() {
    this.cooldown = 0;
    if (this.ring) {
      this.scene.remove(this.ring);
      this.ring.geometry.dispose();
      this.ring.material.dispose();
      this.ring = null;
    }
  }

  update(dt, player, enemyManager, gemManager, onHit) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const hasAll = ['fire', 'ice', 'lightning'].every(e => player.elements.has(e));
    if (!hasAll) return;

    this.cooldown = 10;
    this.onNova?.();
    this.visualNova(player.position);

    const nearby = enemyManager.getNearby(player.position.x, player.position.z, 12);
    for (const { enemy } of nearby) {
      const result = enemyManager.damageEnemy(enemy, player.getEffectiveDamage() * 3, 'fire');
      if (result) {
        gemManager.spawn(result.pos.x, result.pos.z, result.xp * 2, player.position.x, player.position.z);
        onHit(player.getEffectiveDamage() * 3, result, 'fire');
      }
    }
  }

  visualNova(pos) {
    const geo = new THREE.RingGeometry(0.5, 12, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf7c948, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(pos.x, 0.5, pos.z);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    let scale = 0.1;
    const animate = () => {
      scale += 0.15;
      ring.scale.set(scale, scale, scale);
      mat.opacity -= 0.03;
      if (mat.opacity > 0) requestAnimationFrame(animate);
      else {
        this.scene.remove(ring);
        geo.dispose();
        mat.dispose();
      }
    };
    animate();
  }
}

const FIRE_PATCH_CAP = 52;

export class FireTrailManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.renderOrder = 12;
    scene.add(this.group);
    this.patches = [];
    this._spawnDistAcc = 0;
  }

  reset() {
    for (const p of this.patches) {
      this.group.remove(p.mesh);
      p.mesh.geometry?.dispose();
      p.mesh.material?.dispose();
    }
    this.patches = [];
    this._spawnDistAcc = 0;
  }

  _surfaceY(x, z, player, terrain) {
    const sampled = terrain?.getGroundHeight?.(x, z);
    if (sampled != null && sampled > 0.02) return sampled;
    if (player.groundY != null && player.groundY > 0.02) return player.groundY;
    return player.feetY ?? player.groundY ?? 0;
  }

  _spawnPatch(x, z, level, playerDamage, player, terrain) {
    while (this.patches.length >= FIRE_PATCH_CAP) {
      const old = this.patches.shift();
      this.group.remove(old.mesh);
      old.mesh.geometry?.dispose();
      old.mesh.material?.dispose();
    }

    const radius = 1.55 + level * 0.28;
    const geo = new THREE.RingGeometry(radius * 0.35, radius, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 12;
    const y = this._surfaceY(x, z, player, terrain) + 0.2;
    mesh.position.set(x, y, z);
    this.group.add(mesh);

    const life = 0.95 + level * 0.18;

    this.patches.push({
      mesh,
      x,
      z,
      y,
      life,
      maxLife: life,
      radius,
      tick: 0,
      damage: Math.max(4, playerDamage * (0.1 + level * 0.035)),
    });
  }

  update(dt, player, enemyManager, terrain, onHit) {
    const level = player.fireTrailLevel;
    if (level <= 0) return;

    const px = player.position.x;
    const pz = player.position.z;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const spawnGap = Math.max(0.45, 1.2 - level * 0.1);

    // Use velocity × dt — player._lastPosX is already synced before this runs.
    if (speed > 0.12) {
      this._spawnDistAcc += speed * dt;
      if (this._spawnDistAcc >= spawnGap) {
        this._spawnDistAcc = 0;
        const backX = px - Math.sin(player.facing) * 0.75;
        const backZ = pz - Math.cos(player.facing) * 0.75;
        this._spawnPatch(backX, backZ, level, player.getEffectiveDamage(), player, terrain);
      }
    } else {
      this._spawnDistAcc = 0;
    }

    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.geometry?.dispose();
        p.mesh.material?.dispose();
        this.patches.splice(i, 1);
        continue;
      }

      const fade = p.life / p.maxLife;
      p.mesh.material.opacity = 0.1 + fade * 0.35;
      const pulse = 0.88 + Math.sin((1 - fade) * Math.PI) * 0.18;
      p.mesh.scale.set(pulse, pulse, 1);

      p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.22;
        const nearby = enemyManager.getNearby(p.x, p.z, p.radius);
        for (const { enemy } of nearby) {
          if (!enemy.alive) continue;
          if (Math.hypot(enemy.x - p.x, enemy.z - p.z) > p.radius + enemy.scale * 0.35) continue;
          const result = enemyManager.damageEnemy(enemy, p.damage, 'fire');
          if (result) onHit(p.damage, result, 'fire');
        }
      }
    }
  }
}

/** Punishes sustained orbit-kiting in the open arena (Megabonk-style Zonk Dome). */
export class ZonkDomeManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.moveHistory = [];
    this.campTime = 0;
    this.activeDomes = [];
    this.chainRemaining = 0;
    this.chainTimer = 0;
  }

  reset() {
    this._clearAllDomes();
    this.moveHistory = [];
    this.campTime = 0;
    this.chainRemaining = 0;
    this.chainTimer = 0;
  }

  _centroid(points) {
    let sx = 0;
    let sz = 0;
    for (const p of points) {
      sx += p.x;
      sz += p.z;
    }
    const n = points.length;
    return { x: sx / n, z: sz / n };
  }

  _maxDist(points, cx, cz) {
    let max = 0;
    for (const p of points) {
      max = Math.max(max, Math.hypot(p.x - cx, p.z - cz));
    }
    return max;
  }

  _clearAllDomes() {
    for (const d of this.activeDomes) {
      this._disposeDomeMesh(d);
    }
    this.activeDomes = [];
  }

  _disposeDomeMesh(d) {
    const { mesh, ring } = d;
    this.group.remove(mesh);
    mesh.geometry?.dispose();
    mesh.material?.dispose();
    if (ring) {
      this.group.remove(ring);
      ring.geometry?.dispose();
      ring.material?.dispose();
    }
  }

  _spawnDome(x, z, arena, { isFollowup = false, onWarn } = {}) {
    const surfaceY = arena?.getGroundHeight?.(x, z) ?? 0;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({
        color: isFollowup ? 0xc77dff : 0x9b59f5,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      })
    );
    mesh.position.set(x, surfaceY + 0.5, z);
    this.group.add(mesh);

    const dome = {
      cx: x,
      cz: z,
      surfaceY,
      mesh,
      ring: null,
      grow: 0,
      hurtRadius: ZONK_DOME_HURT_RADIUS,
      isFollowup,
    };
    this.activeDomes.push(dome);
    onWarn?.(dome);
    return dome;
  }

  _updateDome(d, dt, player, onPop) {
    d.grow += dt / ZONK_DOME_GROW_TIME;
    const t = Math.min(1, d.grow);
    const currentRadius = t * d.hurtRadius;
    d.mesh.scale.set(currentRadius, currentRadius * 0.82, currentRadius);
    d.mesh.position.y = d.surfaceY + currentRadius * 0.45;
    d.mesh.material.opacity = 0.18 + t * 0.5;
    if (d.ring) d.ring.material.opacity = 0.22 * (1 - t * 0.65);

    if (t >= 1) {
      const dist = Math.hypot(player.position.x - d.cx, player.position.z - d.cz);
      const playerRadius = 0.5;
      if (dist < d.hurtRadius + playerRadius) {
        onPop?.(d);
      }
      return true;
    }
    return false;
  }

  _tickFollowupChain(dt, player, arena, callbacks) {
    if (this.chainRemaining <= 0) return;

    this.chainTimer -= dt;
    if (this.chainTimer > 0) return;

    const px = player.position.x;
    const pz = player.position.z;
    const mesas = arena?.mesas ?? [];
    if (!isOnAnyMesaPlateau(px, pz, mesas)) {
      this._spawnDome(px, pz, arena, {
        isFollowup: true,
        onWarn: callbacks.onFollowupWarn,
      });
    }
    this.chainRemaining -= 1;
    this.chainTimer = ZONK_DOME_FOLLOWUP_DELAY;
  }

  _startFollowupChain() {
    this.chainRemaining = ZONK_DOME_FOLLOWUP_COUNT;
    this.chainTimer = ZONK_DOME_FOLLOWUP_DELAY;
  }

  update(dt, player, arena, elapsed, callbacks = {}) {
    for (let i = this.activeDomes.length - 1; i >= 0; i--) {
      const done = this._updateDome(this.activeDomes[i], dt, player, callbacks.onPop);
      if (done) {
        this._disposeDomeMesh(this.activeDomes[i]);
        this.activeDomes.splice(i, 1);
      }
    }

    this._tickFollowupChain(dt, player, arena, callbacks);

    if (this.activeDomes.length > 0 || this.chainRemaining > 0) {
      return;
    }

    const px = player.position.x;
    const pz = player.position.z;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const mesas = arena?.mesas ?? [];

    if (isOnAnyMesaPlateau(px, pz, mesas)) {
      this.campTime = 0;
      this.moveHistory = [];
      return;
    }

    if (speed < ZONK_DOME_STILL_SPEED) {
      return;
    }

    this.moveHistory.push({ x: px, z: pz, t: elapsed });
    const cutoff = elapsed - ZONK_DOME_CAMP_TIME;
    this.moveHistory = this.moveHistory.filter(p => p.t >= cutoff);

    if (this.moveHistory.length < 2) {
      this.campTime = 0;
      return;
    }

    const { x: cx, z: cz } = this._centroid(this.moveHistory);
    const spread = this._maxDist(this.moveHistory, cx, cz);

    if (spread > ZONK_DOME_CAMP_RADIUS) {
      this.campTime = 0;
      this.moveHistory = [{ x: px, z: pz, t: elapsed }];
      return;
    }

    this.campTime += dt;
    if (this.campTime >= ZONK_DOME_CAMP_TIME) {
      this._spawnDome(px, pz, arena, { onWarn: callbacks.onWarn });
      this._startFollowupChain();
      this.campTime = 0;
      this.moveHistory = [];
    }
  }
}
