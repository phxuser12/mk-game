// Two original playable characters. Each has one placeholder sprite per pose
// (see Fighter.getPoseKey() for the state -> pose mapping) — punch/kick share
// one pose each across their High/Low variants; per-move-distinct art and
// real animation frames are future work. `color` is only used as a fallback
// fill if a sprite hasn't finished loading.

const posePaths = (prefix) => ({
  idle: `assets/sprites/${prefix}_idle.png`,
  walkForward: `assets/sprites/${prefix}_walkForward.png`,
  walkBack: `assets/sprites/${prefix}_walkBack.png`,
  jump: `assets/sprites/${prefix}_jump.png`,
  crouch: `assets/sprites/${prefix}_crouch.png`,
  punch: `assets/sprites/${prefix}_punch.png`,
  kick: `assets/sprites/${prefix}_kick.png`,
  uppercut: `assets/sprites/${prefix}_uppercut.png`,
  sweep: `assets/sprites/${prefix}_sweep.png`,
  special: `assets/sprites/${prefix}_special.png`,
  hitStun: `assets/sprites/${prefix}_hitStun.png`,
  launched: `assets/sprites/${prefix}_launched.png`,
  knockdown: `assets/sprites/${prefix}_knockdown.png`,
});

export const ROSTER = {
  emil: {
    name: 'EMIL',
    color: '#c0392b',
    sprites: posePaths('emil'),
  },
  aleks: {
    name: 'ALEKS',
    color: '#2980b9',
    sprites: posePaths('aleks'),
  },
};
