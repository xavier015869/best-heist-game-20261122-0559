// Midnight Vault — the Lantern Guards: patrol loops with pauses and scans,
// vision cones clipped by walls, and a suspicion meter with real recovery.
// States: patrol -> suspicious (investigate) -> chase -> give up and return.

import { TILE } from './config.js';
import { hasLineOfSight, moveCircle } from './level.js';

export const CONE_RANGE = 7 * TILE; // 224 px
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side

export function createGuards(level) {
  return level.guards.map((g) => ({
    name: g.name,
    color: g.color,
    route: g.route.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE })),
    speed: g.speed * TILE,
    pause: g.pause,
    scan: g.scan,
    wp: 0,
    x: (g.route[0][0] + 0.5) * TILE,
    y: (g.route[0][1] + 0.5) * TILE,
    dir: 0,
    state: 'patrol', // patrol | suspicious | investigate | chase
    suspicion: 0, // 0..100, fills when the thief is seen, cools otherwise
    wait: 0,
    lastSeen: null,
    closeCallAt: -10,
  }));
}

// Can this guard see the thief right now? Cone angle + range + line of sight,
// halved while the thief is sneaking in shadow or inside smoke.
export function guardSeesPlayer(game, guard) {
  const p = game.player;
  if (game.time < p.smokeUntil) return false;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return false;
  let ang = Math.atan2(dy, dx) - guard.dir;
  while (ang > Math.PI) ang -= Math.PI * 2;
  while (ang < -Math.PI) ang += Math.PI * 2;
  if (Math.abs(ang) > CONE_HALF_ANGLE) return false;
  if (!hasLineOfSight(game.level, guard.x, guard.y, p.x, p.y, game.openTiles)) return false;
  return true;
}

// Detection rate for a guard that currently sees the thief: closer, louder and
// brighter is faster; sneaking in shadow is much slower.
export function detectionRate(game, guard) {
  const p = game.player;
  const dist = Math.hypot(p.x - guard.x, p.y - guard.y);
  let rate = 55 * (1 - dist / (CONE_RANGE * 1.15));
  if (p.sneaking) rate *= 0.45;
  if (game.level && p && rate > 0) {
    // Shadow cover halves detection.
    const inShadow = (() => {
      const tx = Math.floor(p.x / TILE);
      const ty = Math.floor(p.y / TILE);
      return game.level.shadows.some((s) => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h);
    })();
    if (inShadow) rate *= 0.5;
  }
  if (p.sprinting) rate *= 1.5;
  return Math.max(6, rate);
}

export function updateGuards(game, dt) {
  const now = game.time;
  for (const g of game.guards) {
    const sees = guardSeesPlayer(game, g);
    const p = game.player;

    if (sees) {
      const rate = detectionRate(game, g);
      g.suspicion = Math.min(100, g.suspicion + rate * dt);
      g.lastSeen = { x: p.x, y: p.y, at: now };
      // A near-miss: the guard almost spots the thief, then loses them.
      if (g.suspicion > 55 && g.suspicion < 100 && g.state === 'patrol') {
        g.state = 'suspicious';
      }
      if (g.suspicion >= 100 && g.state !== 'chase') {
        g.state = 'chase';
        game.onSpotted(g);
      }
    } else {
      // Cool down when the thief breaks sight — recovery is real.
      g.suspicion = Math.max(0, g.suspicion - 14 * dt);
      if (g.suspicion < 30 && g.state === 'suspicious') g.state = 'patrol';
      if (g.state === 'chase' && now - (g.lastSeen ? g.lastSeen.at : 0) > 4) {
        g.state = 'investigate';
      }
    }

    // Movement by state.
    if (g.state === 'patrol') {
      patrolStep(game, g, dt);
    } else if (g.state === 'suspicious') {
      // Stand and scan: turn slowly, looking for the thief.
      g.dir += Math.sin(now * 1.4 + g.x) * 0.9 * dt;
    } else if (g.state === 'investigate') {
      if (g.lastSeen) {
        const arrived = moveToward(game, g, g.lastSeen.x, g.lastSeen.y, g.speed * 1.15, dt);
        if (arrived) {
          g.wait += dt;
          g.dir += 1.8 * dt;
          if (g.wait > 2.5) {
            g.state = 'patrol';
            g.wait = 0;
          }
        }
      } else {
        g.state = 'patrol';
      }
    } else if (g.state === 'chase') {
      if (g.lastSeen) {
        moveToward(game, g, p.x, p.y, g.speed * 1.75, dt);
        // Caught: a chasing guard that touches the thief ends the run.
        if (Math.hypot(p.x - g.x, p.y - g.y) < 26) {
          game.onCaught(g);
        }
      }
    }

    // Close call: the guard's suspicion peaked above 70 and then the thief
    // broke sight without being caught — worth +50 and a whoosh.
    if (g.suspicion > 70 && !sees && now - g.closeCallAt > 8 && g.state !== 'chase') {
      g.closeCallAt = now;
      game.onCloseCall(g);
    }
  }
}

function patrolStep(game, g, dt) {
  if (g.wait > 0) {
    g.wait -= dt;
    // Scan while paused at a waypoint.
    g.dir += Math.sin(game.time * 1.1 + g.wp) * 0.7 * dt;
    if (g.wait <= 0) g.wp = (g.wp + 1) % g.route.length;
    return;
  }
  const target = g.route[g.wp];
  const arrived = moveToward(game, g, target.x, target.y, g.speed, dt);
  if (arrived) g.wait = g.pause;
}

function moveToward(game, g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return true;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step;
  const ny = g.y + (dy / dist) * step;
  const pos = moveCircle(game.level, g.x, g.y, 11, nx - g.x, ny - g.y, game.openTiles);
  g.x = pos.x;
  g.y = pos.y;
  g.dir = Math.atan2(dy, dx);
  return false;
}
