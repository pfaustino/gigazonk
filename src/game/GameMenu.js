import { saveData } from './SaveData.js';
import { DIFFICULTIES, LANGUAGES } from './settings.js';
import { GAME_VERSION } from './constants.js';
import { renderHostedDonateButton, clearDonateButton } from './PayPalDonate.js';
import {
  CONFIRM_HINT,
  bindGridNavigation,
  bindMenuList,
  bindSettingsNav,
  createScreen,
} from './ui/MenuNavigation.js';

const MENU_HINT = '↑ ↓ or W S / Left stick to navigate | Enter, Space, A, or F to select | Esc back';

const CONTROLS_TEXT = `
WASD — Move forward/back/strafe (camera-relative)
Hold LMB — Move forward
Left stick — Move (gamepad)
RMB drag / Right stick — Orbit camera
Shift / L3 — Sprint
Space / RT — Jump
Q / LB — Dodge roll
F / LT — Interact (village NPCs, return portal)
D-pad Up/Down — Zoom camera (gamepad)
Mouse wheel — Zoom camera
A — Confirm menus | B — Back
D-pad / Left stick — Navigate menus
Start — Game menu
Esc — Game menu
`.trim();

export class GameMenu {
  constructor(ui) {
    this.ui = ui;
    this.handlers = null;
    this.screen = null;
  }

  open(handlers) {
    this.handlers = handlers;
    this.ui._navCleanup?.();
    this.ui._navCleanup = null;
    this.screen = createScreen(this.ui.layer);
    this.screen.classList.add('menu-screen');
    this.renderMain();
  }

  close() {
    this.ui._navCleanup?.();
    this.ui._navCleanup = null;
    this.screen?.remove();
    this.screen = null;
    this.handlers?.onResume?.();
    this.handlers = null;
  }

  isOpen() {
    return !!this.screen?.isConnected;
  }

  _columnMajorOrder(items, columns) {
    const rows = Math.ceil(items.length / columns);
    const ordered = new Array(items.length);
    items.forEach((item, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      ordered[row * columns + col] = item;
    });
    return ordered;
  }

  _navCtx() {
    return { layer: this.ui.layer, audio: this.ui._audio };
  }

  _bindPanelNav(buttons) {
    this.ui._navCleanup?.();
    const backBtn = buttons.find((b) => b.id === 'menu-back');
    this.ui._navCleanup = bindMenuList(
      this._navCtx(),
      buttons,
      () => (backBtn ? backBtn.click() : this.renderMain()),
    );
  }

  renderMain() {
    const h = this.handlers;
    const saved = saveData.data.savedAt
      ? new Date(saveData.data.savedAt).toLocaleString()
      : 'No save yet';

    const items = [
      { id: 'resume', label: '▶ Resume', action: () => this.close() },
    ];
    if (h.inArena) {
      items.push({
        id: 'village',
        label: '🏘️ Return to Village',
        desc: 'Bank coins & visit the Trainer',
        action: () => h.onReturnToVillage?.(),
      });
    }
    items.push(
      { id: 'save', label: '💾 Save Game', desc: `Last: ${saved}`, action: () => { h.onSave?.(); this.flash('Game saved!'); } },
      { id: 'load', label: '📂 Load Game', action: () => { h.onLoad?.(); } },
      { id: 'audio', label: '🔊 Audio', action: () => this.renderAudio() },
      { id: 'language', label: '🌐 Language', action: () => this.renderLanguage() },
      { id: 'difficulty', label: '⚔️ Difficulty', action: () => this.renderDifficulty() },
      { id: 'controls', label: '🎮 Controls', action: () => this.renderControls() },
      { id: 'mainmenu', label: '🏠 Main Menu', action: () => h.onMainMenu?.() },
      { id: 'about', label: 'ℹ️ About', action: () => this.renderAbout() },
      { id: 'donation', label: '❤️ Donate', action: () => this.renderDonation() },
      { id: 'exit', label: '🚪 Exit Game', action: () => h.onExit?.() },
    );

    this.renderPanel('Game Menu', items, false, 2);
  }

  renderPanel(title, items, showBack = true, columns = 1) {
    this.ui._navCleanup?.();
    const hint = columns > 1
      ? `↑ ↓ ← → or WASD to navigate | ${CONFIRM_HINT} | Esc back`
      : MENU_HINT;
    const listClass = columns > 1 ? 'menu-list menu-list-cols-2' : 'menu-list';
    const panelClass = columns > 1 ? 'menu-panel menu-panel-wide' : 'menu-panel';

    this.screen.innerHTML = `
      <div class="${panelClass}">
        <h2 class="menu-title">${title}</h2>
        <p class="menu-hint">${hint}</p>
        <div class="${listClass}" id="menu-list"></div>
        ${showBack ? '<button class="btn btn-secondary menu-back" id="menu-back">Back</button>' : ''}
      </div>
    `;

    const list = this.screen.querySelector('#menu-list');
    const displayItems = columns > 1 ? this._columnMajorOrder(items, columns) : items;
    const buttons = displayItems.map((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-item';
      btn.dataset.id = item.id;
      btn.innerHTML = item.desc
        ? `<span class="menu-item-label">${item.label}</span><span class="menu-item-desc">${item.desc}</span>`
        : `<span class="menu-item-label">${item.label}</span>`;
      btn.onclick = () => {
        this.ui._audio?.ui();
        item.action();
      };
      list.appendChild(btn);
      return btn;
    });

    const backBtn = this.screen.querySelector('#menu-back');
    if (backBtn) {
      backBtn.onclick = () => {
        this.ui._audio?.ui();
        this.renderMain();
      };
    }

    const onCancel = () => {
      if (showBack) this.renderMain();
      else this.close();
    };

    if (columns > 1) {
      this.ui._navCleanup = bindGridNavigation(this._navCtx(), {
        cards: buttons,
        columns,
        focusClass: 'focused',
        onConfirm: (idx) => buttons[idx].click(),
        onCancel,
      });
    } else {
      const navButtons = [...buttons];
      if (backBtn) navButtons.push(backBtn);
      this.ui._navCleanup = bindMenuList(this._navCtx(), navButtons, onCancel);
    }
  }

  renderAudio() {
    this.ui._navCleanup?.();
    const s = saveData.data.settings;
    const savedSnapshot = {
      sfxEnabled: s.sfxEnabled,
      musicVolume: s.musicVolume ?? 0.3,
      sfxVolume: s.sfxVolume ?? 0.3,
    };
    this.screen.innerHTML = `
      <div class="menu-panel menu-panel-wide">
        <h2 class="menu-title">Audio</h2>
        <p class="menu-hint">↑ ↓ or W S to navigate | ← → to adjust volume | ${CONFIRM_HINT} | Esc back</p>
        <div class="menu-settings">
          <label class="menu-setting" id="sfx-row">
            <span>Sound effects</span>
            <input type="checkbox" id="sfx-enabled" ${s.sfxEnabled ? 'checked' : ''} />
          </label>
          <label class="menu-setting" id="music-vol-row">
            <span>Music</span>
            <input type="range" id="music-volume" min="0" max="100" value="${Math.round(savedSnapshot.musicVolume * 100)}" />
            <span id="music-vol-label">${Math.round(savedSnapshot.musicVolume * 100)}%</span>
          </label>
          <label class="menu-setting" id="sfx-vol-row">
            <span>Sounds</span>
            <input type="range" id="sfx-volume" min="0" max="100" value="${Math.round(savedSnapshot.sfxVolume * 100)}" />
            <span id="sfx-vol-label">${Math.round(savedSnapshot.sfxVolume * 100)}%</span>
          </label>
        </div>
        <button class="btn btn-primary" id="audio-save">Apply</button>
        <button class="btn btn-secondary menu-back" id="menu-back">Back</button>
      </div>
    `;

    const sfx = this.screen.querySelector('#sfx-enabled');
    const musicVol = this.screen.querySelector('#music-volume');
    const musicVolLabel = this.screen.querySelector('#music-vol-label');
    const sfxVol = this.screen.querySelector('#sfx-volume');
    const sfxVolLabel = this.screen.querySelector('#sfx-vol-label');
    const sfxRow = this.screen.querySelector('#sfx-row');
    const musicVolRow = this.screen.querySelector('#music-vol-row');
    const sfxVolRow = this.screen.querySelector('#sfx-vol-row');
    const saveBtn = this.screen.querySelector('#audio-save');
    const backBtn = this.screen.querySelector('#menu-back');

    let lastSfxPreview = 0;
    const playSfxPreview = () => {
      const now = Date.now();
      if (now - lastSfxPreview < 120) return;
      lastSfxPreview = now;
      this.ui._audio?.resume();
      this.ui._audio?.ui();
    };

    const applyLive = (previewSfx = false) => {
      s.sfxEnabled = sfx.checked;
      s.musicVolume = musicVol.value / 100;
      s.sfxVolume = sfxVol.value / 100;
      this.handlers?.onSettingsChanged?.();
      this.ui._audio?.resume();
      if (previewSfx) playSfxPreview();
    };

    musicVol.oninput = () => {
      musicVolLabel.textContent = `${musicVol.value}%`;
      applyLive(false);
    };
    sfxVol.oninput = () => {
      sfxVolLabel.textContent = `${sfxVol.value}%`;
      applyLive(true);
    };
    sfx.onchange = () => applyLive(true);

    const adjustSlider = (input, label, delta, preview = false) => {
      input.value = Math.max(0, Math.min(100, Number(input.value) + delta));
      label.textContent = `${input.value}%`;
      applyLive(preview);
    };

    saveBtn.onclick = () => {
      applyLive(false);
      saveData.save();
      this.ui._audio?.ui();
      this.renderMain();
    };
    backBtn.onclick = () => {
      Object.assign(s, savedSnapshot);
      this.handlers?.onSettingsChanged?.();
      this.ui._audio?.ui();
      this.renderMain();
    };

    this.ui._navCleanup = bindSettingsNav(this._navCtx(), [
      {
        el: sfxRow,
        onActivate: () => {
          sfx.checked = !sfx.checked;
          applyLive(true);
        },
      },
      {
        el: musicVolRow,
        onLeft: () => adjustSlider(musicVol, musicVolLabel, -5, false),
        onRight: () => adjustSlider(musicVol, musicVolLabel, 5, false),
      },
      {
        el: sfxVolRow,
        onLeft: () => adjustSlider(sfxVol, sfxVolLabel, -5, true),
        onRight: () => adjustSlider(sfxVol, sfxVolLabel, 5, true),
      },
      { el: saveBtn },
      { el: backBtn },
    ], () => backBtn.click());
  }

  renderLanguage() {
    const current = saveData.data.settings.language;
    this.renderPanel('Language', Object.entries(LANGUAGES).map(([id, lang]) => ({
      id,
      label: lang.label,
      desc: id === current ? '✓ Current' : (lang.ready ? '' : 'Coming soon'),
      action: () => {
        if (!lang.ready) {
          this.flash('Language not available yet');
          return;
        }
        saveData.data.settings.language = id;
        saveData.save();
        this.handlers?.onSettingsChanged?.();
        this.flash(`Language: ${lang.label}`);
        this.renderLanguage();
      },
    })));
  }

  renderDifficulty() {
    const current = saveData.data.settings.difficulty;
    this.renderPanel('Difficulty', Object.entries(DIFFICULTIES).map(([id, d]) => ({
      id,
      label: d.label,
      desc: id === current ? `✓ ${d.desc}` : d.desc,
      action: () => {
        saveData.data.settings.difficulty = id;
        saveData.save();
        this.handlers?.onSettingsChanged?.();
        this.flash(`Difficulty: ${d.label}`);
        this.renderDifficulty();
      },
    })));
  }

  renderControls() {
    this.ui._navCleanup?.();
    const s = saveData.data.settings;
    this.screen.innerHTML = `
      <div class="menu-panel menu-panel-wide">
        <h2 class="menu-title">Controls</h2>
        <p class="menu-hint">↑ ↓ or W S to navigate | ${CONFIRM_HINT} | Esc back</p>
        <div class="menu-settings">
          <label class="menu-setting" id="invert-mouse-row">
            <span>Invert mouse look (vertical)</span>
            <input type="checkbox" id="invert-mouse-y" ${s.invertMouseY ? 'checked' : ''} />
          </label>
        </div>
        <pre class="menu-controls">${CONTROLS_TEXT}</pre>
        <button class="btn btn-secondary menu-back" id="menu-back">Back</button>
      </div>
    `;

    const invert = this.screen.querySelector('#invert-mouse-y');
    const invertRow = this.screen.querySelector('#invert-mouse-row');
    const backBtn = this.screen.querySelector('#menu-back');

    const applyInvert = () => {
      s.invertMouseY = invert.checked;
      saveData.save();
      this.handlers?.onSettingsChanged?.();
      this.flash(s.invertMouseY ? 'Mouse look inverted' : 'Mouse look normal');
    };

    invert.onchange = applyInvert;

    backBtn.onclick = () => {
      this.ui._audio?.ui();
      this.renderMain();
    };

    this.ui._navCleanup = bindSettingsNav(this._navCtx(), [
      {
        el: invertRow,
        onActivate: () => {
          invert.checked = !invert.checked;
          applyInvert();
        },
      },
      { el: backBtn },
    ], () => backBtn.click());
  }

  renderAbout() {
    this.ui._navCleanup?.();
    this.screen.innerHTML = `
      <div class="menu-panel menu-panel-wide">
        <h2 class="menu-title">About GigaZonk</h2>
        <p class="menu-hint">${MENU_HINT}</p>
        <div class="menu-about">
          <p><strong>GigaZonk</strong> v${GAME_VERSION}</p>
          <p>Survive endless waves,
          level up with wild upgrades, explore Zonka Village, and become the ultimate Zonker.</p>
          <p>Built with Three.js. Made with love for Zonk enthusiasts everywhere.</p>
        </div>
        <button class="btn btn-secondary menu-back" id="menu-back">Back</button>
      </div>
    `;
    const backBtn = this.screen.querySelector('#menu-back');
    backBtn.onclick = () => {
      this.ui._audio?.ui();
      this.renderMain();
    };
    this._bindPanelNav([backBtn]);
  }

  renderDonation() {
    this.ui._navCleanup?.();
    this.screen.innerHTML = `
      <div class="menu-panel menu-panel-wide menu-panel-donate">
        <div id="paypal-donate-slot" class="paypal-donate-slot paypal-donate-loading">Loading PayPal…</div>
        <button class="btn btn-secondary menu-back" id="menu-back">Back</button>
      </div>
    `;
    const slot = this.screen.querySelector('#paypal-donate-slot');
    const backBtn = this.screen.querySelector('#menu-back');

    renderHostedDonateButton(slot)
      .then(() => slot?.classList.remove('paypal-donate-loading'))
      .catch(() => {
        if (!slot) return;
        slot.classList.remove('paypal-donate-loading');
        slot.classList.add('paypal-donate-error');
        slot.textContent = 'Could not load PayPal. Check your connection and try again.';
      });

    backBtn.onclick = () => {
      clearDonateButton(slot);
      this.ui._audio?.ui();
      this.renderMain();
    };
    this._bindPanelNav([backBtn]);
  }

  flash(msg) {
    this.ui.toast(msg, 'synergy');
  }
}
