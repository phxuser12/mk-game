import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveOverlap } from '../src/engine/collision.js';
import { STAGE } from '../src/engine/constants.js';

function fighter(x, width = 60) {
  return { x, width };
}

test('resolveOverlap pushes two overlapping fighters apart symmetrically when equal width', () => {
  const a = fighter(500);
  const b = fighter(520); // 20px apart, but minGap is (60+60)/2 = 60, so they overlap by 40
  resolveOverlap(a, b);

  const gap = b.x - a.x;
  assert.ok(gap >= 60 - 1e-9, `expected fighters at least 60px apart, got ${gap}`);
  // Pushed apart symmetrically: each moves by the same amount from its start.
  assert.ok(Math.abs((500 - a.x) - (b.x - 520)) < 1e-9);
});

test('resolveOverlap leaves non-overlapping fighters alone (aside from wall clamping)', () => {
  const a = fighter(400);
  const b = fighter(600);
  resolveOverlap(a, b);
  assert.equal(a.x, 400);
  assert.equal(b.x, 600);
});

test('resolveOverlap clamps both fighters to the stage walls', () => {
  const a = fighter(STAGE.LEFT_WALL - 50);
  const b = fighter(STAGE.LEFT_WALL - 20);
  resolveOverlap(a, b);
  assert.ok(a.x >= STAGE.LEFT_WALL + a.width / 2 - 1e-9);
  assert.ok(b.x >= STAGE.LEFT_WALL + b.width / 2 - 1e-9);

  const c = fighter(STAGE.RIGHT_WALL + 50);
  const d = fighter(STAGE.RIGHT_WALL + 20);
  resolveOverlap(c, d);
  assert.ok(c.x <= STAGE.RIGHT_WALL - c.width / 2 + 1e-9);
  assert.ok(d.x <= STAGE.RIGHT_WALL - d.width / 2 + 1e-9);
});

test('resolveOverlap pushes based on relative position, not array order', () => {
  // b is to the LEFT of a here; the push direction must follow dx, not argument order.
  const a = fighter(520);
  const b = fighter(500);
  resolveOverlap(a, b);
  assert.ok(a.x > 520, 'a should be pushed further right (away from b)');
  assert.ok(b.x < 500, 'b should be pushed further left (away from a)');
});
