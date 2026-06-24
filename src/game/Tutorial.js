import { saveData } from './SaveData.js';

/** Ordered onboarding — title → village → arena. */
export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    phase: 'title',
    title: 'Welcome to GigaZonk',
    body: 'Survive the horde, loot the arena, and grow stronger in Zonka Village. Play jumps straight into a run; Enter Village opens the meta hub.',
  },
  {
    id: 'characters',
    phase: 'title',
    title: 'Choose Your Zonker',
    body: 'Each hero has a unique passive. Unlock more with Zonk Coins earned during runs.',
  },
  {
    id: 'village_hub',
    phase: 'village',
    title: 'Zonka Village',
    body: 'Walk with WASD and talk to NPCs with F. Reputation unlocks new landmarks as you complete quests.',
  },
  {
    id: 'village_menu',
    phase: 'village',
    title: 'Game Menu',
    action: 'openMenu',
    body: 'Press Esc (Start on gamepad) to open the menu — tweak settings, pause, or return to the title screen.',
  },
  {
    id: 'village_quests',
    phase: 'village',
    title: 'Quest Board',
    body: 'Elder Zonka stands on the west path. Press F at the Quests marker to view active quests and earn coins.',
  },
  {
    id: 'village_skills',
    phase: 'village',
    title: 'Coach Zonk',
    action: 'talkTrainer',
    body: 'Find Coach Zonk on the east path (Skill Tree). Press F to spend Zonk Coins on permanent upgrades — damage, speed, and more between runs.',
  },
  {
    id: 'village_merchant',
    phase: 'village',
    title: 'Bonk Merchant',
    body: 'The Bonk Merchant unlocks at 25 reputation — +25 run coins at each arena start.',
  },
  {
    id: 'village_portal',
    phase: 'village',
    title: 'Arena Portal',
    body: 'When you are ready, press F at the glowing portal to pick a hero and enter the arena.',
  },
  {
    id: 'move',
    phase: 'arena',
    title: 'Move',
    body: 'Use WASD or the left stick to dodge the horde. Enemies hurt on contact — keep moving!',
  },
  {
    id: 'arena_menu',
    phase: 'arena',
    title: 'Pause Anytime',
    body: 'Press Esc (Start on gamepad) mid-run for the game menu — pause, adjust settings, or retreat to Zonka Village.',
  },
  {
    id: 'touch',
    phase: 'arena',
    title: 'Touch Controls',
    body: 'On mobile, use the left stick to move and the right buttons for dodge, jump, and interact.',
  },
  {
    id: 'dodge',
    phase: 'arena',
    title: 'Dodge Roll',
    body: 'Press Q (or LB on a gamepad) to dodge roll. For a moment you cannot take damage. The Q icon sweeps like a clock while it recharges.',
  },
  {
    id: 'jump',
    phase: 'arena',
    title: 'Jump',
    body: 'Press Space (or RT on a gamepad) to jump. You are briefly invulnerable in the air — useful for crossing gaps and dodging hits.',
  },
  {
    id: 'interact',
    phase: 'arena',
    title: 'Interact',
    body: 'Walk over pots to smash them for loot. Press F at chests and shrines to open or activate them.',
  },
  {
    id: 'levelup',
    phase: 'arena',
    title: 'Level Up',
    body: 'Pick upgrades when the bar fills — stack Fire, Ice, and Lightning for Tri-Zonk Nova.',
  },
  {
    id: 'rift',
    phase: 'arena',
    title: 'Zonk Rift',
    body: 'Purple portals spawn over time. Step inside for 2× XP and much heavier enemy spawns.',
  },
  {
    id: 'boss',
    phase: 'arena',
    title: 'Zonk Lord',
    body: 'A Zonk Lord boss arrives on a timer. Watch for the red telegraph — defeating it drops treasure!',
  },
];

const STEP_INDEX = Object.fromEntries(TUTORIAL_STEPS.map((s, i) => [s.id, i]));

export function getTutorialStepCount() {
  return TUTORIAL_STEPS.length;
}

export function getTutorialStepIndexById(id) {
  return STEP_INDEX[id] ?? TUTORIAL_STEPS.length;
}

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

export function getTutorialPhaseForState(gameState) {
  if (gameState === 'title') return 'title';
  if (gameState === 'village') return 'village';
  if (gameState === 'arena') return 'arena';
  return null;
}

export function isStepForState(step, gameState) {
  if (!step) return false;
  const phase = getTutorialPhaseForState(gameState);
  return phase != null && step.phase === phase;
}

/** Jump ahead when the player skips village (Play → arena). */
export function skipTutorialStepsUntil(stepId) {
  if (isTutorialComplete()) return false;
  const target = STEP_INDEX[stepId];
  if (target == null) return false;
  const current = getTutorialStepIndex();
  if (current >= target) return false;
  saveData.data.tutorialStep = target;
  saveData.save();
  return true;
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

export function resetTutorialProgress() {
  saveData.data.tutorialStep = 0;
  saveData.data.tutorialComplete = false;
  saveData.save();
}
