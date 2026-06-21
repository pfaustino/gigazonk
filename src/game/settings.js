export const DIFFICULTIES = {
  easy: { label: 'Easy', desc: 'Fewer foes, gentler scaling', spawnMult: 0.72, hpMult: 0.85 },
  normal: { label: 'Normal', desc: 'The classic Zonk experience', spawnMult: 1, hpMult: 1 },
  hard: { label: 'Hard', desc: 'More monsters, more pain', spawnMult: 1.35, hpMult: 1.2 },
};

export const LANGUAGES = {
  en: { label: 'English', ready: true },
  es: { label: 'Español (soon)', ready: false },
  fr: { label: 'Français (soon)', ready: false },
};

export const DEFAULT_SETTINGS = {
  masterVolume: 0.3,
  sfxEnabled: true,
  language: 'en',
  difficulty: 'normal',
  invertMouseY: false,
};

export function getDifficultyFromId(id) {
  return DIFFICULTIES[id] || DIFFICULTIES.normal;
}
