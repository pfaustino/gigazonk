import * as THREE from 'three';
import { getEnemyHpBarWorldY } from './constants.js';
import { runRandom } from '../lib/runRandom.js';

const BURST_POOL_SIZE = 96;
const HP_BAR_THROTTLE_ENEMY_COUNT = 32;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    this._burstGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    this._burstPool = [];
    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(this._burstGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this._burstPool.push({ mesh, active: false });
    }

    this.dmgLayer = document.createElement('div');
    this.dmgLayer.id = 'damage-numbers';
    this.dmgLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:8;';
    document.getElementById('ui-layer')?.appendChild(this.dmgLayer);
    this.damageNumbers = [];

    this.hpBarLayer = document.createElement('div');
    this.hpBarLayer.id = 'enemy-hp-bars';
    this.hpBarLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:6;';
    document.getElementById('ui-layer')?.appendChild(this.hpBarLayer);
    this.enemyHpBars = new Map();
    this._hpVec = new THREE.Vector3();
    this._dmgVec = new THREE.Vector3();
    this._hpBarFrame = 0;
  }

  ensureOverlayLayers() {
    const layer = document.getElementById('ui-layer');
    if (!layer) return;
    if (this.dmgLayer && !this.dmgLayer.isConnected) layer.appendChild(this.dmgLayer);
    if (this.hpBarLayer && !this.hpBarLayer.isConnected) layer.appendChild(this.hpBarLayer);
  }

  reset() {
    for (const p of this.particles) {
      p.mesh.visible = false;
      p.active = false;
    }
    this.particles = [];
    this.damageNumbers = [];
    if (this.dmgLayer) this.dmgLayer.innerHTML = '';
    this.enemyHpBars.clear();
    if (this.hpBarLayer) this.hpBarLayer.innerHTML = '';
  }

  _acquireBurst(color) {
    for (const slot of this._burstPool) {
      if (!slot.active) {
        slot.active = true;
        slot.mesh.material.color.setHex(color);
        slot.mesh.material.opacity = 1;
        slot.mesh.visible = true;
        return slot;
      }
    }
    return null;
  }

  _releaseBurst(slot) {
    slot.active = false;
    slot.mesh.visible = false;
  }

  burst(x, z, color = 0xf7c948, count = 8) {
    for (let i = 0; i < count; i++) {
      const slot = this._acquireBurst(color);
      if (!slot) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + runRandom() * 4;
      slot.mesh.position.set(x, 1, z);
      this.particles.push({
        mesh: slot.mesh,
        pool: slot,
        vx: Math.cos(angle) * speed,
        vy: 2 + runRandom() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.5 + runRandom() * 0.3,
      });
    }
  }

  damageNumber(x, z, amount, isCrit = false) {
    this.floatingNumber(x, z, amount, isCrit ? 'crit' : 'hit');
  }

  floatingNumber(x, z, amount, kind = 'hit', y = 1.5) {
    let n;
    if (kind === 'hurt') {
      if (amount < 0.15) return;
      n = Math.max(1, Math.ceil(amount));
    } else {
      n = Math.round(amount);
      if (n < 1) return;
    }

    let text;
    let fontSize;
    let color;
    switch (kind) {
      case 'hurt':
        text = `-${n}`;
        fontSize = 18;
        color = '#ff5c5c';
        break;
      case 'heal':
        text = `+${n}`;
        fontSize = 18;
        color = '#4ade80';
        break;
      case 'crit':
        text = String(n);
        fontSize = 22;
        color = '#f7c948';
        break;
      default:
        text = String(n);
        fontSize = 16;
        color = '#fff';
        break;
    }

    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position:absolute;font-weight:800;font-size:${fontSize}px;
      color:${color};text-shadow:0 0 4px #000,1px 1px 0 #000;
      pointer-events:none;transition:none;
    `;
    this.dmgLayer.appendChild(el);
    this.damageNumbers.push({ el, x, z, y, life: 0.7, isCrit: kind === 'crit' });
  }

  updateEnemyHpBars(enemies, camera, renderer) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const vec = this._hpVec;
    const active = new Set();

    for (const e of enemies) {
      if (!e.alive || !e.hpBarVisible) continue;
      active.add(e);

      let bar = this.enemyHpBars.get(e);
      if (!bar) {
        const root = document.createElement('div');
        root.className = 'enemy-hp-bar';
        const fill = document.createElement('div');
        fill.className = 'enemy-hp-fill';
        root.appendChild(fill);
        this.hpBarLayer.appendChild(root);
        bar = { root, fill };
        this.enemyHpBars.set(e, bar);
      }

      const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
      bar.fill.style.width = `${pct * 100}%`;
      bar.root.classList.toggle('boss', !!e.isBoss);

      const barWidth = e.isBoss ? 56 : 36;
      const height = getEnemyHpBarWorldY(e);
      vec.set(e.x, height, e.z);
      vec.project(camera);

      if (vec.z > 1) {
        bar.root.style.display = 'none';
        continue;
      }

      const sx = (vec.x * 0.5 + 0.5) * rect.width;
      const sy = (-vec.y * 0.5 + 0.5) * rect.height;
      bar.root.style.display = '';
      bar.root.style.left = `${sx}px`;
      bar.root.style.top = `${sy}px`;
      bar.root.style.width = `${barWidth}px`;
    }

    for (const [enemy, bar] of this.enemyHpBars) {
      if (!active.has(enemy)) {
        bar.root.remove();
        this.enemyHpBars.delete(enemy);
      }
    }
  }

  update(dt, camera, renderer, enemies = []) {
    this.ensureOverlayLayers();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= 12 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = Math.max(0, p.life * 2);
      if (p.life <= 0) {
        this._releaseBurst(p.pool);
        this.particles.splice(i, 1);
      }
    }

    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const vec = this._dmgVec;

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.y += dt * 2;
      if (dn.life <= 0) {
        dn.el.remove();
        this.damageNumbers.splice(i, 1);
        continue;
      }
      vec.set(dn.x, dn.y, dn.z);
      vec.project(camera);
      const sx = (vec.x * 0.5 + 0.5) * rect.width;
      const sy = (-vec.y * 0.5 + 0.5) * rect.height;
      dn.el.style.left = `${sx}px`;
      dn.el.style.top = `${sy}px`;
      dn.el.style.opacity = Math.min(1, dn.life * 2);
      dn.el.style.transform = `translate(-50%,-50%) scale(${1 + (0.7 - dn.life) * 0.3})`;
    }

    this._hpBarFrame = (this._hpBarFrame + 1) % 2;
    const throttleHpBars = enemies.length > HP_BAR_THROTTLE_ENEMY_COUNT && this._hpBarFrame === 1;
    if (!throttleHpBars) {
      this.updateEnemyHpBars(enemies, camera, renderer);
    }
  }

  destroy() {
    this.reset();
    this._burstGeo.dispose();
    for (const slot of this._burstPool) {
      slot.mesh.material.dispose();
    }
    this.dmgLayer?.remove();
    this.hpBarLayer?.remove();
  }
}
