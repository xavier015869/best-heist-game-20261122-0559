// guards.js — the three guards: waypoint patrols, vision cones, suspicion,
// investigation and chase. A guard who fills his suspicion bar investigates;
// a guard who sees you clearly at close range (or any guard during lockdown)
// hunts you down, and a touch while hunting is the end of the heist.

import { DETECTION, GUARD, LOCKDOWN } from './config.js';
import { PATROLS, angleDiff, dist, inShadow, moveCircle } from './level.js';
import { inCone } from './security.js';

export function makeGuards() {
  return PATROLS.map((route, i) => ({
    id: i,
    x: route[0].x, y: route[0].y,
    route, wp: 1,
    angle: Math.atan2(route[1].y - route[0].y, route[1].x - route[0].x),
    state: 'patrol',           // patrol | suspicious | investigate | chase | return
    suspicion: 0,
    sees: false,
    target: null,              // last known player position
    waitFor: 0,
    stepPhase: Math.random() * 6,
  }));
}

function moveToward(G, g, tx, ty, speed, dt) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 3) return true;
  const want = Math.atan2(ty - g.y, tx - g.x);
  g.angle += clampTurn(want - g.angle, dt * 7);
  const step = Math.min(d, speed * dt);
  moveCircle(g, Math.cos(g.angle) * step, Math.sin(g.angle) * step, GUARD.radius, G.doorSegs());
  g.stepPhase += dt * speed * 0.09;
  return d < 10;
}

function clampTurn(diff, max) {
  const d = angleDiff(diff, 0);
  return Math.max(-max, Math.min(max, d));
}

export function updateGuards(G, dt) {
  let anySees = false;
  const p = G.player;
  for (const g of G.guards) {
    // ---- senses ------------------------------------------------------------
    const blinded = G.smokeAt(g) || G.smokeAt(p);
    const strength = (G.disabledFor > 0 || blinded) ? 0 :
      inCone(g.x, g.y, g.angle, p.x, p.y, GUARD.coneLength, GUARD.coneHalfAngle, G.doorSegs());
    g.sees = strength > 0;
    if (g.sees) {
      anySees = true;
      const rate = DETECTION.guardRate * (0.35 + strength) * (inShadow(p.x, p.y) ? DETECTION.shadowFactor : 1);
      g.suspicion = Math.min(1, g.suspicion + rate * dt);
      g.target = { x: p.x, y: p.y };
      if (g.suspicion > 0.35) G.raiseAlarm(DETECTION.alarmFromGuard * strength * dt, 'guard');
      if (g.suspicion >= 1 && g.state !== 'chase') {
        g.state = 'chase';
        G.onSpotted(g);
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - DETECTION.decay * dt);
    }
    // hearing: sprinting nearby, or any footsteps very close
    const pd = dist(g.x, g.y, p.x, p.y);
    if (p.noiseRadius > 0 && pd < p.noiseRadius && g.state !== 'chase') {
      g.suspicion = Math.min(1, g.suspicion + dt * 0.5);
      if (g.suspicion > 0.4) { g.target = { x: p.x, y: p.y }; if (g.state === 'patrol') g.state = 'suspicious'; }
    }
    if (pd < GUARD.hearRadius && g.state === 'patrol') { g.state = 'suspicious'; g.target = { x: p.x, y: p.y }; }

    // ---- behaviour -----------------------------------------------------------
    const huntSpeed = GUARD.chaseSpeed + (G.lockdown ? LOCKDOWN.guardSpeedBonus : 0);
    switch (g.state) {
      case 'patrol': {
        const wp = g.route[g.wp];
        if (moveToward(G, g, wp.x, wp.y, GUARD.patrolSpeed, dt)) {
          g.wp = (g.wp + 1) % g.route.length;
        }
        if (g.suspicion > 0.45 && g.target) g.state = 'suspicious';
        break;
      }
      case 'suspicious': {
        // stop and stare toward the stimulus
        if (g.target) {
          const want = Math.atan2(g.target.y - g.y, g.target.x - g.x);
          g.angle += clampTurn(want - g.angle, dt * 5);
        }
        g.waitFor += dt;
        if (g.waitFor > 0.85) { g.waitFor = 0; g.state = g.target ? 'investigate' : 'patrol'; }
        if (g.suspicion <= 0.05) g.state = 'patrol';
        break;
      }
      case 'investigate': {
        if (!g.target) { g.state = 'return'; break; }
        if (moveToward(G, g, g.target.x, g.target.y, GUARD.investigateSpeed, dt)) {
          g.waitFor += dt;
          g.angle += dt * 1.4; // look around
          if (g.waitFor > 1.5) { g.waitFor = 0; g.suspicion = Math.min(g.suspicion, 0.3); g.state = 'return'; }
        }
        break;
      }
      case 'chase': {
        if (g.sees) g.target = { x: p.x, y: p.y };
        if (g.target) moveToward(G, g, g.target.x, g.target.y, huntSpeed, dt);
        if (!g.sees && g.suspicion <= 0.25 && !G.lockdown) { g.state = 'return'; g.target = null; }
        if (G.lockdown) g.suspicion = 1;
        break;
      }
      case 'return': {
        // head back to the nearest waypoint, then resume the loop
        let best = 0, bd = Infinity;
        g.route.forEach((w, i) => { const d = dist(g.x, g.y, w.x, w.y); if (d < bd) { bd = d; best = i; } });
        if (moveToward(G, g, g.route[best].x, g.route[best].y, GUARD.returnSpeed, dt)) {
          g.wp = (best + 1) % g.route.length;
          g.state = 'patrol';
        }
        if (g.suspicion > 0.6 && g.target) g.state = 'investigate';
        break;
      }
    }

    // ---- the catch -----------------------------------------------------------
    if (pd < GUARD.catchRadius && (g.state === 'chase' || G.lockdown)) G.onCaught(g);
    else if (pd < 15 && g.suspicion > 0.85) G.onCaught(g);
  }
  return anySees;
}
