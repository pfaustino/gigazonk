import * as THREE from 'three';
import { getEnemyHpBarWorldY } from './constants.js';
import { runRandom } from '../lib/runRandom.js';

const BURST_POOL_SIZE = 96;
const TREASURE_POOL_SIZE = 40;
/** Match mesa cache chest width in Interactables.spawnMesaCache. */
const MESA_CHEST_W = 1.15;
const MESA_CHEST_H = 0.77;
/** Slightly larger than combat sparks — visible on mesa tops without blocking the screen. */
const TREASURE_CHUNK = 0.28;
const HP_BAR_THROTTLE_ENEMY_COUNT = 32;

/** Wait for burst particles to finish before loot reward UI (ms). */
export const POT_REWARD_UI_DELAY_MS = 1000;
export const CHEST_REWARD_UI_DELAY_MS = 1050;
export const MESA_REWARD_UI_DELAY_MS = 1350;

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

    this._treasureGeo = new THREE.BoxGeometry(TREASURE_CHUNK, TREASURE_CHUNK, TREASURE_CHUNK);
    this._treasurePool = [];
    for (let i = 0; i < TREASURE_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this._treasureGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 50;
      this.group.add(mesh);
      this._treasurePool.push({ mesh, active: false });
    }
    this._delayedBursts = [];

    this.dmgLayer = document.createElement('div');
    this.dmgLayer.id = 'damage-numbers';
    this.dmgLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:8;';
    document.getElementById('ui-layer')?.appendChild(this.dmgLayer);
    this.damageNumbers = [];

    this.hpBarLayer = document.createElement('div');
    this.hpBarLayer.id = 'enemy-hp-bars';
    this.hpBarLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:20;';
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
    // Keep combat overlays above HUD siblings (DOM order + z-index).
    if (this.hpBarLayer?.isConnected) layer.appendChild(this.hpBarLayer);
    if (this.dmgLayer?.isConnected) layer.appendChild(this.dmgLayer);
  }

  reset() {
    for (const p of this.particles) {
      if (p.treasure) this._releaseTreasure(p.pool);
      else this._releaseBurst(p.pool);
    }
    this.particles = [];
    this._delayedBursts = [];
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
    slot.mesh.scale.set(1, 1, 1);
  }

  _acquireTreasure(color) {
    for (const slot of this._treasurePool) {
      if (!slot.active) {
        slot.active = true;
        slot.mesh.material.color.setHex(color);
        slot.mesh.material.opacity = 1;
        slot.mesh.visible = true;
        slot.mesh.scale.set(1, 1, 1);
        return slot;
      }
    }
    return null;
  }

  _releaseTreasure(slot) {
    slot.active = false;
    slot.mesh.visible = false;
    slot.mesh.scale.set(1, 1, 1);
  }

  _spawnTreasureFountain(x, y, z, color, count, spreadMult = 1) {
    const spread = MESA_CHEST_W * 1.6 * spreadMult;
    const rise = MESA_CHEST_H * 2.2;
    for (let i = 0; i < count; i++) {
      const slot = this._acquireTreasure(color);
      if (!slot) break;
      const ox = (runRandom() - 0.5) * spread;
      const oz = (runRandom() - 0.5) * spread;
      slot.mesh.position.set(x + ox, y, z + oz);
      const s = 0.85 + runRandom() * 0.3;
      slot.mesh.scale.set(s, s, s);
      const angle = runRandom() * Math.PI * 2;
      const horiz = 1.2 + runRandom() * 2.5;
      this.particles.push({
        mesh: slot.mesh,
        pool: slot,
        treasure: true,
        vx: Math.cos(angle) * horiz,
        vy: 3 + runRandom() * rise * 0.4,
        vz: Math.sin(angle) * horiz,
        life: 0.75 + runRandom() * 0.35,
      });
    }
  }

  burst(x, z, color = 0xf7c948, count = 8, y = 1, scale = 1) {
    for (let i = 0; i < count; i++) {
      const slot = this._acquireBurst(color);
      if (!slot) break;

      const angle = (i / count) * Math.PI * 2 + runRandom() * 0.4;
      const speed = 3 + runRandom() * 4;
      slot.mesh.position.set(x, y, z);
      slot.mesh.scale.setScalar(scale);
      this.particles.push({
        mesh: slot.mesh,
        pool: slot,
        vx: Math.cos(angle) * speed,
        vy: 3 + runRandom() * 4,
        vz: Math.sin(angle) * speed,
        life: 0.55 + runRandom() * 0.35,
      });
    }
  }

  /** Mesa treasure fountain at world-space chest height. */
  treasureBurstAt(x, y, z) {
    this._spawnTreasureFountain(x, y, z, 0xffd700, 12);
    this._spawnTreasureFountain(x, y + 0.12, z, 0xff8844, 8, 0.9);
    this._delayedBursts.push(
      { t: 0.08, fn: () => { this._spawnTreasureFountain(x, y + 0.2, z, 0xffee88, 10, 1.05); } },
      { t: 0.16, fn: () => { this._spawnTreasureFountain(x, y + 0.3, z, 0xf7c948, 8, 1.15); } },
    );
  }

  /** Big multi-wave burst when the Zonk Lord falls. */
  bossDeathBurstAt(x, y, z) {
    this.burst(x, z, 0xff4466, 16, y, 1.85);
    this.burst(x, z, 0xf7c948, 14, y + 0.12, 1.65);
    this.burst(x, z, 0xff8844, 10, y + 0.06, 1.45);
    this._delayedBursts.push(
      { t: 0.07, fn: () => { this.burst(x, z, 0xffee88, 14, y + 0.22, 1.55); } },
      { t: 0.14, fn: () => { this.burst(x, z, 0x44ff88, 10, y + 0.1, 1.25); } },
      { t: 0.26, fn: () => { this.burst(x, z, 0xf7c948, 12, y + 0.32, 1.4); } },
      { t: 0.38, fn: () => { this.burst(x, z, 0xffffff, 8, y + 0.18, 1.1); } },
    );
  }

  /** Ground / boss chest pop — smaller spark burst when the lid opens. */
  chestBurstAt(x, y, z) {
    this.burst(x, z, 0xf7c948, 8, y, 1.35);
    this.burst(x, z, 0xff8844, 5, y + 0.08, 1.15);
    this._delayedBursts.push(
      { t: 0.06, fn: () => { this.burst(x, z, 0xffee88, 5, y + 0.12, 1.05); } },
    );
  }

  /** Pot smash — quick earthy shards + tiny loot glint. */
  potBurstAt(x, y, z) {
    this.burst(x, z, 0xcc8844, 6, y, 1.05);
    this.burst(x, z, 0xddaa66, 4, y + 0.04, 0.9);
    this.burst(x, z, 0xf7c948, 3, y + 0.08, 0.8);
  }

  _runDelayedBursts(dt) {
    for (let i = this._delayedBursts.length - 1; i >= 0; i--) {
      const job = this._delayedBursts[i];
      job.t -= dt;
      if (job.t <= 0) {
        job.fn();
        this._delayedBursts.splice(i, 1);
      }
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
    this._runDelayedBursts(dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= (p.treasure ? 7 : 12) * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = Math.max(0, p.life * 2);
      if (p.life <= 0) {
        if (p.treasure) this._releaseTreasure(p.pool);
        else this._releaseBurst(p.pool);
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
    this._treasureGeo.dispose();
    for (const slot of this._burstPool) {
      slot.mesh.material.dispose();
    }
    for (const slot of this._treasurePool) {
      slot.mesh.material.dispose();
    }
    this.dmgLayer?.remove();
    this.hpBarLayer?.remove();
  }
}
