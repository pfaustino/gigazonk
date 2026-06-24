import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function paintSolid(geo, r, g, b) {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function part(geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, rgb = [1, 1, 1]) {
  const g = geo.clone();
  g.scale(sx, sy, sz);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return paintSolid(g, rgb[0], rgb[1], rgb[2]);
}

function mergeParts(parts) {
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

const _box = new THREE.BoxGeometry(1, 1, 1);
const _sphere = new THREE.SphereGeometry(1, 6, 5);
const _cone = new THREE.ConeGeometry(1, 1, 4);
const _cyl = new THREE.CylinderGeometry(1, 1, 1, 6);
const _eyeDisc = new THREE.CircleGeometry(1, 16);

let _enemyEyeTexture;

/** White sclera + black pupil — readable from the gameplay camera angle. */
function getEnemyEyeTexture() {
  if (_enemyEyeTexture) return _enemyEyeTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#101018';
  ctx.beginPath();
  ctx.arc(size * 0.52, size * 0.5, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  _enemyEyeTexture = new THREE.CanvasTexture(canvas);
  _enemyEyeTexture.colorSpace = THREE.SRGBColorSpace;
  _enemyEyeTexture.magFilter = THREE.LinearFilter;
  _enemyEyeTexture.minFilter = THREE.LinearFilter;
  return _enemyEyeTexture;
}

function partGeo(geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.clone();
  g.scale(sx, sy, sz);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export const ENEMY_EYE_STYLES = ['even', 'leftBig', 'rightBig', 'cyclops'];

/** Flat textured disc tilted toward the camera (top-down gameplay view). */
function eyeBall(x, y, z, size) {
  return partGeo(
    _eyeDisc,
    x,
    y + size * 0.08,
    z + size * 0.12,
    -0.72,
    0,
    0,
    size,
    size,
    1
  );
}

/** even = slight mismatch; leftBig/rightBig = one eye larger; cyclops = single centered eye. */
function titleEyes(y, z, spacing, baseSize, style = 'even') {
  switch (style) {
    case 'leftBig':
      return [
        eyeBall(-spacing, y, z, baseSize * 1.28),
        eyeBall(spacing, y, z, baseSize * 0.72),
      ];
    case 'rightBig':
      return [
        eyeBall(-spacing, y, z, baseSize * 0.72),
        eyeBall(spacing, y, z, baseSize * 1.28),
      ];
    case 'cyclops':
      return [eyeBall(0, y + baseSize * 0.04, z, baseSize * 1.32)];
    case 'even':
    default:
      return [
        eyeBall(-spacing, y, z, baseSize * 1.05),
        eyeBall(spacing, y, z, baseSize * 0.9),
      ];
  }
}

const ENEMY_EYE_LAYOUTS = {
  runner: { y: 0.76, z: 0.42, spacing: 0.075, baseSize: 0.06 },
  brute: { y: 1.1, z: 0.44, spacing: 0.14, baseSize: 0.09 },
  wisp: { y: 0.62, z: 0.36, spacing: 0.09, baseSize: 0.065 },
  elite: { y: 1.15, z: 0.4, spacing: 0.12, baseSize: 0.08 },
  frostling: { y: 0.58, z: 0.32, spacing: 0.08, baseSize: 0.06 },
  ember: { y: 0.72, z: 0.4, spacing: 0.07, baseSize: 0.055 },
  grunt: { y: 1.0, z: 0.38, spacing: 0.11, baseSize: 0.085 },
};

function enemyBodyParts(type) {
  switch (type) {
    case 'runner':
      return [
        part(_sphere, 0, 0.45, 0.05, 0, 0, 0, 0.28, 0.35, 0.4),
        part(_sphere, 0, 0.72, 0.18, 0, 0, 0, 0.22, 0.22, 0.22),
        part(_cone, 0, 0.35, -0.22, 0.6, 0, 0, 0.12, 0.35, 0.12),
        part(_box, -0.18, 0.2, 0.1, 0, 0, 0, 0.08, 0.08, 0.2),
        part(_box, 0.18, 0.2, 0.1, 0, 0, 0, 0.08, 0.08, 0.2),
      ];
    case 'brute':
      return [
        part(_box, 0, 0.55, 0, 0, 0, 0, 0.75, 0.85, 0.65),
        part(_sphere, 0, 1.05, 0, 0, 0, 0, 0.42, 0.42, 0.42),
        part(_box, -0.55, 0.75, 0, 0, 0, 0, 0.22, 0.22, 0.22),
        part(_box, 0.55, 0.75, 0, 0, 0, 0, 0.22, 0.22, 0.22),
        part(_cone, -0.2, 1.35, 0, 0, 0, 0.25, 0.12, 0.28, 0.12),
        part(_cone, 0.2, 1.35, 0, 0, 0, -0.25, 0.12, 0.28, 0.12),
      ];
    case 'wisp':
      return [
        part(_sphere, 0, 0.55, 0, 0, 0, 0, 0.35, 0.35, 0.35),
        part(_sphere, 0, 0.55, 0, 0, 0, 0, 0.55, 0.55, 0.55),
        part(_cone, 0, 0.2, 0, Math.PI, 0, 0, 0.2, 0.35, 0.2),
      ];
    case 'elite':
      return [
        part(_cyl, 0, 0.55, 0, 0, 0, 0, 0.45, 0.75, 0.45),
        part(_sphere, 0, 1.1, 0, 0, 0, 0, 0.38, 0.38, 0.38),
        part(_cone, 0, 1.55, 0, 0, 0, 0, 0.55, 0.35, 0.55),
        part(_cone, -0.28, 1.25, 0, 0, 0, 0.35, 0.14, 0.35, 0.14),
        part(_cone, 0.28, 1.25, 0, 0, 0, -0.35, 0.14, 0.35, 0.14),
        part(_box, -0.65, 0.65, 0, 0, 0, 0.3, 0.15, 0.45, 0.15),
        part(_box, 0.65, 0.65, 0, 0, 0, -0.3, 0.15, 0.45, 0.15),
      ];
    case 'frostling':
      return [
        part(_sphere, 0, 0.5, 0, 0, 0, 0, 0.32, 0.32, 0.32),
        part(_cone, 0, 0.15, 0, Math.PI, 0, 0, 0.18, 0.3, 0.18),
      ];
    case 'ember':
      return [
        part(_sphere, 0, 0.42, 0.05, 0, 0, 0, 0.26, 0.32, 0.38),
        part(_cone, 0, 0.35, -0.18, 0.5, 0, 0, 0.1, 0.3, 0.1),
      ];
    case 'grunt':
    default:
      return [
        part(_sphere, 0, 0.55, 0, 0, 0, 0, 0.42, 0.48, 0.42),
        part(_sphere, 0, 0.95, 0.05, 0, 0, 0, 0.3, 0.3, 0.3),
        part(_cone, -0.22, 1.1, 0, 0, 0, 0.35, 0.12, 0.3, 0.12),
        part(_cone, 0.22, 1.1, 0, 0, 0, -0.35, 0.12, 0.3, 0.12),
        part(_box, 0, 0.18, 0, 0, 0, 0, 0.5, 0.22, 0.4),
      ];
  }
}

export function buildEnemyBodyGeometry(type) {
  return mergeParts(enemyBodyParts(type));
}

export function buildEnemyEyeGeometry(type, eyeStyle = 'even') {
  const layout = ENEMY_EYE_LAYOUTS[type] || ENEMY_EYE_LAYOUTS.grunt;
  return mergeParts(titleEyes(layout.y, layout.z, layout.spacing, layout.baseSize, eyeStyle));
}

/** Body + eyes merged (legacy); eyes tint with body color — prefer split meshes in EnemyManager. */
export function buildEnemyGeometry(type, eyeStyle = 'even') {
  return mergeParts([
    ...enemyBodyParts(type),
    ...titleEyes(
      (ENEMY_EYE_LAYOUTS[type] || ENEMY_EYE_LAYOUTS.grunt).y,
      (ENEMY_EYE_LAYOUTS[type] || ENEMY_EYE_LAYOUTS.grunt).z,
      (ENEMY_EYE_LAYOUTS[type] || ENEMY_EYE_LAYOUTS.grunt).spacing,
      (ENEMY_EYE_LAYOUTS[type] || ENEMY_EYE_LAYOUTS.grunt).baseSize,
      eyeStyle
    ),
  ]);
}

export const ENEMY_MESH_CAPS = {
  grunt: 300,
  runner: 180,
  wisp: 130,
  brute: 60,
  elite: 30,
  frostling: 100,
  ember: 100,
};

export function enemyMeshKey(type, eyeStyle = 'even') {
  return `${type}:${eyeStyle}`;
}

export function createEnemyMaterial() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
}

/** Untinted textured discs — separate InstancedMesh from tinted body. */
export function createEnemyEyeMaterial() {
  return new THREE.MeshBasicMaterial({
    map: getEnemyEyeTexture(),
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: false,
    toneMapped: false,
  });
}

export function buildProjectileGeometry() {
  return mergeParts([
    part(_sphere, 0, 0, 0, 0, 0, 0, 0.22, 0.22, 0.55),
    part(_cone, 0, 0, 0.42, Math.PI / 2, 0, 0, 0.14, 0.35, 0.14),
    part(_sphere, 0, 0, -0.18, 0, 0, 0, 0.1, 0.1, 0.1),
  ]);
}

export function buildGemGeometry() {
  return mergeParts([
    part(new THREE.OctahedronGeometry(0.28, 0), 0, 0.3, 0),
    part(new THREE.OctahedronGeometry(0.14, 0), 0, 0.55, 0),
  ]);
}

const PLAYER_BLUEPRINTS = {
  fox: [
    { shape: 'sphere', pos: [0, 0.55, 0], scale: [0.42, 0.5, 0.42], role: 'body' },
    { shape: 'sphere', pos: [0, 0.95, 0.08], scale: [0.3, 0.28, 0.3], role: 'head' },
    { shape: 'cone', pos: [-0.18, 1.18, 0.02], rot: [0, 0, 0.35], scale: [0.1, 0.22, 0.1], role: 'accent' },
    { shape: 'cone', pos: [0.18, 1.18, 0.02], rot: [0, 0, -0.35], scale: [0.1, 0.22, 0.1], role: 'accent' },
    { shape: 'cone', pos: [0, 0.45, -0.32], rot: [0.5, 0, 0], scale: [0.16, 0.35, 0.16], role: 'accent' },
  ],
  knight: [
    { shape: 'box', pos: [0, 0.55, 0], scale: [0.55, 0.7, 0.4], role: 'body' },
    { shape: 'sphere', pos: [0, 1.05, 0], scale: [0.34, 0.34, 0.34], role: 'head' },
    { shape: 'box', pos: [-0.42, 0.75, 0], scale: [0.18, 0.18, 0.18], role: 'accent' },
    { shape: 'box', pos: [0.42, 0.75, 0], scale: [0.18, 0.18, 0.18], role: 'accent' },
    { shape: 'box', pos: [0.42, 0.45, 0.05], rot: [0, 0, -0.4], scale: [0.08, 0.55, 0.08], role: 'weapon' },
    { shape: 'box', pos: [0, 1.28, 0], scale: [0.38, 0.12, 0.38], role: 'accent' },
  ],
  mage: [
    { shape: 'cyl', pos: [0, 0.5, 0], scale: [0.38, 0.65, 0.38], role: 'body' },
    { shape: 'sphere', pos: [0, 0.95, 0], scale: [0.28, 0.28, 0.28], role: 'head' },
    { shape: 'cone', pos: [0, 1.35, 0], scale: [0.35, 0.45, 0.35], role: 'accent' },
    { shape: 'cyl', pos: [0.38, 0.45, 0], scale: [0.05, 0.75, 0.05], role: 'weapon' },
    { shape: 'sphere', pos: [0.38, 0.9, 0], scale: [0.12, 0.12, 0.12], role: 'glow', emissive: 0x66ccff },
  ],
  berserker: [
    { shape: 'box', pos: [0, 0.55, 0], scale: [0.62, 0.72, 0.5], role: 'body' },
    { shape: 'sphere', pos: [0, 1.05, 0.05], scale: [0.36, 0.34, 0.36], role: 'head' },
    { shape: 'cone', pos: [-0.2, 1.28, 0], rot: [0, 0, 0.25], scale: [0.12, 0.28, 0.12], role: 'accent' },
    { shape: 'cone', pos: [0.2, 1.28, 0], rot: [0, 0, -0.25], scale: [0.12, 0.28, 0.12], role: 'accent' },
    { shape: 'cone', pos: [-0.12, 0.92, 0.22], rot: [0.8, 0, 0], scale: [0.06, 0.18, 0.06], role: 'accent' },
    { shape: 'cone', pos: [0.12, 0.92, 0.22], rot: [0.8, 0, 0], scale: [0.06, 0.18, 0.06], role: 'accent' },
  ],
};

function makePrimitive(shape) {
  switch (shape) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere': return new THREE.SphereGeometry(1, 6, 5);
    case 'cone': return new THREE.ConeGeometry(1, 1, 5);
    case 'cyl': return new THREE.CylinderGeometry(1, 1, 1, 6);
    default: return new THREE.SphereGeometry(1, 6, 5);
  }
}

export function buildPlayerVisual(characterId, color) {
  const group = new THREE.Group();
  const blueprint = PLAYER_BLUEPRINTS[characterId] || PLAYER_BLUEPRINTS.fox;
  const parts = [];

  for (const spec of blueprint) {
    const geo = makePrimitive(spec.shape);
    const mat = new THREE.MeshLambertMaterial({
      color: spec.role === 'glow' ? (spec.emissive || color) : color,
      emissive: spec.role === 'glow' ? (spec.emissive || color) : 0x000000,
      emissiveIntensity: spec.role === 'glow' ? 0.6 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...spec.pos);
    if (spec.rot) mesh.rotation.set(...spec.rot);
    mesh.scale.set(...spec.scale);
    mesh.castShadow = true;
    mesh.userData.role = spec.role;
    group.add(mesh);
    parts.push(mesh);
  }

  return { group, parts };
}

export function tintPlayerVisual(parts, color, characterId) {
  const blueprint = PLAYER_BLUEPRINTS[characterId] || PLAYER_BLUEPRINTS.fox;
  for (let i = 0; i < parts.length; i++) {
    const spec = blueprint[i];
    const mesh = parts[i];
    if (spec.role === 'glow') {
      mesh.material.color.setHex(spec.emissive || color);
      mesh.material.emissive.setHex(spec.emissive || color);
    } else {
      mesh.material.color.setHex(color);
    }
  }
}
