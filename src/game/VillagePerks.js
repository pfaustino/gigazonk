import {
  VILLAGE_CLEAR_ZONES,
  VILLAGE_REP_PERKS,
  VILLAGE_QUEST_RALLY_MIN,
  VILLAGE_QUEST_RALLY_DAMAGE,
} from './constants.js';
import { saveData } from './SaveData.js';

export function isInVillageClearZone(x, z, pad = 0) {
  for (const zone of VILLAGE_CLEAR_ZONES) {
    if (Math.hypot(x - zone.x, z - zone.z) < zone.r + pad) return true;
  }
  return false;
}

export function getActiveVillagePerks(reputation = saveData.data.reputation) {
  return VILLAGE_REP_PERKS.filter((p) => reputation >= p.minRep);
}

export function getNextVillagePerk(reputation = saveData.data.reputation) {
  return VILLAGE_REP_PERKS.find((p) => reputation < p.minRep) ?? null;
}

const QUEST_RALLY_PERK = {
  id: 'quest_rally',
  icon: '📜',
  name: 'Quest Rally',
  desc: `+${Math.round(VILLAGE_QUEST_RALLY_DAMAGE * 100)}% damage (${VILLAGE_QUEST_RALLY_MIN}+ active quests)`,
};

/** Apply reputation + quest perks after player.reset() (skills already applied). */
export function applyVillagePerksToRun(player, game) {
  const applied = [];

  for (const perk of getActiveVillagePerks()) {
    if (perk.maxHpMult) {
      player.maxHp *= 1 + perk.maxHpMult;
      player.hp = player.maxHp;
    }
    if (perk.pickupMult) player.pickupRadius *= 1 + perk.pickupMult;
    if (perk.bossDamageMult) {
      player.bossDamageMult = (player.bossDamageMult ?? 0) + perk.bossDamageMult;
    }
    if (perk.xpMult) player._skillXpMult = (player._skillXpMult ?? 0) + perk.xpMult;
    if (perk.runCoins && game) game.runCoins += perk.runCoins;
    if (perk.burgerFrenzyBonusSec) {
      player._burgerFrenzyBonusSec = (player._burgerFrenzyBonusSec ?? 0) + perk.burgerFrenzyBonusSec;
    }
    if (perk.burgerRespawnReductionSec) {
      player._burgerRespawnReductionSec = (player._burgerRespawnReductionSec ?? 0) + perk.burgerRespawnReductionSec;
    }
    applied.push(perk);
  }

  const activeQuests = saveData.data.activeQuests?.length ?? 0;
  if (activeQuests >= VILLAGE_QUEST_RALLY_MIN) {
    player.damage *= 1 + VILLAGE_QUEST_RALLY_DAMAGE;
    applied.push(QUEST_RALLY_PERK);
  }

  return applied;
}

export function formatVillagePerksToast(perks) {
  if (!perks?.length) return '';
  return perks.map((p) => `${p.icon} ${p.name}`).join(' · ');
}

export function formatVillagePerksHud(perks) {
  if (!perks?.length) return '';
  return perks.map((p) => `${p.icon} ${p.desc}`).join(' · ');
}
