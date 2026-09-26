import { STAGE } from '../engine/constants.js';

// Placeholder arena rendering: flat background + ground line + wall markers.
// Once art direction is locked in, this becomes a background image plus a
// parallax layer, but the ground/wall geometry stays data-driven from STAGE.
export function drawStage(ctx) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, STAGE.WIDTH, STAGE.HEIGHT);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, STAGE.GROUND_Y + 1);
  ctx.lineTo(STAGE.WIDTH, STAGE.GROUND_Y + 1);
  ctx.stroke();

  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(STAGE.LEFT_WALL, 0);
  ctx.lineTo(STAGE.LEFT_WALL, STAGE.HEIGHT);
  ctx.moveTo(STAGE.RIGHT_WALL, 0);
  ctx.lineTo(STAGE.RIGHT_WALL, STAGE.HEIGHT);
  ctx.stroke();
}
