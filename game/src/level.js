// level.js — the bank itself: walls, rooms, collision and line of sight.
// The map is one static floor plan; everything here is pure geometry.
import { ROOMS, SHADOWS, WORLD } from './config.js';

// Every solid rectangle. Door gaps are simply absent wall segments.
export const WALLS = [
  // outer shell
  { x: 0, y: 0, w: 1280, h: 20 }, { x: 0, y: 700, w: 1280, h: 20 },
  { x: 0, y: 0, w: 20, h: 720 }, { x: 1260, y: 0, w: 20, h: 720 },
  // street / bank front wall (y=600), front-door gap x 600-680
  { x: 20, y: 600, w: 580, h: 20 }, { x: 680, y: 600, w: 580, h: 20 },
  // lobby side walls + north wall (y=430), door gap x 610-670
  { x: 520, y: 430, w: 20, h: 170 }, { x: 740, y: 430, w: 20, h: 170 },
  { x: 520, y: 430, w: 90, h: 20 }, { x: 670, y: 430, w: 90, h: 20 },
  // corridor north wall (y=350): gaps offices 250-310, airlock 610-670, gallery 950-1010
  { x: 20, y: 350, w: 230, h: 20 }, { x: 310, y: 350, w: 300, h: 20 },
  { x: 670, y: 350, w: 280, h: 20 }, { x: 1010, y: 350, w: 250, h: 20 },
  // corridor south wall (y=430): gaps staff 250-310, lobby 610-670, counting 950-1010
  { x: 20, y: 430, w: 230, h: 20 }, { x: 310, y: 430, w: 300, h: 20 },
  { x: 670, y: 430, w: 280, h: 20 }, { x: 1010, y: 430, w: 250, h: 20 },
  // offices: east wall + interior divider (door gap y 120-180).
  // The divider sits at x=230 so the corridor doorway (gap x 250-310) stays
  // a clean 60px passage: the thief's circle needs 12px clear of every wall.
  { x: 480, y: 20, w: 20, h: 330 },
  { x: 230, y: 20, w: 20, h: 100 }, { x: 230, y: 180, w: 20, h: 140 },
  // gallery: west wall + two pillars as cover
  { x: 800, y: 20, w: 20, h: 330 },
  { x: 950, y: 150, w: 30, h: 30 }, { x: 1100, y: 240, w: 30, h: 30 },
  // vault block: side walls + vault door wall (y=260), security-door gap x 610-670
  { x: 520, y: 20, w: 20, h: 330 }, { x: 740, y: 20, w: 20, h: 330 },
  { x: 520, y: 260, w: 90, h: 20 }, { x: 670, y: 260, w: 90, h: 20 },
  // counting room: west wall + teller counter
  { x: 800, y: 430, w: 20, h: 170 },
  { x: 950, y: 500, w: 180, h: 24 },
  // staff room: east wall + crates
  { x: 480, y: 430, w: 20, h: 170 },
  { x: 150, y: 500, w: 60, h: 40 }, { x: 300, y: 520, w: 60, h: 40 },
];

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsWall(x, y, radius) {
  for (const w of WALLS) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return w;
  }
  return null;
}

// Move a circle, sliding along walls. Returns the new position.
export function moveCircle(x, y, dx, dy, radius) {
  let nx = x + dx;
  if (!circleHitsWall(nx, y, radius)) x = nx;
  let ny = y + dy;
  if (!circleHitsWall(x, ny, radius)) y = ny;
  x = Math.max(20 + radius, Math.min(WORLD.w - 20 - radius, x));
  y = Math.max(20 + radius, Math.min(WORLD.h - 20 - radius, y));
  return { x, y };
}

// Line of sight: true when no wall blocks the segment (sampled every 8px).
export function hasLineOfSight(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (circleHitsWall(x1 + dx * t, y1 + dy * t, 1)) return false;
  }
  return true;
}

export function inShadow(x, y) {
  return SHADOWS.some((s) => pointInRect(x, y, s));
}

export function roomAt(x, y) {
  for (const r of ROOMS) if (pointInRect(x, y, r)) return r;
  return null;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Seeded RNG (mulberry32) so staged shots and replays are deterministic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
