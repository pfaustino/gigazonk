import * as THREE from 'three';
import {
  ARENA_SIZE,
  ARENA_GROUND_SEGMENTS,
  ARENA_SPAWN_PAD_RADIUS,
  BIOMES,
  getBiomeOuterColor,
  getBiomeRockColor,
} from './constants.js';
import { ErrorReporter } from '../lib/ErrorReporter.js';
import { runRandomInt } from '../lib/runRandom.js';
import { createTerrainLambertMaterial, createGroundTexturedMaterial, GROUND_TEXTURE_TILE_SIZE, loadGroundTextures, loadRockTexture, terrainTexScale } from './TerrainVisuals.js';
import {
  applyRockTextureToFeatureMeshes,
  buildFeatureMeshes,
  generateArenaFeatures,
  GROUND_WALL_HEIGHT,
  resolveCircleAabb,
  sampleGroundHeight,
  tintFeatureMeshes,
} from './TerrainFeatures.js';
import { InstancedRockField } from './InstancedRockField.js';
import { ObstacleGrid } from './ObstacleGrid.js';
import { MesaHeightIndex } from './MesaHeightIndex.js';

function tintTerrainMaterial(material, color) {
  material.color.setHex(color);
  if (material.emissive) material.emissive.setHex(color);
}

function disposeMaterial(material) {
  if (!material) return;
  material.map?.dispose?.();
  material.dispose?.();
}

function setMeshTexturedMaterial(mesh, material) {
  disposeMaterial(mesh.material);
  mesh.material = material;
}

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
    this._applyTerrainColors(this.biome);
  }

  _applyTerrainColors(biome) {
    const rock = getBiomeRockColor(biome);
    const outer = getBiomeOuterColor(biome);
    if (!this.ground.material?.map) tintTerrainMaterial(this.ground.material, outer);
    if (!this.spawnPad.material?.map) tintTerrainMaterial(this.spawnPad.material, rock);
  }

  _groundTextureForBiome(biome) {
    return biome?.id === 'grass' ? this._grassTexture : this._dirtTexture;
  }

  _applyGroundTextures() {
    if (!this._grassTexture || !this._dirtTexture) return;

    const biome = this.biome;
    const groundTex = this._groundTextureForBiome(biome);
    const groundColor = biome?.id === 'grass' ? biome.ground : getBiomeOuterColor(biome);
    const groundRepeat = ARENA_SIZE / GROUND_TEXTURE_TILE_SIZE;

    setMeshTexturedMaterial(
      this.ground,
      createGroundTexturedMaterial(groundTex, groundColor, groundRepeat, groundRepeat)
    );

    const padDiameter = ARENA_SPAWN_PAD_RADIUS * 2;
    const padRepeat = padDiameter / GROUND_TEXTURE_TILE_SIZE;
    setMeshTexturedMaterial(
      this.spawnPad,
      createGroundTexturedMaterial(this._dirtTexture, getBiomeRockColor(biome), padRepeat, padRepeat)
    );
  }

  _loadTerrainTextures() {
    this._grassTexture = null;
    this._dirtTexture = null;
    loadGroundTextures()
      .then(([grassTex, dirtTex]) => {
        this._grassTexture = grassTex;
        this._dirtTexture = dirtTex;
        this._applyGroundTextures();
      })
      .catch((err) => ErrorReporter.capture('ASSET_LOAD', err, { asset: 'groundTextures' }));

    loadRockTexture()
      .then((texture) => {
        applyRockTextureToFeatureMeshes(this.featureMeshes, texture, getBiomeRockColor(this.biome));
      })
      .catch((err) => ErrorReporter.capture('ASSET_LOAD', err, { asset: 'rockTexture' }));
  }

  build() {
    this.groundGeo = new THREE.PlaneGeometry(
      ARENA_SIZE,
      ARENA_SIZE,
      ARENA_GROUND_SEGMENTS,
      ARENA_GROUND_SEGMENTS
    );
    if (this.groundGeo.getAttribute('color')) {
      this.groundGeo.deleteAttribute('color');
    }

    this.groundMat = createTerrainLambertMaterial(0x384858);
    this.ground = new THREE.Mesh(this.groundGeo, this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    const padGeo = new THREE.CircleGeometry(ARENA_SPAWN_PAD_RADIUS, 32);
    if (padGeo.getAttribute('color')) {
      padGeo.deleteAttribute('color');
    }
    this.spawnPadMat = createTerrainLambertMaterial(0x5e5448);
    this.spawnPad = new THREE.Mesh(padGeo, this.spawnPadMat);
    this.spawnPad.rotation.x = -Math.PI / 2;
    this.spawnPad.position.y = 0.04;
    this.spawnPad.receiveShadow = true;
    this.group.add(this.spawnPad);

    this.texScale = terrainTexScale();

    const features = generateArenaFeatures();
    this.mesas = features.mesas;
    this.mesaHeightIndex = new MesaHeightIndex(32);
    this.mesaHeightIndex.rebuild(this.mesas);
    this.featureMeshes = buildFeatureMeshes(this.group, features.featureMeshes, 0x666666);
    this._loadTerrainTextures();

    this.obstacles = [...features.obstacles];
    this.rockField = new InstancedRockField(this.group, this.mesas, getBiomeRockColor(this.biome));
    this.rocks = [];
    this.obstacles.push(...this.rockField.obstacles);

    const borderGeo = new THREE.RingGeometry(this.halfSize - 1, this.halfSize, 64);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    this.border = new THREE.Mesh(borderGeo, borderMat);
    this.border.rotation.x = -Math.PI / 2;
    this.border.position.y = 0.1;
    this.group.add(this.border);

    this.obstacleGrid = new ObstacleGrid(24);
    this.obstacleGrid.rebuild(this.obstacles);
  }

  setBiome(biome) {
    this.biome = biome;
    const rockColor = getBiomeRockColor(biome);
    this.rockField?.setRockColor(rockColor);
    tintFeatureMeshes(this.featureMeshes, rockColor);
    this._applyGroundTextures();
    this._applyTerrainColors(biome);
  }

  pickRandomBiome() {
    const biome = BIOMES[runRandomInt(BIOMES.length)];
    this.setBiome(biome);
    return biome;
  }

  update(dt, elapsed) {
    this.dayNight = (Math.sin(elapsed * 0.05) + 1) / 2;
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
    return sampleGroundHeight(x, z, this.mesas, this.mesaHeightIndex);
  }

  canTraverse(fromX, fromZ, toX, toZ, jumping = false) {
    if (jumping) return true;
    const h0 = this.getGroundHeight(fromX, fromZ);
    const h1 = this.getGroundHeight(toX, toZ);
    if (h1 <= h0) return true;
    return h1 - h0 <= this.maxClimb;
  }

  resolveObstacleCollision(x, z, radius = 0.5, entityY = 0) {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 4; pass++) {
      const nearby = this.obstacleGrid.query(px, pz, radius + 3);
      for (const obs of nearby) {
        if (obs.type === 'circle') {
          const blockY = obs.blockBelowY ?? obs.radius * 1.1 + 0.15;
          if (entityY >= blockY - 0.35) continue;
          const dx = px - obs.x;
          const dz = pz - obs.z;
          const dist = Math.hypot(dx, dz);
          const minDist = obs.radius + radius;
          if (dist >= minDist) continue;
          if (dist > 0.001) {
            const push = (minDist - dist) / dist;
            px += dx * push;
            pz += dz * push;
          } else {
            px += minDist;
          }
        } else if (obs.type === 'aabb') {
          if (entityY >= (obs.blockBelowY ?? GROUND_WALL_HEIGHT) - 0.35) continue;
          const resolved = resolveCircleAabb(px, pz, radius, obs);
          px = resolved.x;
          pz = resolved.z;
        } else if (obs.type === 'mesa_wall') {
          if (entityY >= obs.blockBelowY - 0.35) continue;
          const resolved = resolveCircleAabb(px, pz, radius, obs);
          px = resolved.x;
          pz = resolved.z;
        }
      }
    }
    return { x: px, z: pz };
  }

  isProjectileBlocked(x, z, radius, projectileY) {
    const nearby = this.obstacleGrid.query(x, z, radius + 2);
    for (const obs of nearby) {
      if (obs.type === 'circle') {
        const blockY = obs.blockBelowY ?? obs.radius * 1.1 + 0.15;
        if (projectileY >= blockY - 0.35) continue;
        if (Math.hypot(x - obs.x, z - obs.z) < obs.radius + radius) return true;
      } else if (obs.type === 'aabb' || obs.type === 'mesa_wall') {
        const blockY = obs.blockBelowY ?? GROUND_WALL_HEIGHT;
        if (projectileY >= blockY - 0.35) continue;
        const cx = THREE.MathUtils.clamp(x, obs.minX, obs.maxX);
        const cz = THREE.MathUtils.clamp(z, obs.minZ, obs.maxZ);
        if (Math.hypot(x - cx, z - cz) < radius) return true;
      }
    }
    return false;
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
