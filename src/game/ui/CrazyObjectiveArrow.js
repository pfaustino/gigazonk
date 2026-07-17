/** HUD distance labels + burger/gobble countdowns (3D arrows live in ObjectiveArrow3D). */

const OBJECTIVE_ACTION_LABELS = {
  citizen: 'Rescue',
  burger: 'Gobble Burger',
};

export function formatObjectiveDistanceLabel(variant, distance) {
  const action = OBJECTIVE_ACTION_LABELS[variant] ?? '';
  const meters = `${Math.round(distance)}m`;
  return action ? `${action} ${meters}` : meters;
}

export function formatObjectiveCountdown(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function createObjectiveDistanceLabel(id, variant) {
  const el = document.createElement('div');
  el.id = id;
  el.className = `objective-dist-label objective-dist-label--${variant} hidden`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

export function createBurgerCountdownElement() {
  const el = document.createElement('div');
  el.id = 'burger-spawn-countdown';
  el.className = 'burger-spawn-countdown hidden';
  el.setAttribute('aria-live', 'polite');
  return el;
}

export function createGobbleCountdownElement() {
  const el = document.createElement('div');
  el.id = 'gobble-countdown';
  el.className = 'gobble-countdown hidden';
  el.setAttribute('aria-live', 'polite');
  return el;
}

/**
 * @param {HTMLElement | null} el
 * @param {{ active?: boolean, distance?: number | null, lane?: number, variant?: 'citizen' | 'burger' }} opts
 */
export function updateObjectiveDistanceLabel(el, { active = false, distance = null, lane = 0, variant = '' } = {}) {
  if (!el) return;
  if (!active || distance == null || !Number.isFinite(distance)) {
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    return;
  }
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden', 'false');
  const topY = Math.max(118, window.innerHeight * 0.17);
  const cx = window.innerWidth / 2 + lane * 88;
  el.style.left = `${cx}px`;
  el.style.top = `${topY}px`;
  el.textContent = formatObjectiveDistanceLabel(variant, distance);
}

export function updateBurgerCountdown(el, { active = false, secondsRemaining = 0 } = {}) {
  if (!el) return;
  if (!active || secondsRemaining <= 0) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.textContent = `🍔 Burger in ${formatObjectiveCountdown(secondsRemaining)}`;
}

export function updateGobbleCountdown(el, { active = false, secondsRemaining = 0 } = {}) {
  if (!el) return;
  if (!active || secondsRemaining <= 0) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.textContent = `👹 GOBBLE ${formatObjectiveCountdown(secondsRemaining)}`;
}
