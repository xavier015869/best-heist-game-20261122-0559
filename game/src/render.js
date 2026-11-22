// render.js — every pixel the game draws: the bank, the cones, the HUD,
// the planning blueprint, the vault dial and the end screens.
import { ROOMS, SHADOWS, LOOT, KEYCARD, VAN, VAULT_DIAL, TOOLS, ENTRIES, PREP_POINTS, CONTROLS, TITLES } from './config.js';
import { WALLS, pointInRect, roomAt } from './level.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_HALF_ANGLE } from './security.js';

// Planning-screen layout, shared with game.js (click handling).
export const PLAN_UI = {
  blueprint: { x: 40, y: 96, w: 700, h: 500 },
  shop: { x: 770, y: 96, w: 470, h: 250 },
  entries: { x: 770, y: 362, w: 470, h: 130 },
  start: { x: 770, y: 508, w: 470, h: 56 },
  controls: { x: 770, y: 580, w: 470, h: 110 },
};

function conePath(ctx, x, y, angle, half, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, half, range, fill) {
  conePath(ctx, x, y, angle, half, range);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); // top-right
  ctx.arcTo(x + w, y + h, x, y + h, r); // bottom-right
  ctx.arcTo(x, y + h, x, y, r);         // bottom-left
  ctx.arcTo(x, y, x + w, y, r);         // top-left
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    const { ctx } = this;
    ctx.fillStyle = '#101216';
    ctx.fillRect(0, 0, 1280, 720);
  }

  // ---------------- the bank ----------------
  drawMap(g) {
    const { ctx } = this;
    // rooms. The top-row rooms (offices, gallery) get their label at the
    // bottom: the HUD bar covers the top 46px. The vault is named by its
    // VAULT LOCKED / VAULT OPEN sign, and the airlock's label would sit on
    // the laser beams, so both are skipped.
    for (const r of ROOMS) {
      ctx.fillStyle = r.floor;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (r.id === 'airlock' || r.id === 'vault') continue;
      ctx.fillStyle = r.label;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      const ly = r.y < 100 ? r.y + r.h - 10 : r.y + 22;
      ctx.fillText(r.name, r.x + 10, ly);
    }
    // shadow cover
    for (const s of SHADOWS) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(120,140,180,0.25)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
      ctx.setLineDash([]);
    }
    // walls
    for (const w of WALLS) {
      ctx.fillStyle = '#3d4450';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#565e6c';
      ctx.fillRect(w.x, w.y, w.w, Math.min(3, w.h));
    }
    // getaway van + street markings
    ctx.fillStyle = '#20242c';
    ctx.fillRect(VAN.x, VAN.y, VAN.w, VAN.h);
    ctx.strokeStyle = '#e8c33a';
    ctx.lineWidth = 2;
    ctx.strokeRect(VAN.x + 2, VAN.y + 2, VAN.w - 4, VAN.h - 4);
    ctx.fillStyle = '#e8c33a';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY VAN', VAN.x + VAN.w / 2, VAN.y + VAN.h / 2 + 4);
    ctx.fillStyle = '#c8ccd4';
    ctx.font = '11px monospace';
    ctx.fillText('ESCAPE HERE', VAN.x + VAN.w / 2, VAN.y + VAN.h + 14);
    // office window entry marker
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(20, 290, 6, 20);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WINDOW', 32, 306);
    // roof vent marker
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(628, 22, 24, 8);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROOF VENT', 640, 48);
    // keycard
    if (!g.player.hasKeycard) {
      const pulse = 0.6 + 0.4 * Math.sin(g.time * 4);
      ctx.fillStyle = `rgba(56,189,248,${pulse})`;
      ctx.fillRect(KEYCARD.x - 8, KEYCARD.y - 5, 16, 10);
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '10px monospace';
      ctx.fillText('KEYCARD', KEYCARD.x, KEYCARD.y - 12);
    }
    // loot
    for (const l of LOOT) {
      if (g.player.loot.includes(l.id)) continue;
      if (l.diamond && !g.vault.open) {
        // the diamond glows through the vault glass, always visible
        const pulse = 0.7 + 0.3 * Math.sin(g.time * 3);
        ctx.save();
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 18 * pulse;
        ctx.fillStyle = '#a5f3fc';
        this.drawDiamond(ctx, l.x, l.y, 12);
        ctx.restore();
        ctx.fillStyle = '#cffafe';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DIAMOND', l.x, l.y - 20);
        continue;
      }
      if (l.diamond) {
        const pulse = 0.7 + 0.3 * Math.sin(g.time * 3);
        ctx.save();
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 18 * pulse;
        ctx.fillStyle = '#a5f3fc';
        this.drawDiamond(ctx, l.x, l.y, 12);
        ctx.restore();
        continue;
      }
      ctx.fillStyle = '#e8c33a';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', l.x, l.y + 3);
    }
    // vault door state
    ctx.fillStyle = g.vault.open ? '#22c55e' : '#ef4444';
    ctx.fillRect(610, 260, 60, 6);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(g.vault.open ? 'VAULT OPEN' : 'VAULT LOCKED', 640, 254);
  }

  drawDiamond(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.8, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.8, y);
    ctx.closePath();
    ctx.fill();
  }

  drawLasers(g) {
    const { ctx } = this;
    g.lasers.defs.forEach((d, i) => {
      const on = g.lasers.isOn(i, g.time);
      ctx.save();
      if (on) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = 'rgba(239,68,68,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
      }
      ctx.beginPath();
      ctx.moveTo(542, d.y);
      ctx.lineTo(738, d.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawCameras(g) {
    const { ctx } = this;
    for (const c of g.cameras) {
      const disabled = c.disabled(g.time);
      const a = c.angle(g.time);
      if (!disabled) drawCone(ctx, c.x, c.y, a, CAMERA_HALF_ANGLE, c.range, 'rgba(34,211,238,0.20)');
      // mount
      ctx.fillStyle = disabled ? '#4b5563' : '#22d3ee';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (disabled) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OFF', c.x, c.y - 12);
      }
    }
  }

  drawGuards(g) {
    const { ctx } = this;
    for (const gd of g.guards) {
      const a = gd.facingAngle(g.time);
      drawCone(ctx, gd.x, gd.y, a, GUARD_HALF_ANGLE, GUARD_RANGE, 'rgba(239,68,68,0.22)');
      ctx.fillStyle = gd.color;
      ctx.beginPath();
      ctx.arc(gd.x, gd.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.stroke();
      // facing tick
      ctx.strokeStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(gd.x, gd.y);
      ctx.lineTo(gd.x + Math.cos(a) * 18, gd.y + Math.sin(a) * 18);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(gd.name[0], gd.x, gd.y + 4);
      if (gd.mode === 'chase') {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('!', gd.x, gd.y - 20);
      }
    }
  }

  drawSmoke(g) {
    const { ctx } = this;
    for (const s of g.smokeClouds) {
      const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      grad.addColorStop(0, 'rgba(148,163,184,0.55)');
      grad.addColorStop(1, 'rgba(148,163,184,0.05)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(g) {
    const { ctx } = this;
    const p = g.player;
    ctx.save();
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.dir) * 16, p.y + Math.sin(p.dir) * 16);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', p.x, p.y - 18);
    // noise ring while running loud
    if (p.noiseRadius() > 0) {
      ctx.strokeStyle = 'rgba(248,113,113,0.5)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.noiseRadius(), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // lockpick progress
    if (g.vault.lockpicking) {
      const w = 60;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(p.x - w / 2, p.y - 34, w, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(p.x - w / 2, p.y - 34, w * g.vault.lockpickProgress, 8);
      ctx.fillStyle = '#fde68a';
      ctx.font = '10px monospace';
      ctx.fillText('LOCKPICKING…', p.x, p.y - 40);
    }
  }

  // ---------------- HUD ----------------
  drawHUD(g) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(10,12,16,0.92)';
    ctx.fillRect(0, 0, 1280, 46);
    // alarm meter
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', 16, 29);
    const ax = 80, aw = 300;
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(ax, 14, aw, 18);
    const frac = g.alarm.value / 100;
    ctx.fillStyle = frac < 0.4 ? '#22c55e' : frac < 0.75 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(ax, 14, aw * frac, 18);
    ctx.strokeStyle = '#6b7280';
    ctx.strokeRect(ax + 0.5, 14.5, aw, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${Math.round(g.alarm.value)}%`, ax + aw + 10, 29);
    if (g.alarm.lockdown) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`LOCKDOWN ${Math.ceil(g.alarm.lockdownLeft)}s — RUN!`, 500, 30);
    }
    // loot + weight + time
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`LOOT $${g.player.lootValue().toLocaleString()}  (${g.player.loot.length}/14)`, 940, 29);
    ctx.fillText(`BAG ${g.player.weight}kg`, 1040, 29);
    ctx.fillText(`${Math.floor(g.elapsed / 60)}:${String(Math.floor(g.elapsed % 60)).padStart(2, '0')}`, 1130, 29);
    // tools
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    const tools = [];
    if (g.player.tools.lockpick) tools.push('LOCKPICK [1]');
    if (g.player.tools.emp) tools.push(`EMP×${g.player.tools.emp} [2]`);
    if (g.player.tools.smoke) tools.push(`SMOKE×${g.player.tools.smoke} [3]`);
    if (g.player.tools.soles) tools.push('SOFT SOLES');
    if (g.player.tools.duffel) tools.push('DUFFEL');
    ctx.fillText(tools.join('  ·  ') || 'NO TOOLS', 1160, 29);
    // objective line
    ctx.fillStyle = '#facc15';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(g.objective(), 16, 66);
    // context prompt
    const prompt = g.prompt();
    if (prompt) {
      ctx.fillStyle = 'rgba(10,12,16,0.85)';
      ctx.fillRect(0, 684, 1280, 36);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, 640, 707);
    }
    // ghost indicator
    if (g.alarm.peak <= 30 && g.elapsed > 5) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('GHOST ×1.5', 1264, 66);
    }
  }

  // ---------------- vault dial ----------------
  drawVaultDial(g) {
    const { ctx } = this;
    const v = g.vault;
    ctx.fillStyle = 'rgba(5,8,14,0.78)';
    ctx.fillRect(0, 0, 1280, 720);
    const cx = 640, cy = 350, r = 150;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CRACK THE VAULT', cx, cy - r - 44);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#d1d5db';
    ctx.fillText('Press SPACE when the needle is inside the green zone — 3 tumblers', cx, cy - r - 20);
    // green zone
    ctx.fillStyle = 'rgba(34,197,94,0.55)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, v.zone - 0.32, v.zone + 0.32);
    ctx.closePath();
    ctx.fill();
    // tick ring
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    // needle
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(v.angle) * (r - 6), cy + Math.sin(v.angle) * (r - 6));
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    // tumbler pips
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < v.tumblers ? '#22c55e' : '#374151';
      ctx.beginPath();
      ctx.arc(cx - 44 + i * 44, cy + r + 52, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#d1d5db';
    ctx.font = '13px monospace';
    ctx.fillText(`${v.tumblers} / 3 tumblers locked`, cx, cy + r + 82);
    if (v.result === 'hit') {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('CLICK — TUMBLER SET', cx, cy + r + 110);
    } else if (v.result === 'miss') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('MISS — SUSPICION +12', cx, cy + r + 110);
    }
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.fillText('Esc — step back from the dial (the lasers are still live)', cx, cy + r + 136);
  }

  // ---------------- planning screen ----------------
  drawPlan(g) {
    const { ctx } = this;
    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MIDNIGHT VAULT', 40, 52);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '15px monospace';
    ctx.fillText('A top-down stealth heist — plan the job, crack the vault, take the diamond, reach the van.', 40, 78);
    this.drawBlueprint(g);
    this.drawShop(g);
    this.drawEntries(g);
    // start button
    const s = PLAN_UI.start;
    const hov = pointInRect(g.input.mouse.x, g.input.mouse.y, s);
    ctx.fillStyle = hov ? '#f59e0b' : '#e8c33a';
    roundRect(ctx, s.x, s.y, s.w, s.h, 8);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`START HEIST  —  ${g.entryName()}`, s.x + s.w / 2, s.y + 37);
    // controls
    const c = PLAN_UI.controls;
    ctx.fillStyle = '#111827';
    roundRect(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fill();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CONTROLS', c.x + 14, c.y + 20);
    CONTROLS.slice(0, 5).forEach((row, i) => {
      ctx.fillStyle = '#d1d5db';
      ctx.fillText(`${row[0]} — ${row[1]}`, c.x + 14, c.y + 42 + i * 17);
    });
    ctx.fillStyle = '#6b7280';
    ctx.fillText('2 EMP · 3 Smoke · E interact · Space vault dial', c.x + 14, c.y + 42 + 5 * 17 - 2);
  }

  drawBlueprint(g) {
    const { ctx } = this;
    const b = PLAN_UI.blueprint;
    ctx.fillStyle = '#101725';
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('THE BANK — BLUEPRINT (patrol loops, cameras, loot)', b.x + 14, b.y + 24);
    const scale = 0.52;
    const ox = b.x + 10, oy = b.y + 40;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy + y * scale;
    // rooms
    for (const r of ROOMS) {
      ctx.fillStyle = r.floor;
      ctx.fillRect(X(r.x), Y(r.y), r.w * scale, r.h * scale);
    }
    // walls
    ctx.fillStyle = '#5b6472';
    for (const w of WALLS) ctx.fillRect(X(w.x), Y(w.y), w.w * scale, w.h * scale);
    // patrol loops
    const defs = [
      { pts: [[120, 390], [1160, 390]], color: '#3b5bdb' },
      { pts: [[860, 140], [1150, 140], [1150, 300], [860, 300]], color: '#7048e8' },
      { pts: [[860, 520], [1160, 520], [1160, 470], [860, 470]], color: '#0ca678' },
    ];
    for (const d of defs) {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      d.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      for (const [x, y] of d.pts) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(X(x), Y(y), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // cameras
    for (const c of g.cameras) {
      drawCone(ctx, X(c.x), Y(c.y), c.angle(g.time), CAMERA_HALF_ANGLE, c.range * scale, 'rgba(34,211,238,0.30)');
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // lasers
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'rgba(239,68,68,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(542), Y(280 + i * 20));
      ctx.lineTo(X(738), Y(280 + i * 20));
      ctx.stroke();
    }
    // loot dots + diamond
    for (const l of LOOT) {
      ctx.fillStyle = l.diamond ? '#22d3ee' : '#e8c33a';
      ctx.beginPath();
      ctx.arc(X(l.x), Y(l.y), l.diamond ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // entry markers
    ENTRIES.forEach((e, i) => {
      ctx.fillStyle = g.entry === e.id ? '#facc15' : '#4b5563';
      ctx.beginPath();
      ctx.arc(X(e.x), Y(e.y), 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), X(e.x), Y(e.y) + 4);
    });
    // legend
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('— guard patrol   ● camera cone   — laser   ● loot   ◆ diamond   1/2/3 entry', b.x + 14, b.y + b.h - 12);
  }

  drawShop(g) {
    const { ctx } = this;
    const s = PLAN_UI.shop;
    ctx.fillStyle = '#111827';
    roundRect(ctx, s.x, s.y, s.w, s.h, 8);
    ctx.fill();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PREP — ${g.prepLeft} / ${PREP_POINTS} POINTS LEFT`, s.x + 14, s.y + 24);
    TOOLS.forEach((t, i) => {
      const y = s.y + 40 + i * 38;
      const owned = g.prep[t.id] || 0;
      const row = { x: s.x + 8, y: y - 18, w: s.w - 16, h: 32 };
      const hov = pointInRect(g.input.mouse.x, g.input.mouse.y, row);
      if (hov) { ctx.fillStyle = 'rgba(250,204,21,0.12)'; roundRect(ctx, row.x, row.y, row.w, row.h, 6); ctx.fill(); }
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${t.name} ×${owned}`, s.x + 16, y);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px monospace';
      ctx.fillText(t.desc, s.x + 16, y + 15);
      ctx.fillStyle = owned >= t.max ? '#4b5563' : '#e8c33a';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(owned >= t.max ? 'MAX' : `${t.cost} pt${t.cost > 1 ? 's' : ''} — buy`, s.x + s.w - 76, y);
      ctx.fillStyle = owned > 0 ? '#f87171' : '#4b5563';
      ctx.fillText(owned > 0 ? 'SELL' : '—', s.x + s.w - 16, y);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px monospace';
    ctx.fillText('Click a tool to buy one · SELL at the right sells one back.', s.x + 14, s.y + s.h - 10);
  }

  drawEntries(g) {
    const { ctx } = this;
    const e = PLAN_UI.entries;
    ctx.fillStyle = '#111827';
    roundRect(ctx, e.x, e.y, e.w, e.h, 8);
    ctx.fill();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ENTRY POINT', e.x + 14, e.y + 24);
    ENTRIES.forEach((en, i) => {
      const y = e.y + 42 + i * 28;
      const row = { x: e.x + 8, y: y - 16, w: e.w - 16, h: 24 };
      const sel = g.entry === en.id;
      if (sel) { ctx.fillStyle = 'rgba(250,204,21,0.15)'; roundRect(ctx, row.x, row.y, row.w, row.h, 6); ctx.fill(); }
      ctx.fillStyle = sel ? '#facc15' : '#d1d5db';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${i + 1}. ${en.name}`, e.x + 16, y);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px monospace';
      ctx.fillText(en.desc, e.x + 190, y);
    });
  }

  // ---------------- end screens ----------------
  drawEnd(g) {
    const { ctx } = this;
    const win = g.result === 'win';
    ctx.fillStyle = win ? 'rgba(6,20,12,0.88)' : 'rgba(24,6,6,0.88)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = win ? '#4ade80' : '#f87171';
    ctx.font = 'bold 44px monospace';
    ctx.fillText(win ? 'CLEAN GETAWAY' : 'BUSTED', 640, 150);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(g.title, 640, 200);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px monospace';
    const lines = [
      `Loot taken: $${g.player.lootValue().toLocaleString()}  (${g.player.loot.length}/14 items)${g.player.hasDiamond ? ' — including THE DIAMOND' : ''}`,
      `Stealth: ${g.alarm.peak <= 30 ? 'GHOST — never spotted (×1.5)' : `peak alarm ${Math.round(g.alarm.peak)}%`}`,
      `Diamond bonus: ${g.player.hasDiamond ? '+$5,000' : '$0'}   ·   Speed bonus: +$${g.speedBonus}`,
      `FINAL SCORE: ${g.score.toLocaleString()}`,
      `Time: ${Math.floor(g.elapsed / 60)}:${String(Math.floor(g.elapsed % 60)).padStart(2, '0')}   ·   ${g.resultReason}`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, 640, 260 + i * 32));
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px monospace';
    ctx.fillText('Press R to plan another heist, or Enter to run it back.', 640, 480);
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px monospace';
    ctx.fillText('Midnight Vault — an original stealth heist for make.fun', 640, 520);
  }

  draw(g) {
    this.clear();
    if (g.state === 'plan') { this.drawPlan(g); return; }
    if (g.state === 'end') { this.drawEnd(g); return; }
    // play state (and vault overlay on top)
    this.drawMap(g);
    this.drawLasers(g);
    this.drawCameras(g);
    this.drawGuards(g);
    this.drawSmoke(g);
    this.drawPlayer(g);
    this.drawHUD(g);
    if (g.vault.active) this.drawVaultDial(g);
  }
}
