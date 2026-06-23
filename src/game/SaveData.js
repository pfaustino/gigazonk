import { DEFAULT_SETTINGS } from './settings.js';
import { QUESTS, isCharacterPlayable, DEFAULT_PLAYABLE_CHARACTER } from './constants.js';
import {
  SKILL_MAX_LEVEL,
  SKILL_TREE,
  getSkillById,
  getSkillUpgradeCost,
  migrateSkillLevels,
} from './SkillTree.js';

const SAVE_KEY = 'gigazonk_save';

const DEFAULT_SAVE = {
  zonkCoins: 0,
  reputation: 0,
  skillLevels: {},
  totalKills: 0,
  totalRuns: 0,
  bestTime: 0,
  activeQuests: ['kill_50', 'chests_3', 'survive_5'],
  completedQuests: [],
  discoveredQuests: ['kill_50', 'chests_3', 'survive_5'],
  selectedCharacter: 'fox',
  unlockedCharacters: ['fox'],
  settings: { ...DEFAULT_SETTINGS },
  runSnapshot: null,
  savedAt: null,
};

function migrateDiscoveredQuests(parsed) {
  const discovered = new Set([
    ...(parsed.discoveredQuests ?? []),
    ...(parsed.activeQuests ?? DEFAULT_SAVE.activeQuests),
    ...(parsed.completedQuests ?? []),
  ]);
  // Legacy saves: reveal the full remaining pool as "up next" instead of locking it.
  if (!parsed.discoveredQuests) {
    for (const quest of QUESTS) {
      if (!parsed.completedQuests?.includes(quest.id) && !parsed.activeQuests?.includes(quest.id)) {
        discovered.add(quest.id);
      }
    }
  }
  return [...discovered].filter((id) => QUESTS.some((q) => q.id === id));
}

export class SaveData {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SAVE,
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          skillLevels: migrateSkillLevels(parsed),
          activeQuests: (parsed.activeQuests ?? DEFAULT_SAVE.activeQuests)
            .filter((id) => QUESTS.some((q) => q.id === id)),
          discoveredQuests: migrateDiscoveredQuests(parsed),
          unlockedCharacters: parsed.unlockedCharacters || DEFAULT_SAVE.unlockedCharacters,
          selectedCharacter: isCharacterPlayable(parsed.selectedCharacter)
            ? (parsed.selectedCharacter || DEFAULT_SAVE.selectedCharacter)
            : DEFAULT_PLAYABLE_CHARACTER,
          runSnapshot: parsed.runSnapshot ?? null,
          savedAt: parsed.savedAt ?? null,
        };
      }
    } catch { /* ignore */ }
    return structuredClone(DEFAULT_SAVE);
  }

  save() {
    this.data.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
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
