export interface DevFlags {
  dev: boolean;
  seed: number | null;
  biome: string | null;
  coins: number | null;
}

/** Parse dev URL flags: ?dev=1&seed=42&biome=frost&coins=500 */
export function parseDevFlags(): DevFlags {
  const params = new URLSearchParams(window.location.search);
  const dev = params.get('dev') === '1' || params.get('dev') === 'true';
  const seedRaw = params.get('seed');
  const seed = seedRaw != null && seedRaw !== '' ? Number(seedRaw) : null;
  const biome = params.get('biome') || null;
  const coinsRaw = params.get('coins');
  const coins = coinsRaw != null && coinsRaw !== '' ? Number(coinsRaw) : null;
  return {
    dev,
    seed: Number.isFinite(seed) ? seed : null,
    biome,
    coins: Number.isFinite(coins) ? coins : null,
  };
}
