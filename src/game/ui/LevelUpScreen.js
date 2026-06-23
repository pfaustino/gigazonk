import { CONFIRM_HINT, bindGridNavigation } from './MenuNavigation.js';
import { getUpgradePreview, getUpgradeBuffHighlights } from '../UpgradeSystem.js';

function navCtx(ui) {
  return { layer: ui.layer, audio: ui._audio };
}

export function showLevelUp(ui, choices, player, onPick) {
  if (!choices?.length) return false;

  ui.dismissLevelUp();
  ui.dismissRewardFlyers();
  ui.renderBuffBar(player);

  const container = document.getElementById('game-container') || ui.layer;
  const screen = document.createElement('div');
  screen.id = 'levelup-overlay';
  screen.className = 'screen levelup-screen';
  screen.innerHTML = `
      <div class="levelup-buff-panel">
        <div class="buff-bar levelup-buff-bar" id="levelup-buff-bar">
          <h3>Buffs</h3>
          <p class="levelup-buff-hint">Run buffs — gold chips change with the selected card</p>
          <div class="buff-bar-track" id="levelup-buff-bar-track">
            <span class="buff-empty">None yet</span>
          </div>
          <div id="levelup-buff-tooltip" class="buff-tooltip hidden" role="tooltip"></div>
        </div>
      </div>
      <div class="levelup-body">
        <h2 style="font-size:36px;color:#f7c948">LEVEL UP!</h2>
        <p style="color:#888;margin-bottom:8px">Choose your Zonk upgrade</p>
        <p style="color:#666;font-size:12px;margin-bottom:8px">← → or A D to select | ${CONFIRM_HINT}</p>
        <div class="levelup-grid" id="upgrade-grid"></div>
      </div>
    `;
  const grid = screen.querySelector('#upgrade-grid');
  const levelupBuffBar = screen.querySelector('#levelup-buff-bar');
  container.appendChild(screen);
  ui.renderBuffBar(player, { trackId: 'levelup-buff-bar-track', tooltipId: 'levelup-buff-tooltip' });
  ui._bindBuffTooltips(levelupBuffBar, { tooltipId: 'levelup-buff-tooltip' });

  const previewUpgradeBuffs = (upgrade) => {
    const highlights = getUpgradeBuffHighlights(player, upgrade);
    const track = document.getElementById('levelup-buff-bar-track');
    if (track) {
      track.dataset.highlightSig = highlights.map((h) => `${h.id}|${h.delta}`).join(';;');
    }
    ui.applyBuffBarHighlights('levelup-buff-bar-track', highlights, {
      tooltipId: 'levelup-buff-tooltip',
    });
  };

  const cards = choices.map((upgrade) => {
    const preview = getUpgradePreview(player, upgrade);
    const statsHtml = preview.map((row) => `
        <div class="upgrade-stat">
          <span class="upgrade-stat-label">${row.label}</span>
          <span class="upgrade-stat-values">
            <span class="before">${row.before}</span>
            <span class="arrow">→</span>
            <span class="after">${row.after}</span>
          </span>
        </div>
      `).join('');

    const card = document.createElement('div');
    card.className = `upgrade-card rarity-${upgrade.rarity || 'common'}`;
    card.innerHTML = `
        ${ui._rarityBadgeHTML(upgrade.rarity)}
        <div class="icon">${upgrade.icon}</div>
        <h4>${upgrade.name}</h4>
        <p>${upgrade.desc}</p>
        ${statsHtml ? `<div class="upgrade-stats">${statsHtml}</div>` : ''}
      `;
    card.addEventListener('mouseenter', () => previewUpgradeBuffs(upgrade));
    grid.appendChild(card);
    return card;
  });

  const confirm = (upgrade) => {
    ui.dismissLevelUp();
    onPick(upgrade);
  };

  cards.forEach((card, i) => {
    card.onclick = () => confirm(choices[i]);
  });

  try {
    ui.levelUpActive = true;
    ui._navCleanup = bindGridNavigation(navCtx(ui), {
      cards,
      columns: Math.min(3, cards.length),
      focusClass: 'focused',
      onFocusChange: (idx) => previewUpgradeBuffs(choices[idx]),
      onConfirm: (idx) => confirm(choices[idx]),
    });
    previewUpgradeBuffs(choices[0]);
    return true;
  } catch (err) {
    ui.dismissLevelUp();
    throw err;
  }
}
