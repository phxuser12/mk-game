// Minimal finite state machine with enter/update/exit hooks. Fighters use
// this to keep transitions explicit and centralized instead of scattering
// "if this animation is playing" checks through the update loop.

export class StateMachine {
  constructor(owner, states, initialState) {
    this.owner = owner;
    this.states = states;
    this.current = initialState;
    this.states[this.current].enter?.(owner);
  }

  transition(name) {
    if (name === this.current) return;
    const next = this.states[name];
    if (!next) throw new Error(`Unknown state: ${name}`);
    this.states[this.current].exit?.(this.owner);
    this.current = name;
    next.enter?.(this.owner);
  }

  update(dt, input) {
    this.states[this.current].update?.(this.owner, dt, input);
  }

  is(name) {
    return this.current === name;
  }
}
