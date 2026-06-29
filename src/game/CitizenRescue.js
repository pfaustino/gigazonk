import * as THREE from 'three';
import {
  ARENA_SIZE,
  CITIZEN_RESCUE_MAX_RADIUS,
  CITIZEN_RESCUE_MIN_RADIUS,
  CITIZEN_RESCUE_MIN_SPACING,
  CITIZEN_RESCUE_RADIUS,
  CITIZEN_RESCUE_TELEPORT_SEC,
} from './constants.js';
import { isLootSpotClear } from './TerrainFeatures.js';
import { runRandom } from '../lib/runRandom.js';

const CITIZEN_COLORS = [0x7ec8e3, 0xf7c948, 0xe88bb8, 0x88ccaa, 0xffaa66, 0xb8a8ff];

/** Arena citizens in distress — rescue with F to teleport them to safety. */
export class CitizenRescue {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'citizen-rescue';
    scene.add(this.group);
    this.citizens = [];
    /** @type {((citizen: object) => void) | null} */
    this.onRescued = null;
  }

  reset() {
    for (const citizen of this.citizens) {
      this._disposeCitizen(citizen);
    }
    this.citizens = [];
  }

  get aliveCount() {
    return this.citizens.filter((c) => !c.rescuing).length;
  }

  getNearestDist(px, pz) {
    let min = Infinity;
    for (const c of this.citizens) {
      if (c.rescuing || c.rescued || !c.group) continue;
      min = Math.min(min, Math.hypot(c.group.position.x - px, c.group.position.z - pz));
    }
    return Number.isFinite(min) ? min : null;
  }

  getNearestTarget(px, pz) {
    let nearest = null;
    let minDist = Infinity;
    for (const c of this.citizens) {
      if (c.rescuing || c.rescued || !c.group) continue;
      const x = c.group.position.x;
      const z = c.group.position.z;
      const dist = Math.hypot(x - px, z - pz);
      if (dist < minDist) {
        minDist = dist;
        nearest = { x, z, dist };
      }
    }
    return nearest;
  }

  _disposeCitizen(citizen) {
    if (!citizen.group) return;
    citizen.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
    this.group.remove(citizen.group);
    citizen.group = null;
  }

  _pickPoint() {
    const r = CITIZEN_RESCUE_MIN_RADIUS
      + runRandom() * (CITIZEN_RESCUE_MAX_RADIUS - CITIZEN_RESCUE_MIN_RADIUS);
    const angle = runRandom() * Math.PI * 2;
    const half = ARENA_SIZE / 2 - 4;
    return {
      x: THREE.MathUtils.clamp(Math.cos(angle) * r, -half, half),
      z: THREE.MathUtils.clamp(Math.sin(angle) * r, -half, half),
    };
  }

  _spotClear(x, z, arena, placed) {
    if (!arena || !isLootSpotClear(x, z, arena.obstacles, arena.mesas)) return false;
    for (const other of placed) {
      if (Math.hypot(other.x - x, other.z - z) < CITIZEN_RESCUE_MIN_SPACING) return false;
    }
    return true;
  }

  scatter(arena, count) {
    if (!arena || count <= 0) return 0;
    this.reset();
    this.group.visible = true;

    const placed = [];
    for (let n = 0; n < count; n++) {
      let x = 0;
      let z = 0;
      let ok = false;
      for (let attempt = 0; attempt < 64; attempt++) {
        ({ x, z } = this._pickPoint());
        if (this._spotClear(x, z, arena, placed)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;

      const color = CITIZEN_COLORS[n % CITIZEN_COLORS.length];
      const citizen = this._spawnCitizen(x, z, color, arena);
      placed.push({ x, z });
      this.citizens.push(citizen);
    }

    return placed.length;
  }

  /** Spawn one citizen without clearing existing ones (respawn when all rescued). */
  spawnOne(arena) {
    if (!arena) return false;
    this.group.visible = true;

    const placed = this.citizens
      .filter((c) => !c.rescuing)
      .map((c) => ({ x: c.x, z: c.z }));
    for (let attempt = 0; attempt < 64; attempt++) {
      const { x, z } = this._pickPoint();
      if (!this._spotClear(x, z, arena, placed)) continue;
      const color = CITIZEN_COLORS[this.citizens.length % CITIZEN_COLORS.length];
      this.citizens.push(this._spawnCitizen(x, z, color, arena));
      return true;
    }
    return false;
  }

  _spawnCitizen(x, z, color, arena) {
    const groundY = arena.getGroundHeight?.(x, z) ?? 0;
    const baseY = groundY + 0.9;

    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.76, 4, 8),
      new THREE.MeshLambertMaterial({ color })
    );
    body.castShadow = true;
    group.add(body);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 2.8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.88 })
    );
    pillar.position.y = 1.35;
    group.add(pillar);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.95 })
    );
    glow.position.y = 2.75;
    group.add(glow);

    const beacon = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.95, 20),
      new THREE.MeshBasicMaterial({
        color: 0xff6644,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = -0.86;
    group.add(beacon);

    const sign = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.48, 4),
      new THREE.MeshBasicMaterial({ color: 0xffee88 })
    );
    sign.position.set(0, 1.55, 0);
    sign.rotation.z = Math.PI;
    group.add(sign);

    this.group.add(group);

    return {
      group,
      body,
      pillar,
      glow,
      beacon,
      sign,
      x,
      z,
      baseY,
      color,
      radius: CITIZEN_RESCUE_RADIUS,
      rescuing: false,
      rescued: false,
      rescueT: 0,
    };
  }

  getNearest(px, pz) {
    let nearest = null;
    let minDist = Infinity;
    for (const citizen of this.citizens) {
      if (citizen.rescuing || citizen.rescued) continue;
      const dist = Math.hypot(citizen.x - px, citizen.z - pz);
      if (dist < citizen.radius && dist < minDist) {
        minDist = dist;
        nearest = citizen;
      }
    }
    return nearest;
  }

  startRescue(citizen) {
    if (!citizen || citizen.rescuing || citizen.rescued) return false;
    citizen.rescuing = true;
    citizen.rescueT = 0;
    return true;
  }

  update(dt, px, pz) {
    const time = Date.now() * 0.004;
    for (let i = this.citizens.length - 1; i >= 0; i--) {
      const citizen = this.citizens[i];
      if (!citizen.group) continue;

      if (citizen.rescuing) {
        citizen.rescueT += dt;
        const t = Math.min(1, citizen.rescueT / CITIZEN_RESCUE_TELEPORT_SEC);
        const ease = t * t;
        citizen.group.position.y = citizen.baseY + ease * 5;
        citizen.group.rotation.y += dt * 14;
        const scale = Math.max(0, 1 - ease * 1.15);
        citizen.group.scale.setScalar(scale);
        citizen.beacon.material.opacity = Math.max(0, 0.8 * (1 - t));
        if (t >= 1) {
          citizen.rescued = true;
          this.onRescued?.(citizen);
          this._disposeCitizen(citizen);
          this.citizens.splice(i, 1);
        }
        continue;
      }

      const inRange = Math.hypot(citizen.x - px, citizen.z - pz) < citizen.radius;
      const bob = Math.sin(Date.now() * 0.004 + citizen.x) * 0.06;
      citizen.group.position.y = citizen.baseY + bob;
      citizen.glow.position.y = 2.75 + bob * 0.5;
      citizen.beacon.rotation.z += dt * (inRange ? 4.5 : 2.2);
      citizen.beacon.material.opacity = 0.5 + Math.sin(time + citizen.z) * 0.28;
      citizen.pillar.material.opacity = 0.72 + Math.sin(time * 1.2 + citizen.x) * 0.18;

      if (inRange) {
        citizen.body.rotation.x = Math.sin(time + citizen.x) * 0.55;
        citizen.body.rotation.z = Math.cos(time * 0.9 + citizen.z) * 0.45;
        citizen.sign.rotation.y += dt * 5;
      } else {
        citizen.body.rotation.x *= 0.82;
        citizen.body.rotation.z *= 0.82;
        citizen.sign.rotation.y *= 0.9;
        if (Math.abs(citizen.body.rotation.x) < 0.02) citizen.body.rotation.x = 0;
        if (Math.abs(citizen.body.rotation.z) < 0.02) citizen.body.rotation.z = 0;
      }
    }
  }
}
