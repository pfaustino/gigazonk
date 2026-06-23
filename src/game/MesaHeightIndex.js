/** Spatial index for mesa height queries (plateau + ramp AABBs). */
export class MesaHeightIndex {
  constructor(cellSize = 32) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  static cellKey(cx, cz) {
    return cx * 10000 + cz;
  }

  static boundsFor(mesa) {
    const hw = mesa.w / 2;
    const hd = mesa.d / 2;
    const rl = mesa.rampLen ?? 6;
    let minX = mesa.cx - hw;
    let maxX = mesa.cx + hw;
    let minZ = mesa.cz - hd;
    let maxZ = mesa.cz + hd;

    switch (mesa.rampSide) {
      case 'south':
        minZ -= rl;
        break;
      case 'north':
        maxZ += rl;
        break;
      case 'east':
        maxX += rl;
        break;
      case 'west':
        minX -= rl;
        break;
      default:
        break;
    }

    return { minX, maxX, minZ, maxZ };
  }

  rebuild(mesas) {
    for (const arr of this.grid.values()) {
      arr.length = 0;
    }

    const cs = this.cellSize;
    for (const mesa of mesas) {
      const b = MesaHeightIndex.boundsFor(mesa);
      const cx0 = Math.floor(b.minX / cs);
      const cx1 = Math.floor(b.maxX / cs);
      const cz0 = Math.floor(b.minZ / cs);
      const cz1 = Math.floor(b.maxZ / cs);
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cz = cz0; cz <= cz1; cz++) {
          const key = MesaHeightIndex.cellKey(cx, cz);
          let cell = this.grid.get(key);
          if (!cell) {
            cell = [];
            this.grid.set(key, cell);
          }
          cell.push(mesa);
        }
      }
    }
  }

  /** Mesas registered in the cell containing (x, z). */
  query(x, z) {
    const cs = this.cellSize;
    const key = MesaHeightIndex.cellKey(Math.floor(x / cs), Math.floor(z / cs));
    return this.grid.get(key) ?? [];
  }
}
