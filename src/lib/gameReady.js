/** E2e / boot readiness phases exposed on `<html data-game-ready>`. */
export const GAME_READY = {
  TITLE: 'title',
  ARENA_HUD: 'arena-hud',
  VILLAGE: 'village',
};

export function setGameReady(phase) {
  document.documentElement.dataset.gameReady = phase;
}

export function clearGameReady() {
  delete document.documentElement.dataset.gameReady;
}
