// audio.js — every sound is synthesized with WebAudio. No audio files, no network.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.siren = null;
    this.sirenGain = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (e) { this.ctx = null; }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.sirenGain) this.sirenGain.gain.value = this.muted ? 0 : 0.05;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click() { this.tone(660, 0.06, 'square', 0.05); }
  pickup() { this.tone(880, 0.12, 'sine', 0.1); this.tone(1320, 0.18, 'sine', 0.07); }
  zap() { this.tone(220, 0.25, 'sawtooth', 0.14, 60); }
  dialHit() { this.tone(520, 0.1, 'triangle', 0.12); this.tone(780, 0.16, 'triangle', 0.1); }
  dialMiss() { this.tone(180, 0.3, 'sawtooth', 0.12, 90); }
  vaultOpen() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.1), i * 90)); }
  emp() { this.tone(1200, 0.4, 'sine', 0.1, 100); }
  smoke() { this.tone(300, 0.5, 'sine', 0.06, 80); }
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.12), i * 130)); }
  lose() { [400, 320, 240, 160].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'sawtooth', 0.1), i * 160)); }

  // Lockdown siren: a slow two-tone loop while the alarm is at 100%.
  sirenStart() {
    if (!this.ctx || this.siren || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 700;
    lfo.type = 'square'; lfo.frequency.value = 0.9;
    lfoGain.gain.value = 180;
    g.gain.value = 0.05;
    lfo.connect(lfoGain).connect(o.frequency);
    o.connect(g).connect(this.ctx.destination);
    o.start(); lfo.start();
    this.siren = [o, lfo];
    this.sirenGain = g;
  }

  sirenStop() {
    if (!this.siren) return;
    try { this.siren.forEach((o) => o.stop()); } catch (e) { /* already stopped */ }
    this.siren = null;
    this.sirenGain = null;
  }
}
