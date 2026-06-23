if (import.meta.env.DEV) {
  void import('virtual:mcp');
}
import { ErrorReporter } from './lib/ErrorReporter.js';
import { installGlobalErrorHandlers } from './lib/errorHandlers.js';
import { Game } from './game/Game.js';

let gameRef = null;

installGlobalErrorHandlers(() => gameRef?.getErrorContext?.());

const canvas = document.getElementById('game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas element');
}

gameRef = new Game(canvas);

if (import.meta.env.DEV) {
  window.__gigazonkErrors = {
    exportText: () => ErrorReporter.exportText(),
    exportJson: () => ErrorReporter.exportJson(),
  };
  window.PLAYWRIGHT_THREE = {
    get scene() {
      return gameRef?.scene ?? null;
    },
    get state() {
      return gameRef?.state ?? null;
    },
  };
}
