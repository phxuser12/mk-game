// Full-screen help/controls reference, toggled by a key in main.js (not
// owned here — this module only draws). Game simulation pauses while it's
// up (see main.js's update()), so reading it never costs you a round.

const PANEL_MARGIN = 40;

function drawLines(ctx, lines, x, y, { lineHeight = 20, align = 'left' } = {}) {
  ctx.textAlign = align;
  let cy = y;
  for (const line of lines) {
    if (line.header) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 16px monospace';
      cy += 6;
    } else {
      ctx.fillStyle = '#eee';
      ctx.font = '14px monospace';
    }
    ctx.fillText(line.text ?? line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

const P1_CONTROLS = [
  { header: true, text: 'P1 CONTROLS' },
  'Move: A / D      Crouch: S      Jump: W',
  'High Punch: F     Low Punch: G',
  'High Kick: H      Low Kick: J',
  'Block (hold): Space      Run: Left Shift',
  'Uppercut: Down + F      Sweep: Down + H',
];

const P2_CONTROLS = [
  { header: true, text: 'P2 CONTROLS' },
  'Move: Left/Right   Crouch: Down   Jump: Up',
  'High Punch: Numpad 7   Low Punch: Numpad 1',
  'High Kick: Numpad 9    Low Kick: Numpad 3',
  'Block (hold): Numpad 5   Run: Numpad Enter',
  'Uppercut: Down + Np7    Sweep: Down + Np9',
];

const TECHNIQUES = [
  { header: true, text: 'MOVES & TECHNIQUES' },
  'Dial-a-combo: High Punch, High Punch, Low Kick, High Kick',
  '  (press each during the previous hit\'s recovery to chain)',
  'Block high attacks standing; hold Block+Down to guard low ones',
  'Uppercut: slow, but launches for a juggle on a clean hit',
  'Sweep: hits low, knocks down, no air launch',
  'Special "Raging Bolt": tap Back, Back, Forward, then High Punch',
];

const FINISHERS = [
  { header: true, text: 'FINISHERS (after clinching the match with a clean K.O.)' },
  'Foundry End (brutal, needs Blood Mode on): Down, Down + High Kick',
  'Barrel Ride (clean, always available): Up, Up + Low Punch',
];

const TOGGLES = [
  { header: true, text: 'TOGGLES' },
  '` (backtick): hitbox/hurtbox debug overlay',
  'B: Blood Mode on/off        P: P2 AI opponent on/off',
  'M: mute            N: show/hide the facing-direction arrow',
  '?: this help screen',
];

export function drawHelpOverlay(ctx) {
  const { width, height } = ctx.canvas;

  ctx.save();
  ctx.fillStyle = '#0a0a0a'; // fully opaque — this is a modal screen, not a HUD layer,
  ctx.fillRect(0, 0, width, height); // so nothing underneath should show through and compete with the text

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('HELP', width / 2, 30);
  ctx.fillStyle = '#888';
  ctx.font = '13px monospace';
  ctx.fillText('(press ? to close)', width / 2, 50);

  const colWidth = (width - PANEL_MARGIN * 2) / 2;
  const colY = PANEL_MARGIN + 40;
  drawLines(ctx, P1_CONTROLS, PANEL_MARGIN, colY, { align: 'left' });
  drawLines(ctx, P2_CONTROLS, PANEL_MARGIN + colWidth, colY, { align: 'left' });

  let y = colY + 6 * 20 + 20;
  y = drawLines(ctx, TECHNIQUES, PANEL_MARGIN, y, { align: 'left' });
  y += 10;
  y = drawLines(ctx, FINISHERS, PANEL_MARGIN, y, { align: 'left' });
  y += 10;
  drawLines(ctx, TOGGLES, PANEL_MARGIN, y, { align: 'left' });

  ctx.restore();
}
