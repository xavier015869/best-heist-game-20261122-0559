// game.js — the orchestrator: state machine, the alarm economy, tools,
// the vault crack, scoring and the eight ending titles.
import { ENTRIES, LOOT, PREP_POINTS, SCORE, TITLES, VAULT_DIAL, VAN } from './config.js';
import { makeGuards } from './guards.js';
import { Alarm, Lasers, makeCameras } from './security.js';
import { Player } from './player.js';
import { VaultDial } from './vault.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { Renderer, PLAN_UI } from './render.js';
import { pointInRect } from './level.js';

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.audio = new AudioEngine();
    this.seed = opts.seed || 1;
    this.shotMode = !!opts.shot;
    this.time = 0;
    this.elapsed = 0;
    this.state = 'plan';
    this.entry = 'front';
    this.prep = { lockpick: 0, emp: 0, smoke: 0, soles: 0, duffel: 0 };
    this.prepLeft = PREP_POINTS;
    this.resetRun();
    this.result = null;
    this.resultReason = '';
    this.title = '';
    this.score = 0;
    this.speedBonus = 0;
  }

  get prepSpent() { return PREP_POINTS - this.prepLeft; }

  entryName() {
    return ENTRIES.find((e) => e.id === this.entry).name;
  }

  resetRun() {
    const spawn = ENTRIES.find((e) => e.id === this.entry);
    this.player = new Player(spawn.x, spawn.y);
    this.player.tools = {
      lockpick: this.prep.lockpick,
      emp: this.prep.emp,
      smoke: this.prep.smoke,
      soles: this.prep.soles > 0,
      duffel: this.prep.duffel > 0,
    };
    this.guards = makeGuards();
    this.cameras = makeCameras();
    this.lasers = new Lasers();
    this.alarm = new Alarm();
    this.vault = new VaultDial(this.seed);
    this.smokeClouds = [];
    this.empUntil = 0;
    this.elapsed = 0;
    this.result = null;
    this.resultReason = '';
    this.title = '';
    this.score = 0;
    this.speedBonus = 0;
  }

  startHeist() {
    this.audio.ensure();
    this.resetRun();
    this.state = 'play';
  }

  // ---------------- planning screen ----------------
  planClick() {
    const m = this.input.mouse;
    if (!m.clicked) return;
    const { x, y } = { x: m.clickX, y: m.clickY };
    // shop rows: click the row to buy one more, SELL at the right to sell one back
    const s = PLAN_UI.shop;
    const toolIds = ['lockpick', 'emp', 'smoke', 'soles', 'duffel'];
    for (let i = 0; i < toolIds.length; i++) {
      const rowY = s.y + 40 + i * 38;
      if (pointInRect(x, y, { x: s.x + 8, y: rowY - 18, w: s.w - 16, h: 32 })) {
        const t = toolIds[i];
        const def = { lockpick: 2, emp: 1, smoke: 1, soles: 2, duffel: 2 }[t];
        const max = { lockpick: 1, emp: 2, smoke: 2, soles: 1, duffel: 1 }[t];
        if (x > s.x + s.w - 60) {
          if (this.prep[t] > 0) { this.prep[t] -= 1; this.prepLeft += def; }
        } else if (this.prep[t] < max && this.prepLeft >= def) {
          this.prep[t] += 1; this.prepLeft -= def;
        }
        this.audio.ensure(); this.audio.click();
        return;
      }
    }
    // entry rows
    const e = PLAN_UI.entries;
    for (let i = 0; i < ENTRIES.length; i++) {
      const rowY = e.y + 42 + i * 28;
      if (pointInRect(x, y, { x: e.x + 8, y: rowY - 16, w: e.w - 16, h: 24 })) {
        this.entry = ENTRIES[i].id;
        this.audio.ensure(); this.audio.click();
        return;
      }
    }
    // start button
    if (pointInRect(x, y, PLAN_UI.start)) this.startHeist();
  }

  planKeys() {
    const k = this.input;
    if (k.wasPressed('1')) this.entry = 'front';
    if (k.wasPressed('2')) this.entry = 'window';
    if (k.wasPressed('3')) this.entry = 'vent';
    if (k.wasPressed('Enter')) this.startHeist();
  }

  // ---------------- objectives & prompts ----------------
  objective() {
    if (this.alarm.lockdown) return 'LOCKDOWN — get to the getaway van, NOW.';
    if (!this.player.hasKeycard && !this.vault.open) return 'Find the security keycard in the west offices.';
    if (!this.vault.open) return 'Crack the vault — the dial is on the vault door, under the lasers.';
    if (!this.player.hasDiamond) return 'Take THE DIAMOND from the vault.';
    return 'Escape to the getaway van on the street.';
  }

  nearVaultDoor() {
    return Math.hypot(this.player.x - VAULT_DIAL.x, this.player.y - VAULT_DIAL.y) < 46;
  }

  prompt() {
    const p = this.player;
    if (this.vault.active) return 'SPACE — lock the tumbler in the green  ·  Esc — step back';
    if (p.nearbyKeycard()) return 'E — Take the security keycard';
    const loot = p.nearbyLoot(this.vault.open);
    if (loot) return `E — Grab ${loot.name} ($${loot.value.toLocaleString()})`;
    if (this.nearVaultDoor() && !this.vault.open) {
      if (p.hasKeycard) return 'E — Crack the vault (3-tumbler dial)';
      if (p.tools.lockpick > 0 && !this.vault.lockpicking) return '1 — Lockpick the vault door (slow, noisy)';
      if (this.vault.lockpicking) return 'Lockpicking… stay still';
      return 'Vault locked — you need the keycard (offices) or a lockpick kit';
    }
    if (p.atVan() && p.hasEntered) return 'Get in the van!';
    if (this.alarm.lockdown) return 'LOCKDOWN — run for the van!';
    return '';
  }

  // ---------------- scoring ----------------
  finish(win, reason) {
    const ghost = this.alarm.peak <= 30;
    this.speedBonus = win ? Math.max(0, Math.round((SCORE.speedParSeconds - this.elapsed) * SCORE.speedPerSecond)) : 0;
    const mult = ghost && win ? SCORE.ghostMultiplier : 1;
    this.score = Math.round(this.player.lootValue() * mult)
      + (this.player.hasDiamond ? SCORE.diamondBonus : 0) + this.speedBonus;
    this.result = win ? 'win' : 'lose';
    this.resultReason = reason;
    if (!win) {
      this.title = TITLES.caught;
      this.audio.lose();
    } else if (ghost && this.player.hasDiamond) this.title = TITLES.phantom;
    else if (this.player.hasDiamond && this.score >= 20000) this.title = TITLES.vaultLegend;
    else if (this.alarm.lockdown) this.title = TITLES.loudLegend;
    else if (this.score >= 12000) this.title = TITLES.cleanPro;
    else if (this.score >= 7000) this.title = TITLES.smooth;
    else if (this.score >= 3000) this.title = TITLES.smashGrab;
    else this.title = TITLES.lucky;
    if (win) this.audio.win();
    this.audio.sirenStop();
    this.state = 'end';
  }

  // ---------------- tools ----------------
  useEmp() {
    if (this.player.tools.emp <= 0) return;
    this.player.tools.emp -= 1;
    this.empUntil = this.time + 8;
    for (const c of this.cameras) c.disabledUntil = this.empUntil;
    this.lasers.disabledUntil = this.empUntil;
    this.audio.emp();
  }

  useSmoke() {
    if (this.player.tools.smoke <= 0) return;
    this.player.tools.smoke -= 1;
    this.smokeClouds.push({ x: this.player.x, y: this.player.y, r: 95, until: this.time + 6 });
    this.audio.smoke();
  }

  // ---------------- per-frame update ----------------
  update(dt) {
    if (this.state === 'plan') {
      this.time += dt;
      this.planClick();
      this.planKeys();
      this.input.endFrame();
      return;
    }
    if (this.state === 'end') {
      if (this.input.wasPressed('r')) { this.state = 'plan'; this.resetRun(); }
      if (this.input.wasPressed('Enter')) this.startHeist();
      this.input.endFrame();
      return;
    }
    // play
    this.time += dt;
    this.elapsed += dt;
    const k = this.input;

    if (k.wasPressed('m')) this.audio.toggleMute();

    // smoke clouds expire
    this.smokeClouds = this.smokeClouds.filter((s) => s.until > this.time);

    // vault dial has the player's full attention
    if (this.vault.active) {
      this.vault.update(dt);
      if (k.wasPressed(' ')) {
        const res = this.vault.press();
        if (res === 'hit') this.audio.dialHit();
        if (res === 'miss') { this.audio.dialMiss(); this.alarm.add(this.vault.missAlarm()); }
        if (res === 'done') { this.audio.vaultOpen(); }
      }
      if (k.wasPressed('Escape')) this.vault.stop();
    } else {
      this.player.update(dt, k);
      // lockpick channel
      if (this.vault.lockpicking) {
        const still = this.nearVaultDoor() && !this.player.moving;
        if (!still) { this.vault.lockpicking = false; this.vault.lockpickProgress = 0; }
        else {
          this.vault.lockpickProgress += dt / 5;
          this.alarm.add(5 * dt);
          if (this.vault.lockpickProgress >= 1) {
            this.vault.open = true;
            this.vault.lockpicking = false;
            this.audio.vaultOpen();
          }
        }
      }
      // interactions
      if (k.wasPressed('e')) {
        if (this.player.nearbyKeycard()) {
          this.player.hasKeycard = true;
          this.audio.pickup();
        } else {
          const loot = this.player.nearbyLoot(this.vault.open);
          if (loot) { this.player.takeLoot(loot); this.audio.pickup(); }
          else if (this.nearVaultDoor() && !this.vault.open && this.player.hasKeycard) {
            this.vault.start((this.seed * 7919 + Math.floor(this.elapsed * 100)) % 100000);
            this.audio.click();
          }
        }
      }
      if (k.wasPressed('1') && this.nearVaultDoor() && !this.vault.open && !this.player.hasKeycard
          && this.player.tools.lockpick > 0 && !this.vault.lockpicking) {
        this.vault.lockpicking = true;
        this.vault.lockpickProgress = 0;
        this.audio.click();
      }
      if (k.wasPressed('2')) this.useEmp();
      if (k.wasPressed('3')) this.useSmoke();
    }

    // guards move + spot
    let seen = 0;
    for (const gd of this.guards) {
      gd.update(dt, this.time, this.player, this.alarm.lockdown);
      seen += gd.spotStrength(this.player.x, this.player.y, this.time, this.smokeClouds);
      if (gd.caught(this.player.x, this.player.y)) {
        this.finish(false, `Caught by ${gd.name} the guard.`);
        this.input.endFrame();
        return;
      }
    }
    // cameras spot
    for (const c of this.cameras) seen += c.canSee(this.player.x, this.player.y, this.time, this.smokeClouds);
    // noise: running loud near a guard
    const noise = this.player.noiseRadius();
    if (noise > 0) {
      for (const gd of this.guards) {
        const d = Math.hypot(gd.x - this.player.x, gd.y - this.player.y);
        if (d < noise) {
          seen += 0.4;
          gd.facing = Math.atan2(this.player.y - gd.y, this.player.x - gd.x);
        }
      }
    }
    // alarm economy
    if (seen > 0) this.alarm.add(seen * 30 * dt);
    else this.alarm.decay(dt);
    // lasers
    const laserAlarm = this.lasers.update(dt, this.time, this.player);
    if (laserAlarm > 0) { this.alarm.add(laserAlarm); this.audio.zap(); }

    // lockdown
    if (this.alarm.lockdown) {
      this.audio.sirenStart();
      if (this.alarm.tickLockdown(dt)) {
        this.finish(false, 'Lockdown sealed the bank — the sweep caught you.');
        this.input.endFrame();
        return;
      }
    }
    // escape
    if (this.player.atVan() && this.player.hasEntered) {
      this.finish(true, this.alarm.lockdown ? 'Out during lockdown — the van was already rolling.' : 'Clean getaway.');
      this.input.endFrame();
      return;
    }
    this.input.endFrame();
  }

  render() {
    this.renderer.draw(this);
  }

  // Serializable snapshot for automated playtests (window.MIDNIGHT_VAULT).
  snapshot() {
    return {
      state: this.state,
      time: Math.round(this.time * 100) / 100,
      elapsed: Math.round(this.elapsed * 100) / 100,
      alarm: Math.round(this.alarm.value * 10) / 10,
      peakAlarm: Math.round(this.alarm.peak * 10) / 10,
      lockdown: this.alarm.lockdown,
      lockdownLeft: Math.round(this.alarm.lockdownLeft * 10) / 10,
      entry: this.entry,
      prep: { ...this.prep },
      prepLeft: this.prepLeft,
      player: {
        x: Math.round(this.player.x), y: Math.round(this.player.y),
        loot: [...this.player.loot], lootValue: this.player.lootValue(),
        weight: this.player.weight, hasKeycard: this.player.hasKeycard,
        hasDiamond: this.player.hasDiamond, tools: { ...this.player.tools },
      },
      vault: {
        active: this.vault.active, open: this.vault.open,
        tumblers: this.vault.tumblers, angle: this.vault.angle, zone: this.vault.zone,
        lockpicking: this.vault.lockpicking, lockpickProgress: this.vault.lockpickProgress,
      },
      guards: this.guards.map((g) => ({ x: Math.round(g.x), y: Math.round(g.y), mode: g.mode })),
      result: this.result, title: this.title, score: this.score,
      objective: this.state === 'play' ? this.objective() : '',
      prompt: this.state === 'play' ? this.prompt() : '',
    };
  }
}
