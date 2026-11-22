// Midnight Vault — all sound is synthesized with WebAudio: no audio files.
// A tiny synth that plays blips, sweeps and drones on demand.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let droneNodes = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // A short oscillator blip with an exponential decay envelope.
  function blip(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Filtered noise burst (footsteps, vault clicks, smoke).
  function noise(dur, vol, filterFreq) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    step() {
      noise(0.09, 0.1, 500);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.25);
      setTimeout(() => blip(990, 0.15, 'sine', 0.22), 70);
    },
    coin() {
      blip(1180, 0.1, 'triangle', 0.2, 1560);
    },
    alarm() {
      blip(520, 0.25, 'square', 0.16, 780);
      setTimeout(() => blip(780, 0.25, 'square', 0.16, 520), 260);
    },
    laserZap() {
      blip(1400, 0.18, 'sawtooth', 0.18, 220);
    },
    cameraBeep() {
      blip(880, 0.08, 'square', 0.1);
    },
    vaultTick() {
      noise(0.05, 0.22, 2400);
    },
    vaultOpen() {
      blip(220, 0.5, 'triangle', 0.25, 880);
      setTimeout(() => blip(440, 0.4, 'triangle', 0.2, 1320), 180);
    },
    caught() {
      blip(300, 0.7, 'sawtooth', 0.25, 90);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'triangle', 0.22), i * 130));
    },
    whoosh() {
      noise(0.35, 0.18, 1600);
    },
    smoke() {
      noise(0.5, 0.2, 600);
    },
    // A low ambient drone that starts on first interaction and loops quietly.
    startDrone() {
      if (!ensure() || droneNodes) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 55.7;
      const g = ctx.createGain();
      g.gain.value = 0.035;
      osc.connect(g);
      osc2.connect(g);
      g.connect(master);
      osc.start();
      osc2.start();
      droneNodes = { osc, osc2, g };
    },
  };
}
