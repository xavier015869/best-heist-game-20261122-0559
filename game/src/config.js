// config.js — every tunable number for Midnight Vault in one place.
// The render and simulation both read from here so the game can be
// rebalanced (or re-staged for screenshots) without hunting through code.

export const VIEW_W = 1280;
export const VIEW_H = 800;

export const PLAYER = {
  radius: 13,
  walkSpeed: 152,
  runSpeed: 238,
  runNoiseRadius: 104,      // guards inside this hear sprinting
  quietNoiseRadius: 46,     // soft soles shrink the sprint noise to this
  interactRadius: 34,
  pickupRadius: 36,         // generous: loot on desks/cases/pedestals is grabbed from beside them
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 76,
  investigateSpeed: 122,
  chaseSpeed: 208,
  returnSpeed: 132,
  coneLength: 176,
  coneHalfAngle: 0.52,      // radians, ~30 degrees each side
  catchRadius: 25,
  hearRadius: 40,           // footsteps this close always register
};

export const CAMERA = {
  coneLength: 158,
  coneHalfAngle: 0.44,
  sweepSpeed: 0.55,         // radians per second of the sweep oscillator
};

export const DETECTION = {
  guardRate: 1.55,          // suspicion per second at point blank centre-cone
  cameraRate: 0.95,         // camera "recording" fill per second
  shadowFactor: 0.5,        // standing in shadow halves every fill rate
  decay: 0.32,              // suspicion lost per second when unseen
  alarmFromGuard: 15,       // alarm per second while a guard watches you
  alarmFromCamera: 10,      // alarm per second while a camera watches you
  alarmDecay: 1.1,          // alarm cools off when nobody sees you
  alarmGrace: 1.6,          // seconds unseen before the alarm starts cooling
};

export const LASER = {
  tripAlarm: 35,
  empDisableSeconds: 7,
};

export const LOCKDOWN = {
  seconds: 45,
  guardSpeedBonus: 26,
};

export const PREP = {
  points: 6,
  costs: { lockpick: 2, emp: 1, smoke: 1, soles: 1, duffel: 1 },
  maxStacks: { lockpick: 1, emp: 2, smoke: 2, soles: 1, duffel: 1 },
  labels: {
    lockpick: 'Lockpick Kit',
    emp: 'EMP Charge',
    smoke: 'Smoke Bomb',
    soles: 'Soft Soles',
    duffel: 'Duffel Bag',
  },
  blurb: {
    lockpick: 'Open the vault door slowly — no keycard needed. Noisy.',
    emp: 'Q: blacks out cameras and lasers for 7 seconds.',
    smoke: 'F: a smoke cloud that breaks every line of sight.',
    soles: 'Sprinting barely makes a sound.',
    duffel: 'Carry 26 weight instead of 12.',
  },
};

export const CARRY = { base: 12, duffel: 26, slowPerWeight: 0.0055, minSpeedFactor: 0.6 };

export const SCORE = {
  ghostMultiplier: 1.5,
  speedBonusPerSecond: 10,
  parSeconds: 300,
};

export const ENTRIES = {
  front: { label: 'Front Doors', hint: 'Walk in like you own the place. Guards patrol the lobby.' },
  window: { label: 'Office Window', hint: 'Start in the west offices, close to the gallery.' },
  roof: { label: 'Roof Vent', hint: 'Drop straight into the vault — but you still need the diamond.' },
};
