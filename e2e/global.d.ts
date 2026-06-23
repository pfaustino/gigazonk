/** Dev-only hooks exposed on window in Vite dev. */
declare global {
  interface Window {
    __gigazonkErrors?: {
      exportText: () => string;
      exportJson: () => unknown[];
    };
    __gigazonkGame?: {
      ui: {
        showSkillTree: (onClose: () => void) => void;
        showQuestBoard: (questSystem: unknown, onClose: () => void) => void;
      };
      quests: unknown;
      leaveArenaForVillage: () => void;
      resumeArenaRun: () => void;
    };
    PLAYWRIGHT_THREE?: {
      scene: unknown;
      state: string | null;
    };
  }
}

export {};
