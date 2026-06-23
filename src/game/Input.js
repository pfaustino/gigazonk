const DEADZONE = 0.18;
const TRIGGER_ON = 0.45;
const LOOK_SENS = 9;
const MENU_STICK_THRESHOLD = 0.38;
const MENU_REPEAT_DELAY = 0.32;
const MENU_REPEAT_RATE = 0.09;

export class Input {
  constructor(canvas) {
    this.keys = {};
    this.justPressed = {};
    this.canvas = canvas;
    this.root = canvas.parentElement || canvas;
    this.cameraLookAllowed = true;
    this.pointerLocked = false;
    this.gameplayEnabled = true;
    this.invertLookY = false;
    this.pointer = {
      left: false,
      right: false,
      deltaX: 0,
      deltaY: 0,
      wheel: 0,
    };
    this._stickMove = { x: 0, z: 0 };
    this._gpPrev = null;
    this._menuStickTimers = { up: 0, down: 0, left: 0, right: 0 };

    const blockMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const isMouse = (e) => e.pointerType === 'mouse' || e instanceof MouseEvent;

    const syncButtons = (e) => {
      if (!isMouse(e) || typeof e.buttons !== 'number') return;
      this.pointer.left = (e.buttons & 1) !== 0;
      this.pointer.right = (e.buttons & 2) !== 0;
      if (!this.pointer.right) this.releaseCameraLook();
    };

    const onPointerDown = (e) => {
      if (!isMouse(e)) return;
      if (e.button === 2) e.preventDefault();
      syncButtons(e);
      if (
        e.button === 2 &&
        this.cameraLookAllowed &&
        (e.target === canvas || canvas.contains(e.target))
      ) {
        this.beginCameraLook();
      }
    };

    const onPointerUp = (e) => {
      if (!isMouse(e)) return;
      syncButtons(e);
    };

    const onPointerMove = (e) => {
      if (!isMouse(e)) return;
      syncButtons(e);
      if (!this.pointer.right && !this.pointerLocked) return;

      if (this.pointerLocked) {
        this.pointer.deltaX += e.movementX;
        this.pointer.deltaY += e.movementY;
        return;
      }

      if (e.buttons & 2) {
        this.pointer.deltaX += e.movementX;
        this.pointer.deltaY += e.movementY;
      }
    };

    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      canvas.classList.toggle('camera-look', this.pointerLocked);
      if (this.pointerLocked && !this.pointer.right) {
        this.releaseCameraLook();
      }
    };

    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.justPressed = {};
      this.pointer.left = false;
      this.pointer.right = false;
      this.pointer.deltaX = 0;
      this.pointer.deltaY = 0;
      this.pointer.wheel = 0;
      this._stickMove.x = 0;
      this._stickMove.z = 0;
      this._gpPrev = null;
      this._menuStickTimers = { up: 0, down: 0, left: 0, right: 0 };
      this.releaseCameraLook();
    });

    for (const el of [this.root, canvas, document]) {
      el.addEventListener('contextmenu', blockMenu, true);
      el.addEventListener('auxclick', (e) => {
        if (e.button === 2) blockMenu(e);
      }, true);
    }

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockChange);

    canvas.addEventListener('wheel', (e) => {
      this.pointer.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  setGameplayEnabled(enabled) {
    this.gameplayEnabled = enabled;
    if (!enabled) {
      this._stickMove.x = 0;
      this._stickMove.z = 0;
      this.keys.KeyF = false;
      this.keys.Space = false;
      this.keys.KeyQ = false;
      this.keys.ShiftLeft = false;
    }
  }

  setInvertLookY(invert) {
    this.invertLookY = invert === true;
  }

  beginCameraLook() {
    if (!this.cameraLookAllowed) return;
    if (document.pointerLockElement === this.canvas) return;
    this.canvas.requestPointerLock();
  }

  releaseCameraLook() {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
    this.pointerLocked = false;
    this.canvas.classList.remove('camera-look');
  }

  setCameraLookAllowed(allowed) {
    this.cameraLookAllowed = allowed;
    if (!allowed) this.releaseCameraLook();
  }

  isDown(code) { return !!this.keys[code]; }
  wasPressed(code) {
    const v = !!this.justPressed[code];
    this.justPressed[code] = false;
    return v;
  }

  isLmbForward() {
    return this.pointer.left;
  }

  getMoveVector() {
    let x = 0;
    let z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp') || this.isLmbForward()) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;

    const gx = this._stickMove.x;
    const gz = this._stickMove.z;
    if (gx !== 0 || gz !== 0) {
      x += gx;
      z += gz;
    }

    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  consumeCameraInput() {
    const dragX = this.pointer.deltaX;
    const dragY = this.pointer.deltaY;
    const wheel = this.pointer.wheel;
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
    this.pointer.wheel = 0;
    return { dragX, dragY, wheel };
  }

  pollGamepad(dt, { menuNav = false } = {}) {
    const pad = this._getGamepad();
    if (!pad) {
      this._stickMove.x = 0;
      this._stickMove.z = 0;
      this._gpPrev = null;
      return;
    }

    const cur = this._readGamepadState(pad);
    const prev = this._gpPrev ?? {};
    const frameScale = LOOK_SENS * dt * 60;

    if (this.gameplayEnabled) {
      const lx = this._axis(pad.axes[0]);
      const ly = this._axis(pad.axes[1]);
      this._stickMove.x = lx;
      this._stickMove.z = ly;

      const rx = this._axis(pad.axes[2]);
      const ry = this._axis(pad.axes[3]);
      const pitchSign = this.invertLookY ? 1 : -1;
      this.pointer.deltaX += rx * frameScale;
      this.pointer.deltaY += pitchSign * ry * frameScale;

      this._mapHold(cur.lt, prev.lt, 'KeyF', TRIGGER_ON);
      this._mapHold(cur.rt, prev.rt, 'Space', TRIGGER_ON);
      this._mapHold(cur.lb, prev.lb, 'KeyQ', 0.5);
      this._mapHold(cur.l3, prev.l3, 'ShiftLeft', 0.5);

      if (cur.dpadUp && !prev.dpadUp) this.pointer.wheel -= 120;
      if (cur.dpadDown && !prev.dpadDown) this.pointer.wheel += 120;

      if (cur.start && !prev.start) this._emitKey('Escape');
    } else {
      this._stickMove.x = 0;
      this._stickMove.z = 0;
    }

    if (menuNav) {
      if (cur.a && !prev.a) this._emitKey('Enter');
      if (cur.b && !prev.b) this._emitKey('Escape');
      if (cur.start && !prev.start) this._emitKey('Escape');
      this._emitDpadEdges(cur, prev);
      const { x, y } = this._getMenuStick(pad);
      this._pollMenuStick(x, y, dt);
    } else {
      this._menuStickTimers.up = 0;
      this._menuStickTimers.down = 0;
      this._menuStickTimers.left = 0;
      this._menuStickTimers.right = 0;
    }

    this._gpPrev = cur;
  }

  endFrame() {
    this.justPressed = {};
  }

  _getGamepad() {
    const pads = navigator.getGamepads?.();
    if (!pads) return null;
    for (const pad of pads) {
      if (pad?.connected) return pad;
    }
    return null;
  }

  _btn(pad, index) {
    const btn = pad.buttons[index];
    if (!btn) return 0;
    return btn.value ?? (btn.pressed ? 1 : 0);
  }

  _trigger(pad, buttonIndex, axisIndex) {
    let value = this._btn(pad, buttonIndex);
    const axis = pad.axes[axisIndex];
    if (axis != null) {
      const axisValue = axis >= 0 && axis <= 1 ? axis : (axis + 1) / 2;
      value = Math.max(value, axisValue);
    }
    return value;
  }

  _axis(value) {
    if (value == null || Math.abs(value) < DEADZONE) return 0;
    const sign = Math.sign(value);
    const mag = (Math.abs(value) - DEADZONE) / (1 - DEADZONE);
    return sign * Math.min(1, mag);
  }

  _readGamepadState(pad) {
    return {
      a: this._btn(pad, 0) >= 0.5,
      b: this._btn(pad, 1) >= 0.5,
      lb: this._btn(pad, 4) >= 0.5,
      lt: this._trigger(pad, 6, 2),
      rt: this._trigger(pad, 7, 5),
      l3: this._btn(pad, 10) >= 0.5,
      start: this._btn(pad, 9) >= 0.5,
      dpadUp: this._btn(pad, 12) >= 0.5,
      dpadDown: this._btn(pad, 13) >= 0.5,
      dpadLeft: this._btn(pad, 14) >= 0.5,
      dpadRight: this._btn(pad, 15) >= 0.5,
    };
  }

  _mapHold(curVal, prevVal, code, threshold) {
    const on = curVal >= threshold;
    const was = prevVal >= threshold;
    if (on) {
      if (!was) this.justPressed[code] = true;
      this.keys[code] = true;
    } else if (was) {
      this.keys[code] = false;
    }
  }

  _emitDpadEdges(cur, prev) {
    if (cur.dpadUp && !prev.dpadUp) this._emitMenuDir('up');
    if (cur.dpadDown && !prev.dpadDown) this._emitMenuDir('down');
    if (cur.dpadLeft && !prev.dpadLeft) this._emitMenuDir('right');
    if (cur.dpadRight && !prev.dpadRight) this._emitMenuDir('left');
  }

  _getMenuStick(pad) {
    let x = this._axis(pad.axes[0]);
    let y = this._axis(pad.axes[1]);
    const rightX = this._axis(pad.axes[2]);
    const rightY = this._axis(pad.axes[3]);
    if (Math.hypot(rightX, rightY) > Math.hypot(x, y)) {
      x = rightX;
      y = rightY;
    }
    return { x, y };
  }

  _pollMenuStick(x, y, dt) {
    const active = { up: false, down: false, left: false, right: false };
    if (Math.hypot(x, y) >= MENU_STICK_THRESHOLD) {
      if (Math.abs(y) >= Math.abs(x)) {
        if (y < 0) active.up = true;
        else active.down = true;
      } else if (x < 0) {
        active.right = true;
      } else {
        active.left = true;
      }
    }

    for (const dir of ['up', 'down', 'left', 'right']) {
      this._tickMenuStick(dir, active[dir], dt);
    }
  }

  _tickMenuStick(dir, active, dt) {
    if (!active) {
      this._menuStickTimers[dir] = 0;
      return;
    }

    const prev = this._menuStickTimers[dir];
    const next = prev + dt;
    this._menuStickTimers[dir] = next;

    if (prev <= 0) {
      this._emitMenuDir(dir);
      return;
    }

    if (next < MENU_REPEAT_DELAY) return;

    const prevRepeats = Math.floor(Math.max(0, prev - MENU_REPEAT_DELAY) / MENU_REPEAT_RATE);
    const nextRepeats = Math.floor(Math.max(0, next - MENU_REPEAT_DELAY) / MENU_REPEAT_RATE);
    if (nextRepeats > prevRepeats) this._emitMenuDir(dir);
  }

  _emitMenuDir(dir) {
    const codes = {
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
    };
    for (const code of codes[dir] ?? []) this._emitKey(code);
  }

  _emitKey(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
  }
}
