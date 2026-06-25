import { CONFIRM_HINT, bindMenuList } from './MenuNavigation.js';
import { ACHIEVEMENTS } from '../AchievementSystem.js';
import { saveData } from '../SaveData.js';

/** Rich end-of-run summary replacing bare game-over screen. */
export function showRunSummary(ui, stats, onAction) {
  ui._navCleanup?.();
  ui._navCleanup = null;
  const screen = ui._screen();
  screen.classList.add('run-summary-screen');

  const mins = Math.floor(stats.time / 60);
  const secs = Math.floor(stats.time % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const best = stats.bestTime > 0 ? `${Math.floor(stats.bestTime / 60)}:${Math.floor(stats.bestTime % 60).toString().padStart(2, '0')}` : '—';
  const buffs = stats.buffs?.length
    ? stats.buffs.map((b) => {
      const label = b.title ?? b.name ?? b.id;
      const amt = b.amount != null && b.amount !== '' ? ` ${b.amount}` : '';
      return `<span class="run-summary-buff">${b.icon} ${label}${amt}</span>`;
    }).join('')
    : '<span class="run-summary-muted">No upgrades picked</span>';

  const achievements = (stats.newAchievements ?? []).map(
    (a) => `<div class="run-summary-achievement">${a.icon} ${a.name} (+${a.coins}🪙)</div>`
  ).join('');

  const dailyLine = stats.dailyBonus
    ? `<p class="run-summary-daily">Daily challenge complete! +${stats.dailyBonus}🪙</p>`
    : '';

  ui.layer.classList.add('run-summary-open');

  const unlockedCount = saveData.data.unlockedAchievements.length;

  const title = stats.deathCause ? 'You Died' : 'Run Complete';
  const causeLine = stats.deathCause
    ? `<p class="run-summary-cause">${stats.deathCause.icon} Slain by <strong>${stats.deathCause.label}</strong></p>`
    : '';

  screen.innerHTML = `
    <h2 class="run-summary-title">${title}</h2>
    ${causeLine}
    <p class="run-summary-sub">${timeStr} · Level ${stats.level} · ${stats.kills} kills</p>
    <div class="run-summary-grid">
      <div class="run-summary-stat"><span>Coins earned</span><strong>+${stats.coins}🪙</strong></div>
      <div class="run-summary-stat"><span>Best time</span><strong>${best}</strong></div>
      <div class="run-summary-stat"><span>Bosses</span><strong>${stats.bosses ?? 0}</strong></div>
      <div class="run-summary-stat"><span>Max combo</span><strong>${stats.maxCombo ?? 0}</strong></div>
      <div class="run-summary-stat"><span>Biome</span><strong>${stats.biome ?? '—'}</strong></div>
      <div class="run-summary-stat"><span>Achievements</span><strong>${unlockedCount}/${ACHIEVEMENTS.length}</strong></div>
    </div>
    <div class="run-summary-build"><h3>Your build</h3><div class="run-summary-buffs">${buffs}</div></div>
    ${achievements ? `<div class="run-summary-new"><h3>New achievements</h3>${achievements}</div>` : ''}
    ${dailyLine}
    <p class="menu-hint menu-hint-desktop run-summary-hint">↑ ↓ or W S to select | ${CONFIRM_HINT}</p>
    <div class="run-summary-actions">
      <button class="btn btn-primary" id="btn-retry">Try Again</button>
      <button class="btn btn-secondary" id="btn-village">Return to Village</button>
    </div>
  `;

  const closeSummary = (action) => {
    ui.layer.classList.remove('run-summary-open');
    ui._navCleanup?.();
    ui._navCleanup = null;
    onAction(action);
  };

  const retry = screen.querySelector('#btn-retry');
  const village = screen.querySelector('#btn-village');
  retry.onclick = () => { ui._audio?.ui(); closeSummary('retry'); };
  village.onclick = () => { ui._audio?.ui(); closeSummary('village'); };
  ui._navCleanup = bindMenuList([retry, village]);
}
