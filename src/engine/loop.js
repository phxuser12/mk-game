// Fixed-timestep game loop. Update always advances by exactly FIXED_DT so
// gameplay (combos, frame data, physics) stays deterministic regardless of
// display refresh rate; rendering happens once per animation frame.

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25; // clamp huge gaps (tab switch, breakpoint) to avoid a "spiral of death"

export function startGameLoop({ update, render }) {
  let lastTime = performance.now();
  let accumulator = 0;

  function frame(now) {
    let delta = (now - lastTime) / 1000;
    lastTime = now;
    if (delta > MAX_FRAME_TIME) delta = MAX_FRAME_TIME;
    accumulator += delta;

    while (accumulator >= FIXED_DT) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
