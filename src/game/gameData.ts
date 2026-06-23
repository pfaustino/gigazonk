import enemiesJson from '../../data/enemies.json';
import upgradesJson from '../../data/upgrades.json';

export interface EnemyTypeDef {
  hpHits: number;
  speed: number;
  damage: number;
  xp: number;
  color: number;
  scale: number;
  hpBarTop: number;
}

export interface RarityDef {
  id: string;
  label: string;
  weight: number;
  effectMult: number;
  color: string;
}

export interface UpgradeTemplate {
  id: string;
  name: string;
  icon: string;
  baseEffect: Record<string, number | string>;
  rarities: string[];
  integerEffect?: boolean;
  onceOnly?: boolean;
  fixedEffect?: boolean;
}

function parseHexColor(value: string): number {
  return parseInt(value.replace('#', ''), 16);
}

function parseEnemyTypes(
  raw: Record<string, Omit<EnemyTypeDef, 'color'> & { color: string }>,
): Record<string, EnemyTypeDef> {
  const out: Record<string, EnemyTypeDef> = {};
  for (const [id, def] of Object.entries(raw)) {
    out[id] = { ...def, color: parseHexColor(def.color) };
  }
  return out;
}

export const GRUNT_COLORS: number[] = enemiesJson.gruntColors.map(parseHexColor);
export const ENEMY_TYPES: Record<string, EnemyTypeDef> = parseEnemyTypes(enemiesJson.types);
export const RARITIES: Record<string, RarityDef> = upgradesJson.rarities as Record<string, RarityDef>;
export const UPGRADE_TEMPLATES: UpgradeTemplate[] = upgradesJson.templates as UpgradeTemplate[];
