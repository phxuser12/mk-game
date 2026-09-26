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
//   idle/walk     -> attacking              on any of HP/LP/HK/LK pressed (grounded only)
//   crouch        -> attacking (uppercut)   on HP pressed
//   crouch        -> attacking (sweep)      on HK pressed
//   idle/walk     -> attacking (special)    on a special's motion+button matching the MotionBuffer
//   attacking     -> idle                   once startup+active+recovery frames elapse
//   attacking     -> attacking (chained)    on the next combo-string button, during recovery
//   idle/walk     -> running                on run button pressed (grounded only)
//   running       -> idle                   once the dash's fixed duration elapses
//   idle/walk/crouch -> standingBlock/crouchBlock  on block held (down decides which guard)
//   standingBlock <-> crouchBlock           as down is held/released while still blocking
//   */block       -> idle/crouch            on block released
//   (any)         -> hitStun/blockStun      on combat.js resolving a landed/blocked hit
//   hitStun/blockStun -> idle               once stunFrames (set by combat.js) elapses
//   (any, clean uppercut) -> launched       airborne, no input, until landing
//   launched      -> knockdown              on landing
//   (any, clean sweep) -> knockdown         directly, no air launch
//   knockdown     -> gettingUp -> idle      timed, no input in either state
//   launched      -> launched (refreshed)   on a follow-up clean hit landing mid-air: the juggle
//
// attacking and running are not interruptible by input (no movement, jumping,
// blocking, or re-triggering) until they finish on their own — but combat.js
// can still force a transition out of ANY state into hitStun/blockStun/
// launched/knockdown, since getting hit interrupts everything. Known
// limitation: a fighter hit while airborne from a JUMP (not launched by an
// uppercut) snaps to ground level rather than falling first — only the
// uppercut's own airborne state is juggle-aware so far.

import { STAGE, PHYSICS, COMBAT } from '../engine/constants.js';
import { GENERIC_MOVES } from '../characters/genericMoves.js';
import { GENERIC_COMBO } from '../characters/genericCombo.js';
import { UNIVERSAL_MOVES } from '../engine/universalMoves.js';
import { GENERIC_SPECIALS } from '../characters/genericSpecials.js';

const MOVES = { ...GENERIC_MOVES, ...UNIVERSAL_MOVES, ...GENERIC_SPECIALS };

// Priority order when multiple attack buttons land on the same tick.
const INPUT_FLAG_BY_MOVE = {
  highPunch: 'hpPressed',
  lowPunch: 'lpPressed',
  highKick: 'hkPressed',
  lowKick: 'lkPressed',
};
const NORMAL_KEYS_IN_PRIORITY = ['highPunch', 'lowPunch', 'highKick', 'lowKick'];

function pickPressedNormal(input) {
  for (const key of NORMAL_KEYS_IN_PRIORITY) {
    if (input[INPUT_FLAG_BY_MOVE[key]]) return key;
  }
  return null;
}

// A special's motion+button always takes priority over a plain normal on
// the same button (e.g. HP after back-back-forward triggers the special,
// not a plain High Punch).
function pickTriggeredSpecial(f, input) {
  for (const [key, move] of Object.entries(GENERIC_SPECIALS)) {
    const { sequence, button, maxFrames } = move.input;
    if (input[button] && f.motionBuffer.matches(sequence, maxFrames)) return key;
  }
  return null;
}

function readMoveDir(input) {
  const left = input.left ? -1 : 0;
  const right = input.right ? 1 : 0;
  return left + right;
}

// Resets the attacking state's per-swing fields for `moveKey` WITHOUT going
// through fsm.transition — used both to enter 'attacking' fresh and to
// cancel straight into the next hit of a combo string while already there.
function startAttack(f, moveKey) {
  f.vx = 0;
  f.attackFrame = 0;
  f.currentAttackHasHit = false;
  f.projectileSpawned = false;
  f.activationSoundFired = false;
  f.activeMove = MOVES[moveKey];
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
      const specialKey = pickTriggeredSpecial(f, input);
      if (specialKey) {
        f.pendingMoveKey = specialKey;
        return f.fsm.transition('attacking');
      }
      const pressedMove = pickPressedNormal(input);
      if (pressedMove) {
        f.pendingMoveKey = pressedMove;
        return f.fsm.transition('attacking');
      }
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
      const specialKey = pickTriggeredSpecial(f, input);
      if (specialKey) {
        f.pendingMoveKey = specialKey;
        return f.fsm.transition('attacking');
      }
      const pressedMove = pickPressedNormal(input);
      if (pressedMove) {
        f.pendingMoveKey = pressedMove;
        return f.fsm.transition('attacking');
      }
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
      const specialKey = pickTriggeredSpecial(f, input);
      if (specialKey) {
        f.pendingMoveKey = specialKey;
        return f.fsm.transition('attacking');
      }
      const pressedMove = pickPressedNormal(input);
      if (pressedMove) {
        f.pendingMoveKey = pressedMove;
        return f.fsm.transition('attacking');
      }
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
      if (input.hpPressed) {
        f.pendingMoveKey = 'uppercut';
        return f.fsm.transition('attacking');
      }
      if (input.hkPressed) {
        f.pendingMoveKey = 'sweep';
        return f.fsm.transition('attacking');
      }
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
      startAttack(f, f.pendingMoveKey);
      // Only tracked as a combo attempt if it opens with the string's first move.
      f.comboIndex = f.pendingMoveKey === GENERIC_COMBO[0] ? 0 : null;
      f.comboHitCount = 0;
      f.comboDamage = 0;
    },
    update(f, dt, input) {
      f.attackFrame += 1;
      const move = f.activeMove;
      const activeEnd = move.startup + move.active;
      const totalFrames = activeEnd + move.recovery;

      // The instant the active window opens: flag it for main.js (which
      // plays the whiff/special activation sound off this, clearing it
      // after), and projectile moves additionally hand off to a traveling
      // entity here since the caster's own body never carries their hitbox.
      if (f.attackFrame === move.startup + 1) {
        if (!f.activationSoundFired) {
          f.activationSoundFired = true;
          f.justBecameActive = true;
        }
        if (move.projectile && !f.projectileSpawned) {
          f.projectileSpawned = true;
          f.pendingProjectile = { move, x: f.x, y: f.y, facing: f.facing };
        }
      }

      // Chain-cancel window: anywhere during recovery, the correct next
      // button in the combo string skips the rest of recovery and starts
      // the next hit immediately.
      if (f.comboIndex !== null && f.attackFrame > activeEnd && f.attackFrame <= totalFrames) {
        const nextKey = GENERIC_COMBO[f.comboIndex + 1];
        if (nextKey && input[INPUT_FLAG_BY_MOVE[nextKey]]) {
          f.comboIndex += 1;
          startAttack(f, nextKey);
          return;
        }
      }

      if (f.attackFrame >= totalFrames) {
        f.activeMove = null;
        f.comboIndex = null; // chain not continued in time; drop it
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

  // Airborne after a clean uppercut: gravity-driven, no player input, until
  // landing hands off to knockdown.
  launched: {
    update(f, dt) {
      f.vy += PHYSICS.GRAVITY * dt;
      f.y += f.vy * dt;
      f.vx *= PHYSICS.KNOCKBACK_FRICTION;

      if (f.y >= STAGE.GROUND_Y && f.vy >= 0) {
        f.y = STAGE.GROUND_Y;
        f.vy = 0;
        f.vx = 0;
        f.knockdownFrames = COMBAT.KNOCKDOWN_FRAMES;
        f.fsm.transition('knockdown');
      }
    },
  },

  knockdown: {
    enter(f) {
      f.vx = 0;
    },
    update(f) {
      f.knockdownFrames -= 1;
      if (f.knockdownFrames <= 0) {
        f.gettingUpFrames = COMBAT.GETTING_UP_FRAMES;
        f.fsm.transition('gettingUp');
      }
    },
  },

  gettingUp: {
    update(f) {
      f.gettingUpFrames -= 1;
      if (f.gettingUpFrames <= 0) f.fsm.transition('idle');
    },
  },
};
