import { UPGRADE_TEMPLATES, RARITIES, buildUpgradeOffer } from '../game/UpgradeOffers.js';
import { getActiveBuffs } from '../game/UpgradeSystem.js';

const RUN_CONTROLS = [
  { id: 'pause', icon: '⏸️', name: 'Pause game', toggle: true },
  { id: 'heal', icon: '❤️', name: 'Full heal' },
  { id: 'god', icon: '🛡️', name: 'God mode', toggle: true },
  { id: 'mega', icon: '💥', name: 'Mega damage', toggle: true },
];

/**
 * Dev-only buff catalog + active buff list (?dev=1 or Vite dev).
 */
export class DevBuffPicker {
  constructor(game) {
    this.game = game;
    this.open = false;
    this._filter = '';
    this._rarity = 'legendary';
    this._pauseBeforeOpen = false;
    this._pauseToggledInPicker = false;

    this.root = document.createElement('div');
    this.root.id = 'dev-buff-picker';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="dev-buff-backdrop" data-close></div>
      <div class="dev-buff-dialog" role="dialog" aria-labelledby="dev-buff-title">
        <header class="dev-buff-header">
          <div>
            <h2 id="dev-buff-title">Dev buffs</h2>
            <p class="dev-buff-hint">Click a buff to add it — stacks on repeat clicks (e.g. 10× Soul Orb).</p>
          </div>
          <div class="dev-buff-header-actions">
            <label class="dev-buff-rarity">
              Rarity
              <select id="dev-buff-rarity"></select>
            </label>
            <button type="button" class="dev-buff-close" id="dev-buff-close" aria-label="Close">×</button>
          </div>
        </header>
        <div class="dev-buff-toolbar">
          <input type="search" id="dev-buff-filter" placeholder="Filter buffs…" autocomplete="off" />
        </div>
        <div class="dev-buff-columns">
          <section class="dev-buff-column">
            <h3>Run controls</h3>
            <div class="dev-buff-grid" id="dev-buff-run"></div>
            <h3>Add buff</h3>
            <div class="dev-buff-grid dev-buff-catalog" id="dev-buff-catalog"></div>
          </section>
          <section class="dev-buff-column dev-buff-active-col">
            <div class="dev-buff-active-header">
              <h3>Current buffs <span class="dev-buff-count" id="dev-buff-count"></span></h3>
              <button type="button" class="dev-buff-remove-all" id="dev-buff-remove-all">Remove all</button>
            </div>
            <ul class="dev-buff-active-list" id="dev-buff-active"></ul>
          </section>
        </div>
      </div>
    `;
    document.body.appendChild(this.root);

    this.filterInput = this.root.querySelector('#dev-buff-filter');
    this.raritySelect = this.root.querySelector('#dev-buff-rarity');
    this.runEl = this.root.querySelector('#dev-buff-run');
    this.catalogEl = this.root.querySelector('#dev-buff-catalog');
    this.activeEl = this.root.querySelector('#dev-buff-active');
    this.countEl = this.root.querySelector('#dev-buff-count');

    this._populateRaritySelect();
    this._renderRunControls();
    this._renderCatalog();

    this.root.querySelector('#dev-buff-close')?.addEventListener('click', () => this.closePicker());
    this.root.querySelector('#dev-buff-remove-all')?.addEventListener('click', () => {
      if (this.game.devRemoveAllBuffs()) this._renderActive();
    });
    this.root.querySelector('[data-close]')?.addEventListener('click', () => this.closePicker());
    this.filterInput?.addEventListener('input', () => {
      this._filter = this.filterInput.value.trim().toLowerCase();
      this._renderCatalog();
    });
    this.raritySelect?.addEventListener('change', () => {
      this._rarity = this.raritySelect.value;
    });
    this.runEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-run]');
      if (!btn) return;
      this._runControl(btn.dataset.run);
    });
    this.catalogEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-template]');
      if (!btn) return;
      if (this.game.devApplyUpgradeBuff(btn.dataset.template, this._rarity)) {
        this._renderActive();
      }
    });

    this._onKeyDown = (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePicker();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    this._tick = () => {
      if (this.open) {
        this._renderActive();
        this._syncRunControlStates();
      }
      requestAnimationFrame(this._tick);
    };
    requestAnimationFrame(this._tick);
  }

  _populateRaritySelect() {
    const order = ['common', 'rare', 'epic', 'legendary'];
    this.raritySelect.innerHTML = order.map((id) => {
      const label = RARITIES[id]?.label ?? id;
      const selected = id === this._rarity ? ' selected' : '';
      return `<option value="${id}"${selected}>${label}</option>`;
    }).join('');
  }

  _renderRunControls() {
    this.runEl.innerHTML = RUN_CONTROLS.map((item) => `
      <button type="button" class="dev-buff-chip${item.toggle ? ' dev-buff-toggle' : ''}" data-run="${item.id}">
        <span class="dev-buff-chip-icon">${item.icon}</span>
        <span class="dev-buff-chip-name">${item.name}</span>
      </button>
    `).join('');
  }

  _sortedTemplates() {
    return [...UPGRADE_TEMPLATES].sort((a, b) => a.name.localeCompare(b.name));
  }

  _renderCatalog() {
    const templates = this._sortedTemplates().filter((t) => {
      if (!this._filter) return true;
      const hay = `${t.name} ${t.id}`.toLowerCase();
      return hay.includes(this._filter);
    });
    this.catalogEl.innerHTML = templates.map((t) => {
      const offer = buildUpgradeOffer(t, this._pickRarityForTemplate(t));
      return `
        <button type="button" class="dev-buff-chip" data-template="${t.id}" title="${this._escapeAttr(offer.desc)}">
          <span class="dev-buff-chip-icon">${t.icon}</span>
          <span class="dev-buff-chip-name">${t.name}</span>
        </button>
      `;
    }).join('');
  }

  _pickRarityForTemplate(template) {
    const allowed = template.rarities ?? ['legendary'];
    if (allowed.includes(this._rarity)) return this._rarity;
    return allowed[allowed.length - 1];
  }

  _escapeAttr(text) {
    return String(text ?? '').replace(/"/g, '&quot;');
  }

  _runControl(id) {
    const { game } = this;
    switch (id) {
      case 'pause': {
        game.devToggleRunPause();
        this._syncRunControlStates();
        break;
      }
      case 'heal':
        game.devFullHeal();
        this._renderActive();
        break;
      case 'god':
        game.devToggleGodMode();
        this._syncRunControlStates();
        this._renderActive();
        break;
      case 'mega':
        game.devToggleMegaDamage();
        this._syncRunControlStates();
        this._renderActive();
        break;
      default:
        break;
    }
  }

  _syncRunControlStates() {
    const paused = this.game.devIsRunPaused();
    const { player } = this.game;
    this.runEl.querySelector('[data-run="pause"]')?.classList.toggle('dev-active', paused);
    this.runEl.querySelector('[data-run="god"]')?.classList.toggle('dev-active', !!player?.devGodMode);
    this.runEl.querySelector('[data-run="mega"]')?.classList.toggle('dev-active', !!player?.devMegaDamage);
  }

  _renderActive() {
    const { game } = this;

    if (game.state !== 'arena') {
      this.activeEl.innerHTML = '<li class="dev-buff-empty">Start an arena run to track buffs.</li>';
      this.countEl.textContent = '';
      return;
    }

    const rows = [];
    if (game.devIsRunPaused()) {
      rows.push({ icon: '⏸️', amount: 'ON', title: 'Game paused (dev)' });
    }
    if (game.player?.devGodMode) {
      rows.push({ icon: '🛡️', amount: 'ON', title: 'God mode' });
    }
    if (game.player?.devMegaDamage) {
      rows.push({ icon: '💥', amount: 'ON', title: 'Mega damage' });
    }
    if (game.player?.runBaseline) {
      rows.push(...getActiveBuffs(game.player));
    }

    if (rows.length === 0) {
      this.activeEl.innerHTML = '<li class="dev-buff-empty">No buffs yet — pick from the left.</li>';
      this.countEl.textContent = '';
      return;
    }

    this.countEl.textContent = `(${rows.length})`;
    this.activeEl.innerHTML = rows.map((b) => `
      <li class="dev-buff-active-row${b.debuff ? ' debuff' : ''}">
        <span class="dev-buff-active-icon">${b.icon}</span>
        <span class="dev-buff-active-title">${b.title}</span>
        <span class="dev-buff-active-amount">${b.amount}</span>
      </li>
    `).join('');
  }

  openPicker() {
    if (this.open) return;
    this.open = true;
    this.root.hidden = false;
    this._filter = '';
    if (this.filterInput) this.filterInput.value = '';

    this._renderCatalog();
    this._renderActive();
    this._syncRunControlStates();
    this.filterInput?.focus();
  }

  closePicker() {
    if (!this.open) return;
    this.open = false;
    this.root.hidden = true;
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.root.remove();
  }
}
