// input.js — keyboard and mouse state, one place for every control.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered: consumed by the game each frame
    this.mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.clickX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.clickY = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouse.clicked = true;
    });
  }

  get up() { return this.keys.has('w') || this.keys.has('ArrowUp'); }
  get down() { return this.keys.has('s') || this.keys.has('ArrowDown'); }
  get left() { return this.keys.has('a') || this.keys.has('ArrowLeft'); }
  get right() { return this.keys.has('d') || this.keys.has('ArrowRight'); }
  get run() { return this.keys.has('Shift'); }

  // True once for the frame the key went down; the game clears it each tick.
  wasPressed(key) { return this.pressed.has(key); }
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
