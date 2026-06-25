export const CONFIRM_KEYS = ['Enter', 'NumpadEnter', 'Space', 'KeyF'];
export const CONFIRM_HINT = 'Enter, Space, or F to confirm';

export function createScreen(layer) {
  const screen = document.createElement('div');
  screen.className = 'screen';
  layer.appendChild(screen);
  return screen;
}

function createNavPointerGuard(layer) {
  let mouseNavActive = true;
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

function guardPointerClicks(elements, pointer) {
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

/** @param {{ layer: HTMLElement, audio?: { ui(): void } }} ctx */
export function bindGridNavigation(ctx, {
  cards,
  columns = cards.length,
  focusClass = 'selected',
  initialIndex = 0,
  onFocusChange = null,
  onConfirm,
  onCancel = null,
  /** When false, mouse hover only moves the focus ring — not onFocusChange (e.g. char pick). */
  selectionOnMouseFocus = true,
}) {
  if (!cards.length) return () => {};

  const pointer = createNavPointerGuard(ctx.layer);
  const unguardClicks = guardPointerClicks(cards, pointer);
  let index = Math.min(initialIndex, cards.length - 1);

  const updateFocus = (triggerFocusChange = true) => {
    cards.forEach((card, i) => card.classList.toggle(focusClass, i === index));
    if (triggerFocusChange) onFocusChange?.(index, cards[index]);
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
      ctx.audio?.ui();
      updateFocus(true);
    }
  };

  cards.forEach((card, i) => {
    card.addEventListener('mouseenter', () => {
      if (!pointer.allowMouseNav()) return;
      index = i;
      updateFocus(selectionOnMouseFocus);
    });
  });

  updateFocus(false);
  window.addEventListener('keydown', onKeyDown);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    unguardClicks();
    pointer.dispose();
  };
}

/** @param {{ layer: HTMLElement, audio?: { ui(): void } }} ctx */
export function bindMenuList(ctx, buttons, onCancel, initialIndex = 0) {
  if (!buttons.length) return () => {};

  const pointer = createNavPointerGuard(ctx.layer);
  const unguardClicks = guardPointerClicks(buttons, pointer);
  let index = Math.min(Math.max(0, initialIndex), buttons.length - 1);
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
      ctx.audio?.ui();
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

/** @param {{ layer: HTMLElement, audio?: { ui(): void } }} ctx */
export function bindSettingsNav(ctx, items, onCancel) {
  if (!items.length) return () => {};

  const pointer = createNavPointerGuard(ctx.layer);
  const unguardClicks = guardPointerClicks(items.map((item) => item.el), pointer);
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
      ctx.audio?.ui();
      return;
    } else if (['ArrowRight', 'KeyD'].includes(e.code) && item.onRight) {
      e.preventDefault();
      pointer.onKeyboardUse();
      item.onRight();
      ctx.audio?.ui();
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
      ctx.audio?.ui();
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
