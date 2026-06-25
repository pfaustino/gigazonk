import { prefersTouchControls } from '../lib/mobileLayout.js';

/** On-screen touch controls for mobile / tablet play. */
export class TouchControls {
  constructor(input) {
    this.input = input;
    this._gameVisible = false;
    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.className = 'touch-controls hidden';
    this.root.innerHTML = `
      <div class="touch-stick" id="touch-move" aria-label="Move">
        <div class="touch-stick-knob" id="touch-move-knob"></div>
      </div>
      <div class="touch-actions">
        <button type="button" class="touch-btn" data-action="dodge" id="touch-btn-dodge" aria-label="Dodge">
          <span class="touch-btn-label">Dodge</span>
          <div class="cooldown-radar hidden" id="touch-dodge-cooldown-radar" aria-hidden="true">
            <div class="cooldown-sweep" id="touch-dodge-cooldown-sweep"></div>
            <div class="cooldown-hand" id="touch-dodge-cooldown-hand"></div>
          </div>
        </button>
        <button type="button" class="touch-btn" data-action="jump" id="touch-btn-jump" aria-label="Jump">Jump</button>
        <button type="button" class="touch-btn" data-action="interact" id="touch-btn-interact" aria-label="Interact">Use</button>
      </div>
    `;
    document.body.appendChild(this.root);

    this._moveActive = false;
    this._moveVector = { x: 0, y: 0 };
    this._bindMoveStick();
    this._bindButtons();
    this.refreshVisibility();
  }

  refreshVisibility() {
    const show = this._gameVisible && prefersTouchControls();
    this.root.classList.toggle('hidden', !show);
  }

  setVisible(visible) {
    this._gameVisible = visible;
    this.refreshVisibility();
  }

  _bindButtons() {
    this.root.querySelectorAll('.touch-btn').forEach((btn) => {
      const action = btn.dataset.action;
      const fire = () => {
        if (action === 'dodge') this.input.touchTap('dodge');
        if (action === 'jump') this.input.touchTap('jump');
        if (action === 'interact') this.input.touchTap('interact');
      };
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); fire(); });
      btn.addEventListener('click', fire);
    });
  }

  _bindMoveStick() {
    const pad = this.root.querySelector('#touch-move');
    const knob = this.root.querySelector('#touch-move-knob');
    let touchId = null;
    let originX = 0;
    let originY = 0;
    const radius = 48;

    const setKnob = (dx, dy) => {
      const len = Math.hypot(dx, dy);
      const clamped = len > radius ? radius / len : 1;
      const x = dx * clamped;
      const y = dy * clamped;
      knob.style.transform = `translate(${x}px, ${y}px)`;
      this._moveVector.x = x / radius;
      this._moveVector.y = y / radius;
      this.input.setTouchMove(this._moveVector.x, this._moveVector.y);
    };

    const reset = () => {
      touchId = null;
      this._moveActive = false;
      knob.style.transform = 'translate(0, 0)';
      this._moveVector.x = 0;
      this._moveVector.y = 0;
      this.input.setTouchMove(0, 0);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };

    const onMove = (e) => {
      if (touchId == null) return;
      e.preventDefault();
      for (const t of e.touches) {
        if (t.identifier !== touchId) continue;
        setKnob(t.clientX - originX, t.clientY - originY);
        return;
      }
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) reset();
      }
    };

    pad.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (touchId != null) return;
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const rect = pad.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      this._moveActive = true;
      this.input.clearPointerButtons();
      setKnob(t.clientX - originX, t.clientY - originY);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    }, { passive: false });
  }
}
