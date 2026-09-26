// Stage dimensions and physics tuning constants. Values are in pixels and
// pixels/second so they read naturally against the canvas coordinate space.
// Expect heavy re-tuning once real sprite sizes and frame data exist.

export const STAGE = {
  WIDTH: 960,
  HEIGHT: 540,
  GROUND_Y: 420, // y-coordinate of the floor; fighter "feet" rest here
  LEFT_WALL: 60,
  RIGHT_WALL: 900,
};

export const PHYSICS = {
  WALK_SPEED: 180, // px/sec, grounded horizontal movement
  AIR_CONTROL_SPEED: 120, // px/sec, reduced horizontal control while airborne
  JUMP_VELOCITY: 620, // px/sec, initial upward speed (subtracted from vy)
  GRAVITY: 1400, // px/sec^2, applied to vy while airborne
};

export const FIGHTER = {
  STAND_WIDTH: 60,
  STAND_HEIGHT: 140,
  CROUCH_HEIGHT: 90,
};
