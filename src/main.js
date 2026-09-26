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
import { ParticleSystem } from './fx/particles.js';
import { ScreenShake } from './fx/screenShake.js';
import * as audio from './audio/audioEngine.js';

// Browsers block audio until a real user gesture; the very first keydown
// (from either player) satisfies that, then this listener removes itself.
window.addEventListener('keydown', audio.unlockAudio, { once: true });

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
const particles = new ParticleSystem();
const shake = new ScreenShake();

let hitStopFrames = 0; // ticks remaining where both fighters freeze after a landed hit
let debugEnabled = false;
let goreEnabled = true;
let aiEnabled = false; // P2 is AI-controlled when true; off by default so 2-player is unchanged
let projectiles = [];
let lastMatchPhase = null;

function spawnPendingProjectile(f) {
  if (!f.pendingProjectile) return;
  projectiles.push(new Projectile({ ...f.pendingProjectile, owner: f }));
  f.pendingProjectile = null;
}

// The instant a swing's active window opens, regardless of whether it goes
// on to connect — this is the "whiff" sound if it never does.
function handleActivation(f) {
  if (!f.justBecameActive) return;
  f.justBecameActive = false;
  if (f.activeMove && f.activeMove.projectile) audio.playSpecial();
  else audio.playWhiff();
}

function handleImpactEvent(event) {
  if (!event) return;

  if (event.blocked) {
    particles.spawn({ x: event.x, y: event.y, count: 6, colors: ['#cccccc', '#ffffff', '#888888'], life: 0.2, size: 3, speedMax: 140 });
    shake.addTrauma(0.15);
    audio.playBlock();
    return;
  }

  const colors = goreEnabled ? ['#c0392b', '#7f1d1d', '#e74c3c'] : ['#f1c40f', '#ffffff', '#f39c12'];
  particles.spawn({
    x: event.x,
    y: event.y,
    count: event.heavy ? 18 : 10,
    colors,
    life: event.heavy ? 0.5 : 0.35,
    size: event.heavy ? 5 : 4,
  });
  shake.addTrauma(event.heavy ? 0.65 : 0.35);
  audio.playHitImpact(event.heavy);
}

// Announcer barks + music, driven off match-phase transitions rather than
// match.js knowing anything about audio.
function handleMatchPhaseChange() {
  if (match.phase === lastMatchPhase) return;
  lastMatchPhase = match.phase;

  switch (match.phase) {
    case PHASE.ROUND_INTRO:
      audio.stopMusic();
      audio.playRoundStart();
      break;
    case PHASE.FIGHT:
      audio.startMusic();
      break;
    case PHASE.ROUND_END:
      audio.stopMusic();
      if (match.roundEndReason === 'ko') audio.playKO();
      else if (match.roundEndReason === 'timeUp') audio.playTimeUp();
      else audio.playDraw();
      break;
    case PHASE.FINISHER_WINDOW:
      audio.stopMusic();
      audio.playFinisherWindow();
      break;
    case PHASE.FINISHER_PLAYING: {
      const isBrutal = match.finisherToPlay && match.finisherToPlay.type === 'brutal';
      if (isBrutal) audio.playFinisherBrutal();
      else audio.playFinisherNonviolent();

      const loser = match.winnerKey === 'p1' ? p2 : p1;
      particles.spawn({
        x: loser.x,
        y: loser.y - loser.height / 2,
        count: isBrutal ? 30 : 20,
        colors: isBrutal ? ['#c0392b', '#7f1d1d', '#000000'] : ['#f1c40f', '#3498db', '#2ecc71', '#e67e22'],
        life: 0.8,
        size: 6,
        speedMax: 260,
      });
      shake.addTrauma(isBrutal ? 0.9 : 0.5);
      break;
    }
    case PHASE.MATCH_END:
      audio.playMatchWin();
      break;
    default:
      break;
  }
}

function update(dt) {
  if (input.wasPressed('Backquote')) debugEnabled = !debugEnabled;
  if (input.wasPressed('KeyB')) goreEnabled = !goreEnabled;
  if (input.wasPressed('KeyP')) aiEnabled = !aiEnabled;
  if (input.wasPressed('KeyM')) audio.setMuted(!audio.isMuted());

  particles.update(dt);
  shake.update(dt);

  const { simulate } = match.update(dt, p1, p2, input, goreEnabled);
  handleMatchPhaseChange();

  if (match.phase === PHASE.ROUND_INTRO) projectiles = []; // clear any stragglers before the next round starts

  if (simulate) {
    const p1Input = input.getInput('p1');
    const p2Input = aiEnabled ? ai.decide(p2, p1) : input.getInput('p2');

    if (hitStopFrames > 0) {
      hitStopFrames -= 1;
    } else {
      p1.update(dt, p1Input, p2);
      p2.update(dt, p2Input, p1);
      handleActivation(p1);
      handleActivation(p2);
      resolveOverlap(p1, p2);

      const { hitStop, events } = resolveAttacks(p1, p2);
      hitStopFrames = hitStop;
      events.forEach(handleImpactEvent);

      spawnPendingProjectile(p1);
      spawnPendingProjectile(p2);

      for (const proj of projectiles) {
        proj.update(dt);
        const defender = proj.owner === p1 ? p2 : p1;
        const result = resolveProjectileHit(proj, defender);
        hitStopFrames = Math.max(hitStopFrames, result.hitStop);
        handleImpactEvent(result.event);
      }
      projectiles = projectiles.filter((proj) => proj.alive);
    }
  }

  input.endTick();
}

function render() {
  const offset = shake.getOffset();
  ctx.save();
  ctx.translate(offset.x, offset.y);

  drawStage(ctx);
  p1.draw(ctx);
  p2.draw(ctx);
  for (const proj of projectiles) proj.draw(ctx);
  particles.draw(ctx);
  if (debugEnabled) drawDebugOverlay(ctx, [p1, p2], projectiles);

  ctx.restore();

  drawHealthBars(ctx, p1, p2);
  drawComboCounters(ctx, p1, p2);
  drawMatchOverlay(ctx, match, p1, p2);

  ctx.fillStyle = '#888';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`BLOOD: ${goreEnabled ? 'ON' : 'OFF'} (B)  SOUND: ${audio.isMuted() ? 'OFF' : 'ON'} (M)`, 8, STAGE.HEIGHT - 10);
  ctx.textAlign = 'right';
  ctx.fillText(`P2: ${aiEnabled ? 'AI' : 'HUMAN'} (P)`, STAGE.WIDTH - 8, STAGE.HEIGHT - 10);
}

startGameLoop({ update, render });
