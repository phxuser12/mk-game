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
- **Sprites, three iterations** (see §4 below for the current state in
  detail):
  1. One static sprite per character, squash-stretched onto the collision
     box. Characters were briefly named Krug/Vesper, then renamed to
     **Emil** (P1) and **Aleks** (P2) — all files/refs updated together.
  2. Expanded to 13 poses per character, one frame each, fixed uniform
     canvas size, fixed-frame feet-anchored drawing (replacing the squash
     hack).
  3. **Current state**: every pose got a second animation frame, and canvas
     sizes became per-pose auto-cropped-to-content instead of uniform —
     this is what makes a kick genuinely render wider-than-tall while a walk
     stays portrait. Full detail in §4.
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
    roster.js                 per-character name/color/sprite-pose-paths
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
  sprites/                       52 PNG files: 13 poses x 2 frames x 2 characters
  audio/                          empty, reserved for real recorded SFX/music later
tools/
  generate_sprites.py             regenerates every file in assets/sprites/ (see §4)
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

This was the most recently built and most iterated-on system — worth
getting right in anyone's mental model.

**Both characters share 100% of their move data.** Emil and Aleks are
mechanically identical; only their name, fallback color, and sprite art
differ (`src/characters/roster.js`). Per-character distinct movesets are
explicitly future work (see §5).

**13 poses, 2 animation frames each, 2 characters = 52 PNG files** in
`assets/sprites/`, named `{character}_{pose}_{0|1}.png`. The poses:

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

**Each pose's canvas is auto-cropped to its own content**, not a shared
fixed size — computed by `tools/generate_sprites.py` at generation time by
taking the bounding box of the pose's drawn parts (both frames) plus an 8px
margin. This is why proportions vary meaningfully: idle/walk stay portrait
(walk is 93×192 for Emil), while the kick is genuinely landscape (~221×86).

**The kick's shape was a deliberate mid-course correction worth
remembering.** A *grounded* standing side-kick keeps the torso upright and
stays portrait even with a leg extended — it does NOT naturally read as
"wider than tall." To get a real landscape aspect, the kick was rebuilt as a
hand-authored **airborne flying kick** with the whole body laid out
horizontally (all limbs sharing a similar height band, spread wide in x) —
see `pose_kick_air()` in the generator script. If more "wide" poses are
wanted later, this is the technique: don't try to force a standing pose
wide, redesign it as airborne/horizontal.

**Frame 0 of most poses is generated, not hand-drawn**, by linearly
interpolating each body part's rectangle between its idle position and its
full-pose (frame 1) position at t=0.5 — see `lerp_parts()`. This gives every
delta-based pose (walk, jump, crouch, punch, uppercut, sweep, special,
hitStun, launched) a "wind-up" first frame for free. Three poses are
hand-authored instead because they're structurally unlike a lerp from
standing: **idle** (can't interpolate toward itself — gets a dedicated
subtle "boxer bob," a small torso/arm dip), **kick** (see above), and
**knockdown** (a lying-down layout with its own small "settle/twitch" second
frame).

**Fighter animation state** (`src/entities/fighter.js`): tracks `this.pose`,
`this.animFrame`, `this.animTimer`. `updateAnimation()` runs every tick from
`update()` (not from `render()` — this matters for testing, see §6): if the
pose changed since last tick, resets to frame 0 immediately (so an attack's
wind-up frame always plays from the start of the swing); otherwise advances
the frame on a fixed timer (`ANIM_FRAME_TICKS = 10`, one rate for every pose
— a real simplification, noted as a future tuning knob if some poses should
animate faster/slower than others).

**Display sizing**: `drawBody()` computes on-screen size as
`sprite.naturalWidth/Height * SPRITE_SCALE` (currently `0.74`), anchored
bottom-center at the fighter's actual `(x, y)`. This is independent of the
collision hurtbox (`this.height`, still a fixed value per state for gameplay
purposes) — the two systems don't need to agree, and don't currently.

**To add or change sprites**: edit `tools/generate_sprites.py` and re-run
`python3 tools/generate_sprites.py` (requires `pip install pillow` — a
one-off authoring dependency, not a game runtime dependency). The script is
parametric: body parts are named rectangles (`head`, `torso`, `sleeve_l`,
`hand_r`, etc.) shifted/stretched from a base skeleton per character
(`EMIL_BASE`/`ALEKS_BASE`). Adding a character means adding a `*_BASE` +
`*_PALETTE` dict with the same keys and a `generate(...)` call. Adding a
pose means a new entry in `POSE_NAMES` + a case in `build_frames()` (or a
simple entry in `DELTA_POSES` if it's a lerp-from-idle transform) — then
wire the new pose key into `roster.js`'s pose list and reference it from a
move's `pose` field. **This script was reconstructed into the repo
specifically so it wouldn't be lost** — it originally only existed in an
ephemeral agent scratchpad; verified byte-identical to the shipped sprites
before committing.

---

## 5. Explicit scope cuts / known limitations

These were deliberate, reasoned decisions, not oversights — worth knowing so
they aren't "discovered" as bugs later:

- **Both characters are mechanically identical.** Same moveset, same combo
  string, same special, same finishers — only cosmetics differ. Real
  per-character movesets are a distinct future project, not a small tweak.
- **No packed sprite sheet / JSON frame data yet** — 52 separate PNG files,
  one per pose+frame. Fine at this scale; would want packing if the roster
  or pose count grows meaningfully.
- **One shared animation frame rate for all poses** (`ANIM_FRAME_TICKS`).
- **A hit connecting on a jump-airborne target** (as opposed to
  uppercut-`launched`) still snaps to ground-level hit-stun rather than
  falling first — the juggle-refresh logic (§2, milestone 5) only special-
  cases the `launched` state.
- **No character-select or versus screen** — the brief's Milestone 8/UI
  checklist item for those was never reached; the game starts directly into
  Emil vs. Aleks.
- **No real recorded audio or art assets** — everything is synthesized
  (Web Audio) or procedurally generated (Pillow rectangles). This was
  explicitly permitted/expected by the original brief, not a shortfall.
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

1. **Per-character distinct movesets** — give Emil and Aleks their own
   normals/specials/finishers instead of sharing everything. The data
   structures already support this (`ROSTER` entries could point at
   character-specific move tables instead of the generic ones); it's
   authoring work, not architecture work.
2. **More poses/frames** — e.g. a proper 3-4 frame walk cycle instead of 2,
   dedicated block-stance art (currently `standingBlock`/no dedicated pose
   falls back to idle), a jump-apex vs. rising vs. falling distinction.
3. **Character select + versus screen** — the brief's UI checklist items
   that were never reached.
4. **A real background/stage image** instead of the flat-fill placeholder
   in `stage/stage.js`.
5. **Sprite sheet packing** if the per-file approach starts to feel
   unwieldy (52 files today; would grow fast with more characters/poses).
6. **Throws/grabs** if genre-authenticity against block turtling matters.
7. **Real recorded audio/art**, whenever that's actually available — the
   architecture is already isolated enough (`audioEngine.js` is the only
   thing `main.js` calls into for sound; `roster.js` is the only thing that
   knows sprite paths) that swapping in real assets shouldn't require
   touching game logic.
