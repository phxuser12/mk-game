// Uppercut and sweep: "core" moves every character gets on top of their own
// normals, unlike genericMoves.js which is placeholder data that per-character
// movesets will eventually replace — these stay shared permanently. Accessed
// via crouch + High Punch (uppercut) / crouch + High Kick (sweep), the
// classic mid-90s convention for a reversal anti-air and a low sweep.

export const UNIVERSAL_MOVES = {
  uppercut: {
    startup: 10, // slow and telegraphed: whiffing this is genuinely risky
    active: 6,
    recovery: 22,
    low: false,
    damage: 16,
    chipDamage: 4,
    blockStunFrames: 12,
    knockback: 90, // horizontal push on hit
    chipKnockback: 70,
    launchVelocity: 700, // px/sec upward pop on a clean hit
    onHit: 'launch',
    hitbox: { offsetY: 0, width: 40, height: 140 }, // arcs through the whole body: low to high
    pose: 'uppercut',
  },
  sweep: {
    startup: 8,
    active: 5,
    recovery: 16,
    low: true, // only a crouch guard stops this
    damage: 12,
    chipDamage: 3,
    blockStunFrames: 9,
    knockback: 150,
    chipKnockback: 60,
    onHit: 'knockdown',
    hitbox: { offsetY: 10, width: 55, height: 18 },
    pose: 'sweep',
  },
};
