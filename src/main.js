import { startGameLoop } from './engine/loop.js';
import { InputManager } from './engine/input.js';
import { resolveOverlap } from './engine/collision.js';
import { resolveAttacks } from './engine/combat.js';
import { Fighter } from './entities/fighter.js';
import { STAGE } from './engine/constants.js';
import { drawStage } from './stage/stage.js';
import { drawHealthBars } from './ui/healthBar.js';
import { drawComboCounters } from './ui/comboCounter.js';
import { drawDebugOverlay } from './debug/debugDraw.js';

const canvas = document.getElementById('game');
canvas.width = STAGE.WIDTH;
canvas.height = STAGE.HEIGHT;
const ctx = canvas.getContext('2d');

const input = new InputManager();

const p1 = new Fighter({ x: 300, facing: 1, color: '#c0392b', label: 'P1' });
const p2 = new Fighter({ x: 660, facing: -1, color: '#2980b9', label: 'P2' });

let hitStopFrames = 0; // ticks remaining where both fighters freeze after a landed hit
let debugEnabled = false;

function update(dt) {
  const p1Input = input.getInput('p1');
  const p2Input = input.getInput('p2');

  if (input.wasPressed('Backquote')) debugEnabled = !debugEnabled;

  if (hitStopFrames > 0) {
    hitStopFrames -= 1;
  } else {
    p1.update(dt, p1Input, p2);
    p2.update(dt, p2Input, p1);
    resolveOverlap(p1, p2);
    hitStopFrames = resolveAttacks(p1, p2);
  }

  input.endTick();
}

function render() {
  drawStage(ctx);
  p1.draw(ctx);
  p2.draw(ctx);
  drawHealthBars(ctx, p1, p2);
  drawComboCounters(ctx, p1, p2);
  if (debugEnabled) drawDebugOverlay(ctx, [p1, p2]);
}

startGameLoop({ update, render });
