import * as THREE from 'three';
import { ARENA_SIZE, ARENA_REFERENCE_SIZE } from './constants.js';

const _c = new THREE.Color();
const _b = new THREE.Color();

/** Volcanic rock photo — walls & mesas. Served from /public/images. */
export const ROCK_TEXTURE_URL = '/images/pixabay-analogicus-volcanic-rock-3836723.jpg';
export const GRASS_TEXTURE_URL = '/images/pixabay-publicdomainpictures-grass-84622.jpg';
export const DIRT_TEXTURE_URL = '/images/pixabay-oleg_mit-soil-5342049.jpg';
/** World meters per texture tile on vertical rock surfaces. */
export const ROCK_TEXTURE_TILE_SIZE = 3.5;
/** World meters per texture tile on ground planes. */
export const GROUND_TEXTURE_TILE_SIZE = 28;

const _textureCache = new Map();

function terrainTexScale() {
  return ARENA_SIZE / ARENA_REFERENCE_SIZE;
}

export { terrainTexScale };

function loadCachedTexture(url) {
  let cache = _textureCache.get(url);
  if (!cache) {
    cache = { tex: null, promise: null };
    _textureCache.set(url, cache);
  }
  if (cache.tex) return Promise.resolve(cache.tex);
  if (!cache.promise) {
    cache.promise = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.anisotropy = 4;
          cache.tex = tex;
          resolve(tex);
        },
        undefined,
        reject
      );
    });
  }
  return cache.promise;
}

export function loadRockTexture() {
  return loadCachedTexture(ROCK_TEXTURE_URL);
}

export function loadGrassTexture() {
  return loadCachedTexture(GRASS_TEXTURE_URL);
}

export function loadDirtTexture() {
  return loadCachedTexture(DIRT_TEXTURE_URL);
}

export function loadGroundTextures() {
  return Promise.all([loadGrassTexture(), loadDirtTexture()]);
}

function createTiledLambertMaterial(texture, color, repeatX, repeatY, emissiveIntensity) {
  const map = texture.clone();
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(Math.max(0.25, repeatX), Math.max(0.25, repeatY));
  map.needsUpdate = true;
  return new THREE.MeshLambertMaterial({
    map,
    color,
    emissive: color,
    emissiveIntensity,
  });
}

export function createRockTexturedMaterial(texture, color, repeatX, repeatY) {
  return createTiledLambertMaterial(texture, color, repeatX, repeatY, 0.07);
}

export function createGroundTexturedMaterial(texture, color, repeatX, repeatY) {
  return createTiledLambertMaterial(texture, color, repeatX, repeatY, 0.05);
}

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
