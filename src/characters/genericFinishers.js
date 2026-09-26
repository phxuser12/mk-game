// Shared placeholder finishers until real characters exist (same deal as
// the rest of characters/*.js). Only usable during the match's finisher
// window — see src/match/match.js — which opens after a fighter clinches
// the match with a clean KO. Each has its own simple input code, checked
// the same way specials are (see src/engine/motionBuffer.js).

export const GENERIC_FINISHERS = {
  foundryEnd: {
    type: 'brutal', // gated behind the blood/gore setting
    displayName: 'FOUNDRY END',
    input: { sequence: ['down', 'down'], button: 'hkPressed', maxFrames: 20 },
  },
  barrelRide: {
    type: 'nonviolent', // always available regardless of the gore setting
    displayName: 'BARREL RIDE',
    input: { sequence: ['up', 'up'], button: 'lpPressed', maxFrames: 20 },
  },
};
