// input.js — keyboard state and canvas mouse, shared by the planning
// screen (clicks) and the heist itself (WASD/arrows, E, Q, F, Shift).

export const keys = new Set();
export const mouse = { x: 0, y: 0, clicked: false };

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

// Taps shorter than one frame still count: keydown records a tap that
// pressed() can see until the frame ends.
const tapped = new Set();

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!e.repeat) tapped.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const toGame = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };
  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y;
    mouse.clicked = true;
  });
}

// One-shot key press test: true only on the frame the key goes down.
// game.js calls markFrame() once per frame after updates.
const prev = new Set();
export function pressed(code) { return tapped.has(code) || (keys.has(code) && !prev.has(code)); }
export function markFrame() {
  prev.clear();
  for (const k of keys) prev.add(k);
  tapped.clear();
  mouse.clicked = false;
}

export function moveVector() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, moving: x !== 0 || y !== 0 };
}
