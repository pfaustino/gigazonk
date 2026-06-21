import * as THREE from 'three';
import { PLAYER_BASE, CHARACTERS, ARENA_SIZE } from './constants.js';
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
    this.critDamageMult = PLAYER_BASE.critDamageMult;
    this.area = PLAYER_BASE.area;
    this.lifesteal = m.lifesteal || 0;
    this.thorns = m.thorns || 0;
    this.familiars = 0;
    this.hpRegen = 0;
    this.runXpMult = 0;
    this.killXpMult = 0;
    this.coinMult = 0;
    this.evasion = 0;
    this.armor = 0;
    this.meleeBonus = 0;
    this.airDamageMult = 0;
    this.bossDamageMult = 0;
    this.poisonChance = 0;
    this.bonkChance = 0;
    this.explodeChance = 0;
    this.healOnKill = 0;
    this.projectileSpeedMult = 0;
    this.jumpPeakMult = 0;
    this.baseJumpPeak = 2.4;
    this.damagePerKill = 0;
    this.killDamageBonus = 0;
    this.upgradeBoost = 0;
    this.critSplash = 0;
    this.idleDamageMult = 0;
    this.moveAtkSpeed = 0;
    this.hurtSpeedBurst = 0;
    this.hurtSpeedTimer = 0;
    this.standStillTimer = 0;
    this._lastPosX = 0;
    this._lastPosZ = 0;
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
    this.groundY = 0;
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
      critDamageMult: this.critDamageMult,
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
    return (1 + saveData.data.meta.xp) * (1 + this.runXpMult);
  }

  getEffectiveSpeed() {
    const burst = this.hurtSpeedTimer > 0 ? (1 + this.hurtSpeedBurst) : 1;
    return this.speed * burst;
  }

  getAttackRate() {
    let rate = this.attackRate;
    if (this.moveAtkSpeed > 0) {
      const moveSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const t = Math.min(1, moveSpeed / Math.max(0.01, this.speed));
      rate *= (1 + this.moveAtkSpeed * t);
    }
    return rate;
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
    const prevX = this.position.x;
    const prevZ = this.position.z;

    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

    if (input.wasPressed('Space') && !this.dodging) {
      if (!this.jumping) {
        this._startJump(false);
      } else if (this.airJumpsUsed < this.maxAirJumps) {
        this.airJumpsUsed++;
        this._startJump(true);
      }
    }

    const effSpeed = this.getEffectiveSpeed();

    if (this.jumping) {
      this.jumpTimer -= dt;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speedMult = sprint ? 1.2 : 1;
      if (hasInput) {
        this.velocity.set(move.x * effSpeed * 0.75 * speedMult, 0, move.z * effSpeed * 0.75 * speedMult);
      } else {
        this._decelerate(dt, friction * 0.85);
      }
      this.position.addScaledVector(this.velocity, dt);
      this.invincible = Math.max(this.invincible, this.jumpTimer);
      if (this.jumpTimer <= 0) {
        this.jumping = false;
        this.airJumpsUsed = 0;
        this.jumpBaseY = this.groundY;
        this.jumpPeak = this.baseJumpPeak * (1 + this.jumpPeakMult);
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
        this.velocity.set(move.x * effSpeed * speedMult, 0, move.z * effSpeed * speedMult);
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

    if (terrain?.canTraverse && !terrain.canTraverse(prevX, prevZ, this.position.x, this.position.z, this.jumping)) {
      this.position.x = prevX;
      this.position.z = prevZ;
    }

    const half = terrain ? terrain.halfSize - 1 : ARENA_SIZE / 2 - 1;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -half, half);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -half, half);

    const moveSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hasInput) {
      this.facing = Math.atan2(move.x, move.z);
    } else if (moveSpeed > 0.15) {
      this.facing = Math.atan2(this.velocity.x, this.velocity.z);
    }

    this.mesh.position.copy(this.position);
    this.groundY = terrain?.getGroundHeight?.(this.position.x, this.position.z) ?? 0;
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

    if (this.hurtSpeedTimer > 0) this.hurtSpeedTimer -= dt;

    const moved = Math.hypot(this.position.x - this._lastPosX, this.position.z - this._lastPosZ);
    if (moved < 0.02) {
      this.standStillTimer += dt;
    } else {
      this.standStillTimer = 0;
    }
    this._lastPosX = this.position.x;
    this._lastPosZ = this.position.z;

    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.heal(this.hpRegen * dt);
    }

    const bob = this._getBob();
    const jumpHeight = this._getJumpHeight();
    this.mesh.position.y = this.groundY + jumpHeight + bob;

    this.shadow.position.set(this.position.x, this.groundY + 0.02, this.position.z);
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
    if (this.evasion > 0 && Math.random() < this.evasion) return false;
    const reduced = amount * (1 - Math.min(0.5, this.armor));
    this.hp -= reduced;
    this.invincible = 0.5;
    this.combo = 0;
    if (this.hurtSpeedBurst > 0) this.hurtSpeedTimer = 2;
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
    if (this.damagePerKill > 0) {
      this.killDamageBonus = Math.min(0.1, this.killDamageBonus + this.damagePerKill);
    }
    if (this.healOnKill > 0 && Math.random() < this.healOnKill) {
      this.heal(this.maxHp * 0.05);
    }
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
      this.jumpPeak = this.baseJumpPeak * (1 + this.jumpPeakMult) + this.airJumpsUsed * 1.5;
    } else {
      this.jumpBaseY = this.groundY;
      this.jumpPeak = this.baseJumpPeak * (1 + this.jumpPeakMult);
    }
    this.jumping = true;
    this.jumpTimer = this.jumpDuration;
    this.invincible = Math.max(this.invincible, this.jumpDuration);
    this._onJump?.();
  }

  applyUpgrade(upgrade) {
    const b = 1 + this.upgradeBoost;
    const e = upgrade.effect;
    const mul = (v) => (typeof v === 'number' ? v * b : v);

    if (e.projectileCount) this.projectileCount += mul(e.projectileCount);
    if (e.pierce) this.projectilePierce = Math.min(5, this.projectilePierce + mul(e.pierce));
    if (e.damageMult) this.damage *= (1 + mul(e.damageMult));
    if (e.attackRateMult) this.attackRate *= (1 + mul(e.attackRateMult));
    if (e.speedMult) this.speed *= (1 + mul(e.speedMult));
    if (e.maxHp) { this.maxHp += mul(e.maxHp); this.hp += e.heal != null ? mul(e.heal) : mul(e.maxHp); }
    if (e.maxHpMult) {
      this.maxHp *= (1 + e.maxHpMult);
      this.hp = Math.min(this.hp, this.maxHp);
    }
    if (e.pickupMult) this.pickupRadius *= (1 + mul(e.pickupMult));
    if (e.areaMult) this.area *= (1 + mul(e.areaMult));
    if (e.critChance) this.critChance = Math.min(0.75, this.critChance + mul(e.critChance));
    if (e.critDamageMult) this.critDamageMult += mul(e.critDamageMult);
    if (e.element) this.elements.add(e.element);
    if (e.familiars) this.familiars += mul(e.familiars);
    if (e.lifesteal) this.lifesteal += mul(e.lifesteal);
    if (e.thorns) this.thorns += mul(e.thorns);
    if (e.doubleJump) this.maxAirJumps = Math.min(5, this.maxAirJumps + mul(e.doubleJump));
    if (e.hpRegen) this.hpRegen += mul(e.hpRegen);
    if (e.runXpMult) this.runXpMult += mul(e.runXpMult);
    if (e.killXpMult) this.killXpMult += mul(e.killXpMult);
    if (e.coinMult) this.coinMult += mul(e.coinMult);
    if (e.evasion) this.evasion = Math.min(0.75, this.evasion + mul(e.evasion));
    if (e.armor) this.armor = Math.min(0.5, this.armor + mul(e.armor));
    if (e.jumpPeakMult) this.jumpPeakMult += mul(e.jumpPeakMult);
    if (e.meleeBonus) this.meleeBonus += mul(e.meleeBonus);
    if (e.airDamageMult) this.airDamageMult += mul(e.airDamageMult);
    if (e.bossDamageMult) this.bossDamageMult += mul(e.bossDamageMult);
    if (e.poisonChance) this.poisonChance = Math.min(1, this.poisonChance + mul(e.poisonChance));
    if (e.bonkChance) this.bonkChance += mul(e.bonkChance);
    if (e.explodeChance) this.explodeChance = Math.min(1, this.explodeChance + mul(e.explodeChance));
    if (e.healOnKill) this.healOnKill += mul(e.healOnKill);
    if (e.projectileSpeedMult) this.projectileSpeedMult += mul(e.projectileSpeedMult);
    if (e.magnetRadius) this.magnetRadius += mul(e.magnetRadius);
    if (e.magnetCooldownMult) this.magnetCooldownMult += e.magnetCooldownMult;
    if (e.damagePerKill) this.damagePerKill += mul(e.damagePerKill);
    if (e.upgradeBoost) this.upgradeBoost += e.upgradeBoost;
    if (e.critSplash) this.critSplash += mul(e.critSplash);
    if (e.idleDamageMult) this.idleDamageMult += mul(e.idleDamageMult);
    if (e.moveAtkSpeed) this.moveAtkSpeed += mul(e.moveAtkSpeed);
    if (e.hurtSpeedBurst) this.hurtSpeedBurst += mul(e.hurtSpeedBurst);
  }

  computeDamageForEnemy(enemy) {
    let dmg = this.damage * this.getComboMult();
    if (this.idleDamageMult > 0 && this.standStillTimer > 0.75) {
      dmg *= (1 + this.idleDamageMult);
    }
    if (enemy) {
      const dist = Math.hypot(enemy.x - this.position.x, enemy.z - this.position.z);
      if (this.meleeBonus > 0 && dist < 5) dmg *= (1 + this.meleeBonus);
      if (this.airDamageMult > 0 && this.jumping) dmg *= (1 + this.airDamageMult);
      if (this.bossDamageMult > 0 && (enemy.isBoss || enemy.type === 'elite')) {
        dmg *= (1 + this.bossDamageMult);
      }
    }
    if (this.killDamageBonus > 0) dmg *= (1 + this.killDamageBonus);
    return dmg;
  }

  getCritMultiplier() {
    return this.critDamageMult;
  }

  canAttack() {
    return this.attackTimer <= 0;
  }

  resetAttackTimer() {
    this.attackTimer = 1 / this.getAttackRate();
  }

  getEffectiveDamage() {
    return this.computeDamageForEnemy(null);
  }
}
