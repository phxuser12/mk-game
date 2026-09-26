import { StateMachine } from '../engine/stateMachine.js';
import { STAGE, FIGHTER } from '../engine/constants.js';
import { clamp } from '../engine/utils.js';
import { MotionBuffer, computeMotionDir } from '../engine/motionBuffer.js';
import { fighterStates } from './fighterStates.js';

// Sprites are authored on a wider/taller canvas (150x195) than the original
// 90x180 so swung limbs and raised heads (punch/kick/sweep/jump/etc.) have
// room without clipping. These are that canvas's dimensions scaled down by
// the same ratio the original 90x180 art used to map onto the fighter's
// collision box (60x140), so the character's actual body renders at the
// same apparent size — the extra canvas space is just margin, not zoom.
const SPRITE_FRAME_WIDTH = 100;
const SPRITE_FRAME_HEIGHT = 152;

// Maps fsm state (+ active move, while attacking) to a sprite pose key.
// Falls back to 'idle' for states with no dedicated pose yet (block stances,
// running reuses the walk-forward art).
function poseKeyFor(fighter) {
  switch (fighter.fsm.current) {
    case 'walkForward':
    case 'running':
      return 'walkForward';
    case 'walkBack':
      return 'walkBack';
    case 'jump':
      return 'jump';
    case 'crouch':
    case 'crouchBlock':
      return 'crouch';
    case 'attacking':
      return (fighter.activeMove && fighter.activeMove.pose) || 'punch';
    case 'hitStun':
    case 'blockStun':
      return 'hitStun';
    case 'launched':
      return 'launched';
    case 'knockdown':
    case 'gettingUp':
      return 'knockdown';
    default:
      return 'idle';
  }
}

export class Fighter {
  constructor({ x, facing, character }) {
    this.color = character.color; // fallback fill until a sprite finishes loading
    this.label = character.name;
    this.sprites = {};
    for (const [pose, path] of Object.entries(character.sprites)) {
      const image = new Image();
      image.src = path;
      this.sprites[pose] = image;
    }
    this.fsm = new StateMachine(this, fighterStates, 'idle'); // must exist before reset() calls fsm.transition
    this.reset(x, facing);
  }

  // Reinitializes everything mutable for a fresh round, keeping the same
  // object (color/label/fsm stay put) so main.js never has to re-wire
  // references. Called once at construction and again by Match between rounds.
  reset(x, facing) {
    this.x = x;
    this.y = STAGE.GROUND_Y; // feet position; only the jump state moves this
    this.vx = 0;
    this.vy = 0;
    this.facing = facing; // 1 = facing right, -1 = facing left
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
    this.activationSoundFired = false; // guards justBecameActive from firing more than once per swing
    this.justBecameActive = false; // set by fighterStates.js; main.js reads it to play the whiff/special sound, and clears it
    this.motionBuffer = new MotionBuffer(); // recent directional taps, checked against special-move input patterns

    this.fsm.transition('idle');
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
    const left = this.x - this.width / 2;

    this.drawBody(ctx, left, top);

    // Nose triangle so facing direction reads clearly even on roughly
    // symmetric placeholder art.
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

  // Picks the sprite for the current state/move and draws it at a FIXED
  // frame size, feet-anchored at this.y — unlike the collision hurtbox
  // (this.height), which still shrinks for crouch/knockdown for gameplay
  // purposes. The pose art itself shows the crouched/lying/etc. shape within
  // that fixed frame, rather than squashing a standing image to fit.
  // Falls back to a flat-color rect at the actual collision box if the
  // relevant sprite hasn't finished loading.
  drawBody(ctx, left, top) {
    const sprite = this.sprites[poseKeyFor(this)] || this.sprites.idle;
    const spriteReady = sprite && sprite.complete && sprite.naturalWidth > 0;

    if (!spriteReady) {
      ctx.fillStyle = this.hitFlashFrames > 0 ? '#ffffff' : this.color;
      ctx.fillRect(left, top, this.width, this.height);
      return;
    }

    const frameLeft = this.x - SPRITE_FRAME_WIDTH / 2;
    const frameTop = this.y - SPRITE_FRAME_HEIGHT;

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.x, 0);
    }
    ctx.drawImage(sprite, frameLeft, frameTop, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT);
    if (this.hitFlashFrames > 0) {
      // Paints solid white only where the sprite already drew opaque
      // pixels — a cheap "flash white" silhouette without a shader.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(frameLeft, frameTop, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT);
    }
    ctx.restore();
  }
}
