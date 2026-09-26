// Hitbox/hurtbox collision: a fighter's hurtbox is just its body rect; its
// hitbox only exists while its active move is in the "active" frame window.
//
// resolveAttacks() is split into a compute phase (pure reads) and an apply
// phase (mutations) so simultaneous attacks trade fairly. If we mutated as
// we went, resolving A-hits-B first could transition B out of 'attacking'
// (clearing its hitbox via that state's exit hook) before B-hits-A was even
// checked, silently cancelling one side of every trade.

import { COMBAT } from './constants.js';

const HIT_STOP_FRAMES = 8; // ticks both fighters freeze on a clean hit
const BLOCK_STOP_FRAMES = 4; // shorter freeze on a blocked hit

export function getHurtbox(f) {
  return { x: f.x - f.width / 2, y: f.y - f.height, width: f.width, height: f.height };
}

// Null when the fighter isn't mid-attack or the hitbox isn't in its active window yet/anymore.
export function getActiveHitbox(f) {
  const move = f.activeMove;
  if (!move) return null;
  if (move.projectile) return null; // the caster's body never has a hitbox for these; the spawned Projectile does

  const activeStart = move.startup;
  const activeEnd = move.startup + move.active;
  if (f.attackFrame <= activeStart || f.attackFrame > activeEnd) return null;

  const { hitbox } = move;
  const bodyEdge = f.x + f.facing * (f.width / 2);
  const x = f.facing === 1 ? bodyEdge : bodyEdge - hitbox.width;
  const y = f.y - hitbox.offsetY - hitbox.height;
  return { x, y, width: hitbox.width, height: hitbox.height };
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function isBlocking(defender, move) {
  return move.low ? defender.fsm.is('crouchBlock') : defender.fsm.is('standingBlock');
}

// Pure: figures out whether attacker's hitbox currently lands on defender,
// and whether defender is guarding correctly against it. No side effects.
function computeHit(attacker, defender) {
  if (attacker.currentAttackHasHit) return null;
  const hitbox = getActiveHitbox(attacker);
  if (!hitbox || !overlaps(hitbox, getHurtbox(defender))) return null;
  return { move: attacker.activeMove, blocked: isBlocking(defender, attacker.activeMove) };
}

function creditCombo(attacker, damage) {
  attacker.comboHitCount += 1;
  attacker.comboDamage += damage;
  attacker.comboDisplayFrames = COMBAT.COMBO_DISPLAY_FRAMES;
}

// A clean hit landing on a target already airborne from an uppercut extends
// the juggle (refreshed upward velocity) instead of grounding them into
// ordinary hit-stun — this is what makes the uppercut's launch combo-able.
// No juggle-count limiting yet; that's a future tuning knob if needed.
function applyCleanHitEffect(defender, move) {
  if (defender.fsm.is('launched')) {
    defender.vy = -COMBAT.JUGGLE_POP_VELOCITY;
    return;
  }

  switch (move.onHit) {
    case 'launch':
      defender.vy = -move.launchVelocity;
      defender.fsm.transition('launched');
      break;
    case 'knockdown':
      defender.knockdownFrames = COMBAT.KNOCKDOWN_FRAMES;
      defender.fsm.transition('knockdown');
      break;
    default:
      defender.stunFrames = move.hitStunFrames;
      defender.fsm.transition('hitStun');
  }
}

// Impact point for FX (particles/shake/sound) — roughly the defender's chest.
function impactPoint(defender) {
  return { x: defender.x, y: defender.y - defender.height / 2 };
}

// Mutates attacker (marks its swing resolved) and defender (damage, knockback, stun state).
// Returns { hitStop, event } — event carries what fx.js/audioEngine.js need
// to react (impact point, whether it was blocked, whether it should hit hard).
function applyHit(attacker, defender, { move, blocked }) {
  attacker.currentAttackHasHit = true;
  const knockback = (blocked ? move.chipKnockback : move.knockback) * attacker.facing;
  defender.vx = knockback;

  if (blocked) {
    defender.health = Math.max(1, defender.health - move.chipDamage); // chip alone can't finish a round
    defender.hitFlashFrames = 3;
    defender.stunFrames = move.blockStunFrames;
    defender.fsm.transition('blockStun');
    return { hitStop: BLOCK_STOP_FRAMES, event: { ...impactPoint(defender), blocked: true, heavy: false } };
  }

  defender.health = Math.max(0, defender.health - move.damage);
  defender.hitFlashFrames = 6;
  creditCombo(attacker, move.damage);
  applyCleanHitEffect(defender, move);

  const heavy = move.onHit === 'launch' || move.onHit === 'knockdown' || defender.health <= 0;
  return { hitStop: HIT_STOP_FRAMES, event: { ...impactPoint(defender), blocked: false, heavy } };
}

// Returns { hitStop, events }: the ticks to freeze for, and 0-2 impact
// events (both fighters can land a hit on the same tick in a trade).
export function resolveAttacks(a, b) {
  const hitOnB = computeHit(a, b);
  const hitOnA = computeHit(b, a);

  let hitStop = 0;
  const events = [];
  if (hitOnB) {
    const result = applyHit(a, b, hitOnB);
    hitStop = Math.max(hitStop, result.hitStop);
    events.push(result.event);
  }
  if (hitOnA) {
    const result = applyHit(b, a, hitOnA);
    hitStop = Math.max(hitStop, result.hitStop);
    events.push(result.event);
  }
  return { hitStop, events };
}

// Projectiles aren't a Fighter (no fsm/facing/activeMove), so they get their
// own resolve function rather than shoehorning into computeHit/applyHit.
// Returns { hitStop, event } (event is null if nothing connected this tick).
export function resolveProjectileHit(projectile, defender) {
  if (!projectile.alive) return { hitStop: 0, event: null };
  if (!overlaps(projectile.getBox(), getHurtbox(defender))) return { hitStop: 0, event: null };

  projectile.alive = false; // consumed on impact whether blocked or not
  const blocked = projectile.low ? defender.fsm.is('crouchBlock') : defender.fsm.is('standingBlock');
  defender.vx = (blocked ? projectile.chipKnockback : projectile.knockback) * Math.sign(projectile.vx || 1);

  if (blocked) {
    defender.health = Math.max(1, defender.health - projectile.chipDamage);
    defender.hitFlashFrames = 3;
    defender.stunFrames = projectile.blockStunFrames;
    defender.fsm.transition('blockStun');
    return { hitStop: BLOCK_STOP_FRAMES, event: { ...impactPoint(defender), blocked: true, heavy: false } };
  }

  defender.health = Math.max(0, defender.health - projectile.damage);
  defender.hitFlashFrames = 6;
  creditCombo(projectile.owner, projectile.damage);

  if (defender.fsm.is('launched')) {
    defender.vy = -COMBAT.JUGGLE_POP_VELOCITY;
  } else {
    defender.stunFrames = projectile.hitStunFrames;
    defender.fsm.transition('hitStun');
  }

  return { hitStop: HIT_STOP_FRAMES, event: { ...impactPoint(defender), blocked: false, heavy: defender.health <= 0 } };
}
