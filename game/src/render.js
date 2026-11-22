// Midnight Vault — all canvas drawing: the bank, cones, lasers, HUD, planning
// screen, vault dial and end screens. Dark midnight style: safe cover is dark,
// danger is red, cameras cyan, loot gold.

import { TILE, W, H, COLORS, TOOLS, ENTRIES, PREP_POINTS } from './config.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guards.js';
import { CAMERA_HALF_ANGLE, laserLive } from './security.js';

function conePath(ctx, x, y, dir, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, dir, halfAngle, range, fill, stroke) {
  conePath(ctx, x, y, dir, halfAngle, range);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(game) {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, W, H);
  if (game.phase === 'plan') {
    drawPlan(game, ctx);
    return;
  }
  drawBank(game, ctx);
  drawLoot(game, ctx);
  drawDoors(game, ctx);
  drawLasers(game, ctx);
  drawCameras(game, ctx);
  drawGuards(game, ctx);
  drawPlayer(game, ctx);
  drawVan(game, ctx);
  drawHud(game, ctx);
  if (game.vault.active) drawVaultDial(game, ctx);
  if (game.phase === 'caught' || game.phase === 'win' || game.phase === 'timeout') {
    drawEnd(game, ctx);
  }
  drawFlash(game, ctx);
}

function drawBank(game, ctx) {
  const level = game.level;
  // Floor: checkerboard of two midnight blues.
  for (let ty = 0; ty < 20; ty++) {
    for (let tx = 0; tx < 30; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // Street: darker asphalt at the bottom.
  ctx.fillStyle = COLORS.street;
  ctx.fillRect(0, 17 * TILE, W, 3 * TILE);
  ctx.fillStyle = COLORS.asphalt;
  for (let x = 0; x < W; x += 64) ctx.fillRect(x, 18 * TILE + 14, 34, 4);
  // Shadow zones: darker floor the thief can hide in.
  for (const s of level.shadows) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(s.x * TILE, s.y * TILE, s.w * TILE, s.h * TILE);
  }
  // Room labels, faint, so the plan reads at a glance.
  ctx.fillStyle = 'rgba(244, 234, 210, 0.16)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('V A U L T', 24.5 * TILE, 1.6 * TILE);
  ctx.fillText('GALLERY', 24.5 * TILE, 17.6 * TILE);
  ctx.fillText('LOBBY', 14.5 * TILE, 13.4 * TILE);
  ctx.fillText('OFFICES', 4.5 * TILE, 13.4 * TILE);
  ctx.fillText('COUNTING', 4.5 * TILE, 8.4 * TILE);
  ctx.fillText('AIRLOCK', 24.5 * TILE, 10.8 * TILE);
  // Walls with a lit top edge.
  for (const w of level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x * TILE, w.y * TILE, w.w * TILE, w.h * TILE);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.x * TILE, w.y * TILE, w.w * TILE, 4);
  }
}

function drawLoot(game, ctx) {
  const level = game.level;
  for (const l of level.loot) {
    if (l.taken) continue;
    const x = (l.x + 0.5) * TILE;
    const y = (l.y + 0.5) * TILE;
    // Glow so the loot target is obvious at a glance.
    const pulse = 0.5 + 0.2 * Math.sin(game.time * 3 + l.x);
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = l.vault ? 'rgba(127, 231, 242,' + pulse * 0.5 + ')' : 'rgba(242, 193, 78,' + pulse * 0.4 + ')';
    ctx.fill();
    if (l.vault) {
      // The diamond: a bright cyan gem.
      ctx.fillStyle = COLORS.diamond;
      ctx.beginPath();
      ctx.moveTo(x, y - 11);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 11);
      ctx.lineTo(x - 9, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(x, y - 11);
      ctx.lineTo(x + 4, y - 2);
      ctx.lineTo(x - 4, y - 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5a12';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', x, y + 3);
    }
  }
  // The keycard on the office desk.
  const k = level.keycard;
  if (!k.taken) {
    const x = (k.x + 0.5) * TILE;
    const y = (k.y + 0.5) * TILE;
    ctx.fillStyle = '#7fe7f2';
    ctx.fillRect(x - 9, y - 6, 18, 12);
    ctx.fillStyle = '#123';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEY', x, y + 3);
  }
}

function drawDoors(game, ctx) {
  for (const d of game.level.doors) {
    const x = d.x * TILE;
    const y = d.y * TILE;
    if (d.kind === 'keycard') {
      ctx.fillStyle = d.open ? '#2e7d5b' : '#8a6d1f';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = d.open ? '#5ee08a' : COLORS.gold;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.open ? 'OPEN' : 'LOCKED', x + TILE / 2, y + TILE / 2 + 3);
    }
  }
  // The ceiling vent above the vault (roof entry).
  const v = game.level.vent;
  ctx.fillStyle = '#3a4666';
  ctx.fillRect(v.x * TILE, v.y * TILE, TILE, TILE);
  ctx.strokeStyle = '#8b93ad';
  ctx.lineWidth = 2;
  ctx.strokeRect(v.x * TILE + 4, v.y * TILE + 4, TILE - 8, TILE - 8);
  ctx.beginPath();
  ctx.moveTo(v.x * TILE + 8, v.y * TILE + TILE / 2);
  ctx.lineTo(v.x * TILE + TILE - 8, v.y * TILE + TILE / 2);
  ctx.stroke();
}

function drawLasers(game, ctx) {
  for (const l of game.security.lasers) {
    const y = l.y * TILE;
    const live = laserLive(l, game.time);
    ctx.strokeStyle = live ? COLORS.laser : 'rgba(255, 46, 99, 0.18)';
    ctx.lineWidth = live ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(l.x0 * TILE, y);
    ctx.lineTo(l.x1 * TILE, y);
    ctx.stroke();
    // Emitters on the walls.
    ctx.fillStyle = live ? COLORS.laser : '#5a2a35';
    ctx.fillRect(l.x0 * TILE - 4, y - 5, 6, 10);
    ctx.fillRect(l.x1 * TILE - 2, y - 5, 6, 10);
  }
}

function drawCameras(game, ctx) {
  for (const cam of game.security.cameras) {
    const dark = game.time < game.player.empUntil;
    const fill = dark ? 'rgba(55, 200, 232, 0.05)' : 'rgba(55, 200, 232, 0.16)';
    const stroke = dark ? 'rgba(55, 200, 232, 0.25)' : 'rgba(55, 200, 232, 0.7)';
    if (!dark) drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA_HALF_ANGLE, cam.range * TILE, fill, stroke);
    ctx.fillStyle = COLORS.camera;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1526';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 4, cam.y + Math.sin(cam.angle) * 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(game, ctx) {
  for (const g of game.guards) {
    const alert = g.state === 'chase';
    const suspicious = g.state === 'suspicious' || g.state === 'investigate';
    const fill = alert
      ? 'rgba(255, 77, 94, 0.30)'
      : suspicious
        ? 'rgba(255, 154, 61, 0.20)'
        : 'rgba(255, 107, 94, 0.13)';
    const stroke = alert ? 'rgba(255, 77, 94, 0.85)' : suspicious ? 'rgba(255, 154, 61, 0.7)' : 'rgba(255, 107, 94, 0.5)';
    drawCone(ctx, g.x, g.y, g.dir, CONE_HALF_ANGLE, CONE_RANGE, fill, stroke);
    // Suspicion ring around the guard.
    if (g.suspicion > 2) {
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * Math.PI * 2);
      ctx.strokeStyle = alert ? COLORS.red : COLORS.orange;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // The guard: a red lantern-bearer.
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 6, g.y + Math.sin(g.dir) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // "?" while suspicious, "!" while chasing.
    if (g.state === 'suspicious' || g.state === 'investigate' || g.state === 'chase') {
      ctx.fillStyle = alert ? COLORS.red : COLORS.orange;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - 20);
    }
  }
}

function drawPlayer(game, ctx) {
  const p = game.player;
  // Smoke cloud hides the thief.
  if (game.time < p.smokeUntil) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 205, 220, 0.35)';
    ctx.fill();
  }
  // Sneak dimming: the thief is harder to see while sneaking.
  ctx.globalAlpha = p.sneaking ? 0.75 : 1;
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2438';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 5, p.y + Math.sin(p.dir) * 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Lockpick progress ring.
  if (p.picking !== null) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, -Math.PI / 2, -Math.PI / 2 + p.picking * Math.PI * 2);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // Keycard indicator.
  if (p.hasKeycard) {
    ctx.fillStyle = '#7fe7f2';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEYCARD', p.x, p.y - 20);
  }
}

function drawVan(game, ctx) {
  const v = game.level.van;
  const x = v.x * TILE;
  const y = v.y * TILE;
  ctx.fillStyle = COLORS.van;
  roundRect(ctx, x, y, v.w * TILE, v.h * TILE, 6);
  ctx.fill();
  ctx.fillStyle = '#d8f5e3';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY VAN — ESCAPE HERE', x + (v.w * TILE) / 2, y + 20);
}

function drawHud(game, ctx) {
  // Top bar: alarm meter, loot, timer, tools.
  ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MIDNIGHT VAULT', 10, 22);
  // Alarm meter.
  const ax = 170;
  ctx.fillStyle = '#333';
  ctx.fillRect(ax, 10, 220, 14);
  const alarmW = (game.alarm / 100) * 220;
  ctx.fillStyle = game.alarm > 70 ? COLORS.red : game.alarm > 40 ? COLORS.orange : COLORS.green;
  ctx.fillRect(ax, 10, alarmW, 14);
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('ALARM ' + Math.round(game.alarm) + '%', ax + 228, 22);
  // Lockdown countdown.
  if (game.lockdown) {
    ctx.fillStyle = COLORS.red;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('LOCKDOWN ' + Math.ceil(game.lockdownLeft) + 's', 560, 22);
  }
  // Loot and score.
  const lootValue = game.player.loot.reduce((s, id) => {
    const item = game.level.loot.find((l) => l.id === id);
    return s + (item ? item.value : 0);
  }, 0);
  ctx.fillStyle = COLORS.gold;
  ctx.textAlign = 'right';
  ctx.fillText('LOOT $' + lootValue.toLocaleString() + '  ·  ' + game.player.loot.length + '/14', W - 10, 22);
  ctx.textAlign = 'left';
  // Tool counts.
  let tx = 10;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  const tools = game.player.tools;
  const bits = [];
  if (tools.emp) bits.push('EMP ×' + tools.emp + ' [1]');
  if (tools.smoke) bits.push('Smoke ×' + tools.smoke + ' [2]');
  if (tools.lockpick) bits.push('Lockpick [E hold]');
  if (tools.soles) bits.push('Soft soles');
  if (tools.duffel) bits.push('Duffel');
  ctx.fillText(bits.join('   '), tx, H - 10);
  // Controls hint.
  ctx.textAlign = 'right';
  ctx.fillText('WASD move · Shift sneak · F sprint · E interact · 1 EMP · 2 smoke · M mute', W - 10, H - 10);
  ctx.textAlign = 'left';
  // Vault progress.
  if (game.vault.opened) {
    ctx.fillStyle = COLORS.diamond;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('VAULT OPEN', 10, 52);
  }
}

function drawVaultDial(game, ctx) {
  const v = game.vault;
  ctx.fillStyle = 'rgba(5, 8, 18, 0.72)';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2 - 20;
  const R = 120;
  ctx.fillStyle = '#141a2b';
  ctx.beginPath();
  ctx.arc(cx, cy, R + 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4d5c85';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Green zone.
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, v.zoneCenter - 0.42, v.zoneCenter + 0.42);
  ctx.closePath();
  ctx.fillStyle = 'rgba(94, 224, 138, 0.5)';
  ctx.fill();
  // Needle.
  ctx.strokeStyle = COLORS.cream;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(v.angle) * R, cy + Math.sin(v.angle) * R);
  ctx.stroke();
  ctx.fillStyle = COLORS.cream;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  // Tumbler pips.
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx - 30 + i * 30, cy + R + 34, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < v.tumbler ? COLORS.green : '#333';
    ctx.fill();
  }
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CRACK THE VAULT — press SPACE in the green', cx, cy - R - 34);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Tumblers set: ' + v.tumbler + '/3 · Misses: ' + v.misses + ' · Esc to step away', cx, cy + R + 62);
  ctx.textAlign = 'left';
}

function drawEnd(game, ctx) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (game.phase === 'win') {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('CLEAN GETAWAY!', W / 2, H / 2 - 70);
    ctx.fillStyle = COLORS.cream;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(game.endTitle, W / 2, H / 2 - 30);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Score: ' + game.score.toLocaleString() + '   ·   Loot $' + game.lootValue.toLocaleString(), W / 2, H / 2 + 6);
    ctx.fillText(game.seen ? 'Spotted along the way — ghost bonus lost.' : 'Never once seen. Ghost bonus ×1.5!', W / 2, H / 2 + 34);
  } else if (game.phase === 'caught') {
    ctx.fillStyle = COLORS.red;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('CAUGHT!', W / 2, H / 2 - 40);
    ctx.fillStyle = COLORS.cream;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('A Lantern Guard got their hands on you.', W / 2, H / 2);
  } else {
    ctx.fillStyle = COLORS.red;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('LOCKDOWN — TOO LATE', W / 2, H / 2 - 40);
    ctx.fillStyle = COLORS.cream;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('The bank sealed itself with you inside.', W / 2, H / 2);
  }
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Press R to plan the heist again', W / 2, H / 2 + 70);
  ctx.textAlign = 'left';
}

function drawFlash(game, ctx) {
  if (!game.flashText || game.time - game.flashAt > 3.2) return;
  const alpha = Math.min(1, (3.2 - (game.time - game.flashAt)) / 0.8);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
  const w = ctx.measureText(game.flashText).width + 28;
  ctx.fillRect((W - w) / 2, H - 52, w, 26);
  ctx.fillStyle = COLORS.cream;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.flashText, W / 2, H - 34);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

function drawPlan(game, ctx) {
  ctx.fillStyle = '#0d1220';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('MIDNIGHT VAULT', W / 2, 70);
  ctx.fillStyle = COLORS.cream;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('One bank. One diamond. Three guards, three cameras, four lasers. Plan it right.', W / 2, 100);

  // The blueprint: a small map with patrol loops drawn.
  const bx = 60;
  const by = 130;
  const scale = 0.42;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(scale, scale);
  // Reuse the bank drawing at reduced scale by drawing the walls and rooms.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, W, H);
  for (const s of game.level.shadows) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(s.x * TILE, s.y * TILE, s.w * TILE, s.h * TILE);
  }
  for (const w of game.level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x * TILE, w.y * TILE, w.w * TILE, w.h * TILE);
  }
  // Patrol loops.
  for (const g of game.level.guards) {
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    g.route.forEach(([tx, ty], i) => {
      const x = (tx + 0.5) * TILE;
      const y = (ty + 0.5) * TILE;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  // Cameras and lasers.
  for (const c of game.level.cameras) {
    ctx.fillStyle = COLORS.camera;
    ctx.beginPath();
    ctx.arc((c.x + 0.5) * TILE, (c.y + 0.5) * TILE, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const l of game.level.lasers) {
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(l.x0 * TILE, l.y * TILE);
    ctx.lineTo(l.x1 * TILE, l.y * TILE);
    ctx.stroke();
  }
  // Diamond.
  ctx.fillStyle = COLORS.diamond;
  ctx.beginPath();
  ctx.moveTo(24.5 * TILE, 3 * TILE);
  ctx.lineTo(24.5 * TILE + 10, 3.5 * TILE);
  ctx.lineTo(24.5 * TILE, 4 * TILE);
  ctx.lineTo(24.5 * TILE - 10, 3.5 * TILE);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Entry points (clickable) and tool shop, right of the blueprint.
  const rx = 500;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('1 · CHOOSE YOUR ENTRY', rx, 150);
  ENTRIES.forEach((e, i) => {
    const y = 170 + i * 46;
    const selected = game.plan.entry === e.id;
    ctx.fillStyle = selected ? 'rgba(242, 193, 78, 0.25)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(rx, y, 400, 40);
    ctx.strokeStyle = selected ? COLORS.gold : '#4d5c85';
    ctx.strokeRect(rx, y, 400, 40);
    ctx.fillStyle = COLORS.cream;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText((i + 1) + ' — ' + e.name, rx + 10, y + 16);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(e.desc, rx + 10, y + 32);
  });

  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('2 · SPEND ' + game.plan.pointsLeft + ' OF ' + PREP_POINTS + ' PREP POINTS', rx, 322);
  let ty = 344;
  for (const [id, tool] of Object.entries(TOOLS)) {
    const count = game.plan.tools[id] || 0;
    const max = id === 'emp' || id === 'smoke' ? 2 : 1;
    const afford = game.plan.pointsLeft >= tool.cost && count < max;
    ctx.fillStyle = count > 0 ? 'rgba(94, 224, 138, 0.18)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(rx, ty, 400, 40);
    ctx.strokeStyle = count > 0 ? COLORS.green : '#4d5c85';
    ctx.strokeRect(rx, ty, 400, 40);
    ctx.fillStyle = COLORS.cream;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(tool.name + '  ×' + count + '  (' + tool.cost + ' pt)', rx + 10, ty + 16);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(tool.desc, rx + 10, ty + 32);
    ty += 46;
  }
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Click a tool to buy it, click again to sell it back.', rx, ty + 8);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Press ENTER (or click GO) to start the heist', W / 2, 610);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift sneak · F sprint · E interact · 1 EMP · 2 smoke · M mute', W / 2, 632);
  ctx.textAlign = 'left';
}
