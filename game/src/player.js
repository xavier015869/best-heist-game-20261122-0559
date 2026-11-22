// player.js — the thief: movement with a loot bag that grows heavier,
// pickups, the keycard, tools (EMP / smoke) and door interaction.

import { CARRY, PLAYER } from './config.js';
import { KEYCARD, LOOT, SAFE, VAULT_DOOR, dist, inShadow, moveCircle } from './level.js';
import { moveVector, pressed } from './input.js';
import { sfx } from './audio.js';
import { fireEMP } from './security.js';

export function makePlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y,
    angle: -Math.PI / 2,
    moving: false, running: false,
    noiseRadius: 0,
    weight: 0, value: 0,
    stepTimer: 0,
  };
}

export function carryCap(G) { return G.prep.duffel > 0 ? CARRY.duffel : CARRY.base; }

export function speedFactor(G) {
  return Math.max(CARRY.minSpeedFactor, 1 - G.player.weight * CARRY.slowPerWeight);
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const v = moveVector();
  p.moving = v.moving && !G.dial.open;
  p.running = p.moving && (G.keys.has('ShiftLeft') || G.keys.has('ShiftRight'));
  const speed = (p.running ? PLAYER.runSpeed : PLAYER.walkSpeed) * speedFactor(G);
  p.noiseRadius = p.running ? (G.prep.soles > 0 ? PLAYER.quietNoiseRadius : PLAYER.runNoiseRadius) : 0;

  const prevX = p.x, prevY = p.y;
  if (p.moving) {
    p.angle = Math.atan2(v.y, v.x);
    moveCircle(p, v.x * speed * dt, v.y * speed * dt, PLAYER.radius, G.doorSegs());
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.running ? 0.24 : 0.34;
      if (p.running) {
        sfx.step();
        // sprinting kicks up a little dust — speed you can see
        G.particles.push({
          x: p.x - v.x * 10, y: p.y - v.y * 10 + 6,
          vx: -v.x * 16, vy: -6, life: 0.4, maxLife: 0.4,
          color: 'rgba(190,198,214,0.8)', size: 3,
        });
      }
    }
  }
  G.checkLasers(prevX, prevY);

  // ---- pickups ---------------------------------------------------------------
  if (!G.hasKeycard && dist(p.x, p.y, KEYCARD.x, KEYCARD.y) < PLAYER.pickupRadius + 6) {
    G.hasKeycard = true;
    sfx.keycard();
    G.toast('Keycard taken — the vault door will open for you');
  }
  for (const item of G.loot) {
    if (item.taken) continue;
    if (item.crack && !G.cracked) continue;
    if (dist(p.x, p.y, item.x, item.y) < PLAYER.pickupRadius) {
      if (p.weight + item.weight > carryCap(G)) {
        G.toastOnce('bagfull', 'Your bag is full — you cannot carry the ' + item.name);
        continue;
      }
      item.taken = true;
      p.weight += item.weight;
      p.value += item.value;
      if (item.gem) { G.hasDiamond = true; sfx.sparkle(); G.raiseAlarm(8, 'diamond'); G.toast('THE STAR DIAMOND IS YOURS — get to the van!'); }
      else { sfx.pickup(); G.toast(item.name + '  +$' + item.value.toLocaleString('en-US')); }
      G.burst(item.x, item.y, item.gem ? '#aef3ff' : '#ffd75e', item.gem ? 22 : 8);
    }
  }

  // ---- interactions ------------------------------------------------------------
  if (pressed('KeyE')) G.interact();
  if (pressed('KeyQ')) G.useEMP();
  if (pressed('KeyF')) G.useSmoke();
}

export function doorDistance(G) {
  return dist(G.player.x, G.player.y, VAULT_DOOR.cx, VAULT_DOOR.cy + 14);
}

export function safeDistance(G) {
  return dist(G.player.x, G.player.y, SAFE.x, SAFE.y + 26);
}
