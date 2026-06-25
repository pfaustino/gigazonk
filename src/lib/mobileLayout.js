/** Media queries for touch-first / phone-landscape layout (single responsive build). */

const MQ_TOUCH_CONTROLS = [
  '(pointer: coarse)',
  '(orientation: landscape) and (max-height: 500px)',
  '(max-width: 900px) and (hover: none)',
];

const MQ_ROTATE_HINT = [
  '(orientation: portrait) and (max-width: 900px) and (pointer: coarse)',
  '(orientation: portrait) and (max-width: 900px) and (max-height: 700px)',
];

const MQ_MOBILE_PERF = [
  '(pointer: coarse)',
  '(orientation: landscape) and (max-height: 500px)',
];

function anyMatch(queries) {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return queries.some((q) => window.matchMedia(q).matches);
}

/** Show virtual stick + action buttons. */
export function prefersTouchControls() {
  return anyMatch(MQ_TOUCH_CONTROLS);
}

/** Block play with rotate overlay (portrait phones). */
export function needsRotateHint() {
  return anyMatch(MQ_ROTATE_HINT);
}

/** Lower DPR / effects tier on phones and small landscape viewports. */
export function isMobilePerformanceTier() {
  return anyMatch(MQ_MOBILE_PERF);
}

/**
 * Sync body classes + optional rotate overlay. Call once at boot; pass onChange for game hooks.
 * @param {(state: { touch: boolean, rotate: boolean }) => void} [onChange]
 */
export function initMobileLayout(onChange) {
  let overlay = document.getElementById('rotate-hint');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rotate-hint';
    overlay.className = 'rotate-hint hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Rotate device');
    overlay.innerHTML = `
      <div class="rotate-hint-card">
        <div class="rotate-hint-icon" aria-hidden="true">📱↻</div>
        <h2>Rotate your phone</h2>
        <p>GigaZonk plays best in landscape. Turn your device sideways to continue.</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const refresh = () => {
    const touch = prefersTouchControls();
    const rotate = needsRotateHint();
    document.body.classList.toggle('mobile-touch', touch);
    document.body.classList.toggle('phone-portrait', rotate);
    overlay.classList.toggle('hidden', !rotate);
    onChange?.({ touch, rotate });
  };

  refresh();
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);

  return { refresh };
}

export { MQ_TOUCH_CONTROLS, MQ_ROTATE_HINT, MQ_MOBILE_PERF };
