// audio.js — every sound in Midnight Vault is synthesized with WebAudio:
// no audio files, no network. A tiny tone/noise kit plus named effects.

let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

function tone(freq, dur, { type = 'sine', gain = 0.2, at = 0, slide = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, { gain = 0.25, at = 0, low = 400, high = 2400 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(high, t0);
  filter.frequency.exponentialRampToValueAtTime(low, t0 + dur);
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(filter); filter.connect(g); g.connect(master);
  src.start(t0);
}

export const sfx = {
  pickup() { tone(880, 0.09, { type: 'triangle', gain: 0.22 }); tone(1318, 0.12, { type: 'triangle', gain: 0.18, at: 0.06 }); },
  keycard() { tone(1174, 0.07, { type: 'square', gain: 0.1 }); tone(1568, 0.1, { type: 'square', gain: 0.1, at: 0.07 }); },
  sparkle() { tone(2093, 0.16, { type: 'sine', gain: 0.16 }); tone(2637, 0.2, { type: 'sine', gain: 0.12, at: 0.05 }); tone(3136, 0.26, { type: 'sine', gain: 0.1, at: 0.1 }); },
  step() { noiseBurst(0.05, { gain: 0.05, low: 300, high: 900 }); },
  zap() { tone(1400, 0.22, { type: 'sawtooth', gain: 0.2, slide: -1200 }); noiseBurst(0.18, { gain: 0.14 }); },
  alarmBlip() { tone(988, 0.1, { type: 'square', gain: 0.07 }); },
  lockdown() { tone(392, 0.3, { type: 'sawtooth', gain: 0.2 }); tone(392, 0.3, { type: 'sawtooth', gain: 0.2, at: 0.35 }); tone(311, 0.5, { type: 'sawtooth', gain: 0.22, at: 0.7 }); },
  dialTick() { tone(1800, 0.03, { type: 'square', gain: 0.06 }); },
  tumbler() { tone(220, 0.08, { type: 'square', gain: 0.2 }); tone(440, 0.14, { type: 'triangle', gain: 0.2, at: 0.05 }); noiseBurst(0.08, { gain: 0.1, low: 800, high: 2000 }); },
  miss() { tone(196, 0.2, { type: 'sawtooth', gain: 0.16, slide: -60 }); },
  door() { noiseBurst(0.25, { gain: 0.12, low: 200, high: 700 }); tone(98, 0.3, { type: 'sine', gain: 0.2 }); },
  emp() { tone(1600, 0.4, { type: 'sine', gain: 0.2, slide: -1500 }); noiseBurst(0.3, { gain: 0.1, low: 2000, high: 500 }); },
  smoke() { noiseBurst(0.5, { gain: 0.2, low: 500, high: 3000 }); },
  caught() { tone(523, 0.18, { type: 'sawtooth', gain: 0.2 }); tone(392, 0.18, { type: 'sawtooth', gain: 0.2, at: 0.16 }); tone(262, 0.5, { type: 'sawtooth', gain: 0.22, at: 0.32 }); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.2, at: i * 0.11 })); },
  click() { tone(1200, 0.04, { type: 'square', gain: 0.08 }); },
};
