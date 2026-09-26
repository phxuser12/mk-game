# mk-fighter

2D side-view, one-on-one arcade fighting game. Original characters, lore, and
finisher terminology — inspired by the mechanics and tone of mid-90s
button-combo fighters, nothing copyrighted reused.

No build step: plain HTML5 Canvas + vanilla JS ES modules.

## Running it

Browsers block `import`/`export` module loading over `file://`, so serve the
folder over local HTTP with whichever of these you have handy:

```bash
python3 -m http.server 8000
```

or

```bash
npx serve .
```

Then open `http://localhost:8000` (or whatever port it prints).

## Controls (Milestone 3)

| Action | P1 | P2 |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Crouch | S | Down |
| Jump | W | Up |
| High Punch (attack) | F | Numpad 4 |
| Block (hold) | Space | Numpad 0 |
| Run (dash) | Left Shift | Numpad Enter |

Hold Block standing to guard high attacks, or Block+Down to crouch-guard low
attacks — the current single move (High Punch) hits high, so crouch-blocking
it does nothing and it still connects, which is the intended overhead rule.
Blocking chips 2 damage and can't finish a round on its own (floors at 1 HP).

Low Punch/High Kick/Low Kick (P1: G/H/J, P2: Numpad 5/6/2) are wired into
input reading already but don't do anything until Milestone 4's full moveset.

Press `` ` `` (backtick) to toggle the hitbox/hurtbox debug overlay (green =
hurtbox, red = active hitbox).

## Project structure

```
index.html
src/
  engine/       game loop, input, state machine, collision, combat (hitbox/hurtbox), shared constants
  entities/     Fighter class and its state table
  stage/        arena/background rendering, stage bounds
  characters/   per-character data: movesets, frame data, sprite refs (shared placeholder moveset for now)
  ui/           HUD: health bars (done); timer, combo counter land in Milestone 6
  debug/        hitbox/hurtbox debug overlay
assets/
  sprites/      placeholder boxes for now; sprite sheets land here later
  audio/        SFX + music, hooked up in Milestone 8
```

Character visuals/movesets are meant to be data-driven (sprite sheet + frame
data JSON per character) rather than hardcoded, so re-skinning later is cheap.
