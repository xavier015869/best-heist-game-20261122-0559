// vault.js — the vault crack: a 3-tumbler timing-dial mini-game.
// The thief stands exposed by the lasers while the needle sweeps; press Space
// inside the green zone to lock a tumbler. A miss costs suspicion (+alarm).
import { ALARM } from './config.js';
import { mulberry32 } from './level.js';

export const DIAL_SPEED = 2.6; // radians per second
export const ZONE_HALF = 0.32; // ~18 degrees each side of the zone centre

export class VaultDial {
  constructor(seed = 1) {
    this.active = false;
    this.open = false;
    this.tumblers = 0;      // 0..3 locked
    this.angle = 0;         // needle angle, radians
    this.zone = 0;          // centre of the green zone, radians
    this.rng = mulberry32(seed);
    this.result = null;     // 'hit' | 'miss' flash, with a timer
    this.resultT = 0;
    this.lockpicking = false;
    this.lockpickProgress = 0;
  }

  start(seed = 1) {
    this.rng = mulberry32(seed);
    this.active = true;
    this.tumblers = 0;
    this.angle = 0;
    this.newZone();
    this.result = null;
  }

  newZone() {
    this.zone = this.rng() * Math.PI * 2;
  }

  stop() {
    this.active = false;
    this.lockpicking = false;
    this.lockpickProgress = 0;
  }

  update(dt) {
    if (!this.active) return;
    this.angle = (this.angle + DIAL_SPEED * dt) % (Math.PI * 2);
    if (this.resultT > 0) {
      this.resultT -= dt;
      if (this.resultT <= 0) this.result = null;
    }
  }

  // Space pressed. Returns 'hit' | 'miss' | 'done' | null.
  press() {
    if (!this.active || this.open) return null;
    let d = Math.abs(this.angle - this.zone);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d <= ZONE_HALF) {
      this.tumblers += 1;
      this.result = 'hit';
      this.resultT = 0.5;
      if (this.tumblers >= 3) {
        this.open = true;
        this.active = false;
        return 'done';
      }
      this.newZone();
      return 'hit';
    }
    this.result = 'miss';
    this.resultT = 0.6;
    return 'miss';
  }

  missAlarm() { return ALARM.missCost; }
}
