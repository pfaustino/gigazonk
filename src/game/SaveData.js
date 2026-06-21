import { DEFAULT_SETTINGS } from './settings.js';

const SAVE_KEY = 'gigazonk_save';

const DEFAULT_SAVE = {
  zonkCoins: 0,
  reputation: 0,
  purchasedShop: [],
  totalKills: 0,
  totalRuns: 0,
  bestTime: 0,
  meta: {
    damage: 0,
    hp: 0,
    speed: 0,
    xp: 0,
    pickup: 0,
    startLevel: 0,
  },
  activeQuests: ['kill_50', 'chests_3', 'survive_5'],
  completedQuests: [],
  selectedCharacter: 'fox',
  unlockedCharacters: ['fox', 'knight'],
  settings: { ...DEFAULT_SETTINGS },
  runSnapshot: null,
  savedAt: null,
};

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
          meta: { ...DEFAULT_SAVE.meta, ...parsed.meta },
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          unlockedCharacters: parsed.unlockedCharacters || DEFAULT_SAVE.unlockedCharacters,
          selectedCharacter: parsed.selectedCharacter || DEFAULT_SAVE.selectedCharacter,
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

  buyShopItem(id) {
    if (this.data.purchasedShop.includes(id)) return false;
    this.data.purchasedShop.push(id);
    this.save();
    return true;
  }

  completeQuest(id) {
    if (!this.data.completedQuests.includes(id)) {
      this.data.completedQuests.push(id);
      this.data.activeQuests = this.data.activeQuests.filter(q => q !== id);
      this.save();
    }
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
