import * as THREE from 'three';
import {
  ARENA_ROCK_COUNT,
  ARENA_ROCK_MAX_RADIUS,
  ARENA_ROCK_MIN_RADIUS,
} from './constants.js';
import { createTerrainLambertMaterial } from './TerrainVisuals.js';
import { sampleGroundHeight } from './TerrainFeatures.js';

const _dummy = new THREE.Object3D();

/**
 * Instanced scatter rocks for arena performance (replaces per-rock Mesh).
 */
export class InstancedRockField {
  constructor(group, mesas, rockColor = 0x6a6054) {
    this.group = group;
    this.mesas = mesas;
    this.obstacles = [];
    this.instances = [];

    const smallGeo = new THREE.DodecahedronGeometry(1, 0);
    const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
    this.smallMat = createTerrainLambertMaterial(rockColor);
    this.boulderMat = createTerrainLambertMaterial(rockColor);

    const smallCount = Math.floor(ARENA_ROCK_COUNT * 0.8);
    const boulderCount = ARENA_ROCK_COUNT - smallCount;

    this.smallMesh = new THREE.InstancedMesh(smallGeo, this.smallMat, smallCount);
    this.boulderMesh = new THREE.InstancedMesh(boulderGeo, this.boulderMat, boulderCount);
    this.smallMesh.castShadow = true;
    this.smallMesh.receiveShadow = true;
    this.boulderMesh.castShadow = true;
    this.boulderMesh.receiveShadow = true;
    this.group.add(this.smallMesh, this.boulderMesh);

    this._scatter(smallCount, boulderCount);
  }

  _scatter(smallCount, _boulderCount) {
    const minR = ARENA_ROCK_MIN_RADIUS;
    const maxR = ARENA_ROCK_MAX_RADIUS;
    const minR2 = minR * minR;
    const maxR2 = maxR * maxR;
    let si = 0;
    let bi = 0;

    for (let i = 0; i < ARENA_ROCK_COUNT; i++) {
      const isBoulder = i >= smallCount;
      const radius = isBoulder ? 2.0 + Math.random() * 2.8 : 0.5 + Math.random() * 0.8;
      const scaleXZ = 0.85 + Math.random() * 0.3;
      const scaleY = 0.75 + Math.random() * 0.35;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(minR2 + Math.random() * (maxR2 - minR2));
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const groundY = sampleGroundHeight(x, z, this.mesas);
      const y = groundY + radius * scaleY * 0.5;

      _dummy.position.set(x, y, z);
      _dummy.rotation.set(
        (Math.random() - 0.5) * 0.35,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.35
      );
      _dummy.scale.set(radius * scaleXZ, radius * scaleY, radius * scaleXZ);
      _dummy.updateMatrix();

      if (isBoulder) {
        this.boulderMesh.setMatrixAt(bi, _dummy.matrix);
        bi++;
      } else {
        this.smallMesh.setMatrixAt(si, _dummy.matrix);
        si++;
      }

      const collisionRadius = radius * scaleXZ;
      this.obstacles.push({
        type: 'circle',
        x,
        z,
        radius: collisionRadius,
        blockBelowY: y + radius * scaleY,
      });
    }

    this.smallMesh.count = si;
    this.boulderMesh.count = bi;
    this.smallMesh.instanceMatrix.needsUpdate = true;
    this.boulderMesh.instanceMatrix.needsUpdate = true;
  }

  setRockColor(color) {
    this.smallMat.color.setHex(color);
    this.boulderMat.color.setHex(color);
  }

  dispose() {
    this.smallMesh.geometry.dispose();
    this.boulderMesh.geometry.dispose();
    this.smallMat.dispose();
    this.boulderMat.dispose();
    this.group.remove(this.smallMesh, this.boulderMesh);
  }
}
