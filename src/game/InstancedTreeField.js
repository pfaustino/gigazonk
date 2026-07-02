import * as THREE from 'three';
import {
  ARENA_TREE_COUNT,
  ARENA_TREE_MAX_GROUND_Y,
  ARENA_TREE_MIN_RADIUS,
  ARENA_TREE_MAX_RADIUS,
} from './constants.js';
import { runRandom } from '../lib/runRandom.js';
import { sampleGroundHeight } from './TerrainFeatures.js';

const _dummy = new THREE.Object3D();

/** Meadow outer-ring trees — visual only, no collision. */
export function arenaTreesEnabledForBiome(biomeId) {
  return biomeId === 'grass';
}

export class InstancedTreeField {
  constructor(group, mesas, { trunkColor = 0x5c3a1e, foliageColor = 0x2d6b2d } = {}) {
    this.mesas = mesas;
    this.group = group;

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.4, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor });
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, ARENA_TREE_COUNT);
    this.trunkMesh.castShadow = false;
    this.trunkMesh.receiveShadow = false;
    this.trunkMesh.frustumCulled = true;

    const canopyGeo = new THREE.SphereGeometry(1.05, 6, 5);
    const canopyMat = new THREE.MeshLambertMaterial({ color: foliageColor });
    this.canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, ARENA_TREE_COUNT);
    this.canopyMesh.castShadow = false;
    this.canopyMesh.receiveShadow = false;
    this.canopyMesh.frustumCulled = true;

    group.add(this.trunkMesh);
    group.add(this.canopyMesh);

    this.placed = this._scatter();
    this.trunkMesh.count = this.placed;
    this.canopyMesh.count = this.placed;
  }

  setColors(trunkColor, foliageColor) {
    this.trunkMesh.material.color.setHex(trunkColor);
    this.canopyMesh.material.color.setHex(foliageColor);
  }

  _scatter() {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = ARENA_TREE_COUNT * 14;

    while (placed < ARENA_TREE_COUNT && attempts < maxAttempts) {
      attempts += 1;
      const angle = runRandom() * Math.PI * 2;
      const r =
        ARENA_TREE_MIN_RADIUS +
        Math.sqrt(runRandom()) * (ARENA_TREE_MAX_RADIUS - ARENA_TREE_MIN_RADIUS);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const groundY = sampleGroundHeight(x, z, this.mesas);
      if (groundY > ARENA_TREE_MAX_GROUND_Y) continue;

      const scale = 0.85 + runRandom() * 0.45;
      const rotY = runRandom() * Math.PI * 2;
      const trunkH = 1.4 * scale;

      _dummy.position.set(x, groundY + trunkH * 0.5, z);
      _dummy.rotation.set(0, rotY, 0);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      this.trunkMesh.setMatrixAt(placed, _dummy.matrix);

      _dummy.position.set(x, groundY + trunkH + 0.75 * scale, z);
      _dummy.updateMatrix();
      this.canopyMesh.setMatrixAt(placed, _dummy.matrix);

      placed += 1;
    }

    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.canopyMesh.instanceMatrix.needsUpdate = true;
    return placed;
  }

  dispose() {
    this.group.remove(this.trunkMesh);
    this.group.remove(this.canopyMesh);
    this.trunkMesh.geometry.dispose();
    this.canopyMesh.geometry.dispose();
    this.trunkMesh.material.dispose();
    this.canopyMesh.material.dispose();
  }
}
