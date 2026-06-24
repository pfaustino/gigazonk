import * as THREE from 'three';
import { MAX_GEMS } from './constants.js';
import { buildGemGeometry } from './EntityVisuals.js';
import { runRandom } from '../lib/runRandom.js';
import { assert } from '../lib/assert.js';

const dummy = new THREE.Object3D();

export class GemManager {
  constructor(scene) {
    this.scene = scene;
    const geo = buildGemGeometry();
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ddff });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_GEMS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);

    this.gems = [];
    this.freeSlots = [];
    for (let i = MAX_GEMS - 1; i >= 0; i--) this.freeSlots.push(i);
  }

  reset() {
    this.gems = [];
    this.freeSlots = [];
    for (let i = MAX_GEMS - 1; i >= 0; i--) this.freeSlots.push(i);
    this.mesh.count = 0;
  }

  spawn(x, z, value = 3, nearX = 0, nearZ = 0) {
    if (this.freeSlots.length === 0) {
      this._evictFarthestGem(nearX, nearZ);
    }
    if (this.freeSlots.length === 0) return value;

    assert(this.freeSlots.length > 0, 'GEM_POOL_EMPTY');
    const slot = this.freeSlots.pop();
    assert(slot !== undefined && slot >= 0 && slot < MAX_GEMS, 'GEM_SLOT_INVALID');
    const g = { slot, x, z, value, alive: true, vy: 2 + runRandom() * 2 };
    this.gems.push(g);
    this.mesh.count = Math.max(this.mesh.count, slot + 1);
    return 0;
  }

  _evictFarthestGem(nearX, nearZ) {
    let farthest = null;
    let maxDist = -1;
    for (const g of this.gems) {
      if (!g.alive) continue;
      const dist = Math.hypot(g.x - nearX, g.z - nearZ);
      if (dist > maxDist) {
        maxDist = dist;
        farthest = g;
      }
    }
    if (!farthest) return;
    this._retireGem(farthest);
  }

  _retireGem(g) {
    if (!g.alive) return;
    g.alive = false;
    this.freeSlots.push(g.slot);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    this.mesh.setMatrixAt(g.slot, dummy.matrix);
  }

  _compactDead() {
    let w = 0;
    for (let r = 0; r < this.gems.length; r++) {
      if (this.gems[r].alive) {
        if (w !== r) this.gems[w] = this.gems[r];
        w++;
      }
    }
    this.gems.length = w;
  }

  updateInstance(g) {
    if (!g.alive) {
      dummy.scale.set(0, 0, 0);
    } else {
      dummy.position.set(g.x, 0.5 + Math.sin(Date.now() * 0.005 + g.slot) * 0.2, g.z);
      const s = 0.5 + g.value * 0.05;
      dummy.scale.set(s, s, s);
      dummy.rotation.y = Date.now() * 0.003;
    }
    dummy.updateMatrix();
    this.mesh.setMatrixAt(g.slot, dummy.matrix);
  }

  update(dt, player) {
    const collectR = Math.max(player.pickupRadius, player.magnetRadius * 0.55);
    const pull = 12 + collectR * 0.35;
    let collectedXp = 0;
    let collectedGems = 0;

    for (const g of this.gems) {
      if (!g.alive) continue;
      const dx = player.position.x - g.x;
      const dz = player.position.z - g.z;
      const dist = Math.hypot(dx, dz);

      if (dist < collectR) {
        if (dist > 0.5) {
          g.x += (dx / dist) * pull * dt;
          g.z += (dz / dist) * pull * dt;
        }
      }

      if (dist < 1.2) {
        collectedXp += g.value;
        collectedGems++;
        this._retireGem(g);
      } else {
        this.updateInstance(g);
      }
    }
    this._compactDead();
    this.mesh.instanceMatrix.needsUpdate = true;
    return { xp: collectedXp, gems: collectedGems };
  }

  get aliveCount() {
    let n = 0;
    for (const g of this.gems) {
      if (g.alive) n++;
    }
    return n;
  }
}
