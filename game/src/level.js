// level.js — the Midnight Vault bank: rooms, walls, furniture, shadow,
// loot, patrol routes and spawn points. Pure data plus collision and
// line-of-sight helpers; nothing here knows about rendering.

import { GUARD } from './config.js';

// ---- wall segment builder -------------------------------------------------
// hWall(y, x1, x2, gaps) / vWall(x, y1, y2, gaps): gaps are [from, to] spans
// left open for doors. Walls are zero-thickness segments; entities collide
// with them using their own radius.
function hWall(y, x1, x2, gaps = []) {
  const segs = [];
  let cur = x1;
  for (const [g1, g2] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (g1 > cur) segs.push({ x1: cur, y1: y, x2: g1, y2: y });
    cur = Math.max(cur, g2);
  }
  if (cur < x2) segs.push({ x1: cur, y1: y, x2, y2: y });
  return segs;
}
function vWall(x, y1, y2, gaps = []) {
  const segs = [];
  let cur = y1;
  for (const [g1, g2] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (g1 > cur) segs.push({ x1: x, y1: cur, x2: x, y2: g1 });
    cur = Math.max(cur, g2);
  }
  if (cur < y2) segs.push({ x1: x, y1: y2, x2: x, y2 });
  return segs;
}

export const WALLS = [
  // outer shell
  ...hWall(16, 16, 1264), ...hWall(784, 16, 1264),
  ...vWall(16, 16, 784), ...vWall(1264, 16, 784),
  // gallery block (north centre)
  ...hWall(32, 288, 832),                       // gallery north
  ...vWall(288, 32, 320, [[160, 192]]),          // gallery west / offices east
  ...vWall(832, 32, 320, [[200, 232]]),          // gallery east / security west
  // offices NW south + gallery south share the corridor's north wall (below)
  ...vWall(288, 416, 672, [[528, 560]]),         // back offices east / lobby west
  ...vWall(832, 416, 672, [[528, 560]]),         // counting west / lobby east
  // vault south wall — the gap at 1136..1168 is the keycard door (a door
  // entity in game state, added to the wall set only while closed)
  ...hWall(128, 832, 1248, [[1136, 1168]]),
  ...vWall(1088, 128, 320, [[200, 232]]),        // airlock west / security east
  // corridor north wall (y=320): office, gallery x2, security, airlock doors
  ...hWall(320, 16, 1248, [[144, 176], [400, 432], [688, 720], [940, 972], [1136, 1168]]),
  // corridor south wall (y=416)
  ...hWall(416, 16, 1248, [[144, 176], [528, 592], [1000, 1032]]),
  // ground floor south wall (y=672): only the front doors open to the street
  ...hWall(672, 16, 1248, [[528, 592]]),
];

export const VAULT_DOOR = { x1: 1136, y1: 128, x2: 1168, y2: 128, cx: 1152, cy: 128 };

export const ROOMS = [
  { name: 'OFFICES', x: 32, y: 32, w: 256, h: 288, floor: 'wood' },
  { name: 'GALLERY', x: 288, y: 32, w: 544, h: 288, floor: 'gallery' },
  { name: 'SECURITY', x: 832, y: 128, w: 256, h: 192, floor: 'slate' },
  { name: 'VAULT', x: 832, y: 32, w: 416, h: 96, floor: 'vault' },
  { name: 'AIRLOCK', x: 1088, y: 128, w: 160, h: 192, floor: 'airlock' },
  { name: 'CORRIDOR', x: 16, y: 320, w: 1232, h: 96, floor: 'corridor' },
  { name: 'BACK OFFICES', x: 32, y: 416, w: 256, h: 256, floor: 'wood' },
  { name: 'LOBBY', x: 288, y: 416, w: 544, h: 256, floor: 'marble' },
  { name: 'COUNTING ROOM', x: 832, y: 416, w: 416, h: 256, floor: 'counting' },
  { name: 'STREET', x: 16, y: 672, w: 1232, h: 112, floor: 'street' },
];

// Solid furniture: {kind:'rect'|'circle', ...} — blocks movement and sight.
export const FURNITURE = [
  // lobby
  { kind: 'rect', x: 500, y: 540, w: 120, h: 28, look: 'desk' },
  { kind: 'circle', x: 380, y: 470, r: 14, look: 'pillar' },
  { kind: 'circle', x: 740, y: 470, r: 14, look: 'pillar' },
  { kind: 'circle', x: 380, y: 620, r: 14, look: 'pillar' },
  { kind: 'circle', x: 740, y: 620, r: 14, look: 'pillar' },
  { kind: 'circle', x: 322, y: 648, r: 16, look: 'planter' },
  { kind: 'circle', x: 798, y: 648, r: 16, look: 'planter' },
  // gallery display cases and pillars
  { kind: 'rect', x: 360, y: 170, w: 56, h: 32, look: 'case' },
  { kind: 'rect', x: 680, y: 170, w: 56, h: 32, look: 'case' },
  { kind: 'rect', x: 470, y: 240, w: 56, h: 32, look: 'case' },
  { kind: 'circle', x: 330, y: 90, r: 13, look: 'pillar' },
  { kind: 'circle', x: 790, y: 90, r: 13, look: 'pillar' },
  { kind: 'circle', x: 330, y: 290, r: 13, look: 'pillar' },
  { kind: 'circle', x: 790, y: 290, r: 13, look: 'pillar' },
  { kind: 'circle', x: 560, y: 110, r: 17, look: 'pedestal' },
  // offices NW
  { kind: 'rect', x: 84, y: 96, w: 54, h: 28, look: 'desk' },
  { kind: 'rect', x: 174, y: 96, w: 54, h: 28, look: 'desk' },
  { kind: 'rect', x: 84, y: 226, w: 54, h: 28, look: 'desk' },
  { kind: 'rect', x: 174, y: 226, w: 54, h: 28, look: 'desk' },
  { kind: 'circle', x: 58, y: 292, r: 14, look: 'planter' },
  // back offices
  { kind: 'rect', x: 84, y: 486, w: 54, h: 28, look: 'desk' },
  { kind: 'rect', x: 174, y: 566, w: 54, h: 28, look: 'desk' },
  { kind: 'rect', x: 40, y: 424, w: 96, h: 14, look: 'shelf' },
  // counting room
  { kind: 'rect', x: 876, y: 486, w: 90, h: 30, look: 'table' },
  { kind: 'rect', x: 1050, y: 486, w: 90, h: 30, look: 'table' },
  { kind: 'rect', x: 880, y: 548, w: 80, h: 26, look: 'desk' },
  { kind: 'rect', x: 1184, y: 436, w: 46, h: 46, look: 'safe' },
  // security office console
  { kind: 'rect', x: 884, y: 168, w: 120, h: 26, look: 'console' },
  // vault
  { kind: 'rect', x: 1000, y: 40, w: 110, h: 38, look: 'bigsafe' },
  { kind: 'rect', x: 880, y: 90, w: 62, h: 34, look: 'pallet' },
  { kind: 'rect', x: 846, y: 40, w: 14, h: 80, look: 'shelf' },
  // corridor pillars
  { kind: 'circle', x: 250, y: 368, r: 10, look: 'pillar' },
  { kind: 'circle', x: 600, y: 368, r: 10, look: 'pillar' },
  { kind: 'circle', x: 900, y: 368, r: 10, look: 'pillar' },
];

// Shadow patches: standing here halves detection and shortens cones.
export const SHADOWS = [
  { x: 336, y: 148, w: 96, h: 64 }, { x: 656, y: 148, w: 96, h: 64 },
  { x: 296, y: 624, w: 64, h: 44 }, { x: 760, y: 624, w: 64, h: 44 },
  { x: 36, y: 36, w: 84, h: 60 }, { x: 224, y: 330, w: 48, h: 76 },
  { x: 846, y: 620, w: 96, h: 44 }, { x: 842, y: 140, w: 56, h: 100 },
];

export function inShadow(x, y) {
  return SHADOWS.some((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
}

// The 14 loot items. `crack: true` means the vault must be cracked first.
export const LOOT = [
  { id: 'diamond', name: 'Star Diamond', x: 560, y: 110, value: 5000, weight: 3, gem: true },
  { id: 'watch', name: 'Gold Watch', x: 388, y: 186, value: 900, weight: 1 },
  { id: 'necklace', name: 'Ruby Necklace', x: 708, y: 186, value: 1400, weight: 2 },
  { id: 'chalice', name: 'Silver Chalice', x: 498, y: 256, value: 700, weight: 2 },
  { id: 'painting', name: 'Old Master Painting', x: 560, y: 50, value: 2200, weight: 6 },
  { id: 'cash', name: 'Cash Stacks', x: 950, y: 108, value: 3000, weight: 5, crack: true },
  { id: 'gold', name: 'Gold Bars', x: 911, y: 120, value: 4000, weight: 10, crack: true },
  { id: 'bonds', name: 'Bearer Bonds', x: 950, y: 62, value: 2600, weight: 1, crack: true },
  { id: 'tiara', name: 'Sapphire Tiara', x: 1130, y: 58, value: 1800, weight: 2, crack: true },
  { id: 'coins', name: 'Coin Rolls', x: 921, y: 501, value: 600, weight: 4 },
  { id: 'gems', name: 'Ledger Gems', x: 1095, y: 501, value: 1200, weight: 2 },
  { id: 'ring', name: "CEO's Ring", x: 201, y: 110, value: 800, weight: 1 },
  { id: 'vase', name: 'Antique Vase', x: 111, y: 500, value: 950, weight: 3 },
  { id: 'statue', name: 'Bronze Statue', x: 330, y: 470, value: 1100, weight: 7 },
];

export const KEYCARD = { x: 920, y: 561 };
export const SAFE = { x: 1055, y: 59 };
export const VAN = { x: 1056, y: 688, w: 168, h: 88 };

export const SPAWNS = {
  front: { x: 560, y: 724 },
  window: { x: 56, y: 166 },
  roof: { x: 884, y: 84 },
};

export const PATROLS = [
  // gallery guard
  [{ x: 370, y: 270 }, { x: 750, y: 270 }, { x: 750, y: 92 }, { x: 370, y: 92 }],
  // lobby guard
  [{ x: 370, y: 600 }, { x: 750, y: 600 }, { x: 750, y: 480 }, { x: 370, y: 480 }],
  // corridor + airlock guard (out and back along the same spine)
  [{ x: 120, y: 368 }, { x: 1000, y: 368 }, { x: 1152, y: 368 }, { x: 1152, y: 240 },
   { x: 1152, y: 368 }, { x: 1000, y: 368 }],
];

export const CAMERAS = [
  { x: 806, y: 54, base: 2.25, name: 'Gallery' },
  { x: 560, y: 430, base: Math.PI / 2, name: 'Lobby' },
  { x: 1060, y: 332, base: Math.PI, name: 'Corridor' },
];

export const LASERS = [
  { x1: 1096, y1: 190, x2: 1240, y2: 190, period: 3.4, onTime: 2.1, phase: 0 },
  { x1: 1096, y1: 252, x2: 1240, y2: 252, period: 3.4, onTime: 2.1, phase: 1.7 },
  { x1: 880, y1: 324, x2: 880, y2: 412, period: 4.2, onTime: 2.6, phase: 0.8 },
  { x1: 420, y1: 210, x2: 700, y2: 210, period: 5.0, onTime: 3.0, phase: 2.2 },
];

// ---- geometry helpers -----------------------------------------------------

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const r = { x: bx - ax, y: by - ay }, s = { x: dx - cx, y: dy - cy };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return false;
  const t = ((cx - ax) * s.y - (cy - ay) * s.x) / den;
  const u = ((cx - ax) * r.y - (cy - ay) * r.x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((cx - ax) * dx + (cy - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(ax + t * dx, ay + t * dy, cx, cy) < r;
}

// Line of sight between two points, against walls (+ optional extra segment
// for the closed vault door) and solid furniture.
export function los(ax, ay, bx, by, extraSegs = []) {
  for (const w of WALLS) if (segSeg(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2)) return false;
  for (const w of extraSegs) if (segSeg(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2)) return false;
  for (const f of FURNITURE) {
    if (f.kind === 'circle') { if (segCircle(ax, ay, bx, by, f.x, f.y, f.r)) return false; }
    else if (segSeg(ax, ay, bx, by, f.x, f.y, f.x + f.w, f.y) ||
             segSeg(ax, ay, bx, by, f.x + f.w, f.y, f.x + f.w, f.y + f.h) ||
             segSeg(ax, ay, bx, by, f.x + f.w, f.y + f.h, f.x, f.y + f.h) ||
             segSeg(ax, ay, bx, by, f.x, f.y + f.h, f.x, f.y)) return false;
  }
  return true;
}

// Move a circle (entity) by (dx, dy), sliding along walls and furniture.
// Mutates and returns the position object {x, y}.
export function moveCircle(pos, dx, dy, r, extraSegs = []) {
  pos.x += dx; pos.y += dy;
  const segs = extraSegs.length ? WALLS.concat(extraSegs) : WALLS;
  for (let pass = 0; pass < 2; pass++) {
    for (const w of segs) {
      // closest point on segment
      const vx = w.x2 - w.x1, vy = w.y2 - w.y1;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((pos.x - w.x1) * vx + (pos.y - w.y1) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = w.x1 + t * vx, cy = w.y1 + t * vy;
      const d = dist(pos.x, pos.y, cx, cy);
      if (d < r && d > 0.0001) { pos.x = cx + (pos.x - cx) / d * r; pos.y = cy + (pos.y - cy) / d * r; }
      else if (d <= 0.0001) { pos.y -= r; }
    }
    for (const f of FURNITURE) {
      if (f.kind === 'circle') {
        const d = dist(pos.x, pos.y, f.x, f.y);
        if (d < r + f.r && d > 0.0001) {
          pos.x = f.x + (pos.x - f.x) / d * (r + f.r);
          pos.y = f.y + (pos.y - f.y) / d * (r + f.r);
        }
      } else {
        const nx = Math.max(f.x, Math.min(pos.x, f.x + f.w));
        const ny = Math.max(f.y, Math.min(pos.y, f.y + f.h));
        const d = dist(pos.x, pos.y, nx, ny);
        if (d < r) {
          if (d > 0.0001) { pos.x = nx + (pos.x - nx) / d * r; pos.y = ny + (pos.y - ny) / d * r; }
          else { pos.y = f.y - r; }
        }
      }
    }
  }
  return pos;
}

// Did the step from (ax, ay) to (bx, by) cross the segment (cx, cy)-(dx, dy)?
export function crossedSegment(ax, ay, bx, by, cx, cy, dx, dy) {
  return segSeg(ax, ay, bx, by, cx, cy, dx, dy);
}

export { GUARD };
