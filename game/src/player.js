// Midnight Vault — the thief: movement, load, tools and loot pickup.

import { TILE } from './config.js';
import { moveCircle, pointInShadow } from './level.js';

const BASE_SPEED = 150; // px per second, walking
const SNEAK_SPEED = 78;
const SPRINT_SPEED = 205;

export function createPlayer(x, y, tools) {
  return {
    x, y, r: 11,
    dir: 0, // facing angle, radians
    moving: false,
    sneaking: false,
    sprinting: false,
    // Tool counts bought in planning.
    tools: { ...tools },
    empUntil: 0,
    smokeUntil: 0,
    // Lockpick progress on the vault door (0..1), null when not picking.
    picking: null,
    // Loot carried: array of loot ids.
    loot: [],
    weight: 0,
    steps: 0,
    lastStepAt: 0,
  };
}

// Current carry capacity: 6 weight, +4 with the duffel bag.
export function carryCapacity(player) {
  return player.tools.duffel ? 10 : 6;
}

export function playerSpeed(player) {
  let speed = player.sneaking ? SNEAK_SPEED : player.sprinting ? SPRINT_SPEED : BASE_SPEED;
  const cap = carryCapacity(player);
  if (player.weight > cap) speed *= 0.62; // overloaded: slow thief
  else if (player.weight > cap * 0.6) speed *= 0.85;
  return speed;
}

// Loudness of the thief right now, 0..1: sprinting is loud, sneaking is quiet,
// soft soles halve it, smoke silences it.
export function playerNoise(player, now) {
  if (now < player.smokeUntil) return 0;
  let n = player.sprinting ? 1 : player.sneaking ? 0.15 : 0.45;
  if (player.tools.soles) n *= 0.5;
  if (!player.moving) n = 0;
  return n;
}

// One simulation step: move, spend tools, handle lockpicking.
export function updatePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  const now = game.time;
  const level = game.level;

  p.sneaking = input.down('ShiftLeft', 'ShiftRight');
  p.sprinting = input.down('KeyF') && !p.sneaking;
  const v = input.moveVector();
  p.moving = v.x !== 0 || v.y !== 0;

  if (p.moving) {
    const speed = playerSpeed(p);
    const pos = moveCircle(level, p.x, p.y, p.r, v.x * speed * dt, v.y * speed * dt, game.openTiles);
    p.x = pos.x;
    p.y = pos.y;
    p.dir = Math.atan2(v.y, v.x);
    // Footstep sounds, spaced by gait.
    const interval = p.sneaking ? 0.55 : p.sprinting ? 0.28 : 0.4;
    if (now - p.lastStepAt > interval) {
      p.lastStepAt = now;
      p.steps += 1;
      game.audio.step();
    }
  }

  // Tool hotkeys: 1 = EMP, 2 = smoke.
  if (input.wasPressed('Digit1') && p.tools.emp > 0 && now >= p.empUntil) {
    p.tools.emp -= 1;
    p.empUntil = now + 12;
    game.audio.whoosh();
    game.flash('EMP burst — cameras dark for 12s');
  }
  if (input.wasPressed('Digit2') && p.tools.smoke > 0 && now >= p.smokeUntil) {
    p.tools.smoke -= 1;
    p.smokeUntil = now + 6;
    game.audio.smoke();
    game.flash('Smoke — unseen for 6s');
  }

  // Interact (E): pick up loot / keycard, or start lockpicking the vault door.
  if (input.wasPressed('KeyE')) {
    tryInteract(game);
  }

  // Lockpicking continues while the player holds E near the vault door.
  const door = level.doors.find((d) => d.id === 'vault-door');
  const nearDoor = Math.abs(p.x - (door.x + 0.5) * TILE) < TILE * 1.4
    && Math.abs(p.y - (door.y + 0.5) * TILE) < TILE * 1.4;
  if (p.tools.lockpick && !door.open && nearDoor && input.down('KeyE')) {
    if (p.picking === null) {
      p.picking = 0;
      game.flash('Picking the vault door… hold E, stay quiet');
    }
    p.picking += dt / 6; // 6 seconds of noisy picking
    game.alarm = Math.min(100, game.alarm + dt * 2.2); // picking is noisy
    if (Math.random() < dt * 6) game.audio.vaultTick();
    if (p.picking >= 1) {
      door.open = true;
      p.picking = null;
      game.audio.vaultOpen();
      game.flash('Vault door picked open');
    }
  } else if (p.picking !== null) {
    p.picking = null; // stepped away: progress lost
  }
}

function tryInteract(game) {
  const p = game.player;
  const level = game.level;

  // Keycard pickup.
  const k = level.keycard;
  if (!k.taken && Math.hypot(p.x - (k.x + 0.5) * TILE, p.y - (k.y + 0.5) * TILE) < TILE) {
    k.taken = true;
    p.hasKeycard = true;
    game.audio.pickup();
    game.flash('Security keycard taken');
    return;
  }

  // Vault door: from the vault side (north) it opens freely — no bank locks
  // its own thief inside. From the airlock side it needs the keycard.
  const door = level.doors.find((d) => d.id === 'vault-door');
  if (!door.open
    && Math.abs(p.x - (door.x + 0.5) * TILE) < TILE * 1.4
    && Math.abs(p.y - (door.y + 0.5) * TILE) < TILE * 1.4) {
    const fromInside = p.y < (door.y + 0.5) * TILE;
    if (fromInside || p.hasKeycard) {
      door.open = true;
      game.audio.vaultOpen();
      game.flash(fromInside ? 'Vault door opens from the inside' : 'Vault door unlocked with the keycard');
      return;
    }
    game.flash('Vault door is locked — you need the keycard or a lockpick');
    return;
  }

  // Loot pickup: nearest loot within reach that still fits the bag.
  let best = null;
  let bestD = Infinity;
  for (const l of level.loot) {
    if (l.taken) continue;
    const d = Math.hypot(p.x - (l.x + 0.5) * TILE, p.y - (l.y + 0.5) * TILE);
    if (d < TILE * 1.1 && d < bestD) {
      best = l;
      bestD = d;
    }
  }
  if (best) {
    if (p.weight + best.weight > carryCapacity(p)) {
      game.flash('Too heavy — drop something or come back with the duffel');
      return;
    }
    if (best.vault && !game.vaultOpen) {
      game.flash('The vault is still locked — crack it first');
      return;
    }
    best.taken = true;
    p.loot.push(best.id);
    p.weight += best.weight;
    game.audio.coin();
    game.flash(best.name + ' taken (+$' + best.value.toLocaleString() + ')');
    if (best.id === 'diamond') {
      game.hasDiamond = true;
      game.flash('THE MIDNIGHT DIAMOND IS YOURS — get to the van!');
    }
  }
}

// Is the thief standing in shadow cover right now?
export function playerInShadow(game) {
  return pointInShadow(game.level, game.player.x, game.player.y);
}
