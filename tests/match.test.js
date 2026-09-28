import '../tests/helpers/domShim.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/entities/fighter.js';
import { ROSTER } from '../src/characters/roster.js';
import { Match, PHASE } from '../src/match/match.js';
import { MATCH } from '../src/engine/constants.js';
import { makeFakeInput } from './helpers/fakeInput.js';

const dt = 1 / 60;

function makeMatch() {
  const p1 = new Fighter({ x: 300, facing: 1, character: ROSTER.burak });
  const p2 = new Fighter({ x: 660, facing: -1, character: ROSTER.aleks });
  const match = new Match();
  match.startMatch(p1, p2);
  return { match, p1, p2, input: makeFakeInput() };
}

function tick(match, p1, p2, input, n = 1, goreEnabled = true) {
  let result;
  for (let i = 0; i < n; i++) result = match.update(dt, p1, p2, input, goreEnabled);
  return result;
}

test('startMatch begins at ROUND_INTRO with combat frozen', () => {
  const { match, p1, p2, input } = makeMatch();
  assert.equal(match.phase, PHASE.ROUND_INTRO);
  const { simulate } = match.update(dt, p1, p2, input, true);
  assert.equal(simulate, false);
});

test('ROUND_INTRO advances to FIGHT after its fixed banner duration, resetting the clock', () => {
  const { match, p1, p2, input } = makeMatch();
  // The tick where phaseTimer hits 0 still returns ROUND_INTRO's own
  // simulate:false (the switch dispatches on phase as it was entering the
  // tick) — phase is already FIGHT by then, but `simulate` catches up one
  // tick later, which is exactly why this needs a follow-up tick to observe.
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  assert.equal(match.phase, PHASE.FIGHT);
  const result = tick(match, p1, p2, input, 1);
  assert.equal(result.simulate, true);
  assert.equal(match.timeLeft, MATCH.ROUND_SECONDS - dt);
});

test('FIGHT phase ticks the round clock down each update', () => {
  const { match, p1, p2, input } = makeMatch();
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  const before = match.timeLeft;
  tick(match, p1, p2, input, 30);
  assert.ok(match.timeLeft < before);
  assert.ok(Math.abs((before - match.timeLeft) - 30 * dt) < 1e-9);
});

test('a KO ends the round immediately: winner credited, phase moves to ROUND_END', () => {
  const { match, p1, p2, input } = makeMatch();
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES); // -> FIGHT

  p2.health = 0;
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.ROUND_END);
  assert.equal(match.winnerKey, 'p1');
  assert.equal(match.roundEndReason, 'ko');
  assert.equal(match.wins.p1, 1);
});

test('time-up with unequal health awards the round to whoever has more', () => {
  const { match, p1, p2, input } = makeMatch();
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);

  p1.health = 40;
  p2.health = 60;
  match.timeLeft = 0.001; // about to expire
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.ROUND_END);
  assert.equal(match.winnerKey, 'p2');
  assert.equal(match.roundEndReason, 'timeUp');
});

test('time-up with exactly equal health is a draw: no one is credited a round win', () => {
  const { match, p1, p2, input } = makeMatch();
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);

  p1.health = 50;
  p2.health = 50;
  match.timeLeft = 0.001;
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.ROUND_END);
  assert.equal(match.winnerKey, null);
  assert.equal(match.roundEndReason, 'draw');
  assert.equal(match.wins.p1, 0);
  assert.equal(match.wins.p2, 0);
});

test('a decision win (time-up) that clinches the match still goes to ROUND_END, not a finisher window', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1; // one round away from winning the match
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);

  p1.health = 80;
  p2.health = 20;
  match.timeLeft = 0.001;
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.ROUND_END, 'only a clean KO earns a finisher shot, not a decision');
  assert.equal(match.matchOver, true);

  tick(match, p1, p2, input, MATCH.ROUND_END_FRAMES);
  assert.equal(match.phase, PHASE.MATCH_END);
});

test('after a non-clinching round ends, the next ROUND_INTRO starts and resets both fighters', () => {
  const { match, p1, p2, input } = makeMatch();
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  p2.health = 0;
  tick(match, p1, p2, input, 1); // KO -> ROUND_END, p1 leads 1-0 (not yet match point since ROUNDS_TO_WIN is 2)

  tick(match, p1, p2, input, MATCH.ROUND_END_FRAMES);

  assert.equal(match.phase, PHASE.ROUND_INTRO);
  assert.equal(match.roundNumber, 2);
  assert.equal(p1.health, 100);
  assert.equal(p2.health, 100);
});

test('a match-clinching KO opens a finisher window instead of ending the round plainly', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1;
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);

  p2.health = 0;
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.FINISHER_WINDOW);
  assert.equal(match.winnerKey, 'p1');
  assert.equal(match.wins.p1, MATCH.ROUNDS_TO_WIN);
});

test('a matching finisher input during the window triggers FINISHER_PLAYING with the right finisher', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1;
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  p2.health = 0;
  tick(match, p1, p2, input, 1); // -> FINISHER_WINDOW, winner is p1

  // Barrel Ride: up, up, then lpPressed — always available regardless of gore.
  input.byPlayer.p1 = { up: true };
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { up: false };
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { up: true };
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { lpPressed: true };
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.FINISHER_PLAYING);
  assert.equal(match.finisherToPlay.displayName, 'BARREL RIDE');
});

test('a brutal finisher input is ignored while gore is disabled', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1;
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  p2.health = 0;
  tick(match, p1, p2, input, 1);

  // Foundry End: down, down, then hkPressed — but gore is off this time.
  const goreEnabled = false;
  match.update(dt, p1, p2, input, goreEnabled);
  input.byPlayer.p1 = { down: true };
  match.update(dt, p1, p2, input, goreEnabled);
  input.byPlayer.p1 = { down: false };
  match.update(dt, p1, p2, input, goreEnabled);
  input.byPlayer.p1 = { down: true };
  match.update(dt, p1, p2, input, goreEnabled);
  input.byPlayer.p1 = { hkPressed: true };
  match.update(dt, p1, p2, input, goreEnabled);

  assert.equal(match.phase, PHASE.FINISHER_WINDOW, 'a gated brutal finisher must not trigger while gore is off');
});

test('letting the finisher window expire with no input goes straight to MATCH_END', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1;
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  p2.health = 0;
  tick(match, p1, p2, input, 1); // -> FINISHER_WINDOW

  tick(match, p1, p2, input, MATCH.FINISHER_WINDOW_FRAMES);
  assert.equal(match.phase, PHASE.MATCH_END);
});

test('FINISHER_PLAYING ends into MATCH_END after its fixed duration', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1;
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  p2.health = 0;
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { up: true };
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { up: false };
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { up: true };
  tick(match, p1, p2, input, 1);
  input.byPlayer.p1 = { lpPressed: true };
  tick(match, p1, p2, input, 1);
  assert.equal(match.phase, PHASE.FINISHER_PLAYING);

  input.byPlayer.p1 = {};
  tick(match, p1, p2, input, MATCH.FINISHER_PLAY_FRAMES);
  assert.equal(match.phase, PHASE.MATCH_END);
});

test('at MATCH_END, either player pressing High Punch starts a fresh rematch', () => {
  const { match, p1, p2, input } = makeMatch();
  match.wins.p1 = MATCH.ROUNDS_TO_WIN - 1;
  tick(match, p1, p2, input, MATCH.ROUND_INTRO_FRAMES);
  p2.health = 0;
  tick(match, p1, p2, input, 1); // FINISHER_WINDOW
  tick(match, p1, p2, input, MATCH.FINISHER_WINDOW_FRAMES); // expires -> MATCH_END
  assert.equal(match.phase, PHASE.MATCH_END);

  input.byPlayer.p2 = { hpPressed: true };
  tick(match, p1, p2, input, 1);

  assert.equal(match.phase, PHASE.ROUND_INTRO);
  assert.equal(match.roundNumber, 1);
  assert.equal(match.wins.p1, 0);
  assert.equal(match.wins.p2, 0);
});
