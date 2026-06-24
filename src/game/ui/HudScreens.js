import { SYNERGY_ELEMENTS } from '../constants.js';
import { ELEMENT_OFFER_INFO } from '../UpgradeText.js';
import { setGameReady, GAME_READY } from '../../lib/gameReady.js';

/** Build arena HUD DOM (bars, quests, buff track, synergy, prompts). */
export function buildHUD(ui) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.className = 'hud';
  hud.innerHTML = `
      <div class="hud-left">
        <div class="stat-bar">
          <label>Health</label>
          <div class="bar-track"><div class="bar-fill hp" id="hp-bar"></div></div>
        </div>
        <div class="stat-bar">
          <label>Experience</label>
          <div class="bar-track"><div class="bar-fill xp" id="xp-bar"></div></div>
        </div>
        <div class="stat-bar">
          <label>Combo</label>
          <div class="bar-track"><div class="bar-fill combo" id="combo-bar"></div></div>
        </div>
        <div class="ability-bar" id="ability-bar" aria-label="Abilities">
          <div class="ability-slot ability-ready" id="ability-dodge" title="Dodge roll — Q or LB (2s cooldown)">
            <span class="ability-icon" aria-hidden="true">💨</span>
            <span class="ability-key">Q</span>
            <div class="cooldown-radar hidden" id="dodge-cooldown-radar" aria-hidden="true">
              <div class="cooldown-sweep" id="dodge-cooldown-sweep"></div>
              <div class="cooldown-hand" id="dodge-cooldown-hand"></div>
            </div>
          </div>
        </div>
        <div class="hud-stat" id="level-stat">Level 1</div>
        <div class="hud-stat" id="run-coins-stat" style="color:#f7c948">Run 🪙 0</div>
        <div class="hud-stat" id="time-stat">0:00</div>
        <div class="hud-stat" id="wave-stat">Wave 1</div>
        <div class="hud-stat" id="enemy-stat">Enemies: 0</div>
        <div class="hud-stat" id="biome-stat" style="color:#a89fd4"></div>
      </div>
    `;

  const hudRight = document.createElement('div');
  hudRight.className = 'hud-right-stack';

  const buffBar = document.createElement('div');
  buffBar.className = 'buff-bar';
  buffBar.id = 'buff-bar';
  buffBar.innerHTML = `
      <h3>Buffs</h3>
      <div class="buff-bar-track" id="buff-bar-track">
        <span class="buff-empty">None yet</span>
      </div>
      <div id="buff-tooltip" class="buff-tooltip hidden" role="tooltip"></div>
    `;
  ui._bindBuffTooltips(buffBar);

  const quests = document.createElement('div');
  quests.className = 'quest-panel';
  quests.id = 'quest-panel';
  quests.innerHTML = '<h3>Quests</h3><div id="quest-list"></div>';

  hudRight.append(buffBar, quests);

  const synergy = document.createElement('div');
  synergy.className = 'synergy-bar';
  synergy.id = 'synergy-bar';
  SYNERGY_ELEMENTS.forEach(e => {
    const slot = document.createElement('div');
    slot.className = 'synergy-slot';
    slot.id = `syn-${e}`;
    slot.textContent = e === 'fire' ? '🔥' : e === 'ice' ? '❄️' : '⚡';
    const tip = ELEMENT_OFFER_INFO[e];
    if (tip) slot.title = `${tip.name}: ${tip.onHit} on hit when this element fires`;
    synergy.appendChild(slot);
  });

  const prompt = document.createElement('div');
  prompt.className = 'interact-prompt hidden';
  prompt.id = 'interact-prompt';
  prompt.textContent = '[F] Interact';

  const runAlert = document.createElement('div');
  runAlert.className = 'run-alert hidden';
  runAlert.id = 'run-alert';
  runAlert.setAttribute('aria-live', 'assertive');
  runAlert.textContent = 'RUN!';

  const toasts = document.createElement('div');
  toasts.className = 'toast-container';
  toasts.id = 'toasts';

  const hint = document.createElement('div');
  hint.className = 'controls-hint';
  hint.innerHTML = 'WASD / Left stick | RMB / Right stick camera | L3 Sprint | LB Dodge | RT Jump | LT Interact | D-pad Zoom | Start Menu';

  const rewardStrip = document.createElement('div');
  rewardStrip.className = 'reward-strip';
  rewardStrip.id = 'reward-strip';
  rewardStrip.innerHTML = '<div class="reward-strip-track" id="reward-strip-track"></div>';

  ui.runRewards = [];
  ui._rewardSeq = 0;
  ui._rewardQueue = [];
  ui._rewardShowcaseActive = false;
  ui.layer.append(hud, hudRight, synergy, prompt, runAlert, toasts, rewardStrip, hint);

  const damageFlash = document.createElement('div');
  damageFlash.id = 'damage-flash';
  damageFlash.className = 'damage-flash';
  damageFlash.setAttribute('aria-hidden', 'true');

  const lowHpVignette = document.createElement('div');
  lowHpVignette.id = 'low-hp-vignette';
  lowHpVignette.className = 'low-hp-vignette';
  lowHpVignette.setAttribute('aria-hidden', 'true');

  ui.layer.append(damageFlash, lowHpVignette);

  const bossIntro = document.createElement('div');
  bossIntro.className = 'boss-intro hidden';
  bossIntro.id = 'boss-intro';
  bossIntro.setAttribute('aria-live', 'assertive');
  bossIntro.innerHTML = `
    <span class="boss-intro-title">ZONK LORD</span>
    <span class="boss-intro-sub">#1</span>
  `;
  ui.layer.append(bossIntro);

  const bossDefeat = document.createElement('div');
  bossDefeat.className = 'boss-defeat hidden';
  bossDefeat.id = 'boss-defeat';
  bossDefeat.setAttribute('aria-live', 'assertive');
  bossDefeat.innerHTML = `
    <span class="boss-defeat-title">ZONK LORD SLAIN</span>
    <span class="boss-defeat-sub">Treasure dropped</span>
  `;
  ui.layer.append(bossDefeat);

  const bossVictoryFlash = document.createElement('div');
  bossVictoryFlash.id = 'boss-victory-flash';
  bossVictoryFlash.className = 'boss-victory-flash';
  bossVictoryFlash.setAttribute('aria-hidden', 'true');
  ui.layer.append(bossVictoryFlash);

  setGameReady(GAME_READY.ARENA_HUD);
}
