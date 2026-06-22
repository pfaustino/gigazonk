import * as THREE from 'three';
import { ARENA_SIZE, ARENA_REFERENCE_SIZE } from './constants.js';

const _c = new THREE.Color();
const _b = new THREE.Color();

function terrainTexScale() {
  return ARENA_SIZE / ARENA_REFERENCE_SIZE;
}

export { terrainTexScale };

function lerpColors(colors, i, a, b, t) {
  _c.setHex(a);
  _b.setHex(b);
  _c.lerp(_b, t);
  colors[i * 3] = _c.r;
  colors[i * 3 + 1] = _c.g;
  colors[i * 3 + 2] = _c.b;
}

/** Cobblestone / packed earth — high-friction zones. */
export function paintPackedGround(geometry, texScale = 1) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i) * texScale;
    const z = geometry.attributes.position.getZ(i) * texScale;
    const brick = (Math.floor(x * 0.75) + Math.floor(z * 0.75)) % 2;
    const noise = Math.sin(x * 0.5) * Math.sin(z * 0.5) * 0.08;
    lerpColors(colors, i, brick ? 0x5e5448 : 0x4a4238, 0x6a6054, 0.5 + noise);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Meadow grass with patch variation. */
export function paintGrassGround(geometry, texScale = 1) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i) * texScale;
    const z = geometry.attributes.position.getZ(i) * texScale;
    const patch = Math.sin(x * 0.12) * Math.cos(z * 0.1) + Math.sin(x * 0.35 + z * 0.25);
    const t = (patch + 1) * 0.5;
    lerpColors(colors, i, 0x2f5c2a, 0x4a8a42, t);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function createGroundMaterial() {
  return new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
}

/** Lambert terrain with a touch of emissive so ground/mesas stay readable in shade. */
export function createTerrainLambertMaterial(color) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.14,
  });
}

/** @deprecated arena uses Lambert materials in Arena.js */
export function createSpawnPad(radius) {
  const geo = new THREE.CircleGeometry(radius, 32);
  const mesh = new THREE.Mesh(geo, createGroundMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  return mesh;
}

export function createPathStrip(width, length) {
  const geo = new THREE.PlaneGeometry(width, length, Math.ceil(width), Math.ceil(length * 0.15));
  paintPackedGround(geo);
  const mesh = new THREE.Mesh(geo, createGroundMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  mesh.receiveShadow = true;
  return mesh;
}

export function createGrassField(size, segments = 24) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  paintGrassGround(geo);
  const mesh = new THREE.Mesh(geo, createGroundMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
