import * as THREE from 'three';

export class CameraController {
  constructor() {
    this.yaw = 0;
    this.pitch = 0.72;
    this.distance = 26;
    this.minDistance = 10;
    this.maxDistance = 80;
    this.minPitch = 0.3;
    this.maxPitch = 1.25;
    this.rotateSpeed = 0.0055;
    this.zoomSpeed = 0.035;
    this.invertMouseY = false;
    this.smooth = 0.14;
    this._targetPos = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
  }

  reset() {
    this.yaw = 0;
    this.pitch = 0.72;
    this.distance = 26;
  }

  applySettings(settings = {}) {
    this.invertMouseY = settings.invertMouseY === true;
  }

  handleInput(dragX, dragY, wheel) {
    if (dragX || dragY) {
      this.yaw -= dragX * this.rotateSpeed;
      const pitchSign = this.invertMouseY ? 1 : -1;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + pitchSign * dragY * this.rotateSpeed,
        this.minPitch,
        this.maxPitch
      );
    }
    if (wheel) {
      this.distance = THREE.MathUtils.clamp(
        this.distance + wheel * this.zoomSpeed,
        this.minDistance,
        this.maxDistance
      );
    }
  }

  apply(camera, playerPos, lookY = 1) {
    const horiz = this.distance * Math.cos(this.pitch);
    const x = playerPos.x + Math.sin(this.yaw) * horiz;
    const z = playerPos.z + Math.cos(this.yaw) * horiz;
    const y = this.distance * Math.sin(this.pitch);

    this._targetPos.set(x, y, z);
    camera.position.lerp(this._targetPos, this.smooth);
    this._lookAt.set(playerPos.x, lookY, playerPos.z);
    camera.lookAt(this._lookAt);
  }
}
