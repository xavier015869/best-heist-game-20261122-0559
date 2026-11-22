// Midnight Vault — screenshot staging: ?shot=plan|action|vault|escape sets up a
// deterministic scene and freezes the simulation so the screenshot is a stable
// render of the game's own code. The cover (action) shows the thief crossing
// the gallery with guard cones, camera cones, lasers, the diamond and the HUD.

import { TILE } from './config.js';

// Freeze the game clock at a moment when two laser beams are live.
const SHOT_TIME = 0.5;

function placeThief(game, tx, ty) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
  game.player.dir = 0;
}

function aimGuardAt(game, index, tx, ty) {
  const g = game.guards[index];
  if (!g) return;
  g.dir = Math.atan2((ty + 0.5) * TILE - g.y, (tx + 0.5) * TILE - g.x);
  g.suspicion = 0;
  g.state = 'patrol';
}

export function applyShot(game, kind) {
  game.time = SHOT_TIME;
  if (kind === 'plan') {
    game.phase = 'plan';
    return;
  }
  // Every other shot starts a heist, then stages the scene.
  game.startHeist();
  game.time = SHOT_TIME;
  game.frozen = true;

  if (kind === 'action') {
    // Cover: the thief crosses the gallery, a guard cone sweeps toward them,
    // the gallery camera watches, lasers blink in the airlock, the diamond
    // glows in the vault, and the alarm meter reads 35%.
    game.plan.entry = 'front';
    placeThief(game, 24, 14);
    game.player.dir = Math.PI;
    game.alarm = 35;
    // Bishop (gallery guard) patrols near the thief, cone aimed at them.
    const bishop = game.guards[1];
    bishop.x = (21.5) * TILE;
    bishop.y = (14.5) * TILE;
    bishop.dir = 0;
    bishop.suspicion = 62;
    bishop.state = 'suspicious';
    // Rook's cone sweeps the lobby; Knight watches the offices.
    aimGuardAt(game, 0, 15, 15);
    aimGuardAt(game, 2, 5, 14);
    // Gallery camera aimed across the room.
    game.security.cameras[1].angle = Math.PI * 0.85;
    game.security.cameras[0].angle = Math.PI * 0.6;
    return;
  }

  if (kind === 'vault') {
    // The thief stands at the safe, the crack dial open on tumbler 2.
    placeThief(game, 24, 4.5);
    game.player.dir = -Math.PI / 2;
    game.alarm = 58;
    game.vault.active = true;
    game.vault.tumbler = 1;
    game.vault.angle = 1.2;
    game.vault.zoneCenter = 1.1;
    game.vault.speed = 2.6;
    // Vault camera sweeps the vault door.
    game.security.cameras[2].angle = Math.PI / 2;
    return;
  }

  if (kind === 'escape') {
    // Lockdown escape: the diamond is taken, alarm at 100, the thief sprints
    // for the van while the guards chase.
    const diamond = game.level.loot.find((l) => l.id === 'diamond');
    diamond.taken = true;
    game.player.loot.push('diamond');
    game.player.weight += diamond.weight;
    game.hasDiamond = true;
    game.alarm = 100;
    game.lockdown = true;
    game.lockdownLeft = 31;
    placeThief(game, 20, 17.5);
    game.player.dir = 0;
    game.player.sprinting = true;
    for (const g of game.guards) {
      g.state = 'chase';
      g.suspicion = 100;
      g.lastSeen = { x: game.player.x, y: game.player.y, at: game.time };
    }
    game.guards[0].x = 15 * TILE;
    game.guards[0].y = 15 * TILE;
    game.guards[1].x = 22 * TILE;
    game.guards[1].y = 15 * TILE;
    return;
  }

  // Unknown shot kind: just play the opening frame.
  placeThief(game, 15, 16);
}
