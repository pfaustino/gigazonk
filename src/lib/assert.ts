import { GameError } from './GameError.js';

/**
 * Assert an invariant. Use for states that should never occur if logic is correct.
 */
export function assert(
  condition: boolean,
  code: string,
  recovery?: (err: GameError) => void,
): void {
  if (condition) return;
  const err = new GameError(code, `Invariant failed: ${code}`);
  if (recovery) {
    recovery(err);
    return;
  }
  throw err;
}
