# Character Sprite Generation Brief — "Burak" (Blood Circuit, 2D fighting game)

## Character identity

Burak: a broad-shouldered foundry brawler in an underground bare-knuckle
tournament set in a condemned steel-mill city. Heavyset, physically
imposing, working-class brutalist look — not a superhero, not lean/athletic.

Exact palette (match these hex values precisely across every image so the
character stays visually consistent):

| Part | Color |
| --- | --- |
| Helmet/headgear | `#3C3C41` (dark gunmetal) |
| Skin (face/forearms/hands) | `#C49A6C` (tan) |
| Shoulder pads | `#7F8C8D` (gray metal) |
| Torso garment (heavy vest/apron) | `#B02E26` (rust red) |
| Belt/pants | `#28282D` (near-black) |
| Boots | `#141416` (black), with a `#B02E26` accent stripe at the top of each boot |

## Art direction

Digitized/rotoscoped look: high-contrast, photographic/painterly shading —
NOT clean cartoon or anime style. Think mid-90s arcade fighter digitized
sprites: gritty, physically grounded, dramatic lighting, slightly
desaturated except for the rust-red accent. Moody single-source lighting
(upper-left) is fine and encouraged for consistency across frames.

## Technical spec

- Strict profile / side-view (2D fighting-game camera angle), character
  facing RIGHT in every image. (The game engine mirrors right-facing art
  automatically for when the character faces left — do not generate
  left-facing versions.)
- Transparent background. No ground plane, no floor line, no scenery, no
  drop shadow baked into the image.
- Single character only per sprite, no other figures, no text, no
  watermark, no logos, no filename captions rendered anywhere in the image.
- Character proportions and apparent PHYSICAL SIZE must stay consistent
  across every pose — a punch and an idle stance should depict the same
  size character, just in a different pose.
- **HEIGHT**: every sprite should be approximately 200px tall, and must
  NOT exceed 200px in height. This is a hard cap on height only.
- **WIDTH IS IRREGULAR AND THAT'S EXPECTED** — let width follow naturally
  from the pose's actual shape at that fixed ~200px character scale,
  rather than forcing a fixed canvas: standing/walking poses will end up
  narrower/portrait-ish; an airborne flying kick should end up much wider
  (the body laid out roughly horizontal) since a grounded standing kick
  does not read as "wide" the way an airborne one does. Don't zoom in or
  out to hit a particular width — only height is fixed.
- Generous empty margin/padding around the character within its own
  region of the sheet (see Delivery format below) — limbs extending into
  a kick, punch, or swing must never crop against a neighboring sprite or
  the sheet edge.
- No resemblance to any existing copyrighted character, franchise, or
  logo — Burak must be wholly original.

## Poses and frame counts

Generate each pose as its own numbered sequence of frames showing clear
progression (frame 1 -> frame N), suitable for a looping or one-shot
animation. Recommended frame counts below are a starting point — anywhere
from 3-10 is fine per pose; scale up for anything that should look
especially fluid, scale down for anything brief/subtle.

1. **idle** — 4 frames
   A subtle breathing/weight-shift loop that loops seamlessly (frame 4
   flows back into frame 1): neutral stance -> slight downward
   settle/exhale -> return to neutral -> slight rise/inhale.

2. **walkForward** — 6 frames
   One full walk cycle moving toward the right: right foot contacts
   ground/leg extended forward -> weight passes over right leg, left leg
   lifts -> left leg swings forward under the body -> left foot contacts
   ground/extended forward -> weight passes over left leg, right leg lifts
   -> right leg swings forward under the body. Loops back to frame 1.

3. **walkBack** — 6 frames
   Same gait as walkForward but retreating, with a slight backward lean.

4. **jump** — 4 frames
   Coiled crouch before leaving the ground -> launching, legs tucking ->
   airborne apex, full tuck -> descending, legs extending for landing.

5. **crouch** — 3 frames
   Transitioning down into a crouch -> held low stance -> a subtle
   settle/sway while crouched (for idling in the crouched position).

6. **punch** — 5 frames
   Arm cocked back (wind-up) -> arm driving forward -> full extension /
   impact frame -> arm recoiling -> returning to guard.

7. **kick** — 6 frames
   THIS IS THE AIRBORNE FLYING SIDE KICK (landscape orientation): leaving
   the ground, leg chambering -> body rotating horizontal, leg rising ->
   leg extending toward full reach -> full extension / impact frame ->
   leg retracting -> body rotating back upright for landing.

8. **uppercut** — 6 frames
   Deep coil, knees bent, arm low -> launch begins, arm rising -> arm
   rising through mid-swing -> full extension overhead / impact frame
   (may leave the ground slightly) -> follow-through at the peak ->
   recovering back down to guard.

9. **sweep** — 5 frames
   Dropping into a low crouch -> leg beginning to sweep out low -> full
   extension / impact frame, low to the ground -> leg retracting ->
   rising back to a neutral crouch.

10. **special** — 7 frames
    A charge-and-release projectile throw: hands drawing inward, starting
    to gather energy -> charge intensifying -> hands fully drawn in, peak
    charge -> hands thrust forward, release begins -> release impact
    frame, energy leaving the hands -> follow-through -> recovery back to
    guard.

11. **hitStun** — 3 frames
    Impact recoil snap -> staggered hold -> settling, regaining balance.

12. **launched** — 5 frames
    Popped upward, legs kicking -> rising tumble -> apex of the arc ->
    falling tumble -> falling faster, about to hit the ground.

13. **knockdown** — 4 frames
    Impact landing on the ground -> bounce/settle -> lying still -> a
    subtle twitch/breathing motion while down.

(64 frames total across all poses, at the recommended counts.)

## Delivery format — read carefully, this is the important part

Deliver as ONE combined sheet image (or a small number of sheets if one
image would be too large) containing every sprite frame, PLUS a JSON
coordinate manifest telling us exactly where each one is. Do not deliver
individually-cropped per-frame files — deliver the uncropped sheet itself,
we will do the cropping.

**Sheet requirements**:
- Every individual sprite must be fully isolated within its own region of
  the sheet: NOT overlapping, NOT touching, NOT sharing bounding boxes
  with any other sprite. Leave generous empty gutter space (at least
  30-50px) between every sprite and its neighbors in all directions.
- NO text, filenames, labels, captions, grid lines, or any other markup
  drawn anywhere on the sheet itself — only the sprite artwork.
- Transparent background across the whole sheet.
- Layout can be freeform/packed (sprites of different widths placed at
  different positions) — it does NOT need to be a uniform grid, since
  sprite widths are irregular by design (see Technical spec above).

**Manifest requirements** — JSON ONLY, no CSV, no plain text:
- One entry per sprite, keyed as `<pose>_<frameIndex>` (zero-indexed, e.g.
  `idle_0`, `idle_1`, `punch_0`, `punch_1`, `punch_2`...) matching the pose
  list and frame order above.
- Each entry's bounding box within the sheet: `x`, `y`, `width`, `height`,
  in pixels, measured from the sheet's top-left corner.
- Coordinates don't need to be pixel-perfect — approximate boxes that
  fully contain each sprite (with a little slack) are fine; we'll
  visually true them up on our end if needed.

Required JSON manifest format:

```json
{
  "idle_0": { "x": 20, "y": 20, "width": 150, "height": 200 },
  "idle_1": { "x": 200, "y": 20, "width": 150, "height": 200 },
  "idle_2": { "x": 380, "y": 20, "width": 150, "height": 200 },
  "idle_3": { "x": 560, "y": 20, "width": 150, "height": 200 },
  "punch_0": { "x": 20, "y": 250, "width": 180, "height": 200 },
  "kick_0": { "x": 900, "y": 250, "width": 220, "height": 90 }
}
```
