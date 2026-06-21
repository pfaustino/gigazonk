import * as THREE from 'three';
import {
  ARENA_SIZE,
  ARENA_GROUND_SEGMENTS,
  ARENA_REFERENCE_SIZE,
  ARENA_ROCK_COUNT,
  ARENA_SPAWN_PAD_RADIUS,
  BIOMES,
} from './constants.js';
import {
  createGroundMaterial,
  createSpawnPad,
  paintBiomeGround,
  terrainTexScale,
} from './TerrainVisuals.js';
import {
  buildFeatureMeshes,
  generateArenaFeatures,
  resolveCircleAabb,
  sampleGroundHeight,
  tintFeatureMeshes,
} from './TerrainFeatures.js';

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.halfSize = ARENA_SIZE / 2;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.biome = BIOMES[0];
    this.dayNight = 0;
    this.maxClimb = 0.9;
    this.build();
  }

  build() {
    const hillFreq = 0.1 * (ARENA_REFERENCE_SIZE / ARENA_SIZE);
    this.groundGeo = new THREE.PlaneGeometry(
      ARENA_SIZE,
      ARENA_SIZE,
      ARENA_GROUND_SEGMENTS,
      ARENA_GROUND_SEGMENTS
    );
    const verts = this.groundGeo.attributes.position;
    for (let i = 0; i < verts.count; i++) {
      const x = verts.getX(i);
      const z = verts.getZ(i);
      verts.setY(i, Math.sin(x * hillFreq) * Math.cos(z * hillFreq) * 0.5);
    }
    this.groundGeo.computeVertexNormals();
    this.texScale = terrainTexScale();
    paintBiomeGround(this.groundGeo, this.biome, this.texScale);
    this.ground = new THREE.Mesh(this.groundGeo, createGroundMaterial());
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    this.spawnPad = createSpawnPad(ARENA_SPAWN_PAD_RADIUS, this.texScale);
    this.group.add(this.spawnPad);

    const features = generateArenaFeatures();
    this.mesas = features.mesas;
    this.featureMeshes = buildFeatureMeshes(this.group, features.featureMeshes, 0x666666);

    this.obstacles = [...features.obstacles];
    this.rocks = [];
    for (let i = 0; i < ARENA_ROCK_COUNT; i++) {
      const radius = 0.5 + Math.random() * 0.8;
      const rockGeo = new THREE.DodecahedronGeometry(radius, 0);
      const rockMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const rock = new THREE.Mesh(rockGeo, rockMat);

      let x;
      let z;
      for (let attempt = 0; attempt < 24; attempt++) {
        x = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
        z = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
        if (Math.hypot(x, z) > ARENA_SPAWN_PAD_RADIUS + radius + 1) break;
      }

      rock.position.set(x, radius * 0.55, z);
      rock.castShadow = true;
      this.group.add(rock);
      this.rocks.push(rock);
      this.obstacles.push({ type: 'circle', x, z, radius });
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
    paintBiomeGround(this.groundGeo, biome, this.texScale);
    this.groundGeo.attributes.color.needsUpdate = true;
    const rockColor = biome.id === 'frost' ? 0x99aabb : biome.id === 'volcanic' ? 0x443322 : 0x666666;
    for (const rock of this.rocks) {
      rock.material.color.setHex(rockColor);
    }
    tintFeatureMeshes(this.featureMeshes, rockColor);
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
    if (dist < ARENA_SPAWN_PAD_RADIUS) return Math.max(base, 34);
    const h = this.getGroundHeight(x, z);
    if (h > 0.5) return Math.max(base, 32);
    return base;
  }

  getGroundHeight(x, z) {
    return sampleGroundHeight(x, z, this.mesas);
  }

  canTraverse(fromX, fromZ, toX, toZ, jumping = false) {
    if (jumping) return true;
    const h0 = this.getGroundHeight(fromX, fromZ);
    const h1 = this.getGroundHeight(toX, toZ);
    if (h1 <= h0) return true;
    return h1 - h0 <= this.maxClimb;
  }

  resolveObstacleCollision(x, z, playerRadius = 0.5) {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 4; pass++) {
      for (const obs of this.obstacles) {
        if (obs.type === 'circle') {
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
        } else if (obs.type === 'aabb') {
          const resolved = resolveCircleAabb(px, pz, playerRadius, obs);
          px = resolved.x;
          pz = resolved.z;
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
