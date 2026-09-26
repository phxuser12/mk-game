// Grounded movement + combat states.
// "Forward"/"back" are relative to which way the fighter is currently facing
// (not raw left/right), because later specials are notated relative to
// facing (e.g. back-back-forward+punch) even though keys are absolute.
//
// Entry/exit conditions, spelled out:
//   idle          <-> walkForward/walkBack  on left/right held
//   idle/walk     -> crouch                 on down held (grounded only)
//   crouch        -> idle                   on down released
//   idle/walk     -> jump                   on up pressed (grounded only)
//   jump          -> idle                   on landing (y reaches ground, vy >= 0)
//   idle/walk     -> attacking              on attack button pressed (grounded only)
//   attacking     -> idle                   once startup+active+recovery frames elapse
//   idle/walk     -> running                on run button pressed (grounded only)
//   running       -> idle                   once the dash's fixed duration elapses
//   idle/walk/crouch -> standingBlock/crouchBlock  on block held (down decides which guard)
//   standingBlock <-> crouchBlock           as down is held/released while still blocking
//   */block       -> idle/crouch            on block released
//   (any)         -> hitStun/blockStun      on combat.js resolving a landed/blocked hit
//   hitStun/blockStun -> idle               once stunFrames (set by combat.js) elapses
//
// attacking and running are not interruptible by input (no movement, jumping,
// blocking, or re-triggering) until they finish on their own — but combat.js
// can still force a transition into hitStun/blockStun out of ANY state, since
// getting hit interrupts everything. Known limitation: a fighter hit while
// airborne snaps back to idle at ground level rather than falling first;
// proper airborne-hitstun/juggling arrives with Milestone 5.

import { STAGE, PHYSICS } from '../engine/constants.js';
import { GENERIC_MOVES } from '../characters/genericMoves.js';

function readMoveDir(input) {
  const left = input.left ? -1 : 0;
  const right = input.right ? 1 : 0;
  return left + right;
}

// hitStun and blockStun share behavior: slide to a stop over stunFrames
// ticks, then return to idle. combat.js sets stunFrames/vx before
// transitioning in; the two states stay separately named (rather than one)
// so other systems can tell "got hit clean" apart from "blocked it".
const stunState = {
  update(f) {
    f.stunFrames -= 1;
    f.vx *= PHYSICS.KNOCKBACK_FRICTION;
    if (f.stunFrames <= 0) {
      f.vx = 0;
      f.fsm.transition('idle');
    }
  },
};

export const fighterStates = {
  idle: {
    enter(f) {
      f.vx = 0;
    },
    update(f, dt, input) {
      if (input.hpPressed) return f.fsm.transition('attacking');
      if (input.runPressed) return f.fsm.transition('running');
      if (input.block) return f.fsm.transition(input.down ? 'crouchBlock' : 'standingBlock');
      if (input.jumpPressed) return f.fsm.transition('jump');
      if (input.down) return f.fsm.transition('crouch');
      const moveDir = readMoveDir(input);
      if (moveDir !== 0) {
        f.fsm.transition(moveDir === f.facing ? 'walkForward' : 'walkBack');
      }
    },
  },

  walkForward: {
    update(f, dt, input) {
      if (input.hpPressed) return f.fsm.transition('attacking');
      if (input.runPressed) return f.fsm.transition('running');
      if (input.block) return f.fsm.transition(input.down ? 'crouchBlock' : 'standingBlock');
      if (input.jumpPressed) return f.fsm.transition('jump');
      if (input.down) return f.fsm.transition('crouch');
      const moveDir = readMoveDir(input);
      if (moveDir === 0) return f.fsm.transition('idle');
      if (moveDir !== f.facing) return f.fsm.transition('walkBack');
      f.vx = moveDir * PHYSICS.WALK_SPEED;
    },
  },

  walkBack: {
    update(f, dt, input) {
      if (input.hpPressed) return f.fsm.transition('attacking');
      if (input.runPressed) return f.fsm.transition('running');
      if (input.block) return f.fsm.transition(input.down ? 'crouchBlock' : 'standingBlock');
      if (input.jumpPressed) return f.fsm.transition('jump');
      if (input.down) return f.fsm.transition('crouch');
      const moveDir = readMoveDir(input);
      if (moveDir === 0) return f.fsm.transition('idle');
      if (moveDir === f.facing) return f.fsm.transition('walkForward');
      f.vx = moveDir * PHYSICS.WALK_SPEED;
    },
  },

  crouch: {
    enter(f) {
      f.vx = 0;
    },
    update(f, dt, input) {
      if (input.block) return f.fsm.transition('crouchBlock');
      if (!input.down) f.fsm.transition('idle');
    },
  },

  jump: {
    enter(f) {
      f.vy = -PHYSICS.JUMP_VELOCITY;
    },
    update(f, dt, input) {
      f.vx = readMoveDir(input) * PHYSICS.AIR_CONTROL_SPEED;
      f.vy += PHYSICS.GRAVITY * dt;
      f.y += f.vy * dt;

      if (f.y >= STAGE.GROUND_Y && f.vy >= 0) {
        f.y = STAGE.GROUND_Y;
        f.vy = 0;
        f.fsm.transition('idle');
      }
    },
  },

  attacking: {
    enter(f) {
      f.vx = 0; // rooted for this milestone's single normal; movement normals arrive later
      f.attackFrame = 0;
      f.currentAttackHasHit = false;
      f.activeMove = GENERIC_MOVES.highPunch;
    },
    update(f) {
      f.attackFrame += 1;
      const total = f.activeMove.startup + f.activeMove.active + f.activeMove.recovery;
      if (f.attackFrame >= total) {
        f.activeMove = null;
        f.fsm.transition('idle');
      }
    },
    exit(f) {
      f.activeMove = null;
    },
  },

  running: {
    enter(f) {
      f.vx = f.facing * PHYSICS.RUN_SPEED; // always forward: closes distance, per the brief
      f.runFrame = 0;
    },
    update(f) {
      f.runFrame += 1;
      if (f.runFrame >= PHYSICS.RUN_DURATION_FRAMES) {
        f.vx = 0;
        f.fsm.transition('idle');
      }
    },
  },

  standingBlock: {
    enter(f) {
      f.vx = 0;
    },
    update(f, dt, input) {
      if (!input.block) return f.fsm.transition('idle');
      if (input.down) return f.fsm.transition('crouchBlock');
    },
  },

  crouchBlock: {
    enter(f) {
      f.vx = 0;
    },
    update(f, dt, input) {
      if (!input.block) return f.fsm.transition(input.down ? 'crouch' : 'idle');
      if (!input.down) return f.fsm.transition('standingBlock');
    },
  },

  hitStun: stunState,
  blockStun: stunState,
};
