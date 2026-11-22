// Midnight Vault — bootstrap: canvas, input, audio, the game loop, and the
// ?shot= staging hook. Exposes window.__mv for automated play-testing.

import { W, H } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createGame } from './game.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const input = createInput();
const audio = createAudio();
const game = createGame(ctx, input, audio);

// Screenshot staging: ?shot=plan|action|vault|escape freezes a canned scene.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot);
}

// Debug/test hook: the playtest reads state and steers with real key events.
window.__mv = {
  game,
  state() {
    const p = game.player;
    return {
      phase: game.phase,
      time: game.time,
      alarm: game.alarm,
      lockdown: game.lockdown,
      lockdownLeft: game.lockdownLeft,
      vaultOpen: game.vaultOpen,
      vaultActive: game.vault.active,
      vaultTumbler: game.vault.tumbler,
      vaultAngle: game.vault.angle,
      vaultZone: game.vault.zoneCenter,
      hasDiamond: game.hasDiamond,
      hasKeycard: !!p?.hasKeycard,
      px: p?.x,
      py: p?.y,
      loot: p ? [...p.loot] : [],
      score: game.score,
      endTitle: game.endTitle,
      guards: game.guards ? game.guards.map((g) => ({ x: g.x, y: g.y, state: g.state, suspicion: g.suspicion })) : [],
    };
  },
};

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) game.update(dt);
  game.render();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
