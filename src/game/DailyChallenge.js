import { saveData } from './SaveData.js';

export const DAILY_SURVIVE_SECONDS = 180;
export const DAILY_BONUS_COINS = 50;

/** YYYYMMDD-style day key in local time. */
export function getDailyChallengeDay() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function syncDailyChallengeDay() {
  const today = getDailyChallengeDay();
  if (saveData.data.dailyChallengeDay !== today) {
    saveData.data.dailyChallengeDay = today;
    saveData.data.dailyChallengeCompleted = false;
    saveData.save();
  }
}

export function isDailyChallengeCompleted() {
  syncDailyChallengeDay();
  return !!saveData.data.dailyChallengeCompleted;
}

/** @returns {number} bonus coins granted (0 if already done or goal unmet) */
export function tryCompleteDailyChallenge(survivedSeconds) {
  syncDailyChallengeDay();
  if (saveData.data.dailyChallengeCompleted) return 0;
  if (survivedSeconds < DAILY_SURVIVE_SECONDS) return 0;
  saveData.data.dailyChallengeCompleted = true;
  saveData.addCoins(DAILY_BONUS_COINS);
  return DAILY_BONUS_COINS;
}

export function getDailyChallengeSeed() {
  return getDailyChallengeDay();
}

export function getDailyChallengeLabel() {
  const mins = Math.floor(DAILY_SURVIVE_SECONDS / 60);
  const done = isDailyChallengeCompleted();
  if (done) return `Daily challenge complete (+${DAILY_BONUS_COINS}🪙)`;
  return `Daily: survive ${mins} min for +${DAILY_BONUS_COINS}🪙`;
}
