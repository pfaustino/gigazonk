/** Smoothed FPS + frame time from game loop delta. */
export class GameMetrics {
  constructor() {
    this.fps = 60;
    this.frameMs = 16.7;
    this._sampleSec = 0;
    this._sampleFrames = 0;
  }

  tick(dt) {
    this.frameMs = dt * 1000;
    this._sampleSec += dt;
    this._sampleFrames += 1;
    if (this._sampleSec >= 0.5) {
      this.fps = Math.round(this._sampleFrames / this._sampleSec);
      this._sampleSec = 0;
      this._sampleFrames = 0;
    }
  }
}
