// security.js — cameras, laser beams, the one ALARM meter and lockdown.
// One meter, fed by cones, cameras, noise and lasers; at 100% the bank locks down.
import { ALARM, CAMERA_DEFS, LASER_ALARM, LASER_DEFS } from './config.js';
import { angleDiff, hasLineOfSight, inShadow } from './level.js';

export const CAMERA_HALF_ANGLE = 0.45;

export class Camera {
  constructor(def, idx) {
    this.id = def.id;
    this.x = def.x; this.y = def.y;
    this.base = def.base; this.sweep = def.sweep; this.range = def.range;
    this.phase = idx * 2.1;
    this.disabledUntil = 0;
  }

  angle(time) {
    return this.base + Math.sin(time * 0.9 + this.phase) * this.sweep;
  }

  disabled(time) { return time < this.disabledUntil; }

  canSee(px, py, time, smokeClouds) {
    if (this.disabled(time)) return 0;
    const dx = px - this.x, dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.range) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.angle(time))) > CAMERA_HALF_ANGLE) return 0;
    if (!hasLineOfSight(this.x, this.y, px, py)) return 0;
    for (const s of smokeClouds) {
      if (Math.hypot(px - s.x, py - s.y) < s.r) return 0;
    }
    return inShadow(px, py) ? 0.5 : 1;
  }
}

export function makeCameras() {
  return CAMERA_DEFS.map((d, i) => new Camera(d, i));
}

export class Lasers {
  constructor() {
    this.defs = LASER_DEFS;
    this.disabledUntil = 0;
    this.cooldown = [0, 0, 0, 0]; // per-beam trip immunity
  }

  disabled(time) { return time < this.disabledUntil; }

  // Is beam i live right now? Beams blink on/off on a fixed cycle.
  isOn(i, time) {
    if (this.disabled(time)) return false;
    const d = this.defs[i];
    return ((time + d.phase) % d.period) < d.period / 2;
  }

  // Returns alarm gained this tick from tripped beams (0 or more).
  update(dt, time, player) {
    let gained = 0;
    for (let i = 0; i < this.defs.length; i++) {
      this.cooldown[i] = Math.max(0, this.cooldown[i] - dt);
      if (this.cooldown[i] > 0) continue;
      if (!this.isOn(i, time)) continue;
      const y = this.defs[i].y;
      if (player.x > 540 && player.x < 740 && Math.abs(player.y - y) < 8) {
        this.cooldown[i] = 1.2;
        gained += LASER_ALARM;
      }
    }
    return gained;
  }
}

export class Alarm {
  constructor() {
    this.value = 0;
    this.peak = 0;
    this.lockdown = false;
    this.lockdownLeft = 0;
  }

  add(amount) {
    if (this.lockdown) return;
    this.value = Math.min(100, this.value + amount);
    this.peak = Math.max(this.peak, this.value);
    if (this.value >= 100) {
      this.lockdown = true;
      this.lockdownLeft = ALARM.lockdownSeconds;
    }
  }

  decay(dt) {
    if (this.lockdown) return;
    this.value = Math.max(0, this.value - ALARM.decay * dt);
  }

  tickLockdown(dt) {
    if (!this.lockdown) return false;
    this.lockdownLeft -= dt;
    return this.lockdownLeft <= 0; // true when the countdown expires
  }
}
