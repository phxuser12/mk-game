// Grounded movement states for Milestone 1: idle, walk forward/back, crouch,
// jump. "Forward"/"back" are relative to which way the fighter is currently
// facing (not raw left/right), because later specials are notated relative
// to facing (e.g. back-back-forward+punch) even though keys are absolute.
//
// Entry/exit conditions, spelled out:
//   idle          <-> walkForward/walkBack  on left/right held
//   idle/walk     -> crouch                 on down held (grounded only)
//   crouch        -> idle                   on down released
//   idle/walk     -> jump                   on up pressed (grounded only)
//   jump          -> idle                   on landing (y reaches ground, vy >= 0)
// Attacking/hit-stun/blocking states plug into this same table in later
// milestones and will add their own guards against illegal interruption.

import { STAGE, PHYSICS } from '../engine/constants.js';

function readMoveDir(input) {
  const left = input.left ? -1 : 0;
  const right = input.right ? 1 : 0;
  return left + right;
}

export const fighterStates = {
  idle: {
    enter(f) {
      f.vx = 0;
    },
    update(f, dt, input) {
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
};
