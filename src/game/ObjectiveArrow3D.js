import * as THREE from 'three';

/** Distance in front of the camera along the top-center screen ray. */
const ARROW_SCREEN_DEPTH = 16;
/** NDC anchor: center-top of the viewport (x=0, y toward top). */
const ARROW_SCREEN_NDC = new THREE.Vector2(0, 0.78);

/** Flat arrow mesh tip points local -Z; yaw aims that tip at the world target on XZ. */
export function objectiveArrowYaw(dx, dz) {
  return Math.atan2(-dx, -dz);
}

/** Crazy Taxi–style 3D yellow arrow locked to the top-center of the screen. */
export class ObjectiveArrow3D {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'objective-arrows-3d';
    scene.add(this.root);
    this.citizenArrow = this._buildArrow(0xffcc22);
    this.burgerArrow = this._buildArrow(0xffdd33);
    this.root.add(this.citizenArrow, this.burgerArrow);
    this.citizenArrow.visible = false;
    this.burgerArrow.visible = false;
    this._time = 0;
    this._ray = new THREE.Raycaster();
  }

  reset() {
    this.citizenArrow.visible = false;
    this.burgerArrow.visible = false;
    this._time = 0;
  }

  /** Flat arrow in the XZ plane, tip along local -Z (see extrude +X rotation). */
  _buildArrow(bodyColor) {
    const group = new THREE.Group();
    const yellow = new THREE.MeshLambertMaterial({
      color: bodyColor,
      emissive: bodyColor,
      emissiveIntensity: 0.1,
    });

    const shape = new THREE.Shape();
    shape.moveTo(0, 1.15);
    shape.lineTo(0.72, 0.05);
    shape.lineTo(0.28, 0.05);
    shape.lineTo(0.28, -0.75);
    shape.lineTo(-0.28, -0.75);
    shape.lineTo(-0.28, 0.05);
    shape.lineTo(-0.72, 0.05);
    shape.closePath();

    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelSegments: 1,
      }),
      yellow
    );
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0.11;
    body.castShadow = false;
    group.add(body);

    group.scale.setScalar(2.2);
    return group;
  }

  _aimArrow(arrow, camera, playerX, playerZ, target) {
    if (!target) {
      arrow.visible = false;
      return;
    }
    arrow.visible = true;

    this._ray.setFromCamera(ARROW_SCREEN_NDC, camera);
    arrow.position
      .copy(this._ray.ray.origin)
      .addScaledVector(this._ray.ray.direction, ARROW_SCREEN_DEPTH);
    arrow.position.y += Math.sin(this._time * 5.5) * 0.35;

    const dx = target.x - playerX;
    const dz = target.z - playerZ;
    arrow.rotation.set(0, objectiveArrowYaw(dx, dz), 0);
  }

  update(dt, camera, playerX, playerZ, citizenTarget, burgerTarget) {
    this._time += dt;
    this.citizenArrow.visible = false;
    this.burgerArrow.visible = false;

    const target = burgerTarget || citizenTarget;
    if (!target || !camera) return;

    const arrow = burgerTarget ? this.burgerArrow : this.citizenArrow;
    this._aimArrow(arrow, camera, playerX, playerZ, target);
  }
}
