// Shared test doubles for the input shape InputManager.getInput() produces
// (src/engine/input.js) — Fighter.update()/fighterStates.js and Match.update()
// only ever read this shape, never the InputManager class itself, so tests
// can hand-build it directly instead of wiring up real keyboard events.

export function blankInput(overrides = {}) {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpPressed: false,
    hp: false,
    lp: false,
    hk: false,
    lk: false,
    hpPressed: false,
    lpPressed: false,
    hkPressed: false,
    lkPressed: false,
    block: false,
    runPressed: false,
    ...overrides,
  };
}

// Match.update() calls `input.getInput(player)` — this stands in for a real
// InputManager. `byPlayer` maps 'p1'/'p2' to an overrides object applied to
// blankInput() for that player; mutate `.byPlayer` between ticks to change
// what each player is "pressing".
export function makeFakeInput(byPlayer = {}) {
  return {
    byPlayer,
    getInput(player) {
      return blankInput(this.byPlayer[player] || {});
    },
  };
}
