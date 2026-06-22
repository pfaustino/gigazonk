export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.musicTracks = {};
    this._musicAudio = null;
    this.musicTrackId = null;
    this._musicSrc = null;
    this.musicBase = import.meta.env.BASE_URL;
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
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch { this.enabled = false; }
  }

  async loadMusicManifest() {
    try {
      const res = await fetch(`${this.musicBase}music/manifest.json`);
      if (!res.ok) return;
      const data = await res.json();
      this.musicTracks = data.tracks ?? {};
    } catch { /* no manifest or music files yet */ }
  }

  playMusic(trackId) {
    const file = this.musicTracks[trackId];
    if (!file) return;

    const src = `${this.musicBase}music/${file}`;
    const el = this._getMusicEl();

    if (this._musicSrc === src && !el.paused) {
      this.musicTrackId = trackId;
      return;
    }

    el.pause();
    el.src = src;
    this._musicSrc = src;
    this.musicTrackId = trackId;
    el.volume = this._musicVolume();
    el.onerror = () => {
      if (this._musicSrc === src) {
        this._musicSrc = null;
        this.musicTrackId = null;
      }
    };
    el.play().catch(() => {});
  }

  stopMusic() {
    const el = this._musicAudio;
    if (!el) return;
    el.pause();
    el.removeAttribute('src');
    el.load();
    this._musicSrc = null;
    this.musicTrackId = null;
  }

  _musicVolume() {
    if (!this.enabled) return 0;
    return Math.min(1, (this.masterGain?.gain.value ?? 0.3) * 0.85);
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    const el = this._musicAudio;
    if (el?.paused && this.enabled && this._musicSrc) {
      el.volume = this._musicVolume();
      el.play().catch(() => {});
    }
  }

  applySettings(settings) {
    this.enabled = settings.sfxEnabled !== false;
    if (this.masterGain) this.masterGain.gain.value = settings.masterVolume ?? 0.3;
    const el = this._musicAudio;
    if (el) el.volume = this._musicVolume();
    if (!this.enabled) el?.pause();
    else if (el?.paused && this.musicTrackId) el.play().catch(() => {});
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
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'sine', 0.12), i * 80));
  }
  chest() { this.tone(600, 0.15, 'sine', 0.12); this.tone(900, 0.2, 'sine', 0.1); }
  dodge() { this.noise(0.12, 0.06); this.tone(200, 0.1, 'sine', 0.05); }
  boss() {
    [110, 87, 73].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.15), i * 150));
  }
  magnet() { this.tone(300, 0.3, 'sine', 0.08); this.tone(500, 0.4, 'sine', 0.06); }
  nova() { this.noise(0.3, 0.12); this.tone(150, 0.5, 'sawtooth', 0.1); }
  ui() { this.tone(500, 0.05, 'sine', 0.08); }
  hurt() { this.tone(120, 0.15, 'sawtooth', 0.12); }
  zonkDomeWarn() { this.tone(90, 0.35, 'sine', 0.1); this.tone(130, 0.5, 'triangle', 0.08); }
  zonkDomePop() { this.noise(0.2, 0.14); this.tone(80, 0.25, 'sawtooth', 0.14); }
  quest() { this.tone(700, 0.12, 'sine', 0.1); this.tone(900, 0.15, 'sine', 0.08); }
}
