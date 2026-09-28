# Blood Circuit (mk-game) — Product & Engineering Vision

**Read this first if you're picking this project back up cold.** It's the
"why" and "how we got here" behind the code. `README.md` documents current
player-facing behavior (controls, mechanics); this document documents
decisions, history, and what's deliberately not built yet, so nothing gets
re-litigated or silently lost between sessions.

Repo: [phxuser12/mk-game](https://github.com/phxuser12/mk-game), branch `main`.
Local path: `/home/michal/projects/mk-game`.

**Naming note**: the project was originally scaffolded in a folder called
`mk-fighter` (early commit messages still say "mk-fighter" — that's just a
naming echo, not a different project). The GitHub repo was created as
`mk-game`, so for a while the local folder name and the remote repo name
didn't match — harmless (git doesn't require them to match) but confusing
enough that the local folder was later renamed to `mk-game` too, so
everything lines up now. The in-game product title is neither of these —
it's **Blood Circuit** (§1 below).

---

## 1. What this is

A 2D side-view, one-on-one arcade fighting game called **Blood Circuit**.
Built from a detailed master-prompt brief (mid-90s "brutal digitized fighter"
genre — think button-combo inputs, dark tone, finishing moves — explicitly
**not** motion-input/quarter-circle inputs like Street Fighter). Entirely
original: no copyrighted characters, names, music, or franchise terminology
anywhere, by explicit constraint from day one.

**Tech stack, and why:** plain HTML5 Canvas + vanilla JavaScript ES modules.
**No build step, no bundler, no framework, no npm dependencies.** This was
an explicit constraint from the original brief ("no heavy game framework
dependency unless you recommend one and I approve it first" — Phaser was
considered and explicitly not used). The game runs by opening `index.html`
via any static file server; `<script type="module">` in `index.html` is the
only entry point. ES modules block loading over `file://`, so it must be
served over `http://` (`python3 -m http.server` is what's been used
throughout).

**Premise/lore:** an underground bare-knuckle tournament recurring every
generation in a condemned steel-mill city, run by a shadow syndicate. Win
the circuit or don't leave it. (A second lore option, "The Undertow" —
supernatural island-shrine tournament — was proposed and rejected in favor
of Blood Circuit.)

---

## 2. Build history (why things are shaped the way they are)

Built as 8 sequential milestones from the original brief, then several
rounds of ad-hoc follow-up work. Commit history is accurate and readable —
`git log --oneline` tells the story in order — but here's the reasoning
behind each stage:

1. **Movement** — fixed-timestep game loop decoupled from render, a small
   reusable `StateMachine` class, walk/crouch/jump. Caught and fixed a real
   bug here: the jump state updated `vy` but never integrated it into `y`,
   so fighters "jumped" for the right duration without ever visually leaving
   the ground. Worth remembering as a reminder to actually test physics
   changes, not just read the code.
2. **Combat basics** — one melee hitbox/hurtbox (High Punch), health bars,
   hit-stop (freeze frames on impact).
3. **Block/Run/knockback** — dedicated Block button (not hold-back — a
   deliberate genre choice from the brief), dedicated Run/dash button, chip
   damage, hit-stun vs. block-stun as separate states. Found and fixed a
   fairness bug here: naively mutating state while resolving both fighters'
   hits in the same tick let simultaneous attacks silently cancel one
   side of a trade. Fixed by splitting hit resolution into a pure "compute"
   phase and a separate "apply" phase — `src/engine/combat.js` still works
   this way and any future hit-resolution changes should preserve that split.
4. **Full moveset** — all 4 buttons (High/Low Punch, High/Low Kick), the
   universal Uppercut and Sweep (accessed via crouch + High Punch / crouch +
   High Kick — the classic genre convention, reused rather than inventing
   new bindings), and the "dial-a-combo" chaining system (press the next
   button in a fixed string during the current move's recovery to cancel
   straight into it).
5. **Specials + juggling** — a `MotionBuffer` records directional taps (not
   full motion-fighter circles, per the brief) and matches them against a
   move's required sequence within a frame window. One special exists
   (`ragingBolt`, a projectile — see `src/entities/projectile.js`, a
   traveling hitbox independent of the caster's body). Also fixed a juggle
   gap here: a hit landing on an airborne (`launched`) target now refreshes
   their upward velocity instead of grounding them into ordinary hit-stun —
   that's what makes the uppercut's launch combo-able.
6. **Round/match structure** — `src/match/match.js`'s `Match` class owns
   phase/timer/score state as a small explicit state machine (`roundIntro` →
   `fight` → `roundEnd` or `finisherWindow` → `finisherPlaying` → `matchEnd`).
   Best of 3, 99s clock. Two original finishers exist: **Foundry End**
   (brutal, gore-gated) via `Down, Down + High Kick`, and **Barrel Ride**
   (non-violent, always available) via `Up, Up + Low Punch`. The finisher
   window only opens on a match-clinching **clean KO** — a time-up decision
   never offers one, by design ("you can't finish a decision"). This is also
   where the title "Blood Circuit" was locked in.
7. **AI opponent** — `src/ai/basicAI.js`. Deliberately basic per the brief
   ("doesn't need to be advanced — just enough to test against"): approaches
   when out of range, attacks on a cooldown (guaranteed instead when the
   opponent is in an obvious opening like block-stun/hit-stun/knockdown),
   and blocks reactively but imperfectly (guesses crouch vs. standing guard
   ~50/50, so it won't reliably stop low attacks). Its `decide()` returns
   the exact same input shape `InputManager.getInput()` does, so it's a
   drop-in swap in `main.js` — nothing else in the engine knows an AI exists.
8. **Polish** — trauma-based screen shake, gore-aware particle bursts (red
   when Blood Mode is on, yellow/white "impact spark" when off — so the gore
   toggle does something during normal play, not just finisher-gating), and
   fully synthesized audio (`src/audio/audioEngine.js`, Web Audio
   oscillators/noise — no audio assets exist, this was explicitly permitted
   by the brief as "placeholder/generated tones").

### Post-milestone work (user-directed, ad hoc)

- **GitHub setup**: origin is `git@github.com:phxuser12/mk-game.git` over
  **SSH**, not HTTPS — HTTPS was requested first but this environment has no
  stored HTTPS git credential, only a working SSH key already authorized for
  the `phxuser12` account. Branch renamed `master` → `main`, set as GitHub's
  default branch, old `master` deleted.
- **Sprites, five iterations, plus a later name change** (see §4 below for
  the current state in detail):
  1. One static sprite per character, squash-stretched onto the collision
     box. Characters were briefly named Krug/Vesper, then renamed to
     **Emil** (P1) and **Aleks** (P2) — all files/refs updated together.
     (P1 was later renamed again, to **Burak** — see below. All file paths,
     variable names, etc. in this doc use the current name, Burak, even
     when describing work that happened while the character was still
     called Emil.)
  2. Expanded to 13 poses per character, one frame each, fixed uniform
     canvas size, fixed-frame feet-anchored drawing (replacing the squash
     hack).
  3. Every pose got a second animation frame, and canvas sizes became
     per-pose auto-cropped-to-content instead of uniform — this is what
     makes a kick genuinely render wider-than-tall while a walk stays
     portrait.
  4. `VISION.md` (this doc) and `tools/generate_sprites.py` were added to
     the repo, and the local folder was renamed `mk-fighter` → `mk-game` to
     match the GitHub repo name (see the naming note at the top of this
     doc).
  5. The first REAL (externally generated, not procedural) art arrived —
     `idle` (4 frames) and `punch` (5 frames), from an AI image-generation
     brief (see §4's "generation brief" note). This forced two real
     changes: sprites moved from flat
     `assets/sprites/{character}_{pose}_{frame}.png` into one folder per
     character, since art will now keep arriving character-by-character
     and pose-by-pose over time; and a real bug got caught and fixed —
     animation used a single flat "10 ticks per frame" rate, which made a
     5-frame punch's frames 2-4 mathematically unreachable within High
     Punch's 20-tick total duration. Fixed by mapping attack-pose frames
     onto the move's own startup+active+recovery progress instead of a
     flat timer. Full detail in §4.
  6. A second real-art batch was attempted (all 13 poses, individually
     exported files) but failed QA — roughly half the poses had visible
     duplicate/ghosted figures and baked-in filename text, apparently from a
     mis-cropped contact-sheet pipeline. Caught by building a per-pose
     contact sheet and visually reviewing every frame before integrating
     anything; nothing from that batch was integrated. The delivery format
     was changed as a result: batches now come as one sheet image + a JSON
     coordinate manifest (bounding box per sprite), sliced on this end
     instead of relying on an external auto-crop step.
  7. **Current state**: a third batch, using the new sheet+manifest
     workflow, succeeded — all 13 of Burak's poses are now real generated
     art (62 frames, via `tools/slice_sprites.py`). 2 of the manifest's 64
     declared crops (`walkBack_5`, `jump_2`) were misaligned/fragmented and
     dropped; everything else was clean. See §4 for full detail. Aleks is
     still the original procedural placeholder throughout.
- **Character rename: Emil → Burak.** Purely cosmetic — name, `ROSTER` key,
  and the `assets/sprites/` folder name all changed; no behavior, palette,
  or art changed. If anything in git history, old filenames, or an old copy
  of the generation brief still says "Emil," that's the same character.
- **P2 key remap**: attack/block buttons moved from Numpad 4/5/6/2/0 to
  Numpad 7/1/9/3/5 (a deliberate layout: top corners = High Punch/Kick,
  bottom corners = Low Punch/Kick, center = Block). Run stayed Numpad Enter.

---

## 3. Architecture map

```
index.html                 entry point; <script type="module" src="./src/main.js">
src/
  main.js                  the only "world coordinator" — owns p1/p2/match/ai/particles/
                            shake/projectiles, wires update()/render(), the only thing
                            that imports src/audio/*
  engine/
    loop.js                fixed-timestep game loop (60fps sim, decoupled from render)
    input.js                keyboard state -> per-player input struct (see KEY_BINDINGS)
    stateMachine.js         generic enter/update/exit FSM, used by Fighter
    collision.js             body-to-body push-apart (not hitboxes — see combat.js)
    combat.js                hitbox/hurtbox resolution; compute/apply split (see §2.3)
    motionBuffer.js           records directional taps, matches against move input patterns
    constants.js              STAGE, PHYSICS, FIGHTER, COMBAT, MATCH tuning values
    universalMoves.js         uppercut + sweep (shared by ALL characters, permanently)
    utils.js                  clamp()
  entities/
    fighter.js               the Fighter class: state, physics, sprite/animation, drawing
    fighterStates.js          the actual state table (idle/walk/attack/block/stun/etc.)
    projectile.js             traveling hitbox entity (independent of its owner's body)
  characters/
    roster.js                 per-character name/color/sprite-pose-paths, FRAME_COUNTS (§4)
    genericMoves.js           High/Low Punch/Kick frame data (shared placeholder — see §5)
    genericCombo.js            the one dial-a-combo string
    genericSpecials.js         the one special move (ragingBolt)
    genericFinishers.js        the two finishers (Foundry End, Barrel Ride)
  match/match.js              Match class: round/phase/timer/score state machine
  ai/basicAI.js                the single-player opponent
  fx/
    particles.js               generic burst particle system
    screenShake.js              trauma-based camera shake
  audio/audioEngine.js         ALL sound (synthesized, see §2 milestone 8)
  ui/
    healthBar.js, comboCounter.js, matchOverlay.js   HUD rendering
  debug/debugDraw.js            hitbox/hurtbox/projectile debug overlay (backtick key)
  stage/stage.js                 arena background (flat fill + lines, no image yet)
assets/
  sprites/
    burak/, aleks/                 one folder per character, <pose>_<frameIndex>.png;
                                   frame count varies per pose (see §4, FRAME_COUNTS)
  audio/                          empty, reserved for real recorded SFX/music later
tools/
  generate_sprites.py             regenerates PROCEDURAL PLACEHOLDER sprites only —
                                   skips any pose in REAL_ART_POSES (see §4)
```

**Fighter states** (the actual FSM in `fighterStates.js`): `idle`,
`walkForward`, `walkBack`, `crouch`, `jump`, `attacking`, `running`,
`standingBlock`, `crouchBlock`, `hitStun`, `blockStun`, `launched`,
`knockdown`, `gettingUp`.

**Move data is fully data-driven.** Every move object (in `genericMoves.js`,
`universalMoves.js`, `genericSpecials.js`) carries: `startup`/`active`/
`recovery` (frame counts at 60fps), `damage`, `chipDamage`, `hitStunFrames`,
`blockStunFrames`, `knockback`, `chipKnockback`, `low` (bool — which guard
stops it), `onHit` (`'launch'`/`'knockdown'`/default hit-stun), `pose` (which
sprite pose to show), and for projectiles: `projectile: true` plus
`projectileSpeed`/`Width`/`Height`/`OffsetY`/`LifetimeFrames` and an `input`
descriptor for the motion buffer. Adding a new move means adding a new data
object, not new engine code, **as long as its behavior fits the existing
shapes** (a genuinely novel mechanic still needs engine work).

---

## 4. Sprites & animation (current state, in detail)

This has been the most iterated-on system in the project — worth getting
right in anyone's mental model, and it's actively evolving (real art is
being generated pose-by-pose, character-by-character, ongoing).

**Both characters share 100% of their move data.** Burak and Aleks are
mechanically identical; only their name, fallback color, and sprite art
differ (`src/characters/roster.js`). Per-character distinct movesets are
explicitly future work (see §5).

**13 poses** (unchanged since the last redesign):

| Pose | Fighter states/moves it covers |
|---|---|
| `idle` | idle |
| `walkForward` / `walkBack` | walking, and `running` reuses `walkForward` |
| `jump` | airborne (jump state) |
| `crouch` | crouching, and `crouchBlock` reuses it |
| `punch` | **High Punch and Low Punch both** (shared, not distinct) |
| `kick` | **High Kick and Low Kick both** (shared, not distinct) |
| `uppercut` | the uppercut only |
| `sweep` | the sweep only |
| `special` | the projectile throw |
| `hitStun` | standing hit reaction, and `blockStun` reuses it |
| `launched` | airborne after an uppercut, or hit again while airborne |
| `knockdown` | lying down, and `gettingUp` reuses it |

The state → pose mapping lives in `poseKeyFor()` in `src/entities/fighter.js`.

### File layout: one folder per character

`assets/sprites/burak/` and `assets/sprites/aleks/`, each containing
`<pose>_<frameIndex>.png` (zero-indexed, no character prefix — the folder
*is* the namespace). This replaced an earlier flat
`assets/sprites/{character}_{pose}_{frame}.png` layout once real art started
arriving character-by-character and pose-by-pose rather than all at once.

**Frame count is per-pose, per-character, and varies.** `roster.js`'s
`FRAME_COUNTS` map tracks how many frames actually exist for each
pose/character pair; anything not listed defaults to 2 (the original
procedural placeholder count). `buildSprites()` generates the actual path
arrays from that count. **As of now**: all 13 of Burak's poses are **real
generated art** (62 frames total — see the generation brief described
below), replacing every procedural placeholder he had. Aleks is still fully
the original procedural placeholder, at 2 frames per pose.

### Procedural placeholder art (everything not yet replaced)

`tools/generate_sprites.py` (Pillow) draws simple rectangle body parts
(head/torso/limbs as named, colored rects) and is what produced every
sprite that hasn't been replaced by real art yet. Key techniques, still
true for whatever it still generates:

- **Each pose's canvas is auto-cropped to its own content**, not a shared
  fixed size — the bounding box of the pose's drawn parts (both frames)
  plus an 8px margin. This is why proportions vary meaningfully: idle/walk
  stay portrait (walk is 93×192 for Burak), while the kick is genuinely
  landscape (~221×86).
- **The kick's shape was a deliberate mid-course correction worth
  remembering** (and worth telling any future artist/AI generating real
  kick art): a *grounded* standing side-kick keeps the torso upright and
  stays portrait even with a leg extended — it does NOT naturally read as
  "wider than tall." To get a real landscape aspect, the kick was rebuilt as
  a hand-authored **airborne flying kick** with the whole body laid out
  horizontally (all limbs sharing a similar height band, spread wide in x)
  — see `pose_kick_air()` in the script.
- **Frame 0 of most poses is generated, not hand-drawn**, by linearly
  interpolating each body part's rectangle between its idle position and
  its full-pose (frame 1) position at t=0.5 — see `lerp_parts()`. Three
  poses are hand-authored instead because they're structurally unlike a
  lerp from standing: idle (dedicated subtle "boxer bob"), kick (see
  above), and knockdown (a lying-down layout with its own small
  "settle/twitch" second frame).
- `REAL_ART_POSES` at the top of the script lists which poses to SKIP
  generating, per character, because real art now exists there — currently
  all 13 for `"burak"` (so the script now skips Burak entirely and only
  still generates Aleks), `set()` for `"aleks"`. **Update this set whenever
  more real art lands**, so re-running the script never overwrites it.

### Real art: the generation brief, and the sheet+manifest workflow

Real frames are sourced from external AI image generators/agents, fed a
detailed written brief (character identity + exact hex palette + art
direction + technical spec + a per-pose frame-count/motion-progression
table + delivery/naming format). The brief is now saved in the repo at
`tools/sprite_generation_brief.md` (previously it only lived in chat history
— that was flagged as a gap and fixed).

**Delivery format** (settled after one earlier failed attempt — see §2's
"five iterations" list, item 6): individually-exported per-frame files
turned out unreliable — an external tool's own auto-crop step produced
duplicate/ghosted figures and baked-in filename text on several poses. The
fix: the brief now asks for one combined **sprite sheet image** (arbitrary
packed layout, transparent background, sprites isolated by 30-50px gutters,
no baked-in text/labels/gridlines) plus a **JSON coordinate manifest**
(`{"<pose>_<frameIndex>": {"x","y","width","height"}, ...}`), and cropping
happens on this end with `tools/slice_sprites.py` instead of trusting
whatever the generation tool's own export step does. Sprite height is
capped at ~200px; width is intentionally irregular per pose (a kick is much
wider than a walk).

**This workflow was used successfully for Burak's full 13-pose batch.** Of
the manifest's 64 declared crops, 62 were clean; 2 (`walkBack_5`, `jump_2`)
had manifest coordinates that landed on the gap/boundary between two
neighboring figures on the sheet rather than on a full pose, producing
sliver/fragment crops. Caught the same way as the previous batch's
contamination — building a per-pose contact sheet from the actual crops and
reviewing every frame before touching `assets/sprites/`. Rather than reject
the whole batch (as happened last time, when roughly half the poses were
bad), the 2 bad crops were dropped and `walkForward_3`/`jump_3` (the next
good frame after each gap) were renumbered down to keep frame indices
contiguous, via `slice_sprites.py --skip ... --rename jump_3=jump_2`. Net
result: `walkBack` has 5 frames and `jump` has 3 instead of the brief's
recommended 6 and 4 — one frame short in each case, not a quality problem.

Recommended frame counts reasoned out per pose in the brief (a starting
point, not a rule — actual delivered counts can and do vary, per the above):
idle 4, walkForward/walkBack 6, jump 4, crouch 3, punch 5, kick 6, uppercut
6, sweep 5, special 7, hitStun 3, launched 5, knockdown 4. Burak's actual
counts: idle 4, walkForward 6, walkBack 5, jump 3, crouch 3, punch 5, kick
6, uppercut 6, sweep 5, special 7, hitStun 3, launched 5, knockdown 4.

### Fighter animation state (`src/entities/fighter.js`)

Tracks `this.pose`, `this.animFrame`, `this.animTimer`. `updateAnimation()`
runs every tick from `update()` (not from `render()` — this matters for
testing, see §6): if the pose changed since last tick, resets to frame 0
immediately (so an attack's wind-up frame always plays from the start of
the swing).

**Two different advancement rules, and the distinction matters:**

- **While attacking** (`fsm.is('attacking')` with an `activeMove`): the
  frame shown is computed directly from the move's own progress —
  `animFrame = floor((attackFrame / totalMoveFrames) * frameCount)`, where
  `totalMoveFrames = startup + active + recovery`. This guarantees every
  frame gets shown exactly once, spread evenly across the move's actual
  on-screen duration, regardless of frame count or move length.
- **Every other pose** (idle, walk, jump, crouch, hitStun, launched,
  knockdown — none of which have a fixed "total duration" to map onto):
  loops on a flat timer, `ANIM_FRAME_TICKS = 10` ticks per frame, one rate
  for all of them (a real simplification — a future tuning knob if some
  should animate faster/slower).

**This distinction exists because of a real bug, caught by testing, worth
remembering as a pattern:** the flat-timer approach was originally used for
*every* pose, including attacks. That's fine as long as frame count stays
low, but the instant Burak's punch went from 2 procedural frames to 5 real
frames, it broke completely — 5 frames at 10 ticks/frame need 50 ticks to
cycle through once, but High Punch's entire startup+active+recovery is only
20 ticks long. Frames 2, 3, and 4 were mathematically unreachable; the move
would always finish and return to idle while still stuck on frame 0 or 1.
**The lesson: any time a pose's frame count changes, check whether that
pose is duration-bound (an attack) or not — a flat animation rate silently
stops working once frame count and duration drift out of proportion, and it
fails quietly (no error, just frames never showing) rather than loudly.**

### Display sizing

`drawBody()` computes on-screen size as `sprite.naturalWidth/Height *
SPRITE_SCALE` (currently `0.74`), anchored bottom-center at the fighter's
actual `(x, y)`. This is independent of the collision hurtbox (`this.height`,
still a fixed value per state for gameplay purposes) — the two systems don't
need to agree, and don't currently. This also means procedural placeholder
art and real art can have wildly different native pixel dimensions — Burak's
real frames are irregular per pose (height ~200px, width free-varying, per
the generation brief's spec), procedural poses vary per pose too — and still
render at consistent relative on-screen size, with zero per-pose code.

**To integrate a new batch of real art delivered as a sheet + manifest**
(the current expected workflow): run `tools/slice_sprites.py <sheet>
<manifest> <character>`, reviewing a per-pose contact sheet of the actual
crops before trusting them (per the QA process described above — don't
skip this, it has caught real contamination twice). Use `--skip` to drop
any bad crops and `--rename` to keep frame indices contiguous afterward.
Then update that pose's count in `FRAME_COUNTS` in `roster.js`, and add the
pose to `REAL_ART_POSES` in `tools/generate_sprites.py` so the procedural
generator never overwrites it. Check whether the pose is duration-bound (an
attack move) — if the frame count changed meaningfully, sanity-check that
`updateAnimation()`'s two rules (above) still make sense for it, per the bug
that was caught the first time real art landed.

**To add or change PROCEDURAL placeholder sprites**: edit
`tools/generate_sprites.py` and re-run `python3 tools/generate_sprites.py`
(requires `pip install pillow` — a one-off authoring dependency, not a game
runtime dependency). The script is parametric: body parts are named
rectangles (`head`, `torso`, `sleeve_l`, `hand_r`, etc.) shifted/stretched
from a base skeleton per character (`BURAK_BASE`/`ALEKS_BASE`). Adding a
character means adding a `*_BASE` + `*_PALETTE` dict with the same keys and
a `generate(...)` call. Adding a pose means a new entry in `POSE_NAMES` + a
case in `build_frames()` (or a simple entry in `DELTA_POSES` if it's a
lerp-from-idle transform) — then wire the new pose key into `roster.js`'s
pose list and reference it from a move's `pose` field. **This script was
reconstructed into the repo specifically so it wouldn't be lost** — it
originally only existed in an ephemeral agent scratchpad; verified
byte-identical to the shipped sprites
before committing.

---

## 5. Explicit scope cuts / known limitations

These were deliberate, reasoned decisions, not oversights — worth knowing so
they aren't "discovered" as bugs later:

- **Both characters are mechanically identical.** Same moveset, same combo
  string, same special, same finishers — only cosmetics differ. Real
  per-character movesets are a distinct future project, not a small tweak.
- **No packed sprite sheet / JSON frame data at runtime** — real art now
  *arrives* as a sheet + manifest, but `tools/slice_sprites.py` slices it
  into one separate PNG file per pose+frame before the game ever loads it
  (Burak alone is already 62 files across 13 poses with mixed frame counts).
  Fine at this scale; would want the game itself to load a packed sheet
  directly if the roster or pose/frame counts grow much further.
- **Non-attack poses share one animation frame rate** (`ANIM_FRAME_TICKS`)
  — attack poses no longer do (see §4's duration-mapping fix), but idle/
  walk/jump/crouch/hitStun/launched/knockdown all still advance at the same
  flat rate regardless of frame count.
- **A hit connecting on a jump-airborne target** (as opposed to
  uppercut-`launched`) still snaps to ground-level hit-stun rather than
  falling first — the juggle-refresh logic (§2, milestone 5) only special-
  cases the `launched` state.
- **No character-select or versus screen** — the brief's Milestone 8/UI
  checklist item for those was never reached; the game starts directly into
  Burak vs. Aleks.
- **No real recorded audio yet** — all sound is synthesized (Web Audio).
  This was explicitly permitted/expected by the original brief, not a
  shortfall. **Art is a partial exception**: all 13 of Burak's poses are now
  real generated art; Aleks is still fully procedurally generated (Pillow
  rectangles), pending the same sheet+manifest treatment (§4).
- **The AI is intentionally weak** — per the brief's own words, "doesn't
  need to be advanced." Don't "fix" its imperfect block-guessing without
  being asked; that's a feature, not a bug.
- **No throws/grabs** — the original brief mentioned these as beating
  blocking, but they were never assigned to a milestone and were never
  built.

---

## 6. How to run and test it

```bash
cd /home/michal/projects/mk-game
python3 -m http.server 8000
```
Then open `http://localhost:8000` in a **real browser** (Chrome/Firefox/
Safari — not a terminal, not this agent's automation tooling). `file://`
won't work (ES modules block it).

### Automated tests: `npm test`

A `node:test` suite (`tests/`, 61 tests as of this writing) covers the
engine's pure logic — state machine, motion-buffer special-input matching,
collision, hit/block/juggle resolution, Fighter movement/animation, round/
match phase flow, and move/roster data sanity. No test framework dependency
(Node ships `node:test`/`node:assert` built in), no build step, matching the
project's zero-npm-dependency approach — `package.json` exists purely to
declare `"type": "module"` and the `npm test` script.

Two tests exist specifically as regression guards for real bugs caught
during development (§2/§4 tell the full stories): the jump-integration bug
(`tests/fighter.test.js`, "y must integrate vy, not just track it") and the
attack-animation frame-duration-mapping bug (`tests/fighter.test.js`,
"visits every frame"). If either of these ever starts failing again, it
means that exact class of bug has resurfaced. `tests/combat.test.js` also
has a direct regression test for the Milestone 3 simultaneous-hit-trade bug
(both fighters landing a hit on the same tick must both register).

**What isn't covered, and why**: rendering (`draw()`/`drawBody()`), audio
(`audioEngine.js`), and raw keyboard handling (`InputManager`'s
`window.addEventListener` wiring) all need a real browser and aren't
exercised here — see "If you're an agent testing this without a real
display" below for how those get verified instead (manually, per change,
not via this automated suite). `tests/helpers/domShim.js` stubs the *only*
browser global the testable logic actually touches — `Image`, used by
`Fighter`'s constructor to preload sprite frames — which is what makes it
possible to construct and drive a real `Fighter`/`Match` in plain Node at
all.

Runs in CI on every push/PR to `main` via `.github/workflows/test.yml`
(`actions/setup-node` + `npm test`, no install step needed — zero
dependencies).

### If you're an agent testing this without a real display

The automated browser tooling used throughout this project's development
runs pages in a backgrounded/non-visible tab state, which means
**`requestAnimationFrame` never fires naturally** — `document.hidden` is
`true` the whole time. Practical consequences, learned the hard way more
than once:

- **"Navigate and check the console for errors" only proves the module
  loaded and ran its top-level synchronous code.** It does NOT prove
  `update()`/`render()` work, because they never get called without manual
  intervention. Always verify by adding a temporary debug hook
  (`window.__debug = { p1, p2, match, ctx, update, render }` near the top
  of `main.js`) and manually driving `update(1/60)`/`render()` in a loop
  from `javascript_exec`, then removing the hook before committing.
- **Pixel-sample or intercept `ctx.drawImage`** to verify rendering
  correctness (which sprite/pose/frame actually got drawn, what size) —
  don't trust "no exceptions" alone once multiple sprites/sizes are in play.
- **A caching quirk in this specific browser automation tool**: it has
  repeatedly served a stale cached copy of a JS file even immediately after
  restarting the dev server on a brand-new port. The reliable workaround:
  a cache-busted dynamic `import('/src/main.js?probe=' + Date.now())`
  forces a genuinely fresh fetch when this is suspected. This is a quirk of
  the automation layer, not a real per-origin browser caching bug, and
  doesn't affect a normal human opening the page in a real browser.
- The match starts in the `roundIntro` phase, which freezes gameplay
  simulation (`Match.update()` returns `{ simulate: false }`) — tests that
  need `p1.update()`/`p2.update()` to actually run must first advance ~91
  ticks to reach the `fight` phase (`MATCH.ROUND_INTRO_FRAMES = 90`).
- Forcing `fighter.fsm.transition('someState')` directly in a test bypasses
  that state's own entry logic — e.g. forcing `'walkForward'` with no real
  movement key held will immediately self-revert to `'idle'` on the very
  next `update()`, because `walkForward`'s own state logic checks for held
  input and bails if none is present. Dispatch real `KeyboardEvent`s instead
  when testing input-dependent states.

---

## 7. Suggested next steps (not started, in rough priority order)

Nothing here is committed to — this is a menu, not a roadmap promise.

1. **Keep replacing procedural placeholder art with real art**: Burak is
   fully real art now (13/13 poses); all 13 Aleks poses are still
   procedural. Use the same sheet+manifest workflow (`tools/
   sprite_generation_brief.md` + `tools/slice_sprites.py`) — swap the
   identity/palette paragraph in the brief for Aleks and send it out. Each
   new batch needs: slice with `--skip`/`--rename` after a contact-sheet QA
   pass, `FRAME_COUNTS` updated in `roster.js`, the pose added to
   `REAL_ART_POSES` in `generate_sprites.py`, and (if it's an attack pose) a
   sanity-check that the duration-mapping animation logic in §4 still makes
   sense for it. Also worth revisiting: `walkBack` and `jump` are one frame
   short of the brief's own recommendation (5 vs. 6, 3 vs. 4) because of the
   2 dropped crops — a touch-up batch could fill just those two gaps.
2. **Per-character distinct movesets** — give Burak and Aleks their own
   normals/specials/finishers instead of sharing everything. The data
   structures already support this (`ROSTER` entries could point at
   character-specific move tables instead of the generic ones); it's
   authoring work, not architecture work.
3. **More frames on poses that still feel choppy** — e.g. a proper 4-6
   frame walk cycle (the generation brief's own recommendation) instead of
   2, dedicated block-stance art (currently `standingBlock`/no dedicated
   pose falls back to idle), a jump-apex vs. rising vs. falling distinction.
4. **Character select + versus screen** — the brief's UI checklist items
   that were never reached.
5. **A real background/stage image** instead of the flat-fill placeholder
   in `stage/stage.js`.
6. **Sprite sheet packing** if the per-file approach starts to feel
   unwieldy as more real art (with larger, less compressible file sizes
   than the tiny procedural placeholders) keeps arriving.
7. **Throws/grabs** if genre-authenticity against block turtling matters.
8. **Real recorded audio**, whenever that's actually available —
   `audioEngine.js` is the only thing `main.js` calls into for sound, so
   swapping in real recordings shouldn't require touching game logic.
