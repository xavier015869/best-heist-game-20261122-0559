// Midnight Vault — keyboard and mouse input: a tiny state object the game polls.
// Keys are tracked by code (KeyW, ArrowUp, Space, ...) so layouts do not matter.

export function createInput() {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered: true for one frame after keydown
  let mouseX = 0;
  let mouseY = 0;
  let mousePressed = false;

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const rect = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 };
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }
  function onMouseDown(e) {
    mousePressed = true;
    const rect = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 };
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);

  return {
    // Held-down test for a list of codes.
    down(...codes) {
      return codes.some((c) => keys.has(c));
    },
    // Edge test: was the key pressed since the last frame?
    wasPressed(code) {
      return pressed.has(code);
    },
    // Movement vector from WASD/arrows, normalised.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    get mouse() {
      return { x: mouseX, y: mouseY, pressed: mousePressed };
    },
    // Call at the end of each frame to clear edge state.
    endFrame() {
      pressed.clear();
      mousePressed = false;
    },
  };
}
