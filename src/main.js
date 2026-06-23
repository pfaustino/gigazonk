if (import.meta.env.DEV) {
  void import('virtual:mcp');
}
import { installGlobalErrorHandlers } from './lib/errorHandlers.js';
import { Game } from './game/Game.js';

let gameRef = null;

installGlobalErrorHandlers(() => gameRef?.getErrorContext?.());

const canvas = document.getElementById('game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas element');
}

gameRef = new Game(canvas);
