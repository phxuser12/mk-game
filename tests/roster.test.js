import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, POSE_NAMES } from '../src/characters/roster.js';

const DEFAULT_FRAME_COUNT = 2;

// Burak's real-art frame counts (src/characters/roster.js's FRAME_COUNTS) —
// duplicated here deliberately: this asserts the roster wires up the exact
// counts on disk (see assets/sprites/burak/), not just "some" counts, so a
// stray edit to FRAME_COUNTS that drifts from the actual delivered art gets
// caught immediately instead of surfacing later as blank/missing frames.
const EXPECTED_BURAK_COUNTS = {
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
};

test('every roster character has an entry for every pose in POSE_NAMES', () => {
  for (const character of Object.values(ROSTER)) {
    for (const pose of POSE_NAMES) {
      assert.ok(Array.isArray(character.sprites[pose]), `${character.name} is missing sprites for pose "${pose}"`);
    }
  }
});

test('burak has the expected real-art frame count per pose', () => {
  for (const pose of POSE_NAMES) {
    assert.equal(
      ROSTER.burak.sprites[pose].length,
      EXPECTED_BURAK_COUNTS[pose],
      `burak/${pose} frame count drifted from what's actually on disk`
    );
  }
});

test('aleks (no real art yet) defaults to 2 procedural-placeholder frames per pose', () => {
  for (const pose of POSE_NAMES) {
    assert.equal(ROSTER.aleks.sprites[pose].length, DEFAULT_FRAME_COUNT);
  }
});

test('sprite paths are zero-indexed, contiguous, and follow the <character>/<pose>_<i>.png convention', () => {
  for (const [key, character] of Object.entries(ROSTER)) {
    for (const pose of POSE_NAMES) {
      character.sprites[pose].forEach((path, i) => {
        assert.equal(path, `assets/sprites/${key}/${pose}_${i}.png`);
      });
    }
  }
});

test('every character has a display name and a fallback color', () => {
  for (const character of Object.values(ROSTER)) {
    assert.equal(typeof character.name, 'string');
    assert.ok(character.name.length > 0);
    assert.match(character.color, /^#[0-9a-fA-F]{6}$/);
  }
});
