import { BIOMES } from '../game/constants.js';
import { getActiveRunRng } from '../lib/runRandom.js';

/**
 * Dev-only panel (?dev=1 or Vite dev). Wired to Game dev commands.
 */
export class DevPanel {
  constructor(game) {
    this.game = game;
    this.root = document.createElement('div');
    this.root.id = 'dev-panel';
    this.root.innerHTML = `
      <button type="button" class="dev-panel-toggle" id="dev-toggle">DEV</button>
      <div class="dev-panel-body" id="dev-body" hidden>
        <div class="dev-panel-row"><span>Seed</span><code id="dev-seed"></code></div>
        <div class="dev-panel-row"><span>RNG</span><code id="dev-rng"></code></div>
        <div class="dev-panel-actions">
          <span class="dev-panel-section-label">Arena</span>
          <button type="button" data-cmd="skip300">+5 min</button>
          <button type="button" data-cmd="skip600">+10 min</button>
          <button type="button" data-cmd="spawn50">Spawn 50</button>
          <button type="button" data-cmd="boss">Boss</button>
          <button type="button" data-cmd="clear">Clear horde</button>
          <button type="button" data-cmd="level">Level up</button>
          <button type="button" data-cmd="fillxp">Fill XP</button>
        </div>
        <div class="dev-panel-actions">
          <span class="dev-panel-section-label">Cheats</span>
          <button type="button" data-cmd="god" data-toggle="god">God mode</button>
          <button type="button" data-cmd="mega" data-toggle="mega">Mega dmg</button>
          <button type="button" data-cmd="heal">Full heal</button>
        </div>
        <div class="dev-panel-actions">
          <span class="dev-panel-section-label">Meta</span>
          <button type="button" data-cmd="coins100">+100 coins</button>
          <button type="button" data-cmd="rep50">+50 rep</button>
          <button type="button" data-cmd="unlockchars">Unlock chars</button>
          <button type="button" data-cmd="resettutorial">Reset tutorial</button>
          <button type="button" data-cmd="exportErrors">Export errors</button>
        </div>
        <div class="dev-panel-biomes" id="dev-biomes"></div>
      </div>
    `;
    document.body.appendChild(this.root);

    this.toggle = this.root.querySelector('#dev-toggle');
    this.body = this.root.querySelector('#dev-body');
    this.seedEl = this.root.querySelector('#dev-seed');
    this.rngEl = this.root.querySelector('#dev-rng');
    this.biomesEl = this.root.querySelector('#dev-biomes');

    this.toggle.addEventListener('click', () => {
      const open = this.body.hidden;
      this.body.hidden = !open;
      this.toggle.classList.toggle('open', open);
    });

    this.root.querySelectorAll('.dev-panel-actions').forEach((group) => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-cmd]');
        if (!btn) return;
        this.runCommand(btn.dataset.cmd);
        this.syncToggleButtons();
      });
    });

    this._renderBiomes();
    this.syncToggleButtons();
    this._tick = () => this.refresh();
    requestAnimationFrame(this._tick);
  }

  syncToggleButtons() {
    const { player } = this.game;
    this.root.querySelector('[data-toggle="god"]')?.classList.toggle('dev-active', !!player?.devGodMode);
    this.root.querySelector('[data-toggle="mega"]')?.classList.toggle('dev-active', !!player?.devMegaDamage);
  }

  refresh() {
    if (this.seedEl) this.seedEl.textContent = String(this.game.runSeed ?? '—');
    if (this.rngEl) this.rngEl.textContent = String(getActiveRunRng()?.getState() ?? '—');
    this.syncToggleButtons();
    requestAnimationFrame(this._tick);
  }

  _renderBiomes() {
    this.biomesEl.innerHTML = BIOMES.map((b) =>
      `<button type="button" data-biome="${b.id}">${b.name}</button>`
    ).join('');
    this.biomesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-biome]');
      if (!btn) return;
      this.game.devSetBiome(btn.dataset.biome);
    });
  }

  runCommand(cmd) {
    switch (cmd) {
      case 'skip300':
        this.game.devSkipToTime(300);
        break;
      case 'skip600':
        this.game.devSkipToTime(600);
        break;
      case 'spawn50':
        this.game.devSpawnEnemies(50);
        break;
      case 'boss':
        this.game.devSpawnBoss();
        break;
      case 'clear':
        this.game.devClearHorde();
        break;
      case 'coins100':
        this.game.devAddMetaCoins(100);
        break;
      case 'level':
        this.game.devForceLevelUp();
        break;
      case 'fillxp':
        this.game.devFillXp();
        break;
      case 'god':
        this.game.devToggleGodMode();
        break;
      case 'mega':
        this.game.devToggleMegaDamage();
        break;
      case 'heal':
        this.game.devFullHeal();
        break;
      case 'rep50':
        this.game.devAddReputation(50);
        break;
      case 'unlockchars':
        this.game.devUnlockAllCharacters();
        break;
      case 'resettutorial':
        this.game.devResetTutorial();
        break;
      case 'exportErrors':
        this.game.devExportErrors();
        break;
      default:
        break;
    }
  }

  destroy() {
    this.root.remove();
  }
}
