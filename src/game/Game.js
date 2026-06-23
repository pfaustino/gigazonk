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
import { FamiliarManager, RiftManager, SynergyNova, FireTrailManager, ZonkDomeManager } from './Effects.js';
import { Audio } from './Audio.js';
import { ParticleSystem } from './Particles.js';
import { saveData } from './SaveData.js';
import { ARENA_SIZE, ARENA_INTERACTABLE_COUNT, BIOMES, GIGA_SPAWN_INTERVAL, VILLAGE_SKY, TITLE_SKY, ZONK_DOME_FOLLOWUP_DAMAGE_MULT, GAME_VERSION, MAX_ENEMIES } from './constants.js';
import { getDifficultyFromId } from './settings.js';
import { CameraController } from './CameraController.js';
import { parseDevFlags } from '../lib/parseDevFlags.js';
import { ErrorReporter } from '../lib/ErrorReporter.js';
import { DevPanel } from '../dev/DevPanel.js';
import { RunRng } from '../lib/RunRng.js';
import { setActiveRunRng, getActiveRunRng, runRandom } from '../lib/runRandom.js';
import { CombatController } from './CombatController.js';
import { GameMetrics } from './GameMetrics.js';
import {
  captureRunSnapshot,
  restoreArenaFromSnapshot as applyRunSnapshot,
} from './RunSnapshot.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.cameraController = new CameraController();
    this.ui = new UI();
    this.audio = new Audio();
    this.ui.setAudio(this.audio);
    this.quests = new QuestSystem();
    this.quests.assignNewQuests();
    this.upgrades = new UpgradeSystem();

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
    this.pendingLevelUps = 0;
    this._gameOverActive = false;
    this.runSeed = 0;
    this._devFlags = parseDevFlags();
    this._pendingRunSeed = this._devFlags.seed;
    this._devPendingBiome = this._devFlags.biome;
    this.village = null;
    this.arena = null;
    this._arenaWarmPending = false;

    if (this._devFlags.coins) {
      saveData.addCoins(this._devFlags.coins);
    }

    canvas.addEventListener('click', () => this.audio.resume());
    window.addEventListener('resize', () => this.onResize());
    this.ui.showTitle((action) => this.handleTitleAction(action));
    if (saveData.loadFailed) {
      this.ui.toast('Save reset — previous progress file was corrupt', 'warning');
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(TITLE_SKY);

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
    this.zonkDomes = new ZonkDomeManager(this.scene);
    this.rifts = new RiftManager(this.scene);
    this.synergy = new SynergyNova(this.scene);
    this.particles = new ParticleSystem(this.scene);

    this.player._onDodge = () => this.audio.dodge();
    this.player._onJump = () => this.audio.dodge();
    this.player._onMagnet = () => this.audio.magnet();
    this.player._onHurt = () => this.audio.hurt();
    this.player._onDamageTaken = (amount) => {
      this._floatHurtAcc += amount;
      if (amount >= 1.5) this._floatHurtTimer = 0;
    };
    this.player._onHeal = (amount) => { this._floatHealAcc += amount; };
    this._floatHurtAcc = 0;
    this._floatHealAcc = 0;
    this._floatHurtTimer = 0;
    this._floatHealTimer = 0;

    this.combat = new CombatController(this);
    this.metrics = new GameMetrics();

    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.audio.applySettings(saveData.data.settings);
    this.cameraController.applySettings(saveData.data.settings);
    this.audio.loadMusicManifest().then(() => {
      if (this.state === 'title') this.audio.playMusic('title');
    });

    if (import.meta.env.DEV || this._devFlags.dev) {
      this.devPanel = new DevPanel(this);
    }
    this.animate();
  }

  _ensureVillage() {
    if (this.village) return;
    this.village = new Village(this.scene);
    this.village.setVisible(false);
  }

  _ensureArena() {
    if (this.arena) return;
    this.arena = new Arena(this.scene);
    this.arena.setVisible(false);
  }

  _populateArenaField(showToast = false) {
    this.interactables.scatterField(ARENA_SIZE, ARENA_INTERACTABLE_COUNT, this.arena);
    this.interactables.spawnVillagePortal(0, 0);
    this.populateMesaEncounters(showToast);
  }

  _deferArenaFieldSetup(showToast = false) {
    queueMicrotask(() => {
      if (this.state !== 'arena' || !this.arena) return;
      this._populateArenaField(showToast);
    });
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

  setSkyColor(hex) {
    this.scene.background.setHex(hex);
  }

  applyArenaScene() {
    this.setShadowFrustum(ARENA_SIZE * 0.55);
    this.applyDaylight();
  }

  applyDaylight() {
    this.hemiLight.intensity = 0.44;
    this.ambientLight.intensity = 0.28;
    this.sunLight.intensity = 1.2;
  }

  applyVillageScene() {
    this.setSkyColor(VILLAGE_SKY);
    this.applyDaylight();
    this.setShadowFrustum(120);
  }

  setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0x9ec8e8, 0xc8b898, 0.44);
    this.scene.add(this.hemiLight);
    this.ambientLight = new THREE.AmbientLight(0xe8e4dc, 0.28);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xfff8e8, 1.2);
    this.sunLight.position.set(30, 55, 18);
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

  _runManagers() {
    return [
      this.enemies,
      this.projectiles,
      this.gems,
      this.interactables,
      this.familiars,
      this.fireTrail,
      this.zonkDomes,
      this.rifts,
      this.synergy,
      this.particles,
    ];
  }

  resetRunManagers({ upgrades = false, questsRun = false } = {}) {
    for (const mgr of this._runManagers()) mgr.reset();
    if (upgrades) this.upgrades.reset();
    if (questsRun) this.quests.resetRun();
  }

  _applySceneMode(mode) {
    if (mode === 'title') {
      this.village?.setVisible(false);
      this.arena?.setVisible(false);
      this.setSkyColor(TITLE_SKY);
      this.applyDaylight();
      return;
    }
    if (mode === 'village') {
      this.village?.setVisible(true);
      this.arena?.setVisible(false);
      this.applyVillageScene();
      return;
    }
    if (mode === 'arena') {
      this.village?.setVisible(false);
      this.arena?.setVisible(true);
      this.applyArenaScene();
    }
  }

  transitionTo(next) {
    this.state = next;
    this._applySceneMode(next);
  }

  _scatterArenaInteractables() {
    this.interactables.scatterField(ARENA_SIZE, ARENA_INTERACTABLE_COUNT, this.arena);
    this.interactables.spawnVillagePortal(0, 0);
  }

  _resolveStartBiome() {
    if (this._devPendingBiome) {
      const biome = BIOMES.find((b) => b.id === this._devPendingBiome);
      this._devPendingBiome = null;
      if (biome) return biome;
    }
    return this.arena.pickRandomBiome();
  }

  _applyBiome(biome) {
    this.currentBiome = biome;
    this.arena.setBiome(biome);
    this.setSkyColor(biome.sky);
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
    this._ensureVillage();
    this._gameOverActive = false;
    saveData.data.runSnapshot = null;
    saveData.save();
    this.transitionTo('village');
    this.hideCombat();
    this.player.characterId = saveData.data.selectedCharacter;
    this.player.reset();
    this.player.position.set(0, 0, 5);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    this.cameraController.apply(this.camera, this.player.position, this.player.getViewY());
    this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
    this.quests.assignNewQuests();
    this.audio.playMusic('village');
    this.clearRunRng();
  }

  startArena() {
    this._ensureArena();
    saveData.data.runSnapshot = null;
    this.transitionTo('arena');
    this.resetRun();
    this.quests.assignNewQuests();
    this.ui.clear();
    this.ui.buildHUD();
    this._applyBiome(this._resolveStartBiome());
    this._deferArenaFieldSetup(true);
    this.player.position.set(0, 0, 0);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    saveData.data.totalRuns++;
    saveData.save();
    this.ui.toast(`Entering ${this.currentBiome.name}`, 'synergy');
    this.audio.playMusic('arena');
  }

  populateMesaEncounters(showToast = false) {
    const roll = this.interactables.populateMesas(
      this.arena.mesas,
      this.enemies,
      this.player.getEffectiveDamage()
    );
    if (showToast && roll) {
      this.ui.toast(
        `🏔️ ${roll.caches} mesa treasures & ${roll.guardians} guardians await!`,
        'synergy'
      );
    }
    return roll;
  }

  initRunRng() {
    this.runSeed = this._pendingRunSeed ?? Math.floor(Math.random() * 1e9);
    this._pendingRunSeed = null;
    setActiveRunRng(new RunRng(this.runSeed));
  }

  clearRunRng() {
    setActiveRunRng(null);
  }

  resetRun() {
    this._gameOverActive = false;
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
    this.pendingLevelUps = 0;
    this.initRunRng();
    this.ui.dismissLevelUp();
    this.player.characterId = saveData.data.selectedCharacter;
    this.player.reset();
    this.resetRunManagers({ upgrades: true, questsRun: true });
    this._floatHurtAcc = 0;
    this._floatHealAcc = 0;
    this._floatHurtTimer = 0;
    this._floatHealTimer = 0;
  }

  hideCombat() {
    this.resetRunManagers();
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  queueLevelUp(count = 1) {
    if (count > 0) this.pendingLevelUps += count;
  }

  recoverStuckModalPause() {
    if (this.ui.isLevelUpOpen()) {
      if (!this.modalPause || !this.paused) {
        this.modalPause = true;
        this.paused = true;
      }
      return;
    }
    if (this.ui.hasModalScreen()) return;
    if (!this.modalPause && !this.paused) return;
    if (this.ui.gameMenu.isOpen()) return;

    this.modalPause = false;
    this.paused = false;
    this.ui.dismissLevelUp();
    this.ui._navCleanup?.();
    this.ui._navCleanup = null;
  }

  flushPendingLevelUp() {
    if (this.pendingLevelUps <= 0 || this.modalPause || this.ui.isLevelUpOpen()) return;
    this.onLevelUp();
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
    this._ensureVillage();

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

    this.transitionTo('village');
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
    this._ensureArena();
    const snap = saveData.data.runSnapshot;
    if (!snap?.pausedInVillage) return;

    this.input.releaseCameraLook();
    this.menuPause = false;
    this.modalPause = false;
    this.paused = false;
    this.ui.removeScreens();

    this.transitionTo('arena');
    this.resetRunManagers();
    this.ui.clear();
    this.ui.buildHUD();
    this.quests.assignNewQuests();
    this._deferArenaFieldSetup(false);
    this.player.mesh.visible = true;
    this.cameraController.reset();

    if (snap.biomeId) {
      const biome = BIOMES.find(b => b.id === snap.biomeId);
      if (biome) this._applyBiome(biome);
    }

    this.restoreArenaFromSnapshot(snap);
    this.populateMesaEncounters();
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
    return captureRunSnapshot(this);
  }

  restoreArenaFromSnapshot(snap) {
    applyRunSnapshot(this, snap);
  }

  startArenaFromSnapshot(snap) {
    this._ensureArena();
    this.transitionTo('arena');
    this.resetRun();
    this.quests.assignNewQuests();
    this.ui.clear();
    this.ui.buildHUD();
    this._deferArenaFieldSetup(false);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    this.restoreArenaFromSnapshot(snap);
    this.populateMesaEncounters();
    this.audio.playMusic('arena');
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
    this.transitionTo('title');
    this.hideCombat();
    this.player.mesh.visible = false;
    this.ui.showTitle((action) => this.handleTitleAction(action));
    this.audio.playMusic('title');
  }

  exitGame() {
    this.returnToTitle();
    this.ui.toast('Thanks for playing GigaZonk!');
  }

  handleCombatHit(damage, killResult, element, enemy, opts = {}) {
    this.combat.handleCombatHit(damage, killResult, element, enemy, opts);
  }

  spawnBoss() {
    this.bossCount++;
    const angle = runRandom() * Math.PI * 2;
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
    this.enemies.spawnBoss(bx, bz, this.player.getEffectiveDamage());
    this.audio.boss();
    this.ui.toast(`⚠️ ZONK LORD #${this.bossCount} APPROACHES!`, 'synergy');
  }

  _flushPlayerFloatNumbers(dt) {
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const py = this.player.getViewY();

    this._floatHurtTimer -= dt;
    if (this._floatHurtAcc > 0 && this._floatHurtTimer <= 0) {
      this.particles.floatingNumber(px, pz, this._floatHurtAcc, 'hurt', py);
      this._floatHurtAcc = 0;
      this._floatHurtTimer = 0.35;
    }

    this._floatHealTimer -= dt;
    if (this._floatHealAcc > 0 && this._floatHealTimer <= 0) {
      this.particles.floatingNumber(px, pz, this._floatHealAcc, 'heal', py);
      this._floatHealAcc = 0;
      this._floatHealTimer = 0.22;
    }
  }

  updateArena(dt) {
    if (!this.modalPause && !this.ui.gameMenu.isOpen() && this.input.wasPressed('Escape')) {
      this.openGameMenu();
    }

    this.recoverStuckModalPause();

    this.updateCameraInput();
    this.updateCamera();

    if (this.paused) return;

    this.elapsed += dt;
    this.quests.update(dt, this.player, {
      wave: this.arena.getWave(this.elapsed),
      runCoins: this.runCoins,
    });

    const nightFactor = this.arena.getNightFactor();
    const diffSetting = getDifficultyFromId(saveData.data.settings.difficulty);
    const diffMult = (1 + nightFactor * 0.5 + (this.inRift ? 1 : 0)) * diffSetting.spawnMult;

    this.hemiLight.intensity = 0.36 + (1 - nightFactor) * 0.16;
    this.ambientLight.intensity = 0.24 + (1 - nightFactor) * 0.14;
    this.sunLight.intensity = 0.68 + (1 - nightFactor) * 0.58;

    if (this.currentBiome?.sky) {
      const daySky = new THREE.Color(this.currentBiome.sky);
      const nightSky = daySky.clone().multiplyScalar(0.3);
      this.scene.background.copy(daySky).lerp(nightSky, nightFactor);
    }

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
      this.player.getEffectiveDamage(), this.pendingGigaSpawn
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

    this.enemies.setThreatDamage(this.player.getEffectiveDamage());
    this.enemies.update(dt, this.player.position, this.arena);

    this.combat.tryAutoFire();

    this.projectiles.update(dt, this.enemies, this.arena, (dmg, result, el, enemy, isCrit) =>
      this.handleCombatHit(dmg, result, el, enemy, { isCrit })
    );

    const { xp, gems } = this.gems.update(dt, this.player);
    if (gems > 0) this.quests.track('gems', gems);
    if (xp > 0) {
      const levels = this.player.addXp(xp);
      if (levels > 0) this.queueLevelUp(levels);
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
    if (!this.paused && nearItem) {
      const label = nearItem.type === 'chest' ? '[F] Open Chest' :
        nearItem.type === 'pot' ? '[F] Break Pot' :
        nearItem.type === 'mesa_cache' ? '[F] Claim Mesa Treasure' :
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
          onMesaCache: () => { this.quests.track('chests'); this.audio.chest(); },
          onShrine: () => {
            this.quests.track('shrines');
            this.ui.toast('Power surges through you!');
          },
          onCoins: (v) => { this.runCoins += v; },
          onToast: (msg) => this.ui.toast(msg),
        });
        if (result?.loot || result?.preview) {
          if (!result?.levelsGained) {
            this.ui.pushReward({
              icon: result.icon || '🎁',
              name: result.name || result.loot?.label || 'Reward',
              stats: result.preview || [],
              player: this.player,
            });
          }
        }
        if (result?.label) this.ui.toast(result.label);
        if (result?.levelsGained) this.queueLevelUp(result.levelsGained);
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

    this._flushPlayerFloatNumbers(dt);
    this.particles.update(dt, this.camera, this.renderer, this.enemies.enemies);

    this.zonkDomes.update(dt, this.player, this.arena, this.elapsed, {
      onWarn: () => {
        this.audio.zonkDomeWarn();
        this.ui.toast('⚠️ Zonk Dome incoming — leave the zone!', 'synergy');
      },
      onFollowupWarn: () => {
        this.audio.zonkDomeWarn();
      },
      onPop: (dome) => {
        this.audio.zonkDomePop();
        const isFollowup = dome.isFollowup;
        const kb = isFollowup ? 18 : 22;
        const dmgMult = isFollowup ? ZONK_DOME_FOLLOWUP_DAMAGE_MULT : 1;
        this.player.applyKnockback(dome.cx, dome.cz, kb);
        const dmg = Math.max(8, Math.floor(this.player.maxHp * 0.18 * dmgMult));
        const dead = this.player.takeDamage(dmg, { forced: true });
        this.particles.burst(this.player.position.x, this.player.position.z, isFollowup ? 0xcc66ff : 0xff44ff);
        if (dead) { this.gameOver(); return; }
      },
    });

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
          this.ui.showQuestBoard(this.quests, () => {});
        } else if (npc.id === 'trainer') {
          this.ui.showSkillTree(() => {
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
    if (this.pendingLevelUps <= 0 || this.ui.isLevelUpOpen()) return;

    this.input.releaseCameraLook();
    let choices;
    try {
      choices = this.upgrades.getRandomChoices(3, this.player);
    } catch (err) {
      ErrorReporter.capture('UPGRADE_ROLL', err, this.getErrorContext());
      this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
      this.player.heal(this.player.maxHp * 0.25);
      this.flushPendingLevelUp();
      return;
    }

    if (choices.length === 0) {
      this.player.heal(this.player.maxHp * 0.25);
      this.ui.toast('Power surge! +25% HP — all upgrades capped', 'synergy');
      this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
      this.flushPendingLevelUp();
      return;
    }

    try {
      const shown = this.ui.showLevelUp(choices, this.player, (upgrade) => {
        try {
          const preview = getUpgradePreview(this.player, upgrade);
          this.upgrades.apply(upgrade, this.player);
          this.ui.renderBuffBar(this.player);
          this.ui.pushReward({
            icon: upgrade.icon,
            name: upgrade.name,
            stats: preview,
            rarity: upgrade.rarity,
            player: this.player,
          });
          if (this.upgrades.checkSynergy(this.player)) {
            this.ui.toast(`🔥 Synergy unlocked: ${SYNERGY_NAME}!`, 'synergy');
          }
        } finally {
          this.modalPause = false;
          this.paused = false;
          this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
          this.flushPendingLevelUp();
        }
      });
      if (!shown) return;
      this.audio.levelUp();
      this.modalPause = true;
      this.paused = true;
    } catch (err) {
      ErrorReporter.capture('UPGRADE_UI', err, this.getErrorContext());
      this.ui.dismissLevelUp();
      this.modalPause = false;
      this.paused = false;
    }
  }

  gameOver() {
    if (this._gameOverActive) return;
    this._gameOverActive = true;
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
      this.ui.removeScreens();
      if (action === 'retry') {
        this.ui.showCharacterSelect(
          () => { this.ui.removeScreens(); this.startArena(); },
          () => {
            this.modalPause = false;
            this.paused = false;
            this._gameOverActive = false;
            this.ui.removeScreens();
            this.enterVillage();
          }
        );
        return;
      }
      this.modalPause = false;
      this.paused = false;
      this._gameOverActive = false;
      this.enterVillage();
    });
  }

  animate(timestamp) {
    requestAnimationFrame((t) => this.animate(t));
    if (this.state === 'title' && !this.arena && !this._arenaWarmPending) {
      this._arenaWarmPending = true;
      queueMicrotask(() => {
        this._ensureArena();
        this._arenaWarmPending = false;
      });
    }
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), 0.05);

    const inWorld = this.state === 'arena' || this.state === 'village';
    const gameplay = inWorld
      && !this.modalPause
      && !this.ui.gameMenu.isOpen()
      && !this.ui.isLevelUpOpen();
    this.input.setGameplayEnabled(gameplay);
    this.input.setInvertLookY(saveData.data.settings.invertMouseY);
    this.input.pollGamepad(dt, {
      menuNav: this.ui.hasModalScreen() || this.ui.gameMenu.isOpen(),
    });

    if (this.state === 'arena') {
      this.updateArena(dt);
      this.recoverStuckModalPause();
      this.flushPendingLevelUp();
    } else if (this.state === 'village') {
      this.updateVillage(dt);
    }

    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);

    this.metrics.tick(dt);
    this.ui.updateMetrics(this.getUiMetrics());
  }

  getUiMetrics() {
    const inGameplay = this.state === 'arena' || this.state === 'village';
    const snapshot = {
      visible: inGameplay,
      fps: this.metrics.fps,
      frameMs: this.metrics.frameMs,
      combat: this.state === 'arena',
    };
    if (this.state === 'arena') {
      snapshot.enemies = this.enemies.aliveCount;
      snapshot.projectiles = this.projectiles.aliveCount;
      snapshot.gems = this.gems.aliveCount;
    }
    return snapshot;
  }

  getErrorContext() {
    return {
      version: GAME_VERSION,
      state: this.state,
      elapsed: this.elapsed,
      runSeed: this.runSeed,
      rngState: getActiveRunRng()?.getState(),
      enemies: this.enemies?.count ?? 0,
      playerLevel: this.player?.level ?? 0,
    };
  }

  devSkipToTime(seconds) {
    if (this.state !== 'arena') return;
    this.elapsed = Math.max(0, seconds);
    this.ui.toast(`Dev: time → ${Math.floor(this.elapsed)}s`, 'synergy');
  }

  devSetBiome(biomeId) {
    const biome = BIOMES.find((b) => b.id === biomeId);
    if (!biome) return;
    this.currentBiome = biome;
    this.arena.setBiome(biome);
    this.setSkyColor(biome.sky);
    if (this.state === 'arena') {
      this.ui.toast(`Dev: biome → ${biome.name}`, 'synergy');
    }
  }

  devSpawnEnemies(count) {
    if (this.state !== 'arena') return;
    let spawned = 0;
    const dmg = this.player.getEffectiveDamage();
    while (spawned < count && this.enemies.count < MAX_ENEMIES) {
      const batch = Math.min(20, count - spawned);
      spawned += this.enemies._spawnCluster(
        this.player.position.x,
        this.player.position.z,
        batch,
        'grunt',
        dmg,
        1,
        1
      );
    }
    this.ui.toast(`Dev: spawned ${spawned} enemies`, 'synergy');
  }

  devSpawnBoss() {
    if (this.state !== 'arena') return;
    this.spawnBoss();
    this.ui.toast('Dev: Zonk Lord summoned', 'synergy');
  }

  devAddMetaCoins(amount) {
    saveData.addCoins(amount);
    if (this.state === 'village') {
      this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
    }
    this.ui.toast(`Dev: +${amount} Zonk Coins`, 'synergy');
  }

  devForceLevelUp() {
    if (this.state !== 'arena') return;
    const levels = this.player.addXp(this.player.xpToNext);
    if (levels > 0) this.queueLevelUp(levels);
    this.ui.toast('Dev: forced level up', 'synergy');
  }

  devExportErrors() {
    const text = ErrorReporter.exportText();
    if (!text) {
      this.ui.toast('No errors captured', 'warning');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.ui.toast('Error log copied to clipboard', 'synergy');
      }).catch(() => {
        console.log(text);
        this.ui.toast('Errors printed to console', 'warning');
      });
    } else {
      console.log(text);
      this.ui.toast('Errors printed to console', 'warning');
    }
  }
}
