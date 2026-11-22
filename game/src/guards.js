// guards.js — the three guards: patrol loops, sweeping vision, chase AI.
import { GUARD_DEFS } from './config.js';
import { angleDiff, hasLineOfSight, inShadow, moveCircle } from './level.js';

export const GUARD_RANGE = 175;
export const GUARD_HALF_ANGLE = 0.5; // ~29 degrees each side
export const GUARD_CATCH_DIST = 26;

export class Guard {
  constructor(def, idx) {
    this.id = def.id;
    this.name = def.name;
    this.color = def.color;
    this.waypoints = def.waypoints;
    this.speed = def.speed;
    this.x = def.waypoints[0][0];
    this.y = def.waypoints[0][1];
    this.wp = 1;
    this.facing = 0;
    this.pause = 0;      // dwell at a waypoint, sweeping the cone
    this.sweepPhase = idx * 1.7;
    this.mode = 'patrol'; // patrol | chase | hunt
    this.alert = 0;       // 0..1, how sure the guard is
  }

  // Where the guard is looking right now.
  facingAngle(time) {
    if (this.pause > 0) {
      const base = this.facing;
      return base + Math.sin(time * 1.6 + this.sweepPhase) * 0.7;
    }
    return this.facing;
  }

  // Can this guard see the player? Returns 0 (no) or 1 (yes).
  canSee(px, py, time, smokeClouds) {
    const dx = px - this.x, dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_RANGE) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.facingAngle(time))) > GUARD_HALF_ANGLE) return 0;
    if (!hasLineOfSight(this.x, this.y, px, py)) return 0;
    for (const s of smokeClouds) {
      if (Math.hypot(px - s.x, py - s.y) < s.r || Math.hypot(this.x - s.x, this.y - s.y) < s.r) return 0;
    }
    return 1;
  }

  update(dt, time, player, hunting) {
    if (hunting || this.mode === 'chase') {
      // Hunt: run straight at the player's last known spot.
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.facing = Math.atan2(dy, dx);
      const step = 112 * dt;
      const p = moveCircle(this.x, this.y, (dx / d) * step, (dy / d) * step, 13);
      this.x = p.x; this.y = p.y;
      this.mode = 'chase';
      return;
    }
    if (this.pause > 0) { this.pause -= dt; return; }
    const [tx, ty] = this.waypoints[this.wp];
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      this.wp = (this.wp + 1) % this.waypoints.length;
      this.pause = 1.4;
      return;
    }
    this.facing = Math.atan2(dy, dx);
    const step = Math.min(this.speed * dt, d);
    const p = moveCircle(this.x, this.y, (dx / d) * step, (dy / d) * step, 13);
    this.x = p.x; this.y = p.y;
  }

  // How strongly this guard is spotting the player right now (0..1).
  spotStrength(px, py, time, smokeClouds) {
    if (!this.canSee(px, py, time, smokeClouds)) return 0;
    return inShadow(px, py) ? 0.5 : 1;
  }

  caught(px, py) {
    return Math.hypot(px - this.x, py - this.y) < GUARD_CATCH_DIST;
  }
}

export function makeGuards() {
  return GUARD_DEFS.map((d, i) => new Guard(d, i));
}
