import { describe, it, expect, beforeEach, vi } from 'vitest';

function stubMatchMedia(map) {
  vi.stubGlobal('window', {
    matchMedia: (query) => ({
      matches: !!map[query],
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

describe('mobileLayout', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('exports expected media query lists', async () => {
    stubMatchMedia({});
    const mod = await import('../src/lib/mobileLayout.js');
    expect(mod.MQ_TOUCH_CONTROLS.length).toBeGreaterThan(0);
    expect(mod.MQ_ROTATE_HINT.length).toBeGreaterThan(0);
  });

  it('prefers touch on coarse pointer', async () => {
    stubMatchMedia({ '(pointer: coarse)': true });
    const { prefersTouchControls } = await import('../src/lib/mobileLayout.js');
    expect(prefersTouchControls()).toBe(true);
  });

  it('prefers touch on landscape phone height', async () => {
    stubMatchMedia({ '(orientation: landscape) and (max-height: 500px)': true });
    const { prefersTouchControls, isMobilePerformanceTier } = await import('../src/lib/mobileLayout.js');
    expect(prefersTouchControls()).toBe(true);
    expect(isMobilePerformanceTier()).toBe(true);
  });

  it('shows rotate hint in portrait on narrow coarse devices', async () => {
    stubMatchMedia({
      '(orientation: portrait) and (max-width: 900px) and (pointer: coarse)': true,
    });
    const { needsRotateHint } = await import('../src/lib/mobileLayout.js');
    expect(needsRotateHint()).toBe(true);
  });
});
