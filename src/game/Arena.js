import * as THREE from 'three';
import { ARENA_SIZE, BIOMES } from './constants.js';
import {
  createGroundMaterial,
  createSpawnPad,
  paintBiomeGround,
} from './TerrainVisuals.js';

const SPAWN_PAD_RADIUS = 22;

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.halfSize = ARENA_SIZE / 2;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.biome = BIOMES[0];
    this.dayNight = 0;
    this.build();
  }

  build() {
    this.groundGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE, 40, 40);
    const verts = this.groundGeo.attributes.position;
    for (let i = 0; i < verts.count; i++) {
      const x = verts.getX(i);
      const z = verts.getZ(i);
      verts.setY(i, Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5);
    }
    this.groundGeo.computeVertexNormals();
    paintBiomeGround(this.groundGeo, this.biome);
    this.ground = new THREE.Mesh(this.groundGeo, createGroundMaterial());
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    this.spawnPad = createSpawnPad(SPAWN_PAD_RADIUS);
    this.group.add(this.spawnPad);

    this.obstacles = [];
    this.rocks = [];
    for (let i = 0; i < 20; i++) {
      const radius = 0.5 + Math.random() * 0.8;
      const rockGeo = new THREE.DodecahedronGeometry(radius, 0);
      const rockMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const rock = new THREE.Mesh(rockGeo, rockMat);

      let x;
      let z;
      for (let attempt = 0; attempt < 24; attempt++) {
        x = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
        z = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
        if (Math.hypot(x, z) > SPAWN_PAD_RADIUS + radius + 1) break;
      }

      rock.position.set(x, radius * 0.55, z);
      rock.castShadow = true;
      this.group.add(rock);
      this.rocks.push(rock);
      this.obstacles.push({ x, z, radius });
    }

    const borderGeo = new THREE.RingGeometry(this.halfSize - 1, this.halfSize, 64);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    this.border = new THREE.Mesh(borderGeo, borderMat);
    this.border.rotation.x = -Math.PI / 2;
    this.border.position.y = 0.1;
    this.group.add(this.border);
  }

  setBiome(biome) {
    this.biome = biome;
    paintBiomeGround(this.groundGeo, biome);
    this.groundGeo.attributes.color.needsUpdate = true;
    const rockColor = biome.id === 'frost' ? 0x99aabb : biome.id === 'volcanic' ? 0x443322 : 0x666666;
    for (const rock of this.rocks) {
      rock.material.color.setHex(rockColor);
    }
  }

  pickRandomBiome() {
    const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    this.setBiome(biome);
    return biome;
  }

  update(dt, elapsed) {
    this.dayNight = (Math.sin(elapsed * 0.05) + 1) / 2;
    const nightFactor = (1 - this.dayNight) * 0.45;
    const tint = new THREE.Color(0xffffff).lerp(new THREE.Color(this.biome.fog), nightFactor);
    this.ground.material.color.copy(tint);
    this.spawnPad.material.color.copy(tint);
  }

  getNightFactor() {
    return 1 - this.dayNight;
  }

  getFriction(x = 0, z = 0) {
    const base = this.biome.friction ?? 26;
    const dist = Math.hypot(x, z);
    if (dist < SPAWN_PAD_RADIUS) return Math.max(base, 34);
    return base;
  }

  resolveObstacleCollision(x, z, playerRadius = 0.5) {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 3; pass++) {
      for (const obs of this.obstacles) {
        const dx = px - obs.x;
        const dz = pz - obs.z;
        const dist = Math.hypot(dx, dz);
        const minDist = obs.radius + playerRadius;
        if (dist >= minDist) continue;
        if (dist > 0.001) {
          const push = (minDist - dist) / dist;
          px += dx * push;
          pz += dz * push;
        } else {
          px += minDist;
        }
      }
    }
    return { x: px, z: pz };
  }

  getWave(elapsed) {
    return Math.floor(elapsed / 60) + 1;
  }

  setVisible(v) {
    this.group.visible = v;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
