import * as THREE from 'three';
import { PLAYER_BASE, CHARACTERS } from './constants.js';
import { saveData } from './SaveData.js';
import { buildPlayerVisual } from './EntityVisuals.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.facing = 0;
    this.characterId = 'fox';
    this.comboMultBonus = 1;

    this.mesh = new THREE.Group();
    this.visualParts = [];
    scene.add(this.mesh);

    const shadowGeo = new THREE.CircleGeometry(0.55, 20);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    scene.add(this.shadow);
  }

  setCharacter(id) {
    this.characterId = id;
    const char = CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

    for (const part of this.visualParts) {
      this.mesh.remove(part);
      part.geometry.dispose();
      part.material.dispose();
    }
    this.visualParts = [];

    const { parts } = buildPlayerVisual(char.id, char.color);
    for (const part of parts) {
      this.mesh.add(part);
      this.visualParts.push(part);
    }
  }

  reset() {
    const meta = saveData.data.meta;
    const char = CHARACTERS.find(c => c.id === this.characterId) || CHARACTERS[0];
    const m = char.mods;

    this.maxHp = (PLAYER_BASE.maxHp + meta.hp) * (m.hpMult || 1);
    this.hp = this.maxHp;
    this.speed = PLAYER_BASE.speed * (1 + meta.speed) * (m.speedMult || 1);
    this.damage = PLAYER_BASE.damage * (1 + meta.damage) * (m.damageMult || 1);
    this.attackRate = PLAYER_BASE.attackRate * (m.attackRateMult || 1);
    this.projectileCount = PLAYER_BASE.projectileCount + (m.projectileCount || 0);
    this.projectilePierce = PLAYER_BASE.projectilePierce;
    this.projectileSpeed = PLAYER_BASE.projectileSpeed;
    this.pickupRadius = PLAYER_BASE.pickupRadius + meta.pickup;
    this.magnetRadius = PLAYER_BASE.magnetRadius;
    this.critChance = PLAYER_BASE.critChance + (m.critChance || 0);
    this.area = PLAYER_BASE.area;
    this.lifesteal = m.lifesteal || 0;
    this.thorns = m.thorns || 0;
    this.familiars = 0;
    this.elements = new Set();
    if (char.startElement) this.elements.add(char.startElement);
    this.comboMultBonus = m.comboMult || 1;
    this.attackTimer = 0;
    this.magnetCooldown = 0;
    this.magnetActive = false;
    this.dodgeCooldown = 0;
    this.dodging = false;
    this.dodgeTimer = 0;
    this.dodgeDir = { x: 0, z: 0 };
    this.jumping = false;
    this.jumpTimer = 0;
    this.jumpDuration = 0.45;
    this.jumpBaseY = 0;
    this.jumpPeak = 2.4;
    this.maxAirJumps = 0;
    this.airJumpsUsed = 0;
    this.level = 1 + meta.startLevel;
    this.xp = 0;
    this.xpToNext = this.xpForLevel(this.level);
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.invincible = 0;
    this.setCharacter(this.characterId);
    this._captureRunBaseline();
  }

  _captureRunBaseline() {
    this.runBaseline = {
      damage: this.damage,
      speed: this.speed,
      attackRate: this.attackRate,
      maxHp: this.maxHp,
      projectileCount: this.projectileCount,
      projectilePierce: this.projectilePierce,
      pickupRadius: this.pickupRadius,
      area: this.area,
      critChance: this.critChance,
      lifesteal: this.lifesteal,
      thorns: this.thorns,
      familiars: this.familiars,
      maxAirJumps: this.maxAirJumps,
      elements: new Set(this.elements),
    };
  }

  xpForLevel(lvl) {
    return Math.floor(20 * Math.pow(1.15, lvl - 1));
  }

  get xpMult() {
    return 1 + saveData.data.meta.xp;
  }

  update(dt, input, terrain, cameraYaw = 0) {
    const move = input.getMoveVector();
    if (move.x !== 0 || move.z !== 0) {
      const cos = Math.cos(cameraYaw);
      const sin = Math.sin(cameraYaw);
      const rx = move.x * cos + move.z * sin;
      const rz = -move.x * sin + move.z * cos;
      move.x = rx;
      move.z = rz;
    }

    const hasInput = move.x !== 0 || move.z !== 0;
    const friction = this._terrainFriction(terrain, this.position.x, this.position.z);

    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

    if (input.wasPressed('Space') && !this.dodging) {
      if (!this.jumping) {
        this._startJump(false);
      } else if (this.airJumpsUsed < this.maxAirJumps) {
        this.airJumpsUsed++;
        this._startJump(true);
      }
    }

    if (this.jumping) {
      this.jumpTimer -= dt;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speedMult = sprint ? 1.2 : 1;
      if (hasInput) {
        this.velocity.set(move.x * this.speed * 0.75 * speedMult, 0, move.z * this.speed * 0.75 * speedMult);
      } else {
        this._decelerate(dt, friction * 0.85);
      }
      this.position.addScaledVector(this.velocity, dt);
      this.invincible = Math.max(this.invincible, this.jumpTimer);
      if (this.jumpTimer <= 0) {
        this.jumping = false;
        this.airJumpsUsed = 0;
        this.jumpBaseY = 0;
        this.jumpPeak = 2.4;
      }
    } else if (this.dodging) {
      this.dodgeTimer -= dt;
      this.position.x += this.dodgeDir.x * 28 * dt;
      this.position.z += this.dodgeDir.z * 28 * dt;
      this.invincible = Math.max(this.invincible, this.dodgeTimer);
      if (this.dodgeTimer <= 0) this.dodging = false;
    } else {
      if (input.wasPressed('KeyQ') && this.dodgeCooldown <= 0 && hasInput) {
        this.dodging = true;
        this.dodgeTimer = 0.25;
        this.dodgeCooldown = 2;
        this.dodgeDir = { x: move.x, z: move.z };
        this.invincible = 0.25;
        this._onDodge?.();
      }

      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speedMult = sprint ? 1.4 : 1;
      if (hasInput) {
        this.velocity.set(move.x * this.speed * speedMult, 0, move.z * this.speed * speedMult);
      } else {
        this._decelerate(dt, friction);
      }
      this.position.addScaledVector(this.velocity, dt);
    }

    if (terrain?.resolveObstacleCollision) {
      const resolved = terrain.resolveObstacleCollision(this.position.x, this.position.z, 0.5);
      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    const half = terrain ? terrain.halfSize - 1 : 50;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -half, half);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -half, half);

    const moveSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hasInput) {
      this.facing = Math.atan2(move.x, move.z);
    } else if (moveSpeed > 0.15) {
      this.facing = Math.atan2(this.velocity.x, this.velocity.z);
    }

    this.mesh.position.copy(this.position);
    this.mesh.position.y = 0;
    this.mesh.rotation.y = this.facing;
    for (const part of this.visualParts) {
      const airy = this.dodging || this.jumping;
      part.material.opacity = airy ? 0.85 : 1;
      part.material.transparent = airy;
    }

    this.attackTimer -= dt;

    if (this.invincible > 0 && !this.dodging && !this.jumping) this.invincible -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    const bob = this._getBob();
    const jumpHeight = this._getJumpHeight();
    this.mesh.position.y = jumpHeight + bob;

    this.shadow.position.set(this.position.x, 0.02, this.position.z);
    this.shadow.visible = this.mesh.visible;
    const heightAboveGround = jumpHeight + bob;
    const heightFactor = THREE.MathUtils.clamp(1 - heightAboveGround / 10, 0.2, 1);
    this.shadow.scale.setScalar(0.65 + heightFactor * 0.55);
    this.shadow.material.opacity = 0.12 + heightFactor * 0.33;
  }

  _getBob() {
    return this.jumping ? 0 : Math.sin(Date.now() * 0.008) * 0.05;
  }

  _getJumpHeight() {
    if (!this.jumping) return 0;
    const t = (this.jumpDuration - this.jumpTimer) / this.jumpDuration;
    return this.jumpBaseY + Math.sin(t * Math.PI) * this.jumpPeak;
  }

  takeDamage(amount) {
    if (this.invincible > 0) return false;
    this.hp -= amount;
    this.invincible = 0.5;
    this.combo = 0;
    this._onHurt?.();
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  addXp(amount) {
    this.xp += Math.floor(amount * this.xpMult);
    let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.xpForLevel(this.level);
      leveled = true;
    }
    return leveled;
  }

  addKill() {
    this.kills++;
    this.combo++;
    this.comboTimer = 3;
  }

  getComboMult() {
    const base = 1 + Math.min(this.combo * 0.02, 1);
    return 1 + (base - 1) * this.comboMultBonus;
  }

  _terrainFriction(terrain, x, z) {
    if (terrain?.getFriction) return terrain.getFriction(x, z);
    return PLAYER_BASE.defaultFriction;
  }

  _decelerate(dt, friction) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed <= 0) return;

    const newSpeed = Math.max(0, speed - friction * dt);
    if (newSpeed <= 0.05) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      return;
    }

    const scale = newSpeed / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  _startJump(isAirJump) {
    if (isAirJump) {
      this.jumpBaseY = this._getJumpHeight();
      this.jumpPeak = 2.4 + this.airJumpsUsed * 1.5;
    } else {
      this.jumpBaseY = 0;
      this.jumpPeak = 2.4;
    }
    this.jumping = true;
    this.jumpTimer = this.jumpDuration;
    this.invincible = Math.max(this.invincible, this.jumpDuration);
    this._onJump?.();
  }

  applyUpgrade(upgrade) {
    const e = upgrade.effect;
    if (e.projectileCount) this.projectileCount += e.projectileCount;
    if (e.pierce) this.projectilePierce = Math.min(5, this.projectilePierce + e.pierce);
    if (e.damageMult) this.damage *= (1 + e.damageMult);
    if (e.attackRateMult) this.attackRate *= (1 + e.attackRateMult);
    if (e.speedMult) this.speed *= (1 + e.speedMult);
    if (e.maxHp) { this.maxHp += e.maxHp; this.hp += e.heal || e.maxHp; }
    if (e.pickupMult) this.pickupRadius *= (1 + e.pickupMult);
    if (e.areaMult) this.area *= (1 + e.areaMult);
    if (e.critChance) this.critChance += e.critChance;
    if (e.element) this.elements.add(e.element);
    if (e.familiars) this.familiars += e.familiars;
    if (e.lifesteal) this.lifesteal += e.lifesteal;
    if (e.thorns) this.thorns += e.thorns;
    if (e.doubleJump) this.maxAirJumps = Math.min(5, this.maxAirJumps + e.doubleJump);
  }

  canAttack() {
    return this.attackTimer <= 0;
  }

  resetAttackTimer() {
    this.attackTimer = 1 / this.attackRate;
  }

  getEffectiveDamage() {
    return this.damage * this.getComboMult();
  }
}
