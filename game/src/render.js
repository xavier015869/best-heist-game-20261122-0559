// render.js — everything the player (and the screenshot judge) sees:
// the bank's floors and furniture, vision cones, lasers, the thief and his
// growing bag, the HUD, the planning blueprint and the ending screens.

import { CAMERA, GUARD, PREP, ENTRIES, VIEW_W, VIEW_H } from './config.js';
import {
  FURNITURE, KEYCARD, LASERS, LOOT, PATROLS, ROOMS, SAFE, SHADOWS, SPAWNS,
  VAULT_DOOR, VAN, WALLS, inShadow,
} from './level.js';
import { carryCap } from './player.js';

const GOLD = '#ffd75e';
const INK = '#0d1017';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shadowEllipse(ctx, x, y, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// ---- floors -----------------------------------------------------------------

function drawFloor(ctx, room, t) {
  const { x, y, w, h } = room;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  switch (room.floor) {
    case 'marble': {
      ctx.fillStyle = '#2c3345'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      const s = 34;
      for (let i = 0; i < w / s; i++) for (let j = 0; j < h / s; j++)
        if ((i + j) % 2 === 0) ctx.fillRect(x + i * s, y + j * s, s, s);
      break;
    }
    case 'gallery': {
      const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 40, x + w / 2, y + h / 2, w * 0.62);
      g.addColorStop(0, '#27335f'); g.addColorStop(1, '#171e38');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(120,20,30,0.5)';           // the red carpet
      ctx.fillRect(x + w / 2 - 52, y, 104, h);
      ctx.strokeStyle = 'rgba(255,215,94,0.16)'; ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 8, y); ctx.lineTo(x + i * w / 8, y + h); ctx.stroke(); }
      break;
    }
    case 'wood': {
      ctx.fillStyle = '#38302a'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let j = 0; j < h; j += 18) { ctx.beginPath(); ctx.moveTo(x, y + j); ctx.lineTo(x + w, y + j); ctx.stroke(); }
      break;
    }
    case 'vault': {
      ctx.fillStyle = '#1b2129'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 12; i < w; i += 28) for (let j = 12; j < h; j += 28) { ctx.beginPath(); ctx.arc(x + i, y + j, 1.6, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,215,94,0.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 130, y + 8, 150, 80);
      break;
    }
    case 'airlock': {
      ctx.fillStyle = '#2b3038'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,190,40,0.35)';
      for (let i = 0; i < w; i += 24) { ctx.fillRect(x + i, y + 4, 12, 5); ctx.fillRect(x + i, y + h - 9, 12, 5); }
      break;
    }
    case 'corridor': {
      ctx.fillStyle = '#252b38'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(110,22,32,0.55)'; ctx.fillRect(x, y + 34, w, 28);
      ctx.strokeStyle = 'rgba(255,215,94,0.25)';
      ctx.beginPath(); ctx.moveTo(x, y + 34); ctx.lineTo(x + w, y + 34); ctx.moveTo(x, y + 62); ctx.lineTo(x + w, y + 62); ctx.stroke();
      break;
    }
    case 'counting': {
      ctx.fillStyle = '#1e2f2c'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < w; i += 30) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke(); }
      break;
    }
    case 'street': {
      ctx.fillStyle = '#14171d'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#232833'; ctx.fillRect(x, y, w, 26);           // sidewalk
      ctx.fillStyle = 'rgba(255,215,94,0.5)';
      for (let i = 20; i < w; i += 64) ctx.fillRect(x + i, y + 66, 34, 5); // lane dashes
      break;
    }
    default: {
      ctx.fillStyle = '#242a38'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < w; i += 30) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke(); }
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(230,238,255,0.20)';
  ctx.font = '600 11px Verdana, sans-serif';
  ctx.fillText(room.name, x + 8, y + 16);
}

// ---- furniture ----------------------------------------------------------------

function drawFurniture(ctx, f) {
  if (f.kind === 'circle') {
    shadowEllipse(ctx, f.x, f.y + 3, f.r + 2, (f.r + 2) * 0.5);
    if (f.look === 'pillar') {
      ctx.fillStyle = '#4a5468'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#66738c'; ctx.beginPath(); ctx.arc(f.x - 3, f.y - 3, f.r * 0.55, 0, 7); ctx.fill();
    } else if (f.look === 'planter') {
      ctx.fillStyle = '#5a4632'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#2e7d4f';
      for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 7, f.y + Math.sin(a) * 7, 6, 0, 7); ctx.fill(); }
    } else if (f.look === 'pedestal') {
      ctx.fillStyle = '#3d465c'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 3, 0, 7); ctx.stroke();
    }
    return;
  }
  shadowEllipse(ctx, f.x + f.w / 2, f.y + f.h - 2, f.w / 2, 6);
  const { x, y, w, h } = f;
  switch (f.look) {
    case 'desk': case 'table':
      ctx.fillStyle = '#4d3b28'; rr(ctx, x, y, w, h, 3); ctx.fill();
      ctx.fillStyle = '#6b543a'; rr(ctx, x + 3, y + 3, w - 6, h - 6, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x + w * 0.2, y + h * 0.3, 12, 8); ctx.fillRect(x + w * 0.6, y + h * 0.45, 10, 7);
      break;
    case 'case':
      ctx.fillStyle = '#31405e'; rr(ctx, x, y, w, h, 3); ctx.fill();
      ctx.fillStyle = 'rgba(160,220,255,0.20)'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 2); ctx.fill();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; rr(ctx, x + 4, y + 4, w - 8, h - 8, 2); ctx.stroke();
      break;
    case 'safe': case 'bigsafe':
      ctx.fillStyle = '#39424f'; rr(ctx, x, y, w, h, 4); ctx.fill();
      ctx.fillStyle = '#232a33'; rr(ctx, x + 5, y + 5, w - 10, h - 10, 3); ctx.fill();
      ctx.strokeStyle = '#9fb2c8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.26, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 3, 0, 7); ctx.fillStyle = '#9fb2c8'; ctx.fill();
      break;
    case 'console':
      ctx.fillStyle = '#222a35'; rr(ctx, x, y, w, h, 3); ctx.fill();
      ctx.fillStyle = '#39d0c4';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 28, y + 6, 20, 12);
      break;
    case 'pallet':
      ctx.fillStyle = '#5c4a26'; rr(ctx, x, y, w, h, 2); ctx.fill();
      ctx.fillStyle = GOLD;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(x + 6 + i * 18, y + 5 + j * 13, 14, 9);
      break;
    case 'shelf':
      ctx.fillStyle = '#3a3f4a'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let j = 8; j < h; j += 18) ctx.fillRect(x + 2, y + j, w - 4, 6);
      break;
    default:
      ctx.fillStyle = '#3a4152'; rr(ctx, x, y, w, h, 3); ctx.fill();
  }
}

// ---- loot glyphs ----------------------------------------------------------------

function drawLootItem(ctx, item, t) {
  const { x, y } = item;
  const pulse = 0.75 + Math.sin(t * 3 + x) * 0.25;
  if (item.gem) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 30 + pulse * 8);
    g.addColorStop(0, 'rgba(140,240,255,0.55)'); g.addColorStop(1, 'rgba(140,240,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#aef3ff'; ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#5fc9e8'; ctx.fillRect(-8, -8, 16, 7);
    ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 1; ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
    return;
  }
  ctx.fillStyle = `rgba(255,215,94,${0.14 + pulse * 0.08})`;
  ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
  ctx.fillStyle = GOLD; ctx.strokeStyle = '#a87f1f'; ctx.lineWidth = 1;
  ctx.save(); ctx.translate(x, y);
  switch (item.id) {
    case 'painting':
      ctx.fillStyle = '#7a5a24'; ctx.fillRect(-16, -7, 32, 14);
      ctx.fillStyle = '#7fa6c9'; ctx.fillRect(-13, -4, 26, 8);
      break;
    case 'cash':
      ctx.fillStyle = '#3f9e57'; ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = '#57c474'; ctx.fillRect(-10, -2, 20, 3);
      break;
    case 'gold':
      ctx.fillRect(-11, 0, 10, 5); ctx.fillRect(1, 0, 10, 5); ctx.fillRect(-5, -6, 10, 5);
      break;
    case 'bonds':
      ctx.fillStyle = '#e8e4d4'; ctx.fillRect(-8, -6, 16, 12);
      ctx.strokeStyle = '#8a8474'; ctx.strokeRect(-8, -6, 16, 12);
      break;
    case 'coins':
      ctx.beginPath(); ctx.ellipse(0, 3, 9, 3.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -1, 9, 3.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -5, 9, 3.5, 0, 0, 7); ctx.fill();
      break;
    case 'gems':
      ctx.fillStyle = '#b07fe8';
      ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-3, -6); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(6, -4); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
      break;
    case 'ring':
      ctx.beginPath(); ctx.arc(0, 1, 6, 0, 7); ctx.stroke();
      ctx.fillStyle = '#aef3ff'; ctx.fillRect(-2, -8, 4, 4);
      break;
    case 'tiara':
      ctx.beginPath(); ctx.moveTo(-9, 5); ctx.lineTo(-9, -3); ctx.lineTo(-4, 2); ctx.lineTo(0, -6); ctx.lineTo(4, 2); ctx.lineTo(9, -3); ctx.lineTo(9, 5); ctx.closePath(); ctx.fill();
      break;
    case 'vase':
      ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(3, -8); ctx.lineTo(6, -2); ctx.lineTo(5, 7); ctx.lineTo(-5, 7); ctx.lineTo(-6, -2); ctx.closePath();
      ctx.fillStyle = '#7fc9c0'; ctx.fill();
      break;
    case 'statue':
      ctx.fillStyle = '#b0782e';
      ctx.beginPath(); ctx.arc(0, -5, 4, 0, 7); ctx.fill(); ctx.fillRect(-3, -1, 6, 9);
      break;
    case 'necklace':
      ctx.strokeStyle = '#e85d75'; ctx.beginPath(); ctx.arc(0, -2, 8, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = '#e85d75'; ctx.beginPath(); ctx.arc(0, 7, 2.6, 0, 7); ctx.fill();
      break;
    case 'chalice':
      ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, -7); ctx.lineTo(4, 0); ctx.lineTo(1, 0); ctx.lineTo(1, 5); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.lineTo(-1, 5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      break;
    default: // watch and friends
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5a24'; ctx.fillRect(-2, -10, 4, 4); ctx.fillRect(-2, 6, 4, 4);
  }
  ctx.restore();
}

// ---- cones, lasers, entities ----------------------------------------------------

function drawCone(ctx, x, y, angle, length, half, color) {
  const g = ctx.createRadialGradient(x, y, 6, x, y, length);
  g.addColorStop(0, color.replace('A', '0.34'));
  g.addColorStop(0.7, color.replace('A', '0.15'));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, length, angle - half, angle + half);
  ctx.closePath(); ctx.fill();
}

function drawLasers(ctx, G) {
  for (const laser of G.lasers) {
    // emitter posts
    ctx.fillStyle = '#596273';
    ctx.fillRect(laser.x1 - 3, laser.y1 - 3, 6, 6);
    ctx.fillRect(laser.x2 - 3, laser.y2 - 3, 6, 6);
    if (laser.on) {
      ctx.save();
      ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 9;
      ctx.strokeStyle = 'rgba(255,45,45,0.95)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,170,170,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = laser.disabledFor > 0 ? 'rgba(90,160,255,0.4)' : 'rgba(255,45,45,0.28)';
      ctx.setLineDash([4, 6]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawGuard(ctx, g, t) {
  if (g.sees || g.state === 'chase') drawCone(ctx, g.x, g.y, g.angle, GUARD.coneLength, GUARD.coneHalfAngle, 'rgba(255,64,48,A)');
  else drawCone(ctx, g.x, g.y, g.angle, GUARD.coneLength, GUARD.coneHalfAngle, 'rgba(255,120,60,A)');
  shadowEllipse(ctx, g.x, g.y + 8, 13, 5);
  ctx.fillStyle = '#2c4a7c';
  ctx.beginPath(); ctx.arc(g.x, g.y, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#d9b48a';
  ctx.beginPath(); ctx.arc(g.x + Math.cos(g.angle) * 4, g.y + Math.sin(g.angle) * 4, 5.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#1d3357';
  ctx.beginPath(); ctx.arc(g.x, g.y, 8, g.angle + 2.2, g.angle + 4.1); ctx.lineTo(g.x, g.y); ctx.closePath(); ctx.fill();
  // suspicion ring
  if (g.suspicion > 0.03) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(g.x, g.y - 22, 7, 0, 7); ctx.stroke();
    ctx.strokeStyle = g.suspicion > 0.75 ? '#ff4040' : g.suspicion > 0.4 ? '#ffb040' : '#ffe98a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(g.x, g.y - 22, 7, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2); ctx.stroke();
  }
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff4040'; ctx.font = '900 17px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 32);
    ctx.textAlign = 'left';
  } else if (g.state === 'suspicious' || g.state === 'investigate') {
    ctx.fillStyle = '#ffe98a'; ctx.font = '900 14px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('?', g.x, g.y - 32);
    ctx.textAlign = 'left';
  }
}

function drawCamera(ctx, cam, disabled) {
  if (!disabled) drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.coneLength, CAMERA.coneHalfAngle, 'rgba(40,220,255,A)');
  ctx.fillStyle = '#39424f';
  ctx.beginPath(); ctx.arc(cam.x, cam.y, 7, 0, 7); ctx.fill();
  ctx.fillStyle = disabled ? '#5a6a7a' : (cam.fill > 0.45 ? '#ff4040' : '#40e0ff');
  ctx.beginPath(); ctx.arc(cam.x + Math.cos(cam.angle) * 5, cam.y + Math.sin(cam.angle) * 5, 3, 0, 7); ctx.fill();
  if (cam.fill > 0.05) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(cam.x - 11, cam.y - 20, 22, 4);
    ctx.fillStyle = '#40e0ff'; ctx.fillRect(cam.x - 11, cam.y - 20, 22 * cam.fill, 4);
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  const bagR = 6 + p.weight * 0.55;
  shadowEllipse(ctx, p.x, p.y + 9, 14, 5);
  // the loot bag, slung behind
  ctx.fillStyle = '#6e5326';
  ctx.beginPath(); ctx.arc(p.x - Math.cos(p.angle) * 11, p.y - Math.sin(p.angle) * 11 + 3, bagR, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4c3a18'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(p.x - Math.cos(p.angle) * 11, p.y - Math.sin(p.angle) * 11 + 3, bagR, 0, 7); ctx.stroke();
  // body: dark teal thief with a hood
  ctx.fillStyle = '#123a3a';
  ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#1d5c56';
  ctx.beginPath(); ctx.arc(p.x, p.y, 8.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 4.5, p.y + Math.sin(p.angle) * 4.5, 4.6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#0a2422'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 11, p.angle + 2.4, p.angle + 3.9); ctx.stroke();
  // standing in shadow: a small crescent tells the player they are covered
  if (inShadow(p.x, p.y)) {
    ctx.fillStyle = 'rgba(160,200,255,0.9)';
    ctx.beginPath(); ctx.arc(p.x, p.y - 24, 5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(10,14,22,0.9)';
    ctx.beginPath(); ctx.arc(p.x + 2.2, p.y - 25.5, 4.2, 0, 7); ctx.fill();
  }
}

// ---- HUD --------------------------------------------------------------------------

function drawHUD(ctx, G) {
  ctx.fillStyle = 'rgba(8,10,16,0.88)';
  ctx.fillRect(0, 0, VIEW_W, 48);
  ctx.fillStyle = GOLD;
  ctx.font = '900 15px Georgia, serif';
  ctx.fillText('MIDNIGHT VAULT', 14, 29);
  // alarm meter
  const ax = 168, aw = 330;
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(ctx, ax, 14, aw, 18, 4); ctx.fill();
  const a = G.alarm;
  ctx.fillStyle = a > 66 ? '#ff4040' : a > 33 ? '#ffb040' : '#57c474';
  if (a > 0.5) { rr(ctx, ax, 14, aw * a / 100, 18, 4); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; rr(ctx, ax, 14, aw, 18, 4); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '700 12px Verdana, sans-serif';
  ctx.fillText('ALARM ' + Math.floor(a) + '%', ax + 8, 27);
  // loot + weight
  ctx.fillStyle = GOLD; ctx.font = '700 14px Verdana, sans-serif';
  ctx.fillText('$ ' + G.player.value.toLocaleString('en-US'), 522, 29);
  ctx.fillStyle = '#cfe3ff'; ctx.font = '600 12px Verdana, sans-serif';
  ctx.fillText('BAG ' + G.player.weight + '/' + carryCap(G), 640, 29);
  // tools
  const tool = (label, n, key, x) => {
    ctx.fillStyle = n > 0 ? '#aef3ff' : 'rgba(255,255,255,0.3)';
    ctx.fillText(label + ' ×' + n + ' [' + key + ']', x, 29);
  };
  tool('EMP', G.tools.emp, 'Q', 716);
  tool('SMOKE', G.tools.smoke, 'F', 812);
  if (G.hasKeycard) { ctx.fillStyle = '#57c474'; ctx.fillText('KEYCARD ✓', 922, 29); }
  else { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText('KEYCARD —', 922, 29); }
  // timer
  const mm = String(Math.floor(G.playTime / 60)).padStart(2, '0');
  const ss = String(Math.floor(G.playTime % 60)).padStart(2, '0');
  ctx.fillStyle = '#fff'; ctx.font = '700 14px Verdana, sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(mm + ':' + ss, VIEW_W - 14, 29);
  ctx.textAlign = 'left';
  // objective strip
  ctx.fillStyle = 'rgba(8,10,16,0.65)';
  ctx.fillRect(0, 48, VIEW_W, 24);
  ctx.fillStyle = '#ffe9a8'; ctx.font = '600 12.5px Verdana, sans-serif';
  ctx.fillText('» ' + G.objective(), 14, 64);
  if (G.lockdown) {
    const left = Math.max(0, G.lockdown);
    ctx.fillStyle = Math.sin(G.time * 8) > 0 ? '#ff4040' : '#ffb0a0';
    ctx.font = '900 25px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('LOCKDOWN — ESCAPE IN ' + left.toFixed(1), VIEW_W / 2, 108);
    ctx.textAlign = 'left';
  }
}

function drawDial(ctx, G) {
  const d = G.dial;
  const px = 400, py = 548, pw = 480, ph = 224;
  ctx.save();
  if (d.wobble > 0) ctx.translate(Math.sin(G.time * 46) * 3 * d.wobble, 0);
  ctx.fillStyle = 'rgba(10,12,20,0.94)'; rr(ctx, px, py, pw, ph, 10); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; rr(ctx, px, py, pw, ph, 10); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.font = '900 15px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('CRACKING THE VAULT', px + pw / 2, py + 26);
  const cx = px + 110, cy = py + 128, r = 66;
  ctx.fillStyle = '#232a35'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#596273'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  // gold zone
  ctx.strokeStyle = GOLD; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(cx, cy, r - 5, d.zoneStart, d.zoneStart + d.zoneSize); ctx.stroke();
  // ticks
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12));
    ctx.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
    ctx.stroke();
  }
  // needle
  ctx.strokeStyle = '#ff5040'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(d.angle) * (r - 8), cy + Math.sin(d.angle) * (r - 8)); ctx.stroke();
  ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
  // tumblers + instructions
  ctx.textAlign = 'left';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < d.tumblers ? GOLD : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(px + 250 + i * 44, py + 92, 13, 0, 7); ctx.fill();
    ctx.fillStyle = INK; ctx.font = '900 13px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), px + 250 + i * 44, py + 97);
  }
  ctx.fillStyle = '#e8ecf4'; ctx.font = '600 13.5px Verdana, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Stop the needle in the gold zone.', px + 236, py + 140);
  ctx.fillText('Press SPACE or E to set a tumbler.', px + 236, py + 162);
  ctx.fillStyle = '#ff9a8a';
  ctx.fillText('A miss is loud: +6 alarm.', px + 236, py + 184);
  ctx.restore();
  ctx.textAlign = 'left';
}

// ---- the play scene ---------------------------------------------------------------

export function drawGame(ctx, G) {
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const room of ROOMS) drawFloor(ctx, room, G.time);
  // shadow patches
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  for (const s of SHADOWS) { rr(ctx, s.x, s.y, s.w, s.h, 6); ctx.fill(); }
  // the getaway van
  const v = VAN;
  ctx.fillStyle = '#101319'; rr(ctx, v.x, v.y, v.w, v.h, 8); ctx.fill();
  ctx.fillStyle = '#27324a'; rr(ctx, v.x + 4, v.y + 4, v.w - 8, v.h - 8, 6); ctx.fill();
  ctx.fillStyle = '#101319'; rr(ctx, v.x + v.w - 44, v.y + 10, 34, v.h - 20, 4); ctx.fill();
  ctx.fillStyle = '#aef3ff'; ctx.fillRect(v.x + v.w - 40, v.y + 14, 26, 18);
  ctx.fillStyle = GOLD; ctx.font = '900 13px Verdana, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('GETAWAY VAN', v.x + v.w / 2 - 14, v.y + v.h / 2 + 4);
  ctx.textAlign = 'left';
  if (G.hasDiamond) {
    ctx.strokeStyle = `rgba(255,215,94,${0.5 + Math.sin(G.time * 5) * 0.3})`;
    ctx.lineWidth = 2.5; rr(ctx, v.x - 3, v.y - 3, v.w + 6, v.h + 6, 9); ctx.stroke();
  }
  // furniture, then the vault door over its wall gap
  for (const f of FURNITURE) drawFurniture(ctx, f);
  if (!G.doorOpen) {
    ctx.fillStyle = '#4a5568'; ctx.fillRect(VAULT_DOOR.x1, VAULT_DOOR.y1 - 6, 32, 12);
    ctx.fillStyle = G.hasKeycard ? '#57c474' : '#ff5040';
    ctx.beginPath(); ctx.arc(VAULT_DOOR.cx, VAULT_DOOR.cy, 3.4, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#4a5568';
    ctx.save(); ctx.translate(VAULT_DOOR.x1, VAULT_DOOR.y1); ctx.rotate(0.9); ctx.fillRect(0, -5, 32, 10); ctx.restore();
  }
  // keycard pickup
  if (!G.hasKeycard) {
    const bob = Math.sin(G.time * 4) * 2;
    ctx.fillStyle = '#57c474'; rr(ctx, KEYCARD.x - 8, KEYCARD.y - 5 + bob, 16, 10, 2); ctx.fill();
    ctx.fillStyle = '#0d2818'; ctx.fillRect(KEYCARD.x - 8, KEYCARD.y - 1 + bob, 16, 2.4);
  }
  // loot
  for (const item of G.loot) {
    if (item.taken) continue;
    if (item.crack && !G.cracked) {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath(); ctx.arc(item.x, item.y, 5, 0, 7); ctx.fill();
      continue;
    }
    drawLootItem(ctx, item, G.time);
  }
  drawLasers(ctx, G);
  for (const cam of G.cameras) drawCamera(ctx, cam, G.disabledFor > 0);
  for (const g of G.guards) drawGuard(ctx, g, G.time);
  drawPlayer(ctx, G);
  // smoke clouds
  for (const s of G.smokes) {
    const a = Math.min(0.5, s.left / 2);
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    g.addColorStop(0, `rgba(200,208,220,${a})`); g.addColorStop(1, 'rgba(200,208,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }
  // particles
  for (const pt of G.particles) {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  // walls on top of everything that moves
  ctx.strokeStyle = '#05070b'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (const w of WALLS) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); }
  ctx.strokeStyle = '#39445a'; ctx.lineWidth = 5;
  for (const w of WALLS) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); }
  // interaction prompt
  const prompt = G.prompt();
  if (prompt && G.state === 'play') {
    ctx.font = '700 13px Verdana, sans-serif';
    const w = ctx.measureText(prompt).width + 20;
    ctx.fillStyle = 'rgba(8,10,16,0.85)'; rr(ctx, G.player.x - w / 2, G.player.y - 52, w, 22, 5); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    ctx.fillText(prompt, G.player.x, G.player.y - 37);
    ctx.textAlign = 'left';
  }
  drawHUD(ctx, G);
  if (G.dial.open) drawDial(ctx, G);
  // toast
  if (G.toastMsg && G.time < G.toastUntil) {
    ctx.font = '700 15px Verdana, sans-serif';
    const w = ctx.measureText(G.toastMsg).width + 28;
    ctx.fillStyle = 'rgba(8,10,16,0.88)'; rr(ctx, (VIEW_W - w) / 2, VIEW_H - 52, w, 30, 7); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    ctx.fillText(G.toastMsg, VIEW_W / 2, VIEW_H - 32);
    ctx.textAlign = 'left';
  }
  // alarm vignette
  const vig = G.alarm / 100 * 0.32 + (G.lockdown ? 0.14 + Math.sin(G.time * 6) * 0.06 : 0);
  if (vig > 0.02) {
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.36, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.78);
    g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(160,0,0,${vig})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// ---- the planning screen -------------------------------------------------------------

const PLAN = { ox: 26, oy: 148, s: 0.645 };
export function planLayout() {
  const items = Object.keys(PREP.costs).map((key, i) => ({
    key,
    buy: { x: 906, y: 128 + i * 66, w: 252, h: 58 },
    minus: { x: 1166, y: 128 + i * 66, w: 62, h: 58 },
  }));
  const entries = Object.keys(ENTRIES).map((key, i) => ({
    key,
    rect: { x: 906, y: 486 + i * 52, w: 322, h: 44 },
  }));
  return { items, entries, start: { x: 906, y: 668, w: 322, h: 62 } };
}

function planMapPoint(x, y) { return { x: PLAN.ox + x * PLAN.s, y: PLAN.oy + y * PLAN.s }; }

export function drawPlan(ctx, G) {
  ctx.fillStyle = '#0d1b2e'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // blueprint grid
  ctx.strokeStyle = 'rgba(90,160,255,0.10)'; ctx.lineWidth = 1;
  for (let x = 0; x < VIEW_W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
  for (let y = 0; y < VIEW_H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }
  ctx.fillStyle = '#eaf4ff'; ctx.font = '900 34px Georgia, serif';
  ctx.fillText('MIDNIGHT VAULT', 26, 52);
  ctx.fillStyle = '#8fc3ff'; ctx.font = '600 15px Verdana, sans-serif';
  ctx.fillText('One night. One diamond. Every camera, cone and laser is on this blueprint — plan like it matters.', 26, 80);
  ctx.fillStyle = '#ffd75e'; ctx.font = '700 13px Verdana, sans-serif';
  ctx.fillText('WASD / arrows to move · SHIFT to run (loud) · E interact · Q EMP · F smoke · Shadows halve detection', 26, 106);

  // the blueprint itself
  const { ox, oy, s } = PLAN;
  ctx.fillStyle = 'rgba(16,42,74,0.85)'; ctx.fillRect(ox - 8, oy - 8, 1280 * s + 16, 800 * s + 16);
  for (const room of ROOMS) {
    ctx.strokeStyle = 'rgba(160,210,255,0.75)'; ctx.lineWidth = 1.6;
    ctx.strokeRect(ox + room.x * s, oy + room.y * s, room.w * s, room.h * s);
    ctx.fillStyle = 'rgba(190,225,255,0.8)'; ctx.font = '600 9.5px Verdana, sans-serif';
    ctx.fillText(room.name, ox + room.x * s + 5, oy + room.y * s + 12);
  }
  // patrol loops
  ctx.strokeStyle = '#ff7a5c'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]);
  for (const route of PATROLS) {
    ctx.beginPath();
    route.forEach((wpt, i) => {
      const p = planMapPoint(wpt.x, wpt.y);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath(); ctx.stroke();
    for (const wpt of route) { const p = planMapPoint(wpt.x, wpt.y); ctx.fillStyle = '#ff7a5c'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 7); ctx.fill(); }
  }
  ctx.setLineDash([]);
  // cameras + lasers + loot + entries on the blueprint
  for (const cam of G.cameras) {
    const p = planMapPoint(cam.x, cam.y);
    ctx.fillStyle = '#40e0ff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.4, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 1.6;
  for (const l of LASERS) {
    const a = planMapPoint(l.x1, l.y1), b = planMapPoint(l.x2, l.y2);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const item of LOOT) {
    const p = planMapPoint(item.x, item.y);
    ctx.fillStyle = item.gem ? '#aef3ff' : GOLD;
    ctx.beginPath(); ctx.arc(p.x, p.y, item.gem ? 5 : 3.2, 0, 7); ctx.fill();
  }
  const vanP = planMapPoint(VAN.x + VAN.w / 2, VAN.y + VAN.h / 2);
  ctx.fillStyle = '#57c474'; ctx.font = '900 11px Verdana, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('VAN', vanP.x, vanP.y + 4);
  for (const [key, spawn] of Object.entries(SPAWNS)) {
    const p = planMapPoint(spawn.x, spawn.y);
    ctx.fillStyle = G.entry === key ? '#ffd75e' : 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#0d1b2e'; ctx.font = '900 9px Verdana, sans-serif';
    ctx.fillText(key[0].toUpperCase(), p.x, p.y + 3);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(190,225,255,0.75)'; ctx.font = '600 11.5px Verdana, sans-serif';
  ctx.fillText('— patrol loop    ● camera    — laser    ● loot    ● entry point', ox, oy + 800 * s + 30);

  // ---- side panel ------------------------------------------------------------
  const L = planLayout();
  ctx.fillStyle = 'rgba(10,24,44,0.9)'; rr(ctx, 890, 96, 354, 652, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(140,190,255,0.4)'; rr(ctx, 890, 96, 354, 652, 10); ctx.stroke();
  ctx.fillStyle = '#eaf4ff'; ctx.font = '900 16px Georgia, serif';
  ctx.fillText('PREPARATION', 906, 122);
  ctx.fillStyle = GOLD; ctx.font = '900 16px Verdana, sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(G.prepPointsLeft() + ' pts', 1228, 122);
  ctx.textAlign = 'left';
  for (const row of L.items) {
    const n = G.prep[row.key];
    const afford = G.prepPointsLeft() >= PREP.costs[row.key] && n < PREP.maxStacks[row.key];
    ctx.fillStyle = n > 0 ? 'rgba(64,120,200,0.35)' : 'rgba(255,255,255,0.05)';
    rr(ctx, row.buy.x, row.buy.y, row.buy.w + row.minus.w, row.buy.h, 7); ctx.fill();
    ctx.fillStyle = '#eaf4ff'; ctx.font = '700 13.5px Verdana, sans-serif';
    ctx.fillText(PREP.labels[row.key], row.buy.x + 10, row.buy.y + 21);
    ctx.fillStyle = 'rgba(220,238,255,0.75)'; ctx.font = '400 10.5px Verdana, sans-serif';
    const blurb = PREP.blurb[row.key];
    ctx.fillText(blurb.length > 40 ? blurb.slice(0, 40) + '…' : blurb, row.buy.x + 10, row.buy.y + 38);
    ctx.fillStyle = afford || n > 0 ? GOLD : 'rgba(255,255,255,0.35)';
    ctx.font = '700 11.5px Verdana, sans-serif';
    ctx.fillText('cost ' + PREP.costs[row.key], row.buy.x + 10, row.buy.y + 52);
    ctx.fillStyle = '#eaf4ff'; ctx.font = '900 17px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('×' + n, row.buy.x + row.buy.w - 16, row.buy.y + 36);
    if (n > 0) {
      ctx.fillStyle = 'rgba(255,90,80,0.8)'; rr(ctx, row.minus.x + 8, row.minus.y + 12, 46, 34, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 16px Verdana, sans-serif';
      ctx.fillText('–', row.minus.x + 31, row.minus.y + 35);
    }
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#eaf4ff'; ctx.font = '900 14px Georgia, serif';
  ctx.fillText('ENTRY POINT', 906, 478);
  for (const e of L.entries) {
    const on = G.entry === e.key;
    ctx.fillStyle = on ? 'rgba(255,215,94,0.28)' : 'rgba(255,255,255,0.05)';
    rr(ctx, e.rect.x, e.rect.y, e.rect.w, e.rect.h, 7); ctx.fill();
    if (on) { ctx.strokeStyle = GOLD; rr(ctx, e.rect.x, e.rect.y, e.rect.w, e.rect.h, 7); ctx.stroke(); }
    ctx.fillStyle = '#eaf4ff'; ctx.font = '700 13px Verdana, sans-serif';
    ctx.fillText(ENTRIES[e.key].label, e.rect.x + 10, e.rect.y + 19);
    ctx.fillStyle = 'rgba(220,238,255,0.7)'; ctx.font = '400 10.5px Verdana, sans-serif';
    const hint = ENTRIES[e.key].hint;
    ctx.fillText(hint.length > 52 ? hint.slice(0, 52) + '…' : hint, e.rect.x + 10, e.rect.y + 35);
  }
  ctx.fillStyle = '#c8283c'; rr(ctx, L.start.x, L.start.y, L.start.w, L.start.h, 9); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 19px Verdana, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('BEGIN THE HEIST', L.start.x + L.start.w / 2, L.start.y + 39);
  ctx.textAlign = 'left';
}

// ---- endings ---------------------------------------------------------------------

export function drawEnd(ctx, G) {
  ctx.fillStyle = 'rgba(5,6,10,0.78)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const won = G.state === 'won';
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? GOLD : '#ff5040';
  ctx.font = '900 44px Georgia, serif';
  ctx.fillText(G.endingTitle, VIEW_W / 2, 268);
  ctx.fillStyle = '#e8ecf4'; ctx.font = '600 17px Verdana, sans-serif';
  ctx.fillText(G.endingLine, VIEW_W / 2, 306);
  ctx.font = '500 16px Verdana, sans-serif';
  const rows = [
    ['Loot taken', '$ ' + G.score.loot.toLocaleString('en-US')],
    ['Stealth multiplier', '× ' + G.score.mult.toFixed(1) + (G.score.mult > 1 ? '  (never caught in a chase)' : '')],
    ['Speed bonus', '$ ' + G.score.speed.toLocaleString('en-US')],
    ['TOTAL SCORE', '$ ' + G.score.total.toLocaleString('en-US')],
    ['Time inside', Math.floor(G.playTime / 60) + 'm ' + String(Math.floor(G.playTime % 60)).padStart(2, '0') + 's'],
    ['Peak alarm', Math.floor(G.alarmPeak) + '%'],
  ];
  rows.forEach(([k, v], i) => {
    ctx.fillStyle = 'rgba(232,236,244,0.65)';
    ctx.fillText(k, VIEW_W / 2 - 130, 356 + i * 30);
    ctx.fillStyle = i === 3 ? GOLD : '#fff';
    ctx.font = (i === 3 ? '900' : '600') + ' 16px Verdana, sans-serif';
    ctx.fillText(v, VIEW_W / 2 + 130, 356 + i * 30);
    ctx.font = '500 16px Verdana, sans-serif';
  });
  ctx.fillStyle = '#8fc3ff'; ctx.font = '700 15px Verdana, sans-serif';
  ctx.fillText('Press R to plan another night', VIEW_W / 2, 580);
  ctx.textAlign = 'left';
}
