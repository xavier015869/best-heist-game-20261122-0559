// shots.js — deterministic staging for the four hand-in screenshots.
// ?shot=plan|action|vault|escape freezes the game in a composed scene so
// the renders are real frames of the game's own code, art-directed:
//   plan   — the blueprint with a sensible loadout chosen
//   action — the cover: thief mid-gallery, two guard cones, a camera cone,
//            lasers live, the diamond glowing, the alarm at 35%
//   vault  — the dial mini-game mid-crack with a tumbler already set
//   escape — lockdown: 32 seconds left, guards hunting, van waiting

export function stageShot(G, name) {
  if (name === 'plan') {
    G.prep.lockpick = 1; G.prep.emp = 1; G.prep.soles = 1; G.prep.duffel = 1;
    G.entry = 'front';
    return;
  }
  G.prep.lockpick = 1; G.prep.emp = 1; G.prep.duffel = 1;
  G.startHeist(name === 'vault' ? 'roof' : 'front');
  const [g1, g2, g3] = G.guards;
  const [c1, c2, c3] = G.cameras;

  if (name === 'action') {
    G.time = 5.4; // a moment when all four laser beams are live
    G.playTime = 74;
    G.alarm = 35; G.alarmPeak = 35;
    Object.assign(G.player, { x: 512, y: 205, angle: 0.15, weight: 5, value: 2400 });
    Object.assign(g1, { x: 688, y: 128, angle: 2.73, suspicion: 0.55, sees: true, state: 'suspicious' });
    Object.assign(g2, { x: 430, y: 520, angle: 0.9, suspicion: 0.15 });
    Object.assign(g3, { x: 985, y: 368, angle: Math.PI, suspicion: 0.2 });
    c1.angle = 2.5; c1.fill = 0.5;
    c2.angle = 1.15;
    c3.angle = 3.4;
    for (const laser of G.lasers) laser.on = true;
    for (let i = 0; i < 14; i++) {
      G.particles.push({
        x: 560 + (G.rng() - 0.5) * 60, y: 110 + (G.rng() - 0.5) * 44,
        vx: 0, vy: 0, life: 9, maxLife: 9, color: '#aef3ff', size: 2.6,
      });
    }
  }

  if (name === 'vault') {
    G.playTime = 121;
    G.alarm = 55; G.alarmPeak = 55;
    G.hasKeycard = true;
    G.doorOpen = true;
    Object.assign(G.player, { x: 1036, y: 122, angle: -Math.PI / 2, weight: 2, value: 800 });
    Object.assign(g3, { x: 1152, y: 268, angle: -Math.PI / 2, suspicion: 0.3 });
    Object.assign(g1, { x: 430, y: 250, angle: 0.4 });
    c3.angle = 3.6;
    G.dial.open = true;
    G.dial.tumblers = 1;
    G.dial.zoneStart = 0.8;
    G.dial.zoneSize = 0.62;
    G.dial.angle = 1.02; // needle resting inside the gold zone
    G.toastMsg = '';
  }

  if (name === 'escape') {
    G.playTime = 168;
    G.alarm = 100; G.alarmPeak = 100;
    G.lockdown = 32; G.lockdownWas = true;
    G.hasDiamond = true; G.hasKeycard = true; G.doorOpen = true; G.cracked = true;
    const diamond = G.loot.find((l) => l.id === 'diamond');
    if (diamond) diamond.taken = true;
    Object.assign(G.player, { x: 648, y: 394, angle: 2.65, weight: 9, value: 8900, running: true });
    Object.assign(g3, { x: 772, y: 368, angle: 2.9, suspicion: 1, state: 'chase', sees: true });
    Object.assign(g2, { x: 566, y: 486, angle: -1.1, suspicion: 1, state: 'chase' });
    Object.assign(g1, { x: 520, y: 292, angle: 1.2, suspicion: 0.8, state: 'investigate' });
    c2.angle = 1.5; c2.fill = 0.8;
    G.toastMsg = '';
  }
}
