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

## Controls (Milestone 1)

| Action | P1 | P2 |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Crouch | S | Down |
| Jump | W | Up |

Attack buttons (P1: F/G/H/J, P2: Numpad 4/5/6/2) are wired into input reading
already but don't do anything until Milestone 2.

## Project structure

```
index.html
src/
  engine/       game loop, input, state machine, collision, shared constants
  entities/     Fighter class and its state table
  stage/        arena/background rendering, stage bounds
  characters/   per-character data: movesets, frame data, sprite refs (empty until Milestone 5+)
  ui/           HUD: health bars, timer, combo counter (empty until Milestone 3+)
  debug/        hitbox/hurtbox debug overlay (empty until Milestone 2+)
assets/
  sprites/      placeholder boxes for now; sprite sheets land here later
  audio/        SFX + music, hooked up in Milestone 8
```

Character visuals/movesets are meant to be data-driven (sprite sheet + frame
data JSON per character) rather than hardcoded, so re-skinning later is cheap.
