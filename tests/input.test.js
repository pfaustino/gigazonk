import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function stubMatchMedia(touch = true) {
  vi.stubGlobal('window', {
    matchMedia: (query) => ({
      matches: touch && (
        query.includes('pointer: coarse')
        || query.includes('max-height: 500px')
        || query.includes('hover: none')
      ),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    addEventListener: () => {},
    dispatchEvent: () => true,
  });
  vi.stubGlobal('document', {
    addEventListener: () => {},
    pointerLockElement: null,
  });
}

describe('Input touch movement', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('touch down is not cancelled by stuck LMB forward on mobile', async () => {
    stubMatchMedia(true);
    const canvas = {
      parentElement: null,
      classList: { toggle: () => {}, remove: () => {} },
      addEventListener: () => {},
      contains: () => false,
      requestPointerLock: () => {},
    };
    const { Input } = await import('../src/game/Input.js');
    const input = new Input(canvas);
    input.pointer.left = true;
    input.setTouchMove(0, 1);
    const move = input.getMoveVector();
    expect(move.z).toBeGreaterThan(0.9);
    expect(move.x).toBe(0);
  });
});
