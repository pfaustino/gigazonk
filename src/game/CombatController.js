import { runRandom, runRandomInt } from '../lib/runRandom.js';

/**
 * Combat hit resolution, proc chains, and player auto-fire.
 * Extracted from Game.js to keep the orchestrator thin.
 */
export class CombatController {
  /** @param {import('./Game.js').Game} game */
  constructor(game) {
    this.game = game;
  }

  handleCombatHit(damage, killResult, element, enemy, opts = {}) {
    const g = this.game;
    const { skipProcs = false, isCrit = false } = opts;
    const critHit = isCrit || damage > g.player.damage * g.player.getComboMult() * (g.player.getCritMultiplier() - 0.05);
    if (enemy) {
      g.particles.damageNumber(enemy.x, enemy.z, damage, critHit);
      if (critHit && damage >= 1) {
        g.applyHitStop();
        g.cameraController.addShake(0.28);
      }
    }
    g.audio.hit();

    if (!skipProcs && enemy) {
      this._applyHitProcs(damage, enemy, critHit);
    }

    if (killResult) {
      g.player.addKill();
      const xpMult = (g.inRift ? 2 : 1) * (1 + g.player.killXpMult);
      const xpValue = killResult.xp * xpMult;
      const overflow = g.gems.spawn(
        killResult.pos.x, killResult.pos.z, xpValue,
        g.player.position.x, g.player.position.z
      );
      if (overflow > 0) {
        const levels = g.player.addXp(overflow);
        if (levels > 0) g.queueLevelUp(levels);
      }
      if (g.player.coinMult > 0) {
        g.runCoins += Math.max(1, Math.floor(g.player.coinMult * 10));
      }
      g.quests.track('kills');
      if (enemy?.type === 'elite' && !killResult.isBoss) {
        g.quests.track('elites');
      }
      if (killResult.isBoss) {
        g._runBosses++;
        g.quests.track('bosses');
        if (enemy?.isMesaGuardian) {
          g.quests.track('guardians');
          g.interactables.removeMesaBeaconForGuardian(enemy);
        }
        g.interactables.spawnChest(killResult.pos.x, killResult.pos.z, killResult.pos.y);
      }
      const color = element === 'fire' ? 0xff6644 : element === 'ice' ? 0x88ccff : element === 'lightning' ? 0xffff44 : 0x44ff88;
      g.particles.burst(killResult.pos.x, killResult.pos.z, color);
      g.audio.kill();
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
      this.handleCombatHit(bonkDmg, result, null, enemy, { skipProcs: true, isCrit: true });
    }

    if (g.player.explodeChance > 0 && runRandom() < g.player.explodeChance) {
      const explodeDmg = damage * 0.65;
      const nearby = g.enemies.getNearby(ex, ez, 4);
      for (const { enemy: e2 } of nearby) {
        if (!e2.alive || e2 === enemy) continue;
        const result = g.enemies.damageEnemy(e2, explodeDmg, null);
        this.handleCombatHit(explodeDmg, result, null, e2, { skipProcs: true });
      }
      g.particles.burst(ex, ez, 0xff8844);
    }

    if (isCrit && g.player.critSplash > 0 && runRandom() < g.player.critSplash) {
      const splashDmg = damage * 0.5;
      const nearby = g.enemies.getNearby(ex, ez, 3.5);
      for (const { enemy: e2 } of nearby) {
        if (!e2.alive || e2 === enemy) continue;
        const result = g.enemies.damageEnemy(e2, splashDmg, null);
        this.handleCombatHit(splashDmg, result, null, e2, { skipProcs: true });
      }
    }
  }

  /** Player auto-attack when attack timer is ready. */
  tryAutoFire() {
    const g = this.game;
    if (!g.player.canAttack()) return;

    const nearby = g.enemies.getNearby(g.player.position.x, g.player.position.z, 20);
    if (nearby.length === 0) return;

    const sorted = nearby.slice().sort((a, b) => a.dist - b.dist);
    const primary = sorted[0]?.enemy;
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
    const targets = [];
    for (let i = 0; i < g.player.projectileCount; i++) {
      const pick = i < sorted.length ? sorted[i] : sorted[0];
      targets.push(pick.enemy);
    }
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
