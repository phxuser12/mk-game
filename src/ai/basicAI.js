// Simple state-machine AI for single-player practice: approaches when out of
// range, attacks on a cooldown (guaranteed instead when the opponent is
// obviously open), and reacts to the opponent's swings with an imperfect
// block. Deliberately not advanced — just enough to test against.
//
// decide() returns the exact same input shape InputManager.getInput() does,
// so main.js can swap it in for a player's real input with no other changes
// anywhere in the engine.

const ATTACK_RANGE = 90; // roughly a normal's reach; approach until inside this
const ATTACK_CHANCE = 0.4; // per tick, while in range and off cooldown
const ATTACK_COOLDOWN_MIN = 20;
const ATTACK_COOLDOWN_MAX = 45;
const BLOCK_REACT_CHANCE = 0.55; // chance to actually block a swing it notices
const BLOCK_HOLD_FRAMES = 18;
const RUN_CHANCE = 0.02; // per tick, while far away, chance to dash instead of walk
const PUNISH_STATES = ['blockStun', 'hitStun', 'knockdown', 'gettingUp'];

const ATTACK_POOL = [
  { key: 'highPunch', weight: 3 },
  { key: 'lowPunch', weight: 3 },
  { key: 'highKick', weight: 2 },
  { key: 'lowKick', weight: 2 },
  { key: 'uppercut', weight: 1 },
  { key: 'sweep', weight: 1 },
];
const FLAG_BY_KEY = {
  highPunch: 'hpPressed',
  lowPunch: 'lpPressed',
  highKick: 'hkPressed',
  lowKick: 'lkPressed',
  uppercut: 'hpPressed', // needs input.down too; see the crouch-move handling below
  sweep: 'hkPressed',
};
const CROUCH_MOVE_KEYS = new Set(['uppercut', 'sweep']);

function blankInput() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpPressed: false,
    hp: false,
    lp: false,
    hk: false,
    lk: false,
    hpPressed: false,
    lpPressed: false,
    hkPressed: false,
    lkPressed: false,
    block: false,
    runPressed: false,
  };
}

function pickWeighted(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    if (roll < option.weight) return option;
    roll -= option.weight;
  }
  return options[options.length - 1];
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export class BasicAI {
  constructor() {
    this.opponentWasAttacking = false;
    this.blockFramesLeft = 0;
    this.blockCrouching = false;
    this.attackCooldown = 0;
    this.pendingCrouchAttack = null; // 'uppercut' | 'sweep', mid-way through the 2-tick crouch+button sequence
  }

  decide(self, opponent) {
    const input = blankInput();

    if (this.attackCooldown > 0) this.attackCooldown -= 1;

    // Reactive block: roll once right when the opponent's swing starts, not
    // every tick — a per-tick coin flip would make the guard flicker on/off.
    // Basic and imperfect: it sometimes guesses crouch vs. standing wrong.
    const opponentIsAttacking = opponent.fsm.is('attacking');
    if (opponentIsAttacking && !this.opponentWasAttacking) {
      const distance = Math.abs(opponent.x - self.x);
      if (distance <= ATTACK_RANGE + 20 && Math.random() < BLOCK_REACT_CHANCE) {
        this.blockFramesLeft = BLOCK_HOLD_FRAMES;
        this.blockCrouching = Math.random() < 0.5;
        this.pendingCrouchAttack = null; // abandon any in-progress attack plan to defend instead
      }
    }
    this.opponentWasAttacking = opponentIsAttacking;

    if (this.blockFramesLeft > 0) {
      this.blockFramesLeft -= 1;
      input.block = true;
      if (this.blockCrouching) input.down = true;
      return input;
    }

    if (this.pendingCrouchAttack) {
      input.down = true;
      input[FLAG_BY_KEY[this.pendingCrouchAttack]] = true;
      this.pendingCrouchAttack = null;
      this.attackCooldown = randomBetween(ATTACK_COOLDOWN_MIN, ATTACK_COOLDOWN_MAX);
      return input;
    }

    const canAct = self.fsm.is('idle') || self.fsm.is('walkForward') || self.fsm.is('walkBack');
    if (!canAct) return input; // mid-action already; nothing productive to add this tick

    const dx = opponent.x - self.x;
    const distance = Math.abs(dx);
    const opponentIsOpen = PUNISH_STATES.some((state) => opponent.fsm.is(state));

    if (distance <= ATTACK_RANGE) {
      const wantsToAttack = opponentIsOpen || (this.attackCooldown <= 0 && Math.random() < ATTACK_CHANCE);
      if (!wantsToAttack) return input; // holds ground rather than swinging on cooldown

      const choice = pickWeighted(ATTACK_POOL);
      if (CROUCH_MOVE_KEYS.has(choice.key)) {
        this.pendingCrouchAttack = choice.key; // crouch this tick; the button follows next tick
        input.down = true;
        return input;
      }
      input[FLAG_BY_KEY[choice.key]] = true;
      this.attackCooldown = randomBetween(ATTACK_COOLDOWN_MIN, ATTACK_COOLDOWN_MAX);
      return input;
    }

    const towardOpponent = dx === 0 ? self.facing : Math.sign(dx);
    if (towardOpponent === 1) input.right = true;
    else input.left = true;

    if (distance > ATTACK_RANGE * 2 && Math.random() < RUN_CHANCE) input.runPressed = true;

    return input;
  }
}
