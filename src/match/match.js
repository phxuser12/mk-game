// Top-level round/match flow: intro banners, the round clock, best-of-3
// scoring, and the finishing-move window. Doesn't touch combat resolution
// itself — main.js still owns that — but it decides whether combat should
// be simulated this tick (frozen during banners/finishers) and, during the
// finisher window, reads the match-winner's input directly and feeds their
// MotionBuffer itself, since normal Fighter.update() is paused there.

import { MATCH } from '../engine/constants.js';
import { GENERIC_FINISHERS } from '../characters/genericFinishers.js';
import { computeMotionDir } from '../engine/motionBuffer.js';

export const PHASE = {
  ROUND_INTRO: 'roundIntro',
  FIGHT: 'fight',
  ROUND_END: 'roundEnd',
  FINISHER_WINDOW: 'finisherWindow',
  FINISHER_PLAYING: 'finisherPlaying',
  MATCH_END: 'matchEnd',
};

const P1_START_X = 300;
const P2_START_X = 660;

function pickTriggeredFinisher(winner, input, goreEnabled) {
  for (const [key, finisher] of Object.entries(GENERIC_FINISHERS)) {
    if (finisher.type === 'brutal' && !goreEnabled) continue;
    const { sequence, button, maxFrames } = finisher.input;
    if (input[button] && winner.motionBuffer.matches(sequence, maxFrames)) return key;
  }
  return null;
}

export class Match {
  constructor() {
    this.phase = PHASE.ROUND_INTRO;
    this.phaseTimer = 0;
    this.roundNumber = 1;
    this.wins = { p1: 0, p2: 0 };
    this.timeLeft = MATCH.ROUND_SECONDS;
    this.winnerKey = null; // 'p1' | 'p2' | null, for whichever round/match just resolved
    this.roundEndReason = null; // 'ko' | 'timeUp' | 'draw'
    this.matchOver = false;
    this.finisherToPlay = null; // the finisher data object, once one is triggered
  }

  startMatch(p1, p2) {
    this.roundNumber = 1;
    this.wins = { p1: 0, p2: 0 };
    this.matchOver = false;
    this._enterRoundIntro(p1, p2);
  }

  _enterRoundIntro(p1, p2) {
    p1.reset(P1_START_X, 1);
    p2.reset(P2_START_X, -1);
    this.winnerKey = null;
    this.roundEndReason = null;
    this.finisherToPlay = null;
    this.phase = PHASE.ROUND_INTRO;
    this.phaseTimer = MATCH.ROUND_INTRO_FRAMES;
  }

  // byKo: true if this round ended because someone's health hit 0, as
  // opposed to the round clock running out.
  _resolveRoundEnd(p1, p2, byKo) {
    const p1Dead = p1.health <= 0;
    const p2Dead = p2.health <= 0;

    let winnerKey = null;
    if (p1Dead && !p2Dead) winnerKey = 'p2';
    else if (p2Dead && !p1Dead) winnerKey = 'p1';
    else if (!byKo) {
      if (p1.health > p2.health) winnerKey = 'p1';
      else if (p2.health > p1.health) winnerKey = 'p2';
    }
    // p1Dead && p2Dead (double KO), or an exact-health time-up: no one wins the round.

    this.winnerKey = winnerKey;
    this.roundEndReason = winnerKey ? (byKo ? 'ko' : 'timeUp') : 'draw';

    if (winnerKey) this.wins[winnerKey] += 1;
    this.matchOver = Boolean(winnerKey) && this.wins[winnerKey] >= MATCH.ROUNDS_TO_WIN;

    if (this.matchOver && byKo) {
      // Only an actual KO earns a shot at the finisher — you can't "finish" a decision.
      this.phase = PHASE.FINISHER_WINDOW;
      this.phaseTimer = MATCH.FINISHER_WINDOW_FRAMES;
    } else {
      this.phase = PHASE.ROUND_END;
      this.phaseTimer = MATCH.ROUND_END_FRAMES;
    }
  }

  // Returns { simulate }: whether main.js should run fighter/combat/projectile
  // updates this tick, or leave everything frozen for a banner/finisher beat.
  update(dt, p1, p2, input, goreEnabled) {
    switch (this.phase) {
      case PHASE.ROUND_INTRO:
        this.phaseTimer -= 1;
        if (this.phaseTimer <= 0) {
          this.phase = PHASE.FIGHT;
          this.timeLeft = MATCH.ROUND_SECONDS;
        }
        return { simulate: false };

      case PHASE.FIGHT: {
        this.timeLeft -= dt;
        const byKo = p1.health <= 0 || p2.health <= 0;
        const timeUp = this.timeLeft <= 0;
        if (byKo || timeUp) this._resolveRoundEnd(p1, p2, byKo);
        return { simulate: true };
      }

      case PHASE.ROUND_END:
        this.phaseTimer -= 1;
        if (this.phaseTimer <= 0) {
          if (this.matchOver) this.phase = PHASE.MATCH_END;
          else {
            this.roundNumber += 1;
            this._enterRoundIntro(p1, p2);
          }
        }
        return { simulate: false };

      case PHASE.FINISHER_WINDOW: {
        const winner = this.winnerKey === 'p1' ? p1 : p2;
        const winnerInput = input.getInput(this.winnerKey);
        winner.motionBuffer.update(computeMotionDir(winnerInput, winner.facing));

        const finisherKey = pickTriggeredFinisher(winner, winnerInput, goreEnabled);
        if (finisherKey) {
          this.finisherToPlay = GENERIC_FINISHERS[finisherKey];
          this.phase = PHASE.FINISHER_PLAYING;
          this.phaseTimer = MATCH.FINISHER_PLAY_FRAMES;
          return { simulate: false };
        }

        this.phaseTimer -= 1;
        if (this.phaseTimer <= 0) this.phase = PHASE.MATCH_END; // window expired: plain victory, no finisher
        return { simulate: false };
      }

      case PHASE.FINISHER_PLAYING:
        this.phaseTimer -= 1;
        if (this.phaseTimer <= 0) this.phase = PHASE.MATCH_END;
        return { simulate: false };

      case PHASE.MATCH_END: {
        const p1In = input.getInput('p1');
        const p2In = input.getInput('p2');
        if (p1In.hpPressed || p2In.hpPressed) this.startMatch(p1, p2); // either player can start a rematch
        return { simulate: false };
      }

      default:
        return { simulate: false };
    }
  }
}
