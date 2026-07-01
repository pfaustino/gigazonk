import * as THREE from 'three';
import { VILLAGE_SIZE, VILLAGE_NPCS, VILLAGE_LANDMARKS, VILLAGE_BUILDING_SLOTS, BIOMES, getBiomeRockColor } from './constants.js';
import { saveData } from './SaveData.js';
import { isInVillageClearZone } from './VillagePerks.js';
import {
  createGroundTexturedMaterial,
  createGrassField,
  createPathStrip,
  GROUND_TEXTURE_TILE_SIZE,
  loadGroundTextures,
  setMeshTerrainMaterial,
} from './TerrainVisuals.js';
import { GROUND_WALL_HEIGHT, resolveCircleAabb } from './TerrainFeatures.js';
import { ErrorReporter } from '../lib/ErrorReporter.js';

const GRASS_BIOME = BIOMES.find((b) => b.id === 'grass') ?? BIOMES[0];
const VILLAGE_PATH_WIDTH = 6;

/** Deterministic footprint from slot index — stable layout between visits. */
function buildingSizeForSlot(index) {
  const w = 3.2 + (index % 3) * 0.55;
  const h = 2.1 + (index % 4) * 0.45;
  return { w, h };
}

export class Village {
  constructor(scene) {
    this.scene = scene;
    this.halfSize = VILLAGE_SIZE / 2;
    this.npcs = [];
    this.obstacles = [];
    this.landmarkMeshes = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.build();
  }

  build() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.npcs = [];
    this.obstacles = [];
    this.landmarkMeshes = [];

    const rep = saveData.data.reputation;
    this._buildId = (this._buildId ?? 0) + 1;
    const buildId = this._buildId;

    const grassRepeat = VILLAGE_SIZE / GROUND_TEXTURE_TILE_SIZE;
    const grass = createGrassField(VILLAGE_SIZE, 24);
    this.group.add(grass);
    this.grassMesh = grass;

    const pathLength = VILLAGE_SIZE * 0.6;
    const path = createPathStrip(VILLAGE_PATH_WIDTH, pathLength);
    this.group.add(path);
    this.pathMesh = path;

    this._loadGroundTextures(buildId, grassRepeat, pathLength);

    const buildingCount = Math.min(
      VILLAGE_BUILDING_SLOTS.length,
      3 + Math.floor(rep / 20),
    );
    for (let i = 0; i < buildingCount; i++) {
      const [x, z] = VILLAGE_BUILDING_SLOTS[i];
      this.addBuilding(x, z, i);
    }

    for (const landmark of VILLAGE_LANDMARKS) {
      if (rep >= landmark.minRep) this.addLandmark(landmark);
    }

    for (const npc of VILLAGE_NPCS) {
      if ((npc.minRep ?? 0) <= rep) this.addNPC(npc);
    }

    this.addDecorations();
  }

  _loadGroundTextures(buildId, grassRepeat, pathLength) {
    loadGroundTextures()
      .then(([grassTex, dirtTex]) => {
        if (buildId !== this._buildId || !this.grassMesh || !this.pathMesh) return;

        setMeshTerrainMaterial(
          this.grassMesh,
          createGroundTexturedMaterial(grassTex, GRASS_BIOME.ground, grassRepeat, grassRepeat)
        );

        const pathRepeatX = VILLAGE_PATH_WIDTH / GROUND_TEXTURE_TILE_SIZE;
        const pathRepeatY = pathLength / GROUND_TEXTURE_TILE_SIZE;
        setMeshTerrainMaterial(
          this.pathMesh,
          createGroundTexturedMaterial(dirtTex, getBiomeRockColor(GRASS_BIOME), pathRepeatX, pathRepeatY)
        );
      })
      .catch((err) => ErrorReporter.capture('ASSET_LOAD', err, { asset: 'villageGroundTextures' }));
  }

  addLandmark(def) {
    const geo = new THREE.CylinderGeometry(0.8, 1.1, 3.5, 6);
    const mat = new THREE.MeshLambertMaterial({ color: def.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def.pos[0], 1.75, def.pos[2]);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.landmarkMeshes.push({ ...def, mesh });
    this.obstacles.push({
      type: 'circle',
      x: def.pos[0],
      z: def.pos[2],
      radius: 1.2,
      blockBelowY: 3.8,
    });
  }

  /** Rebuild props when reputation changes (call on village enter). */
  refreshForReputation() {
    this.build();
  }

  addBuilding(x, z, slotIndex = 0) {
    const { w, h } = buildingSizeForSlot(slotIndex);
    const geo = new THREE.BoxGeometry(w, h, w);
    const facadeHues = [0.02, 0.08, 0.12, 0.55, 0.72, 0.92];
    const hue = facadeHues[slotIndex % facadeHues.length];
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(hue, 0.42 + (slotIndex % 3) * 0.04, 0.62 + (slotIndex % 2) * 0.06),
      emissive: 0x222018,
      emissiveIntensity: 0.08,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    const roofGeo = new THREE.ConeGeometry(w * 0.7, 1.5, 4);
    const roofMat = new THREE.MeshLambertMaterial({
      color: 0xe08850,
      emissive: 0x402010,
      emissiveIntensity: 0.06,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, h + 0.75, z);
    roof.rotation.y = Math.PI / 4;
    this.group.add(roof);

    const half = w / 2 + 0.2;
    this.obstacles.push({
      type: 'aabb',
      minX: x - half,
      maxX: x + half,
      minZ: z - half,
      maxZ: z + half,
      blockBelowY: h + 1.6,
    });
  }

  addNPC(npcDef) {
    const geo = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
    const mat = new THREE.MeshLambertMaterial({ color: npcDef.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(npcDef.pos[0], 0.9, npcDef.pos[2]);
    mesh.castShadow = true;
    this.group.add(mesh);

    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: npcDef.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(npcDef.pos[0], 0.05, npcDef.pos[2]);
    ring.rotation.x = -Math.PI / 2;
    this.group.add(ring);

    this.npcs.push({ ...npcDef, mesh, ring });
  }

  addDecorations() {
    let placed = 0;
    let attempts = 0;
    while (placed < 15 && attempts < 100) {
      attempts++;
      const x = (Math.random() - 0.5) * VILLAGE_SIZE * 0.85;
      const z = (Math.random() - 0.5) * VILLAGE_SIZE * 0.85;
      if (isInVillageClearZone(x, z, 1.8)) continue;

      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 0.75, z);
      this.group.add(trunk);

      const leafGeo = new THREE.SphereGeometry(1.2, 6, 6);
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d6b2d });
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.set(x, 2.2, z);
      this.group.add(leaves);

      this.obstacles.push({
        type: 'circle',
        x,
        z,
        radius: 0.5,
        blockBelowY: 2.5,
      });
      placed++;
    }

    const portalGeo = new THREE.TorusGeometry(2, 0.2, 8, 24);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 2.5, 20);
    this.group.add(portal);
    this.portalMesh = portal;
  }

  update(dt, px = 0, pz = 0) {
    const time = Date.now() * 0.004;
    if (this.portalMesh) {
      this.portalMesh.rotation.y += dt;
      this.portalMesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
    }
    for (const npc of this.npcs) {
      const bob = Math.sin(Date.now() * 0.003 + npc.pos[0]) * 0.05;
      npc.mesh.position.y = 0.9 + bob;
      const inRange = Math.hypot(npc.pos[0] - px, npc.pos[2] - pz) < 3;
      if (inRange) {
        npc.mesh.rotation.x = Math.sin(time + npc.pos[0]) * 0.4;
        npc.mesh.rotation.z = Math.cos(time * 0.85 + npc.pos[2]) * 0.3;
        npc.mesh.rotation.y += dt * 2.5;
      } else {
        npc.mesh.rotation.x *= 0.82;
        npc.mesh.rotation.z *= 0.82;
        npc.mesh.rotation.y *= 0.92;
        if (Math.abs(npc.mesh.rotation.x) < 0.02) npc.mesh.rotation.x = 0;
        if (Math.abs(npc.mesh.rotation.z) < 0.02) npc.mesh.rotation.z = 0;
        if (Math.abs(npc.mesh.rotation.y) < 0.02) npc.mesh.rotation.y = 0;
      }
    }
  }

  getNearestNPC(px, pz) {
    let nearest = null;
    let minDist = Infinity;
    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.pos[0] - px, npc.pos[2] - pz);
      if (dist < 3 && dist < minDist) {
        minDist = dist;
        nearest = npc;
      }
    }
    return nearest;
  }

  getFriction(x) {
    // Village spawn hub — compacted path and settled grass.
    return Math.abs(x) < 3 ? 36 : 32;
  }

  getGroundHeight() {
    return 0;
  }

  resolveObstacleCollision(x, z, radius = 0.5, entityY = 0) {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 4; pass++) {
      for (const obs of this.obstacles) {
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
        }
      }
    }
    return { x: px, z: pz };
  }

  setVisible(v) {
    this.group.visible = v;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
