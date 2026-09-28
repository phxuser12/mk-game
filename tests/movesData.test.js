import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENERIC_MOVES } from '../src/characters/genericMoves.js';
import { UNIVERSAL_MOVES } from '../src/engine/universalMoves.js';
import { GENERIC_SPECIALS } from '../src/characters/genericSpecials.js';
import { GENERIC_FINISHERS } from '../src/characters/genericFinishers.js';
import { GENERIC_COMBO } from '../src/characters/genericCombo.js';
import { POSE_NAMES } from '../src/characters/roster.js';

const ALL_MOVES = { ...GENERIC_MOVES, ...UNIVERSAL_MOVES, ...GENERIC_SPECIALS };
const VALID_DIRS = new Set(['back', 'forward', 'up', 'down']);
const VALID_BUTTONS = new Set(['hpPressed', 'lpPressed', 'hkPressed', 'lkPressed']);

// A typo here (e.g. a move's `pose` not matching a real roster pose, or a
// negative frame count) wouldn't crash anything loudly — it would just
// silently misrender or never activate. This test exists to catch exactly
// that class of mistake at test time instead of in play.
test('every attack move (normals + universal + specials) has sane, complete frame data', () => {
  for (const [key, move] of Object.entries(ALL_MOVES)) {
    assert.ok(Number.isInteger(move.startup) && move.startup >= 0, `${key}.startup`);
    assert.ok(Number.isInteger(move.active) && move.active >= 1, `${key}.active`);
    assert.ok(Number.isInteger(move.recovery) && move.recovery >= 0, `${key}.recovery`);
    assert.equal(typeof move.low, 'boolean', `${key}.low`);
    assert.ok(Number.isFinite(move.damage) && move.damage >= 0, `${key}.damage`);
    assert.ok(Number.isFinite(move.chipDamage) && move.chipDamage >= 0, `${key}.chipDamage`);
    assert.ok(Number.isFinite(move.blockStunFrames) && move.blockStunFrames >= 0, `${key}.blockStunFrames`);
    assert.ok(Number.isFinite(move.knockback), `${key}.knockback`);
    assert.ok(Number.isFinite(move.chipKnockback), `${key}.chipKnockback`);
    assert.ok(POSE_NAMES.includes(move.pose), `${key}.pose "${move.pose}" is not a real pose in roster.js`);

    if (move.projectile) {
      assert.ok(Number.isFinite(move.projectileSpeed) && move.projectileSpeed > 0, `${key}.projectileSpeed`);
      assert.ok(Number.isFinite(move.projectileWidth) && move.projectileWidth > 0, `${key}.projectileWidth`);
      assert.ok(Number.isFinite(move.projectileHeight) && move.projectileHeight > 0, `${key}.projectileHeight`);
      assert.ok(Number.isFinite(move.projectileLifetimeFrames) && move.projectileLifetimeFrames > 0, `${key}.projectileLifetimeFrames`);
    } else {
      assert.ok(move.hitbox, `${key}.hitbox`);
      assert.ok(Number.isFinite(move.hitbox.width) && move.hitbox.width > 0, `${key}.hitbox.width`);
      assert.ok(Number.isFinite(move.hitbox.height) && move.hitbox.height > 0, `${key}.hitbox.height`);
    }

    // Either a plain hit-stun value (grounded normals) or an onHit effect
    // (launch/knockdown, from universalMoves.js) — never neither.
    assert.ok(
      Number.isFinite(move.hitStunFrames) || move.onHit === 'launch' || move.onHit === 'knockdown',
      `${key} needs either hitStunFrames or an onHit launch/knockdown effect`
    );
  }
});

test('specials and finishers only use recognized motion directions and buttons', () => {
  const inputsByKey = {
    ...Object.fromEntries(Object.entries(GENERIC_SPECIALS).map(([k, m]) => [k, m.input])),
    ...Object.fromEntries(Object.entries(GENERIC_FINISHERS).map(([k, f]) => [k, f.input])),
  };
  for (const [key, input] of Object.entries(inputsByKey)) {
    assert.ok(Array.isArray(input.sequence) && input.sequence.length > 0, `${key}.input.sequence`);
    for (const dir of input.sequence) {
      assert.ok(VALID_DIRS.has(dir), `${key}.input.sequence has an invalid direction "${dir}"`);
    }
    assert.ok(VALID_BUTTONS.has(input.button), `${key}.input.button "${input.button}" is not a recognized *Pressed flag`);
    assert.ok(Number.isInteger(input.maxFrames) && input.maxFrames > 0, `${key}.input.maxFrames`);
  }
});

test('finishers declare a real "brutal" or "nonviolent" type and a display name', () => {
  for (const [key, finisher] of Object.entries(GENERIC_FINISHERS)) {
    assert.ok(['brutal', 'nonviolent'].includes(finisher.type), `${key}.type`);
    assert.ok(typeof finisher.displayName === 'string' && finisher.displayName.length > 0, `${key}.displayName`);
  }
});

test('the dial-a-combo string only references real move keys', () => {
  assert.ok(GENERIC_COMBO.length >= 2, 'a combo string needs at least 2 moves to mean anything');
  for (const key of GENERIC_COMBO) {
    assert.ok(key in GENERIC_MOVES, `GENERIC_COMBO references "${key}", which is not in GENERIC_MOVES`);
  }
});
