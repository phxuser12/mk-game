// Shows "N HITS - M DMG" near the top of the screen while a fighter's combo
// tally is fresh. Only surfaces once 2+ hits have connected — a single hit
// isn't a "combo" by genre convention.
export function drawComboCounters(ctx, p1, p2) {
  drawIfActive(ctx, p1, ctx.canvas.width * 0.5 - 160);
  drawIfActive(ctx, p2, ctx.canvas.width * 0.5 + 160);
}

function drawIfActive(ctx, fighter, x) {
  if (fighter.comboDisplayFrames <= 0 || fighter.comboHitCount < 2) return;

  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${fighter.comboHitCount} HITS - ${fighter.comboDamage} DMG`, x, 70);
}
