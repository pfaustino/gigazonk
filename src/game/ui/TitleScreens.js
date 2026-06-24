import { CHARACTERS, GAME_VERSION } from '../constants.js';
import { saveData } from '../SaveData.js';
import { getDailyChallengeLabel } from '../DailyChallenge.js';
import {
  CONFIRM_HINT,
  bindGridNavigation,
  bindMenuList,
  createScreen,
} from './MenuNavigation.js';
import { setGameReady, GAME_READY } from '../../lib/gameReady.js';

function navCtx(ui) {
  return { layer: ui.layer, audio: ui._audio };
}

export function showTitle(ui, onAction) {
  ui._navCleanup?.();
  ui._navCleanup = null;
  ui.clear();
  const screen = createScreen(ui.layer);
  screen.classList.add('title-screen');
  const heroSrc = `${import.meta.env.BASE_URL}images/title-hero.png`;
  screen.innerHTML = `
      <div class="title-hero" aria-hidden="true">
        <img class="title-hero-img" src="${heroSrc}" alt="" />
        <div class="title-hero-scrim"></div>
      </div>
      <div class="title-content">
        <h1>GigaZonk</h1>
        <p class="subtitle">Survive. Zonk. Ascend.</p>
        <p class="menu-hint" style="margin-bottom:20px">${CONFIRM_HINT}</p>
        <button class="btn btn-primary" id="btn-play">Play</button>
        <button class="btn btn-secondary" id="btn-village">Enter Village</button>
        <p class="title-stats">
          Zonk Coins: ${saveData.data.zonkCoins} | Reputation: ${saveData.data.reputation} | Best: ${Math.floor(saveData.data.bestTime)}s
        </p>
        <p class="title-daily">${getDailyChallengeLabel()}</p>
        <p class="title-version">v${GAME_VERSION}</p>
      </div>
    `;
  const play = screen.querySelector('#btn-play');
  const village = screen.querySelector('#btn-village');
  play.onclick = () => { ui._audio?.ui(); onAction('arena'); };
  village.onclick = () => { ui._audio?.ui(); onAction('village'); };
  ui._navCleanup = bindMenuList(navCtx(ui), [play, village]);
  setGameReady(GAME_READY.TITLE);
}

export function showCharacterSelect(ui, onSelect, onBack) {
  ui._navCleanup?.();
  ui._navCleanup = null;
  ui.clear();
  const screen = createScreen(ui.layer);
  const cards = CHARACTERS.map(char => {
    const playable = char.playable !== false;
    const unlocked = playable && saveData.data.unlockedCharacters.includes(char.id);
    const selected = playable && saveData.data.selectedCharacter === char.id;
    const cardClass = !playable ? 'disabled' : (unlocked ? '' : 'locked');
    const status = !playable
      ? 'Coming soon'
      : (unlocked ? (selected ? 'SELECTED' : 'Click to select') : `🔒 ${char.unlockCost} coins`);
    return `
        <div class="char-card ${cardClass} ${selected ? 'selected' : ''}" data-id="${char.id}" data-playable="${playable ? '1' : '0'}">
          <div class="char-icon">${char.icon}</div>
          <h4>${char.name}</h4>
          <p>${char.desc}</p>
          <div class="char-status">${status}</div>
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
      const char = CHARACTERS.find((c) => c.id === id);
      const playable = char?.playable !== false;
      const unlocked = playable && saveData.data.unlockedCharacters.includes(id);
      const selected = playable && saveData.data.selectedCharacter === id;
      el.classList.toggle('selected', selected);
      const status = el.querySelector('.char-status');
      if (status) {
        status.textContent = !playable
          ? 'Coming soon'
          : (unlocked
            ? (selected ? 'SELECTED' : 'Click to select')
            : `🔒 ${char?.unlockCost ?? 0} coins`);
      }
    });
  };

  const selectCard = (el) => {
    const id = el.dataset.id;
    const char = CHARACTERS.find(c => c.id === id);
    if (!char || char.playable === false) {
      ui.toast('Coming soon!');
      return;
    }
    const unlocked = saveData.data.unlockedCharacters.includes(id);
    if (unlocked) {
      saveData.data.selectedCharacter = id;
      saveData.save();
      ui._audio?.ui();
      refreshSelection();
    } else if (char && saveData.spendCoins(char.unlockCost)) {
      saveData.unlockCharacter(id);
      saveData.data.selectedCharacter = id;
      saveData.save();
      ui._audio?.quest();
      ui.toast(`Unlocked ${char.name}!`);
      refreshSelection();
    } else {
      ui.toast('Not enough coins!');
    }
  };

  const continueGame = () => {
    ui._navCleanup?.();
    ui._navCleanup = null;
    ui._audio?.ui();
    onSelect(saveData.data.selectedCharacter);
  };

  const goBack = () => {
    ui._navCleanup?.();
    ui._navCleanup = null;
    ui._audio?.ui();
    onBack();
  };

  cardEls.forEach((el) => { el.onclick = () => selectCard(el); });
  screen.querySelector('#btn-confirm').onclick = continueGame;
  screen.querySelector('#btn-back').onclick = goBack;

  let initialIndex = cardEls.findIndex(el => el.dataset.id === saveData.data.selectedCharacter);
  if (initialIndex < 0 || cardEls[initialIndex]?.dataset.playable !== '1') {
    initialIndex = cardEls.findIndex((el) => el.dataset.playable === '1');
  }
  if (initialIndex < 0) initialIndex = 0;

  ui._navCleanup = bindGridNavigation(navCtx(ui), {
    cards: cardEls,
    columns: 2,
    focusClass: 'focused',
    initialIndex,
    selectionOnMouseFocus: false,
    onFocusChange: (index) => {
      const el = cardEls[index];
      if (el.dataset.playable !== '1') return;
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
