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
  RUN_SPEED: 420, // px/sec, dedicated Run button's dash speed
  RUN_DURATION_FRAMES: 14, // ticks the dash lasts before returning to idle
  KNOCKBACK_FRICTION: 0.85, // per-tick velocity decay while in hit-stun/block-stun
};

export const FIGHTER = {
  STAND_WIDTH: 60,
  STAND_HEIGHT: 140,
  CROUCH_HEIGHT: 90,
  KNOCKDOWN_HEIGHT: 30, // flattened placeholder-box height while lying down
};

export const COMBAT = {
  KNOCKDOWN_FRAMES: 30, // ticks lying down before getting-up starts
  GETTING_UP_FRAMES: 20, // ticks of vulnerable recovery before idle
  COMBO_DISPLAY_FRAMES: 90, // how long the combo counter UI lingers after the last hit
  JUGGLE_POP_VELOCITY: 400, // px/sec upward refresh when a follow-up hit lands on an airborne target
};

export const MATCH = {
  ROUND_SECONDS: 99,
  ROUNDS_TO_WIN: 2,
  ROUND_INTRO_FRAMES: 90, // ~1.5s banner before a round starts
  ROUND_END_FRAMES: 120, // ~2s pause showing the round result
  FINISHER_WINDOW_FRAMES: 180, // ~3s to input a finisher once the match is clinched
  FINISHER_PLAY_FRAMES: 90, // ~1.5s finisher animation
};
