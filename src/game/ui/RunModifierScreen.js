import { CONFIRM_HINT, bindMenuList, createScreen } from './MenuNavigation.js';
import { rollRunModifierOffers } from '../RunModifiers.js';

function navCtx(ui) {
  return { layer: ui.layer, audio: ui._audio };
}

function cardHTML(mod, kind) {
  return `
    <button type="button" class="modifier-card modifier-card--${kind}" data-id="${mod.id}" data-kind="${kind}">
      <span class="modifier-card-icon">${mod.icon}</span>
      <span class="modifier-card-name">${mod.name}</span>
      <span class="modifier-card-desc">${mod.desc}</span>
    </button>
  `;
}

/**
 * Pick one boon + one curse before entering the arena.
 * @param {import('../UI.js').UI} ui
 * @param {(selection: { boonId: string, curseId: string }) => void} onConfirm
 * @param {() => void} onCancel
 */
export function showRunModifierPicker(ui, onConfirm, onCancel) {
  ui._navCleanup?.();
  ui._navCleanup = null;

  const offers = rollRunModifierOffers(3, 3);
  const screen = createScreen(ui.layer);
  screen.className = 'screen run-modifier-screen';
  screen.innerHTML = `
    <header class="run-modifier-header">
      <h2 class="run-modifier-title">Run Contract</h2>
      <p class="run-modifier-subtitle">Pick a blessing and a curse — high risk, high Zonk.</p>
    </header>
    <div class="run-modifier-columns">
      <section class="run-modifier-column">
        <h3 class="run-modifier-column-title">Blessing</h3>
        <div class="run-modifier-grid" id="boon-grid">
          ${offers.boons.map((b) => cardHTML(b, 'boon')).join('')}
        </div>
      </section>
      <section class="run-modifier-column">
        <h3 class="run-modifier-column-title">Curse</h3>
        <div class="run-modifier-grid" id="curse-grid">
          ${offers.curses.map((c) => cardHTML(c, 'curse')).join('')}
        </div>
      </section>
    </div>
    <footer class="run-modifier-footer">
      <p class="menu-hint">${CONFIRM_HINT} on Enter Arena</p>
      <button type="button" class="btn btn-primary" id="btn-modifier-enter" disabled>Enter Arena</button>
      <button type="button" class="btn btn-secondary" id="btn-modifier-back">Back</button>
    </footer>
  `;

  let boonId = null;
  let curseId = null;
  const enterBtn = screen.querySelector('#btn-modifier-enter');
  const backBtn = screen.querySelector('#btn-modifier-back');
  const cards = [...screen.querySelectorAll('.modifier-card')];

  const syncEnter = () => {
    enterBtn.disabled = !(boonId && curseId);
  };

  const selectCard = (card) => {
    const kind = card.dataset.kind;
    const id = card.dataset.id;
    for (const c of cards) {
      if (c.dataset.kind === kind) c.classList.remove('selected');
    }
    card.classList.add('selected');
    if (kind === 'boon') boonId = id;
    else curseId = id;
    syncEnter();
  };

  for (const card of cards) {
    card.addEventListener('click', () => {
      ui._audio?.ui();
      selectCard(card);
    });
  }

  enterBtn.onclick = () => {
    if (!boonId || !curseId) return;
    ui._navCleanup?.();
    ui._navCleanup = null;
    ui._audio?.ui();
    onConfirm({ boonId, curseId });
  };

  backBtn.onclick = () => {
    ui._navCleanup?.();
    ui._navCleanup = null;
    ui._audio?.ui();
    onCancel();
  };

  ui._navCleanup = bindMenuList(navCtx(ui), [enterBtn, backBtn]);
  syncEnter();
}
