import { StateMachine } from '../engine/stateMachine.js';
import { STAGE, FIGHTER } from '../engine/constants.js';
import { clamp } from '../engine/utils.js';
import { MotionBuffer, computeMotionDir } from '../engine/motionBuffer.js';
import { fighterStates } from './fighterStates.js';

export class Fighter {
  constructor({ x, facing, color, label }) {
    this.x = x;
    this.y = STAGE.GROUND_Y; // feet position; only the jump state moves this
    this.vx = 0;
    this.vy = 0;
    this.facing = facing; // 1 = facing right, -1 = facing left
    this.color = color;
    this.label = label;
    this.width = FIGHTER.STAND_WIDTH;
    this.height = FIGHTER.STAND_HEIGHT;

    this.health = 100;
    this.hitFlashFrames = 0; // ticks remaining on the white "just got hit" flash
    this.activeMove = null; // set while attacking; read by combat.js for hitbox data
    this.attackFrame = 0;
    this.currentAttackHasHit = false;
    this.runFrame = 0;
    this.stunFrames = 0; // ticks remaining in hitStun/blockStun, set by combat.js
    this.knockdownFrames = 0;
    this.gettingUpFrames = 0;

    this.pendingMoveKey = null; // which move 'attacking'.enter() should start, set by the caller before transitioning
    this.comboIndex = null; // position in the combo string while chaining, or null outside a chain attempt
    this.comboHitCount = 0;
    this.comboDamage = 0;
    this.comboDisplayFrames = 0; // ticks left to show the combo counter UI after the last hit

    this.projectileSpawned = false; // guards a projectile move from spawning more than once per swing
    this.pendingProjectile = null; // set by fighterStates.js; main.js reads it, spawns a Projectile, and clears it
    this.motionBuffer = new MotionBuffer(); // recent directional taps, checked against special-move input patterns

    this.fsm = new StateMachine(this, fighterStates, 'idle');
  }

  get isCrouching() {
    return this.fsm.is('crouch');
  }

  get isAirborne() {
    return this.fsm.is('jump');
  }

  get isAttacking() {
    return this.fsm.is('attacking');
  }

  // Fighters always turn to face each other, except mid-attack: classic
  // fighters lock facing once a swing starts so it can't be redirected.
  updateFacing(opponent) {
    if (this.isAttacking) return;
    this.facing = opponent.x >= this.x ? 1 : -1;
  }

  update(dt, input, opponent) {
    this.updateFacing(opponent);
    this.motionBuffer.update(computeMotionDir(input, this.facing));
    this.fsm.update(dt, input);

    if (this.isCrouching) this.height = FIGHTER.CROUCH_HEIGHT;
    else if (this.fsm.is('knockdown')) this.height = FIGHTER.KNOCKDOWN_HEIGHT;
    else this.height = FIGHTER.STAND_HEIGHT;

    this.x += this.vx * dt;
    this.x = clamp(this.x, STAGE.LEFT_WALL + this.width / 2, STAGE.RIGHT_WALL - this.width / 2);

    if (this.hitFlashFrames > 0) this.hitFlashFrames -= 1;
    if (this.comboDisplayFrames > 0) this.comboDisplayFrames -= 1;
  }

  draw(ctx) {
    const top = this.y - this.height;

    ctx.fillStyle = this.hitFlashFrames > 0 ? '#ffffff' : this.color;
    ctx.fillRect(this.x - this.width / 2, top, this.width, this.height);

    // Nose triangle so facing direction reads clearly on a plain box.
    ctx.fillStyle = '#fff';
    const noseX = this.x + this.facing * (this.width / 2);
    ctx.beginPath();
    ctx.moveTo(noseX, top + 20);
    ctx.lineTo(noseX - this.facing * 14, top + 12);
    ctx.lineTo(noseX - this.facing * 14, top + 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.label} [${this.fsm.current}]`, this.x, top - 8);
  }
}
