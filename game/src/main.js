// main.js — entrypoint: boots the game, runs the loop, stages ?shot= captures.
// ?shot=plan|action|vault|escape renders one frozen, deterministic frame
// (aliases: start -> plan, play -> action, end -> end/escape). ?seed=N seeds it.
import { Game } from './game.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

const canvas = document.getElementById('game');
const game = new Game(canvas, { seed, shot: !!shot });

// Test hook: automated playtests drive and read the game through this.
window.MIDNIGHT_VAULT = {
  game,
  snapshot: () => game.snapshot(),
  startHeist: () => game.startHeist(),
};

if (shot) {
  document.title = 'Midnight Vault — shot:' + shot;
  stageShot(game, shot);
  game.render();
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
