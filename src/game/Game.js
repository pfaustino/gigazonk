import * as THREE from 'three';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { EnemyManager } from './EnemyManager.js';
import { ProjectileManager } from './ProjectileManager.js';
import { GemManager } from './GemManager.js';
import { Interactables } from './Interactables.js';
import { QuestSystem } from './QuestSystem.js';
import { UpgradeSystem, SYNERGY_NAME, getUpgradePreview } from './UpgradeSystem.js';
import { UI } from './UI.js';
import { Village } from './Village.js';
import { Arena } from './Arena.js';
import { FamiliarManager, RiftManager, SynergyNova, FireTrailManager } from './Effects.js';
import { Audio } from './Audio.js';
import { ParticleSystem } from './Particles.js';
import { saveData } from './SaveData.js';
import { ARENA_SIZE, ARENA_INTERACTABLE_COUNT, BIOMES, GIGA_SPAWN_INTERVAL, ARENA_FOG_NEAR, ARENA_FOG_FAR, VILLAGE_FOG_NEAR, VILLAGE_FOG_FAR, PLAYER_BASE } from './constants.js';
import { getDifficultyFromId } from './settings.js';
import { CameraController } from './CameraController.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.cameraController = new CameraController();
    this.ui = new UI();
    this.audio = new Audio();
    this.ui.setAudio(this.audio);
    this.quests = new QuestSystem();
    this.upgrades = new UpgradeSystem();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1030);
    this.scene.fog = new THREE.Fog(0x1a1030, VILLAGE_FOG_NEAR, VILLAGE_FOG_FAR);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2500);
    this.camera.position.set(0, 25, 20);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();

    this.player = new Player(this.scene);
    this.enemies = new EnemyManager(this.scene);
    this.projectiles = new ProjectileManager(this.scene);
    this.gems = new GemManager(this.scene);
    this.interactables = new Interactables(this.scene);
    this.familiars = new FamiliarManager(this.scene);
    this.fireTrail = new FireTrailManager(this.scene);
    this.rifts = new RiftManager(this.scene);
    this.synergy = new SynergyNova(this.scene);
    this.particles = new ParticleSystem(this.scene);

    this.player._onDodge = () => this.audio.dodge();
    this.player._onJump = () => this.audio.dodge();
    this.player._onMagnet = () => this.audio.magnet();
    this.player._onHurt = () => this.audio.hurt();

    this.village = new Village(this.scene);
    this.arena = new Arena(this.scene);

    this.state = 'title';
    this.elapsed = 0;
    this.paused = false;
    this.modalPause = false;
    this.menuPause = false;
    this.inRift = false;
    this.bossTimer = 0;
    this.bossCount = 0;
    this.gigaSpawnTimer = 0;
    this.pendingGigaSpawn = false;
    this.gigaSpawnSurvivalTimer = 0;
    this.runCoins = 0;
    this.coinsAlreadyBanked = 0;
    this.currentBiome = null;
    this.pendingAction = null;

    canvas.addEventListener('click', () => this.audio.resume());

    window.addEventListener('resize', () => this.onResize());
    this.ui.showTitle((action) => this.handleTitleAction(action));
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.audio.applySettings(saveData.data.settings);
    this.cameraController.applySettings(saveData.data.settings);
    this.animate();
  }

  setShadowFrustum(halfExtent) {
    const cam = this.sunLight.shadow.camera;
    cam.left = -halfExtent;
    cam.right = halfExtent;
    cam.top = halfExtent;
    cam.bottom = -halfExtent;
    cam.far = halfExtent * 2.5;
    cam.updateProjectionMatrix();
  }

  applyArenaFog() {
    this.scene.fog.near = ARENA_FOG_NEAR;
    this.scene.fog.far = ARENA_FOG_FAR;
    this.setShadowFrustum(ARENA_SIZE * 0.55);
  }

  applyVillageFog() {
    this.scene.fog.near = VILLAGE_FOG_NEAR;
    this.scene.fog.far = VILLAGE_FOG_FAR;
    this.setShadowFrustum(120);
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1);
    this.sunLight.position.set(20, 40, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -120;
    this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 120;
    this.sunLight.shadow.camera.bottom = -120;
    this.scene.add(this.sunLight);
  }

  handleTitleAction(action) {
    this.audio.resume();
    this.pendingAction = action;
    this.ui.removeScreens();
    this.ui.showCharacterSelect(
      () => {
        this.ui.removeScreens();
        if (this.pendingAction === 'village') this.enterVillage();
        else this.startArena();
      },
      () => {
        this.ui.removeScreens();
        this.ui.showTitle((a) => this.handleTitleAction(a));
      }
    );
  }

  enterVillage() {
    saveData.data.runSnapshot = null;
    saveData.save();
    this.state = 'village';
    this.village.setVisible(true);
    this.arena.setVisible(false);
    this.applyVillageFog();
    this.hideCombat();
    this.player.characterId = saveData.data.selectedCharacter;
    this.player.reset();
    this.player.position.set(0, 0, 5);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    this.cameraController.apply(this.camera, this.player.position, this.player.getViewY());
    this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
    this.quests.assignNewQuests();
  }

  startArena() {
    saveData.data.runSnapshot = null;
    this.state = 'arena';
    this.village.setVisible(false);
    this.arena.setVisible(true);
    this.applyArenaFog();
    this.resetRun();
    this.ui.clear();
    this.ui.buildHUD();
    this.currentBiome = this.arena.pickRandomBiome();
    this.scene.fog.color.setHex(this.currentBiome.fog);
    this.scene.background.setHex(this.currentBiome.fog);
    this.interactables.scatterField(ARENA_SIZE, ARENA_INTERACTABLE_COUNT, this.arena);
    this.interactables.spawnVillagePortal(0, 0);
    this.player.position.set(0, 0, 0);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    saveData.data.totalRuns++;
    saveData.save();
    this.ui.toast(`Entering ${this.currentBiome.name}`, 'synergy');
  }

  resetRun() {
    this.elapsed = 0;
    this.paused = false;
    this.modalPause = false;
    this.menuPause = false;
    this.inRift = false;
    this.bossTimer = 0;
    this.bossCount = 0;
    this.gigaSpawnTimer = 0;
    this.pendingGigaSpawn = false;
    this.gigaSpawnSurvivalTimer = 0;
    this.runCoins = 0;
    this.coinsAlreadyBanked = 0;
    this.player.characterId = saveData.data.selectedCharacter;
    this.player.reset();
    this.enemies.reset();
    this.projectiles.reset();
    this.gems.reset();
    this.interactables.reset();
    this.familiars.reset();
    this.fireTrail.reset();
    this.rifts.reset();
    this.synergy.reset();
    this.particles.reset();
    this.upgrades.reset();
    this.quests.resetRun();
  }

  hideCombat() {
    this.enemies.reset();
    this.projectiles.reset();
    this.gems.reset();
    this.interactables.reset();
    this.familiars.reset();
    this.fireTrail.reset();
    this.rifts.reset();
    this.synergy.reset();
    this.particles.reset();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  openGameMenu() {
    if (this.modalPause || this.ui.gameMenu.isOpen()) return;
    this.input.releaseCameraLook();
    this.menuPause = true;
    this.paused = true;
    this.ui.gameMenu.open({
      inArena: this.state === 'arena',
      onResume: () => this.closeGameMenu(),
      onReturnToVillage: () => this.leaveArenaForVillage(),
      onSave: () => this.saveGame(),
      onLoad: () => this.loadGame(),
      onSettingsChanged: () => {
        this.audio.applySettings(saveData.data.settings);
        this.cameraController.applySettings(saveData.data.settings);
      },
      onMainMenu: () => this.returnToTitle(),
      onExit: () => this.exitGame(),
    });
  }

  computeTotalRunCoins() {
    return Math.floor(this.elapsed * 0.5) + this.runCoins + this.player.kills;
  }

  bankRunCoins() {
    const total = this.computeTotalRunCoins();
    const delta = total - this.coinsAlreadyBanked;
    if (delta > 0) {
      saveData.addCoins(delta);
      this.coinsAlreadyBanked = total;
    }
    return delta;
  }

  leaveArenaForVillage() {
    if (this.state !== 'arena') return;

    this.ui._navCleanup?.();
    this.ui.gameMenu.screen?.remove();
    this.ui.gameMenu.screen = null;
    this.ui.gameMenu.handlers = null;
    this.menuPause = false;
    this.modalPause = false;
    this.paused = false;
    this.input.releaseCameraLook();

    const banked = this.bankRunCoins();
    const snap = this.captureRunSnapshot();
    snap.pausedInVillage = true;
    saveData.data.runSnapshot = snap;
    saveData.save();

    this.state = 'village';
    this.village.setVisible(true);
    this.arena.setVisible(false);
    this.applyVillageFog();
    this.hideCombat();
    this.player.position.set(0, 0, 5);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    this.cameraController.apply(this.camera, this.player.position, 0.9);
    this.ui.clear();
    this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
    this.ui.toast(
      banked > 0
        ? `Banked ${banked} coins — talk to Merchant Bonk (F)!`
        : 'Welcome to Zonka Village — visit Merchant Bonk!',
      'synergy'
    );
  }

  resumeArenaRun() {
    const snap = saveData.data.runSnapshot;
    if (!snap?.pausedInVillage) return;

    this.input.releaseCameraLook();
    this.menuPause = false;
    this.modalPause = false;
    this.paused = false;
    this.ui.removeScreens();

    this.state = 'arena';
    this.village.setVisible(false);
    this.arena.setVisible(true);
    this.applyArenaFog();
    this.enemies.reset();
    this.projectiles.reset();
    this.gems.reset();
    this.interactables.reset();
    this.familiars.reset();
    this.fireTrail.reset();
    this.rifts.reset();
    this.synergy.reset();
    this.particles.reset();
    this.ui.clear();
    this.ui.buildHUD();
    this.interactables.scatterField(ARENA_SIZE, ARENA_INTERACTABLE_COUNT, this.arena);
    this.interactables.spawnVillagePortal(0, 0);
    this.player.mesh.visible = true;
    this.cameraController.reset();

    if (snap.biomeId) {
      const biome = BIOMES.find(b => b.id === snap.biomeId);
      if (biome) {
        this.currentBiome = biome;
        this.arena.setBiome(biome);
        this.scene.fog.color.setHex(biome.fog);
        this.scene.background.setHex(biome.fog);
      }
    }

    this.restoreArenaFromSnapshot(snap);
    snap.pausedInVillage = false;
    saveData.data.runSnapshot = snap;
    saveData.save();
    this.ui.toast('Arena run resumed!', 'synergy');
  }

  closeGameMenu() {
    this.menuPause = false;
    if (!this.modalPause) this.paused = false;
  }

  saveGame() {
    if (this.state === 'arena') {
      saveData.data.runSnapshot = this.captureRunSnapshot();
    }
    saveData.save();
  }

  loadGame() {
    const snap = saveData.data.runSnapshot;
    saveData.reload();
    this.audio.applySettings(saveData.data.settings);
    this.cameraController.applySettings(saveData.data.settings);
    if (snap?.state === 'arena') {
      if (this.state === 'arena') {
        this.restoreArenaFromSnapshot(snap);
      } else {
        this.startArenaFromSnapshot(snap);
      }
      this.ui.toast('Arena run restored from save');
    } else {
      this.ui.toast('Profile loaded');
      if (this.state === 'village') {
        this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
      }
    }
  }

  captureRunSnapshot() {
    const p = this.player;
    return {
      state: this.state,
      elapsed: this.elapsed,
      runCoins: this.runCoins,
      coinsAlreadyBanked: this.coinsAlreadyBanked,
      bossTimer: this.bossTimer,
      bossCount: this.bossCount,
      inRift: this.inRift,
      gigaSpawnTimer: this.gigaSpawnTimer,
      pendingGigaSpawn: this.pendingGigaSpawn,
      gigaSpawnSurvivalTimer: this.gigaSpawnSurvivalTimer,
      pausedInVillage: false,
      characterId: p.characterId,
      player: {
        hp: p.hp,
        maxHp: p.maxHp,
        level: p.level,
        xp: p.xp,
        xpToNext: p.xpToNext,
        kills: p.kills,
        damage: p.damage,
        speed: p.speed,
        attackRate: p.attackRate,
        projectileCount: p.projectileCount,
        projectilePierce: p.projectilePierce,
        projectileSpeed: p.projectileSpeed,
        projectileSpeedMult: p.projectileSpeedMult,
        area: p.area,
        critChance: p.critChance,
        critDamageMult: p.critDamageMult,
        lifesteal: p.lifesteal,
        thorns: p.thorns,
        familiars: p.familiars,
        pickupRadius: p.pickupRadius,
        magnetRadius: p.magnetRadius,
        maxAirJumps: p.maxAirJumps,
        hpRegen: p.hpRegen,
        coinMult: p.coinMult,
        armor: p.armor,
        evasion: p.evasion,
        fireTrailLevel: p.fireTrailLevel,
        elements: [...p.elements],
        x: p.position.x,
        z: p.position.z,
      },
      biomeId: this.currentBiome?.id,
    };
  }

  restoreArenaFromSnapshot(snap) {
    this.elapsed = snap.elapsed;
    this.runCoins = snap.runCoins;
    this.coinsAlreadyBanked = snap.coinsAlreadyBanked ?? 0;
    this.bossTimer = snap.bossTimer;
    this.bossCount = snap.bossCount;
    this.inRift = snap.inRift;
    this.gigaSpawnTimer = snap.gigaSpawnTimer ?? 0;
    this.pendingGigaSpawn = snap.pendingGigaSpawn ?? false;
    this.gigaSpawnSurvivalTimer = snap.gigaSpawnSurvivalTimer ?? 0;
    this.applyPlayerSnapshot(snap);
    if (snap.biomeId) {
      const biome = BIOMES.find(b => b.id === snap.biomeId);
      if (biome) {
        this.currentBiome = biome;
        this.arena.setBiome(biome);
        this.scene.fog.color.setHex(biome.fog);
        this.scene.background.setHex(biome.fog);
      }
    }
  }

  startArenaFromSnapshot(snap) {
    this.state = 'arena';
    this.village.setVisible(false);
    this.arena.setVisible(true);
    this.applyArenaFog();
    this.resetRun();
    this.ui.clear();
    this.ui.buildHUD();
    this.interactables.scatterField(ARENA_SIZE, ARENA_INTERACTABLE_COUNT, this.arena);
    this.interactables.spawnVillagePortal(0, 0);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    this.restoreArenaFromSnapshot(snap);
  }

  applyPlayerSnapshot(snap) {
    const p = snap.player;
    this.player.characterId = snap.characterId;
    this.player.reset();
    this.player.hp = p.hp;
    this.player.maxHp = p.maxHp;
    this.player.level = p.level;
    this.player.xp = p.xp;
    this.player.xpToNext = p.xpToNext;
    this.player.kills = p.kills;
    this.player.damage = p.damage;
    this.player.speed = p.speed;
    this.player.attackRate = p.attackRate;
    this.player.projectileCount = p.projectileCount;
    this.player.projectilePierce = p.projectilePierce ?? 0;
    this.player.projectileSpeed = p.projectileSpeed;
    this.player.projectileSpeedMult = p.projectileSpeedMult ?? 0;
    this.player.area = p.area;
    this.player.critChance = p.critChance;
    this.player.critDamageMult = p.critDamageMult ?? PLAYER_BASE.critDamageMult;
    this.player.lifesteal = p.lifesteal;
    this.player.thorns = p.thorns;
    this.player.familiars = p.familiars;
    this.player.pickupRadius = p.pickupRadius;
    this.player.magnetRadius = p.magnetRadius ?? PLAYER_BASE.magnetRadius;
    this.player.maxAirJumps = p.maxAirJumps ?? 0;
    this.player.hpRegen = p.hpRegen ?? 0;
    this.player.coinMult = p.coinMult ?? 0;
    this.player.armor = p.armor ?? 0;
    this.player.evasion = p.evasion ?? 0;
    this.player.fireTrailLevel = p.fireTrailLevel ?? 0;
    this.player.airJumpsUsed = 0;
    this.player.elements = new Set(p.elements);
    this.player.position.set(p.x, 0, p.z);
  }

  returnToTitle() {
    this.input.releaseCameraLook();
    this.ui._navCleanup?.();
    this.ui.gameMenu.screen?.remove();
    this.ui.gameMenu.screen = null;
    this.ui.gameMenu.handlers = null;
    this.menuPause = false;
    this.modalPause = false;
    this.paused = false;
    this.ui.removeScreens();
    this.state = 'title';
    this.village.setVisible(false);
    this.arena.setVisible(false);
    this.hideCombat();
    this.player.mesh.visible = false;
    this.ui.showTitle((action) => this.handleTitleAction(action));
  }

  exitGame() {
    this.returnToTitle();
    this.ui.toast('Thanks for playing GigaZonk!');
  }

  handleCombatHit(damage, killResult, element, enemy, opts = {}) {
    const { skipProcs = false, isCrit = false } = opts;
    const critHit = isCrit || damage > this.player.damage * this.player.getComboMult() * (this.player.getCritMultiplier() - 0.05);
    if (enemy) {
      this.particles.damageNumber(enemy.x, enemy.z, damage, critHit);
    }
    this.audio.hit();

    if (!skipProcs && enemy) {
      this._applyHitProcs(damage, enemy, critHit);
    }

    if (killResult) {
      this.player.addKill();
      const xpMult = (this.inRift ? 2 : 1) * (1 + this.player.killXpMult);
      const xpValue = killResult.xp * xpMult;
      const overflow = this.gems.spawn(
        killResult.pos.x, killResult.pos.z, xpValue,
        this.player.position.x, this.player.position.z
      );
      if (overflow > 0 && this.player.addXp(overflow)) this.onLevelUp();
      if (this.player.coinMult > 0) {
        this.runCoins += Math.max(1, Math.floor(this.player.coinMult * 10));
      }
      this.quests.track('kills');
      if (killResult.isBoss) {
        this.quests.track('bosses');
        this.interactables.spawnChest(killResult.pos.x, killResult.pos.z);
      }
      const color = element === 'fire' ? 0xff6644 : element === 'ice' ? 0x88ccff : element === 'lightning' ? 0xffff44 : 0x44ff88;
      this.particles.burst(killResult.pos.x, killResult.pos.z, color);
      this.audio.kill();
    }
    if (this.player.lifesteal > 0) {
      this.player.heal(damage * this.player.lifesteal);
    }
  }

  _applyHitProcs(damage, enemy, isCrit) {
    const alive = enemy.alive;
    const ex = enemy.x;
    const ez = enemy.z;

    if (alive && this.player.poisonChance > 0 && Math.random() < this.player.poisonChance) {
      enemy.burnTimer = Math.max(enemy.burnTimer, 3);
    }

    if (alive && this.player.bonkChance > 0 && Math.random() < this.player.bonkChance) {
      const bonkDmg = damage * 19;
      const result = this.enemies.damageEnemy(enemy, bonkDmg, null);
      this.handleCombatHit(bonkDmg, result, null, enemy, { skipProcs: true, isCrit: true });
    }

    if (this.player.explodeChance > 0 && Math.random() < this.player.explodeChance) {
      const explodeDmg = damage * 0.65;
      const nearby = this.enemies.getNearby(ex, ez, 4);
      for (const { enemy: e2 } of nearby) {
        if (!e2.alive || e2 === enemy) continue;
        const result = this.enemies.damageEnemy(e2, explodeDmg, null);
        this.handleCombatHit(explodeDmg, result, null, e2, { skipProcs: true });
      }
      this.particles.burst(ex, ez, 0xff8844);
    }

    if (isCrit && this.player.critSplash > 0 && Math.random() < this.player.critSplash) {
      const splashDmg = damage * 0.5;
      const nearby = this.enemies.getNearby(ex, ez, 3.5);
      for (const { enemy: e2 } of nearby) {
        if (!e2.alive || e2 === enemy) continue;
        const result = this.enemies.damageEnemy(e2, splashDmg, null);
        this.handleCombatHit(splashDmg, result, null, e2, { skipProcs: true });
      }
    }
  }

  spawnBoss() {
    this.bossCount++;
    const angle = Math.random() * Math.PI * 2;
    const half = ARENA_SIZE / 2 - 6;
    const bx = THREE.MathUtils.clamp(
      this.player.position.x + Math.cos(angle) * 20,
      -half,
      half
    );
    const bz = THREE.MathUtils.clamp(
      this.player.position.z + Math.sin(angle) * 20,
      -half,
      half
    );
    this.enemies.spawnBoss(bx, bz, this.player.damage);
    this.audio.boss();
    this.ui.toast(`⚠️ ZONK LORD #${this.bossCount} APPROACHES!`, 'synergy');
  }

  updateArena(dt) {
    if (!this.modalPause && !this.ui.gameMenu.isOpen() && this.input.wasPressed('Escape')) {
      this.openGameMenu();
    }

    this.updateCameraInput();
    this.updateCamera();

    if (this.paused) return;

    this.elapsed += dt;
    this.quests.update(dt, this.player);

    const nightFactor = this.arena.getNightFactor();
    const diffSetting = getDifficultyFromId(saveData.data.settings.difficulty);
    const diffMult = (1 + nightFactor * 0.5 + (this.inRift ? 1 : 0)) * diffSetting.spawnMult;

    this.ambientLight.intensity = 0.3 + (1 - nightFactor) * 0.4;
    this.sunLight.intensity = 0.4 + (1 - nightFactor) * 0.6;

    this.arena.update(dt, this.elapsed);
    this.player.update(dt, this.input, this.arena, this.cameraController.yaw);

    const wasInRift = this.inRift;
    this.inRift = this.rifts.isPlayerInside(this.player.position.x, this.player.position.z);
    if (this.inRift && !wasInRift) {
      this.quests.track('rifts');
      this.ui.toast('⚡ Entered Zonk Rift — 2x XP, 3x danger!', 'synergy');
    }
    this.rifts.update(dt, this.elapsed, this.player.position);

    this.gigaSpawnTimer += dt;
    if (this.gigaSpawnTimer >= GIGA_SPAWN_INTERVAL) {
      this.gigaSpawnTimer = 0;
      this.pendingGigaSpawn = true;
    }

    if (this.gigaSpawnSurvivalTimer > 0) {
      this.gigaSpawnSurvivalTimer -= dt;
      if (this.gigaSpawnSurvivalTimer <= 0 && this.player.hp > 0) {
        this.quests.track('gigaspawns');
      }
    }

    const spawnResult = this.enemies.spawnWave(
      this.player.position, this.elapsed, this.inRift, diffMult, dt, diffSetting.hpMult,
      this.player.damage, this.pendingGigaSpawn
    );
    if (spawnResult.spawned > 0 && this.pendingGigaSpawn) {
      this.pendingGigaSpawn = false;
      this.gigaSpawnSurvivalTimer = 12;
      this.audio.boss();
      this.ui.toast(`🌊 GIGASPAWN — ${spawnResult.groupSize} monsters!`, 'synergy');
    }

    this.bossTimer += dt;
    if (this.bossTimer >= 120) {
      this.bossTimer = 0;
      this.spawnBoss();
    }

    this.enemies.update(dt, this.player.position, this.arena);

    if (this.player.canAttack()) {
      const nearby = this.enemies.getNearby(this.player.position.x, this.player.position.z, 20);
      if (nearby.length > 0) {
        const sorted = nearby.slice().sort((a, b) => a.dist - b.dist);
        const primary = sorted[0]?.enemy;
        const baseDmg = this.player.computeDamageForEnemy(primary);
        const isCrit = Math.random() < this.player.critChance;
        const finalDmg = isCrit ? baseDmg * this.player.getCritMultiplier() : baseDmg;
        const element = this.player.elements.size > 0
          ? [...this.player.elements][Math.floor(Math.random() * this.player.elements.size)]
          : null;
        const px = this.player.position.x;
        const py = this.player.getProjectileY();
        const pz = this.player.position.z;
        const projSpeed = this.player.projectileSpeed * (1 + this.player.projectileSpeedMult);
        const targets = [];
        for (let i = 0; i < this.player.projectileCount; i++) {
          const pick = i < sorted.length ? sorted[i] : sorted[0];
          targets.push(pick.enemy);
        }
        this.projectiles.fireVolley(
          px, py, pz, targets,
          projSpeed, finalDmg,
          this.player.area, element,
          this.player.projectilePierce,
          isCrit
        );
        this.player.resetAttackTimer();
        this.audio.shoot();
      }
    }

    this.projectiles.update(dt, this.enemies, (dmg, result, el, enemy, isCrit) =>
      this.handleCombatHit(dmg, result, el, enemy, { isCrit })
    );

    const xp = this.gems.update(dt, this.player);
    if (xp > 0) {
      const leveled = this.player.addXp(xp);
      if (leveled) this.onLevelUp();
    }

    if (this.player.thorns > 0) {
      const nearby = this.enemies.getNearby(this.player.position.x, this.player.position.z, 2);
      for (const { enemy } of nearby) {
        const result = this.enemies.damageEnemy(enemy, this.player.thorns * dt, null);
        if (result) this.handleCombatHit(this.player.thorns, result, null, enemy);
      }
    }

    this.familiars.setCount(this.player.familiars);
    this.familiars.update(dt, this.player.position, this.enemies, (dmg, result) =>
      this.handleCombatHit(dmg, result, null, null)
    );

    this.fireTrail.update(dt, this.player, this.enemies, this.arena, (dmg, result, el) =>
      this.handleCombatHit(dmg, result, el, null)
    );

    let novaFired = false;
    this.synergy.update(dt, this.player, this.enemies, this.gems, (dmg, result, el) => {
      if (!novaFired) {
        novaFired = true;
        this.audio.nova();
        this.ui.toast(`✨ ${SYNERGY_NAME}!`, 'synergy');
      }
      this.handleCombatHit(dmg, result, el, null);
    });

    const contactDmg = this.enemies.checkPlayerCollision(
      this.player.position.x, this.player.position.z, 0.8, diffMult
    );
    if (contactDmg > 0) {
      const dead = this.player.takeDamage(contactDmg * dt);
      if (dead) { this.gameOver(); return; }
    }

    this.interactables.update(dt, this.player.position.x, this.player.position.z);
    const nearItem = this.interactables.getNearest(this.player.position.x, this.player.position.z);
    if (nearItem) {
      const label = nearItem.type === 'chest' ? '[F] Open Chest' :
        nearItem.type === 'pot' ? '[F] Break Pot' :
        nearItem.type === 'village_portal' ? '[F] Return to Village (bank coins)' :
        '[F] Ascension Shrine';
      this.ui.showInteractPrompt(true, label);
      if (this.input.wasPressed('KeyF')) {
        if (nearItem.type === 'village_portal') {
          this.audio.ui();
          this.leaveArenaForVillage();
        } else {
        const result = this.interactables.interact(nearItem, this.player, {
          onChest: () => { this.quests.track('chests'); this.audio.chest(); },
          onPot: () => { this.quests.track('pots'); this.audio.chest(); },
          onShrine: () => this.ui.toast('Power surges through you!'),
          onCoins: (v) => { this.runCoins += v; },
          onToast: (msg) => this.ui.toast(msg),
        });
        if (result?.loot || result?.preview) {
          this.ui.pushReward({
            icon: result.icon || '🎁',
            name: result.name || result.loot?.label || 'Reward',
            stats: result.preview || [],
          });
        }
        if (result?.label) this.ui.toast(result.label);
        }
      }
    } else {
      this.ui.showInteractPrompt(false);
    }

    const questComplete = this.quests.checkCompletions();
    if (questComplete) {
      this.audio.quest();
      this.ui.toast(`Quest complete! +${questComplete.reward} coins`, 'synergy');
    }

    this.particles.update(dt, this.camera, this.renderer, this.enemies.enemies);

    this.ui.updateHUD(
      this.player, this.quests.getActiveQuests(), this.elapsed,
      this.enemies.aliveCount, this.inRift,
      {
        wave: this.arena.getWave(this.elapsed),
        biome: this.currentBiome?.name,
        night: nightFactor > 0.5,
        runCoins: this.runCoins,
      }
    );
  }

  updateVillage(dt) {
    if (!this.modalPause && !this.ui.gameMenu.isOpen() && this.input.wasPressed('Escape')) {
      this.openGameMenu();
    }

    this.updateCameraInput();
    this.cameraController.apply(this.camera, this.player.position, 0.9);

    if (this.menuPause) return;

    this.player.update(dt, this.input, this.village, this.cameraController.yaw);
    this.village.update(dt, this.player.position.x, this.player.position.z);

    const npc = this.village.getNearestNPC(this.player.position.x, this.player.position.z);
    if (npc) {
      this.ui.showInteractPrompt(true, `[F] Talk to ${npc.name} (${npc.role})`);
      if (this.input.wasPressed('KeyF')) {
        this.audio.ui();
        if (npc.id === 'questgiver') {
          this.quests.assignNewQuests();
          this.ui.showQuestBoard(this.quests.getActiveQuests(), () => {});
        } else if (npc.id === 'merchant') {
          this.ui.showShop(() => {
            this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
          });
        } else if (npc.id === 'portal') {
          if (saveData.data.runSnapshot?.pausedInVillage) {
            this.ui.showArenaPortalChoice(
              () => this.resumeArenaRun(),
              () => {
                saveData.data.runSnapshot = null;
                saveData.save();
                this.ui.showCharacterSelect(
                  () => { this.ui.removeScreens(); this.startArena(); },
                  () => { this.ui.removeScreens(); }
                );
              },
              () => { this.ui.removeScreens(); }
            );
          } else {
            this.ui.showCharacterSelect(
              () => { this.ui.removeScreens(); this.startArena(); },
              () => { this.ui.removeScreens(); }
            );
          }
        }
      }
    } else {
      this.ui.showInteractPrompt(false);
    }
  }

  updateCameraInput() {
    if (this.menuPause || this.modalPause) {
      this.input.releaseCameraLook();
    }
    const { dragX, dragY, wheel } = this.input.consumeCameraInput();
    this.cameraController.handleInput(dragX, dragY, wheel);
  }

  updateCamera() {
    this.cameraController.apply(this.camera, this.player.position, this.player.getViewY());
  }

  onLevelUp() {
    this.modalPause = true;
    this.paused = true;
    this.input.releaseCameraLook();
    this.audio.levelUp();
    const choices = this.upgrades.getRandomChoices(3, this.player);
    if (choices.length === 0) {
      this.player.heal(this.player.maxHp * 0.25);
      this.ui.toast('Power surge! +25% HP — all upgrades capped', 'synergy');
      this.modalPause = false;
      this.paused = false;
      return;
    }
    this.ui.showLevelUp(choices, this.player, (upgrade) => {
      const preview = getUpgradePreview(this.player, upgrade);
      this.upgrades.apply(upgrade, this.player);
      this.ui.pushReward({
        icon: upgrade.icon,
        name: upgrade.name,
        stats: preview,
        rarity: upgrade.rarity,
      });
      if (this.upgrades.checkSynergy(this.player)) {
        this.ui.toast(`🔥 Synergy unlocked: ${SYNERGY_NAME}!`, 'synergy');
      }
      this.modalPause = false;
      this.paused = false;
    });
  }

  gameOver() {
    this.modalPause = true;
    this.paused = true;
    this.input.releaseCameraLook();
    const coins = this.bankRunCoins();
    saveData.data.runSnapshot = null;
    saveData.data.totalKills += this.player.kills;
    if (this.elapsed > saveData.data.bestTime) saveData.data.bestTime = this.elapsed;
    saveData.save();

    this.ui.showGameOver({
      time: this.elapsed,
      level: this.player.level,
      kills: this.player.kills,
      coins,
    }, (action) => {
      this.modalPause = false;
      this.paused = false;
      this.ui.removeScreens();
      if (action === 'retry') {
        this.ui.showCharacterSelect(
          () => { this.ui.removeScreens(); this.startArena(); },
          () => { this.ui.removeScreens(); this.enterVillage(); }
        );
      }
      else this.enterVillage();
    });
  }

  animate(timestamp) {
    requestAnimationFrame((t) => this.animate(t));
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), 0.05);

    if (this.state === 'arena') this.updateArena(dt);
    else if (this.state === 'village') this.updateVillage(dt);

    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }
}
