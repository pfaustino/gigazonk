import * as THREE from 'three';

const BLAST_FX_MAX_ACTIVE = 20;
const BLAST_FX_GROW_SEC = 0.3;

const ELEMENT_BLAST_COLORS = {
  fire: 0xff6633,
  ice: 0x66ccff,
  lightning: 0xffee44,
  default: 0xf7c948,
};

/**
 * Expanding transparent spheres at projectile hits — shows current blast radius (player.area).
 */
export class BlastRadiusFx {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.active = [];
    this.pool = [];
    this._geo = new THREE.SphereGeometry(1, 18, 14);
  }

  spawn(x, y, z, radius, element = null) {
    if (this.active.length >= BLAST_FX_MAX_ACTIVE) return;

    let mesh = this.pool.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(
        this._geo,
        new THREE.MeshBasicMaterial({
          color: ELEMENT_BLAST_COLORS.default,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      this.group.add(mesh);
    }

    const color = ELEMENT_BLAST_COLORS[element] ?? ELEMENT_BLAST_COLORS.default;
    mesh.material.color.setHex(color);
    mesh.material.opacity = 0.34;
    mesh.visible = true;
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.04);
    this.active.push({
      mesh,
      radius: Math.max(0.35, radius),
      t: 0,
      duration: BLAST_FX_GROW_SEC,
    });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const blast = this.active[i];
      blast.t += dt;
      const u = blast.t / blast.duration;
      if (u >= 1) {
        blast.mesh.visible = false;
        this.pool.push(blast.mesh);
        this.active.splice(i, 1);
        continue;
      }

      const eased = 1 - (1 - u) ** 3;
      blast.mesh.scale.setScalar(blast.radius * eased);
      blast.mesh.material.opacity = 0.34 * (1 - u * 0.92);
    }
  }

  reset() {
    for (const blast of this.active) {
      blast.mesh.visible = false;
      this.pool.push(blast.mesh);
    }
    this.active = [];
  }

  dispose() {
    this.reset();
    this.group.removeFromParent();
    this._geo.dispose();
    for (const mesh of this.pool) {
      mesh.material.dispose();
    }
    this.pool = [];
  }
}
