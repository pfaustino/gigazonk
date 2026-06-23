/** One-off: export QUESTS/SKILL_TREE to JSON before moving to gameData. Run: npx vite-node scripts/export-meta-json.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { QUESTS } = await import('../src/game/constants.js');
const { SKILL_BRANCHES, SKILL_TREE } = await import('../src/game/SkillTree.js');

fs.writeFileSync(path.join(root, 'data/quests.json'), `${JSON.stringify(QUESTS, null, 2)}\n`);
fs.writeFileSync(
  path.join(root, 'data/skills.json'),
  `${JSON.stringify({ branches: SKILL_BRANCHES, tree: SKILL_TREE }, null, 2)}\n`,
);
console.log(`Exported ${QUESTS.length} quests, ${SKILL_TREE.length} skills`);
