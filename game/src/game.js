// game.js — the conductor: owns the shared state object G, the frame loop,
// the planning screen's clicks, alarm/lockdown bookkeeping, interactions
// and the endings. Every other module reads and writes G.

import { DETECTION, LOCKDOWN, PREP, SCORE } from './config.js';
import { LOOT, SPAWNS, VAN, VAULT_DOOR, dist } from './level.js';
import { initInput, keys, markFrame, mouse, pressed } from './input.js';
import { initAudio, sfx } from './audio.js';
import { fireEMP, makeCameras, makeLasers, updateCameras, updateLasers } from './security.js';
import { makeGuards, updateGuards } from './guards.js';
import { doorDistance, makePlayer, safeDistance, updatePlayer } from './player.js';
import { closeDial, makeDial, openDial, pressDial, updateDial } from './vault.js';
import { drawEnd, drawGame, drawPlan, planLayout } from './render.js';
import { stageShot } from './shots.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
initInput(canvas);
canvas.addEventListener('mousedown', initAudio);

const G = {
  state: 'plan',
  time: 0, dt: 0, playTime: 0,
  entry: 'front',
  prep: { lockpick: 0, emp: 0, smoke: 0, soles: 0, duffel: 0 },
  tools: { emp: 0, smoke: 0 },
  player: makePlayer(SPAWNS.front),
  guards: makeGuards(), cameras: makeCameras(), lasers: makeLasers(),
  loot: LOOT.map((l) => ({ ...l, taken: false })),
  dial: makeDial(),
  keys,
  rng: mulberry32(20261122),
  frozen: false,
  alarm: 0, alarmPeak: 0, lastSeenAt: -9,
  lockdown: null, lockdownWas: false, radioTimer: 0,
  disabledFor: 0,
  hasKeycard: false, hasDiamond: false, cracked: false, doorOpen: false,
  neverChased: true,
  lockpicking: 0,
  particles: [], smokes: [],
  toastMsg: '', toastUntil: 0, toastsOnce: new Set(),
  endingTitle: '', endingLine: '',
  score: { loot: 0, mult: 1, speed: 0, total: 0 },
};
window.__MV = G;

// ---- G's services, used by the other modules --------------------------------

G.prepPointsLeft = () =>
  PREP.points - Object.entries(G.prep).reduce((n, [k, v]) => n + PREP.costs[k] * v, 0);
G.doorSegs = () => (G.doorOpen ? [] : [VAULT_DOOR]);
G.smokeAt = (pt) => G.smokes.some((s) => dist(s.x, s.y, pt.x, pt.y) < s.r);
G.toast = (msg) => { G.toastMsg = msg; G.toastUntil = G.time + 3.4; };
G.toastOnce = (id, msg) => { if (!G.toastsOnce.has(id)) { G.toastsOnce.add(id); G.toast(msg); } };
G.burst = (x, y, color, n) => {
  for (let i = 0; i < n; i++) {
    const a = G.rng() * Math.PI * 2, sp = 18 + G.rng() * 46;
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 14, life: 0.55, maxLife: 0.55, color, size: 2.4 });
  }
};
G.raiseAlarm = (n, why) => {
  if (G.state !== 'play' || G.lockdown) { G.alarmPeak = Math.max(G.alarmPeak, G.alarm); return; }
  G.alarm = Math.min(100, G.alarm + n);
  G.alarmPeak = Math.max(G.alarmPeak, G.alarm);
  if (G.alarm >= 100) startLockdown();
};
G.alertNearestGuard = (x, y, amount) => {
  let best = null, bd = Infinity;
  for (const g of G.guards) { const d = dist(g.x, g.y, x, y); if (d < bd) { bd = d; best = g; } }
  if (best && bd < 320) {
    best.suspicion = Math.max(best.suspicion, amount);
    best.target = { x, y };
    if (best.state === 'patrol') best.state = 'suspicious';
  }
};
G.onSpotted = () => { G.neverChased = false; sfx.alarmBlip(); G.toast('SPOTTED — break line of sight!'); };
G.onLaserTrip = () => { sfx.zap(); G.toast('Laser tripped! +35 alarm'); G.burst(G.player.x, G.player.y, '#ff5040', 10); };
G.onCaught = () => { if (G.state === 'play') endGame(false, 'caught'); };
G.checkLasers = (px, py) => updateLasers(G, G.dt, px, py);

G.objective = () => {
  if (G.lockdown) return 'LOCKDOWN — reach the van before the shutters fall!';
  if (G.hasDiamond) return 'The diamond is in your bag — get to the getaway van on the street';
  if (!G.cracked && G.doorOpen) return 'Crack the vault safe (stand at the safe, press E) — then take the diamond from the gallery';
  if (!G.doorOpen && !G.hasKeycard && G.prep.lockpick === 0)
    return 'Find the keycard in the counting room, then open the vault — and take the Star Diamond from the gallery';
  if (!G.doorOpen) return 'Open the vault door (north-east, press E) — then take the Star Diamond from the gallery';
  return 'Take the Star Diamond from the gallery pedestal';
};

G.prompt = () => {
  if (G.state !== 'play') return '';
  if (G.dial.open) return '';
  if (G.lockpicking > 0) return 'Picking the lock… ' + Math.ceil(G.lockpicking * 10) / 10 + 's';
  if (!G.doorOpen && doorDistance(G) < 42) {
    if (G.hasKeycard) return '[E] Open the vault door';
    if (G.prep.lockpick > 0) return '[E] Pick the vault lock (slow, noisy)';
    return 'Locked — needs the keycard or a lockpick kit';
  }
  if (!G.cracked && safeDistance(G) < 48) return '[E] Crack the vault safe';
  return '';
};

G.interact = () => {
  if (G.dial.open) { pressDial(G); return; }
  if (!G.doorOpen && doorDistance(G) < 42) {
    if (G.hasKeycard) {
      G.doorOpen = true; sfx.door();
      G.toast('The vault door swings open');
    } else if (G.prep.lockpick > 0 && G.lockpicking <= 0) {
      G.lockpicking = 3.2;
      G.toast('Picking the lock — hold still…');
    }
    return;
  }
  if (!G.cracked && safeDistance(G) < 48) openDial(G);
};

G.useEMP = () => {
  if (G.tools.emp <= 0 || G.disabledFor > 0) return;
  G.tools.emp -= 1;
  fireEMP(G);
  sfx.emp();
  G.toast('EMP! Cameras and lasers are dark for 7 seconds');
};

G.useSmoke = () => {
  if (G.tools.smoke <= 0) return;
  G.tools.smoke -= 1;
  G.smokes.push({ x: G.player.x, y: G.player.y, r: 96, left: 4.5 });
  for (const g of G.guards) {
    g.suspicion *= 0.3;
    if (g.state === 'chase') { g.state = 'investigate'; g.target = null; }
  }
  sfx.smoke();
  G.toast('Smoke out — you are a ghost for a moment');
};

// ---- flow -----------------------------------------------------------------------

function startLockdown() {
  G.lockdown = LOCKDOWN.seconds;
  G.lockdownWas = true;
  G.neverChased = false;
  G.radioTimer = 0;
  for (const g of G.guards) { g.state = 'chase'; g.suspicion = 1; g.target = { x: G.player.x, y: G.player.y }; }
  sfx.lockdown();
  G.toast('LOCKDOWN! The shutters fall in 45 seconds — RUN!');
}

G.startHeist = (entryKey) => {
  G.entry = entryKey;
  G.player = makePlayer(SPAWNS[entryKey]);
  G.guards = makeGuards();
  G.cameras = makeCameras();
  G.lasers = makeLasers();
  G.loot = LOOT.map((l) => ({ ...l, taken: false }));
  G.dial = makeDial();
  G.tools = { emp: G.prep.emp, smoke: G.prep.smoke };
  G.alarm = 0; G.alarmPeak = 0; G.lastSeenAt = -9;
  G.lockdown = null; G.lockdownWas = false;
  G.disabledFor = 0;
  G.hasKeycard = false; G.hasDiamond = false; G.cracked = false; G.doorOpen = false;
  G.neverChased = true; G.lockpicking = 0;
  G.particles = []; G.smokes = []; G.toastsOnce = new Set();
  G.playTime = 0;
  G.state = 'play';
  G.toast('You are in. The diamond first — then the van.');
};

function endGame(won, kind) {
  const loot = G.player.value;
  const mult = won && G.neverChased ? SCORE.ghostMultiplier : 1;
  const speed = won ? Math.max(0, Math.round((SCORE.parSeconds - G.playTime) * SCORE.speedBonusPerSecond)) : 0;
  G.score = { loot, mult, speed, total: Math.round(loot * mult) + speed };
  if (!won && kind === 'caught') {
    G.endingTitle = 'Caught Red-Handed';
    G.endingLine = 'The guards send their regards. The diamond stays in the gallery.';
    sfx.caught();
  } else if (!won) {
    G.endingTitle = 'Locked In';
    G.endingLine = 'The shutters came down with you on the wrong side of them.';
    sfx.caught();
  } else if (G.neverChased && loot >= 11000) {
    G.endingTitle = 'Ghost of the Midnight Vault';
    G.endingLine = 'In and out like weather. Nobody saw a thing — the cameras saw less.';
    sfx.win();
  } else if (G.neverChased) {
    G.endingTitle = 'The Velvet Shadow';
    G.endingLine = 'Never chased, never cornered. The night watch felt a breeze, nothing more.';
    sfx.win();
  } else if (G.lockdownWas) {
    G.endingTitle = 'Smash-and-Grab Artist';
    G.endingLine = 'The alarm screamed the whole way out. You walked anyway.';
    sfx.win();
  } else if (G.player.weight >= 20) {
    G.endingTitle = 'Heavy Hands';
    G.endingLine = 'The bag nearly walked out on its own. So did you, just barely.';
    sfx.win();
  } else if (loot < 4000) {
    G.endingTitle = 'Small-Time Crook';
    G.endingLine = 'You escaped — with barely enough to cover the bus fare home.';
    sfx.win();
  } else {
    G.endingTitle = 'Clean Getaway';
    G.endingLine = 'A tidy night’s work. The van is already two streets away.';
    sfx.win();
  }
  G.state = won ? 'won' : 'lost';
}

// ---- per-frame updates --------------------------------------------------------------

function updatePlay(dt) {
  G.playTime += dt;
  G.disabledFor = Math.max(0, G.disabledFor - dt);
  updatePlayer(G, dt);
  updateDial(G, dt);
  if (G.dial.open && pressed('Space')) pressDial(G);
  if (G.dial.open && pressed('Escape')) closeDial(G);

  // lockpick channel: standing still at the door
  if (G.lockpicking > 0) {
    const moved = G.player.moving;
    if (moved || doorDistance(G) > 46) { G.lockpicking = 0; G.toast('Lockpicking interrupted'); }
    else {
      G.lockpicking -= dt;
      if (G.lockpicking <= 0) {
        G.doorOpen = true;
        sfx.door();
        G.raiseAlarm(6, 'lockpick');
        G.alertNearestGuard(G.player.x, G.player.y, 0.5);
        G.toast('Picked open — the click echoed (+6 alarm)');
      }
    }
  }

  const seenG = updateGuards(G, dt);
  const seenC = updateCameras(G, dt);
  if (seenG || seenC) G.lastSeenAt = G.time;
  else if (!G.lockdown && G.time - G.lastSeenAt > DETECTION.alarmGrace)
    G.alarm = Math.max(0, G.alarm - DETECTION.alarmDecay * dt);

  for (const s of G.smokes) s.left -= dt;
  G.smokes = G.smokes.filter((s) => s.left > 0);
  for (const pt of G.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 26 * dt; }
  G.particles = G.particles.filter((pt) => pt.life > 0);

  if (G.lockdown) {
    G.lockdown -= dt;
    G.radioTimer -= dt;
    if (G.radioTimer <= 0) {
      G.radioTimer = 2.5;
      for (const g of G.guards) { g.state = 'chase'; g.target = { x: G.player.x, y: G.player.y }; }
    }
    if (G.lockdown <= 0) { endGame(false, 'locked'); return; }
  }

  // escape
  const p = G.player;
  const inVan = p.x > VAN.x - 4 && p.x < VAN.x + VAN.w + 4 && p.y > VAN.y - 4 && p.y < VAN.y + VAN.h + 4;
  if (inVan) {
    if (G.hasDiamond) { endGame(true); return; }
    G.toastOnce('vanwait', 'The driver shakes his head — no diamond, no ride');
  }
}

function updatePlan() {
  if (!mouse.clicked) {
    if (pressed('Enter')) { initAudio(); G.startHeist(G.entry); }
    return;
  }
  initAudio();
  const L = planLayout();
  const inRect = (r) => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
  for (const row of L.items) {
    if (inRect(row.minus) && G.prep[row.key] > 0) { G.prep[row.key] -= 1; sfx.click(); return; }
    if (inRect(row.buy)) {
      if (G.prep[row.key] < PREP.maxStacks[row.key] && G.prepPointsLeft() >= PREP.costs[row.key]) {
        G.prep[row.key] += 1; sfx.click();
      }
      return;
    }
  }
  for (const e of L.entries) if (inRect(e.rect)) { G.entry = e.key; sfx.click(); return; }
  if (inRect(L.start)) G.startHeist(G.entry);
}

// ---- boot + loop -----------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(G, shot);
  G.frozen = true;
}
G.stageShot = stageShot;

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);
  G.dt = dt;
  G.time += dt;
  if (!G.frozen) {
    if (G.state === 'plan') updatePlan();
    else if (G.state === 'play') updatePlay(dt);
    else if ((G.state === 'won' || G.state === 'lost') && pressed('KeyR')) G.state = 'plan';
  }
  if (G.state === 'plan') drawPlan(ctx, G);
  else { drawGame(ctx, G); if (G.state === 'won' || G.state === 'lost') drawEnd(ctx, G); }
  markFrame();
}
requestAnimationFrame(frame);
