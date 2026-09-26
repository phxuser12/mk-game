// Shared placeholder moveset used by both fighters until distinct characters
// exist (Milestone 5+ splits this into per-character frame data + sprite
// refs). Frame counts are in ticks at the engine's fixed 60fps, matching
// classic fighting-game frame-data notation. Expect heavy re-tuning.
//
// hitbox offsets are measured from the fighter's feet (fighter.y): offsetY
// is the distance up from the feet to the BOTTOM of the box.

// "High"/"Low" in the button names is the classic strength/speed archetype
// (High = stronger & slower, Low = weaker & faster) — separate from `low`,
// which is the hit-level property that decides which guard stops it. Low
// Kick doubles as this moveset's one low-hitting normal (a leg strike);
// the other three all hit high.

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
  lowPunch: {
    startup: 3,
    active: 3,
    recovery: 6,
    low: false,
    damage: 4,
    chipDamage: 1,
    hitStunFrames: 8,
    blockStunFrames: 5,
    knockback: 140,
    chipKnockback: 50,
    hitbox: { offsetY: 95, width: 35, height: 18 },
  },
  highKick: {
    startup: 9,
    active: 4,
    recovery: 14,
    low: false,
    damage: 11,
    chipDamage: 3,
    hitStunFrames: 18,
    blockStunFrames: 10,
    knockback: 300,
    chipKnockback: 90,
    hitbox: { offsetY: 110, width: 55, height: 22 },
  },
  lowKick: {
    startup: 5,
    active: 3,
    recovery: 9,
    low: true, // only a crouch guard stops this one
    damage: 6,
    chipDamage: 2,
    hitStunFrames: 11,
    blockStunFrames: 7,
    knockback: 180,
    chipKnockback: 60,
    hitbox: { offsetY: 20, width: 50, height: 18 },
  },
};
