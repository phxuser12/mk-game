// Hitbox/hurtbox collision: a fighter's hurtbox is just its body rect; its
// hitbox only exists while its active move is in the "active" frame window.
// resolveAttacks() is called once per tick and checks both directions, so
// simultaneous attacks can trade.

const HIT_STOP_FRAMES = 8; // ticks both fighters freeze for on a landed hit, for impact feel

export function getHurtbox(f) {
  return { x: f.x - f.width / 2, y: f.y - f.height, width: f.width, height: f.height };
}

// Null when the fighter isn't mid-attack or the hitbox isn't in its active window yet/anymore.
export function getActiveHitbox(f) {
  const move = f.activeMove;
  if (!move) return null;

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

// Returns the number of hit-stop ticks to apply this frame (0 if nothing landed).
export function resolveAttacks(a, b) {
  return Math.max(resolveOneWay(a, b), resolveOneWay(b, a));
}

function resolveOneWay(attacker, defender) {
  if (attacker.currentAttackHasHit) return 0; // one hit per swing, even across several active frames

  const hitbox = getActiveHitbox(attacker);
  if (!hitbox || !overlaps(hitbox, getHurtbox(defender))) return 0;

  defender.health = Math.max(0, defender.health - attacker.activeMove.damage);
  defender.hitFlashFrames = 6;
  attacker.currentAttackHasHit = true;
  return HIT_STOP_FRAMES;
}
