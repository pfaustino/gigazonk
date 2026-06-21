import * as THREE from 'three';
import { VILLAGE_SIZE, VILLAGE_NPCS } from './constants.js';
import { saveData } from './SaveData.js';
import { createGrassField, createPathStrip } from './TerrainVisuals.js';

export class Village {
  constructor(scene) {
    this.scene = scene;
    this.halfSize = VILLAGE_SIZE / 2;
    this.npcs = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.build();
  }

  build() {
    const grass = createGrassField(VILLAGE_SIZE, 24);
    this.group.add(grass);
    this.grassMesh = grass;

    const path = createPathStrip(6, VILLAGE_SIZE * 0.6);
    this.group.add(path);
    this.pathMesh = path;

    const rep = saveData.data.reputation;
    const buildingCount = 3 + Math.floor(rep / 20);
    for (let i = 0; i < buildingCount; i++) {
      this.addBuilding(
        (Math.random() - 0.5) * VILLAGE_SIZE * 0.6,
        (Math.random() - 0.5) * VILLAGE_SIZE * 0.6
      );
    }

    for (const npc of VILLAGE_NPCS) {
      this.addNPC(npc);
    }

    this.addDecorations();
  }

  addBuilding(x, z) {
    const w = 3 + Math.random() * 2;
    const h = 2 + Math.random() * 2;
    const geo = new THREE.BoxGeometry(w, h, w);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.08, 0.3, 0.3 + Math.random() * 0.2)
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    this.group.add(mesh);

    const roofGeo = new THREE.ConeGeometry(w * 0.7, 1.5, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, h + 0.75, z);
    roof.rotation.y = Math.PI / 4;
    this.group.add(roof);
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
    for (let i = 0; i < 15; i++) {
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      const x = (Math.random() - 0.5) * VILLAGE_SIZE * 0.85;
      const z = (Math.random() - 0.5) * VILLAGE_SIZE * 0.85;
      trunk.position.set(x, 0.75, z);
      this.group.add(trunk);

      const leafGeo = new THREE.SphereGeometry(1.2, 6, 6);
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d6b2d });
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.set(x, 2.2, z);
      this.group.add(leaves);
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

  setVisible(v) {
    this.group.visible = v;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
