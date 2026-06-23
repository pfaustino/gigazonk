import achievementsJson from '../../data/achievements.json';
import { saveData } from './SaveData.js';

export const ACHIEVEMENTS = achievementsJson;

const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id) {
  return BY_ID[id];
}

export function isAchievementUnlocked(id) {
  return saveData.data.unlockedAchievements.includes(id);
}

/** @returns {import('../../data/achievements.json')[0] | null} newly unlocked */
export function unlockAchievement(id) {
  if (!BY_ID[id] || isAchievementUnlocked(id)) return null;
  saveData.data.unlockedAchievements.push(id);
  if (BY_ID[id].coins) saveData.addCoins(BY_ID[id].coins);
  else saveData.save();
  return BY_ID[id];
}

export function checkRunAchievements(runStats) {
  const unlocked = [];
  const tryUnlock = (id) => {
    const a = unlockAchievement(id);
    if (a) unlocked.push(a);
  };

  if (runStats.totalRuns >= 1) tryUnlock('first_run');
  if (runStats.kills >= 100) tryUnlock('slayer_100');
  if (runStats.kills >= 500) tryUnlock('slayer_500');
  if (runStats.time >= 300) tryUnlock('survive_5');
  if (runStats.time >= 600) tryUnlock('survive_10');
  if (runStats.bosses >= 1) tryUnlock('boss_first');
  if (runStats.rifts >= 1) tryUnlock('rift_runner');
  if (runStats.novaTriggered) tryUnlock('nova_tri');
  if (runStats.maxCombo >= 20) tryUnlock('combo_20');
  if (runStats.completedQuests >= 10) tryUnlock('quest_10');
  if (runStats.dailyCompleted) tryUnlock('daily_done');

  return unlocked;
}

export function checkSkillAchievement() {
  const hasSkill = Object.values(saveData.data.skillLevels).some((lv) => lv > 0);
  if (!hasSkill) return null;
  return unlockAchievement('skill_first');
}
