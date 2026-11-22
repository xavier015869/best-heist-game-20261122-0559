// Midnight Vault — the game itself: phases, planning, scoring, win/lose and
// the callbacks guards and security use to feed the alarm and the score.

import { TILE, W, H, PREP_POINTS, TOOLS, ENTRIES, endingTitle } from './config.js';
import { buildLevel } from './level.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuards, updateGuards } from './guards.js';
import { createSecurity, updateCameras, updateLasers, updateAlarm } from './security.js';
import { createVault, updateVault, openVaultCrack, closeVaultCrack, nearVault } from './vault.js';
import { render } from './render.js';

export function createGame(ctx, input, audio) {
  const level = buildLevel();
  const game = {
    ctx, input, audio,
    level,
    phase: 'plan', // plan | play | caught | win | timeout
    time: 0,
    alarm: 0,
    lockdown: false,
    lockdownLeft: 0,
    vaultOpen: false,
    hasDiamond: false,
    seen: false, // was the thief ever spotted?
    closeCalls: 0,
    score: 0,
    lootValue: 0,
    endTitle: '',
    flashText: '',
    flashAt: -10,
    openTiles: new Set(), // wall tiles opened by the vault door
    plan: {
      entry: 'front',
      pointsLeft: PREP_POINTS,
      tools: { lockpick: 0, emp: 0, smoke: 0, soles: 0, duffel: 0 },
    },
    player: null,
    guards: null,
    security: null,
    vault: createVault(),
  };

  game.flash = (text) => {
    game.flashText = text;
    game.flashAt = game.time;
  };

  // A guard's suspicion hit 100: the thief is spotted.
  game.onSpotted = (guard) => {
    if (game.phase !== 'play') return;
    game.seen = true;
    game.alarm = Math.min(100, game.alarm + 18);
    game.audio.alarm();
    game.flash('SPOTTED by ' + guard.name + '! Break line of sight!');
  };

  // A chasing guard touched the thief.
  game.onCaught = (guard) => {
    if (game.phase !== 'play') return;
    game.phase = 'caught';
    game.audio.caught();
    finishRun(game);
  };

  // A near-miss: suspicion peaked and the thief slipped away. +50.
  game.onCloseCall = (guard) => {
    if (game.phase !== 'play') return;
    game.closeCalls += 1;
    game.score += 50;
    game.audio.whoosh();
    game.flash('CLOSE CALL +50 — ' + guard.name + ' almost had you');
  };

  game.onLaserTrip = () => {
    if (game.phase !== 'play') return;
    game.seen = true; // tripping a laser counts as being noticed
  };

  game.onLockdownTimeout = () => {
    if (game.phase !== 'play') return;
    game.phase = 'timeout';
    game.audio.caught();
    finishRun(game);
  };

  // Start the heist from the plan the player bought.
  game.startHeist = () => {
    const entry = ENTRIES.find((e) => e.id === game.plan.entry) || ENTRIES[0];
    const tools = { ...game.plan.tools };
    game.player = createPlayer((entry.x + 0.5) * TILE, (entry.y + 0.5) * TILE, tools);
    game.guards = createGuards(level);
    game.security = createSecurity(level);
    game.vault = createVault();
    game.time = 0;
    game.alarm = 0;
    game.lockdown = false;
    game.lockdownLeft = 0;
    game.vaultOpen = false;
    game.hasDiamond = false;
    game.seen = false;
    game.closeCalls = 0;
    game.score = 0;
    game.lootValue = 0;
    game.endTitle = '';
    game.openTiles = new Set();
    game.phase = 'play';
    game.audio.unlock();
    game.audio.startDrone();
    game.flash('Get in, take the diamond, get to the van. Stay out of the cones.');
  };

  // Restart back to planning.
  game.backToPlan = () => {
    game.phase = 'plan';
    game.plan.entry = 'front';
    game.plan.pointsLeft = PREP_POINTS;
    game.plan.tools = { lockpick: 0, emp: 0, smoke: 0, soles: 0, duffel: 0 };
    game.vault = createVault();
    game.openTiles = new Set();
    // Reset the level so loot and the keycard come back.
    game.level = buildLevel();
  };

  game.update = (dt) => {
    game.time += dt;
    if (game.phase === 'plan') {
      updatePlan(game);
      return;
    }
    if (game.phase !== 'play') {
      if (game.input.wasPressed('KeyR')) game.backToPlan();
      return;
    }
    if (game.input.wasPressed('KeyM')) {
      const muted = game.audio.toggleMute();
      game.flash(muted ? 'Sound off' : 'Sound on');
    }
    updatePlayer(game, dt);
    updateGuards(game, dt);
    updateCameras(game, dt);
    updateLasers(game, dt);
    updateAlarm(game, dt);
    updateVault(game, dt);

    // The vault door opens into the passable set.
    const door = game.level.doors.find((d) => d.id === 'vault-door');
    if (door.open) game.openTiles.add(door.x + ',' + door.y);

    // Start the vault crack when the thief presses E at the safe.
    if (!game.vault.active && !game.vault.opened && nearVault(game) && game.input.wasPressed('KeyE')) {
      openVaultCrack(game);
    }
    if (game.vault.active && game.input.wasPressed('Escape')) {
      closeVaultCrack(game);
    }

    // Escape: reach the van with loot (the diamond is not required, but the
    // score is far better with it).
    const van = game.level.van;
    const p = game.player;
    if (p.loot.length > 0
      && p.x > van.x * TILE && p.x < (van.x + van.w) * TILE
      && p.y > van.y * TILE && p.y < (van.y + van.h) * TILE) {
      game.phase = 'win';
      game.audio.win();
      finishRun(game);
    }
  };

  game.render = () => render(game);
  return game;
}

// Planning screen input: number keys pick an entry, clicks buy tools, Enter starts.
function updatePlan(game) {
  const input = game.input;
  ENTRIES.forEach((e, i) => {
    if (input.wasPressed('Digit' + (i + 1))) game.plan.entry = e.id;
  });
  if (input.wasPressed('Enter')) {
    game.startHeist();
    return;
  }
  if (input.mouse.pressed) {
    const { x, y } = input.mouse;
    // Entry boxes.
    ENTRIES.forEach((e, i) => {
      const by = 170 + i * 46;
      if (x >= 500 && x <= 900 && y >= by && y <= by + 40) game.plan.entry = e.id;
    });
    // Tool shop rows.
    let ty = 344;
    for (const [id, tool] of Object.entries(TOOLS)) {
      if (x >= 500 && x <= 900 && y >= ty && y <= ty + 40) {
        const count = game.plan.tools[id] || 0;
        const max = id === 'emp' || id === 'smoke' ? 2 : 1;
        if (count > 0) {
          game.plan.tools[id] = count - 1;
          game.plan.pointsLeft += tool.cost;
        } else if (game.plan.pointsLeft >= tool.cost && count < max) {
          game.plan.tools[id] = count + 1;
          game.plan.pointsLeft -= tool.cost;
        }
      }
      ty += 46;
    }
    // GO button area (the ENTER line).
    if (y >= 585 && y <= 615 && x >= W / 2 - 200 && x <= W / 2 + 200) {
      game.startHeist();
    }
  }
}

// Final score: loot value x stealth multiplier + diamond + speed + close calls.
function finishRun(game) {
  const p = game.player;
  const lootValue = p.loot.reduce((s, id) => {
    const item = game.level.loot.find((l) => l.id === id);
    return s + (item ? item.value : 0);
  }, 0);
  game.lootValue = lootValue;
  const ghost = game.phase === 'win' && !game.seen;
  const multiplier = ghost ? 1.5 : 1;
  const diamondBonus = game.hasDiamond ? 1500 : 0;
  const speedBonus = game.phase === 'win' ? Math.max(0, Math.round((420 - game.time) * 2)) : 0;
  game.score = Math.round(lootValue * multiplier) + diamondBonus + speedBonus + game.closeCalls * 50;
  game.endTitle = endingTitle(game.score);
}
