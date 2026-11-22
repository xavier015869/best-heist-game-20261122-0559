// player.js — the thief: movement, loot weight, tools and pickups.
import { LOOT, KEYCARD, VAN } from './config.js';
import { moveCircle, pointInRect } from './level.js';

export const PLAYER_RADIUS = 12;
export const WALK_SPEED = 150;
export const RUN_SPEED = 215;

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.dir = -Math.PI / 2; // facing north
    this.moving = false;
    this.running = false;
    this.hasKeycard = false;
    this.loot = [];          // taken loot ids
    this.weight = 0;
    this.tools = { lockpick: 0, emp: 0, smoke: 0, soles: false, duffel: false };
    this.hasEntered = false; // crossed into the bank at least once
    this.inVault = false;
  }

  speed() {
    let s = this.running ? RUN_SPEED : WALK_SPEED;
    const penalty = this.tools.duffel ? 0.015 : 0.03;
    s *= Math.max(0.55, 1 - this.weight * penalty);
    return s;
  }

  update(dt, input) {
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    this.running = !!input.run && this.moving;
    if (this.moving) {
      const len = Math.hypot(dx, dy);
      const step = this.speed() * dt;
      const p = moveCircle(this.x, this.y, (dx / len) * step, (dy / len) * step, PLAYER_RADIUS);
      this.x = p.x; this.y = p.y;
      this.dir = Math.atan2(dy, dx);
    }
    if (this.y < 600) this.hasEntered = true;
    this.inVault = pointInRect(this.x, this.y, { x: 540, y: 20, w: 200, h: 240 });
  }

  // Loot within reach (E to grab). The diamond only counts once the vault is open.
  nearbyLoot(vaultOpen) {
    for (const l of LOOT) {
      if (this.loot.includes(l.id)) continue;
      if (l.diamond && !vaultOpen) continue;
      if (Math.hypot(l.x - this.x, l.y - this.y) < 30) return l;
    }
    return null;
  }

  nearbyKeycard() {
    if (this.hasKeycard) return false;
    return Math.hypot(KEYCARD.x - this.x, KEYCARD.y - this.y) < 30;
  }

  takeLoot(l) {
    this.loot.push(l.id);
    this.weight += l.weight;
  }

  lootValue() {
    return LOOT.filter((l) => this.loot.includes(l.id))
      .reduce((sum, l) => sum + l.value, 0);
  }

  get hasDiamond() { return this.loot.includes('diamond'); }

  atVan() {
    return pointInRect(this.x, this.y, VAN);
  }

  // Loud if running without soft soles.
  noiseRadius() {
    if (this.running && !this.tools.soles) return 110;
    return 0;
  }
}
