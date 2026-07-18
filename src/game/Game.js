import * as THREE from 'three';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { EnemyManager } from './EnemyManager.js';
import { ProjectileManager } from './ProjectileManager.js';
import { GemManager } from './GemManager.js';
import { Interactables } from './Interactables.js';
import { QuestSystem } from './QuestSystem.js';
import { UpgradeSystem, SYNERGY_NAME, getUpgradePreview } from './UpgradeSystem.js';
import { buildUpgradeOffer, UPGRADE_TEMPLATES } from './UpgradeOffers.js';
import { UI } from './UI.js';
import { Village } from './Village.js';
import { Arena } from './Arena.js';
import { FamiliarManager, RiftManager, SynergyNova, FireTrailManager, ZonkDomeManager } from './Effects.js';
import { Audio } from './Audio.js';
import { ParticleSystem } from './Particles.js';
import { saveData } from './SaveData.js';
import { trySubmitGlobalRun } from './ui/LeaderboardScreen.js';
import {
  ARENA_SIZE, ARENA_INTERACTABLE_COUNT, BIOMES, GIGA_SPAWN_INTERVAL, VILLAGE_SKY, TITLE_SKY, ZONK_DOME_FOLLOWUP_DAMAGE_MULT, ZONK_DOME_GROW_TIME, GAME_VERSION, MAX_ENEMIES, BOSS_SPAWN_INTERVAL, BOSS_TELEGRAPH_SECONDS, HIT_STOP_CRIT_SECONDS, CHARACTERS, SCENE_TONE_EXPOSURE, SCENE_DAY_HEMI_INTENSITY, SCENE_DAY_AMBIENT_INTENSITY, SCENE_DAY_SUN_INTENSITY, SCENE_NIGHT_HEMI_INTENSITY, SCENE_NIGHT_AMBIENT_INTENSITY, SCENE_NIGHT_SUN_INTENSITY, CITIZEN_RESCUE_COUNT, CITIZEN_RESCUE_COINS, CITIZEN_RESCUE_XP, CITIZEN_RESCUE_RESPAWN_SEC, ARENA_BURGER_FIRST_SPAWN_SEC, ARENA_BURGER_RESPAWN_SEC, ARENA_BURGER_FRENZY_SEC,   ARENA_BURGER_FLEE_SPEED_MULT, ARENA_BURGER_GOBBLE_RADIUS, gobbleHealForType, OBJECTIVE_ARROW_HIDE_DIST,
  THORN_CONTACT_RADIUS, THORN_FLOAT_INTERVAL, THORN_VFX_INTERVAL, RUN_MODIFIERS_ENABLED,
} from './constants.js';
import { applyRunModifiers, formatRunModifiersToast } from './RunModifiers.js';
import { getDifficultyFromId } from './settings.js';
import { CameraController } from './CameraController.js';
import { parseDevFlags } from '../lib/parseDevFlags.js';
import { isDevEnabled, installDevSecretListener } from '../lib/devUnlock.js';
import { ErrorReporter } from '../lib/ErrorReporter.js';
import { DevPanel } from '../dev/DevPanel.js';
import { RunRng } from '../lib/RunRng.js';
import { setActiveRunRng, getActiveRunRng, runRandom } from '../lib/runRandom.js';
import {
  applyVillagePerksToRun,
  formatVillagePerksToast,
  getActiveVillagePerks,
} from './VillagePerks.js';
import { TouchControls } from './TouchControls.js';
import { initMobileLayout, isMobilePerformanceTier } from '../lib/mobileLayout.js';
import { checkRunAchievements } from './AchievementSystem.js';
import { tryCompleteDailyChallenge, syncDailyChallengeDay } from './DailyChallenge.js';
import {
  shouldShowTutorial,
  getCurrentTutorialStep,
  getTutorialStepIndex,
  advanceTutorialStep,
  isTutorialComplete,
  isStepForState,
  isTutorialHidden,
  enableTutorialHints,
  skipTutorialStepsUntil,
  resetTutorialProgress,
} from './Tutorial.js';
import { getActiveBuffs } from './UpgradeSystem.js';
import { GameMetrics } from './GameMetrics.js';
import {
  captureRunSnapshot,
  restoreArenaFromSnapshot as applyRunSnapshot,
} from './RunSnapshot.js';
import { CombatController } from './CombatController.js';
import { CitizenRescue } from './CitizenRescue.js';
import { ArenaBurger } from './ArenaBurger.js';
import { ObjectiveArrow3D } from './ObjectiveArrow3D.js';
import { BlastRadiusFx } from './BlastRadiusFx.js';

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
    this.devToolsHoldingPause = false;
    this._devToolsPauseHold = 0;
    this._devPauseSnapshot = null;
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
    this._devLightMult = { hemi: 1, ambient: 1, sun: 1 };
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
    const pixelCap = isMobilePerformanceTier() ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = SCENE_TONE_EXPOSURE;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(TITLE_SKY);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2500);
    this.camera.position.set(0, 25, 20);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();

    this.player = new Player(this.scene);
    this._combatReady = false;
    this.enemies = null;
    this.projectiles = null;
    this.gems = null;
    this.interactables = null;
    this.familiars = null;
    this.fireTrail = null;
    this.zonkDomes = null;
    this.rifts = null;
    this.synergy = null;
    this.particles = null;
    this.combat = null;
    this._runBosses = 0;
    this._runRiftsEntered = 0;
    this._runMaxCombo = 0;
    this._runBurgers = 0;
    this._runGobbles = 0;
    this._runCitizens = 0;
    this._objectiveArrowKind = null;
    this._runNova = false;
    this._tutorialShownStep = -1;
    this._charSelectOpen = false;
    this._wasInRift = false;
    this._tutorialMoveDist = 0;
    this._tutorialFlags = this._initTutorialFlags();
    this._hitStopTimer = 0;
    this._bossTelegraph = null;

    this.player._onDodge = () => {
      this.audio.dodge();
      this._tutorialFlags.dodge = true;
    };
    this.player._onJump = () => {
      this.audio.dodge();
      this._tutorialFlags.jump = true;
    };
    this.player._onHurt = () => this.audio.hurt();
    this.player._onDamageTaken = (amount) => {
      this._floatHurtAcc += amount;
      if (amount >= 1.5) this._floatHurtTimer = 0;
      if (this.state === 'arena') {
        this.ui.flashDamage(amount, this.player.maxHp);
      }
    };
    this.player._onHeal = (amount) => { this._floatHealAcc += amount; };
    this._floatHurtAcc = 0;
    this._floatHealAcc = 0;
    this._floatHurtTimer = 0;
    this._floatHealTimer = 0;

    this.combat = null;
    this.metrics = new GameMetrics();
    this.touchControls = new TouchControls(this.input);
    this.ui.setMobilePauseHandler(() => this.openGameMenu());
    initMobileLayout(() => this._syncTouchControls());

    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.audio.applySettings(saveData.data.settings);
    this.cameraController.applySettings(saveData.data.settings);
    this.audio.loadMusicManifest().then(() => {
      if (this.state === 'title') this.audio.playMusic('title');
    });
    this.audio.loadSoundManifest();

    if (import.meta.env.DEV || isDevEnabled()) {
      this.enableDevPanel();
    }
    if (!import.meta.env.DEV && !isDevEnabled()) {
      this._devUnlockCleanup = installDevSecretListener(() => this.enableDevPanel({ announce: true }));
    }
    this.animate();
    if (shouldShowTutorial()) {
      requestAnimationFrame(() => this._tryShowTutorial({ force: true }));
    }
  }

  _initTutorialFlags() {
    return {
      move: false,
      dodge: false,
      jump: false,
      interact: false,
      citizenRescue: false,
      burgerFrenzy: false,
      levelup: false,
      rift: false,
      boss: false,
      villageQuests: false,
      villageMenu: false,
      villageSkills: false,
      villageMerchant: false,
      villagePortal: false,
    };
  }

  _hasTouchInput() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  _syncTouchControls() {
    const inPlay = (this.state === 'arena' || this.state === 'village') && !this._gameOverActive;
    const modalBlock = this.ui.isLevelUpOpen() || this.ui.gameMenu.isOpen();
    this.touchControls.setVisible(inPlay && !modalBlock);
  }

  _isTutorialStepReady(step) {
    const f = this._tutorialFlags;
    switch (step.id) {
      case 'welcome':
      case 'village_hub':
      case 'village_quests':
      case 'arena_menu':
      case 'move':
        return true;
      case 'village_menu':
        return true;
      case 'characters':
        return this._charSelectOpen;
      case 'village_skills':
        return true;
      case 'village_merchant':
        return f.villageSkills;
      case 'village_portal':
        if (!f.villageSkills) return false;
        if (saveData.data.reputation < 25) return true;
        return f.villageMerchant;
      case 'touch':
      case 'dodge':
        return f.move || this._tutorialMoveDist > 8;
      case 'jump':
        return f.dodge;
      case 'interact':
        return f.jump;
      case 'citizen_rescue':
        return f.interact;
      case 'arena_burger':
        return f.citizenRescue;
      case 'levelup':
        return f.burgerFrenzy;
      case 'rift':
        return f.levelup && f.rift;
      case 'boss':
        return f.boss;
      default:
        return false;
    }
  }

  _advanceTutorialAction(stepId) {
    if (isTutorialComplete()) return;
    const step = getCurrentTutorialStep();
    if (!step || step.id !== stepId) return;
    this.ui.hideTutorial();
    advanceTutorialStep();
    this._tutorialShownStep = getTutorialStepIndex() - 1;
    queueMicrotask(() => this._tryShowTutorial({ force: true }));
  }

  _tryShowTutorial({ force = false } = {}) {
    if (isTutorialComplete() || isTutorialHidden() || this.ui.isLevelUpOpen() || this.ui.gameMenu.isOpen()) return;
    const step = getCurrentTutorialStep();
    if (!step || !isStepForState(step, this.state)) return;
    const idx = getTutorialStepIndex();
    if (!force && idx <= this._tutorialShownStep) return;
    if (!this._isTutorialStepReady(step)) return;

    if (step.id === 'touch' && !this._hasTouchInput()) {
      advanceTutorialStep();
      this._tutorialShownStep = getTutorialStepIndex();
      queueMicrotask(() => this._tryShowTutorial({ force: true }));
      return;
    }

    if (step.action) {
      this._tutorialShownStep = idx;
      this.ui.showTutorial(() => {});
      return;
    }

    this._tutorialShownStep = idx;
    this.ui.showTutorial(() => {
      if (step.id === 'citizen_rescue') this._tutorialFlags.citizenRescue = true;
      if (step.id === 'arena_burger') this._tutorialFlags.burgerFrenzy = true;
      advanceTutorialStep();
      queueMicrotask(() => this._tryShowTutorial({ force: true }));
    });
  }

  _ensureCombatManagers() {
    if (this._combatReady) return;
    this.enemies = new EnemyManager(this.scene);
    this.enemies.onBossPhase2 = (enemy) => this._onBossPhase2(enemy);
    this.projectiles = new ProjectileManager(this.scene);
    this.gems = new GemManager(this.scene);
    this.interactables = new Interactables(this.scene);
    this.interactables.onInteractResult = (result) => this._handleInteractResult(result);
    this.familiars = new FamiliarManager(this.scene);
    this.fireTrail = new FireTrailManager(this.scene);
    this.zonkDomes = new ZonkDomeManager(this.scene);
    this.rifts = new RiftManager(this.scene);
    this.synergy = new SynergyNova(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.blastRadiusFx = new BlastRadiusFx(this.scene);
    this.combat = new CombatController(this);
    this.citizenRescue = new CitizenRescue(this.scene);
    this.citizenRescue.onRescued = (citizen) => this._onCitizenRescued(citizen);
    this.arenaBurger = new ArenaBurger(this.scene);
    this.arenaBurger.onEaten = () => this._onBurgerEaten();
    this.arenaBurger.onEatStart = () => this.audio.burgerChomp();
    this.objectiveArrow3D = new ObjectiveArrow3D(this.scene);
    this.synergy.onNova = () => {
      this._runNova = true;
      saveData.recordRunStats({ novaTriggered: true });
    };
    this._combatReady = true;
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
    this._ensureCombatManagers();
    if (this.state !== 'arena' || !this.arena) return;

    this.interactables.scatterField(ARENA_SIZE, ARENA_INTERACTABLE_COUNT, this.arena);
    this.interactables.spawnVillagePortal(0, 0);
    const citizens = this.citizenRescue.scatter(this.arena, CITIZEN_RESCUE_COUNT);
    this.populateMesaEncounters(showToast);
    if (showToast) {
      queueMicrotask(() => {
        if (citizens > 0) {
          this.ui.toast(`${citizens} citizens in distress nearby — look for orange beacons! Run into them to rescue.`, 'synergy');
        }
      });
    }
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
    this.applySceneLighting(0);
  }

  _getBaseLightingIntensities(nightFactor = 0) {
    if (nightFactor <= 0) {
      return {
        hemi: SCENE_DAY_HEMI_INTENSITY,
        ambient: SCENE_DAY_AMBIENT_INTENSITY,
        sun: SCENE_DAY_SUN_INTENSITY,
      };
    }
    const dayT = 1 - nightFactor;
    return {
      hemi: SCENE_NIGHT_HEMI_INTENSITY + (SCENE_DAY_HEMI_INTENSITY - SCENE_NIGHT_HEMI_INTENSITY) * dayT,
      ambient: SCENE_NIGHT_AMBIENT_INTENSITY + (SCENE_DAY_AMBIENT_INTENSITY - SCENE_NIGHT_AMBIENT_INTENSITY) * dayT,
      sun: SCENE_NIGHT_SUN_INTENSITY + (SCENE_DAY_SUN_INTENSITY - SCENE_NIGHT_SUN_INTENSITY) * dayT,
    };
  }

  applySceneLighting(nightFactor = 0) {
    const base = this._getBaseLightingIntensities(nightFactor);
    const m = this._devLightMult;
    this.hemiLight.intensity = base.hemi * m.hemi;
    this.ambientLight.intensity = base.ambient * m.ambient;
    this.sunLight.intensity = base.sun * m.sun;
  }

  devSetLightMult(axis, value) {
    if (Object.hasOwn(this._devLightMult, axis)) {
      this._devLightMult[axis] = Math.max(0, Math.min(3, value));
    }
    const nightFactor = this.state === 'arena' && this.arena ? this.arena.getNightFactor() : 0;
    this.applySceneLighting(nightFactor);
  }

  devResetLightMult() {
    this._devLightMult = { hemi: 1, ambient: 1, sun: 1 };
    const nightFactor = this.state === 'arena' && this.arena ? this.arena.getNightFactor() : 0;
    this.applySceneLighting(nightFactor);
  }

  getDevLightMult() {
    return { ...this._devLightMult };
  }

  applyVillageScene() {
    this.setSkyColor(VILLAGE_SKY);
    this.applyDaylight();
    this.setShadowFrustum(120);
  }

  setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xb8dcf0, 0xe8d8b0, SCENE_DAY_HEMI_INTENSITY);
    this.scene.add(this.hemiLight);
    this.ambientLight = new THREE.AmbientLight(0xfff4e8, SCENE_DAY_AMBIENT_INTENSITY);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xfff8e8, SCENE_DAY_SUN_INTENSITY);
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
    if (!this._combatReady) return [];
    return [
      this.enemies,
      this.projectiles,
      this.gems,
      this.interactables,
      this.citizenRescue,
      this.arenaBurger,
      this.objectiveArrow3D,
      this.familiars,
      this.fireTrail,
      this.zonkDomes,
      this.rifts,
      this.synergy,
      this.particles,
      this.blastRadiusFx,
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
    this._syncTouchControls();
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
    if (action === 'leaderboard') {
      this.ui.showLeaderboard(() => {
        this.ui.removeScreens();
        this.ui.showTitle((a) => this.handleTitleAction(a));
        queueMicrotask(() => this._tryShowTutorial({ force: true }));
      });
      return;
    }
    this.audio.resume();
    this.pendingAction = action;
    this.ui.removeScreens();
    this._charSelectOpen = true;
    this.ui.showCharacterSelect(
      () => {
        this._charSelectOpen = false;
        if (this.pendingAction === 'village') {
          this.ui.removeScreens();
          this.enterVillage();
        } else {
          this._beginNewArenaRun();
        }
      },
      () => {
        this._charSelectOpen = false;
        this.ui.removeScreens();
        this.ui.showTitle((a) => this.handleTitleAction(a));
        queueMicrotask(() => this._tryShowTutorial({ force: true }));
      }
    );
    queueMicrotask(() => this._tryShowTutorial({ force: true }));
  }

  enterVillage() {
    this._ensureCombatManagers();
    this._ensureVillage();
    this.village.refreshForReputation();
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
    syncDailyChallengeDay();
    this.quests.assignNewQuests();
    this.audio.playMusic('village');
    this.clearRunRng();
    this._tutorialShownStep = getTutorialStepIndex() - 1;
    this._tryShowTutorial({ force: true });
  }

  _beginNewArenaRun({ fromVillagePortal = false, keepBiome = false, quickRetry = false, onCancel } = {}) {
    const start = (runModifiers) => {
      this.ui.removeScreens();
      this.startArena({ fromVillagePortal, keepBiome, quickRetry, runModifiers });
    };
    if (!RUN_MODIFIERS_ENABLED || quickRetry) {
      start(null);
      return;
    }
    this.ui.showRunModifierPicker(
      (selection) => start(selection),
      () => {
        if (onCancel) onCancel();
        else this.ui.removeScreens();
      }
    );
  }

  startArena({ keepBiome = false, quickRetry = false, fromVillagePortal = false, runModifiers = null } = {}) {
    this._gameOverActive = false;
    this._ensureCombatManagers();
    this._ensureArena();
    saveData.data.runSnapshot = null;
    this.transitionTo('arena');
    this._pendingRunModifiers = runModifiers;
    this.resetRun();
    this.quests.assignNewQuests();
    this.ui.clear();
    this.ui.buildHUD();
    this._applyBiome(keepBiome && this.currentBiome ? this.currentBiome : this._resolveStartBiome());
    this.enemies.setBiome(this.currentBiome?.id ?? 'grass');
    this._deferArenaFieldSetup(true);
    this.player.position.set(0, 0, 0);
    this.player.mesh.visible = true;
    this.cameraController.reset();
    saveData.data.totalRuns++;
    saveData.save();
    this.ui.toast(`Entering ${this.currentBiome.name}`, 'synergy');
    const char = CHARACTERS.find((c) => c.id === this.player.characterId);
    if (char?.perks?.length) {
      queueMicrotask(() => this.ui.toast(`${char.icon} ${char.perks.slice(0, 2).join(' · ')}`, 'synergy'));
    }
    const perkToast = formatVillagePerksToast(this._activeVillagePerks);
    if (perkToast) {
      queueMicrotask(() => this.ui.toast(`Village blessings: ${perkToast}`, 'synergy'));
    }
    const modToast = formatRunModifiersToast(this._activeRunModifiers);
    if (modToast) {
      queueMicrotask(() => this.ui.toast(`Run contract: ${modToast}`, 'synergy'));
    }
    if (shouldShowTutorial() && !fromVillagePortal && !quickRetry) {
      skipTutorialStepsUntil('move');
    }
    this._tutorialShownStep = getTutorialStepIndex() - 1;
    this._tryShowTutorial({ force: true });
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
    this._runBosses = 0;
    this._runRiftsEntered = 0;
    this._runMaxCombo = 0;
    this._runBurgers = 0;
    this._runGobbles = 0;
    this._runCitizens = 0;
    this._objectiveArrowKind = null;
    this._runNova = false;
    this._wasInRift = false;
    this._citizenRespawnTimer = 0;
    this._burgerSpawnTimer = 0;
    this._burgerSpawnedOnce = false;
    this._gobbleSirenActive = false;
    this._tutorialMoveDist = 0;
    this._tutorialFlags = this._initTutorialFlags();
    this._hitStopTimer = 0;
    this._bossTelegraph = null;
    this._tutorialShownStep = getCurrentTutorialStep() ? getTutorialStepIndex() : -1;
    this.initRunRng();
    this.arena?.applyTerrainRelief(this.runSeed);
    this.ui.dismissLevelUp();
    this.player.characterId = saveData.data.selectedCharacter;
    this.player.reset();
    this._activeVillagePerks = applyVillagePerksToRun(this.player, this);
    this.runModifierEnemyHpMult = 1;
    this.runModifierEnemySpeedMult = 1;
    this._activeRunModifiers = null;
    if (this._pendingRunModifiers) {
      applyRunModifiers(this.player, this, this._pendingRunModifiers);
      this._activeRunModifiers = { ...this._pendingRunModifiers };
      this._pendingRunModifiers = null;
    }
    this.resetRunManagers({ upgrades: true, questsRun: true });
    if (this._gobbleSirenActive) {
      this.audio.stopGobbleSiren();
      this._gobbleSirenActive = false;
    }
    this._floatHurtAcc = 0;
    this._floatHealAcc = 0;
    this._floatHurtTimer = 0;
    this._floatHealTimer = 0;
    this._thornVfxTimer = 0;
    this._thornFloatTimer = 0;
    this._thornDmgAccum = 0;
  }

  _updateThorns(dt) {
    const player = this.player;
    if (player.thorns <= 0) return;

    const px = player.position.x;
    const pz = player.position.z;
    const py = player.getViewY?.() ?? player.mesh.position.y;
    const nearby = this.enemies.getNearby(px, pz, THORN_CONTACT_RADIUS);
    if (!nearby.length) return;

    let hitAny = false;
    for (const { enemy } of nearby) {
      const tickDmg = player.thorns * dt;
      const result = this.enemies.damageEnemy(enemy, tickDmg, null);
      if (!result) continue;
      hitAny = true;
      this._thornDmgAccum += tickDmg;
      if (player.lifesteal > 0) player.heal(tickDmg * player.lifesteal);
      if (result.killed) {
        this.combat.handleCombatHit(tickDmg, result, null, enemy, { skipProcs: true, source: 'thorn' });
      }
    }

    if (!hitAny) return;

    this._thornVfxTimer -= dt;
    if (this._thornVfxTimer <= 0) {
      this._thornVfxTimer = THORN_VFX_INTERVAL;
      this.particles.thornSpikesFromPlayer(
        px,
        py,
        pz,
        nearby.map((entry) => entry.enemy)
      );
      this.audio.thornPop();
    }

    this._thornFloatTimer -= dt;
    if (this._thornDmgAccum >= 0.5 && this._thornFloatTimer <= 0) {
      this._thornFloatTimer = THORN_FLOAT_INTERVAL;
      const show = Math.round(this._thornDmgAccum);
      if (show >= 1) {
        this.particles.floatingNumber(px, pz, show, 'thorn', py + 0.55);
      }
      this._thornDmgAccum = 0;
    }
  }

  hideCombat() {
    if (this._gobbleSirenActive) {
      this.audio.stopGobbleSiren();
      this._gobbleSirenActive = false;
    }
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
    if (this.devToolsHoldingPause) return;
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
    if (this.ui.isBossDefeatShowing()) return;
    this.onLevelUp();
  }

  openGameMenu() {
    if (this.modalPause || this.ui.gameMenu.isOpen()) return;
    this.input.releaseCameraLook();
    this.menuPause = true;
    this.paused = true;
    if (this.state === 'village') this._tutorialFlags.villageMenu = true;
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
    this._advanceTutorialAction('village_menu');
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
    this._ensureCombatManagers();
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
    queueMicrotask(() => this._tryShowTutorial({ force: true }));
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
    this.arena?.applyTerrainRelief(this.runSeed ?? 0);
  }

  startArenaFromSnapshot(snap) {
    this._ensureCombatManagers();
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

  applyHitStop(duration = HIT_STOP_CRIT_SECONDS) {
    this._hitStopTimer = Math.max(this._hitStopTimer, duration);
  }

  _pickBossSpawnPoint() {
    const angle = runRandom() * Math.PI * 2;
    const half = ARENA_SIZE / 2 - 6;
    return {
      x: THREE.MathUtils.clamp(
        this.player.position.x + Math.cos(angle) * 20,
        -half,
        half
      ),
      z: THREE.MathUtils.clamp(
        this.player.position.z + Math.sin(angle) * 20,
        -half,
        half
      ),
    };
  }

  _startBossTelegraph() {
    this.bossCount++;
    const { x, z } = this._pickBossSpawnPoint();
    this._bossTelegraph = { x, z, timer: BOSS_TELEGRAPH_SECONDS, pulse: 0 };
    this._tutorialFlags.boss = true;
    this._tryShowTutorial();
    this.audio.zonkDomeWarn();
    this.ui.toast(
      `☠️ ZONK LORD #${this.bossCount} inbound — ${BOSS_TELEGRAPH_SECONDS}s!`,
      'synergy'
    );
    this.particles.burst(x, z, 0xff2244);
  }

  _finishBossSpawn(x, z) {
    const hpMult = this.runModifierEnemyHpMult ?? 1;
    const speedMult = this.runModifierEnemySpeedMult ?? 1;
    this.enemies.spawnBoss(x, z, this.player.getEffectiveDamage(), hpMult, speedMult);
    this.audio.boss();
    this.cameraController.addShake(0.85);
    this.ui.showBossIntro(this.bossCount);
    this.particles.burst(x, z, 0xff2244, 18);
    this.particles.burst(x, z, 0xff8844, 10);
    this.ui.toast(`⚠️ ZONK LORD #${this.bossCount} APPROACHES!`, 'synergy');
    this.bossTimer = 0;
  }

  _onBossPhase2(enemy) {
    this.audio.bossEnrage();
    this.cameraController.addShake(0.55);
    this.particles.burst(enemy.x, enemy.z, 0xff1144, 16);
    this.ui.toast('☠️ ZONK LORD ENRAGES!', 'synergy');
  }

  spawnBoss() {
    const { x, z } = this._pickBossSpawnPoint();
    this.bossCount++;
    this._finishBossSpawn(x, z);
  }

  _checkTutorial() {
    this._tryShowTutorial();
  }

  _checkTutorialHotkey() {
    if (this.modalPause || this.ui.isLevelUpOpen() || this.ui.gameMenu.isOpen()) return;
    if (!this.input.wasPressed('KeyH')) return;
    if (!enableTutorialHints()) return;
    this.ui.toast('Tutorials re-enabled', 'synergy');
    this._tutorialShownStep = getTutorialStepIndex() - 1;
    this._tryShowTutorial({ force: true });
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

  _onBurgerEaten() {
    this._burgerSpawnTimer = 0;
    this._runBurgers += 1;
    this.quests.track('burgers');
    this._tutorialFlags.burgerFrenzy = true;
    this._tryShowTutorial();
    this.audio.burgerFrenzy();
    this.audio.startGobbleSiren();
    this._gobbleSirenActive = true;
    this.particles.burst(this.player.position.x, this.player.position.z, 0xffcc44, 22);
    this.cameraController.addShake(0.14);
    this.ui.toast(`🍔 GOBBLE MODE! ${ARENA_BURGER_FRENZY_SEC}s — chomp fleeing monsters!`, 'synergy');
  }

  _onCitizenRescued(citizen) {
    this.runCoins += CITIZEN_RESCUE_COINS;
    this._runCitizens += 1;
    this.quests.track('citizens');
    this._tutorialFlags.citizenRescue = true;
    this._tryShowTutorial();
    const levelsGained = this.player.addXp(CITIZEN_RESCUE_XP);
    this.audio.citizenTeleportSfx();
    this.particles.burst(citizen.x, citizen.z, citizen.color ?? 0x6b4fd4, 16);
    this.cameraController.addShake(0.1);
    const remaining = this.citizenRescue.aliveCount;
    const left = remaining > 0 ? ` (${remaining} left)` : ' — all safe!';
    this.ui.toast(`Citizen rescued! +${CITIZEN_RESCUE_COINS} coins${left}`, 'synergy');
    if (levelsGained > 0) this.queueLevelUp(levelsGained);
  }

  _pickArenaInteractTarget(px, pz) {
    const nearCitizen = this.citizenRescue.getNearest(px, pz);
    const nearItem = this.interactables.getNearest(px, pz);
    if (nearCitizen && nearItem) {
      const cDist = Math.hypot(nearCitizen.x - px, nearCitizen.z - pz);
      const iDist = Math.hypot(nearItem.x - px, nearItem.z - pz);
      if (cDist <= iDist) return { kind: 'citizen', target: nearCitizen };
      return { kind: 'item', target: nearItem };
    }
    if (nearCitizen) return { kind: 'citizen', target: nearCitizen };
    if (nearItem) return { kind: 'item', target: nearItem };
    return null;
  }

  _interactPromptLabel(target, kind) {
    if (kind === 'citizen') return '[F] Rescue Citizen';
    if (target.type === 'chest') return '[F] Open Chest';
    if (target.type === 'mesa_cache') return '[F] Claim Mesa Treasure';
    if (target.type === 'village_portal') return '[F] Return to Village (bank coins)';
    return '[F] Ascension Shrine';
  }

  _getInteractCallbacks() {
    return {
      onChest: () => { this.quests.track('chests'); this.audio.openChest(); },
      onChestBurst: (x, y, z) => {
        this.particles.chestBurstAt(x, y, z);
        this.audio.chestBurstSfx();
        this.cameraController.addShake(0.12);
      },
      onPot: () => { this.quests.track('pots'); },
      onPotBurst: (x, y, z) => {
        this.particles.potBurstAt(x, y, z);
        this.audio.potBreakSfx();
        this.cameraController.addShake(0.08);
      },
      onMesaCache: () => { this.quests.track('chests'); this.audio.mesaCacheOpen(); },
      onMesaCacheBurst: (x, y, z) => {
        this.audio.mesaTreasureBurstSfx();
        this.cameraController.addShake(0.32);
        this.particles.treasureBurstAt(x, y, z);
      },
      onShrine: () => {
        this.quests.track('shrines');
        this.ui.toast('Power surges through you!');
      },
      onCoins: (v) => { this.runCoins += v; },
      onToast: (msg) => this.ui.toast(msg),
    };
  }

  _handleInteractResult(result) {
    if (!result) return;
    if (result.type === 'pot' || result.type === 'chest' || result.type === 'shrine' || result.type === 'mesa_cache') {
      this._tutorialFlags.interact = true;
      this._tryShowTutorial();
    }
    if (result.loot || result.preview) {
      if (!result.levelsGained) {
        this.ui.pushReward({
          icon: result.icon || '🎁',
          name: result.name || result.loot?.label || 'Reward',
          stats: result.preview || [],
          player: this.player,
        });
      }
    }
    if (result.label) this.ui.toast(result.label);
    if (result.levelsGained) this.queueLevelUp(result.levelsGained);
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
    this.combat.beginFrame();
    this.quests.update(dt, this.player, {
      wave: this.arena.getWave(this.elapsed),
      runCoins: this.runCoins,
    });

    const nightFactor = this.arena.getNightFactor();
    const diffSetting = getDifficultyFromId(saveData.data.settings.difficulty);
    const diffMult = (1 + nightFactor * 0.5 + (this.inRift ? 1 : 0)) * diffSetting.spawnMult;

    this.applySceneLighting(nightFactor);

    if (this.currentBiome?.sky) {
      const daySky = new THREE.Color(this.currentBiome.sky);
      const nightSky = daySky.clone().multiplyScalar(0.3);
      this.scene.background.copy(daySky).lerp(nightSky, nightFactor);
    }

    this.arena.update(dt, this.elapsed);
    this.player.update(dt, this.input, this.arena, this.cameraController.yaw);

    const moveDist = Math.hypot(this.player.velocity.x, this.player.velocity.z) * dt;
    if (moveDist > 0.01) {
      this._tutorialMoveDist += moveDist;
      if (this._tutorialMoveDist > 3) this._tutorialFlags.move = true;
    }
    if (this.player.combo > this._runMaxCombo) this._runMaxCombo = this.player.combo;

    const wasInRift = this.inRift;
    this.inRift = this.rifts.isPlayerInside(this.player.position.x, this.player.position.z);
    if (this.inRift && !wasInRift) {
      this._runRiftsEntered++;
      this._tutorialFlags.rift = true;
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
      this.player.position, this.elapsed, this.inRift, diffMult, dt,
      diffSetting.hpMult * (this.runModifierEnemyHpMult ?? 1),
      this.player.getEffectiveDamage(), this.pendingGigaSpawn,
      this.runModifierEnemySpeedMult ?? 1
    );
    if (spawnResult.spawned > 0 && this.pendingGigaSpawn) {
      this.pendingGigaSpawn = false;
      this.gigaSpawnSurvivalTimer = 12;
      this.audio.boss();
      this.ui.toast(`🌊 GIGASPAWN — ${spawnResult.groupSize} monsters!`, 'synergy');
    }

    if (this._bossTelegraph) {
      this._bossTelegraph.timer -= dt;
      this._bossTelegraph.pulse += dt;
      if (this._bossTelegraph.pulse >= 0.45) {
        this._bossTelegraph.pulse = 0;
        this.particles.burst(this._bossTelegraph.x, this._bossTelegraph.z, 0xff5533, 8);
      }
      if (this._bossTelegraph.timer <= 0) {
        const { x, z } = this._bossTelegraph;
        this._bossTelegraph = null;
        this._finishBossSpawn(x, z);
      }
    } else {
      this.bossTimer += dt;
      if (this.bossTimer >= BOSS_SPAWN_INTERVAL - BOSS_TELEGRAPH_SECONDS) {
        this._startBossTelegraph();
      }
    }

    this.enemies.setThreatDamage(this.player.getEffectiveDamage());
    this.enemies.update(dt, this.player.position, this.arena, {
      fleeFromPlayer: this.player.burgerFrenzyTimer > 0,
      fleeSpeedMult: ARENA_BURGER_FLEE_SPEED_MULT,
    });

    this.combat.tryAutoFire();

    this.projectiles.update(
      dt,
      this.enemies,
      this.arena,
      (dmg, result, el, enemy, isCrit, opts = {}) =>
        this.handleCombatHit(dmg, result, el, enemy, { isCrit, ...opts }),
      (x, y, z, radius, element) => this.blastRadiusFx.spawn(x, y, z, radius, element)
    );
    this.blastRadiusFx.update(dt);

    const { xp, gems } = this.gems.update(dt, this.player);
    if (gems > 0) this.quests.track('gems', gems);
    if (xp > 0) {
      const levels = this.player.addXp(xp);
      if (levels > 0) this.queueLevelUp(levels);
    }

    this._updateThorns(dt);

    this.familiars.setCount(this.player.familiars, this.player.getAttackRate());
    this.familiars.update(
      dt,
      this.player.position,
      this.enemies,
      this.player.getAttackRate(),
      {
        playerY: this.player.mesh.position.y,
        player: this.player,
        onHit: (dmg, result) => this.handleCombatHit(dmg, result, 'lightning', null),
        onZap: () => this.audio.familiarZap(),
      }
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

    this.enemies.flushInstances();
    this.combat.flushHordeCombat();

    const gobbling = this.player.burgerFrenzyTimer > 0;
    if (gobbling) {
      if (!this._gobbleSirenActive) {
        this.audio.startGobbleSiren();
        this._gobbleSirenActive = true;
      }
      const eaten = this.enemies.gobbleFleeing(
        this.player.position.x,
        this.player.position.z,
        ARENA_BURGER_GOBBLE_RADIUS
      );
      if (eaten.length > 0) {
        this.cameraController.addShake(0.03 + Math.min(eaten.length * 0.007, 0.055));
      }
      let chompLabels = 0;
      for (let i = 0; i < eaten.length; i++) {
        const result = eaten[i];
        const { x, z } = result.pos;
        const y = (result.pos.y ?? 0) + (result.scale ?? 1) * 0.35;
        this.particles.gobbleBurstAt(
          x,
          z,
          this.player.position.x,
          this.player.position.z,
          y,
          result.ghostColor ?? 0x6eb5ff,
          result.scale ?? 1
        );
        const healAmt = gobbleHealForType(result.type);
        this.player.heal(healAmt);
        if (chompLabels < 8) {
          this.particles.floatingNumber(x, z, 'CHOMP!', 'chomp', y + 0.35);
          this.particles.floatingNumber(x, z, healAmt, 'heal', y + 0.55);
          chompLabels++;
        }
        this.audio.gobbleEat(i, eaten.length);
        this._runGobbles += 1;
        this.quests.track('gobbles');
        this.handleCombatHit(1, result, null, null);
      }
    } else if (this._gobbleSirenActive) {
      this.audio.stopGobbleSiren();
      this._gobbleSirenActive = false;
    }

    if (!gobbling) {
      const contact = this.enemies.checkPlayerCollision(
        this.player.position.x, this.player.position.z, 0.8, diffMult
      );
      if (contact.damage > 0) {
        const dead = this.player.takeDamage(contact.damage);
        if (dead) { this.gameOver(this._deathCauseFromEnemy(contact.killer)); return; }
      }
    }

    this.interactables.update(dt, this.player.position.x, this.player.position.z);
    this.citizenRescue.update(dt, this.player.position.x, this.player.position.z);
    this.arenaBurger.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      this.arena,
      this.player
    );
    if (!this.arenaBurger.burger && !this.arenaBurger.eating) {
      this._burgerSpawnTimer += dt;
      const respawnCut = this.player._burgerRespawnReductionSec ?? 0;
      const delay = this._burgerSpawnedOnce
        ? Math.max(60, ARENA_BURGER_RESPAWN_SEC - respawnCut)
        : ARENA_BURGER_FIRST_SPAWN_SEC;
      if (this._burgerSpawnTimer >= delay) {
        this._burgerSpawnTimer = 0;
        if (this.arenaBurger.trySpawn(this.arena)) {
          this._burgerSpawnedOnce = true;
          this.audio.burgerAppear();
          const citizensWaiting = this.citizenRescue.aliveCount;
          if (citizensWaiting > 0) {
            this.ui.toast(
              '🍔 Golden burger! Yellow arrow takes priority — rescue citizens after gobble mode!',
              'synergy'
            );
          } else {
            this.ui.toast(
              '🍔 Golden burger! Follow the yellow arrow — eat it to scare the horde!',
              'synergy'
            );
          }
        }
      }
    }
    if (this.citizenRescue.citizens.length === 0) {
      this._citizenRespawnTimer += dt;
      if (this._citizenRespawnTimer >= CITIZEN_RESCUE_RESPAWN_SEC) {
        this._citizenRespawnTimer = 0;
        if (this.citizenRescue.spawnOne(this.arena)) {
          this.ui.toast('A citizen in distress appeared — follow the orange beacon!', 'synergy');
        }
      }
    } else {
      this._citizenRespawnTimer = 0;
    }
    const px = this.player.position.x;
    const pz = this.player.position.z;
    if (!this.paused) {
      const autoPot = this.interactables.getNearestPot(px, pz);
      if (autoPot) {
        this._handleInteractResult(this.interactables.interact(autoPot, this.player, this._getInteractCallbacks()));
      }
      const interact = this._pickArenaInteractTarget(px, pz);
      if (interact?.kind === 'citizen') {
        if (this.citizenRescue.startRescue(interact.target)) {
          this.audio.ui();
        }
        this.ui.showInteractPrompt(false);
      } else if (interact?.target?.type === 'village_portal') {
        // Portal sits on spawn — keep F so runs do not exit immediately.
        this.ui.showInteractPrompt(true, this._interactPromptLabel(interact.target, interact.kind));
        if (this.input.wasPressed('KeyF')) {
          this.audio.ui();
          this.leaveArenaForVillage();
        }
      } else if (interact) {
        this._handleInteractResult(
          this.interactables.interact(interact.target, this.player, this._getInteractCallbacks())
        );
        this.ui.showInteractPrompt(false);
      } else if (this.interactables.getNearestMesaBeacon(px, pz)) {
        // Purple crystal is a guardian marker, not loot — gold mesa_cache drops after kill.
        this.ui.showInteractPrompt(true, 'Defeat the Mesa Guardian to unlock treasure');
      } else {
        this.ui.showInteractPrompt(false);
      }
    } else {
      this.ui.showInteractPrompt(false);
    }

    const questComplete = this.quests.flushCompletions();
    if (questComplete) {
      this.audio.quest();
      this.ui.toast(`Quest complete! +${questComplete.reward} coins`, 'synergy');
    }

    this._flushPlayerFloatNumbers(dt);
    this._checkTutorial();

    this.zonkDomes.update(dt, this.player, this.arena, this.elapsed, {
      onWarn: () => {
        this.audio.zonkDomeKlaxon();
        this.ui.showRunAlert(ZONK_DOME_GROW_TIME * 1000);
      },
      onFollowupWarn: () => {
        this.audio.zonkDomeKlaxon();
        this.ui.showRunAlert(ZONK_DOME_GROW_TIME * 1000);
      },
      onPop: (dome) => {
        this.ui.hideRunAlert();
        this.audio.zonkDomePop();
        const isFollowup = dome.isFollowup;
        const kb = isFollowup ? 18 : 22;
        const dmgMult = isFollowup ? ZONK_DOME_FOLLOWUP_DAMAGE_MULT : 1;
        this.player.applyKnockback(dome.cx, dome.cz, kb);
        const dmg = Math.max(8, Math.floor(this.player.maxHp * 0.18 * dmgMult));
        const dead = this.player.takeDamage(dmg, { forced: true });
        this.particles.burst(this.player.position.x, this.player.position.z, isFollowup ? 0xcc66ff : 0xff44ff);
        if (dead) { this.gameOver({ icon: '🔮', label: 'Zonk Dome' }); return; }
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
        burgerTarget: this.arenaBurger?.getTarget(),
        burgerDist: this.arenaBurger?.getNearestDist(
          this.player.position.x,
          this.player.position.z
        ),
        burgerFrenzySec: this.player.burgerFrenzyTimer,
        cameraYaw: this.cameraController.yaw,
      }
    );
    const citizenTarget = this.citizenRescue?.getNearestTarget(px, pz);
    const burgerDist = this.arenaBurger?.getNearestDist(px, pz);
    const burgerTarget = this.arenaBurger?.getTarget();
    let burgerCountdownSec = null;
    if (!this.arenaBurger?.burger && !this.arenaBurger?.eating) {
      const respawnCut = this.player._burgerRespawnReductionSec ?? 0;
      const burgerDelay = this._burgerSpawnedOnce
        ? Math.max(60, ARENA_BURGER_RESPAWN_SEC - respawnCut)
        : ARENA_BURGER_FIRST_SPAWN_SEC;
      burgerCountdownSec = Math.max(0, burgerDelay - this._burgerSpawnTimer);
    }

    const burgerForArrow = burgerTarget && (burgerDist ?? Infinity) >= OBJECTIVE_ARROW_HIDE_DIST
      ? burgerTarget
      : null;
    const citizenForArrow = !burgerForArrow && citizenTarget && citizenTarget.dist >= OBJECTIVE_ARROW_HIDE_DIST
      ? { x: citizenTarget.x, z: citizenTarget.z }
      : null;
    const arrowKind = burgerForArrow ? 'burger' : (citizenForArrow ? 'citizen' : null);
    if (arrowKind && arrowKind !== this._objectiveArrowKind) {
      if (arrowKind === 'citizen' && this._objectiveArrowKind === 'burger') {
        this.ui.toast('Orange arrow back — citizens need rescue!', 'synergy');
      }
      this._objectiveArrowKind = arrowKind;
    } else if (!arrowKind) {
      this._objectiveArrowKind = null;
    }
    this.objectiveArrow3D?.update(
      dt,
      this.camera,
      px,
      pz,
      citizenForArrow,
      burgerForArrow
    );

    const gobbleSec = this.player.burgerFrenzyTimer > 0 ? this.player.burgerFrenzyTimer : null;
    const burgerArrowActive = burgerForArrow != null;
    this.ui.updateObjectiveArrows({
      burgerCountdownSec,
      gobbleSec,
      citizen: !burgerArrowActive && citizenTarget
        ? {
          distance: citizenTarget.dist,
          hideClose: citizenTarget.dist < OBJECTIVE_ARROW_HIDE_DIST,
        }
        : null,
      burger: burgerTarget && burgerDist != null
        ? {
          distance: burgerDist,
          hideClose: burgerDist < OBJECTIVE_ARROW_HIDE_DIST,
        }
        : null,
    });
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
          this._tutorialFlags.villageQuests = true;
          this.ui.showQuestBoard(this.quests, () => {});
        } else if (npc.id === 'trainer') {
          this._tutorialFlags.villageSkills = true;
          this._advanceTutorialAction('village_skills');
          this.ui.showSkillTree(() => {
            this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
            queueMicrotask(() => this._tryShowTutorial({ force: true }));
          });
        } else if (npc.id === 'merchant') {
          this._tutorialFlags.villageMerchant = true;
          const perks = getActiveVillagePerks();
          const merchantPerk = perks.find((p) => p.id === 'merchant');
          this.ui.toast(
            merchantPerk
              ? `Bonk Merchant: "${merchantPerk.desc} is active when you enter the arena."`
              : `Bonk Merchant: "Reach 25 reputation — I'll stash coins on your next arena run!"`,
            'synergy',
          );
        } else if (npc.id === 'shrine') {
          const perks = getActiveVillagePerks();
          const shrinePerk = perks.find((p) => p.id === 'shrine');
          this.ui.toast(
            shrinePerk
              ? `Ascension Shrine: "${shrinePerk.desc} — arena blessing active."`
              : `Ascension Shrine: ${saveData.data.reputation} reputation — unlocks arena XP blessing at 50 rep.`,
            'synergy',
          );
        } else if (npc.id === 'portal') {
          this._tutorialFlags.villagePortal = true;
          if (saveData.data.runSnapshot?.pausedInVillage) {
            this.ui.showArenaPortalChoice(
              () => this.resumeArenaRun(),
              () => {
                saveData.data.runSnapshot = null;
                saveData.save();
                this.ui.showCharacterSelect(
                  () => this._beginNewArenaRun({ fromVillagePortal: true }),
                  () => { this.ui.removeScreens(); }
                );
              },
              () => { this.ui.removeScreens(); }
            );
          } else {
            this.ui.showCharacterSelect(
              () => this._beginNewArenaRun({ fromVillagePortal: true }),
              () => { this.ui.removeScreens(); }
            );
          }
        }
      }
    } else {
      this.ui.showInteractPrompt(false);
    }
    this._tryShowTutorial();
  }

  updateCameraInput() {
    if (this.menuPause || this.modalPause || this.devToolsHoldingPause) {
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
          this._tutorialFlags.levelup = true;
        } finally {
          this.modalPause = false;
          this.paused = false;
          this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
          this._syncTouchControls();
          this.flushPendingLevelUp();
        }
      });
      if (!shown) return;
      this._syncTouchControls();
      this.audio.levelUp();
      this.cameraController.addShake(0.32);
      this.applyHitStop(0.055);
      this.modalPause = true;
      this.paused = true;
    } catch (err) {
      ErrorReporter.capture('UPGRADE_UI', err, this.getErrorContext());
      this.ui.dismissLevelUp();
      this.modalPause = false;
      this.paused = false;
    }
  }

  _deathCauseFromEnemy(enemy) {
    if (!enemy) return { icon: '💀', label: 'The horde' };
    if (enemy.isMesaGuardian) return { icon: '🏔️', label: 'Mesa Guardian' };
    if (enemy.isBoss) return { icon: '👹', label: 'Zonk Lord' };
    const labels = {
      grunt: 'Grunt',
      runner: 'Runner',
      brute: 'Brute',
      elite: 'Elite',
      wisp: 'Wisp',
      frostling: 'Frostling',
      ember: 'Ember',
    };
    return { icon: '💀', label: labels[enemy.type] || 'Horde' };
  }

  gameOver(cause = { icon: '💀', label: 'Unknown' }) {
    if (this._gameOverActive) return;
    this._gameOverActive = true;
    this.player.hp = 0;
    this.ui.updateLowHpVignette(0);
    const hpBar = document.getElementById('hp-bar');
    if (hpBar) hpBar.style.width = '0%';
    this.modalPause = true;
    this.paused = true;
    this.input.releaseCameraLook();
    this._syncTouchControls();
    this.ui.hideTutorial();
    const coins = this.bankRunCoins();
    saveData.data.runSnapshot = null;
    saveData.data.totalKills += this.player.kills;
    const isNewBestTime = this.elapsed > saveData.data.bestTime;
    if (isNewBestTime) saveData.data.bestTime = this.elapsed;
    const prevBestKills = saveData.data.bestKills ?? 0;
    const isNewBestKills = this.player.kills > prevBestKills;

    saveData.recordRunEntry({
      time: this.elapsed,
      kills: this.player.kills,
      level: this.player.level,
      bosses: this._runBosses,
      maxCombo: this._runMaxCombo,
      biome: this.currentBiome?.name ?? '—',
      character: this.player.characterId,
      coins,
    });
    trySubmitGlobalRun({
      time: this.elapsed,
      kills: this.player.kills,
      level: this.player.level,
      character: this.player.characterId,
      biome: this.currentBiome?.name ?? '—',
    });

    const dailyBonus = tryCompleteDailyChallenge(this.elapsed);
    const runStats = {
      kills: this.player.kills,
      time: this.elapsed,
      bosses: this._runBosses,
      rifts: this._runRiftsEntered,
      novaTriggered: this._runNova,
      maxCombo: this._runMaxCombo,
      totalRuns: saveData.data.totalRuns,
      completedQuests: saveData.data.completedQuests.length,
      dailyCompleted: dailyBonus > 0,
    };
    const newAchievements = checkRunAchievements(runStats);
    saveData.recordRunStats({
      bosses: Math.max(saveData.data.runStats.bosses, this._runBosses),
      rifts: Math.max(saveData.data.runStats.rifts, this._runRiftsEntered),
      maxCombo: Math.max(saveData.data.runStats.maxCombo, this._runMaxCombo),
      novaTriggered: saveData.data.runStats.novaTriggered || this._runNova,
    });

    this.ui.showRunSummary({
      time: this.elapsed,
      level: this.player.level,
      kills: this.player.kills,
      coins,
      bosses: this._runBosses,
      maxCombo: this._runMaxCombo,
      burgers: this._runBurgers,
      gobbles: this._runGobbles,
      citizens: this._runCitizens,
      biome: this.currentBiome?.name,
      bestTime: saveData.data.bestTime,
      isNewBestTime,
      isNewBestKills,
      buffs: getActiveBuffs(this.player),
      newAchievements,
      dailyBonus,
      deathCause: cause,
    }, (action) => {
      this.ui.removeScreens();
      if (action === 'retry') {
        this.startArena({ keepBiome: true, quickRetry: true });
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
    const rawDt = Math.min(this.timer.getDelta(), 0.05);
    let dt = rawDt;
    if (this._hitStopTimer > 0) {
      dt = rawDt * 0.05;
      this._hitStopTimer -= rawDt;
    }
    this.cameraController.tickShake(rawDt);

    const inWorld = this.state === 'arena' || this.state === 'village';
    const gameplay = inWorld
      && !this.modalPause
      && !this.paused
      && !this.ui.gameMenu.isOpen()
      && !this.ui.isLevelUpOpen();
    this.input.setGameplayEnabled(gameplay);
    this.input.setInvertLookY(saveData.data.settings.invertMouseY);
    this.input.pollGamepad(dt, {
      menuNav: this.ui.hasModalScreen() || this.ui.gameMenu.isOpen(),
    });

    if (!this.modalPause && !this.ui.isLevelUpOpen() && !this.ui.gameMenu.isOpen()) {
      this._checkTutorialHotkey();
    }

    if (this.state === 'arena') {
      this.updateArena(dt);
      this.recoverStuckModalPause();
      this.flushPendingLevelUp();
      if (this.particles && this.enemies && !this.paused) {
        this.particles.update(dt, this.camera, this.renderer, this.enemies.enemies);
      }
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

  devClearSkills() {
    saveData.clearSkillLevels();
    if (this.state === 'village') {
      this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
    }
    this.ui.toast('Dev: skill tree cleared', 'synergy');
  }

  devForceLevelUp() {
    if (this.state !== 'arena') return;
    const levels = this.player.addXp(this.player.xpToNext, { ignorePickupMult: true });
    if (levels > 0) this.queueLevelUp(levels);
    this.flushPendingLevelUp();
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

  devToggleGodMode() {
    this.player.devGodMode = !this.player.devGodMode;
    this.ui.toast(this.player.devGodMode ? 'Dev: God mode ON' : 'Dev: God mode OFF', 'synergy');
  }

  enableDevPanel({ announce = false } = {}) {
    if (this.devPanel) return;
    this.devPanel = new DevPanel(this);
    if (announce) {
      this.ui.toast('Dev access granted. Shhh.', 'synergy');
    }
  }

  beginDevToolsPause() {
    if (this._devToolsPauseHold === 0) {
      this._devPauseSnapshot = { paused: this.paused, modalPause: this.modalPause };
    }
    this._devToolsPauseHold += 1;
    if (this.state !== 'arena' || this.ui.isLevelUpOpen()) return;
    this.devToolsHoldingPause = true;
    this.paused = true;
    this.modalPause = false;
  }

  endDevToolsPause() {
    this._devToolsPauseHold = Math.max(0, this._devToolsPauseHold - 1);
    if (this._devToolsPauseHold > 0) return;
    this.devToolsHoldingPause = false;
    if (this.state !== 'arena' || this.ui.isLevelUpOpen()) {
      this._devPauseSnapshot = null;
      return;
    }
    const snap = this._devPauseSnapshot;
    this._devPauseSnapshot = null;
    if (!snap) return;
    this.paused = snap.paused;
    this.modalPause = snap.modalPause;
  }

  devSetRunPaused(paused) {
    if (this.state !== 'arena' || this.ui.isLevelUpOpen()) return;
    this.paused = !!paused;
    this.modalPause = false;
  }

  devToggleRunPause() {
    if (this.state !== 'arena' || this.ui.isLevelUpOpen()) return null;
    this.paused = !this.paused;
    this.modalPause = false;
    return this.paused;
  }

  devIsRunPaused() {
    return this.state === 'arena' && this.paused && !this.ui.isLevelUpOpen();
  }

  devApplyUpgradeBuff(templateId, rarity = 'legendary') {
    if (this.state !== 'arena') {
      this.ui.toast('Start an arena run to apply buffs', 'warning');
      return false;
    }
    if (!this.player?.runBaseline) {
      this.ui.toast('Run not ready yet', 'warning');
      return false;
    }
    const template = UPGRADE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return false;
    const allowed = template.rarities ?? ['legendary'];
    const pick = allowed.includes(rarity) ? rarity : allowed[allowed.length - 1];
    const offer = buildUpgradeOffer(template, pick);
    this.player.applyUpgrade(offer);
    if (this.familiars) {
      this.familiars.setCount(this.player.familiars, this.player.getAttackRate());
    }
    this.ui.renderBuffBar(this.player);
    return true;
  }

  devRemoveAllBuffs() {
    if (this.state !== 'arena') {
      this.ui.toast('Start an arena run to manage buffs', 'warning');
      return false;
    }
    if (!this.player?.restoreRunUpgradesFromBaseline()) {
      this.ui.toast('Run not ready yet', 'warning');
      return false;
    }
    this.upgrades.reset();
    if (this.familiars) {
      this.familiars.setCount(this.player.familiars, this.player.getAttackRate());
    }
    this.fireTrail?.reset();
    this.ui.renderBuffBar(this.player);
    return true;
  }

  devToggleMegaDamage() {
    this.player.devMegaDamage = !this.player.devMegaDamage;
    this.ui.toast(this.player.devMegaDamage ? 'Dev: Mega damage ON' : 'Dev: Mega damage OFF', 'synergy');
  }

  devFullHeal() {
    if (this.state !== 'arena') return;
    this.player.heal(this.player.maxHp);
    this.ui.toast('Dev: full heal', 'synergy');
  }

  devClearHorde() {
    if (this.state !== 'arena') return;
    let cleared = 0;
    for (const enemy of this.enemies.enemies) {
      if (!enemy.alive) continue;
      this.enemies._despawnEnemy(enemy);
      cleared++;
    }
    this.ui.toast(`Dev: cleared ${cleared} enemies`, 'synergy');
  }

  devFillXp() {
    if (this.state !== 'arena') return;
    const levels = this.player.addXp(this.player.xpToNext * 3, { ignorePickupMult: true });
    if (levels > 0) this.queueLevelUp(levels);
    this.flushPendingLevelUp();
    this.ui.toast(levels > 0 ? `Dev: +${levels} level(s)` : 'Dev: XP filled', 'synergy');
  }

  devAddReputation(amount = 50) {
    saveData.addReputation(amount);
    if (this.state === 'village') {
      this.village.refreshForReputation();
      this.ui.showVillageHUD(saveData.data.zonkCoins, saveData.data.reputation);
    }
    this.ui.toast(`Dev: +${amount} reputation`, 'synergy');
  }

  devUnlockAllCharacters() {
    for (const char of CHARACTERS) {
      if (char.playable !== false) saveData.unlockCharacter(char.id);
    }
    this.ui.toast('Dev: all characters unlocked', 'synergy');
  }

  devResetTutorial() {
    resetTutorialProgress();
    this._tutorialShownStep = -1;
    this._tutorialFlags = this._initTutorialFlags();
    this._tutorialMoveDist = 0;
    this._charSelectOpen = false;
    this.ui.hideTutorial();
    this.returnToTitle();
    this.ui.toast('Dev: tutorial reset — welcome step restored', 'synergy');
    queueMicrotask(() => this._tryShowTutorial({ force: true }));
  }
}
