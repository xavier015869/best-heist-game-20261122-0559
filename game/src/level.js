// Midnight Vault — the bank floor plan: walls, rooms, doors, shadows, patrol routes,
// cameras, lasers and loot placement. All geometry in tile units (1 tile = 32 px).

import { TILE, LOOT_TABLE } from './config.js';

// A wall is {x, y, w, h} in tiles. The bank is a rectangle with interior dividers;
// every gap in a divider is a doorway the thief and guards can walk through.
function buildWalls() {
  const walls = [];
  const add = (x, y, w, h) => walls.push({ x, y, w, h });
  // Outer shell.
  add(0, 0, 30, 1); // north
  add(0, 19, 30, 1); // south (street edge is open at the van door below)
  add(0, 0, 1, 20); // west
  add(29, 0, 1, 20); // east
  // Divider between the vault wing (top) and the airlock (y 8-10). The vault
  // door tile at (24,7) is a wall until the door opens; the rest is solid.
  add(1, 7, 19, 1); // west part, x 1-19
  add(20, 7, 9, 1); // east part, x 20-28 (includes the vault door tile)
  // Vault room walls: vault occupies x 20-28, y 1-6; its door sits at x 24, y 7.
  add(19, 1, 1, 6); // vault west wall
  // Divider between counting room (west, y 8-10) and corridor.
  add(1, 11, 8, 1); // gap at x=9 (door from counting room to corridor)
  // Divider between gallery (east, y 12-16) and corridor.
  add(20, 11, 9, 1); // gap at x=19 is the gallery door (shared corridor gap)
  // Divider between offices (west, y 12-16) and lobby, with a door gap at y=14.
  add(9, 12, 1, 2); // rows 12-13
  add(9, 15, 1, 2); // rows 15-16
  // Divider between lobby and gallery, with a door gap at y=14.
  add(19, 12, 1, 2); // rows 12-13
  add(19, 15, 1, 2); // rows 15-16
  // Laser airlock walls: the airlock is the strip y 8-10, x 20-28, entered from
  // the corridor along row 10 (gap at tile (19,10)) and from the vault door.
  add(19, 8, 1, 2); // rows 8-9; row 10 stays open as the entrance
  return walls;
}

// Shadow zones (dark floor where detection is halved), in tiles.
function buildShadows() {
  return [
    { x: 2, y: 12, w: 3, h: 2 }, // office corner
    { x: 11, y: 13, w: 3, h: 2 }, // lobby planters
    { x: 21, y: 12, w: 3, h: 2 }, // gallery alcove
    { x: 25, y: 15, w: 3, h: 2 }, // gallery far corner
    { x: 3, y: 8, w: 3, h: 2 }, // counting-room dark corner
    { x: 12, y: 10, w: 4, h: 1 }, // corridor rug
    { x: 22, y: 5, w: 2, h: 1 }, // vault shadow by the safe
  ];
}

// Doors the player can open. kind: 'keycard' needs the keycard or a lockpick.
function buildDoors() {
  return [
    { id: 'vault-door', x: 24, y: 7, w: 1, h: 1, kind: 'keycard', open: false, label: 'VAULT DOOR' },
    { id: 'front-doors', x: 15, y: 17, w: 1, h: 1, kind: 'open', open: true, label: 'FRONT DOORS' },
  ];
}

export function buildLevel() {
  const walls = buildWalls();
  const shadows = buildShadows();
  const doors = buildDoors();

  // Guard patrol loops (tile waypoints, looped). Three guards, three routes.
  const guards = [
    {
      name: 'Rook', color: '#ff6b5e',
      route: [[11, 10], [18, 10], [18, 15], [11, 15]],
      speed: 1.6, pause: 1.2, scan: 0.9,
    },
    {
      name: 'Bishop', color: '#ff9a3d',
      route: [[21, 13], [27, 13], [27, 16], [21, 16]],
      speed: 1.5, pause: 1.0, scan: 1.1,
    },
    {
      name: 'Knight', color: '#ff8fb0',
      route: [[3, 13], [7, 13], [7, 15], [3, 15]],
      speed: 1.7, pause: 0.8, scan: 0.8,
    },
  ];

  // Cameras: fixed mounts that sweep a cone. angle in radians, sweep range.
  const cameras = [
    { id: 'cam-lobby', x: 15, y: 12, base: Math.PI / 2, sweep: 0.9, speed: 0.5, range: 7 },
    { id: 'cam-gallery', x: 24, y: 12, base: Math.PI / 2, sweep: 1.1, speed: 0.65, range: 7 },
    { id: 'cam-vault', x: 24, y: 6, base: Math.PI / 2, sweep: 0.8, speed: 0.55, range: 6 },
  ];

  // Laser beams in the airlock (y 8-10, x 20-28): horizontal beams that blink
  // on a shared cycle with a phase offset, so the thief times the crossing.
  const lasers = [
    { y: 8.5, x0: 20, x1: 28, phase: 0.0, on: 1.6, off: 1.4 },
    { y: 9.0, x0: 20, x1: 28, phase: 0.7, on: 1.6, off: 1.4 },
    { y: 9.5, x0: 20, x1: 28, phase: 1.4, on: 1.6, off: 1.4 },
    { y: 10.0, x0: 20, x1: 28, phase: 2.1, on: 1.6, off: 1.4 },
  ];

  // Loot: a fresh copy of the table with runtime state.
  const loot = LOOT_TABLE.map((l) => ({ ...l, taken: false }));

  // The keycard sits on the office desk.
  const keycard = { x: 6, y: 14, taken: false, name: 'Security Keycard' };

  // The getaway van waits on the street, south of the front doors.
  const van = { x: 24, y: 18, w: 3, h: 1 };

  // Roof vent: the ceiling vent that drops into the vault wing (entry point).
  const vent = { x: 24, y: 2 };

  return { walls, shadows, doors, guards, cameras, lasers, loot, keycard, van, vent };
}

// --- geometry helpers (pixel space) -----------------------------------------

// openTiles: a Set of "tx,ty" keys for wall tiles that are currently open
// (the vault door once unlocked). Those tiles never block sight or movement.
function tileIsWall(level, tx, ty, openTiles) {
  if (openTiles && openTiles.has(tx + ',' + ty)) return false;
  for (const w of level.walls) {
    if (tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h) return true;
  }
  return false;
}

// True when the point (px, py) is inside any wall rectangle.
export function pointInWall(level, px, py, openTiles) {
  return tileIsWall(level, Math.floor(px / TILE), Math.floor(py / TILE), openTiles);
}

// Circle (px, py, r) against walls: true when the circle overlaps a wall.
export function circleHitsWall(level, px, py, r, openTiles) {
  const x0 = Math.floor((px - r) / TILE);
  const x1 = Math.floor((px + r) / TILE);
  const y0 = Math.floor((py - r) / TILE);
  const y1 = Math.floor((py + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileIsWall(level, tx, ty, openTiles)) {
        const cx = Math.max(tx * TILE, Math.min(px, (tx + 1) * TILE));
        const cy = Math.max(ty * TILE, Math.min(py, (ty + 1) * TILE));
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
  }
  return false;
}

// True when the point is inside a shadow zone.
export function pointInShadow(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  return level.shadows.some((s) => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h);
}

// Line of sight between two pixel points: blocked by any wall rectangle.
export function hasLineOfSight(level, x0, y0, x1, y1, openTiles) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInWall(level, x0 + dx * t, y0 + dy * t, openTiles)) return false;
  }
  return true;
}

// Move a circle with simple axis-separated wall sliding; returns new position.
export function moveCircle(level, x, y, r, dx, dy, openTiles) {
  let nx = x + dx;
  if (!circleHitsWall(level, nx, y, r, openTiles)) x = nx;
  let ny = y + dy;
  if (!circleHitsWall(level, x, ny, r, openTiles)) y = ny;
  return { x, y };
}
