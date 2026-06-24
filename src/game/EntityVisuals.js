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
const _mouthPlane = new THREE.PlaneGeometry(1, 1);

let _enemyEyeTexture;
let _enemyMouthTexture;
let _enemyMouthMaterial;

export const ENEMY_MOUTH_COLS = 7;
export const ENEMY_MOUTH_ROWS = 5;

/** Lip palette columns in mouths.png (left → right). */
const MOUTH_COLUMN_HUES = [0, 28, 52, 118, 272, 318, 38];
const MOUTH_BEIGE_COLUMN = 6;

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

/** Mouth patch sits on the front of the blob — partially embedded, not a floating quad. */
const MOUTH_LAYOUT_TWEAKS = {
  brute: { yOff: -0.05, zOff: 0.05, widthMult: 1.1, heightMult: 1.05 },
  elite: { yOff: -0.07, zOff: 0.07, widthMult: 1.12, heightMult: 1.08 },
};

function getEnemyMouthLayout(type) {
  const eye = ENEMY_EYE_LAYOUTS[type] || ENEMY_EYE_LAYOUTS.grunt;
  const tweak = MOUTH_LAYOUT_TWEAKS[type] || {};
  const width = eye.baseSize * 7 * (tweak.widthMult ?? 1);
  const height = eye.baseSize * 4.2 * (tweak.heightMult ?? 1);
  return {
    y: eye.y - eye.baseSize * 3.2 + (tweak.yOff ?? 0),
    z: eye.z + eye.baseSize * 0.42 + (tweak.zOff ?? 0),
    width,
    height,
  };
}

function buildEnemyMouthPatchGeometry(type) {
  const layout = getEnemyMouthLayout(type);
  const g = _mouthPlane.clone();
  g.scale(layout.width, layout.height, 1);
  g.rotateX(-0.62);
  g.translate(0, layout.y, layout.z + layout.height * 0.04);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  colors.fill(1);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Body mesh + mouth texture patch (group 0 = tinted body, group 1 = sprite mouth). */
export function buildEnemyBodyWithMouthGeometry(type, instanceCount) {
  const bodyGeo = mergeParts(enemyBodyParts(type));
  const mouthGeo = buildEnemyMouthPatchGeometry(type);
  const combined = mergeGeometries([bodyGeo, mouthGeo], true);
  combined.computeVertexNormals();
  const mouthAttrs = attachEnemyMouthInstanceAttrs(combined, instanceCount);
  return { geometry: combined, mouthAttrs };
}

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

export function mouthColumnForColor(hex) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.s < 0.22) return MOUTH_BEIGE_COLUMN;

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < MOUTH_COLUMN_HUES.length; i++) {
    if (i === MOUTH_BEIGE_COLUMN) continue;
    let dh = Math.abs(hsl.h * 360 - MOUTH_COLUMN_HUES[i]);
    if (dh > 180) dh = 360 - dh;
    if (dh < bestDist) {
      bestDist = dh;
      best = i;
    }
  }
  return best;
}

/** Chewing loop — ping-pong rows 1–4; row 0 = scream when aggro. */
const MOUTH_CHEW_ROWS = [1, 2, 3, 4, 3, 2];
export const MOUTH_SCREAM_ROW = 0;

export function mouthFrameForTime(timeSec, slot = 0, chewFps = 10, { scream = false } = {}) {
  if (scream) return MOUTH_SCREAM_ROW;
  const step = Math.floor((timeSec + slot * 0.13) * chewFps);
  return MOUTH_CHEW_ROWS[((step % MOUTH_CHEW_ROWS.length) + MOUTH_CHEW_ROWS.length) % MOUTH_CHEW_ROWS.length];
}

function getEnemyMouthTexture() {
  if (_enemyMouthTexture) return _enemyMouthTexture;
  const loader = new THREE.TextureLoader();
  _enemyMouthTexture = loader.load(`${import.meta.env.BASE_URL}images/mouths.png`);
  _enemyMouthTexture.colorSpace = THREE.SRGBColorSpace;
  _enemyMouthTexture.format = THREE.RGBAFormat;
  _enemyMouthTexture.premultiplyAlpha = false;
  _enemyMouthTexture.magFilter = THREE.LinearFilter;
  _enemyMouthTexture.minFilter = THREE.LinearMipmapLinearFilter;
  _enemyMouthTexture.generateMipmaps = true;
  return _enemyMouthTexture;
}

export function attachEnemyMouthInstanceAttrs(geo, count) {
  const col = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const frame = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  geo.setAttribute('instanceMouthCol', col);
  geo.setAttribute('instanceMouthFrame', frame);
  return { col, frame };
}

export function createEnemyMouthMaterial() {
  if (_enemyMouthMaterial) return _enemyMouthMaterial;

  _enemyMouthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      mouthMap: { value: getEnemyMouthTexture() },
      gridSize: { value: new THREE.Vector2(ENEMY_MOUTH_COLS, ENEMY_MOUTH_ROWS) },
    },
    vertexShader: `
      attribute float instanceMouthCol;
      attribute float instanceMouthFrame;
      varying vec2 vMouthUv;
      varying vec2 vMouthCell;
      void main() {
        vMouthUv = uv;
        vMouthCell = vec2(instanceMouthCol, instanceMouthFrame);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D mouthMap;
      uniform vec2 gridSize;
      varying vec2 vMouthUv;
      varying vec2 vMouthCell;
      void main() {
        vec2 localUv = mix(vec2(0.1), vec2(0.9), vMouthUv);
        vec2 uv = vec2(
          (vMouthCell.x + localUv.x) / gridSize.x,
          1.0 - (vMouthCell.y + localUv.y) / gridSize.y
        );
        vec4 tex = texture2D(mouthMap, uv);
        if (tex.a < 0.55) discard;
        float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
        float sat = max(tex.r, max(tex.g, tex.b)) - min(tex.r, min(tex.g, tex.b));
        if (sat < 0.045 && lum > 0.82 && tex.a < 0.98) discard;
        gl_FragColor = vec4(tex.rgb, 1.0);
      }
    `,
    transparent: true,
    alphaTest: 0.55,
    side: THREE.DoubleSide,
    toneMapped: false,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return _enemyMouthMaterial;
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
