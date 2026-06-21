export class Input {
  constructor(canvas) {
    this.keys = {};
    this.justPressed = {};
    this.canvas = canvas;
    this.root = canvas.parentElement || canvas;
    this.cameraLookAllowed = true;
    this.pointerLocked = false;
    this.pointer = {
      left: false,
      right: false,
      deltaX: 0,
      deltaY: 0,
      wheel: 0,
    };

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
    let x = 0, z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp') || this.isLmbForward()) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) { x /= len; z /= len; }
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

  endFrame() {
    this.justPressed = {};
  }
}
