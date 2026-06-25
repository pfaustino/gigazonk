# GigaZonk

A browser-based 3D horde survival roguelike inspired by Megabonk — survive waves of enemies, auto-fire projectiles, level up with random upgrades, and return to Zonka Village between runs.

## Play

**Live demo:** [https://pfaustino.github.io/gigazonk/](https://pfaustino.github.io/gigazonk/)

**itch.io:** [https://pfaustino.itch.io/gigazonk](https://pfaustino.itch.io/gigazonk)

Pushes to `main` auto-deploy to GitHub Pages and itch.io via GitHub Actions. To publish Pages manually:

```bash
npm run deploy
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Shift | Sprint |
| Q | Dodge roll (brief invulnerability) |
| Space | Jump (brief invulnerability in the air) |
| F | Interact (chests, pots, NPCs, shrines) |
| Esc | Pause / Menu |

## Characters

| Character | Unlock | Specialty |
|-----------|--------|-----------|
| 🦊 Zonka Fox | Free | Fast, +1 projectile |
| ⚔️ Bonk Knight | Free | Tanky, thorns, high damage |
| 🔮 Storm Witch | 150 coins | Starts with lightning, +crit |
| 🐗 Rage Boar | 200 coins | Combo bonus ×2, lifesteal |

## Biomes

Each arena run randomizes the biome: Zonk Meadows, Bonk Wastes, Frost Zonk, or Magma Pits.

## Core Loop

1. **Title** → Enter Village or Quick Arena Run
2. **Village** → Talk to NPCs for quests, shop upgrades, enter the Arena Portal
3. **Arena** → Survive, kill enemies, collect XP gems, level up, complete quests
4. **Death** → Earn Zonk Coins, return to village with permanent upgrades

## Differentiators from Megabonk

| Feature | Description |
|---------|-------------|
| **Zonk Rifts** | Purple portals spawn every ~90s. Enter for 2× XP but much heavier spawns |
| **Tri-Zonk Nova** | Collect Fire + Ice + Lightning elements to unleash a massive AoE every 10s |
| **Ascension Shrines** | Sacrifice 15% HP for permanent run buffs (damage + attack speed) |
| **Combo Meter** | Kill streaks boost damage up to 2× |
| **XP Magnet** | Passive gem pull radius; upgrades and loot increase reach |
| **Village Growth** | Reputation unlocks more buildings in Zonka Village |
| **Day/Night Cycle** | Nights are darker and enemies hit harder |
| **Zonk Lords** | Mini-bosses spawn every 2 minutes |
| **Familiar Orbs** | Upgrade unlocks orbiting damage spheres |
| **Meta Shop** | Permanent upgrades bought with Zonk Coins between runs |
| **4 Playable Characters** | Unique stats, unlockables with coins |
| **4 Rotating Biomes** | Different arena visuals per run |
| **Dodge Roll** | Q to dodge with invincibility frames |
| **Lightning Chains** | Storm element jumps between enemies |
| **Recurring Bosses** | Zonk Lord every 2 minutes, drops a chest |
| **Procedural Audio** | Web Audio synth — no downloads needed |
| **Floating Damage Numbers** | Combat feedback with crit highlights |

## Performance

Enemies use **Three.js InstancedMesh** — supports up to **800 simultaneous enemies** with spatial hashing for collision. Designed to scale into late-game horde density.

## Tech

- Vite + Three.js
- No backend — save data in `localStorage`
