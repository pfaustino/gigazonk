import { DEFAULT_SETTINGS } from './settings.js';
import { QUESTS, isCharacterPlayable, DEFAULT_PLAYABLE_CHARACTER } from './constants.js';
import {
  SKILL_MAX_LEVEL,
  getSkillById,
  getSkillUpgradeCost,
  migrateSkillLevels,
} from './SkillTree.js';
import { ErrorReporter } from '../lib/ErrorReporter.js';
import { recordRun } from './Leaderboard.js';

export const SAVE_KEY = 'gigazonk_save';

export const DEFAULT_SAVE = {
  zonkCoins: 0,
  reputation: 0,
  skillLevels: {},
  totalKills: 0,
  totalRuns: 0,
  bestTime: 0,
  bestKills: 0,
  recentRuns: [],
  leaderboardName: '',
  activeQuests: ['kill_50', 'chests_3', 'survive_5'],
  completedQuests: [],
  discoveredQuests: ['kill_50', 'chests_3', 'survive_5'],
  selectedCharacter: 'fox',
  unlockedCharacters: ['fox', 'knight'],
  unlockedAchievements: [],
  tutorialStep: 0,
  tutorialComplete: false,
  tutorialHidden: false,
  dailyChallengeDay: 0,
  dailyChallengeCompleted: false,
  runStats: { bosses: 0, rifts: 0, novaTriggered: false, maxCombo: 0 },
  settings: { ...DEFAULT_SETTINGS },
  runSnapshot: null,
  savedAt: null,
  saveVersion: '0.2.4',
};

const BURGER_QUEST_IDS = ['burgers_1', 'burgers_3', 'gobbles_10', 'gobbles_25'];

function migrateSave023(parsed, data) {
  const version = parsed.saveVersion ?? '0.2.0';
  if (version >= '0.2.3') return data;
  const discovered = new Set(data.discoveredQuests);
  for (const id of BURGER_QUEST_IDS) discovered.add(id);
  return { ...data, discoveredQuests: [...discovered], saveVersion: '0.2.3' };
}

function migrateSave024(parsed, data) {
  const version = parsed.saveVersion ?? '0.2.0';
  if (version >= '0.2.4') return data;
  return {
    ...data,
    bestKills: data.bestKills ?? 0,
    recentRuns: data.recentRuns ?? [],
    saveVersion: '0.2.4',
  };
}

function migrateDiscoveredQuests(parsed) {
  const discovered = new Set([
    ...(parsed.discoveredQuests ?? []),
    ...(parsed.activeQuests ?? DEFAULT_SAVE.activeQuests),
    ...(parsed.completedQuests ?? []),
  ]);
  if (!parsed.discoveredQuests) {
    for (const quest of QUESTS) {
      if (!parsed.completedQuests?.includes(quest.id) && !parsed.activeQuests?.includes(quest.id)) {
        discovered.add(quest.id);
      }
    }
  }
  return [...discovered].filter((id) => QUESTS.some((q) => q.id === id));
}

function migrateSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  if (merged.musicVolume == null && merged.sfxVolume == null && settings.masterVolume != null) {
    merged.musicVolume = settings.masterVolume;
    merged.sfxVolume = settings.masterVolume;
  }
  return merged;
}

/** Merge parsed localStorage JSON into a full save record (exported for tests). */
export function hydrateSave(parsed) {
  const base = {
    ...DEFAULT_SAVE,
    ...parsed,
    settings: migrateSettings(parsed.settings),
    skillLevels: migrateSkillLevels(parsed),
    activeQuests: (parsed.activeQuests ?? DEFAULT_SAVE.activeQuests)
      .filter((id) => QUESTS.some((q) => q.id === id)),
    discoveredQuests: migrateDiscoveredQuests(parsed),
    unlockedCharacters: parsed.unlockedCharacters?.length
      ? parsed.unlockedCharacters
      : DEFAULT_SAVE.unlockedCharacters,
    unlockedAchievements: parsed.unlockedAchievements ?? DEFAULT_SAVE.unlockedAchievements,
    tutorialStep: parsed.tutorialStep ?? DEFAULT_SAVE.tutorialStep,
    tutorialComplete: parsed.tutorialComplete ?? DEFAULT_SAVE.tutorialComplete,
    tutorialHidden: parsed.tutorialHidden ?? DEFAULT_SAVE.tutorialHidden,
    dailyChallengeDay: parsed.dailyChallengeDay ?? DEFAULT_SAVE.dailyChallengeDay,
    dailyChallengeCompleted: parsed.dailyChallengeCompleted ?? DEFAULT_SAVE.dailyChallengeCompleted,
    runStats: { ...DEFAULT_SAVE.runStats, ...parsed.runStats },
    bestKills: parsed.bestKills ?? DEFAULT_SAVE.bestKills,
    recentRuns: parsed.recentRuns ?? DEFAULT_SAVE.recentRuns,
    leaderboardName: parsed.leaderboardName ?? DEFAULT_SAVE.leaderboardName,
    saveVersion: parsed.saveVersion ?? DEFAULT_SAVE.saveVersion,
    selectedCharacter: isCharacterPlayable(parsed.selectedCharacter)
      ? (parsed.selectedCharacter || DEFAULT_SAVE.selectedCharacter)
      : DEFAULT_PLAYABLE_CHARACTER,
    runSnapshot: parsed.runSnapshot ?? null,
    savedAt: parsed.savedAt ?? null,
  };
  return migrateSave024(parsed, migrateSave023(parsed, base));
}

export class SaveData {
  constructor() {
    this.loadFailed = false;
    this.data = this.load();
  }

  load() {
    try {
      if (typeof localStorage === 'undefined') {
        return structuredClone(DEFAULT_SAVE);
      }
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw);
      return hydrateSave(parsed);
    } catch (err) {
      this.loadFailed = true;
      ErrorReporter.capture('SAVE_PARSE', err);
      return structuredClone(DEFAULT_SAVE);
    }
  }

  save() {
    try {
      if (typeof localStorage === 'undefined') return;
      this.data.savedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (err) {
      ErrorReporter.capture('SAVE_WRITE', err);
    }
  }

  reload() {
    this.data = this.load();
    return this.data;
  }

  addCoins(amount) {
    this.data.zonkCoins += amount;
    this.save();
  }

  spendCoins(amount) {
    if (this.data.zonkCoins < amount) return false;
    this.data.zonkCoins -= amount;
    this.save();
    return true;
  }

  getSkillLevel(id) {
    return this.data.skillLevels[id] ?? 0;
  }

  clearSkillLevels() {
    this.data.skillLevels = {};
    this.save();
  }

  applySkillUpgrade(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return false;

    const level = this.getSkillLevel(skillId);
    if (level >= SKILL_MAX_LEVEL) return false;

    const cost = getSkillUpgradeCost(skill, level);
    if (cost == null || !this.spendCoins(cost)) return false;

    this.data.skillLevels[skillId] = level + 1;
    this.save();
    return true;
  }

  recordRunStats(partial) {
    this.data.runStats = { ...this.data.runStats, ...partial };
    this.save();
  }

  /** Append a completed arena run to personal leaderboard history. */
  recordRunEntry(run) {
    const updated = recordRun(this.data, run);
    this.data.recentRuns = updated.recentRuns;
    this.data.bestKills = updated.bestKills;
    this.save();
  }

  setLeaderboardName(name) {
    const trimmed = String(name ?? '').trim().slice(0, 24);
    if (!trimmed) return false;
    this.data.leaderboardName = trimmed;
    this.save();
    return true;
  }

  completeQuest(id) {
    if (!this.data.completedQuests.includes(id)) {
      this.data.completedQuests.push(id);
      this.data.activeQuests = this.data.activeQuests.filter(q => q !== id);
      this.discoverQuest(id);
      this.save();
    }
  }

  discoverQuest(id) {
    if (!QUESTS.some((q) => q.id === id)) return false;
    if (this.data.discoveredQuests.includes(id)) return false;
    this.data.discoveredQuests.push(id);
    return true;
  }

  discoverQuests(ids) {
    let changed = false;
    for (const id of ids) {
      if (this.discoverQuest(id)) changed = true;
    }
    if (changed) this.save();
    return changed;
  }

  addReputation(amount) {
    this.data.reputation += amount;
    this.save();
  }

  unlockCharacter(id) {
    if (!this.data.unlockedCharacters.includes(id)) {
      this.data.unlockedCharacters.push(id);
      this.save();
      return true;
    }
    return false;
  }
}

export const saveData = new SaveData();
