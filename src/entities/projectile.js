import { STAGE } from '../engine/constants.js';

// A traveling hitbox independent of its owner's body — spawned by
// combat.js/main.js when a projectile-flagged special reaches its active
// frame. Carries its own copy of the relevant move stats so combat.js's
// resolveProjectileHit doesn't need to reach back into move data.
export class Projectile {
  constructor({ move, x, y, facing, owner }) {
    this.owner = owner;
    this.facing = facing;
    this.vx = move.projectileSpeed * facing;
    this.x = x;
    this.y = y - move.projectileOffsetY - move.projectileHeight / 2; // constant height; travels in a straight line
    this.width = move.projectileWidth;
    this.height = move.projectileHeight;
    this.lifetime = move.projectileLifetimeFrames;

    this.low = move.low;
    this.damage = move.damage;
    this.chipDamage = move.chipDamage;
    this.hitStunFrames = move.hitStunFrames;
    this.blockStunFrames = move.blockStunFrames;
    this.knockback = move.knockback;
    this.chipKnockback = move.chipKnockback;

    this.alive = true;
  }

  getBox() {
    return { x: this.x - this.width / 2, y: this.y - this.height / 2, width: this.width, height: this.height };
  }

  update(dt) {
    this.x += this.vx * dt;
    this.lifetime -= 1;
    if (this.lifetime <= 0) this.alive = false;
    if (this.x < STAGE.LEFT_WALL - 40 || this.x > STAGE.RIGHT_WALL + 40) this.alive = false;
  }

  draw(ctx) {
    const box = this.getBox();
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(box.x, box.y, box.width, box.height);
  }
}
