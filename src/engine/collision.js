import { STAGE } from './constants.js';
import { clamp } from './utils.js';

// Keeps the two fighters from overlapping (simple body push-apart), then
// re-clamps both to the stage walls. This is the "solid body" collision;
// attack hitbox/hurtbox collision arrives in Milestone 2 as a separate system.
export function resolveOverlap(a, b) {
  const minGap = (a.width + b.width) / 2;
  const dx = b.x - a.x;
  const overlap = minGap - Math.abs(dx);

  if (overlap > 0) {
    const dir = dx >= 0 ? 1 : -1;
    const push = overlap / 2;
    a.x -= dir * push;
    b.x += dir * push;
  }

  a.x = clamp(a.x, STAGE.LEFT_WALL + a.width / 2, STAGE.RIGHT_WALL - a.width / 2);
  b.x = clamp(b.x, STAGE.LEFT_WALL + b.width / 2, STAGE.RIGHT_WALL - b.width / 2);
}
