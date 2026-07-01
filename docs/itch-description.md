# itch.io page copy (source of truth)

Edit at https://itch.io/game/edit/852727 (manual paste — no metadata API).

## Short description

Megabonk chaos in 3D: chase golden burgers, gobble ghosts, risk Zonk Rifts, and grow Zonka Village between runs.

`npm run update:itch-description -- -Short` copies the short line only.

## Long description

`npm run update:itch-description` copies the body below and opens the edit page.

---

GigaZonk is a browser-based 3D horde survival roguelike. Fight endless waves, level up with wild random upgrades, and retreat to Zonka Village between runs to spend your hard-earned Zonk Coins on permanent power.

Inspired by bullet-heaven classics like Megabonk — but with mesas to climb, rifts to risk, citizens to rescue, golden burgers to devour, and a whole village that grows as you do.

### Survive the Arena

Drop into a sprawling procedural arena packed with walls, rocky mesas, and four rotating biomes: Zonk Meadows, Bonk Wastes, Frost Zonk, and Magma Pits. Enemies swarm in the hundreds. Your weapons fire automatically. Your job is to move, dodge, and not die.

- Auto-fire combat with projectiles, pierce, area effects, and elemental synergies
- Level-up drafts — pick from random upgrades every level (damage, speed, familiars, fire trails, and more)
- **Soul Orb familiars** — orbiting purple orbs that fire visible lightning bolts at the nearest foe on your attack cadence
- Combo meter — kill streaks boost your damage up to 2×
- Tri-Zonk Nova — combine Fire, Ice, and Lightning for a devastating periodic blast
- Passive XP magnet — gems drift toward you; loot and shrines boost pickup radius
- Dodge roll and jump — both grant brief invulnerability frames
- **Golden arena burger** — a massive burger spawns mid-run (follow the **yellow arrow**). Catch it, eat it, and enter **Gobble Mode**: grow huge, turn enemies into fleeing blue ghosts, chomp them for heals, and tear through the horde for 30 seconds
- Rescue citizens — orange beacons mark villagers trapped in the arena; press **F** to teleport them to safety for bonus coins and XP
- Guided tutorial — onboarding steps from the title screen through your first boss (press **H** anytime to bring hints back)

### Risk vs. Reward

- Zonk Rifts — purple portals spawn in the arena. Step inside for 2× XP… and 3× danger
- Zonk Lords — mini-bosses every few minutes, dropping chests
- Mesa guardians & treasure caches — climb plateaus for loot and brutal fights
- Ascension Shrines — sacrifice HP for permanent run buffs
- Day/night cycle — nights get darker and enemies hit harder

### Zonka Village (Meta Progression)

Between runs, explore a hub village:

- Talk to NPCs and complete quests (citizen rescues, burger feasts, gobble streaks, and more)
- Spend Zonk Coins on permanent upgrades at Coach Zonk's skill tree
- Unlock 4 playable characters with unique playstyles
- Grow village reputation — unlock landmarks, NPCs, and **arena perks** (longer Gobble Mode, faster burger respawns)
- Daily challenge — survive 3 minutes once per day for +50 Zonk Coins
- Achievements and run summary stats (kills, burgers eaten, gobbles, citizens saved)

### Characters

| 🦊 Zonka Fox | Fast, +1 projectile — your starter |
| --- | --- |
| ⚔️ Bonk Knight | Tanky, thorns, high damage |
| 🔮 Storm Witch | Lightning starter, bonus crit |
| 🐗 Rage Boar | Double combo bonus, lifesteal |

### Controls

| Key | Action |
| --- | --- |
| WASD / Arrows or Left stick | Move |
| Shift | Sprint |
| Q / LB | Dodge roll |
| Space / RT | Jump |
| F / X or A | Interact (chests, pots, shrines, NPCs, citizens) |
| Esc / Start | Pause / menu |
| Mouse or drag battlefield | Camera orbit (pinch to zoom on touch) |

### Mobile

Works on phones and tablets in **landscape**. Virtual stick and action buttons appear automatically; rotate from portrait if prompted. Buff and quest trackers have dedicated tabs on small screens.

### Hidden depths

Some veteran Zonkers swear there is a **secret developer playground** buried in the game — buff sandbox, time warps, cheat toggles — with no button on any menu. We did not put up a neon sign. Try poking at the title screen, the URL bar, or the keyboard if you are stubborn enough. If you stumble onto something suspiciously overpowered, you found it the hard way. (Keep it between us.)

### Play in Browser

No download required — runs entirely in your browser. Progress saves locally via `localStorage`.

**v0.2.3** — Early access. More biomes, bosses, and village content on the way.

_Built with Three.js + Vite. Whimsical vibes. Serious horde counts._
