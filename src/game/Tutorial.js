import { saveData } from './SaveData.js';

export const TUTORIAL_STEPS = [
  { id: 'move', title: 'Move', body: 'Use WASD or the left stick to dodge the horde.' },
  { id: 'dodge', title: 'Dodge Roll', body: 'Press Q (or LB) for i-frames — saves you from contact damage.' },
  { id: 'magnet', title: 'Magnet Pulse', body: 'Press Space to vacuum XP gems when level-ups are close.' },
  { id: 'levelup', title: 'Level Up', body: 'Pick upgrades when the bar fills — stack elements for Tri-Zonk Nova.' },
  { id: 'rift', title: 'Zonk Rift', body: 'Purple portals spawn over time. Enter for 2× XP but heavier spawns.' },
];

export function isTutorialComplete() {
  return saveData.data.tutorialComplete === true;
}

export function getTutorialStepIndex() {
  if (isTutorialComplete()) return TUTORIAL_STEPS.length;
  return Math.min(saveData.data.tutorialStep ?? 0, TUTORIAL_STEPS.length);
}

export function getCurrentTutorialStep() {
  const idx = getTutorialStepIndex();
  return idx < TUTORIAL_STEPS.length ? TUTORIAL_STEPS[idx] : null;
}

export function advanceTutorialStep() {
  if (isTutorialComplete()) return false;
  const next = (saveData.data.tutorialStep ?? 0) + 1;
  if (next >= TUTORIAL_STEPS.length) {
    saveData.data.tutorialComplete = true;
    saveData.data.tutorialStep = TUTORIAL_STEPS.length;
  } else {
    saveData.data.tutorialStep = next;
  }
  saveData.save();
  return true;
}

export function shouldShowTutorial() {
  return !isTutorialComplete() && getCurrentTutorialStep() != null;
}
