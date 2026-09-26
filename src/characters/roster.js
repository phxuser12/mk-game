// Two original playable characters. Each pose now has 2 animation frames
// (see Fighter's animation state in src/entities/fighter.js) and its own
// native image size — poses are auto-cropped to their own content at
// generation time, so e.g. a kick comes out wider than tall while a walk
// stays portrait, without any per-pose sizing logic here. `color` is only
// used as a fallback fill if a sprite hasn't finished loading.

const POSE_NAMES = [
  'idle', 'walkForward', 'walkBack', 'jump', 'crouch',
  'punch', 'kick', 'uppercut', 'sweep', 'special',
  'hitStun', 'launched', 'knockdown',
];

function buildSprites(prefix) {
  const sprites = {};
  for (const pose of POSE_NAMES) {
    sprites[pose] = [
      `assets/sprites/${prefix}_${pose}_0.png`,
      `assets/sprites/${prefix}_${pose}_1.png`,
    ];
  }
  return sprites;
}

export const ROSTER = {
  emil: {
    name: 'EMIL',
    color: '#c0392b',
    sprites: buildSprites('emil'),
  },
  aleks: {
    name: 'ALEKS',
    color: '#2980b9',
    sprites: buildSprites('aleks'),
  },
};
