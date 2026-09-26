// Two original playable characters. Each has a single static placeholder
// sprite for now — squash/stretch onto the fighter's existing hitbox bounds
// (already used for crouch/knockdown) stands in for real per-pose art until
// actual sprite sheets + frame data exist, per the project's data-driven plan.

export const ROSTER = {
  krug: {
    name: 'KRUG',
    color: '#c0392b', // fallback fill if the sprite hasn't loaded yet
    spritePath: 'assets/sprites/krug_idle.png',
  },
  vesper: {
    name: 'VESPER',
    color: '#2980b9',
    spritePath: 'assets/sprites/vesper_idle.png',
  },
};
