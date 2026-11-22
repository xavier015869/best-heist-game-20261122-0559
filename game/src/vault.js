// vault.js — the 3-tumbler timing dial. The thief stands exposed in front
// of the vault safe while a needle sweeps the dial; stop it inside the gold
// zone three times to crack the safe. A miss costs alarm and rattles the
// needle faster. Drawn by render.js from this state.

import { sfx } from './audio.js';

export function makeDial() {
  return {
    open: false,
    angle: -Math.PI / 2,
    speed: 2.4,              // radians per second, grows per tumbler
    tumblers: 0,             // 0..3 locked
    zoneStart: 0.6,          // current gold zone (radians, dial space)
    zoneSize: 0.62,
    lastTick: 0,
    wobble: 0,
  };
}

function randomZone(G) {
  // keep the gold zone away from the very top so a fresh dial is readable
  return 0.7 + G.rng() * (Math.PI * 2 - 1.4);
}

export function openDial(G) {
  G.dial.open = true;
  G.dial.tumblers = 0;
  G.dial.speed = 2.4;
  G.dial.angle = -Math.PI / 2;
  G.dial.zoneStart = randomZone(G);
  G.dial.zoneSize = 0.62;
  G.toast('Cracking the vault — stop the needle in the gold, three times');
}

export function closeDial(G) {
  G.dial.open = false;
}

export function updateDial(G, dt) {
  const d = G.dial;
  if (!d.open) return;
  d.angle += d.speed * dt;
  if (d.angle > Math.PI * 1.5) d.angle -= Math.PI * 2;
  const tick = Math.floor((d.angle + Math.PI / 2) / (Math.PI / 8));
  if (tick !== d.lastTick) { d.lastTick = tick; sfx.dialTick(); }
  d.wobble = Math.max(0, d.wobble - dt * 3);
}

export function pressDial(G) {
  const d = G.dial;
  if (!d.open) return;
  // normalise the needle into zone space
  let rel = (d.angle - d.zoneStart) % (Math.PI * 2);
  if (rel < 0) rel += Math.PI * 2;
  if (rel <= d.zoneSize) {
    d.tumblers += 1;
    sfx.tumbler();
    G.burst(G.player.x, G.player.y - 18, '#ffd75e', 10);
    if (d.tumblers >= 3) {
      G.cracked = true;
      closeDial(G);
      sfx.door();
      G.toast('VAULT CRACKED — take everything that is not nailed down');
      return;
    }
    d.speed += 0.85;
    d.zoneSize = Math.max(0.4, d.zoneSize - 0.08);
    d.zoneStart = randomZone(G);
  } else {
    sfx.miss();
    d.wobble = 1;
    d.speed += 0.3;
    G.raiseAlarm(6, 'dial');
    G.alertNearestGuard(G.player.x, G.player.y, 0.35);
    G.toast('The tumbler slips — the noise carries (+6 alarm)');
  }
}
