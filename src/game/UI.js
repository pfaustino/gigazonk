import { SHOP_ITEMS, CHARACTERS, QUESTS, SYNERGY_ELEMENTS, GAME_VERSION } from './constants.js';
import { saveData } from './SaveData.js';
import { GameMenu } from './GameMenu.js';
import { getUpgradePreview, getActiveBuffs, RARITIES } from './UpgradeSystem.js';

const CONFIRM_KEYS = ['Enter', 'NumpadEnter', 'Space', 'KeyF'];
const CONFIRM_HINT = 'Enter, Space, or F to confirm';
const REWARD_SHOWCASE_HOLD_MS = 2000;
const REWARD_FLY_MS = 700;

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
  }

  clear() {
    for (const child of [...this.layer.children]) {
      if (child.id === 'damage-numbers' || child.id === 'enemy-hp-bars') continue;
      child.remove();
    }
  }

  showTitle(onAction) {
    this._navCleanup?.();
    this._navCleanup = null;
    this.clear();
    const screen = this._screen();
    screen.innerHTML = `
      <h1>GigaZonk</h1>
      <p class="subtitle">Survive. Zonk. Ascend.</p>
      <p class="menu-hint" style="margin-bottom:20px">↑ ↓ or W S to select | ${CONFIRM_HINT}</p>
      <button class="btn btn-primary" id="btn-village">Enter Village</button>
      <button class="btn btn-secondary" id="btn-arena">Quick Arena Run</button>
      <p style="margin-top:24px;font-size:12px;color:#666">
        Zonk Coins: ${saveData.data.zonkCoins} | Reputation: ${saveData.data.reputation} | Best: ${Math.floor(saveData.data.bestTime)}s
      </p>
      <p class="title-version">v${GAME_VERSION}</p>
    `;
    const village = screen.querySelector('#btn-village');
    const arena = screen.querySelector('#btn-arena');
    village.onclick = () => { this._audio?.ui(); onAction('village'); };
    arena.onclick = () => { this._audio?.ui(); onAction('arena'); };
    this._navCleanup = this._bindMenuList([village, arena]);
  }

  setAudio(audio) { this._audio = audio; }

  showCharacterSelect(onSelect, onBack) {
    this._navCleanup?.();
    this._navCleanup = null;
    this.clear();
    const screen = this._screen();
    const cards = CHARACTERS.map(char => {
      const unlocked = saveData.data.unlockedCharacters.includes(char.id);
      const selected = saveData.data.selectedCharacter === char.id;
      return `
        <div class="char-card ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-id="${char.id}">
          <div class="char-icon">${char.icon}</div>
          <h4>${char.name}</h4>
          <p>${char.desc}</p>
          <div class="char-status">${unlocked ? (selected ? 'SELECTED' : 'Click to select') : `🔒 ${char.unlockCost} coins`}</div>
        </div>
      `;
    }).join('');

    screen.innerHTML = `
      <h2 style="color:#f7c948;margin-bottom:8px">Choose Your Zonker</h2>
      <p style="color:#888;margin-bottom:8px">🪙 ${saveData.data.zonkCoins} Zonk Coins</p>
      <p style="color:#666;font-size:12px;margin-bottom:16px">↑ ↓ ← → or WASD to select | ${CONFIRM_HINT}</p>
      <div class="char-grid">${cards}</div>
      <button class="btn btn-primary" id="btn-confirm" style="margin-top:20px">Continue</button>
      <button class="btn btn-secondary" id="btn-back">Back</button>
    `;

    const cardEls = [...screen.querySelectorAll('.char-card')];

    const refreshSelection = () => {
      cardEls.forEach((el) => {
        const id = el.dataset.id;
        const unlocked = saveData.data.unlockedCharacters.includes(id);
        const selected = saveData.data.selectedCharacter === id;
        el.classList.toggle('selected', selected);
        const status = el.querySelector('.char-status');
        if (status) {
          status.textContent = unlocked
            ? (selected ? 'SELECTED' : 'Click to select')
            : `🔒 ${CHARACTERS.find(c => c.id === id)?.unlockCost ?? 0} coins`;
        }
      });
    };

    const selectCard = (el) => {
      const id = el.dataset.id;
      const char = CHARACTERS.find(c => c.id === id);
      const unlocked = saveData.data.unlockedCharacters.includes(id);
      if (unlocked) {
        saveData.data.selectedCharacter = id;
        saveData.save();
        this._audio?.ui();
        refreshSelection();
      } else if (char && saveData.spendCoins(char.unlockCost)) {
        saveData.unlockCharacter(id);
        saveData.data.selectedCharacter = id;
        saveData.save();
        this._audio?.quest();
        this.toast(`Unlocked ${char.name}!`);
        refreshSelection();
      } else {
        this.toast('Not enough coins!');
      }
    };

    const continueGame = () => {
      this._navCleanup?.();
      this._navCleanup = null;
      this._audio?.ui();
      onSelect(saveData.data.selectedCharacter);
    };

    const goBack = () => {
      this._navCleanup?.();
      this._navCleanup = null;
      this._audio?.ui();
      onBack();
    };

    cardEls.forEach((el) => { el.onclick = () => selectCard(el); });
    screen.querySelector('#btn-confirm').onclick = continueGame;
    screen.querySelector('#btn-back').onclick = goBack;

    let initialIndex = cardEls.findIndex(el => el.dataset.id === saveData.data.selectedCharacter);
    if (initialIndex < 0) initialIndex = 0;

    this._navCleanup = this._bindGridNavigation({
      cards: cardEls,
      columns: 2,
      focusClass: 'focused',
      initialIndex,
      onFocusChange: (index) => {
        const el = cardEls[index];
        if (saveData.data.unlockedCharacters.includes(el.dataset.id)) {
          saveData.data.selectedCharacter = el.dataset.id;
          saveData.save();
          refreshSelection();
        }
      },
      onConfirm: () => continueGame(),
      onCancel: goBack,
    });
  }

  showQuestBoard(quests, onClose) {
    this._navCleanup?.();
    this._navCleanup = null;
    const screen = this._screen();
    const active = quests.map(q =>
      `<div class="quest-item"><span class="progress">${q.current}/${q.target}</span> ${q.desc} <span style="color:#4ade80">+${q.reward}🪙</span></div>`
    ).join('') || '<p style="color:#888">No active quests</p>';

    const available = QUESTS.filter(q =>
      !saveData.data.completedQuests.includes(q.id) &&
      !saveData.data.activeQuests.includes(q.id)
    );
    const completed = saveData.data.completedQuests.length;

    screen.innerHTML = `
      <h2 style="color:#b8a8ff">📜 Elder Zonka's Quest Board</h2>
      <p style="color:#888;margin:8px 0">${completed}/${QUESTS.length} quests completed</p>
      <div class="quest-board">${active}</div>
      ${available.length ? `<p style="color:#666;font-size:12px;margin-top:12px">${available.length} more quests available — they'll be assigned automatically</p>` : ''}
      <p class="menu-hint" style="margin-top:16px">${CONFIRM_HINT} | Esc back</p>
      <button class="btn btn-secondary" id="btn-close" style="margin-top:12px">Close</button>
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

  showHUD(player, quests, elapsed, enemyCount, inRift) {
  }

  buildHUD() {
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
    `;

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
      synergy.appendChild(slot);
    });

    const prompt = document.createElement('div');
    prompt.className = 'interact-prompt hidden';
    prompt.id = 'interact-prompt';
    prompt.textContent = '[F] Interact';

    const toasts = document.createElement('div');
    toasts.className = 'toast-container';
    toasts.id = 'toasts';

    const hint = document.createElement('div');
    hint.className = 'controls-hint';
    hint.innerHTML = 'WASD / Hold LMB Forward | RMB Drag Camera | Shift Sprint | Q Dodge | Space Jump | F Interact | Wheel Zoom | Esc Menu';

    const rewardStrip = document.createElement('div');
    rewardStrip.className = 'reward-strip';
    rewardStrip.id = 'reward-strip';
    rewardStrip.innerHTML = '<div class="reward-strip-track" id="reward-strip-track"></div>';

    this.runRewards = [];
    this._rewardSeq = 0;
    this._rewardQueue = [];
    this._rewardShowcaseActive = false;
    this.layer.append(hud, hudRight, synergy, prompt, toasts, rewardStrip, hint);
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

  pushReward({ icon, name, stats = [], rarity = null }) {
    const track = document.getElementById('reward-strip-track');
    const prevById = new Map();
    if (track) {
      for (const el of track.querySelectorAll('.reward-tile')) {
        prevById.set(el.dataset.rewardId, el.getBoundingClientRect());
      }
    }

    const reward = {
      id: ++this._rewardSeq,
      icon,
      name,
      stats,
      rarity,
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
          const dest = target.getBoundingClientRect();
          const fly = flyer.animate([
            {
              left: `${centerLeft}px`,
              top: `${centerTop}px`,
              width: `${startW}px`,
              height: `${startH}px`,
              opacity: 1,
              transform: 'scale(1)',
            },
            {
              left: `${dest.left}px`,
              top: `${dest.top}px`,
              width: `${dest.width}px`,
              height: `${dest.height}px`,
              opacity: endOpacity,
              transform: 'scale(1)',
            },
          ], {
            duration: REWARD_FLY_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          });
          fly.onfinish = finishEntrance;
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

  renderBuffBar(player) {
    const track = document.getElementById('buff-bar-track');
    if (!track) return;

    const buffs = getActiveBuffs(player);
    if (buffs.length === 0) {
      track.innerHTML = '<span class="buff-empty">None yet</span>';
      return;
    }

    track.innerHTML = buffs.map((buff) => `
      <div class="buff-chip" title="${buff.title}">
        <span class="buff-chip-icon">${buff.icon}</span>
        <span class="buff-chip-amount">${buff.amount}</span>
      </div>
    `).join('');
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
    const screen = this._screen();
    screen.innerHTML = `
      <h2 style="font-size:36px;color:#f7c948">LEVEL UP!</h2>
      <p style="color:#888;margin-bottom:8px">Choose your Zonk upgrade</p>
      <p style="color:#666;font-size:12px;margin-bottom:8px">← → or A D to select | ${CONFIRM_HINT}</p>
      <div class="levelup-grid" id="upgrade-grid"></div>
    `;
    const grid = screen.querySelector('#upgrade-grid');
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
        ${this._rarityBadgeHTML(upgrade.rarity)}
        <div class="icon">${upgrade.icon}</div>
        <h4>${upgrade.name}</h4>
        <p>${upgrade.desc}</p>
        ${statsHtml ? `<div class="upgrade-stats">${statsHtml}</div>` : ''}
      `;
      grid.appendChild(card);
      return card;
    });

    const confirm = (upgrade) => {
      this._navCleanup?.();
      this._navCleanup = null;
      screen.remove();
      onPick(upgrade);
    };

    cards.forEach((card, i) => {
      card.onclick = () => confirm(choices[i]);
    });

    this._navCleanup?.();
    this._navCleanup = this._bindGridNavigation({
      cards,
      columns: 3,
      focusClass: 'focused',
      onConfirm: (idx) => confirm(choices[idx]),
    });
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

  showShop(onClose) {
    this._navCleanup?.();
    this._navCleanup = null;
    const screen = this._screen();
    const items = SHOP_ITEMS.map(item => {
      const owned = saveData.data.purchasedShop.includes(item.id);
      return `
        <div class="shop-item ${owned ? 'owned' : ''}" data-id="${item.id}">
          <h4>${item.name}</h4>
          <p>${item.desc}</p>
          <div class="cost">${owned ? 'OWNED' : item.cost + ' coins'}</div>
        </div>
      `;
    }).join('');

    screen.innerHTML = `
      <h2 style="color:#f7c948">Merchant Bonk's Shop</h2>
      <div class="currency-display">🪙 ${saveData.data.zonkCoins} Zonk Coins</div>
      <p class="menu-hint" style="margin:12px 0">↑ ↓ or W S to navigate | ${CONFIRM_HINT} | Esc leave</p>
      <div class="shop-grid">${items}</div>
      <button class="btn btn-secondary" id="btn-close">Leave Shop</button>
    `;

    const purchasable = [...screen.querySelectorAll('.shop-item:not(.owned)')];
    purchasable.forEach((el) => {
      el.onclick = () => {
        const item = SHOP_ITEMS.find(i => i.id === el.dataset.id);
        if (!item) return;
        if (saveData.spendCoins(item.cost)) {
          saveData.buyShopItem(item.id);
          const meta = saveData.data.meta;
          if (item.effect.metaDamage) meta.damage += item.effect.metaDamage;
          if (item.effect.metaHp) meta.hp += item.effect.metaHp;
          if (item.effect.metaSpeed) meta.speed += item.effect.metaSpeed;
          if (item.effect.metaXp) meta.xp += item.effect.metaXp;
          if (item.effect.metaPickup) meta.pickup += item.effect.metaPickup;
          if (item.effect.startLevel) meta.startLevel += item.effect.startLevel;
          saveData.save();
          this.toast(`Purchased ${item.name}!`);
          this.showShop(onClose);
        } else {
          this.toast('Not enough coins!');
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

    const navItems = [...purchasable, closeBtn];
    this._navCleanup = this._bindMenuList(navItems, leave);
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
  }

  _screen() {
    const screen = document.createElement('div');
    screen.className = 'screen';
    this.layer.appendChild(screen);
    return screen;
  }

  _createNavPointerGuard() {
    let mouseNavActive = true;
    const layer = this.layer;
    const enableMouse = () => {
      mouseNavActive = true;
      layer.classList.remove('keyboard-nav-active');
    };
    document.addEventListener('mousemove', enableMouse, { passive: true, capture: true });
    return {
      onKeyboardUse() {
        mouseNavActive = false;
        layer.classList.add('keyboard-nav-active');
      },
      allowMouseNav() { return mouseNavActive; },
      dispose() {
        document.removeEventListener('mousemove', enableMouse, { capture: true });
        layer.classList.remove('keyboard-nav-active');
      },
    };
  }

  _guardPointerClicks(elements, pointer) {
    const blockClick = (e) => {
      if (!e.isTrusted) return;
      if (!pointer.allowMouseNav()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    elements.forEach((el) => el.addEventListener('click', blockClick, true));
    return () => elements.forEach((el) => el.removeEventListener('click', blockClick, true));
  }

  _bindGridNavigation({
    cards,
    columns = cards.length,
    focusClass = 'selected',
    initialIndex = 0,
    onFocusChange = null,
    onConfirm,
    onCancel = null,
  }) {
    if (!cards.length) return () => {};

    const pointer = this._createNavPointerGuard();
    const unguardClicks = this._guardPointerClicks(cards, pointer);
    let index = Math.min(initialIndex, cards.length - 1);

    const updateFocus = () => {
      cards.forEach((card, i) => card.classList.toggle(focusClass, i === index));
      onFocusChange?.(index, cards[index]);
    };

    const onKeyDown = (e) => {
      const prev = index;
      const col = index % columns;
      const row = Math.floor(index / columns);
      const rows = Math.ceil(cards.length / columns);

      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        index = (index + 1) % cards.length;
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        index = (index - 1 + cards.length) % cards.length;
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        const nextRow = row + 1;
        if (nextRow < rows) index = Math.min(nextRow * columns + col, cards.length - 1);
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        const prevRow = row - 1;
        if (prevRow >= 0) index = prevRow * columns + col;
      } else if (CONFIRM_KEYS.includes(e.code)) {
        e.preventDefault();
        pointer.onKeyboardUse();
        onConfirm(index);
        return;
      } else if (onCancel && e.code === 'Escape') {
        e.preventDefault();
        pointer.onKeyboardUse();
        onCancel();
        return;
      } else {
        return;
      }

      e.preventDefault();
      pointer.onKeyboardUse();
      if (index !== prev) {
        this._audio?.ui();
        updateFocus();
      }
    };

    cards.forEach((card, i) => {
      card.addEventListener('mouseenter', () => {
        if (!pointer.allowMouseNav()) return;
        index = i;
        updateFocus();
      });
    });

    updateFocus();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      unguardClicks();
      pointer.dispose();
    };
  }

  _bindMenuList(buttons, onCancel) {
    if (!buttons.length) return () => {};

    const pointer = this._createNavPointerGuard();
    const unguardClicks = this._guardPointerClicks(buttons, pointer);
    let index = 0;
    const updateFocus = () => {
      buttons.forEach((btn, i) => btn.classList.toggle('focused', i === index));
    };
    updateFocus();

    const onKeyDown = (e) => {
      const prev = index;
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        index = (index + 1) % buttons.length;
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        index = (index - 1 + buttons.length) % buttons.length;
      } else if (CONFIRM_KEYS.includes(e.code)) {
        e.preventDefault();
        pointer.onKeyboardUse();
        buttons[index].click();
        return;
      } else if (e.code === 'Escape') {
        e.preventDefault();
        pointer.onKeyboardUse();
        onCancel?.();
        return;
      } else {
        return;
      }

      e.preventDefault();
      pointer.onKeyboardUse();
      if (index !== prev) {
        this._audio?.ui();
        updateFocus();
      }
    };

    buttons.forEach((btn, i) => {
      btn.addEventListener('mouseenter', () => {
        if (!pointer.allowMouseNav()) return;
        index = i;
        updateFocus();
      });
    });

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      unguardClicks();
      pointer.dispose();
    };
  }

  _bindSettingsNav(items, onCancel) {
    if (!items.length) return () => {};

    const pointer = this._createNavPointerGuard();
    const unguardClicks = this._guardPointerClicks(items.map((item) => item.el), pointer);
    let index = 0;
    const updateFocus = () => {
      items.forEach((item, i) => item.el.classList.toggle('focused', i === index));
    };
    updateFocus();

    const onKeyDown = (e) => {
      const prev = index;
      const item = items[index];

      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        index = (index + 1) % items.length;
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        index = (index - 1 + items.length) % items.length;
      } else if (['ArrowLeft', 'KeyA'].includes(e.code) && item.onLeft) {
        e.preventDefault();
        pointer.onKeyboardUse();
        item.onLeft();
        this._audio?.ui();
        return;
      } else if (['ArrowRight', 'KeyD'].includes(e.code) && item.onRight) {
        e.preventDefault();
        pointer.onKeyboardUse();
        item.onRight();
        this._audio?.ui();
        return;
      } else if (CONFIRM_KEYS.includes(e.code)) {
        e.preventDefault();
        pointer.onKeyboardUse();
        if (item.onActivate) item.onActivate();
        else item.el.click?.();
        return;
      } else if (e.code === 'Escape') {
        e.preventDefault();
        pointer.onKeyboardUse();
        onCancel?.();
        return;
      } else {
        return;
      }

      e.preventDefault();
      pointer.onKeyboardUse();
      if (index !== prev) {
        this._audio?.ui();
        updateFocus();
      }
    };

    items.forEach((item, i) => {
      item.el.addEventListener('mouseenter', () => {
        if (!pointer.allowMouseNav()) return;
        index = i;
        updateFocus();
      });
    });

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      unguardClicks();
      pointer.dispose();
    };
  }

  removeScreens() {
    this._navCleanup?.();
    this._navCleanup = null;
    if (this.gameMenu.isOpen()) {
      this.gameMenu.screen = null;
      this.gameMenu.handlers = null;
    }
    this.layer.querySelectorAll('.screen').forEach(s => s.remove());
  }
}
