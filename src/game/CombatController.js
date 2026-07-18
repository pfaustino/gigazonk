import { runRandom, runRandomInt } from '../lib/runRandom.js';
import { COMBAT_AOE_PROC_MAX_TARGETS, COMBAT_HORDE_FX_LIMIT, scaledKillGemXp } from './constants.js';

/**
 * Combat hit resolution, proc chains, and player auto-fire.
 * Extracted from Game.js to keep the orchestrator thin.
 */
export class CombatController {
  /** @param {import('./Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this._frameHitSound = false;
    this._frameKillSound = false;
    this._frameHitStop = false;
    this._dmgNumbersThisFrame = 0;
    this._killBurstsThisFrame = 0;
    this._targetScratch = [];
    this._procScratch = [];
    this._batchKills = 0;
    this._batchXp = 0;
    this._batchElites = 0;
    this._batchPosX = 0;
    this._batchPosZ = 0;
    this._batchPosN = 0;
  }

  beginFrame() {
    this._frameHitSound = false;
    this._frameKillSound = false;
    this._frameHitStop = false;
    this._dmgNumbersThisFrame = 0;
    this._killBurstsThisFrame = 0;
    this._batchKills = 0;
    this._batchXp = 0;
    this._batchElites = 0;
    this._batchPosX = 0;
    this._batchPosZ = 0;
    this._batchPosN = 0;
  }

  _inHordeCombat() {
    return this.game.enemies.aliveCount >= COMBAT_HORDE_FX_LIMIT;
  }

  _dmgNumberCap() {
    return this._inHordeCombat() ? 6 : 14;
  }

  _queueKill(killResult, enemy) {
    this._batchKills++;
    this._batchXp += killResult.xp;
    this._batchPosX += killResult.pos.x;
    this._batchPosZ += killResult.pos.z;
    this._batchPosN++;
    if (enemy?.type === 'elite' && !killResult.isBoss) this._batchElites++;
  }

  flushHordeCombat() {
    const g = this.game;
    if (this._batchKills <= 0) return;

    const n = this._batchKills;
    g.player.kills += n;
    g.player.combo += n;
    g.player.comboTimer = 3;
    if (g.player.damagePerKill > 0) {
      g.player.killDamageBonus = Math.min(0.1, g.player.killDamageBonus + g.player.damagePerKill * n);
    }
    if (g.player.healOnKill > 0 && runRandom() < g.player.healOnKill) {
      g.player.heal(g.player.maxHp * 0.05);
    }

    g.quests.track('kills', n);
    if (this._batchElites > 0) g.quests.track('elites', this._batchElites);

    const totalXp = scaledKillGemXp(this._batchXp, {
      killXpMult: g.player.killXpMult,
      inRift: g.inRift,
    });
    const avgBaseXp = this._batchXp / n;
    const ax = this._batchPosX / this._batchPosN;
    const az = this._batchPosZ / this._batchPosN;
    const overflow = g.gems.spawn(ax, az, totalXp, g.player.position.x, g.player.position.z, {
      visualValue: avgBaseXp,
    });
    if (overflow > 0) {
      const levels = g.player.addXp(overflow);
      if (levels > 0) g.queueLevelUp(levels);
    }
    if (g.player.coinMult > 0) {
      g.runCoins += Math.max(1, Math.floor(g.player.coinMult * 10)) * n;
    }

    if (this._killBurstsThisFrame < 4) {
      g.particles.burst(ax, az, 0x44ff88, 6);
      this._killBurstsThisFrame++;
    }
    if (!this._frameKillSound) {
      g.audio.kill();
      this._frameKillSound = true;
    }
  }

  _resolveKill(killResult, enemy, element) {
    const g = this.game;
    if (killResult.isBoss) {
      this._resolveBossKill(killResult, enemy, element);
      return;
    }
    if (this._inHordeCombat()) {
      this._queueKill(killResult, enemy);
      return;
    }

    g.player.addKill();
    const xpValue = scaledKillGemXp(killResult.xp, {
      killXpMult: g.player.killXpMult,
      inRift: g.inRift,
    });
    const overflow = g.gems.spawn(
      killResult.pos.x, killResult.pos.z, xpValue,
      g.player.position.x, g.player.position.z,
      { visualValue: killResult.xp },
    );
    if (overflow > 0) {
      const levels = g.player.addXp(overflow);
      if (levels > 0) g.queueLevelUp(levels);
    }
    if (g.player.coinMult > 0) {
      g.runCoins += Math.max(1, Math.floor(g.player.coinMult * 10));
    }
    g.quests.track('kills');
    if (enemy?.type === 'elite') g.quests.track('elites');

    const color = element === 'fire' ? 0xff6644 : element === 'ice' ? 0x88ccff : element === 'lightning' ? 0xffff44 : 0x44ff88;
    if (this._killBurstsThisFrame < 4) {
      const burstCount = this._killBurstsThisFrame === 0 ? 8 : 3;
      g.particles.burst(killResult.pos.x, killResult.pos.z, color, burstCount);
      this._killBurstsThisFrame++;
    }
    if (!this._frameKillSound) {
      g.audio.kill();
      this._frameKillSound = true;
    }
  }

  _resolveBossKill(killResult, enemy, _element) {
    const g = this.game;
    g.player.addKill();
    const xpValue = scaledKillGemXp(killResult.xp, {
      killXpMult: g.player.killXpMult,
      inRift: g.inRift,
    });
    const overflow = g.gems.spawn(
      killResult.pos.x, killResult.pos.z, xpValue,
      g.player.position.x, g.player.position.z,
      { visualValue: killResult.xp },
    );
    if (overflow > 0) {
      const levels = g.player.addXp(overflow);
      if (levels > 0) g.queueLevelUp(levels);
    }
    if (g.player.coinMult > 0) {
      g.runCoins += Math.max(1, Math.floor(g.player.coinMult * 10));
    }
    g.quests.track('kills');
    g.quests.track('bosses');
    g._runBosses++;

    const killY = killResult.pos.y ?? 1.2;
    const { x, z } = killResult.pos;

    if (enemy?.isMesaGuardian) {
      g.quests.track('guardians');
      const beaconSpot = g.interactables.removeMesaBeaconForGuardian(enemy);
      const cx = beaconSpot?.x ?? x;
      const cz = beaconSpot?.z ?? z;
      const surfaceY = beaconSpot?.surfaceY ?? enemy.mesa?.topY ?? killY;
      g.interactables.spawnMesaCache(cx, cz, surfaceY);
      g.audio.mesaTreasureBurstSfx();
      g.cameraController.addShake(0.42);
      g.particles.treasureBurstAt(cx, surfaceY + 0.35, cz);
      g.ui.toast('Guardian defeated! Mesa treasure unlocked!', 'synergy');
    } else {
      g.interactables.spawnChest(x, z, killY);
      g.ui.showBossDefeat(g._runBosses, undefined, () => g.flushPendingLevelUp());
      g.ui.flashBossVictory();
      g.audio.bossKillFanfare();
      g.applyHitStop(0.14);
      g.cameraController.addShake(0.72);
      g.particles.bossDeathBurstAt(x, killY, z);
    }
  }

  _applyAoEDamage(x, z, radius, damage, element, sourceEnemy, maxTargets) {
    const g = this.game;
    const horde = this._inHordeCombat();
    const nearby = g.enemies.getNearby(x, z, radius, this._procScratch);
    const limit = horde ? Math.min(maxTargets, COMBAT_AOE_PROC_MAX_TARGETS) : nearby.length;
    let hits = 0;

    for (let i = 0; i < nearby.length; i++) {
      if (hits >= limit) break;
      const e2 = nearby[i].enemy;
      if (!e2.alive || e2 === sourceEnemy) continue;
      hits++;
      const result = g.enemies.damageEnemy(e2, damage, element);
      if (result) {
        this._resolveKill(result, e2, element);
      } else if (!horde && this._dmgNumbersThisFrame < this._dmgNumberCap()) {
        this.handleCombatHit(damage, null, element, e2, { skipProcs: true });
      }
    }
  }

  handleCombatHit(damage, killResult, element, enemy, opts = {}) {
    const g = this.game;
    const { skipProcs = false, isCrit = false, source = null } = opts;
    const horde = this._inHordeCombat();
    const critHit = isCrit || damage > g.player.damage * g.player.getComboMult() * (g.player.getCritMultiplier() - 0.05);
    const showFx = enemy && this._dmgNumbersThisFrame < this._dmgNumberCap()
      && (!skipProcs || isCrit || killResult || !horde);

    if (showFx) {
      g.particles.damageNumber(enemy.x, enemy.z, damage, { isCrit: critHit, element, source });
      this._dmgNumbersThisFrame++;
      if (isCrit && damage >= 1 && !horde && !this._frameHitStop) {
        g.applyHitStop();
        g.cameraController.addShake(0.28);
        this._frameHitStop = true;
      }
    }
    if (!this._frameHitSound && (!horde || !skipProcs || killResult)) {
      g.audio.hit();
      this._frameHitSound = true;
    }

    if (!skipProcs && enemy) {
      this._applyHitProcs(damage, enemy, isCrit);
    }

    if (killResult) {
      this._resolveKill(killResult, enemy, element);
    }
    if (g.player.lifesteal > 0) {
      g.player.heal(damage * g.player.lifesteal);
    }
  }

  _applyHitProcs(damage, enemy, isCrit) {
    const g = this.game;
    const alive = enemy.alive;
    const ex = enemy.x;
    const ez = enemy.z;

    if (alive && g.player.poisonChance > 0 && runRandom() < g.player.poisonChance) {
      enemy.burnTimer = Math.max(enemy.burnTimer, 3);
    }

    if (alive && g.player.bonkChance > 0 && runRandom() < g.player.bonkChance) {
      const bonkDmg = damage * 19;
      const result = g.enemies.damageEnemy(enemy, bonkDmg, null);
      this.handleCombatHit(bonkDmg, result, null, enemy, { skipProcs: true, isCrit: true, source: 'bonk' });
    }

    if (g.player.explodeChance > 0 && runRandom() < g.player.explodeChance) {
      const explodeDmg = damage * 0.65;
      this._applyAoEDamage(ex, ez, 4, explodeDmg, null, enemy, COMBAT_AOE_PROC_MAX_TARGETS);
      if (this._killBurstsThisFrame < 4) {
        g.particles.burst(ex, ez, 0xff8844, 5);
        this._killBurstsThisFrame++;
      }
    }

    if (isCrit && g.player.critSplash > 0 && runRandom() < g.player.critSplash) {
      this._applyAoEDamage(ex, ez, 3.5, damage * 0.5, null, enemy, COMBAT_AOE_PROC_MAX_TARGETS);
    }
  }

  /** Pick up to `count` nearest entries without sorting the full list. */
  _pickNearestTargets(nearby, count) {
    const targets = [];
    const used = new Set();
    for (let n = 0; n < count; n++) {
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < nearby.length; i++) {
        const entry = nearby[i];
        if (used.has(entry.enemy)) continue;
        if (entry.dist < bestDist) {
          bestDist = entry.dist;
          best = entry;
        }
      }
      if (!best) break;
      used.add(best.enemy);
      targets.push(best.enemy);
    }
    return targets;
  }

  /** Player auto-attack when attack timer is ready. */
  tryAutoFire() {
    const g = this.game;
    if (!g.player.canAttack()) return;

    const nearby = g.enemies.getNearby(
      g.player.position.x,
      g.player.position.z,
      20,
      this._targetScratch
    );
    if (nearby.length === 0) return;

    const targets = this._pickNearestTargets(nearby, g.player.projectileCount);
    const primary = targets[0] ?? nearby[0]?.enemy;
    if (!primary) return;
    const baseDmg = g.player.computeDamageForEnemy(primary);
    const isCrit = runRandom() < g.player.critChance;
    const finalDmg = isCrit ? baseDmg * g.player.getCritMultiplier() : baseDmg;
    const element = g.player.elements.size > 0
      ? [...g.player.elements][runRandomInt(g.player.elements.size)]
      : null;
    const px = g.player.position.x;
    const py = g.player.getProjectileY();
    const pz = g.player.position.z;
    const projSpeed = g.player.projectileSpeed * (1 + g.player.projectileSpeedMult);
    g.projectiles.fireVolley(
      px, py, pz, targets,
      projSpeed, finalDmg,
      g.player.area, element,
      g.player.projectilePierce,
      isCrit,
      g.player.lightningChains
    );
    g.player.resetAttackTimer();
    g.audio.shoot();
  }
}
