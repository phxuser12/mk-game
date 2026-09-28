import '../tests/helpers/domShim.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/entities/fighter.js';
import { ROSTER, POSE_NAMES } from '../src/characters/roster.js';
import { STAGE, PHYSICS, FIGHTER } from '../src/engine/constants.js';
import { blankInput } from './helpers/fakeInput.js';

// A fake character whose `punch` pose has 5 frames (matching High Punch's
// real delivered frame count — see roster.js's FRAME_COUNTS for burak) so
// the animation-duration-mapping test below exercises the exact frame count
// that originally broke (see fighter.js's updateAnimation() comment and
// VISION.md's §4 for the full story of that bug).
function fakeCharacterWithFrameCounts(counts) {
  const sprites = {};
  for (const pose of POSE_NAMES) {
    const count = counts[pose] || 2;
    sprites[pose] = Array.from({ length: count }, (_, i) => `fake/${pose}_${i}.png`);
  }
  return { name: 'TEST', color: '#fff', sprites };
}

function makeFighter(x, facing, character = ROSTER.aleks) {
  return new Fighter({ x, facing, character });
}

test('jump: fighter actually leaves the ground and returns, landing back to idle (regression: y must integrate vy, not just track it)', () => {
  const f = makeFighter(300, 1);
  const opponent = { x: 600 };
  const dt = 1 / 60;

  f.update(dt, blankInput({ jumpPressed: true }), opponent);
  assert.equal(f.fsm.current, 'jump');

  let minY = f.y;
  let landed = false;
  for (let i = 0; i < 200 && !landed; i++) {
    f.update(dt, blankInput(), opponent);
    minY = Math.min(minY, f.y);
    if (f.fsm.is('idle')) landed = true;
  }

  assert.ok(minY < STAGE.GROUND_Y - 5, `expected the fighter to visibly leave the ground, min y was ${minY}`);
  assert.ok(landed, 'fighter never returned to idle after jumping');
  assert.equal(f.y, STAGE.GROUND_Y);
  assert.equal(f.vy, 0);
});

test('crouch lowers the collision height, standing back up restores it', () => {
  const f = makeFighter(300, 1);
  const opponent = { x: 600 };
  const dt = 1 / 60;

  assert.equal(f.height, FIGHTER.STAND_HEIGHT);

  f.update(dt, blankInput({ down: true }), opponent);
  assert.equal(f.fsm.current, 'crouch');
  assert.equal(f.height, FIGHTER.CROUCH_HEIGHT);

  f.update(dt, blankInput({ down: false }), opponent);
  assert.equal(f.fsm.current, 'idle');
  assert.equal(f.height, FIGHTER.STAND_HEIGHT);
});

test('walking direction is relative to facing: toward the opponent is walkForward, away is walkBack', () => {
  const dt = 1 / 60;

  // The FSM's enter() hooks don't set vx for walk states (only update() does),
  // so the transitioning tick and the tick that actually sets vx are two
  // separate calls — same reason the jump test above needs a follow-up tick.
  const f1 = makeFighter(300, 1); // facing right
  f1.update(dt, blankInput({ right: true }), { x: 600 });
  assert.equal(f1.fsm.current, 'walkForward');
  f1.update(dt, blankInput({ right: true }), { x: 600 });
  assert.equal(f1.vx, PHYSICS.WALK_SPEED);

  const f2 = makeFighter(300, 1); // facing right
  f2.update(dt, blankInput({ left: true }), { x: 600 });
  assert.equal(f2.fsm.current, 'walkBack');
  f2.update(dt, blankInput({ left: true }), { x: 600 });
  assert.equal(f2.vx, -PHYSICS.WALK_SPEED);
});

test('facing locks during an attack and only resumes tracking the opponent once idle again', () => {
  const dt = 1 / 60;
  const f = makeFighter(300, 1);
  const opponent = { x: 400 }; // to the right: facing should already be 1

  f.update(dt, blankInput({ hpPressed: true }), opponent);
  assert.equal(f.fsm.current, 'attacking');
  assert.equal(f.facing, 1);

  opponent.x = 100; // now to the LEFT, but facing must not flip mid-swing
  f.update(dt, blankInput(), opponent);
  assert.equal(f.facing, 1, 'facing must not flip while attacking');

  // Run the swing out to completion (highPunch: startup 6 + active 4 + recovery 10 = 20 ticks).
  for (let i = 0; i < 25 && f.fsm.current !== 'idle'; i++) {
    f.update(dt, blankInput(), opponent);
  }
  assert.equal(f.fsm.current, 'idle');

  f.update(dt, blankInput(), opponent);
  assert.equal(f.facing, -1, 'facing should resume tracking the opponent once the attack ends');
});

test('regression: an attack pose with more frames than the old flat animation rate visits every frame', () => {
  // Reproduces the exact bug: a flat "N ticks per frame" rate made a 5-frame
  // move's later frames mathematically unreachable once the move's total
  // on-screen duration (startup+active+recovery) got short relative to the
  // frame count. High Punch is 20 ticks total; at the old flat rate of 10
  // ticks/frame, only frames 0-1 of a 5-frame sequence would ever show.
  const character = fakeCharacterWithFrameCounts({ punch: 5 });
  const f = makeFighter(300, 1, character);
  const opponent = { x: 600 };
  const dt = 1 / 60;

  f.update(dt, blankInput({ hpPressed: true }), opponent);
  assert.equal(f.pose, 'punch');

  const framesSeen = new Set([f.animFrame]);
  for (let i = 0; i < 25 && f.fsm.current !== 'idle'; i++) {
    f.update(dt, blankInput(), opponent);
    if (f.pose === 'punch') framesSeen.add(f.animFrame);
  }

  assert.deepEqual([...framesSeen].sort(), [0, 1, 2, 3, 4], 'every frame of the 5-frame punch should be shown at some point during the swing');
});

test('a non-attack pose (idle) still advances on the flat per-frame timer', () => {
  const f = makeFighter(300, 1); // ROSTER.aleks: 2 idle frames
  const opponent = { x: 600 };
  const dt = 1 / 60;

  assert.equal(f.animFrame, 0);
  for (let i = 0; i < 9; i++) f.update(dt, blankInput(), opponent);
  assert.equal(f.animFrame, 0, 'should not advance before ANIM_FRAME_TICKS (10) ticks have passed');

  f.update(dt, blankInput(), opponent); // 10th tick
  assert.equal(f.animFrame, 1);

  for (let i = 0; i < 10; i++) f.update(dt, blankInput(), opponent); // another 10 ticks
  assert.equal(f.animFrame, 0, 'a 2-frame pose should loop back to frame 0');
});

test('dial-a-combo: the next button during recovery cancels straight into the next hit', () => {
  const dt = 1 / 60;
  const f = makeFighter(300, 1);
  const opponent = { x: 600 };

  f.update(dt, blankInput({ hpPressed: true }), opponent); // GENERIC_COMBO[0] = highPunch
  assert.equal(f.comboIndex, 0);

  // highPunch: startup 6 + active 4 = activeEnd 10; totalFrames 20. The
  // chain-cancel window requires attackFrame > activeEnd, and attackFrame
  // increments at the TOP of attacking.update(), so 10 plain ticks bring it
  // to exactly 10; the 11th call (below) increments it to 11 before checking.
  for (let i = 0; i < 10; i++) f.update(dt, blankInput(), opponent); // attackFrame now 10

  f.update(dt, blankInput({ hpPressed: true }), opponent); // GENERIC_COMBO[1] = highPunch again
  assert.equal(f.comboIndex, 1, 'matching the combo string\'s next button should advance comboIndex');
  assert.equal(f.attackFrame, 0, 'chain-cancelling should restart attackFrame for the new hit');
  assert.equal(f.fsm.current, 'attacking');
});

test('dial-a-combo: missing the follow-up window drops the chain back to idle', () => {
  const dt = 1 / 60;
  const f = makeFighter(300, 1);
  const opponent = { x: 600 };

  f.update(dt, blankInput({ hpPressed: true }), opponent);
  assert.equal(f.comboIndex, 0);

  // Let the whole 20-tick swing elapse with no follow-up input at all.
  for (let i = 0; i < 25 && f.fsm.current !== 'idle'; i++) f.update(dt, blankInput(), opponent);

  assert.equal(f.fsm.current, 'idle');
  assert.equal(f.comboIndex, null);
});
