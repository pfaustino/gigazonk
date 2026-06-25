import { QUESTS } from './constants.js';
import { saveData } from './SaveData.js';
import { runRandomInt } from '../lib/runRandom.js';

export class QuestSystem {
  constructor() {
    this.progress = {};
    this._needsCompletionCheck = false;
    this.resetRun();
  }

  resetRun() {
    this._needsCompletionCheck = false;
    this.progress = {
      kills: 0,
      chests: 0,
      pots: 0,
      gems: 0,
      guardians: 0,
      elites: 0,
      time: 0,
      level: 1,
      wave: 1,
      bosses: 0,
      rifts: 0,
      gigaspawns: 0,
      coins: 0,
      combo: 0,
      shrines: 0,
      citizens: 0,
    };
  }

  update(dt, player, extras = {}) {
    this.progress.time += dt;
    this.progress.level = player.level;
    if (extras.wave) {
      this.progress.wave = Math.max(this.progress.wave || 1, extras.wave);
    }
    if (extras.runCoins != null) {
      this.progress.coins = Math.max(this.progress.coins || 0, extras.runCoins);
    }
    if (player.combo > (this.progress.combo || 0)) {
      this.progress.combo = player.combo;
    }
    this.checkCompletions();
  }

  track(type, amount = 1) {
    this.progress[type] = (this.progress[type] || 0) + amount;
    this._needsCompletionCheck = true;
  }

  flushCompletions() {
    if (!this._needsCompletionCheck) return null;
    this._needsCompletionCheck = false;
    return this.checkCompletions();
  }

  checkCompletions() {
    let lastCompleted = null;
    for (;;) {
      let completed = null;
      for (const questId of saveData.data.activeQuests) {
        const quest = QUESTS.find(q => q.id === questId);
        if (!quest) continue;
        const current = this.progress[quest.type] || 0;
        if (current >= quest.target) {
          saveData.addCoins(quest.reward);
          saveData.completeQuest(questId);
          saveData.addReputation(5);
          completed = { completed: quest, reward: quest.reward };
          break;
        }
      }
      if (!completed) break;
      lastCompleted = completed;
      this.discoverUpcoming(2);
      this.assignNewQuests();
    }
    return lastCompleted;
  }

  getActiveQuests() {
    this.assignNewQuests();
    return saveData.data.activeQuests.map(id => {
      const quest = QUESTS.find(q => q.id === id);
      if (!quest) return null;
      const raw = this.progress[quest.type] || 0;
      const current = quest.type === 'time'
        ? Math.min(Math.floor(raw), quest.target)
        : Math.min(raw, quest.target);
      return {
        ...quest,
        current,
      };
    }).filter(Boolean);
  }

  assignNewQuests() {
    const available = QUESTS.filter(q =>
      !saveData.data.completedQuests.includes(q.id) &&
      !saveData.data.activeQuests.includes(q.id)
    );
    const newlyActive = [];
    while (saveData.data.activeQuests.length < 3 && available.length > 0) {
      const pick = available.splice(runRandomInt(available.length), 1)[0];
      saveData.data.activeQuests.push(pick.id);
      newlyActive.push(pick.id);
    }
    if (newlyActive.length > 0) {
      saveData.discoverQuests(newlyActive);
      saveData.save();
    }
  }

  discoverUpcoming(count = 2) {
    const locked = QUESTS.filter((q) => !saveData.data.discoveredQuests.includes(q.id));
    const picks = [];
    for (let i = 0; i < count && locked.length > 0; i++) {
      const idx = runRandomInt(locked.length);
      picks.push(locked.splice(idx, 1)[0].id);
    }
    if (picks.length > 0) saveData.discoverQuests(picks);
  }

  getQuestBoardTiles() {
    const activeMap = new Map(this.getActiveQuests().map((q) => [q.id, q]));
    const completed = new Set(saveData.data.completedQuests);
    const active = new Set(saveData.data.activeQuests);
    const discovered = new Set(saveData.data.discoveredQuests);

    const tiles = QUESTS.map((quest) => {
      let status;
      if (completed.has(quest.id)) status = 'completed';
      else if (active.has(quest.id)) status = 'current';
      else if (discovered.has(quest.id)) status = 'next';
      else status = 'locked';

      const activeQuest = activeMap.get(quest.id);
      return {
        ...quest,
        status,
        current: activeQuest?.current ?? 0,
      };
    });

    const order = { current: 0, next: 1, completed: 2, locked: 3 };
    tiles.sort((a, b) => {
      const byStatus = order[a.status] - order[b.status];
      if (byStatus !== 0) return byStatus;
      return a.desc.localeCompare(b.desc);
    });
    return tiles;
  }
}
