// shots.js — deterministic staged scenes for the ?shot= screenshots.
// Each stage freezes the game at a fixed time so the capture is reproducible.
import { VAULT_DIAL } from './config.js';

function freezeGuards(game, spots) {
  game.guards.forEach((g, i) => {
    const s = spots[i];
    g.x = s.x; g.y = s.y;
    g.facing = s.facing;
    g.pause = 999; // dwell in place, sweeping the cone
    g.mode = 'patrol';
  });
}

export function stageShot(game, kind) {
  if (kind === 'plan' || kind === 'start') {
    game.state = 'plan';
    game.entry = 'vent';
    game.prep = { lockpick: 1, emp: 1, smoke: 1, soles: 0, duffel: 0 };
    game.prepLeft = 2;
    game.time = 12.5;
    return;
  }

  // Every play-stage starts a real heist, then re-poses it.
  game.entry = 'front';
  game.startHeist();
  game.time = 0; // fixed time: lasers 1+2 live, cameras mid-sweep

  if (kind === 'action' || kind === 'play') {
    game.player.x = 1000; game.player.y = 260;
    game.player.dir = Math.PI; // crossing the gallery, heading west
    game.player.loot = ['cash1', 'watch1'];
    game.player.weight = 2;
    game.player.hasKeycard = true;
    game.alarm.value = 38; game.alarm.peak = 38;
    game.elapsed = 95;
    freezeGuards(game, [
      { x: 900, y: 390, facing: -0.6 },
      { x: 1150, y: 200, facing: Math.PI },
      { x: 900, y: 500, facing: -2.2 },
    ]);
    return;
  }

  if (kind === 'vault') {
    game.player.x = VAULT_DIAL.x; game.player.y = VAULT_DIAL.y;
    game.player.dir = -Math.PI / 2;
    game.player.loot = ['cash1', 'watch1', 'cashpile', 'bonds'];
    game.player.weight = 8;
    game.player.hasKeycard = true;
    game.alarm.value = 55; game.alarm.peak = 55;
    game.elapsed = 150;
    game.vault.start(7);
    game.vault.tumblers = 1;
    game.vault.angle = game.vault.zone - 0.12; // needle just entering the green
    freezeGuards(game, [
      { x: 500, y: 390, facing: -Math.PI / 2 },
      { x: 1150, y: 200, facing: Math.PI },
      { x: 900, y: 500, facing: -2.2 },
    ]);
    return;
  }

  if (kind === 'escape' || kind === 'end') {
    game.vault.open = true;
    game.player.x = 320; game.player.y = 660;
    game.player.dir = Math.PI; // running west along the street, toward the van
    game.player.loot = ['cash1', 'watch1', 'cashpile', 'bonds', 'painting', 'diamond'];
    game.player.weight = 12;
    game.player.hasKeycard = true;
    game.alarm.value = 100; game.alarm.peak = 100;
    game.alarm.lockdown = true;
    game.alarm.lockdownLeft = 32;
    game.elapsed = 210;
    game.guards.forEach((g, i) => {
      g.mode = 'chase';
      g.pause = 0;
    });
    game.guards[0].x = 640; game.guards[0].y = 560; game.guards[0].facing = Math.PI / 2;
    game.guards[1].x = 700; game.guards[1].y = 470; game.guards[1].facing = Math.PI / 2;
    game.guards[2].x = 980; game.guards[2].y = 560; game.guards[2].facing = Math.PI / 2;
    return;
  }

  // Unknown ?shot= value: fall back to the action frame.
  stageShot(game, 'action');
}
