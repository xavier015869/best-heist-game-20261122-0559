// config.js — every tunable number and static definition for Midnight Vault.
// Pure data: no DOM, no canvas, no imports. The other modules read from here.
export const WORLD = { w: 1280, h: 720 };

// ---- rooms: floor rectangles drawn under everything, in draw order ----
export const ROOMS = [
  { id: 'street',    name: 'STREET',        x: 20,  y: 620, w: 1240, h: 80,  floor: '#23262e', label: '#5a6272' },
  { id: 'lobby',     name: 'LOBBY',         x: 540, y: 450, w: 200,  h: 150, floor: '#2e2a26', label: '#6b6257' },
  { id: 'corridor',  name: 'CORRIDOR',      x: 20,  y: 370, w: 1240, h: 60,  floor: '#2a2d33', label: '#565d6b' },
  { id: 'offices',   name: 'OFFICES',       x: 20,  y: 20,  w: 460,  h: 330, floor: '#272b31', label: '#525a66' },
  { id: 'gallery',   name: 'GALLERY',       x: 820, y: 20,  w: 440,  h: 330, floor: '#2c2620', label: '#6e5c44' },
  { id: 'vault',     name: 'VAULT',         x: 540, y: 20,  w: 200,  h: 240, floor: '#1f2733', label: '#4d647f' },
  { id: 'airlock',   name: 'LASER AIRLOCK', x: 540, y: 260, w: 200,  h: 90,  floor: '#331f24', label: '#7d4a55' },
  { id: 'counting',  name: 'COUNTING ROOM', x: 820, y: 450, w: 440,  h: 150, floor: '#262b26', label: '#55604f' },
  { id: 'staff',     name: 'STAFF ROOM',    x: 20,  y: 450, w: 460,  h: 150, floor: '#2b262e', label: '#63555e' },
];

// ---- shadow cover: standing here halves guard/camera detection ----
export const SHADOWS = [
  { x: 60,  y: 60,  w: 140, h: 100 }, // offices corner
  { x: 1080, y: 60, w: 140, h: 80  }, // gallery alcove
  { x: 120, y: 360, w: 120, h: 60  }, // corridor nook
  { x: 1150, y: 520, w: 90, h: 60   }, // counting room
  { x: 700, y: 540, w: 56,  h: 56  }, // lobby plant
  { x: 60,  y: 520, w: 120, h: 60  }, // staff room
  { x: 530, y: 270, w: 60,  h: 60  }, // airlock corner
];

// ---- entry points (planning screen choice) ----
export const ENTRIES = [
  { id: 'front',  name: 'FRONT DOORS',   desc: 'Longest route, most eyes.', x: 640, y: 660 },
  { id: 'window', name: 'OFFICE WINDOW', desc: 'Keycard is close by.',     x: 60,  y: 300 },
  { id: 'vent',   name: 'ROOF VENT',     desc: 'Straight into the vault.', x: 640, y: 100 },
];

// ---- prep tools: 6 points to spend on the planning screen ----
export const TOOLS = [
  { id: 'lockpick', name: 'Lockpick kit', cost: 2, max: 1, desc: 'Crack the vault door without a keycard (slow, noisy).' },
  { id: 'emp',      name: 'EMP charge',   cost: 1, max: 2, desc: 'Kills cameras and lasers for 8 seconds. Key 2.' },
  { id: 'smoke',    name: 'Smoke pellet', cost: 1, max: 2, desc: 'A cloud that blinds every cone for 6 seconds. Key 3.' },
  { id: 'soles',    name: 'Soft soles',   cost: 2, max: 1, desc: 'Running makes no noise at all.' },
  { id: 'duffel',   name: 'Duffel bag',   cost: 2, max: 1, desc: 'Loot weighs half as much. Keep your speed.' },
];
export const PREP_POINTS = 6;

// ---- loot: 14 items. value in dollars, weight slows the thief ----
export const LOOT = [
  { id: 'cash1',    name: 'Cash stack',   x: 200,  y: 170, value: 500,  weight: 1 },
  { id: 'watch1',   name: 'Gold watch',   x: 320,  y: 120, value: 800,  weight: 1 },
  { id: 'laptop',   name: 'Laptop',       x: 150,  y: 280, value: 400,  weight: 2 },
  { id: 'painting', name: 'Oil painting', x: 900,  y: 120, value: 1500, weight: 3 },
  { id: 'vase',     name: 'Ming vase',    x: 1150, y: 200, value: 900,  weight: 2 },
  { id: 'jewels',   name: 'Jewellery',    x: 1000, y: 300, value: 1200, weight: 1 },
  { id: 'statue',   name: 'Bronze statue',x: 880,  y: 300, value: 700,  weight: 3 },
  { id: 'cashpile', name: 'Cash pile',    x: 900,  y: 500, value: 2000, weight: 3 },
  { id: 'cash2',    name: 'Cash stack',   x: 1100, y: 450, value: 800,  weight: 1 },
  { id: 'bonds',    name: 'Bearer bonds', x: 1000, y: 560, value: 1500, weight: 2 },
  { id: 'safe',     name: 'Safe cash',    x: 150,  y: 500, value: 1000, weight: 2 },
  { id: 'coins',    name: 'Coin bag',     x: 350,  y: 450, value: 600,  weight: 1 },
  { id: 'watch2',   name: 'Pocket watch', x: 120,  y: 560, value: 500,  weight: 1 },
  { id: 'diamond',  name: 'THE DIAMOND',  x: 640,  y: 110, value: 5000, weight: 1, diamond: true },
];

export const KEYCARD = { x: 200, y: 210, name: 'Security keycard' };
export const VAN = { x: 60, y: 640, w: 120, h: 50 };
export const VAULT_DOOR = { x: 610, y: 260, w: 60, h: 20 }; // gap in the vault wall
export const VAULT_DIAL = { x: 640, y: 292 }; // where the thief stands to crack it

// ---- guards: patrol loops ----
export const GUARD_DEFS = [
  { id: 'g1', name: 'Marco',   color: '#3b5bdb', waypoints: [[120, 390], [1160, 390]], speed: 72 },
  { id: 'g2', name: 'Rosa',    color: '#7048e8', waypoints: [[860, 140], [1150, 140], [1150, 300], [860, 300]], speed: 66 },
  { id: 'g3', name: 'Dmitri',  color: '#0ca678', waypoints: [[860, 520], [1160, 520], [1160, 470], [860, 470]], speed: 66 },
];

// ---- cameras: wall-mounted, sweeping cones ----
export const CAMERA_DEFS = [
  { id: 'c1', x: 640,  y: 445, base: Math.PI / 2,  sweep: 0.9,  range: 200 }, // lobby, faces south
  { id: 'c2', x: 1010, y: 60,  base: Math.PI / 2,  sweep: 1.0,  range: 220 }, // gallery, faces south
  { id: 'c3', x: 640,  y: 365, base: -Math.PI / 2, sweep: 1.05, range: 210 }, // corridor, faces the vault
];

// ---- lasers: 4 timed beams across the airlock ----
export const LASER_DEFS = [
  { y: 280, period: 3.2, phase: 0.0 },
  { y: 300, period: 3.2, phase: 0.8 },
  { y: 320, period: 3.2, phase: 1.6 },
  { y: 340, period: 3.2, phase: 2.4 },
];
export const LASER_ALARM = 35; // alarm added per tripped beam

// ---- alarm + lockdown ----
export const ALARM = {
  guardRate: 30,    // per second inside a guard cone
  cameraRate: 22,   // per second inside a camera cone
  shadowFactor: 0.5,
  decay: 5,         // per second while unseen
  noiseRate: 10,    // per second while running loud near a guard
  lockpickRate: 5,  // per second while lockpicking
  missCost: 12,     // alarm per missed vault tumbler
  lockdownSeconds: 45,
  ghostCeiling: 30, // peak alarm at or below this counts as a ghost run
};

// ---- scoring ----
export const SCORE = {
  ghostMultiplier: 1.5,
  diamondBonus: 5000,
  speedParSeconds: 360,
  speedPerSecond: 5,
};

// ---- the 8 ending titles ----
export const TITLES = {
  phantom: 'The Midnight Phantom',
  vaultLegend: 'Vault Legend',
  loudLegend: 'Loud Legend',
  cleanPro: 'Clean Professional',
  smooth: 'Smooth Operator',
  smashGrab: 'Smash-and-Grab Artist',
  lucky: 'Lucky Amateur',
  caught: 'Caught Red-Handed',
};

export const CONTROLS = [
  ['WASD / Arrows', 'Move'],
  ['Shift', 'Run (loud unless soft soles)'],
  ['E', 'Pick up / interact / start the vault crack'],
  ['Space', 'Lock a vault tumbler (during the crack)'],
  ['1', 'Use lockpick at the vault door'],
  ['2', 'EMP — kill cameras & lasers 8s'],
  ['3', 'Smoke pellet — blind every cone 6s'],
  ['M', 'Mute sound'],
  ['Esc', 'Step back from the vault dial'],
];
