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
      gems: 0,
      guardians: 0,
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
    let added = false;
    while (saveData.data.activeQuests.length < 3 && available.length > 0) {
      const pick = available.splice(Math.floor(Math.random() * available.length), 1)[0];
      saveData.data.activeQuests.push(pick.id);
      added = true;
    }
    if (added) saveData.save();
  }
}
