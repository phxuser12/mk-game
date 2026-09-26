// Shared placeholder moveset used by both fighters until distinct characters
// exist (Milestone 5+ splits this into per-character frame data + sprite
// refs). Frame counts are in ticks at the engine's fixed 60fps, matching
// classic fighting-game frame-data notation. Expect heavy re-tuning.
//
// hitbox offsets are measured from the fighter's feet (fighter.y): offsetY
// is the distance up from the feet to the BOTTOM of the box.

export const GENERIC_MOVES = {
  highPunch: {
    startup: 6, // frames before the hitbox exists
    active: 4, // frames the hitbox can land a hit
    recovery: 10, // frames after active before control returns
    low: false, // hits high: beaten by standing block, goes over crouch block
    damage: 8,
    chipDamage: 2, // damage dealt when blocked; can't drop health below 1
    hitStunFrames: 14,
    blockStunFrames: 8,
    knockback: 260, // px/sec pushback on a clean hit
    chipKnockback: 80, // px/sec pushback on a blocked hit
    hitbox: { offsetY: 100, width: 45, height: 20 },
  },
};
