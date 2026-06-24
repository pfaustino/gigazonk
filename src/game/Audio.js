import { ErrorReporter } from '../lib/ErrorReporter.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._musicVol = 0.3;
    this._sfxVol = 0.3;
    this.masterGain = null;
    this.musicTracks = {};
    this.arenaPlaylist = [];
    this._arenaIndex = -1;
    this._musicAudio = null;
    this.musicTrackId = null;
    this._musicSrc = null;
    this._playlistMode = false;
    this.musicBase = import.meta.env.BASE_URL;
    this.sfxFiles = {};
    this._sfxPool = {};
  }

  _getMusicEl() {
    if (!this._musicAudio) {
      this._musicAudio = new window.Audio();
      this._musicAudio.loop = true;
      this._musicAudio.preload = 'auto';
    }
    return this._musicAudio;
  }

  init() {
    if (this.ctx) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (typeof Ctx !== 'function') {
      throw new Error('Web Audio API not available');
    }
    this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._sfxVol;
      this.masterGain.connect(this.ctx.destination);
    } catch (err) {
      ErrorReporter.capture('AUDIO_INIT', err);
      this.enabled = false;
    }
  }

  async loadSoundManifest() {
    try {
      const res = await fetch(`${this.musicBase}sounds/manifest.json`);
      if (!res.ok) return;
      const data = await res.json();
      this.sfxFiles = data;
      for (const [key, file] of Object.entries(data)) {
        if (typeof file !== 'string') continue;
        const el = new window.Audio(`${this.musicBase}sounds/${file}`);
        el.preload = 'auto';
        this._sfxPool[key] = el;
      }
    } catch (err) {
      ErrorReporter.capture('AUDIO_SFX_MANIFEST', err);
    }
  }

  playSfx(key, volume = 1) {
    if (!this.enabled) return;
    const src = this._sfxPool[key];
    if (!src) return;
    const el = src.cloneNode();
    el.volume = Math.min(1, this._sfxVol * volume);
    el.play().catch(() => {});
  }

  chestBurstSfx() {
    this.playSfx('chestBurst', 0.85);
  }

  mesaTreasureBurstSfx() {
    this.playSfx('mesaTreasureBurst', 1);
  }

  potBreakSfx() {
    this.playSfx('potBreak', 0.9);
  }

  async loadMusicManifest() {
    try {
      const res = await fetch(`${this.musicBase}music/manifest.json`);
      if (!res.ok) return;
      const data = await res.json();
      this.musicTracks = data.tracks ?? {};
      const arena = data.arena ?? data.tracks?.arena;
      if (Array.isArray(arena)) {
        this.arenaPlaylist = arena.filter(Boolean);
      } else if (typeof arena === 'string') {
        this.arenaPlaylist = [arena];
      } else {
        this.arenaPlaylist = [];
      }
    } catch (err) {
      ErrorReporter.capture('AUDIO_MANIFEST', err);
    }
  }

  _playMusicFile(trackId, file, { loop = true, advanceArena = false } = {}) {
    if (!file) return;

    const src = `${this.musicBase}music/${file}`;
    const el = this._getMusicEl();

    if (!advanceArena && this._musicSrc === src && !el.paused) {
      this.musicTrackId = trackId;
      return;
    }

    el.pause();
    el.onended = null;
    el.loop = loop;
    this._playlistMode = !loop;
    el.src = src;
    this._musicSrc = src;
    this.musicTrackId = trackId;
    el.volume = this._musicVolume();
    el.onerror = () => {
      ErrorReporter.capture('AUDIO_TRACK', new Error(`Failed to load ${src}`));
      if (this._musicSrc === src) {
        this._musicSrc = null;
        this.musicTrackId = null;
        this._playlistMode = false;
      }
    };
    if (trackId === 'arena' && this.arenaPlaylist.length > 1) {
      el.onended = () => {
        if (this.musicTrackId === 'arena' && this._playlistMode) {
          this._playNextArenaTrack();
        }
      };
    }
    el.play().catch(() => {});
  }

  _playNextArenaTrack() {
    if (!this.arenaPlaylist.length) return;
    this._arenaIndex = (this._arenaIndex + 1) % this.arenaPlaylist.length;
    const loop = this.arenaPlaylist.length === 1;
    this._playMusicFile('arena', this.arenaPlaylist[this._arenaIndex], {
      loop,
      advanceArena: true,
    });
  }

  playMusic(trackId) {
    if (trackId === 'arena' && this.arenaPlaylist.length > 0) {
      this._playNextArenaTrack();
      return;
    }

    const file = this.musicTracks[trackId];
    this._playMusicFile(trackId, file, { loop: true });
  }

  stopMusic() {
    const el = this._musicAudio;
    if (!el) return;
    el.onended = null;
    el.pause();
    el.removeAttribute('src');
    el.load();
    this._musicSrc = null;
    this.musicTrackId = null;
    this._playlistMode = false;
  }

  _musicVolume() {
    if (this._musicVol <= 0) return 0;
    return Math.min(1, this._musicVol * 0.85);
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    const el = this._musicAudio;
    if (el?.paused && this._musicSrc && this._musicVolume() > 0) {
      el.volume = this._musicVolume();
      el.play().catch(() => {});
    }
  }

  applySettings(settings) {
    this.enabled = settings.sfxEnabled !== false;
    const legacy = settings.masterVolume;
    this._musicVol = settings.musicVolume ?? legacy ?? 0.3;
    this._sfxVol = settings.sfxVolume ?? legacy ?? 0.3;
    if (this.masterGain) this.masterGain.gain.value = this._sfxVol;
    const el = this._musicAudio;
    if (el) {
      el.volume = this._musicVolume();
      if (this._musicVolume() <= 0) el.pause();
      else if (el.paused && this.musicTrackId) el.play().catch(() => {});
    }
  }

  tone(freq, duration, type = 'square', volume = 0.15, decay = true) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.masterGain);
    const now = this.ctx.currentTime;
    if (decay) gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  noise(duration, volume = 0.08) {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    const now = this.ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.start(now);
  }

  shoot() { this.tone(440 + Math.random() * 100, 0.08, 'square', 0.06); }
  hit() { this.tone(180, 0.06, 'sawtooth', 0.08); }
  kill() { this.tone(320, 0.1, 'square', 0.1); this.tone(480, 0.12, 'square', 0.06); }
  levelUp() {
    [392, 523, 659, 784, 988, 1175].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'sine', 0.13), i * 55);
    });
    setTimeout(() => this.noise(0.18, 0.09), 180);
    setTimeout(() => this.tone(880, 0.35, 'triangle', 0.1), 320);
  }
  chest() { this.tone(600, 0.15, 'sine', 0.12); this.tone(900, 0.2, 'sine', 0.1); }
  openChest() {
    this.tone(600, 0.12, 'sine', 0.07);
    this.tone(900, 0.16, 'sine', 0.06);
    setTimeout(() => this.tone(660, 0.18, 'sine', 0.06), 100);
    setTimeout(() => this.tone(880, 0.2, 'sine', 0.05), 220);
  }
  mesaCacheOpen() {
    this.tone(440, 0.12, 'triangle', 0.08);
    this.tone(660, 0.16, 'sine', 0.09);
    setTimeout(() => this.tone(880, 0.2, 'sine', 0.08), 90);
    setTimeout(() => this.tone(990, 0.24, 'sine', 0.09), 200);
    setTimeout(() => this.noise(0.12, 0.05), 140);
  }
  mesaCacheReveal() {
    this.tone(784, 0.22, 'sine', 0.1);
    setTimeout(() => this.tone(988, 0.28, 'sine', 0.09), 100);
    setTimeout(() => this.tone(1175, 0.32, 'triangle', 0.08), 220);
    setTimeout(() => this.noise(0.18, 0.08), 60);
  }
  dodge() { this.noise(0.12, 0.06); this.tone(200, 0.1, 'sine', 0.05); }
  boss() {
    [110, 87, 73].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.15), i * 150));
  }
  bossEnrage() {
    [140, 95, 70, 110].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.13, false), i * 90));
  }
  bossKillFanfare() {
    this.playSfx('bossKill', 1);
  }
  bossChest() {
    this.chest();
    setTimeout(() => this.tone(660, 0.25, 'sine', 0.11), 120);
    setTimeout(() => this.tone(990, 0.3, 'sine', 0.1), 260);
  }
  magnet() { this.tone(300, 0.3, 'sine', 0.08); this.tone(500, 0.4, 'sine', 0.06); }
  nova() { this.noise(0.3, 0.12); this.tone(150, 0.5, 'sawtooth', 0.1); }
  ui() { this.tone(500, 0.05, 'sine', 0.08); }
  hurt() { this.tone(120, 0.15, 'sawtooth', 0.12); }
  zonkDomeWarn() { this.tone(90, 0.35, 'sine', 0.1); this.tone(130, 0.5, 'triangle', 0.08); }
  zonkDomeKlaxon() {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < 7; i++) {
      const freq = i % 2 === 0 ? 820 : 540;
      setTimeout(() => this.tone(freq, 0.16, 'square', 0.12, false), i * 165);
    }
    setTimeout(() => this.noise(0.12, 0.07), 80);
  }
  zonkDomePop() { this.noise(0.2, 0.14); this.tone(80, 0.25, 'sawtooth', 0.14); }
  quest() { this.tone(700, 0.12, 'sine', 0.1); this.tone(900, 0.15, 'sine', 0.08); }
}
