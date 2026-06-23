import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { GAME_VERSION } from '../src/game/constants.js';

describe('release version', () => {
  it('package.json matches GAME_VERSION (Pages + itch.io labels)', () => {
    expect(GAME_VERSION).toBe(pkg.version);
  });
});
