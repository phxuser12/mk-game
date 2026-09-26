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

## Controls (Milestone 4)

| Action | P1 | P2 |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Crouch | S | Down |
| Jump | W | Up |
| High Punch | F | Numpad 4 |
| Low Punch | G | Numpad 5 |
| High Kick | H | Numpad 6 |
| Low Kick | J | Numpad 2 |
| Block (hold) | Space | Numpad 0 |
| Run (dash) | Left Shift | Numpad Enter |
| Uppercut | Down + High Punch | Down + Numpad 4 |
| Sweep | Down + High Kick | Down + Numpad 6 |

Hold Block standing to guard high attacks, or Block+Down to crouch-guard low
attacks. High Punch, Low Punch, and High Kick all hit high; Low Kick is the
one low-hitting normal, so it's the one a crouch guard actually stops.
Blocking chips damage and can't finish a round on its own (floors at 1 HP).

**Uppercut** is slow and telegraphed (long startup and recovery — punishable
if it whiffs) but launches the opponent airborne into a knockdown on a clean
hit. **Sweep** hits low (only a crouch guard stops it) and knocks the
opponent straight down, no air launch.

**Dial-a-combo**: press High Punch, High Punch, Low Kick, High Kick in
sequence — each press during the previous hit's recovery cancels straight
into the next one instead of waiting it out. Miss the window or press the
wrong button and the string drops back to a single hit. A live hit-count/
damage readout appears once a chain reaches 2+ hits.

Press `` ` `` (backtick) to toggle the hitbox/hurtbox debug overlay (green =
hurtbox, red = active hitbox).

## Project structure

```
index.html
src/
  engine/       game loop, input, state machine, collision, combat (hitbox/hurtbox), shared constants
  entities/     Fighter class and its state table
  stage/        arena/background rendering, stage bounds
  characters/   per-character data: movesets, combo strings, sprite refs (shared placeholder data for now)
  ui/           HUD: health bars, combo counter (done); round timer lands in Milestone 6
  debug/        hitbox/hurtbox debug overlay
assets/
  sprites/      placeholder boxes for now; sprite sheets land here later
  audio/        SFX + music, hooked up in Milestone 8
```

Character visuals/movesets are meant to be data-driven (sprite sheet + frame
data JSON per character) rather than hardcoded, so re-skinning later is cheap.
