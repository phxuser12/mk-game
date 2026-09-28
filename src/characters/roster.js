// Two original playable characters. Each character's sprites live in their
// own folder (assets/sprites/<character>/<pose>_<frameIndex>.png) so art
// can be swapped in per-character/per-pose independently as real frames
// replace the procedural placeholders. `color` is only used as a fallback
// fill if a sprite hasn't finished loading.
//
// FRAME_COUNTS tracks how many frames actually exist per pose, per
// character — update this as new frames are dropped in (e.g. from
// tools/generate_sprites.py, or real generated/hand-drawn art). Any pose
// not listed here defaults to 2 (the original procedural placeholder
// count). Frame sizes don't need to match across poses or characters —
// Fighter reads each sprite's own natural dimensions at draw time.
const FRAME_COUNTS = {
  burak: {
    // all real generated art, from a sheet+manifest batch (see
    // tools/slice_sprites.py) — jump and walkBack are one frame short of
    // the brief's recommendation because 2 of the delivered crops
    // (walkBack_5, jump_2) were misaligned/contaminated and were dropped.
    idle: 4,
    walkForward: 6,
    walkBack: 5,
    jump: 3,
    crouch: 3,
    punch: 5,
    kick: 6,
    uppercut: 6,
    sweep: 5,
    special: 7,
    hitStun: 3,
    launched: 5,
    knockdown: 4,
  },
  aleks: {},
};

export const POSE_NAMES = [
  'idle', 'walkForward', 'walkBack', 'jump', 'crouch',
  'punch', 'kick', 'uppercut', 'sweep', 'special',
  'hitStun', 'launched', 'knockdown',
];

const DEFAULT_FRAME_COUNT = 2;

function buildSprites(character) {
  const counts = FRAME_COUNTS[character] || {};
  const sprites = {};
  for (const pose of POSE_NAMES) {
    const frameCount = counts[pose] || DEFAULT_FRAME_COUNT;
    sprites[pose] = Array.from(
      { length: frameCount },
      (_, i) => `assets/sprites/${character}/${pose}_${i}.png`
    );
  }
  return sprites;
}

export const ROSTER = {
  burak: {
    name: 'BURAK',
    color: '#c0392b',
    sprites: buildSprites('burak'),
  },
  aleks: {
    name: 'ALEKS',
    color: '#2980b9',
    sprites: buildSprites('aleks'),
  },
};
