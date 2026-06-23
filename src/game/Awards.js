import { RARITIES, UPGRADE_TEMPLATES } from './gameData.js';
import { formatOfferDesc } from './UpgradeText.js';
import { runRandom } from '../lib/runRandom.js';

export { RARITIES, UPGRADE_TEMPLATES, formatOfferDesc };

const FIXED_KEYS = new Set(['pierce', 'element', 'doubleJump', 'familiars', 'projectileCount', 'lightningChains']);

function scaleValue(key, value, mult, template) {
  if (template.fixedEffect && FIXED_KEYS.has(key)) return value;
  if (key === 'element') return value;
  if (key === 'pierce') return 1;
  if (key === 'lightningChains') return value;
  if (template.integerEffect && Number.isInteger(value)) {
    return Math.max(1, Math.ceil(value * mult));
  }
  if (Number.isInteger(value)) return Math.max(1, Math.round(value * mult));
  return value * mult;
}

export function scaleEffectForRarity(baseEffect, rarity, template) {
  const mult = RARITIES[rarity].effectMult;
  const effect = {};
  for (const [key, val] of Object.entries(baseEffect)) {
    effect[key] = scaleValue(key, val, mult, template);
  }
  return effect;
}

export function buildUpgradeOffer(template, rarity) {
  const effect = scaleEffectForRarity(template.baseEffect, rarity, template);
  return {
    templateId: template.id,
    id: `${template.id}:${rarity}`,
    name: template.name,
    icon: template.icon,
    rarity,
    effect,
    desc: formatOfferDesc(template, effect),
  };
}

export function getTemplateId(offer) {
  return offer.templateId || offer.id?.split(':')[0];
}

export function rollWeightedRarity(allowedRarities) {
  let total = 0;
  for (const r of allowedRarities) total += RARITIES[r].weight;
  let roll = runRandom() * total;
  for (const r of allowedRarities) {
    roll -= RARITIES[r].weight;
    if (roll <= 0) return r;
  }
  return allowedRarities[allowedRarities.length - 1];
}
