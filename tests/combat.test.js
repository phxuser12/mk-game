import '../tests/helpers/domShim.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/entities/fighter.js';
import { Projectile } from '../src/entities/projectile.js';
import { ROSTER } from '../src/characters/roster.js';
import { getActiveHitbox, resolveAttacks, resolveProjectileHit } from '../src/engine/combat.js';
import { GENERIC_MOVES } from '../src/characters/genericMoves.js';
import { GENERIC_SPECIALS } from '../src/characters/genericSpecials.js';
import { COMBAT } from '../src/engine/constants.js';
import { blankInput } from './helpers/fakeInput.js';

const dt = 1 / 60;
const HIGH_PUNCH = GENERIC_MOVES.highPunch; // startup 6, active 4 (activeEnd 10), recovery 10

function makePair({ attackerX = 300, defenderX = 350 } = {}) {
  const attacker = new Fighter({ x: attackerX, facing: 1, character: ROSTER.burak });
  const defender = new Fighter({ x: defenderX, facing: -1, character: ROSTER.aleks });
  return { attacker, defender };
}

// Drives `attacker` through a move via real input/FSM ticks (rather than
// poking activeMove directly) so this stays honest to how the game actually
// reaches an active hitbox, and runs resolveAttacks(a, b) every tick,
// stopping the moment it sees a hit event (or once the move's active window
// has clearly closed, to avoid an infinite loop on a broken hitbox).
//
// `defenderInput` is re-applied every tick (not just once) because block
// states re-check their guard condition every update() and fall back to
// idle the instant `block` isn't held — a defender set up via
// fsm.transition('standingBlock') and then ticked with blank input would
// drop out of block on its very first tick.
function runUntilHitEvent(attacker, defender, triggerInput, defenderInput = {}) {
  attacker.update(dt, blankInput(triggerInput), defender);
  for (let i = 0; i < 30; i++) {
    defender.update(dt, blankInput(defenderInput), attacker);
    const { hitStop, events } = resolveAttacks(attacker, defender);
    if (events.length > 0) return { hitStop, events, ticks: i + 1 };
    attacker.update(dt, blankInput(), defender);
  }
  return { hitStop: 0, events: [], ticks: -1 };
}

test('getActiveHitbox is null outside the move\'s active window and non-null inside it', () => {
  const { attacker, defender } = makePair();
  attacker.update(dt, blankInput({ hpPressed: true }), defender); // attackFrame 0 (just entered)
  assert.equal(getActiveHitbox(attacker), null, 'no hitbox during startup');

  for (let i = 0; i < 6; i++) attacker.update(dt, blankInput(), defender); // attackFrame -> 6 (== startup, still inactive: check is `<= activeStart`)
  assert.equal(getActiveHitbox(attacker), null, 'still inactive exactly at the startup boundary');

  attacker.update(dt, blankInput(), defender); // attackFrame 7: inside (startup, startup+active]
  assert.ok(getActiveHitbox(attacker), 'hitbox should exist once the active window opens');

  for (let i = 0; i < 10; i++) attacker.update(dt, blankInput(), defender); // well past active into/through recovery
  assert.equal(getActiveHitbox(attacker), null, 'no hitbox once the active window has closed');
});

test('a clean hit lands: damage, combo credit, hit-stun, and facing-correct knockback', () => {
  const { attacker, defender } = makePair();
  const startHealth = defender.health;

  const { hitStop, events } = runUntilHitEvent(attacker, defender, { hpPressed: true });

  assert.equal(events.length, 1);
  const [event] = events;
  assert.equal(event.blocked, false);
  assert.equal(hitStop, 8); // HIT_STOP_FRAMES
  assert.equal(defender.health, startHealth - HIGH_PUNCH.damage);
  assert.equal(defender.fsm.current, 'hitStun');
  assert.equal(defender.vx, HIGH_PUNCH.knockback * attacker.facing);
  assert.equal(attacker.currentAttackHasHit, true);
  assert.equal(attacker.comboHitCount, 1);
  assert.equal(attacker.comboDamage, HIGH_PUNCH.damage);
});

test('a swing that already landed cannot hit twice (currentAttackHasHit guards it)', () => {
  const { attacker, defender } = makePair();
  const { events } = runUntilHitEvent(attacker, defender, { hpPressed: true });
  assert.equal(events.length, 1);
  const healthAfterFirstHit = defender.health;

  // Defender is now in hitStun a few feet away; keep both fighters ticking
  // and resolving for a few more frames — the same swing must not connect again.
  for (let i = 0; i < 5; i++) {
    attacker.update(dt, blankInput(), defender);
    defender.update(dt, blankInput(), attacker);
    resolveAttacks(attacker, defender);
  }
  assert.equal(defender.health, healthAfterFirstHit);
});

test('a high-hitting move is stopped by standing block: chip damage, floors at 1hp, block-stun', () => {
  const { attacker, defender } = makePair();
  defender.health = 5;
  defender.fsm.transition('standingBlock'); // bypass input plumbing; test the resolution logic directly

  const { hitStop, events } = runUntilHitEvent(attacker, defender, { hpPressed: true }, { block: true });

  assert.equal(events.length, 1);
  assert.equal(events[0].blocked, true);
  assert.equal(hitStop, 4); // BLOCK_STOP_FRAMES
  assert.equal(defender.health, 5 - HIGH_PUNCH.chipDamage);
  assert.equal(defender.fsm.current, 'blockStun');
});

test('chip damage can never drop a blocking defender below 1hp', () => {
  const { attacker, defender } = makePair();
  defender.health = 1;
  defender.fsm.transition('standingBlock');

  const { events } = runUntilHitEvent(attacker, defender, { hpPressed: true }, { block: true });
  assert.equal(events[0].blocked, true);
  assert.equal(defender.health, 1);
});

test('a low move beats standing block but is stopped by crouch block', () => {
  const lowKick = GENERIC_MOVES.lowKick;
  assert.equal(lowKick.low, true);

  const standing = makePair();
  standing.defender.fsm.transition('standingBlock');
  const standingResult = runUntilHitEvent(standing.attacker, standing.defender, { lkPressed: true }, { block: true });
  assert.equal(standingResult.events[0].blocked, false, 'standing block should NOT stop a low attack');

  const crouching = makePair();
  crouching.defender.fsm.transition('crouchBlock');
  const crouchResult = runUntilHitEvent(crouching.attacker, crouching.defender, { lkPressed: true }, { block: true, down: true });
  assert.equal(crouchResult.events[0].blocked, true, 'crouch block should stop a low attack');
});

test('a follow-up clean hit on an already-launched target refreshes the juggle instead of re-grounding them', () => {
  const { attacker, defender } = makePair();
  defender.fsm.transition('launched'); // simulate mid-juggle, already airborne from an earlier uppercut
  defender.vy = -700; // realistic launch velocity (UNIVERSAL_MOVES.uppercut.launchVelocity) — plenty of air time

  runUntilHitEvent(attacker, defender, { hpPressed: true });

  assert.equal(defender.fsm.current, 'launched', 'should stay launched, not fall into hitStun/knockdown');
  assert.equal(defender.vy, -COMBAT.JUGGLE_POP_VELOCITY);
});

test('regression: simultaneous mutual hits both register (compute-before-apply fairness)', () => {
  // The Milestone 3 bug: resolving A-hits-B first could transition B out of
  // 'attacking' (clearing B's hitbox via that state's exit hook) before
  // B-hits-A was even checked, silently cancelling one side of the trade.
  // Facing each other with both mid-active-window and overlapping reach
  // reproduces exactly that scenario.
  const a = new Fighter({ x: 300, facing: 1, character: ROSTER.burak });
  const b = new Fighter({ x: 340, facing: -1, character: ROSTER.aleks }); // close enough for both hitboxes to reach

  a.update(dt, blankInput({ hpPressed: true }), b);
  b.update(dt, blankInput({ hpPressed: true }), a);

  let events = [];
  for (let i = 0; i < 30 && events.length < 2; i++) {
    const result = resolveAttacks(a, b);
    events = events.concat(result.events);
    if (events.length >= 2) break;
    a.update(dt, blankInput(), b);
    b.update(dt, blankInput(), a);
  }

  assert.equal(events.length, 2, 'both attackers should land their hit in the same trade');
  assert.equal(a.currentAttackHasHit, true);
  assert.equal(b.currentAttackHasHit, true);
  assert.ok(a.health < 100 && b.health < 100, 'both fighters should have taken damage');
});

function makeProjectile(owner, overrides = {}) {
  return new Projectile({
    move: GENERIC_SPECIALS.ragingBolt,
    x: owner.x,
    y: owner.y,
    facing: owner.facing,
    owner,
    ...overrides,
  });
}

test('resolveProjectileHit: a clean hit damages the defender and consumes the projectile', () => {
  const { attacker, defender } = makePair({ attackerX: 300, defenderX: 340 });
  const proj = makeProjectile(attacker);
  const startHealth = defender.health;

  const { hitStop, event } = resolveProjectileHit(proj, defender);

  assert.ok(event && event.blocked === false);
  assert.equal(hitStop, 8);
  assert.equal(proj.alive, false);
  assert.equal(defender.health, startHealth - GENERIC_SPECIALS.ragingBolt.damage);
  assert.equal(defender.fsm.current, 'hitStun');
});

test('resolveProjectileHit: a blocked hit chips damage and does not knock the defender out of block', () => {
  const { attacker, defender } = makePair({ attackerX: 300, defenderX: 340 });
  defender.fsm.transition('standingBlock');
  defender.health = 5;
  const proj = makeProjectile(attacker);

  const { event } = resolveProjectileHit(proj, defender);

  assert.equal(event.blocked, true);
  assert.equal(defender.health, 5 - GENERIC_SPECIALS.ragingBolt.chipDamage);
  assert.equal(defender.fsm.current, 'blockStun');
});

test('resolveProjectileHit: nothing happens once the projectile is already dead', () => {
  const { attacker, defender } = makePair({ attackerX: 300, defenderX: 340 });
  const proj = makeProjectile(attacker);
  proj.alive = false;

  const { hitStop, event } = resolveProjectileHit(proj, defender);
  assert.equal(hitStop, 0);
  assert.equal(event, null);
  assert.equal(defender.health, 100);
});
