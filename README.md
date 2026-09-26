# mk-fighter — Blood Circuit

2D side-view, one-on-one arcade fighting game. Original characters, lore, and
finisher terminology — inspired by the mechanics and tone of mid-90s
button-combo fighters, nothing copyrighted reused.

**See [VISION.md](VISION.md) for the full build history, architecture map,
design decisions/tradeoffs, known limitations, and suggested next steps** —
read that first if you're picking this project back up after a break.

**Premise**: an underground bare-knuckle tournament recurring every
generation in a condemned steel-mill city, run by a shadow syndicate. Win
the circuit or don't leave it.

**Roster**: **Burak** (P1) — a broad-shouldered foundry brawler in a helmet
and rust-red apron. **Aleks** (P2) — a leaner, hooded scrapper in a blue
wrap. Both currently share the exact same moveset/frame data (see
`src/characters/genericMoves.js` etc.) — only their sprites and name are
distinct so far; per-character movesets are future work.

Each has 13 poses — idle, walk forward/back, jump, crouch, punch, kick,
uppercut, sweep, special, standing hit-reaction, airborne/launched, and
knockdown (see `src/characters/roster.js`) — selected per tick from the
fighter's current state by `poseKeyFor()` in `src/entities/fighter.js`.
High/Low Punch share the punch pose and High/Low Kick share the kick pose
rather than each move getting its own art.

Sprites live one folder per character (`assets/sprites/burak/`,
`assets/sprites/aleks/`), each pose as `<pose>_<frameIndex>.png`. Frame
count varies by pose and is tracked in `FRAME_COUNTS` in `roster.js` —
**all 13 of Burak's poses are now real generated art** (62 frames total,
delivered as one sprite sheet + a JSON coordinate manifest and sliced with
`tools/slice_sprites.py`); **Aleks is still the original procedural
placeholder** (2 frames per pose), to be replaced the same way once art
arrives for him. Frames always restart at index 0 the instant the pose changes (so an attack's
wind-up frame never starts mid-cycle). While attacking, the frame shown is
mapped onto the move's own startup/active/recovery progress rather than a
flat timer, so a move's frames are guaranteed to all be seen exactly once
across its actual on-screen duration regardless of how many frames it has
or how long the move lasts; every other pose loops on a flat timer.

Each pose's canvas is its own native size (not a shared fixed frame) — a
walk stays portrait (taller than wide), while the kick is a genuine flying
side-kick laid out landscape (≈2.5x wider than tall) since a grounded
standing kick doesn't read as "wider than tall" the way an airborne one
does. One shared scale constant (`SPRITE_SCALE` in `fighter.js`) converts
every sprite's native size to on-screen size, so relative body proportions
stay consistent across poses and across procedural-vs-real art. Sprites are
always feet-anchored at the fighter's actual position, independent of the
(still fixed-size) collision hurtbox.

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

## Controls (Milestone 8)

| Action | P1 | P2 |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Crouch | S | Down |
| Jump | W | Up |
| High Punch | F | Numpad 7 |
| Low Punch | G | Numpad 1 |
| High Kick | H | Numpad 9 |
| Low Kick | J | Numpad 3 |
| Block (hold) | Space | Numpad 5 |
| Run (dash) | Left Shift | Numpad Enter |
| Uppercut | Down + High Punch | Down + Numpad 7 |
| Sweep | Down + High Kick | Down + Numpad 9 |

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

**Special (placeholder, shared by both fighters until real characters
exist)**: tap Back, Back, Forward, then High Punch, within about a
third-second window, to throw a projectile ("Raging Bolt"). This is a tap/
charge-style input, not a motion-fighter circle — the game reads the last
few directional taps and checks them against the required pattern. Like the
uppercut, it's telegraphed (slow startup) and can be blocked for chip damage.

**Juggling**: a clean uppercut launches the opponent airborne; any further
clean hit that reaches them before they land extends the juggle (refreshes
their upward momentum, keeps racking up the combo counter) instead of
grounding them into ordinary hit-stun. Reach matters — a normal aimed at
chest height won't connect with someone floating well above it; the
uppercut's own hitbox spans low-to-high specifically so it can anti-air and
juggle.

Press `` ` `` (backtick) to toggle the hitbox/hurtbox debug overlay (green =
hurtbox, red = active hitbox, orange = projectile). Press **B** to toggle
Blood Mode (on by default) — see Finishers below. Press **M** to mute.

## Round structure & finishers

Best of 3 rounds, 99-second round clock. Time-up goes to whoever has more
health (exact tie = a "DOUBLE K.O." draw round — no one scores, play
continues). Round-win pips sit above each health bar.

When a fighter clinches the match (their 2nd round win) **via a clean KO**
— not a time-up decision — the announcer calls **"END IT!"** and opens a
~3-second finisher window. The winner has one code each for two original
finishers, entered the same tap-motion way as a special move:

| Finisher | Type | Input | Gore-gated? |
| --- | --- | --- | --- |
| Foundry End | Brutal | Down, Down + High Kick | Yes (Blood Mode must be on) |
| Barrel Ride | Non-violent | Up, Up + Low Punch | No, always available |

Miss the window (or Blood Mode is off and only Barrel Ride was tried) and
the match just ends on a plain victory screen instead. From the results
screen, either player pressing High Punch starts a fresh rematch.

## Practice mode (AI opponent)

Press **P** to make P2 an AI opponent — off by default, so normal 2-player
controls are unaffected until you ask for it. It's deliberately basic, not
advanced: it walks in when out of range, attacks on a cooldown from the full
moveset (including uppercut/sweep), and reacts to your swings with a guarded
block — but it guesses standing vs. crouching about half the time, so it
won't reliably stop low attacks. It punishes hard once you're in block-stun,
hit-stun, knocked down, or getting up: attack probability jumps from a
cooldown-gated roll to guaranteed. Good enough to test combos and blockstrings
against; not a real opponent.

## Polish: shake, particles, sound

No audio assets exist yet, so every sound is a synthesized placeholder (Web
Audio oscillators/noise) — hit impacts, whiffs, a special's charge-up zap, a
block clank, announcer stings between rounds, and a sparse looping bass pulse
for music while a round is live. All swappable for real recordings later
without touching any other system, since main.js is the only thing that
calls into `src/audio/audioEngine.js`.

Clean hits and finishers throw a particle burst — red/blood-toned if Blood
Mode is on, yellow/white "impact spark" if it's off, so turning gore off is
a real "clean mode," not just a finisher gate. Bigger hits (uppercuts,
sweeps, KOs, finishers) get a noticeably bigger burst and a harder screen
shake; blocked hits get a small gray clash-spark instead.

## Project structure

```
index.html
src/
  engine/       game loop, input, state machine, collision, combat (hitbox/hurtbox), motion buffer, shared constants
  entities/     Fighter class and its state table, Projectile
  stage/        arena/background rendering, stage bounds
  match/        round/match flow: intro banners, timer, best-of-3 scoring, finisher window
  ai/           basic single-player opponent (same input shape as a real player, swappable in main.js)
  fx/           particle bursts, trauma-based screen shake
  audio/        synthesized SFX, announcer stings, background music loop
  characters/   roster (name/color/sprite per character) + shared movesets, combo strings, specials, finishers
  ui/           HUD: health bars, combo counter, round timer/pips, match banners
  debug/        hitbox/hurtbox/projectile debug overlay
assets/
  sprites/
    burak/       one folder per character. <pose>_<frameIndex>.png per file;
    aleks/      frame count varies by pose (see FRAME_COUNTS in roster.js).
                All 13 of Burak's poses are real generated art (delivered as
                a sheet + JSON manifest); Aleks is still the procedural
                placeholder, pending the same treatment.
  audio/        reserved for real recorded SFX/music, once they exist
tools/
  generate_sprites.py    regenerates PROCEDURAL PLACEHOLDER sprites into
                         assets/sprites/<character>/ (Pillow; a one-off
                         authoring dependency, not a runtime one). Skips any
                         pose listed in REAL_ART_POSES so it never overwrites
                         real art.
  slice_sprites.py       slices a REAL ART sheet into per-frame files using
                         a JSON coordinate manifest (--skip to drop bad/
                         contaminated crops, --rename to renumber frames
                         after a drop so indices stay contiguous).
  sprite_generation_brief.md   the brief sent to external AI tools/models to
                         generate a character's sheet + manifest.
```

Character visuals/movesets are meant to be data-driven (sprite sheet + frame
data JSON per character) rather than hardcoded, so re-skinning later is cheap.
