// Midnight Vault — cameras, lasers and the ALARM meter. Cameras sweep cyan cones;
// lasers blink on a timed cycle in the airlock; at 100% alarm the bank locks down
// for a 45-second escape countdown while every guard hunts the thief.

import { TILE } from './config.js';
import { hasLineOfSight, pointInShadow } from './level.js';

export const CAMERA_HALF_ANGLE = 0.5;
export const LOCKDOWN_SECONDS = 45;
export const LASER_ALARM = 35;

export function createSecurity(level) {
  return {
    cameras: level.cameras.map((c) => ({
      ...c,
      x: (c.x + 0.5) * TILE,
      y: (c.y + 0.5) * TILE,
      angle: c.base,
      dir: 1,
      seenAt: -10,
      tripped: false,
    })),
    lasers: level.lasers.map((l) => ({ ...l, trippedAt: -10 })),
    empFlashAt: -10,
  };
}

// A camera sweeps back and forth around its base angle.
export function updateCameras(game, dt) {
  const sec = game.security;
  const now = game.time;
  const p = game.player;
  for (const cam of sec.cameras) {
    cam.angle += cam.dir * cam.speed * dt;
    if (cam.angle > cam.base + cam.sweep) { cam.angle = cam.base + cam.sweep; cam.dir = -1; }
    if (cam.angle < cam.base - cam.sweep) { cam.angle = cam.base - cam.sweep; cam.dir = 1; }

    if (now < p.empUntil) continue; // EMP: cameras are dark
    if (now < p.smokeUntil) continue;
    const dx = p.x - cam.x;
    const dy = p.y - cam.y;
    const dist = Math.hypot(dx, dy);
    if (dist > cam.range * TILE) continue;
    let ang = Math.atan2(dy, dx) - cam.angle;
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    if (Math.abs(ang) > CAMERA_HALF_ANGLE) continue;
    if (!hasLineOfSight(game.level, cam.x, cam.y, p.x, p.y, game.openTiles)) continue;
    if (pointInShadow(game.level, p.x, p.y)) continue; // shadows hide the thief
    // Seen! Alarm climbs fast while a camera holds the thief in its cone.
    game.alarm = Math.min(100, game.alarm + 42 * dt);
    if (now - cam.seenAt > 1.2) {
      cam.seenAt = now;
      game.audio.cameraBeep();
    }
    if (!cam.tripped) {
      cam.tripped = true;
      game.flash('Camera has you! Break its line of sight!');
    }
  }
  for (const cam of sec.cameras) {
    if (cam.tripped && now - cam.seenAt > 2) cam.tripped = false;
  }
}

// Is this laser beam live right now? Beams blink on a shared 3s cycle.
export function laserLive(laser, now) {
  const cycle = laser.on + laser.off;
  const t = (now + laser.phase) % cycle;
  return t < laser.on;
}

export function updateLasers(game, dt) {
  const sec = game.security;
  const now = game.time;
  const p = game.player;
  for (const l of sec.lasers) {
    const live = laserLive(l, now);
    if (!live) continue;
    const yPx = l.y * TILE;
    const x0 = l.x0 * TILE;
    const x1 = l.x1 * TILE;
    // The thief trips the beam when their body crosses its line.
    if (p.y + p.r > yPx - 2 && p.y - p.r < yPx + 2 && p.x > x0 && p.x < x1) {
      if (now - l.trippedAt > 1.5) {
        l.trippedAt = now;
        game.alarm = Math.min(100, game.alarm + LASER_ALARM);
        game.audio.laserZap();
        game.flash('Laser tripped! +35 alarm');
        game.onLaserTrip(l);
      }
    }
  }
}

// Alarm decay and lockdown. Returns 'lockdown' the frame the alarm hits 100.
export function updateAlarm(game, dt) {
  if (game.lockdown) {
    game.lockdownLeft -= dt;
    if (game.lockdownLeft <= 0) {
      game.onLockdownTimeout();
    }
    return;
  }
  // The alarm cools slowly when nothing is feeding it.
  game.alarm = Math.max(0, game.alarm - 1.6 * dt);
  if (game.alarm >= 100) {
    game.lockdown = true;
    game.lockdownLeft = LOCKDOWN_SECONDS;
    game.audio.alarm();
    game.flash('LOCKDOWN! 45 seconds — every guard is hunting you. RUN!');
    // Every guard converges on the thief's last seen spot.
    for (const g of game.guards) {
      g.state = 'chase';
      g.lastSeen = { x: game.player.x, y: game.player.y, at: game.time };
    }
  }
}
