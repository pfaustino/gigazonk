import * as THREE from 'three';

export class FamiliarManager {
  constructor(scene) {
    this.scene = scene;
    this.orbs = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.angle = 0;
    this.damageTimer = 0;
  }

  reset() {
    for (const o of this.orbs) {
      this.group.remove(o);
      o.geometry?.dispose();
      o.material?.dispose();
    }
    this.orbs = [];
    this.angle = 0;
  }

  setCount(count) {
    while (this.orbs.length < count) {
      const geo = new THREE.SphereGeometry(0.3, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0x9b59f5 });
      const mesh = new THREE.Mesh(geo, mat);
      this.group.add(mesh);
      this.orbs.push(mesh);
    }
    while (this.orbs.length > count) {
      const o = this.orbs.pop();
      this.group.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
  }

  update(dt, playerPos, enemyManager, onHit) {
    const count = this.orbs.length;
    if (count === 0) return;

    this.angle += dt * 2;
    const radius = 2.5;

    for (let i = 0; i < count; i++) {
      const a = this.angle + (i / count) * Math.PI * 2;
      this.orbs[i].position.set(
        playerPos.x + Math.sin(a) * radius,
        1.5,
        playerPos.z + Math.cos(a) * radius
      );
    }

    this.damageTimer -= dt;
    if (this.damageTimer <= 0) {
      this.damageTimer = 0.5;
      for (const orb of this.orbs) {
        const nearby = enemyManager.getNearby(orb.position.x, orb.position.z, 1.5);
        for (const { enemy } of nearby) {
          const result = enemyManager.damageEnemy(enemy, 8, null);
          if (result) onHit(8, result, null);
        }
      }
    }
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
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 10;
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
const FIRE_PATCH_GEO = new THREE.CircleGeometry(1, 12);

export class FireTrailManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.patches = [];
    this._spawnDistAcc = 0;
  }

  reset() {
    for (const p of this.patches) {
      this.group.remove(p.mesh);
      p.mesh.material?.dispose();
    }
    this.patches = [];
    this._spawnDistAcc = 0;
  }

  _spawnPatch(x, z, level, playerDamage) {
    while (this.patches.length >= FIRE_PATCH_CAP) {
      const old = this.patches.shift();
      this.group.remove(old.mesh);
      old.mesh.material?.dispose();
    }

    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(FIRE_PATCH_GEO, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    this.group.add(mesh);

    const radius = 1.55 + level * 0.28;
    const life = 0.95 + level * 0.18;
    mesh.scale.set(radius, radius, 1);

    this.patches.push({
      mesh,
      x,
      z,
      life,
      maxLife: life,
      radius,
      tick: 0,
      damage: Math.max(4, playerDamage * (0.1 + level * 0.035)),
    });
  }

  update(dt, player, enemyManager, onHit) {
    const level = player.fireTrailLevel;
    if (level <= 0) return;

    const px = player.position.x;
    const pz = player.position.z;
    const move = Math.hypot(px - (player._lastPosX ?? px), pz - (player._lastPosZ ?? pz));
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const spawnGap = Math.max(0.55, 1.35 - level * 0.12);

    if (speed > 0.35 && move > 0.02) {
      this._spawnDistAcc += move;
      if (this._spawnDistAcc >= spawnGap) {
        this._spawnDistAcc = 0;
        const backX = px - Math.sin(player.facing) * 0.65;
        const backZ = pz - Math.cos(player.facing) * 0.65;
        this._spawnPatch(backX, backZ, level, player.getEffectiveDamage());
      }
    } else {
      this._spawnDistAcc = 0;
    }

    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.material?.dispose();
        this.patches.splice(i, 1);
        continue;
      }

      const fade = p.life / p.maxLife;
      p.mesh.material.opacity = 0.25 + fade * 0.65;
      p.mesh.scale.set(p.radius * (0.75 + fade * 0.35), p.radius * (0.75 + fade * 0.35), 1);

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
