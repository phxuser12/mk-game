// Two original playable characters. Each has a single static placeholder
// sprite for now — squash/stretch onto the fighter's existing hitbox bounds
// (already used for crouch/knockdown) stands in for real per-pose art until
// actual sprite sheets + frame data exist, per the project's data-driven plan.

export const ROSTER = {
  emil: {
    name: 'EMIL',
    color: '#c0392b', // fallback fill if the sprite hasn't loaded yet
    spritePath: 'assets/sprites/emil_idle.png',
  },
  aleks: {
    name: 'ALEKS',
    color: '#2980b9',
    spritePath: 'assets/sprites/aleks_idle.png',
  },
};
