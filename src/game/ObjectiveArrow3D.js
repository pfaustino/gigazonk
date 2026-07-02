import * as THREE from 'three';

/** Height above player and distance in front of the player (along facing). */
const ARROW_HEIGHT_ABOVE = 8.8;
const ARROW_AHEAD_DIST = 11;

/** Crazy Taxi–style 3D yellow arrow floating above the player. */
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
  }

  reset() {
    this.citizenArrow.visible = false;
    this.burgerArrow.visible = false;
    this._time = 0;
  }

  /** Flat arrow in the XZ plane, tip along +Z. */
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
    body.castShadow = true;
    group.add(body);

    group.scale.setScalar(2.2);
    return group;
  }

  _aimArrow(arrow, px, py, pz, frontHeading, target) {
    if (!target) {
      arrow.visible = false;
      return;
    }
    arrow.visible = true;

    const dx = target.x - px;
    const dz = target.z - pz;
    const yaw = Math.atan2(dx, dz) + Math.PI;
    const bounce = Math.sin(this._time * 5.5) * 0.35;
    const height = py + ARROW_HEIGHT_ABOVE + bounce;
    const fx = Math.sin(frontHeading);
    const fz = Math.cos(frontHeading);

    arrow.position.set(
      px + fx * ARROW_AHEAD_DIST,
      height,
      pz + fz * ARROW_AHEAD_DIST
    );
    arrow.rotation.set(0, yaw, 0);
  }

  update(dt, playerX, playerY, playerZ, frontHeading, citizenTarget, burgerTarget) {
    this._time += dt;
    this.citizenArrow.visible = false;
    this.burgerArrow.visible = false;

    const target = burgerTarget || citizenTarget;
    if (!target) return;

    const arrow = burgerTarget ? this.burgerArrow : this.citizenArrow;
    this._aimArrow(arrow, playerX, playerY, playerZ, frontHeading, target);
  }
}
