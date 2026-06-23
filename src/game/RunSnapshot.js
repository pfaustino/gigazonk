import { BIOMES } from './constants.js';
import { RunRng } from '../lib/RunRng.js';
import { getActiveRunRng, setActiveRunRng } from '../lib/runRandom.js';

/**
 * Mid-arena run snapshot — player stats + run timers + RNG.
 *
 * Restored on resume: player build, elapsed time, boss/giga timers, biome, run seed.
 * NOT restored: live enemies, projectiles, gems, chests, pending level-ups, battlefield layout.
 */

export function captureRunSnapshot(game) {
  return {
    state: game.state,
    elapsed: game.elapsed,
    runCoins: game.runCoins,
    coinsAlreadyBanked: game.coinsAlreadyBanked,
    bossTimer: game.bossTimer,
    bossCount: game.bossCount,
    inRift: game.inRift,
    gigaSpawnTimer: game.gigaSpawnTimer,
    pendingGigaSpawn: game.pendingGigaSpawn,
    gigaSpawnSurvivalTimer: game.gigaSpawnSurvivalTimer,
    pausedInVillage: false,
    characterId: game.player.characterId,
    player: game.player.serialize(),
    biomeId: game.currentBiome?.id,
    runSeed: game.runSeed,
    rngState: getActiveRunRng()?.getState() ?? null,
  };
}

export function restoreArenaTimers(game, snap) {
  game.elapsed = snap.elapsed;
  game.runCoins = snap.runCoins;
  game.coinsAlreadyBanked = snap.coinsAlreadyBanked ?? 0;
  game.bossTimer = snap.bossTimer;
  game.bossCount = snap.bossCount;
  game.inRift = snap.inRift;
  game.gigaSpawnTimer = snap.gigaSpawnTimer ?? 0;
  game.pendingGigaSpawn = snap.pendingGigaSpawn ?? false;
  game.gigaSpawnSurvivalTimer = snap.gigaSpawnSurvivalTimer ?? 0;
  if (snap.runSeed != null) {
    game.runSeed = snap.runSeed;
    if (snap.rngState != null) {
      setActiveRunRng(RunRng.fromState(snap.runSeed, snap.rngState));
    } else {
      setActiveRunRng(new RunRng(snap.runSeed));
    }
  }
}

export function restoreBiomeFromSnapshot(game, snap) {
  if (!snap.biomeId) return;
  const biome = BIOMES.find(b => b.id === snap.biomeId);
  if (!biome) return;
  game.currentBiome = biome;
  game.arena.setBiome(biome);
  game.setSkyColor(biome.sky);
}

export function applyPlayerFromSnapshot(game, snap) {
  game.player.applySnapshot(snap.player, snap.characterId);
}

export function restoreArenaFromSnapshot(game, snap) {
  restoreArenaTimers(game, snap);
  applyPlayerFromSnapshot(game, snap);
  restoreBiomeFromSnapshot(game, snap);
}
