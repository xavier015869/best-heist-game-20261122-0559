// security.js — the bank's electronic eyes: sweeping cameras, timed laser
// beams and smoke clouds. Each system reports "is the thief seen / did a
// beam break" to game.js, which turns sightings into alarm.

import { CAMERA, DETECTION, LASER } from './config.js';
import { CAMERAS, LASERS, angleDiff, crossedSegment, dist, inShadow, los } from './level.js';

export function makeCameras() {
  return CAMERAS.map((c) => ({ ...c, angle: c.base, fill: 0, sees: false }));
}

export function makeLasers() {
  return LASERS.map((l) => ({ ...l, on: true, disabledFor: 0 }));
}

export function laserOn(laser, t) {
  if (laser.disabledFor > 0) return false;
  const ph = (t + laser.phase) % laser.period;
  return ph < laser.onTime;
}

// Is (px, py) inside the observer's cone with a clear line of sight?
export function inCone(ox, oy, angle, px, py, length, halfAngle, doorSegs) {
  const d = dist(ox, oy, px, py);
  const reach = inShadow(px, py) ? length * 0.78 : length;
  if (d > reach || d < 1) return 0;
  const want = Math.atan2(py - oy, px - ox);
  const off = Math.abs(angleDiff(want, angle));
  if (off > halfAngle) return 0;
  if (!los(ox, oy, px, py, doorSegs)) return 0;
  // strength: 1 at the centre of the cone, close up; fades with range/angle
  return (1 - d / reach) * 0.6 + (1 - off / halfAngle) * 0.4;
}

export function updateCameras(G, dt) {
  let anySees = false;
  for (const cam of G.cameras) {
    cam.angle = cam.base + Math.sin(G.time * CAMERA.sweepSpeed + cam.x) * 0.62;
    if (G.disabledFor > 0 || G.smokeAt(cam)) { cam.sees = false; cam.fill = Math.max(0, cam.fill - dt); continue; }
    const s = inCone(cam.x, cam.y, cam.angle, G.player.x, G.player.y,
      CAMERA.coneLength, CAMERA.coneHalfAngle, G.doorSegs());
    cam.sees = s > 0;
    if (s > 0) {
      const rate = DETECTION.cameraRate * s * (inShadow(G.player.x, G.player.y) ? DETECTION.shadowFactor : 1);
      cam.fill = Math.min(1, cam.fill + rate * dt);
      if (cam.fill > 0.45) {
        G.raiseAlarm(DETECTION.alarmFromCamera * s * dt, 'camera');
        G.alertNearestGuard(G.player.x, G.player.y, 0.45);
        anySees = true;
      }
    } else {
      cam.fill = Math.max(0, cam.fill - dt * 0.7);
    }
  }
  return anySees;
}

export function updateLasers(G, dt, prevX, prevY) {
  for (const laser of G.lasers) {
    laser.disabledFor = Math.max(0, laser.disabledFor - dt);
    laser.on = laserOn(laser, G.time);
    if (!laser.on || G.dial.open) continue;
    if (crossedSegment(prevX, prevY, G.player.x, G.player.y, laser.x1, laser.y1, laser.x2, laser.y2)) {
      // stepping back and forth over one beam should not machine-gun the alarm
      if (G.time - (laser.lastTrip || -9) > 1.2) {
        laser.lastTrip = G.time;
        G.raiseAlarm(LASER.tripAlarm, 'laser');
        G.onLaserTrip();
      }
    }
  }
}

export function fireEMP(G) {
  G.disabledFor = LASER.empDisableSeconds;
  for (const laser of G.lasers) laser.disabledFor = LASER.empDisableSeconds;
}
