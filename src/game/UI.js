import { QUESTS, SYNERGY_ELEMENTS } from './constants.js';
import { saveData } from './SaveData.js';
import {
  SKILL_BRANCHES,
  SKILL_MAX_LEVEL,
  SKILL_TREE,
  getSkillUpgradeCost,
  isSkillUnlocked,
} from './SkillTree.js';
import { GameMenu } from './GameMenu.js';
import { getActiveBuffs, formatBuffTooltip, getBuffTargetsFromStats, buffDisplayRank, RARITIES } from './UpgradeSystem.js';
import {
  CONFIRM_HINT,
  bindGridNavigation,
  bindMenuList,
  bindSettingsNav,
  createScreen,
} from './ui/MenuNavigation.js';
import { showTitle as renderTitle, showCharacterSelect as renderCharacterSelect } from './ui/TitleScreens.js';
import { showLevelUp as renderLevelUp } from './ui/LevelUpScreen.js';
import { buildHUD as renderHUD } from './ui/HudScreens.js';
import { setGameReady, GAME_READY } from '../lib/gameReady.js';

const REWARD_SHOWCASE_HOLD_MS = 2000;
const REWARD_FLY_MS = 700;
const BUFF_FLY_MS = 550;
const BUFF_PULSE_HOLD_MS = 380;

export class UI {
  constructor() {
    this.layer = document.getElementById('ui-layer');
    this.onAction = null;
    this.gameMenu = new GameMenu(this);
    this.runRewards = [];
    this.maxRewardTiles = 14;
    this._rewardSeq = 0;
    this._rewardQueue = [];
    this._rewardShowcaseActive = false;
    this.levelUpActive = false;
    this._ensureMetricsOverlay();
  }

  _ensureMetricsOverlay() {
    if (this._metricsEl) return;
    const el = document.createElement('div');
    el.id = 'game-metrics';
    el.className = 'game-metrics hidden';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="game-metrics-row" id="metrics-fps">— FPS</div>
      <div class="game-metrics-row" id="metrics-frame">— ms</div>
      <div class="game-metrics-row game-metrics-combat hidden" id="metrics-enemies">Enemies —</div>
      <div class="game-metrics-row game-metrics-combat hidden" id="metrics-projectiles">Projectiles —</div>
      <div class="game-metrics-row game-metrics-combat hidden" id="metrics-gems">Gems —</div>
    `;
    this.layer.appendChild(el);
    this._metricsEl = el;
  }

  /** @param {{ visible?: boolean, fps?: number, frameMs?: number, combat?: boolean, enemies?: number, projectiles?: number, gems?: number }} m */
  updateMetrics(m = {}) {
    this._ensureMetricsOverlay();
    const visible = m.visible !== false;
    this._metricsEl.classList.toggle('hidden', !visible);
    if (!visible) return;

    const fpsEl = document.getElementById('metrics-fps');
    const frameEl = document.getElementById('metrics-frame');
    if (fpsEl) {
      fpsEl.textContent = `${m.fps ?? 0} FPS`;
      fpsEl.dataset.tier = m.fps >= 55 ? 'good' : m.fps >= 40 ? 'ok' : 'low';
    }
    if (frameEl) frameEl.textContent = `${(m.frameMs ?? 0).toFixed(1)} ms`;

    const combat = !!m.combat;
    this._metricsEl.querySelectorAll('.game-metrics-combat').forEach((row) => {
      row.classList.toggle('hidden', !combat);
    });
    if (combat) {
      const enemiesEl = document.getElementById('metrics-enemies');
      const projEl = document.getElementById('metrics-projectiles');
      const gemsEl = document.getElementById('metrics-gems');
      if (enemiesEl) enemiesEl.textContent = `Enemies ${m.enemies ?? 0}`;
      if (projEl) projEl.textContent = `Projectiles ${m.projectiles ?? 0}`;
      if (gemsEl) gemsEl.textContent = `Gems ${m.gems ?? 0}`;
    }
  }

  isLevelUpOpen() {
    return this.levelUpActive || !!document.getElementById('levelup-overlay');
  }

  hasModalScreen() {
    return !!this.layer?.querySelector('.screen') || this.isLevelUpOpen() || this.gameMenu.isOpen();
  }

  dismissRewardFlyers() {
    this.layer?.querySelectorAll('.reward-flyer').forEach((el) => el.remove());
    this._rewardShowcaseActive = false;
  }

  dismissLevelUp() {
    this.levelUpActive = false;
    this._navCleanup?.();
    this._navCleanup = null;
    document.getElementById('levelup-overlay')?.remove();
    this.layer?.querySelectorAll('.levelup-screen').forEach((s) => s.remove());
  }

  clear() {
    for (const child of [...this.layer.children]) {
      if (child.id === 'damage-numbers' || child.id === 'enemy-hp-bars' || child.id === 'game-metrics') continue;
      child.remove();
    }
  }

  showTitle(onAction) {
    renderTitle(this, onAction);
  }

  setAudio(audio) { this._audio = audio; }

  showCharacterSelect(onSelect, onBack) {
    renderCharacterSelect(this, onSelect, onBack);
  }

  showQuestBoard(questSystem, onClose) {
    this._navCleanup?.();
    this._navCleanup = null;
    const screen = this._screen();
    screen.classList.add('quest-board-screen');

    const tiles = questSystem.getQuestBoardTiles();
    const completed = saveData.data.completedQuests.length;
    const sections = [
      { key: 'current', label: 'Active Quests' },
      { key: 'next', label: 'Up Next' },
      { key: 'completed', label: 'Completed' },
      { key: 'locked', label: 'Undiscovered' },
    ];

    const tilesHtml = sections.map(({ key, label }) => {
      const group = tiles.filter((t) => t.status === key);
      if (group.length === 0) return '';
      const cards = group.map((q) => this._questBoardTileHTML(q)).join('');
      return `
        <div class="quest-board-section">
          <h3 class="quest-board-section-title">${label} <span class="quest-board-section-count">${group.length}</span></h3>
          <div class="quest-tile-grid">${cards}</div>
        </div>
      `;
    }).join('');

    screen.innerHTML = `
      <h2 class="quest-board-heading">📜 Elder Zonka's Quest Board</h2>
      <p class="quest-board-summary">${completed}/${QUESTS.length} quests completed</p>
      <div class="quest-board-scroll">${tilesHtml}</div>
      <p class="menu-hint quest-board-hint">${CONFIRM_HINT} | Esc back</p>
      <button class="btn btn-secondary" id="btn-close">Close</button>
    `;
    const closeBtn = screen.querySelector('#btn-close');
    const close = () => {
      this._navCleanup?.();
      this._navCleanup = null;
      screen.remove();
      onClose();
    };
    closeBtn.onclick = close;
    this._navCleanup = this._bindMenuList([closeBtn], close);
  }

  _questBoardTileHTML(quest) {
    if (quest.status === 'locked') {
      return `<div class="quest-tile quest-tile-locked" aria-label="Undiscovered quest"><span class="quest-tile-lock">🔒</span></div>`;
    }

    if (quest.status === 'completed') {
      return `
        <div class="quest-tile quest-tile-completed">
          <div class="quest-tile-top">
            <span class="quest-tile-badge">Done</span>
            <span class="quest-tile-reward">+${quest.reward}🪙</span>
          </div>
          <div class="quest-tile-desc">${quest.desc}</div>
          <div class="quest-tile-progress">${quest.target}/${quest.target}</div>
        </div>
      `;
    }

    const progress = quest.status === 'current'
      ? `<div class="quest-tile-progress">${quest.current}/${quest.target}</div>`
      : `<div class="quest-tile-progress quest-tile-progress-muted">Goal: ${quest.target}</div>`;
    const badge = quest.status === 'current' ? 'Active' : 'Up Next';
    const statusClass = quest.status === 'current' ? 'quest-tile-current' : 'quest-tile-next';

    return `
      <div class="quest-tile ${statusClass}">
        <div class="quest-tile-top">
          <span class="quest-tile-badge">${badge}</span>
          <span class="quest-tile-reward">+${quest.reward}🪙</span>
        </div>
        <div class="quest-tile-desc">${quest.desc}</div>
        ${progress}
      </div>
    `;
  }

  showHUD(_player, _quests, _elapsed, _enemyCount, _inRift) {
  }

  buildHUD() {
    renderHUD(this);
  }

  _rarityBadgeHTML(rarity) {
    if (!rarity || !RARITIES[rarity]) return '';
    const r = RARITIES[rarity];
    return `<div class="rarity-badge rarity-${rarity}" style="color:${r.color}">${r.label}</div>`;
  }

  _rewardStatsHTML(stats) {
    return stats.slice(0, 2).map((row) => `
      <div class="reward-tile-stat">
        <span class="reward-stat-label">${row.label}</span>
        <span class="reward-stat-values">
          <span class="before">${row.before}</span>
          <span class="arrow">→</span>
          <span class="after">${row.after}</span>
        </span>
      </div>
    `).join('');
  }

  _rewardTileHTML(reward, index, total, { hidden = false, large = false } = {}) {
    const age = total - 1 - index;
    const scale = Math.max(0.52, 1 - age * 0.065);
    const opacity = Math.max(0.22, 1 - age * 0.11);
    const statsHtml = this._rewardStatsHTML(reward.stats);
    const hiddenClass = hidden ? ' reward-tile-hidden' : '';
    const largeClass = large ? ' reward-tile-large' : '';

    return `
      <div class="reward-tile${hiddenClass}${largeClass}${reward.rarity ? ` rarity-${reward.rarity}` : ''}"
        data-reward-id="${reward.id}"
        style="--tile-scale:${scale};--tile-opacity:${opacity}">
        ${reward.rarity ? this._rarityBadgeHTML(reward.rarity) : ''}
        <div class="reward-tile-icon">${reward.icon}</div>
        <div class="reward-tile-name">${reward.name}</div>
        ${statsHtml ? `<div class="reward-tile-stats">${statsHtml}</div>` : ''}
      </div>
    `;
  }

  pushReward({ icon, name, stats = [], rarity = null, buffTargets = null, player = null }) {
    if (player) this.renderBuffBar(player);

    const track = document.getElementById('reward-strip-track');
    const prevById = new Map();
    if (track) {
      for (const el of track.querySelectorAll('.reward-tile')) {
        prevById.set(el.dataset.rewardId, el.getBoundingClientRect());
      }
    }

    const resolvedBuffTargets = buffTargets ?? getBuffTargetsFromStats(stats);

    const reward = {
      id: ++this._rewardSeq,
      icon,
      name,
      stats,
      rarity,
      buffTargets: resolvedBuffTargets,
      entering: true,
    };

    this.runRewards.push(reward);
    if (this.runRewards.length > this.maxRewardTiles) {
      this.runRewards.shift();
    }
    this.renderRewardStrip();

    this._rewardQueue.push({ rewardId: reward.id, prevById });
    this._drainRewardQueue();
  }

  _drainRewardQueue() {
    if (this._rewardShowcaseActive || this._rewardQueue.length === 0) return;
    const { rewardId, prevById } = this._rewardQueue.shift();
    this._rewardShowcaseActive = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._animateRewardEntrance(rewardId, prevById, () => {
          this._rewardShowcaseActive = false;
          this._drainRewardQueue();
        });
      });
    });
  }

  _animateRewardEntrance(rewardId, prevById, onComplete) {
    const track = document.getElementById('reward-strip-track');
    const target = track?.querySelector(`[data-reward-id="${rewardId}"]`);
    if (!track || !target) {
      onComplete?.();
      return;
    }

    const reward = this.runRewards.find((r) => r.id === rewardId);
    if (!reward) {
      onComplete?.();
      return;
    }

    const tiles = [...track.querySelectorAll('.reward-tile')];
    const endOpacity = parseFloat(getComputedStyle(target).getPropertyValue('--tile-opacity')) || 1;

    const flyer = document.createElement('div');
    flyer.className = 'reward-tile reward-flyer reward-tile-large';
    flyer.innerHTML = target.innerHTML;
    this.layer.appendChild(flyer);

    const tileSize = 76;
    const startScale = 2.35;
    const startW = tileSize * startScale;
    const startH = tileSize * startScale;
    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight - 118;
    const centerLeft = centerX - startW / 2;
    const centerTop = centerY - startH / 2;

    Object.assign(flyer.style, {
      position: 'fixed',
      left: `${centerLeft}px`,
      top: `${centerTop}px`,
      width: `${startW}px`,
      height: `${startH}px`,
      margin: '0',
      transform: 'scale(1)',
      opacity: '0',
      zIndex: '250',
    });

    tiles.forEach((tile) => {
      if (tile === target) return;
      const prev = prevById.get(tile.dataset.rewardId);
      if (!prev) return;
      const curr = tile.getBoundingClientRect();
      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      tile.style.transition = 'none';
      tile.style.transform = `scale(var(--tile-scale)) translate(${dx}px, ${dy}px)`;
    });

    const finishEntrance = () => {
      flyer.remove();
      target.classList.remove('reward-tile-hidden');
      reward.entering = false;
      tiles.forEach((tile) => {
        tile.style.transition = '';
        tile.style.transform = '';
      });
      onComplete?.();
    };

    requestAnimationFrame(() => {
      tiles.forEach((tile) => {
        if (tile === target || !prevById.has(tile.dataset.rewardId)) return;
        tile.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease, margin 0.35s ease';
        tile.style.transform = 'scale(var(--tile-scale))';
      });

      const fadeIn = flyer.animate([
        { opacity: 0, transform: 'scale(0.92)' },
        { opacity: 1, transform: 'scale(1)' },
      ], {
        duration: 220,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      });

      fadeIn.onfinish = () => {
        setTimeout(() => {
          const flyToStrip = () => {
            const dest = target.getBoundingClientRect();
            const from = flyer.getBoundingClientRect();
            this._flyRewardElement(flyer, from, dest, {
              duration: REWARD_FLY_MS,
              endOpacity,
              onFinish: finishEntrance,
            });
          };

          const buffTargetId = reward.buffTargets?.find((id) => this._getBuffChip(id));
          const buffChip = buffTargetId ? this._getBuffChip(buffTargetId) : null;
          if (!buffChip) {
            flyToStrip();
            return;
          }

          const fromCenter = flyer.getBoundingClientRect();
          const buffDest = buffChip.getBoundingClientRect();
          this._flyRewardElement(flyer, fromCenter, buffDest, {
            duration: BUFF_FLY_MS,
            endOpacity: 1,
            onFinish: () => {
              const pulseIds = reward.buffTargets.filter((id) => this._getBuffChip(id));
              this._pulseBuffChips(pulseIds);
              setTimeout(flyToStrip, BUFF_PULSE_HOLD_MS);
            },
          });
        }, REWARD_SHOWCASE_HOLD_MS);
      };
    });
  }

  renderRewardStrip() {
    const track = document.getElementById('reward-strip-track');
    if (!track) return;

    const total = this.runRewards.length;
    track.innerHTML = this.runRewards.map((reward, index) =>
      this._rewardTileHTML(reward, index, total, { hidden: reward.entering })
    ).join('');
  }

  updateHUD(player, quests, elapsed, enemyCount, inRift, extras = {}) {
    const hpBar = document.getElementById('hp-bar');
    const xpBar = document.getElementById('xp-bar');
    const comboBar = document.getElementById('combo-bar');
    if (!hpBar) return;

    hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
    xpBar.style.width = `${(player.xp / player.xpToNext) * 100}%`;
    comboBar.style.width = `${Math.min(player.combo * 5, 100)}%`;

    document.getElementById('level-stat').textContent = `Level ${player.level}`;
    const coinsEl = document.getElementById('run-coins-stat');
    if (coinsEl) coinsEl.textContent = `Run 🪙 ${extras.runCoins ?? 0}`;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const night = extras.night ? ' 🌙' : '';
    document.getElementById('time-stat').textContent = `${mins}:${secs.toString().padStart(2, '0')}${inRift ? ' ⚡RIFT' : ''}${night}`;
    document.getElementById('enemy-stat').textContent = `Enemies: ${enemyCount}`;

    const waveEl = document.getElementById('wave-stat');
    if (waveEl) waveEl.textContent = `Wave ${extras.wave || 1}`;
    const biomeEl = document.getElementById('biome-stat');
    if (biomeEl && extras.biome) biomeEl.textContent = extras.biome;

    const list = document.getElementById('quest-list');
    if (list) {
      list.innerHTML = quests.map(q =>
        `<div class="quest-item"><span class="progress">${q.current}/${q.target}</span> ${q.desc}</div>`
      ).join('');
    }

    SYNERGY_ELEMENTS.forEach(e => {
      const slot = document.getElementById(`syn-${e}`);
      if (slot) slot.classList.toggle('active', player.elements.has(e));
    });

    this.renderBuffBar(player);
  }

  _getBuffChip(buffId) {
    if (!buffId) return null;
    return document.getElementById('buff-bar-track')?.querySelector(`[data-buff-id="${buffId}"]`) ?? null;
  }

  _flyRewardElement(el, from, to, { duration, endOpacity = 1, onFinish }) {
    const anim = el.animate([
      {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        opacity: from.opacity ?? 1,
        transform: 'scale(1)',
      },
      {
        left: `${to.left}px`,
        top: `${to.top}px`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        opacity: endOpacity,
        transform: 'scale(1)',
      },
    ], {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    });
    anim.onfinish = () => {
      Object.assign(el.style, {
        left: `${to.left}px`,
        top: `${to.top}px`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        opacity: String(endOpacity),
      });
      onFinish?.();
    };
    return anim;
  }

  _pulseBuffChips(buffIds = []) {
    for (const id of buffIds) {
      const chip = this._getBuffChip(id);
      if (!chip) continue;
      chip.classList.remove('buff-chip-highlight');
      void chip.offsetWidth;
      chip.classList.add('buff-chip-highlight');
      chip.addEventListener('animationend', () => chip.classList.remove('buff-chip-highlight'), { once: true });
    }
  }

  _escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  _bindBuffTooltips(buffBar, { tooltipId = 'buff-tooltip' } = {}) {
    if (buffBar.dataset.tooltipsBound) return;
    buffBar.dataset.tooltipsBound = '1';
    const tooltip = () => document.getElementById(tooltipId);

    buffBar.addEventListener('mousemove', (e) => {
      const chip = e.target.closest('.buff-chip');
      const tip = tooltip();
      if (!tip) return;
      if (!chip?.dataset.tip) {
        tip.classList.add('hidden');
        return;
      }
      tip.textContent = chip.dataset.tip;
      tip.classList.remove('hidden');
      const rect = chip.getBoundingClientRect();
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top = `${rect.bottom + 6}px`;
    });

    buffBar.addEventListener('mouseleave', () => {
      tooltip()?.classList.add('hidden');
    });
  }

  _renderBuffBarTrack(track, buffs) {
    if (buffs.length === 0) {
      track.innerHTML = '<span class="buff-empty">None yet</span>';
      return;
    }

    track.innerHTML = buffs.map((buff) => `
      <div class="buff-chip${buff.meta ? ' buff-chip-meta' : ''}${buff.debuff ? ' buff-chip-debuff' : ''}" data-buff-id="${buff.id}" data-tip="${this._escapeAttr(formatBuffTooltip(buff))}">
        <span class="buff-chip-icon">${buff.icon}</span>
        <span class="buff-chip-amount">${buff.amount}</span>
      </div>
    `).join('');
  }

  _sortBuffBarTrack(track) {
    const chips = [...track.querySelectorAll('.buff-chip[data-buff-id]')];
    chips.sort((a, b) => buffDisplayRank(a.dataset.buffId) - buffDisplayRank(b.dataset.buffId));
    for (const chip of chips) track.appendChild(chip);
  }

  applyBuffBarHighlights(trackId, highlights = [], { tooltipId = null } = {}) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const chipPreviewAmount = (highlight) =>
      highlight.previewLabel ?? highlight.previewAmount ?? highlight.amount;

    track.querySelectorAll('.buff-chip-preview').forEach((el) => el.remove());
    track.querySelectorAll('.buff-chip').forEach((chip) => {
      chip.classList.remove('buff-chip-affected', 'buff-chip-dimmed');
      const amountEl = chip.querySelector('.buff-chip-amount');
      if (chip.dataset.baseAmount && amountEl) {
        amountEl.textContent = chip.dataset.baseAmount;
        delete chip.dataset.baseAmount;
      }
      if (chip.dataset.baseTip) {
        chip.dataset.tip = chip.dataset.baseTip;
        delete chip.dataset.baseTip;
      }
    });

    if (!highlights.length) return;

    track.querySelector('.buff-empty')?.remove();

    const targetIds = new Set(highlights.map((h) => h.id));
    const byId = new Map(highlights.map((h) => [h.id, h]));

    track.querySelectorAll('.buff-chip[data-buff-id]').forEach((chip) => {
      const id = chip.dataset.buffId;
      if (!targetIds.has(id)) return;
      chip.classList.add('buff-chip-affected');
      const highlight = byId.get(id);
      const amountEl = chip.querySelector('.buff-chip-amount');
      const previewText = chipPreviewAmount(highlight);
      if (previewText != null && previewText !== '' && amountEl) {
        if (!chip.dataset.baseAmount) chip.dataset.baseAmount = amountEl.textContent;
        amountEl.textContent = previewText;
      }
      if (highlight?.delta) {
        chip.dataset.baseTip = chip.dataset.tip ?? '';
        chip.dataset.tip = `${chip.dataset.baseTip} (${highlight.delta})`;
      }
    });

    for (const highlight of highlights.filter((h) => h.isNew)) {
      const previewText = chipPreviewAmount(highlight);
      const tip = formatBuffTooltip({
        title: highlight.title,
        amount: previewText,
      });
      const chip = document.createElement('div');
      chip.className = `buff-chip buff-chip-affected buff-chip-preview${highlight.isDebuff ? ' buff-chip-debuff' : ''}`;
      chip.dataset.buffId = highlight.id;
      chip.dataset.tip = highlight.delta ? `${tip} (${highlight.delta})` : tip;
      chip.innerHTML = `
        <span class="buff-chip-icon">${highlight.icon}</span>
        <span class="buff-chip-amount">${previewText}</span>
      `;
      track.appendChild(chip);
    }

    this._sortBuffBarTrack(track);

    if (tooltipId) document.getElementById(tooltipId)?.classList.add('hidden');
  }

  renderBuffBar(player, { trackId = 'buff-bar-track', tooltipId = 'buff-tooltip' } = {}) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const buffs = getActiveBuffs(player);
    const signature = buffs.map((b) => `${b.id}|${b.icon}|${b.amount}|${b.title}|${b.debuff ? 1 : 0}`).join(';;');
    if (track.dataset.buffSig === signature && !track.dataset.highlightSig) {
      return;
    }
    track.dataset.buffSig = signature;
    delete track.dataset.highlightSig;

    if (buffs.length === 0) {
      track.innerHTML = '<span class="buff-empty">None yet</span>';
      document.getElementById(tooltipId)?.classList.add('hidden');
      return;
    }

    this._renderBuffBarTrack(track, buffs);
  }

  showInteractPrompt(show, text = '[F] Interact') {
    const el = document.getElementById('interact-prompt');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('hidden', !show);
  }

  toast(msg, type = '') {
    const container = document.getElementById('toasts');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  showLevelUp(choices, player, onPick) {
    return renderLevelUp(this, choices, player, onPick);
  }

  showGameOver(stats, onAction) {
    this._navCleanup?.();
    this._navCleanup = null;
    const screen = this._screen();
    screen.innerHTML = `
      <h2 style="font-size:42px;color:#e74c3c">ZONKED OUT</h2>
      <p style="color:#aaa;margin:16px 0;font-size:16px">
        Survived ${Math.floor(stats.time)}s | Level ${stats.level} | ${stats.kills} kills
      </p>
      <p style="color:#f7c948;margin-bottom:24px">+${stats.coins} Zonk Coins earned</p>
      <p class="menu-hint" style="margin-bottom:16px">↑ ↓ or W S to select | ${CONFIRM_HINT}</p>
      <button class="btn btn-primary" id="btn-retry">Try Again</button>
      <button class="btn btn-secondary" id="btn-village">Return to Village</button>
    `;
    const retry = screen.querySelector('#btn-retry');
    const village = screen.querySelector('#btn-village');
    retry.onclick = () => { this._navCleanup?.(); this._navCleanup = null; onAction('retry'); };
    village.onclick = () => { this._navCleanup?.(); this._navCleanup = null; onAction('village'); };
    this._navCleanup = this._bindMenuList([retry, village]);
  }

  showArenaPortalChoice(onResume, onNewRun, onCancel) {
    this._navCleanup?.();
    this._navCleanup = null;
    const screen = this._screen();
    screen.innerHTML = `
      <h2 style="color:#f7c948">Arena Portal</h2>
      <p style="color:#aaa;margin:12px 0">You have a run in progress. Coins already banked are safe in your wallet.</p>
      <p class="menu-hint" style="margin-bottom:20px">↑ ↓ or W S to select | ${CONFIRM_HINT}</p>
      <button class="btn btn-primary" id="btn-resume">Resume Arena Run</button>
      <button class="btn btn-secondary" id="btn-new">Abandon & Start New Run</button>
      <button class="btn btn-secondary" id="btn-cancel">Stay in Village</button>
    `;
    const resume = screen.querySelector('#btn-resume');
    const newRun = screen.querySelector('#btn-new');
    const cancel = screen.querySelector('#btn-cancel');
    resume.onclick = () => { this._navCleanup?.(); this._navCleanup = null; onResume(); };
    newRun.onclick = () => { this._navCleanup?.(); this._navCleanup = null; onNewRun(); };
    cancel.onclick = () => { this._navCleanup?.(); this._navCleanup = null; onCancel(); };
    this._navCleanup = this._bindMenuList([resume, newRun, cancel]);
  }

  showSkillTree(onClose, restore = {}) {
    this._navCleanup?.();
    this._navCleanup = null;

    for (const el of this.layer.querySelectorAll('.screen')) {
      if (!el.querySelector('.skill-tree')) continue;
      if (restore.scrollTop == null) {
        restore.scrollTop = el.querySelector('.skill-tree')?.scrollTop ?? 0;
      }
      el.remove();
    }

    const screen = this._screen();
    const levels = saveData.data.skillLevels;

    const branchCols = SKILL_BRANCHES.map((branch) => {
      const skills = SKILL_TREE.filter((s) => s.branch === branch.id)
        .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
      const maxTier = Math.max(...skills.map((s) => s.tier));

      const nodes = skills.map((skill) => {
        const lv = levels[skill.id] ?? 0;
        const maxed = lv >= SKILL_MAX_LEVEL;
        const unlocked = isSkillUnlocked(skill, levels);
        const cost = getSkillUpgradeCost(skill, lv);
        const state = maxed ? 'maxed' : unlocked ? 'available' : 'locked';
        const reqText = !unlocked && skill.requires?.length
          ? `Requires: ${skill.requires.map((id) => SKILL_TREE.find((s) => s.id === id)?.name ?? id).join(', ')}`
          : '';
        return `
          <div class="skill-node skill-node--${state}" data-id="${skill.id}" data-tier="${skill.tier}"
               style="--branch-color:${branch.color}" title="${skill.desc}${reqText ? ` — ${reqText}` : ''}">
            <div class="skill-node-icon">${skill.icon}</div>
            <div class="skill-node-name">${skill.name}</div>
            <div class="skill-node-level">${lv}/${SKILL_MAX_LEVEL}</div>
            <div class="skill-node-cost">${maxed ? 'MAX' : unlocked ? `${cost} 🪙` : '🔒'}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="skill-branch" data-branch="${branch.id}" style="--branch-color:${branch.color}">
          <div class="skill-branch-header">
            <span class="skill-branch-icon">${branch.icon}</span>
            <span class="skill-branch-name">${branch.name}</span>
          </div>
          <div class="skill-branch-tree" style="--max-tier:${maxTier}">
            ${nodes}
          </div>
        </div>
      `;
    }).join('');

    screen.innerHTML = `
      <h2 style="color:#f7c948">Coach Zonk's Skill Tree</h2>
      <div class="currency-display">🪙 ${saveData.data.zonkCoins} Zonk Coins</div>
      <p class="menu-hint" style="margin:12px 0">↑ ↓ or W S to navigate | ${CONFIRM_HINT} upgrade | Esc leave</p>
      <div class="skill-tree">${branchCols}</div>
      <button class="btn btn-secondary" id="btn-close">Leave Trainer</button>
    `;

    const skillTreeEl = screen.querySelector('.skill-tree');
    const scrollTop = restore.scrollTop ?? 0;
    if (skillTreeEl && scrollTop > 0) {
      skillTreeEl.scrollTop = scrollTop;
      requestAnimationFrame(() => {
        skillTreeEl.scrollTop = scrollTop;
      });
    }

    const upgradeable = [...screen.querySelectorAll('.skill-node--available')];
    upgradeable.forEach((el) => {
      el.onclick = () => {
        const skill = SKILL_TREE.find((s) => s.id === el.dataset.id);
        if (!skill) return;
        if (saveData.applySkillUpgrade(skill.id)) {
          this.toast(`Upgraded ${skill.name}!`);
          this.showSkillTree(onClose, {
            scrollTop: skillTreeEl?.scrollTop ?? 0,
            focusSkillId: skill.id,
          });
        } else {
          this.toast('Not enough coins or skill maxed!');
        }
      };
    });

    const closeBtn = screen.querySelector('#btn-close');
    const leave = () => {
      this._navCleanup?.();
      this._navCleanup = null;
      screen.remove();
      onClose();
    };
    closeBtn.onclick = leave;

    const navItems = [...upgradeable, closeBtn];
    let initialIndex = 0;
    if (restore.focusSkillId) {
      const idx = navItems.findIndex((el) => el.dataset?.id === restore.focusSkillId);
      if (idx >= 0) initialIndex = idx;
    }
    this._navCleanup = this._bindMenuList(navItems, leave, initialIndex);
  }

  showVillageHUD(coins, reputation) {
    this.clear();
    const hint = document.createElement('div');
    hint.className = 'controls-hint';
    hint.style.bottom = '60px';
    hint.innerHTML = `
      <div style="font-size:16px;color:#f7c948;margin-bottom:8px">🏘️ Zonka Village</div>
      <div>🪙 ${coins} Zonk Coins | ⭐ ${reputation} Reputation</div>
      <div style="margin-top:8px">Walk to NPCs and press [F] to interact</div>
      <div>WASD / Hold LMB Forward | RMB Drag Camera | [F] Interact | [Esc] Menu | Wheel zoom</div>
    `;
    const prompt = document.createElement('div');
    prompt.className = 'interact-prompt hidden';
    prompt.id = 'interact-prompt';
    this.layer.append(hint, prompt);
    setGameReady(GAME_READY.VILLAGE);
  }

  _navCtx() {
    return { layer: this.layer, audio: this._audio };
  }

  _screen() {
    return createScreen(this.layer);
  }

  _bindGridNavigation(opts) {
    return bindGridNavigation(this._navCtx(), opts);
  }

  _bindMenuList(buttons, onCancel, initialIndex = 0) {
    return bindMenuList(this._navCtx(), buttons, onCancel, initialIndex);
  }

  _bindSettingsNav(items, onCancel) {
    return bindSettingsNav(this._navCtx(), items, onCancel);
  }

  removeScreens() {
    this.dismissLevelUp();
    this._navCleanup?.();
    this._navCleanup = null;
    if (this.gameMenu.isOpen()) {
      this.gameMenu.screen = null;
      this.gameMenu.handlers = null;
    }
    this.layer.querySelectorAll('.screen').forEach(s => s.remove());
  }
}
