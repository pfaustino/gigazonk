import { QUESTS } from './constants.js';
import { saveData } from './SaveData.js';

export class QuestSystem {
  constructor() {
    this.progress = {};
    this.resetRun();
  }

  resetRun() {
    this.progress = {
      kills: 0,
      chests: 0,
      pots: 0,
      time: 0,
      level: 1,
      bosses: 0,
      rifts: 0,
      gigaspawns: 0,
    };
  }

  update(dt, player) {
    this.progress.time += dt;
    this.progress.level = player.level;
  }

  track(type, amount = 1) {
    this.progress[type] = (this.progress[type] || 0) + amount;
    this.checkCompletions();
  }

  checkCompletions() {
    for (const questId of saveData.data.activeQuests) {
      const quest = QUESTS.find(q => q.id === questId);
      if (!quest) continue;
      const current = this.progress[quest.type] || 0;
      if (current >= quest.target) {
        saveData.addCoins(quest.reward);
        saveData.completeQuest(questId);
        saveData.addReputation(5);
        return { completed: quest, reward: quest.reward };
      }
    }
    return null;
  }

  getActiveQuests() {
    return saveData.data.activeQuests.map(id => {
      const quest = QUESTS.find(q => q.id === id);
      if (!quest) return null;
      return {
        ...quest,
        current: Math.min(this.progress[quest.type] || 0, quest.target),
      };
    }).filter(Boolean);
  }

  assignNewQuests() {
    const available = QUESTS.filter(q =>
      !saveData.data.completedQuests.includes(q.id) &&
      !saveData.data.activeQuests.includes(q.id)
    );
    while (saveData.data.activeQuests.length < 3 && available.length > 0) {
      const pick = available.splice(Math.floor(Math.random() * available.length), 1)[0];
      saveData.data.activeQuests.push(pick.id);
    }
    saveData.save();
  }
}
