const BAR_WIDTH = 360;
const BAR_HEIGHT = 24;
const MARGIN_TOP = 20;
const MARGIN_SIDE = 20;
const MAX_HEALTH = 100;

// P1's bar drains from the right toward center; P2's drains from the left
// toward center, so both read as "damage eats toward the middle" — the
// mirrored VS-bar convention from the genre.
export function drawHealthBars(ctx, p1, p2) {
  drawBar(ctx, MARGIN_SIDE, MARGIN_TOP, p1.health, false);
  drawBar(ctx, ctx.canvas.width - MARGIN_SIDE - BAR_WIDTH, MARGIN_TOP, p2.health, true);
}

function drawBar(ctx, x, y, health, fillFromRight) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);

  const pct = Math.max(0, health) / MAX_HEALTH;
  const filledWidth = BAR_WIDTH * pct;
  ctx.fillStyle = pct > 0.3 ? '#c0392b' : '#7f1d1d';
  ctx.fillRect(fillFromRight ? x + BAR_WIDTH - filledWidth : x, y, filledWidth, BAR_HEIGHT);

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, BAR_WIDTH, BAR_HEIGHT);
}
