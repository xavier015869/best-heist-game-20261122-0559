// Midnight Vault — shared constants: sizes, palette, tools, loot and ending titles.
// Everything the other modules need lives here so no file repeats a magic number.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const W = COLS * TILE; // 960
export const H = ROWS * TILE; // 640

// Palette: midnight blue bank at night, warm loot, danger red, watchful cyan.
export const COLORS = {
  floor: '#1c2438',
  floorAlt: '#202a40',
  shadow: '#121829',
  wall: '#3a4666',
  wallTop: '#4d5c85',
  street: '#141a2b',
  asphalt: '#1a2033',
  gold: '#f2c14e',
  diamond: '#7fe7f2',
  red: '#ff4d5e',
  orange: '#ff9a3d',
  cyan: '#37c8e8',
  green: '#5ee08a',
  cream: '#f4ead2',
  dim: '#8b93ad',
  thief: '#e8e4d8',
  guard: '#ff6b5e',
  camera: '#37c8e8',
  laser: '#ff2e63',
  van: '#2e7d5b',
};

export const PREP_POINTS = 6;

// Tools the planner can buy with prep points. Cost, effect and blurb in one place.
export const TOOLS = {
  lockpick: { name: 'Lockpick Kit', cost: 2, desc: 'Pick the vault door slowly — no keycard needed, but it is loud.' },
  emp: { name: 'EMP Charge', cost: 1, desc: 'Kill every camera for 12 seconds. Carry up to two.' },
  smoke: { name: 'Smoke Pellet', cost: 1, desc: 'Vanish inside a smoke cloud for 6 seconds. Carry up to two.' },
  soles: { name: 'Soft Soles', cost: 1, desc: 'Your footsteps are half as loud. Guards hear you from half as far.' },
  duffel: { name: 'Duffel Bag', cost: 1, desc: 'Carry two extra heavy items without slowing down.' },
};

// Entry points offered on the planning screen.
export const ENTRIES = [
  { id: 'front', name: 'Front Doors', desc: 'Walk in through the lobby. Polite. Watched.', x: 15, y: 18 },
  { id: 'window', name: 'Office Window', desc: 'Slip into the west offices after dark. Near the keycard.', x: 2, y: 15 },
  { id: 'roof', name: 'Roof Vent', desc: 'Drop through the ceiling vent straight into the vault wing.', x: 24, y: 2 },
];

// The 14 loot items: id, name, value, weight (slows the thief), and where it sits.
export const LOOT_TABLE = [
  { id: 'diamond', name: 'The Midnight Diamond', value: 5000, weight: 1, x: 24, y: 3, vault: true },
  { id: 'painting1', name: 'Moonlit Harbour', value: 1200, weight: 3, x: 22, y: 14 },
  { id: 'painting2', name: 'Portrait of a Stranger', value: 900, weight: 3, x: 27, y: 14 },
  { id: 'vase', name: 'Celadon Vase', value: 700, weight: 2, x: 21, y: 15 },
  { id: 'bust', name: 'Marble Bust', value: 600, weight: 3, x: 28, y: 15 },
  { id: 'cash1', name: 'Cash Bundle', value: 1500, weight: 1, x: 3, y: 9 },
  { id: 'cash2', name: 'Cash Bundle', value: 1500, weight: 1, x: 6, y: 9 },
  { id: 'goldbar', name: 'Gold Bar', value: 2000, weight: 4, x: 5, y: 8 },
  { id: 'watch', name: 'Pocket Watch', value: 800, weight: 0, x: 4, y: 13 },
  { id: 'ledger', name: 'Black Ledger', value: 1000, weight: 0, x: 7, y: 13 },
  { id: 'necklace', name: 'Pearl Necklace', value: 1100, weight: 0, x: 3, y: 15 },
  { id: 'coins', name: 'Coin Sack', value: 500, weight: 2, x: 12, y: 13 },
  { id: 'tiara', name: 'Silver Tiara', value: 950, weight: 0, x: 17, y: 13 },
  { id: 'stamp', name: 'Rare Stamp', value: 650, weight: 0, x: 14, y: 15 },
];

// Ending titles, from a ghost to a loud mess.
export const END_TITLES = [
  { min: 9000, title: 'The Ghost of Midnight' },
  { min: 7000, title: 'The Velvet Shadow' },
  { min: 5000, title: 'The Quiet Professional' },
  { min: 3500, title: 'The Night Owl' },
  { min: 2000, title: 'The Opportunist' },
  { min: 1000, title: 'The Lucky Amateur' },
  { min: 400, title: 'The Clumsy Cat' },
  { min: 0, title: 'The Loud Tourist' },
];

export function endingTitle(score) {
  for (const t of END_TITLES) if (score >= t.min) return t.title;
  return 'The Loud Tourist';
}
