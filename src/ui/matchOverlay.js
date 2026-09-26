import { MATCH } from '../engine/constants.js';
import { PHASE } from '../match/match.js';

const CENTER_X_RATIO = 0.5;

function drawBanner(ctx, lines, { color = '#f1c40f', y = 220 } = {}) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 40px monospace' : 'bold 20px monospace';
    ctx.fillText(line, ctx.canvas.width * CENTER_X_RATIO, y + i * 36);
  });
  ctx.restore();
}

function drawRoundTimer(ctx, match) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eee';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(String(Math.max(0, Math.ceil(match.timeLeft))), ctx.canvas.width * CENTER_X_RATIO, 40);
  ctx.restore();
}

// Small filled/empty pips above each health bar showing round wins toward
// best-of-3 — without this, "best of 3" isn't legible during play.
function drawPipRow(ctx, startX, wins) {
  const pipSize = 12;
  const gap = 6;
  for (let i = 0; i < MATCH.ROUNDS_TO_WIN; i++) {
    const x = startX + i * (pipSize + gap);
    ctx.fillStyle = i < wins ? '#f1c40f' : '#333';
    ctx.strokeStyle = '#666';
    ctx.fillRect(x, 48, pipSize, pipSize);
    ctx.strokeRect(x, 48, pipSize, pipSize);
  }
}

function drawRoundPips(ctx, match) {
  const pipSize = 12;
  const gap = 6;
  drawPipRow(ctx, 20, match.wins.p1);
  drawPipRow(ctx, ctx.canvas.width - 20 - (MATCH.ROUNDS_TO_WIN * (pipSize + gap) - gap), match.wins.p2);
}

function roundEndHeadline(match) {
  if (match.roundEndReason === 'ko') return 'K.O.';
  if (match.roundEndReason === 'timeUp') return 'TIME UP';
  return 'DOUBLE K.O.';
}

function roundEndSubline(match, p1, p2) {
  if (!match.winnerKey) return 'NO WINNER THIS ROUND';
  const winner = match.winnerKey === 'p1' ? p1 : p2;
  return `${winner.label} WINS THE BOUT`;
}

function drawFinisherPlaying(ctx, match, p1, p2) {
  const loser = match.winnerKey === 'p1' ? p2 : p1;
  const finisher = match.finisherToPlay;
  if (!finisher) return;

  if (finisher.type === 'brutal') {
    ctx.save();
    ctx.fillStyle = 'rgba(200, 0, 0, 0.35)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(loser.x - loser.width / 2, loser.y - loser.height, loser.width, loser.height);
    ctx.restore();
    drawBanner(ctx, [finisher.displayName], { color: '#e74c3c', y: 150 });
  } else {
    const shrink = Math.max(0.08, match.phaseTimer / MATCH.FINISHER_PLAY_FRAMES);
    ctx.save();
    ctx.translate(loser.x, loser.y - loser.height / 2);
    ctx.rotate((1 - shrink) * 6);
    ctx.fillStyle = loser.color;
    ctx.fillRect((-loser.width / 2) * shrink, (-loser.height / 2) * shrink, loser.width * shrink, loser.height * shrink);
    ctx.restore();
    drawBanner(ctx, [finisher.displayName], { color: '#f1c40f', y: 150 });
  }
}

function matchEndHeadline(match, p1, p2) {
  if (!match.winnerKey) return 'THE CIRCUIT DRAWS BLOOD FROM NO ONE';
  const winner = match.winnerKey === 'p1' ? p1 : p2;
  return `${winner.label} WINS THE CIRCUIT`;
}

export function drawMatchOverlay(ctx, match, p1, p2) {
  drawRoundTimer(ctx, match);
  drawRoundPips(ctx, match);

  switch (match.phase) {
    case PHASE.ROUND_INTRO:
      drawBanner(ctx, [`ROUND ${match.roundNumber}`, 'DRAW BLOOD!']);
      break;
    case PHASE.ROUND_END:
      drawBanner(ctx, [roundEndHeadline(match), roundEndSubline(match, p1, p2)]);
      break;
    case PHASE.FINISHER_WINDOW:
      drawBanner(ctx, ['END IT!'], { color: '#e74c3c' });
      break;
    case PHASE.FINISHER_PLAYING:
      drawFinisherPlaying(ctx, match, p1, p2);
      break;
    case PHASE.MATCH_END:
      drawBanner(ctx, [matchEndHeadline(match, p1, p2), 'HIGH PUNCH TO FIGHT AGAIN']);
      break;
    default:
      break;
  }
}
