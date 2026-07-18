import { CHARACTERS } from '../constants.js';
import { saveData } from '../SaveData.js';
import { formatRunTime, sortRunsByTime } from '../Leaderboard.js';
import {
  fetchGlobalLeaderboard,
  isGlobalLeaderboardConfigured,
  submitGlobalScore,
} from '../../lib/globalLeaderboard.js';
import { CONFIRM_HINT, bindMenuList } from './MenuNavigation.js';

function characterIcon(id) {
  return CHARACTERS.find((c) => c.id === id)?.icon ?? '🦊';
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildLocalRunRows(runs) {
  if (!runs.length) {
    return '<p class="leaderboard-empty">No runs yet — survive the horde to set your first record!</p>';
  }

  const sorted = sortRunsByTime(runs);
  const bestTime = sorted[0]?.time ?? 0;

  return `
    <div class="leaderboard-table-wrap">
      <table class="leaderboard-table" aria-label="Recent runs">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Kills</th>
            <th>Lvl</th>
            <th>Biome</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((run) => {
            const isBest = run.time === bestTime && run.time > 0;
            return `
              <tr class="leaderboard-row${isBest ? ' leaderboard-row-best' : ''}">
                <td>${characterIcon(run.character)}</td>
                <td><strong>${formatRunTime(run.time)}</strong>${isBest ? ' <span class="leaderboard-pr">PR</span>' : ''}</td>
                <td>${run.kills}</td>
                <td>${run.level}</td>
                <td>${run.biome ?? '—'}</td>
                <td>${formatDate(run.at)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildGlobalRunRows(rows) {
  if (!rows.length) {
    return '<p class="leaderboard-empty">No global scores yet — be the first!</p>';
  }
  return `
    <div class="leaderboard-table-wrap">
      <table class="leaderboard-table" aria-label="Global top runs">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Time</th>
            <th>Kills</th>
            <th>Lvl</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr class="leaderboard-row${i === 0 ? ' leaderboard-row-best' : ''}">
              <td>${i + 1}</td>
              <td>${escapeHtml(row.player)}</td>
              <td><strong>${formatRunTime(row.value)}</strong></td>
              <td>${row.meta?.kills ?? '—'}</td>
              <td>${row.meta?.level ?? '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLocalPanel(data) {
  const { bestTime, bestKills, totalRuns, totalKills, recentRuns } = data;
  const bestTimeStr = bestTime > 0 ? formatRunTime(bestTime) : '—';
  const runCount = recentRuns?.length ?? 0;
  return `
    <p class="leaderboard-sub">Best runs on this device · ${runCount} recorded</p>
    <div class="leaderboard-bests">
      <div class="leaderboard-stat"><span>Best time</span><strong>${bestTimeStr}</strong></div>
      <div class="leaderboard-stat"><span>Best kills</span><strong>${bestKills > 0 ? bestKills : '—'}</strong></div>
      <div class="leaderboard-stat"><span>Total runs</span><strong>${totalRuns}</strong></div>
      <div class="leaderboard-stat"><span>Lifetime kills</span><strong>${totalKills}</strong></div>
    </div>
    <h3 class="leaderboard-section-title">Top runs by survival time</h3>
    ${buildLocalRunRows(recentRuns ?? [])}
  `;
}

/** Personal + global leaderboards. */
export function showLeaderboard(ui, onClose) {
  ui._navCleanup?.();
  ui._navCleanup = null;
  const screen = ui._screen();
  screen.classList.add('leaderboard-screen');

  const globalEnabled = isGlobalLeaderboardConfigured();
  const name = saveData.data.leaderboardName ?? '';

  screen.innerHTML = `
    <h2 class="leaderboard-heading">🏆 Leaderboard</h2>
    <div class="leaderboard-tabs">
      <button type="button" class="btn btn-secondary leaderboard-tab is-active" data-tab="local">Local</button>
      <button type="button" class="btn btn-secondary leaderboard-tab" data-tab="global"${globalEnabled ? '' : ' disabled title="Build without global API configured"'}>Global</button>
    </div>
    <div class="leaderboard-name-row">
      <label class="leaderboard-name-label" for="leaderboard-name">Global name</label>
      <input id="leaderboard-name" class="leaderboard-name-input" maxlength="24" value="${escapeHtml(name)}" placeholder="Name for global board" />
      <button type="button" class="btn btn-secondary" id="btn-save-name">Save</button>
    </div>
    <div id="leaderboard-panel-local">${buildLocalPanel(saveData.data)}</div>
    <div id="leaderboard-panel-global" class="hidden">
      <p class="leaderboard-sub">Top survival times worldwide</p>
      <p class="leaderboard-loading" id="global-loading">Loading…</p>
      <div id="global-rows"></div>
    </div>
    <p class="menu-hint leaderboard-hint">${CONFIRM_HINT} | Esc back</p>
    <button class="btn btn-secondary" id="btn-leaderboard-close">Back</button>
  `;

  const closeBtn = screen.querySelector('#btn-leaderboard-close');
  const tabLocal = screen.querySelector('[data-tab="local"]');
  const tabGlobal = screen.querySelector('[data-tab="global"]');
  const panelLocal = screen.querySelector('#leaderboard-panel-local');
  const panelGlobal = screen.querySelector('#leaderboard-panel-global');
  const nameInput = screen.querySelector('#leaderboard-name');
  const saveNameBtn = screen.querySelector('#btn-save-name');

  const close = () => {
    ui._navCleanup?.();
    ui._navCleanup = null;
    screen.remove();
    onClose();
  };

  const showTab = (tab) => {
    const isLocal = tab === 'local';
    tabLocal.classList.toggle('is-active', isLocal);
    tabGlobal.classList.toggle('is-active', !isLocal);
    panelLocal.classList.toggle('hidden', !isLocal);
    panelGlobal.classList.toggle('hidden', isLocal);
  };

  tabLocal.onclick = () => { ui._audio?.ui(); showTab('local'); };
  tabGlobal.onclick = () => {
    if (!globalEnabled) return;
    ui._audio?.ui();
    showTab('global');
    loadGlobal();
  };

  saveNameBtn.onclick = () => {
    if (saveData.setLeaderboardName(nameInput.value)) {
      ui._audio?.ui();
      ui.toast('Global name saved');
    } else {
      ui.toast('Enter a name (max 24 chars)');
    }
  };

  async function loadGlobal() {
    const loading = screen.querySelector('#global-loading');
    const rowsEl = screen.querySelector('#global-rows');
    loading.classList.remove('hidden');
    rowsEl.innerHTML = '';
    const result = await fetchGlobalLeaderboard(50);
    loading.classList.add('hidden');
    if (!result.ok) {
      rowsEl.innerHTML = `<p class="leaderboard-empty">${escapeHtml(result.error)}</p>`;
      return;
    }
    rowsEl.innerHTML = buildGlobalRunRows(result.rows);
  }

  closeBtn.onclick = () => { ui._audio?.ui(); close(); };
  ui._navCleanup = bindMenuList([closeBtn, tabLocal, tabGlobal, saveNameBtn], close);
}

/** Fire-and-forget global score submit after a run ends. */
export function trySubmitGlobalRun(run) {
  if (!isGlobalLeaderboardConfigured()) return;
  const player = saveData.data.leaderboardName?.trim();
  if (!player) return;
  submitGlobalScore({
    player,
    value: run.time,
    meta: {
      kills: run.kills,
      level: run.level,
      character: run.character,
      biome: run.biome,
    },
  });
}
