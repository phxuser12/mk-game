// Keyboard input for local 2-player. P1 uses WASD + FGHJ, P2 uses Arrow keys
// + a numpad cluster. Attack buttons (hp/lp/hk/lk) are read out here already
// even though nothing consumes them until Milestone 2+.

const KEY_BINDINGS = {
  p1: {
    left: 'KeyA',
    right: 'KeyD',
    up: 'KeyW',
    down: 'KeyS',
    hp: 'KeyF',
    lp: 'KeyG',
    hk: 'KeyH',
    lk: 'KeyJ',
  },
  p2: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    hp: 'Numpad4',
    lp: 'Numpad5',
    hk: 'Numpad6',
    lk: 'Numpad2',
  },
};

const ALL_BOUND_KEYS = new Set(
  Object.values(KEY_BINDINGS).flatMap((bindings) => Object.values(bindings))
);

export class InputManager {
  constructor() {
    this.pressed = new Set();
    this.justPressed = new Set();

    window.addEventListener('keydown', (event) => {
      if (ALL_BOUND_KEYS.has(event.code)) event.preventDefault(); // stop arrow-key page scroll etc.
      if (!this.pressed.has(event.code)) this.justPressed.add(event.code);
      this.pressed.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.pressed.delete(event.code);
    });
  }

  // Call once per fixed update tick, after both players' getInput() calls,
  // so "just pressed" edges (e.g. jump) are consumed exactly once.
  endTick() {
    this.justPressed.clear();
  }

  getInput(player) {
    const b = KEY_BINDINGS[player];
    return {
      left: this.pressed.has(b.left),
      right: this.pressed.has(b.right),
      down: this.pressed.has(b.down),
      up: this.pressed.has(b.up),
      jumpPressed: this.justPressed.has(b.up),
      hp: this.pressed.has(b.hp),
      lp: this.pressed.has(b.lp),
      hk: this.pressed.has(b.hk),
      lk: this.pressed.has(b.lk),
    };
  }
}
