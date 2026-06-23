/** Broadphase grid for arena obstacles (rocks, walls, mesa AABBs). */
export class ObstacleGrid {
  constructor(cellSize = 24) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  static cellKey(cx, cz) {
    return cx * 10000 + cz;
  }

  static boundsFor(obs) {
    if (obs.type === 'circle') {
      const r = obs.radius;
      return {
        minX: obs.x - r,
        maxX: obs.x + r,
        minZ: obs.z - r,
        maxZ: obs.z + r,
      };
    }
    return {
      minX: obs.minX,
      maxX: obs.maxX,
      minZ: obs.minZ,
      maxZ: obs.maxZ,
    };
  }

  rebuild(obstacles) {
    for (const arr of this.grid.values()) {
      arr.length = 0;
    }

    const cs = this.cellSize;
    for (const obs of obstacles) {
      const b = ObstacleGrid.boundsFor(obs);
      const cx0 = Math.floor(b.minX / cs);
      const cx1 = Math.floor(b.maxX / cs);
      const cz0 = Math.floor(b.minZ / cs);
      const cz1 = Math.floor(b.maxZ / cs);
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cz = cz0; cz <= cz1; cz++) {
          const key = ObstacleGrid.cellKey(cx, cz);
          let cell = this.grid.get(key);
          if (!cell) {
            cell = [];
            this.grid.set(key, cell);
          }
          cell.push(obs);
        }
      }
    }
  }

  /** Obstacles in cells overlapping the query circle (deduped). */
  query(x, z, radius) {
    const cs = this.cellSize;
    const cells = Math.ceil(radius / cs);
    const cx = Math.floor(x / cs);
    const cz = Math.floor(z / cs);
    const out = [];
    const seen = new Set();
    for (let dx = -cells; dx <= cells; dx++) {
      for (let dz = -cells; dz <= cells; dz++) {
        const cell = this.grid.get(ObstacleGrid.cellKey(cx + dx, cz + dz));
        if (!cell) continue;
        for (const obs of cell) {
          if (seen.has(obs)) continue;
          seen.add(obs);
          out.push(obs);
        }
      }
    }
    return out;
  }
}
