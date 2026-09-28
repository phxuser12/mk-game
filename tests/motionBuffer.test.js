import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MotionBuffer, computeMotionDir } from '../src/engine/motionBuffer.js';

test('computeMotionDir: down and up take priority over left/right', () => {
  assert.equal(computeMotionDir({ down: true, up: true, left: true, right: false }, 1), 'down');
  assert.equal(computeMotionDir({ down: false, up: true, left: true, right: false }, 1), 'up');
});

test('computeMotionDir: horizontal is relative to facing (forward/back), not absolute left/right', () => {
  // Facing right (1): moving right is forward, left is back.
  assert.equal(computeMotionDir({ left: false, right: true }, 1), 'forward');
  assert.equal(computeMotionDir({ left: true, right: false }, 1), 'back');
  // Facing left (-1): the same raw inputs flip meaning.
  assert.equal(computeMotionDir({ left: false, right: true }, -1), 'back');
  assert.equal(computeMotionDir({ left: true, right: false }, -1), 'forward');
});

test('computeMotionDir: no relevant keys held is neutral', () => {
  assert.equal(computeMotionDir({ left: false, right: false, up: false, down: false }, 1), 'neutral');
  // Left+right cancel out to the same raw 0 as nothing held.
  assert.equal(computeMotionDir({ left: true, right: true, up: false, down: false }, 1), 'neutral');
});

test('MotionBuffer.update only records on a direction CHANGE, not every tick', () => {
  const buf = new MotionBuffer();
  buf.update('back');
  buf.update('back');
  buf.update('back');
  assert.equal(buf.history.length, 1, 'holding the same direction should not spam history entries');
});

test('MotionBuffer.matches: exact recent sequence within the frame window matches', () => {
  const buf = new MotionBuffer();
  buf.update('back');
  buf.update('back'); // held, no new entry
  buf.update('neutral');
  buf.update('back');
  buf.update('neutral');
  buf.update('forward');

  assert.equal(buf.matches(['back', 'back', 'forward'], 18), true);
});

test('MotionBuffer.matches: wrong order does not match', () => {
  const buf = new MotionBuffer();
  buf.update('forward');
  buf.update('neutral');
  buf.update('back');
  buf.update('neutral');
  buf.update('back');

  assert.equal(buf.matches(['back', 'back', 'forward'], 18), false);
});

test('MotionBuffer.matches: too few directional taps does not match', () => {
  const buf = new MotionBuffer();
  buf.update('back');
  buf.update('neutral');
  buf.update('forward');

  assert.equal(buf.matches(['back', 'back', 'forward'], 18), false);
});

test('MotionBuffer.matches: sequence that happened too long ago fails the frame-window check', () => {
  const buf = new MotionBuffer();
  buf.update('back'); // tick 1
  buf.update('neutral'); // tick 2
  buf.update('back'); // tick 3
  buf.update('neutral'); // tick 4
  buf.update('forward'); // tick 5 — completes the pattern, tick span so far = 5-1 = 4

  // Advance many neutral ticks (no new history entries, but buf.tick keeps climbing).
  for (let i = 0; i < 20; i++) buf.update('neutral');

  assert.equal(buf.matches(['back', 'back', 'forward'], 18), false);
});

test('MotionBuffer.matches: exact-boundary frame window still counts (<=, not <)', () => {
  const buf = new MotionBuffer();
  buf.update('back'); // tick 1
  buf.update('neutral');
  buf.update('back');
  buf.update('neutral');
  buf.update('forward'); // tick 5

  // tick - tail[0].tick must be <= maxFrames; tail[0].tick is 1 here.
  for (let i = 0; i < 12; i++) buf.update('neutral'); // brings current tick to 17
  assert.equal(buf.matches(['back', 'back', 'forward'], 16), true); // 17-1=16, exactly at the limit
  buf.update('neutral'); // tick 18, span becomes 17
  assert.equal(buf.matches(['back', 'back', 'forward'], 16), false);
});
