// Midnight Vault — the vault crack: a 3-tumbler timing dial played standing
// exposed by the lasers. Press Space when the needle is inside the green zone;
// each hit sets a tumbler, each miss costs suspicion. Three hits open the vault.

export function createVault() {
  return {
    active: false, // the dial overlay is open
    tumbler: 0, // 0..2, how many tumblers are set
    angle: 0, // needle angle, radians
    speed: 2.6, // radians per second; speeds up each tumbler
    zoneCenter: 0, // centre of the green zone, radians
    zoneHalf: 0.42, // green zone half-width
    misses: 0,
    opened: false,
  };
}

export function openVaultCrack(game) {
  const v = game.vault;
  v.active = true;
  v.tumbler = 0;
  v.angle = 0;
  v.speed = 2.6;
  v.zoneCenter = Math.random() * Math.PI * 2;
  v.misses = 0;
  game.audio.vaultTick();
  game.flash('Crack the vault — Space when the needle is in the green!');
}

export function closeVaultCrack(game) {
  game.vault.active = false;
}

export function updateVault(game, dt) {
  const v = game.vault;
  if (!v.active || v.opened) return;
  v.angle += v.speed * dt;
  if (v.angle > Math.PI * 2) v.angle -= Math.PI * 2;
  // Space (or click) attempts a tumbler.
  if (game.input.wasPressed('Space') || game.input.mouse.pressed) {
    let diff = v.angle - v.zoneCenter;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= v.zoneHalf) {
      v.tumbler += 1;
      v.speed += 0.7;
      v.zoneCenter = Math.random() * Math.PI * 2;
      game.audio.pickup();
      game.flash('Tumbler ' + v.tumbler + ' of 3 set!');
      if (v.tumbler >= 3) {
        v.opened = true;
        v.active = false;
        game.vaultOpen = true;
        game.audio.vaultOpen();
        game.flash('VAULT OPEN — the Midnight Diamond is yours for the taking');
      }
    } else {
      v.misses += 1;
      v.speed = Math.min(4.2, v.speed + 0.25);
      game.alarm = Math.min(100, game.alarm + 12);
      game.audio.laserZap();
      game.flash('Missed the tumbler! +12 alarm');
    }
  }
  // Escape closes the dial (the vault stays as cracked so far).
  if (game.input.wasPressed('Escape')) {
    closeVaultCrack(game);
  }
}

// Is the thief standing at the vault, close enough to start cracking?
export function nearVault(game) {
  const p = game.player;
  // The vault safe sits at tile (24, 3); the thief cracks from its south side.
  const vx = (24 + 0.5) * 32;
  const vy = (3 + 0.5) * 32;
  return Math.hypot(p.x - vx, p.y - vy) < 32 * 1.6;
}
