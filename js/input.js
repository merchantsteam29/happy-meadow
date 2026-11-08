// Keyboard, mouse and a *filtered* gamepad.
// Gamepad guard: only standard-mapped pads, never wheels/joysticks/tablets, axes only count once
// they've been seen centred, and a pad only becomes active on a fresh press or centred-then-moved stick.

const BAD_PAD = /wheel|joystick|flight|pedal|tablet|throttle|rudder|hotas|stick|g29|g920|t300|wacom/i;

export const input = {
  keys: new Set(),
  pressedKeys: new Set(),
  mouseDX: 0, mouseDY: 0, clicked: false,
  padsEnabled: true,
  padIndex: -1,
  padState: {},     // index -> { centred: [], prevButtons: [] }
  pad: null,        // { axes:[], buttons:[], pressed:Set }

  init() {
    try { this.padsEnabled = localStorage.getItem('meadow_pads') !== 'off'; } catch (e) {}
    addEventListener('keydown', e => {
      if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', e => {
      if (document.pointerLockElement) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    addEventListener('mousedown', () => { this.clicked = true; });
    addEventListener('gamepaddisconnected', e => { if (e.gamepad.index === this.padIndex) this.padIndex = -1; delete this.padState[e.gamepad.index]; });
  },

  setPads(on) {
    this.padsEnabled = on;
    if (!on) { this.padIndex = -1; this.pad = null; }
    try { localStorage.setItem('meadow_pads', on ? 'on' : 'off'); } catch (e) {}
  },

  poll() {
    this.pad = null;
    if (!this.padsEnabled || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      if (gp.mapping !== 'standard' || BAD_PAD.test(gp.id)) continue;
      let st = this.padState[gp.index];
      if (!st) st = this.padState[gp.index] = { centred: gp.axes.map(() => false), prev: gp.buttons.map(() => true) };
      gp.axes.forEach((v, i) => { if (Math.abs(v) < 0.2) st.centred[i] = true; });
      const fresh = gp.buttons.some((b, i) => b.pressed && !st.prev[i]);
      const moved = gp.axes.some((v, i) => st.centred[i] && Math.abs(v) > 0.5);
      if (this.padIndex !== gp.index && (fresh || moved)) this.padIndex = gp.index;
      const pressed = new Set();
      gp.buttons.forEach((b, i) => { if (b.pressed && !st.prev[i]) pressed.add(i); });
      st.prev = gp.buttons.map(b => b.pressed);
      if (gp.index === this.padIndex) {
        const axes = gp.axes.map((v, i) => (st.centred[i] && Math.abs(v) > 0.18) ? v : 0);
        this.pad = { axes, buttons: gp.buttons.map(b => b.pressed), pressed };
      }
    }
  },

  btn(i) { return !!(this.pad && this.pad.buttons[i]); },
  btnPressed(i) { return !!(this.pad && this.pad.pressed.has(i)); },
  key(...codes) { return codes.some(c => this.keys.has(c)); },
  keyPressed(...codes) { return codes.some(c => this.pressedKeys.has(c)); },

  get moveX() {
    let x = (this.key('KeyD', 'ArrowRight') ? 1 : 0) - (this.key('KeyA', 'ArrowLeft') ? 1 : 0);
    if (this.pad) { x += this.pad.axes[0] || 0; if (this.btn(15)) x += 1; if (this.btn(14)) x -= 1; }
    return Math.max(-1, Math.min(1, x));
  },
  get moveY() { // forward positive
    let y = (this.key('KeyW', 'ArrowUp') ? 1 : 0) - (this.key('KeyS', 'ArrowDown') ? 1 : 0);
    if (this.pad) { y -= this.pad.axes[1] || 0; if (this.btn(12)) y += 1; if (this.btn(13)) y -= 1; }
    return Math.max(-1, Math.min(1, y));
  },
  get lookX() { return this.pad ? (this.pad.axes[2] || 0) : 0; },
  get lookY() { return this.pad ? (this.pad.axes[3] || 0) : 0; },

  jumpHeld() { return this.key('Space', 'KeyW', 'ArrowUp') || this.btn(0); },
  jumpPressed() { return this.keyPressed('Space', 'KeyW', 'ArrowUp') || this.btnPressed(0); },
  confirmPressed() { return this.keyPressed('Space', 'Enter', 'KeyE') || this.clicked || this.btnPressed(0); },
  sprint() { return this.key('ShiftLeft', 'ShiftRight') || this.btn(10) || this.btn(4); },
  crouch() { return this.key('KeyC', 'ControlLeft', 'ControlRight') || this.btn(1); },
  flashPressed() { return this.keyPressed('KeyF') || this.btnPressed(5) || this.btnPressed(7); },
  interactPressed() { return this.keyPressed('KeyE') || this.btnPressed(2) || this.btnPressed(3); },

  endFrame() { this.pressedKeys.clear(); this.mouseDX = 0; this.mouseDY = 0; this.clicked = false; }
};
