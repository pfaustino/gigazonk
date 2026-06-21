import * as THREE from 'three';

const _c = new THREE.Color();
const _b = new THREE.Color();

function lerpColors(colors, i, a, b, t) {
  _c.setHex(a);
  _b.setHex(b);
  _c.lerp(_b, t);
  colors[i * 3] = _c.r;
  colors[i * 3 + 1] = _c.g;
  colors[i * 3 + 2] = _c.b;
}

/** Cobblestone / packed earth — high-friction zones. */
export function paintPackedGround(geometry) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i);
    const z = geometry.attributes.position.getZ(i);
    const brick = (Math.floor(x * 0.75) + Math.floor(z * 0.75)) % 2;
    const noise = Math.sin(x * 0.5) * Math.sin(z * 0.5) * 0.08;
    lerpColors(colors, i, brick ? 0x5e5448 : 0x4a4238, 0x6a6054, 0.5 + noise);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Meadow grass with patch variation. */
export function paintGrassGround(geometry) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i);
    const z = geometry.attributes.position.getZ(i);
    const patch = Math.sin(x * 0.12) * Math.cos(z * 0.1) + Math.sin(x * 0.35 + z * 0.25);
    const t = (patch + 1) * 0.5;
    lerpColors(colors, i, 0x2f5c2a, 0x4a8a42, t);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Arena biome surfaces — color matches slipperiness feel. */
export function paintBiomeGround(geometry, biome) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i);
    const z = geometry.attributes.position.getZ(i);
    const n = Math.sin(x * 0.14) * Math.cos(z * 0.11) + Math.sin(x * 0.38 + z * 0.29) * 0.45;

    switch (biome.id) {
      case 'frost': {
        // Pale icy patches — visibly slick.
        const ice = (n + 1) * 0.5;
        lerpColors(colors, i, 0x4a6a88, 0xd8eeff, ice * 0.75);
        break;
      }
      case 'waste': {
        // Dry sand & cracked dirt — medium-high grip.
        const sand = (n + 1) * 0.5;
        lerpColors(colors, i, 0x7a6348, 0xb89a72, sand * 0.55);
        break;
      }
      case 'volcanic': {
        // Charred rock with magma veins — medium-low grip.
        const crack = Math.max(0, Math.sin(x * 0.09) * Math.sin(z * 0.09));
        lerpColors(colors, i, 0x2a1810, 0x6a2810, crack * 0.65 + (n + 1) * 0.1);
        break;
      }
      default: {
        // Lush meadow — good grip.
        const lush = (n + 1) * 0.5;
        lerpColors(colors, i, 0x3a5c32, 0x5a8a48, lush * 0.5);
        break;
      }
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function createGroundMaterial() {
  return new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
}

export function createSpawnPad(radius) {
  const geo = new THREE.CircleGeometry(radius, 64);
  paintPackedGround(geo);
  const mesh = new THREE.Mesh(geo, createGroundMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  mesh.receiveShadow = true;
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
