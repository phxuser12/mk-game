import { startGameLoop } from './engine/loop.js';
import { InputManager } from './engine/input.js';
import { resolveOverlap } from './engine/collision.js';
import { resolveAttacks, resolveProjectileHit } from './engine/combat.js';
import { Fighter } from './entities/fighter.js';
import { Projectile } from './entities/projectile.js';
import { STAGE } from './engine/constants.js';
import { drawStage } from './stage/stage.js';
import { drawHealthBars } from './ui/healthBar.js';
import { drawComboCounters } from './ui/comboCounter.js';
import { drawDebugOverlay } from './debug/debugDraw.js';
import { drawMatchOverlay } from './ui/matchOverlay.js';
import { Match, PHASE } from './match/match.js';
import { BasicAI } from './ai/basicAI.js';

const canvas = document.getElementById('game');
canvas.width = STAGE.WIDTH;
canvas.height = STAGE.HEIGHT;
const ctx = canvas.getContext('2d');

const input = new InputManager();

const p1 = new Fighter({ x: 300, facing: 1, color: '#c0392b', label: 'P1' });
const p2 = new Fighter({ x: 660, facing: -1, color: '#2980b9', label: 'P2' });

const match = new Match();
match.startMatch(p1, p2);

const ai = new BasicAI();

let hitStopFrames = 0; // ticks remaining where both fighters freeze after a landed hit
let debugEnabled = false;
let goreEnabled = true;
let aiEnabled = false; // P2 is AI-controlled when true; off by default so 2-player is unchanged
let projectiles = [];

function spawnPendingProjectile(f) {
  if (!f.pendingProjectile) return;
  projectiles.push(new Projectile({ ...f.pendingProjectile, owner: f }));
  f.pendingProjectile = null;
}

function update(dt) {
  if (input.wasPressed('Backquote')) debugEnabled = !debugEnabled;
  if (input.wasPressed('KeyB')) goreEnabled = !goreEnabled;
  if (input.wasPressed('KeyP')) aiEnabled = !aiEnabled;

  const { simulate } = match.update(dt, p1, p2, input, goreEnabled);

  if (match.phase === PHASE.ROUND_INTRO) projectiles = []; // clear any stragglers before the next round starts

  if (simulate) {
    const p1Input = input.getInput('p1');
    const p2Input = aiEnabled ? ai.decide(p2, p1) : input.getInput('p2');

    if (hitStopFrames > 0) {
      hitStopFrames -= 1;
    } else {
      p1.update(dt, p1Input, p2);
      p2.update(dt, p2Input, p1);
      resolveOverlap(p1, p2);
      hitStopFrames = resolveAttacks(p1, p2);

      spawnPendingProjectile(p1);
      spawnPendingProjectile(p2);

      for (const proj of projectiles) {
        proj.update(dt);
        const defender = proj.owner === p1 ? p2 : p1;
        hitStopFrames = Math.max(hitStopFrames, resolveProjectileHit(proj, defender));
      }
      projectiles = projectiles.filter((proj) => proj.alive);
    }
  }

  input.endTick();
}

function render() {
  drawStage(ctx);
  p1.draw(ctx);
  p2.draw(ctx);
  for (const proj of projectiles) proj.draw(ctx);
  drawHealthBars(ctx, p1, p2);
  drawComboCounters(ctx, p1, p2);
  drawMatchOverlay(ctx, match, p1, p2);

  ctx.fillStyle = '#888';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`BLOOD: ${goreEnabled ? 'ON' : 'OFF'} (B to toggle)`, 8, STAGE.HEIGHT - 10);
  ctx.textAlign = 'right';
  ctx.fillText(`P2: ${aiEnabled ? 'AI' : 'HUMAN'} (P to toggle)`, STAGE.WIDTH - 8, STAGE.HEIGHT - 10);

  if (debugEnabled) drawDebugOverlay(ctx, [p1, p2], projectiles);
}

startGameLoop({ update, render });
