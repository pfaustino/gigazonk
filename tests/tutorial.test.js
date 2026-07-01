import { describe, it, expect, beforeEach } from 'vitest';
import {
  TUTORIAL_STEPS,
  getCurrentTutorialStep,
  getTutorialStepIndex,
  advanceTutorialStep,
  skipTutorialStepsUntil,
  isStepForState,
  isTutorialComplete,
  resetTutorialProgress,
  shouldShowTutorial,
  setTutorialHidden,
  isTutorialHidden,
  enableTutorialHints,
} from '../src/game/Tutorial.js';

describe('Tutorial', () => {
  beforeEach(() => {
    resetTutorialProgress();
  });

  it('starts on welcome step', () => {
    expect(getCurrentTutorialStep()?.id).toBe('welcome');
    expect(isTutorialComplete()).toBe(false);
  });

  it('advances through steps in order', () => {
    advanceTutorialStep();
    expect(getCurrentTutorialStep()?.id).toBe('characters');
    advanceTutorialStep();
    expect(getCurrentTutorialStep()?.id).toBe('village_hub');
  });

  it('marks complete after final step', () => {
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      advanceTutorialStep();
    }
    expect(isTutorialComplete()).toBe(true);
    expect(getCurrentTutorialStep()).toBeNull();
    expect(getTutorialStepIndex()).toBe(TUTORIAL_STEPS.length);
  });

  it('skips village steps when jumping to arena', () => {
    skipTutorialStepsUntil('move');
    expect(getCurrentTutorialStep()?.id).toBe('move');
    expect(isStepForState(getCurrentTutorialStep(), 'arena')).toBe(true);
  });

  it('does not skip backwards', () => {
    advanceTutorialStep();
    advanceTutorialStep();
    skipTutorialStepsUntil('welcome');
    expect(getTutorialStepIndex()).toBe(2);
  });

  it('includes Esc menu and Coach Zonk village steps', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(ids).toContain('village_menu');
    expect(ids).toContain('arena_menu');
    const coach = TUTORIAL_STEPS.find((s) => s.id === 'village_skills');
    expect(coach?.title).toBe('Coach Zonk');
    expect(coach?.action).toBe('talkTrainer');
    expect(TUTORIAL_STEPS.length).toBe(19);
  });

  it('includes citizen rescue arena step after interact', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    const interactIdx = ids.indexOf('interact');
    const citizenIdx = ids.indexOf('citizen_rescue');
    const burgerIdx = ids.indexOf('arena_burger');
    expect(citizenIdx).toBe(interactIdx + 1);
    expect(burgerIdx).toBe(citizenIdx + 1);
    expect(TUTORIAL_STEPS[citizenIdx]?.title).toBe('Rescue Citizens');
    expect(TUTORIAL_STEPS[burgerIdx]?.title).toBe('Golden Burger');
  });

  it('maps phases to game states', () => {
    expect(isStepForState({ phase: 'title' }, 'title')).toBe(true);
    expect(isStepForState({ phase: 'village' }, 'arena')).toBe(false);
    expect(isStepForState({ phase: 'arena' }, 'arena')).toBe(true);
  });

  it('hides tutorials when tutorialHidden is set', () => {
    expect(shouldShowTutorial()).toBe(true);
    setTutorialHidden(true);
    expect(shouldShowTutorial()).toBe(false);
    expect(isTutorialHidden()).toBe(true);
    expect(enableTutorialHints()).toBe(true);
    expect(shouldShowTutorial()).toBe(true);
  });
});
