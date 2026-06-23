import * as THREE from 'three';
import { PLAYER_BASE, CHARACTERS, ARENA_SIZE, CRIT_CHANCE_CAP } from './constants.js';
import { saveData } from './SaveData.js';
import { applySkillBonusesToPlayer } from './SkillTree.js';
import { buildPlayerVisual } from './EntityVisuals.js';
import { runRandom } from '../lib/runRandom.js';

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
    const char = CHARACTERS.find(c => c.id === this.characterId) || CHARACTERS[0];
    const m = char.mods;

    this.projectileSpeed = PLAYER_BASE.projectileSpeed;
    this.magnetRadius = PLAYER_BASE.magnetRadius;
    this.familiars = 0;
    this.runXpMult = 0;
    this.killXpMult = 0;
    this.meleeBonus = 0;
    this.airDamageMult = 0;
    this.poisonChance = 0;
    this.bonkChance = 0;
    this.explodeChance = 0;
    this.fireTrailLevel = 0;
    this.projectileSpeedMult = 0;
    this.jumpPeakMult = 0;
    this.baseJumpPeak = 4.8;
    this.jumpGravity = 17;
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
    this.lightningChains = 3;
    this.attackTimer = 0;
    this.magnetCooldown = 0;
    this.magnetActive = false;
    this.dodgeCooldown = 0;
    this.dodging = false;
    this.dodgeTimer = 0;
    this.dodgeDir = { x: 0, z: 0 };
    this.jumping = false;
    this.jumpTimer = 0;
    this.jumpDuration = 0.72;
    this.jumpPeak = 4.8;
    this.maxAirJumps = 0;
    this.airJumpsUsed = 0;
    this.knockbackTimer = 0;
    this.xp = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.groundY = 0;
    this.worldY = 0;
    this.airborne = false;
    this.verticalVel = 0;
    this.jumpStartWorldY = 0;
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.invincible = 0;
    this._skillXpMult = 0;

    applySkillBonusesToPlayer(this, m, saveData.data.skillLevels);
    this.xpToNext = this.xpForLevel(this.level);
    this.setCharacter(this.characterId);
    this.hp = this.maxHp;
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
      fireTrailLevel: this.fireTrailLevel,
      hpRegen: this.hpRegen,
      evasion: this.evasion,
      armor: this.armor,
      bossDamageMult: this.bossDamageMult,
      coinMult: this.coinMult,
      killXpMult: this.killXpMult,
      healOnKill: this.healOnKill,
      magnetRadius: this.magnetRadius,
      upgradeBoost: this.upgradeBoost,
      critSplash: this.critSplash,
      idleDamageMult: this.idleDamageMult,
      moveAtkSpeed: this.moveAtkSpeed,
      hurtSpeedBurst: this.hurtSpeedBurst,
      runXpMult: this.runXpMult,
      meleeBonus: this.meleeBonus,
      airDamageMult: this.airDamageMult,
      poisonChance: this.poisonChance,
      bonkChance: this.bonkChance,
      explodeChance: this.explodeChance,
      killDamageBonus: this.killDamageBonus,
      projectileSpeedMult: this.projectileSpeedMult,
      jumpPeakMult: this.jumpPeakMult,
      elements: new Set(this.elements),
    };
  }

  xpForLevel(lvl) {
    return Math.floor(18 * Math.pow(1.14, lvl - 1));
  }

  get xpMult() {
    return (1 + (this._skillXpMult ?? 0)) * (1 + this.runXpMult);
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

      if (this.knockbackTimer > 0) {
        this.knockbackTimer -= dt;
        this._decelerate(dt, friction * 0.25);
      } else {
        const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
        const speedMult = sprint ? 1.4 : 1;
        if (hasInput) {
          this.velocity.set(move.x * effSpeed * speedMult, 0, move.z * effSpeed * speedMult);
        } else {
          this._decelerate(dt, friction);
        }
      }
      this.position.addScaledVector(this.velocity, dt);
    }

    if (terrain?.resolveObstacleCollision) {
      const resolved = terrain.resolveObstacleCollision(
        this.position.x,
        this.position.z,
        0.5,
        this.jumping || this.airborne ? this.worldY : Math.max(this.worldY, this.groundY)
      );
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
    this._updateVertical(dt, terrain);
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
    this.mesh.position.y = this.worldY + bob;

    this.shadow.position.set(this.position.x, this.groundY + 0.02, this.position.z);
    this.shadow.visible = this.mesh.visible;
    const heightAboveGround = Math.max(0, this.worldY - this.groundY) + bob;
    const heightFactor = THREE.MathUtils.clamp(1 - heightAboveGround / 10, 0.2, 1);
    this.shadow.scale.setScalar(0.65 + heightFactor * 0.55);
    this.shadow.material.opacity = 0.12 + heightFactor * 0.33;
  }

  _getBob() {
    return (this.jumping || this.airborne || this.dodging) ? 0 : Math.sin(Date.now() * 0.008) * 0.05;
  }

  _updateVertical(dt, _terrain) {
    if (this.jumping) {
      if (this.jumpTimer <= 0) {
        this.jumping = false;
        this.airJumpsUsed = 0;
        this.worldY = this.jumpStartWorldY;
        if (this.worldY > this.groundY + 0.2) {
          this.airborne = true;
          this.verticalVel = 0;
        } else {
          this.worldY = this.groundY;
          this.airborne = false;
        }
        return;
      }
      const t = THREE.MathUtils.clamp(
        (this.jumpDuration - this.jumpTimer) / this.jumpDuration,
        0,
        1
      );
      this.worldY = this.jumpStartWorldY + Math.sin(t * Math.PI) * this.jumpPeak;
      return;
    }

    if (this.airborne) {
      this.verticalVel -= this.jumpGravity * dt;
      this.worldY += this.verticalVel * dt;
      if (this.worldY <= this.groundY + 0.05) {
        this.worldY = this.groundY;
        this.airborne = false;
        this.verticalVel = 0;
      }
      return;
    }

    if (this.dodging) {
      this.worldY = this.groundY;
      return;
    }

    if (this.worldY > this.groundY + 0.55) {
      this.airborne = true;
      this.verticalVel = 0;
      return;
    }

    this.worldY = this.groundY;
  }

  getProjectileY() {
    return this.mesh.position.y + 0.85;
  }

  getViewY() {
    return this.mesh.position.y + 0.9;
  }

  takeDamage(amount, opts = {}) {
    if (!opts.forced) {
      if (this.invincible > 0) return false;
      if (this.evasion > 0 && runRandom() < this.evasion) return false;
    }
    const reduced = amount * (1 - Math.min(0.5, this.armor));
    if (reduced <= 0) return false;
    this.hp -= reduced;
    this.invincible = 0.5;
    this.combo = 0;
    if (this.hurtSpeedBurst > 0) this.hurtSpeedTimer = 2;
    this._onHurt?.();
    this._onDamageTaken?.(reduced);
    return this.hp <= 0;
  }

  applyKnockback(fromX, fromZ, force = 18) {
    let dx = this.position.x - fromX;
    let dz = this.position.z - fromZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.15) {
      dx = Math.sin(this.facing);
      dz = Math.cos(this.facing);
    } else {
      dx /= dist;
      dz /= dist;
    }
    this.velocity.x = dx * force;
    this.velocity.z = dz * force;
    this.knockbackTimer = Math.max(this.knockbackTimer ?? 0, 0.4);
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    const healed = this.hp - before;
    if (healed > 0) this._onHeal?.(healed);
  }

  addXp(amount) {
    this.xp += Math.floor(amount * this.xpMult);
    let levelsGained = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.xpForLevel(this.level);
      levelsGained++;
    }
    return levelsGained;
  }

  addKill() {
    this.kills++;
    this.combo++;
    this.comboTimer = 3;
    if (this.damagePerKill > 0) {
      this.killDamageBonus = Math.min(0.1, this.killDamageBonus + this.damagePerKill);
    }
    if (this.healOnKill > 0 && runRandom() < this.healOnKill) {
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
    this.jumpStartWorldY = this.worldY;
    this.jumpPeak = this.baseJumpPeak * (1 + this.jumpPeakMult);
    if (isAirJump) {
      this.jumpPeak += this.airJumpsUsed * 1.5;
    }
    this.jumping = true;
    this.airborne = false;
    this.verticalVel = 0;
    this.jumpTimer = this.jumpDuration;
    this.invincible = Math.max(this.invincible, this.jumpDuration);
    this._onJump?.();
  }

  previewAfterUpgrade(upgrade) {
    const preview = Object.create(Object.getPrototypeOf(this));
    Object.assign(preview, this);
    preview.elements = new Set(this.elements);
    preview.runBaseline = this.runBaseline;
    preview.applyUpgrade(upgrade);
    return preview;
  }

  applyUpgrade(upgrade) {
    const b = 1 + this.upgradeBoost;
    const e = upgrade.effect;
    const mul = (v) => (typeof v === 'number' ? v * b : v);

    if (e.projectileCount) this.projectileCount = Math.round(this.projectileCount + mul(e.projectileCount));
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
    if (e.critChance) this.critChance = Math.min(CRIT_CHANCE_CAP, this.critChance + mul(e.critChance));
    if (e.critDamageMult) this.critDamageMult += mul(e.critDamageMult);
    if (e.element && typeof e.element === 'string') this.elements.add(e.element);
    if (e.lightningChains) this.lightningChains += mul(e.lightningChains);
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
    if (e.fireTrail) this.fireTrailLevel += mul(e.fireTrail);
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

  /** Serializable run state for mid-arena resume (see RunSnapshot.js). */
  serialize() {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      kills: this.kills,
      damage: this.damage,
      speed: this.speed,
      attackRate: this.attackRate,
      projectileCount: this.projectileCount,
      projectilePierce: this.projectilePierce,
      projectileSpeed: this.projectileSpeed,
      projectileSpeedMult: this.projectileSpeedMult,
      area: this.area,
      critChance: this.critChance,
      critDamageMult: this.critDamageMult,
      lifesteal: this.lifesteal,
      thorns: this.thorns,
      familiars: this.familiars,
      pickupRadius: this.pickupRadius,
      magnetRadius: this.magnetRadius,
      maxAirJumps: this.maxAirJumps,
      hpRegen: this.hpRegen,
      coinMult: this.coinMult,
      armor: this.armor,
      evasion: this.evasion,
      fireTrailLevel: this.fireTrailLevel,
      elements: [...this.elements],
      lightningChains: this.lightningChains ?? 3,
      x: this.position.x,
      z: this.position.z,
    };
  }

  /** Restore run stats from snapshot after reset(). */
  applySnapshot(data, characterId) {
    if (characterId != null) this.characterId = characterId;
    this.reset();
    this.hp = data.hp;
    this.maxHp = data.maxHp;
    this.level = data.level;
    this.xp = data.xp;
    this.xpToNext = data.xpToNext;
    this.kills = data.kills;
    this.damage = data.damage;
    this.speed = data.speed;
    this.attackRate = data.attackRate;
    this.projectileCount = data.projectileCount;
    this.projectilePierce = data.projectilePierce ?? 0;
    this.projectileSpeed = data.projectileSpeed;
    this.projectileSpeedMult = data.projectileSpeedMult ?? 0;
    this.area = data.area;
    this.critChance = data.critChance;
    this.critDamageMult = data.critDamageMult ?? PLAYER_BASE.critDamageMult;
    this.lifesteal = data.lifesteal;
    this.thorns = data.thorns;
    this.familiars = data.familiars;
    this.pickupRadius = data.pickupRadius;
    this.magnetRadius = data.magnetRadius ?? PLAYER_BASE.magnetRadius;
    this.maxAirJumps = data.maxAirJumps ?? 0;
    this.hpRegen = data.hpRegen ?? 0;
    this.coinMult = data.coinMult ?? 0;
    this.armor = data.armor ?? 0;
    this.evasion = data.evasion ?? 0;
    this.fireTrailLevel = data.fireTrailLevel ?? 0;
    this.airJumpsUsed = 0;
    this.elements = new Set(data.elements);
    this.lightningChains = data.lightningChains ?? 3;
    this.position.set(data.x, 0, data.z);
  }
}
