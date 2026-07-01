/**
 * SFX procedural 8-bit — tap, ghép tre, khắc nhập/xuất.
 * BGM: MP3 qua BgmBus (HTML audio), không qua file này.
 */

/** @type {Record<string, number>} */
const NOTE = {
  E2: 82.41,
  G4: 392.0,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
};

export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.unlocked = false;
    this.masterGain = null;
    /** @type {AudioBuffer|null} */
    this._noiseBuffer = null;
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.48;
      this.masterGain.connect(this.ctx.destination);
      this._noiseBuffer = this._makeNoiseBuffer(this.ctx.sampleRate, 0.08);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
    return true;
  }

  /**
   * @param {number} sampleRate
   * @param {number} duration
   */
  _makeNoiseBuffer(sampleRate, duration) {
    const len = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 28);
    }
    return buffer;
  }

  /**
   * @param {number} freq
   * @param {number} duration
   * @param {number} vol
   */
  _playSquare(freq, duration, vol) {
    if (!this.ctx || freq <= 0) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /**
   * @param {number} duration
   * @param {number} vol
   */
  _playNoise(duration, vol) {
    if (!this.ctx || !this._noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.buffer = this._noiseBuffer;
    src.connect(g);
    g.connect(this.masterGain);
    src.start();
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
  }

  /**
   * @param {number[]} freqs
   * @param {number} noteDur
   * @param {number} vol
   */
  _playArpeggio(freqs, noteDur, vol) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const start = t0 + i * noteDur * 0.85;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + noteDur);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + noteDur + 0.01);
    });
  }

  /**
   * Tiếng khắc “chéo chéo” — noise + saw sweep.
   * @param {'nhap'|'xuat'} kind
   */
  _playScratch(kind) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const bursts = kind === 'nhap' ? 7 : 6;
    const step = 0.032;

    for (let i = 0; i < bursts; i++) {
      const start = t0 + i * step;
      const dur = 0.038;

      const len = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < len; j++) {
        const t = j / this.ctx.sampleRate;
        const env = Math.exp(-t * 22);
        data[j] = (Math.random() * 2 - 1) * env;
      }
      const src = this.ctx.createBufferSource();
      const ng = this.ctx.createGain();
      src.buffer = buffer;
      ng.gain.setValueAtTime(kind === 'nhap' ? 0.28 : 0.24, start);
      ng.gain.exponentialRampToValueAtTime(0.001, start + dur);
      src.connect(ng);
      ng.connect(this.masterGain);
      src.start(start);
      src.stop(start + dur + 0.01);

      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      const fStart = kind === 'nhap' ? 380 - i * 28 : 160 + i * 32;
      const fEnd = kind === 'nhap' ? 90 : 340 - i * 20;
      osc.frequency.setValueAtTime(Math.max(fStart, 60), start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(fEnd, 50), start + dur);
      g.gain.setValueAtTime(0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    }
  }

  /**
   * @param {string} type
   */
  playSfx(type) {
    if (!this.ctx) {
      void this.unlock();
      if (!this.ctx) return;
    }

    switch (type) {
      case 'ui_tap':
        this._playSquare(NOTE.C5, 0.04, 0.09);
        break;
      case 'pool_pick':
        this._playSquare(NOTE.G4, 0.05, 0.11);
        break;
      case 'tap_ok':
        this._playArpeggio([NOTE.C5, NOTE.E5, NOTE.G5], 0.05, 0.14);
        break;
      case 'tap_bad':
        this._playSquare(NOTE.E2, 0.12, 0.18);
        this._playNoise(0.08, 0.22);
        break;
      case 'snap':
        this._playArpeggio([NOTE.G5, NOTE.C6, NOTE.E5], 0.045, 0.15);
        break;
      case 'khacnhap':
        this._playScratch('nhap');
        break;
      case 'khacxuat':
        this._playScratch('xuat');
        break;
      default:
        break;
    }
  }

  pause() {
    if (this.ctx?.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  stop() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._noiseBuffer = null;
    this.unlocked = false;
  }
}

export const audioManager = new AudioManager();
