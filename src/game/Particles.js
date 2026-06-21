import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    this.dmgLayer = document.createElement('div');
    this.dmgLayer.id = 'damage-numbers';
    this.dmgLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    document.getElementById('ui-layer')?.appendChild(this.dmgLayer);
    this.damageNumbers = [];

    this.hpBarLayer = document.createElement('div');
    this.hpBarLayer.id = 'enemy-hp-bars';
    this.hpBarLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:6;';
    document.getElementById('ui-layer')?.appendChild(this.hpBarLayer);
    this.enemyHpBars = new Map();
    this._hpVec = new THREE.Vector3();
  }

  ensureOverlayLayers() {
    const layer = document.getElementById('ui-layer');
    if (!layer) return;
    if (this.dmgLayer && !this.dmgLayer.isConnected) layer.appendChild(this.dmgLayer);
    if (this.hpBarLayer && !this.hpBarLayer.isConnected) layer.appendChild(this.hpBarLayer);
  }

  reset() {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      p.mesh.geometry?.dispose();
      p.mesh.material?.dispose();
    }
    this.particles = [];
    this.damageNumbers = [];
    if (this.dmgLayer) this.dmgLayer.innerHTML = '';
    this.enemyHpBars.clear();
    if (this.hpBarLayer) this.hpBarLayer.innerHTML = '';
  }

  burst(x, z, color = 0xf7c948, count = 8) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1, z);
      this.group.add(mesh);
      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  damageNumber(x, z, amount, isCrit = false) {
    const el = document.createElement('div');
    el.textContent = Math.round(amount);
    el.style.cssText = `
      position:absolute;font-weight:800;font-size:${isCrit ? 22 : 16}px;
      color:${isCrit ? '#f7c948' : '#fff'};text-shadow:0 0 4px #000,1px 1px 0 #000;
      pointer-events:none;transition:none;
    `;
    this.dmgLayer.appendChild(el);
    this.damageNumbers.push({ el, x, z, y: 1.5, life: 0.7, isCrit });
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
      const height = (e.isBoss ? 3.2 : 1.1) * e.scale + 0.5;
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
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const vec = new THREE.Vector3();

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

    this.updateEnemyHpBars(enemies, camera, renderer);
  }

  destroy() {
    this.reset();
    this.dmgLayer?.remove();
    this.hpBarLayer?.remove();
  }
}
