import { getHurtbox, getActiveHitbox } from '../engine/combat.js';

// Outlines hurtboxes (green), any live melee hitbox (red), and any live
// projectile (orange). Toggled from main.js with the backtick key so it
// never collides with either player's bindings.
export function drawDebugOverlay(ctx, fighters, projectiles = []) {
  ctx.save();
  ctx.lineWidth = 2;

  for (const f of fighters) {
    const hurt = getHurtbox(f);
    ctx.strokeStyle = '#2ecc71';
    ctx.strokeRect(hurt.x, hurt.y, hurt.width, hurt.height);

    const hit = getActiveHitbox(f);
    if (hit) {
      ctx.strokeStyle = '#e74c3c';
      ctx.strokeRect(hit.x, hit.y, hit.width, hit.height);
    }
  }

  ctx.strokeStyle = '#f39c12';
  for (const p of projectiles) {
    const box = p.getBox();
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  }

  ctx.restore();
}
