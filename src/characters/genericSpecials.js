// Shared placeholder special until real characters exist (same deal as
// genericMoves.js/genericCombo.js). Each character eventually gets 3-4 of
// these — projectile, movement special, anti-air, a signature gimmick — but
// Milestone 5 only asks for one to prove out the input-buffer system.
//
// `input` describes the motion this move needs: a short tap sequence (not a
// motion-fighter circle) plus the button that confirms it, matched against
// the fighter's MotionBuffer. `projectile: true` means the caster's own body
// never gets a hitbox for this move — combat.js spawns a traveling
// Projectile entity instead (see src/entities/projectile.js).

export const GENERIC_SPECIALS = {
  ragingBolt: {
    startup: 14, // telegraphed wind-up, same "risk if it whiffs" spirit as the uppercut
    active: 1, // single release frame; the projectile itself carries the active hitbox from here on
    recovery: 16,
    low: false,
    damage: 10,
    chipDamage: 3,
    hitStunFrames: 16,
    blockStunFrames: 10,
    knockback: 200,
    chipKnockback: 70,
    projectile: true,
    projectileSpeed: 380, // px/sec travel speed
    projectileWidth: 24,
    projectileHeight: 16,
    projectileOffsetY: 95, // spawn height above the feet, roughly chest level
    projectileLifetimeFrames: 90, // despawns after ~1.5s if it never connects
    input: { sequence: ['back', 'back', 'forward'], button: 'hpPressed', maxFrames: 18 },
    pose: 'special',
  },
};
