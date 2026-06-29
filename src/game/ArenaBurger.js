import * as THREE from 'three';
import {
  ARENA_BURGER_EAT_SEC,
  ARENA_BURGER_FRENZY_SEC,
  ARENA_BURGER_MAX_RADIUS,
  ARENA_BURGER_MIN_RADIUS,
  ARENA_BURGER_RADIUS,
  ARENA_SIZE,
} from './constants.js';
import { isLootSpotClear } from './TerrainFeatures.js';
import { runRandom } from '../lib/runRandom.js';

/** Arena power-up burger — eat to send the horde fleeing. */
export class ArenaBurger {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'arena-burger';
    scene.add(this.group);
    this.burger = null;
    this.spawnTimer = 0;
    this.respawnTimer = 0;
    /** @type {((burger: object) => void) | null} */
    this.onEaten = null;
    /** @type {(() => void) | null} */
    this.onEatStart = null;
  }

  get active() {
    return this.burger != null && !this.burger.eating;
  }

  get eating() {
    return this.burger?.eating === true;
  }

  getTarget() {
    if (!this.burger?.group || this.burger.eating) return null;
    return {
      x: this.burger.group.position.x,
      z: this.burger.group.position.z,
    };
  }

  getNearestDist(px, pz) {
    if (!this.active || !this.burger?.group) return null;
    return Math.hypot(this.burger.group.position.x - px, this.burger.group.position.z - pz);
  }

  reset() {
    this._disposeBurger();
    this.burger = null;
    this.spawnTimer = 0;
    this.respawnTimer = 0;
    this.group.visible = false;
  }

  _disposeBurger() {
    if (!this.burger?.group) return;
    this.burger.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
    this.group.remove(this.burger.group);
    this.burger.group = null;
  }

  _pickPoint() {
    const r = ARENA_BURGER_MIN_RADIUS
      + runRandom() * (ARENA_BURGER_MAX_RADIUS - ARENA_BURGER_MIN_RADIUS);
    const angle = runRandom() * Math.PI * 2;
    const half = ARENA_SIZE / 2 - 4;
    return {
      x: THREE.MathUtils.clamp(Math.cos(angle) * r, -half, half),
      z: THREE.MathUtils.clamp(Math.sin(angle) * r, -half, half),
    };
  }

  trySpawn(arena) {
    if (!arena || this.burger) return false;
    for (let attempt = 0; attempt < 64; attempt++) {
      const { x, z } = this._pickPoint();
      if (!isLootSpotClear(x, z, arena.obstacles, arena.mesas)) continue;
      this.burger = this._spawnBurger(x, z, arena);
      this.group.visible = true;
      return true;
    }
    return false;
  }

  _spawnBurger(x, z, arena) {
    const groundY = arena.getGroundHeight?.(x, z) ?? 0;
    const baseY = groundY + 0.55;

    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const bunMat = new THREE.MeshLambertMaterial({ color: 0xe8a84a });
    const pattyMat = new THREE.MeshLambertMaterial({ color: 0x6b3a22 });
    const lettuceMat = new THREE.MeshLambertMaterial({ color: 0x5cb85c });
    const cheeseMat = new THREE.MeshLambertMaterial({ color: 0xffcc33 });

    const bottomBun = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.22, 14), bunMat);
    bottomBun.position.y = 0.11;
    bottomBun.castShadow = true;
    group.add(bottomBun);

    const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.7, 0.18, 14), pattyMat);
    patty.position.y = 0.32;
    patty.castShadow = true;
    group.add(patty);

    const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), cheeseMat);
    cheese.position.y = 0.44;
    cheese.rotation.y = Math.PI / 5;
    group.add(cheese);

    const lettuce = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 6, 16), lettuceMat);
    lettuce.rotation.x = Math.PI / 2;
    lettuce.position.y = 0.52;
    group.add(lettuce);

    const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), bunMat);
    topBun.position.y = 0.48;
    topBun.castShadow = true;
    group.add(topBun);

    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.15, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    group.add(glow);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.12, 3.2, 6),
      new THREE.MeshBasicMaterial({ color: 0xffee66, transparent: true, opacity: 0.55 })
    );
    beam.position.y = 1.75;
    group.add(beam);

    this.group.add(group);

    return {
      group,
      glow,
      beam,
      x,
      z,
      baseY,
      radius: ARENA_BURGER_RADIUS,
      eating: false,
      eatT: 0,
    };
  }

  update(dt, px, pz, arena, player) {
    if (!this.burger) return;

    const burger = this.burger;
    if (!burger.group) return;

    if (burger.eating) {
      burger.eatT += dt;
      const t = Math.min(1, burger.eatT / ARENA_BURGER_EAT_SEC);
      const ease = t * t;
      burger.group.position.y = burger.baseY + ease * 1.2;
      burger.group.rotation.y += dt * 10;
      burger.group.scale.setScalar(Math.max(0, 1 - ease * 1.1));
      burger.glow.material.opacity = Math.max(0, 0.75 * (1 - t));
      if (player) {
        player.burgerEatingTimer = Math.max(player.burgerEatingTimer, ARENA_BURGER_EAT_SEC - burger.eatT);
      }
      if (t >= 1) {
        if (player) {
          player.burgerFrenzyTimer = ARENA_BURGER_FRENZY_SEC;
          player.burgerEatingTimer = 0;
        }
        this.onEaten?.(burger);
        this._disposeBurger();
        this.burger = null;
        this.respawnTimer = 0;
        this.group.visible = false;
      }
      return;
    }

    const time = Date.now() * 0.004;
    const bob = Math.sin(time + burger.x) * 0.08;
    burger.group.position.y = burger.baseY + bob;
    burger.group.rotation.y += dt * 1.4;
    burger.glow.rotation.z += dt * 2.5;
    burger.glow.material.opacity = 0.55 + Math.sin(time * 1.3 + burger.z) * 0.22;
    burger.beam.material.opacity = 0.45 + Math.sin(time * 2 + burger.x) * 0.2;

    const dist = Math.hypot(burger.x - px, burger.z - pz);
    if (dist <= burger.radius) {
      burger.eating = true;
      burger.eatT = 0;
      this.onEatStart?.();
      if (player) player.burgerEatingTimer = ARENA_BURGER_EAT_SEC;
    }
  }
}
