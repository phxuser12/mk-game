#!/usr/bin/env python3
"""Generates placeholder sprites into assets/sprites/<character>/ folders.

Run from anywhere with: python3 tools/generate_sprites.py
Requires Pillow (pip install pillow) — a one-off authoring dependency, not a
runtime dependency of the game itself (the game stays 100% vanilla JS/Canvas).

This is authoring tooling, not shipped game code. It exists so the
PROCEDURAL PLACEHOLDER sprite set is reproducible/extendable (add a
character, add a pose, retune a limb position) without reverse-engineering
shipped PNGs by hand. See VISION.md for the full story of how this evolved.

IMPORTANT: as real (hand-drawn/AI-generated) art replaces a character's
placeholder for a given pose, add that pose to REAL_ART_POSES below so this
script skips it — running this script must never silently overwrite real
art. Update src/characters/roster.js's FRAME_COUNTS to match whenever a
pose's frame count changes (real art or otherwise).
"""

from PIL import Image, ImageDraw
import os

SPRITES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sprites")

# Poses that now have real art and must NOT be regenerated procedurally.
REAL_ART_POSES = {
    "burak": {
        "idle", "walkForward", "walkBack", "jump", "crouch", "punch",
        "kick", "uppercut", "sweep", "special", "hitStun", "launched",
        "knockdown",
    },
    "aleks": set(),
}

# Base skeleton coordinates are authored in this reference space; each pose's
# actual PNG canvas is auto-cropped to that pose's own content afterward, so
# poses end up with genuinely different frame sizes (a kick comes out wider
# than tall, a walk stays portrait) without hand-picking dimensions.
OFFSET_X = 25
OFFSET_Y = 15
CANVAS_MARGIN = 8  # padding added around each pose's auto-computed content bounds


def shift(r, dx=0, dy=0):
    return (r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy)


def stretch_y(r, top=None, bottom=None):
    x0, y0, x1, y1 = r
    return (x0, top if top is not None else y0, x1, bottom if bottom is not None else y1)


def stretch_x(r, left=None, right=None):
    x0, y0, x1, y1 = r
    return (left if left is not None else x0, y0, right if right is not None else x1, y1)


def lerp_rect(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


def lerp_parts(base, full, t):
    # frame0 (t=0.5) is the halfway point between idle and the full pose —
    # this is how every delta-based pose gets a "wind-up" first frame for
    # free, without hand-authoring a second full pose per move.
    return {k: (lerp_rect(base[k], full[k], t) if k in base else full[k]) for k in full}


# ---------------------------------------------------------------------------
# Base (idle) part rects, per character. Both share the same key set so the
# pose functions below work generically on either one. To add a character:
# add a BASE dict + PALETTE dict with the same keys (shoulder_l/shoulder_r
# are optional — see Aleks, who has none) and add a generate(...) call at
# the bottom.
# ---------------------------------------------------------------------------

BURAK_BASE = {
    "head": (28, 4, 62, 34),
    "face": (33, 24, 57, 36),
    "shoulder_l": (10, 38, 30, 58),
    "shoulder_r": (60, 38, 80, 58),
    "torso": (22, 42, 68, 112),
    "belt": (22, 104, 68, 116),
    "sleeve_l": (6, 42, 26, 88),
    "hand_l": (2, 84, 24, 108),
    "sleeve_r": (64, 42, 84, 88),
    "hand_r": (66, 84, 88, 108),
    "leg_l": (26, 112, 45, 164),
    "leg_r": (47, 112, 66, 164),
    "boot_l": (22, 160, 48, 178),
    "stripe_l": (22, 160, 48, 164),
    "boot_r": (44, 160, 70, 178),
    "stripe_r": (44, 160, 70, 164),
}

ALEKS_BASE = {
    "head": (28, 2, 62, 32),
    "face": (34, 20, 56, 30),
    "torso": (30, 34, 60, 108),
    "belt": (30, 100, 60, 110),
    "sleeve_l": (14, 36, 32, 84),
    "hand_l": (10, 80, 30, 104),
    "sleeve_r": (58, 36, 76, 84),
    "hand_r": (60, 80, 80, 104),
    "leg_l": (30, 108, 44, 162),
    "leg_r": (46, 108, 60, 162),
    "boot_l": (26, 158, 48, 178),
    "stripe_l": (26, 158, 48, 162),
    "boot_r": (42, 158, 64, 178),
    "stripe_r": (42, 158, 64, 162),
}

BURAK_BASE = {k: shift(v, dx=OFFSET_X, dy=OFFSET_Y) for k, v in BURAK_BASE.items()}
ALEKS_BASE = {k: shift(v, dx=OFFSET_X, dy=OFFSET_Y) for k, v in ALEKS_BASE.items()}

BURAK_PALETTE = {
    "head": (60, 60, 65, 255),
    "face": (196, 154, 108, 255),
    "shoulder_l": (127, 140, 141, 255),
    "shoulder_r": (127, 140, 141, 255),
    "torso": (176, 46, 38, 255),
    "belt": (40, 40, 45, 255),
    "sleeve_l": (176, 46, 38, 255),
    "hand_l": (196, 154, 108, 255),
    "sleeve_r": (176, 46, 38, 255),
    "hand_r": (196, 154, 108, 255),
    "leg_l": (40, 40, 45, 255),
    "leg_r": (40, 40, 45, 255),
    "boot_l": (20, 20, 22, 255),
    "stripe_l": (176, 46, 38, 255),
    "boot_r": (20, 20, 22, 255),
    "stripe_r": (176, 46, 38, 255),
}

ALEKS_PALETTE = {
    "head": (44, 62, 80, 255),
    "face": (30, 30, 34, 255),
    "torso": (41, 128, 185, 255),
    "belt": (25, 90, 135, 255),
    "sleeve_l": (41, 128, 185, 255),
    "hand_l": (196, 154, 108, 255),
    "sleeve_r": (41, 128, 185, 255),
    "hand_r": (196, 154, 108, 255),
    "leg_l": (41, 128, 185, 255),
    "leg_r": (41, 128, 185, 255),
    "boot_l": (20, 20, 22, 255),
    "stripe_l": (25, 90, 135, 255),
    "boot_r": (20, 20, 22, 255),
    "stripe_r": (25, 90, 135, 255),
}

ELLIPSE_PARTS = {"head"}

DRAW_ORDER = [
    "shoulder_l", "shoulder_r",
    "sleeve_l", "sleeve_r",
    "torso", "belt",
    "leg_l", "leg_r",
    "boot_l", "stripe_l", "boot_r", "stripe_r",
    "hand_l", "hand_r",
    "head", "face",
]


# ---------------------------------------------------------------------------
# Pose functions: each returns the FULL pose (used as frame 1 / t=1.0). A
# "wind-up" frame 0 is derived automatically by interpolating from idle,
# except idle itself (gets a dedicated bob), kick (a structurally distinct
# airborne layout, not a delta of standing), and knockdown (also structurally
# distinct — a lying-down layout gets its own hand-tweaked second frame).
# ---------------------------------------------------------------------------

def _lean(p, dx, dy):
    for key in ("head", "face", "shoulder_l", "shoulder_r", "torso", "belt"):
        if key in p:
            p[key] = shift(p[key], dx, dy)
    return p


def pose_idle_bob(b):
    # The "boxer swaying slightly" second frame: a small settle/breathe shift.
    p = dict(b)
    _lean(p, dx=0, dy=3)
    p["sleeve_l"] = shift(b["sleeve_l"], dy=2)
    p["hand_l"] = shift(b["hand_l"], dy=2)
    p["sleeve_r"] = shift(b["sleeve_r"], dy=2)
    p["hand_r"] = shift(b["hand_r"], dy=2)
    return p


def pose_walk_forward(b):
    p = dict(b)
    p["leg_r"] = shift(b["leg_r"], dx=14, dy=2)
    p["boot_r"] = shift(b["boot_r"], dx=14, dy=2)
    p["stripe_r"] = shift(b["stripe_r"], dx=14, dy=2)
    trail = stretch_y(b["leg_l"], bottom=b["leg_l"][3] - 16)
    p["leg_l"] = shift(trail, dx=-10)
    p["boot_l"] = shift(stretch_y(b["boot_l"], top=b["boot_l"][1] - 16, bottom=b["boot_l"][3] - 16), dx=-10)
    p["stripe_l"] = shift(stretch_y(b["stripe_l"], top=b["stripe_l"][1] - 16, bottom=b["stripe_l"][3] - 16), dx=-10)
    p["sleeve_l"] = shift(b["sleeve_l"], dx=8, dy=6)
    p["hand_l"] = shift(b["hand_l"], dx=10, dy=8)
    p["sleeve_r"] = shift(b["sleeve_r"], dx=-8, dy=-4)
    p["hand_r"] = shift(b["hand_r"], dx=-10, dy=-6)
    _lean(p, dx=4, dy=0)
    return p


def pose_walk_back(b):
    p = dict(b)
    p["leg_l"] = shift(b["leg_l"], dx=-14, dy=2)
    p["boot_l"] = shift(b["boot_l"], dx=-14, dy=2)
    p["stripe_l"] = shift(b["stripe_l"], dx=-14, dy=2)
    trail = stretch_y(b["leg_r"], bottom=b["leg_r"][3] - 16)
    p["leg_r"] = shift(trail, dx=10)
    p["boot_r"] = shift(stretch_y(b["boot_r"], top=b["boot_r"][1] - 16, bottom=b["boot_r"][3] - 16), dx=10)
    p["stripe_r"] = shift(stretch_y(b["stripe_r"], top=b["stripe_r"][1] - 16, bottom=b["stripe_r"][3] - 16), dx=10)
    p["sleeve_r"] = shift(b["sleeve_r"], dx=-8, dy=6)
    p["hand_r"] = shift(b["hand_r"], dx=-10, dy=8)
    p["sleeve_l"] = shift(b["sleeve_l"], dx=8, dy=-4)
    p["hand_l"] = shift(b["hand_l"], dx=10, dy=-6)
    _lean(p, dx=-4, dy=-2)
    return p


def pose_jump(b):
    p = dict(b)
    p["leg_l"] = stretch_y(b["leg_l"], bottom=b["leg_l"][3] - 30)
    p["leg_r"] = stretch_y(b["leg_r"], bottom=b["leg_r"][3] - 30)
    p["boot_l"] = stretch_y(b["boot_l"], top=b["boot_l"][1] - 30, bottom=b["boot_l"][3] - 30)
    p["stripe_l"] = stretch_y(b["stripe_l"], top=b["stripe_l"][1] - 30, bottom=b["stripe_l"][3] - 30)
    p["boot_r"] = stretch_y(b["boot_r"], top=b["boot_r"][1] - 30, bottom=b["boot_r"][3] - 30)
    p["stripe_r"] = stretch_y(b["stripe_r"], top=b["stripe_r"][1] - 30, bottom=b["stripe_r"][3] - 30)
    p["sleeve_l"] = shift(b["sleeve_l"], dy=-10)
    p["hand_l"] = shift(b["hand_l"], dy=-16)
    p["sleeve_r"] = shift(b["sleeve_r"], dy=-10)
    p["hand_r"] = shift(b["hand_r"], dy=-16)
    _lean(p, dx=0, dy=-8)
    return p


def pose_crouch(b):
    p = dict(b)
    dy = 26
    for key in ("head", "face"):
        p[key] = shift(b[key], dy=dy)
    for key in ("shoulder_l", "shoulder_r"):
        if key in b:
            p[key] = shift(b[key], dy=int(dy * 0.7))
    p["torso"] = stretch_y(shift(b["torso"], dy=int(dy * 0.7)), bottom=b["torso"][3])
    p["sleeve_l"] = stretch_y(shift(b["sleeve_l"], dy=int(dy * 0.7)), bottom=b["sleeve_l"][3])
    p["sleeve_r"] = stretch_y(shift(b["sleeve_r"], dy=int(dy * 0.7)), bottom=b["sleeve_r"][3])
    p["hand_l"] = shift(b["hand_l"], dy=int(dy * 0.9))
    p["hand_r"] = shift(b["hand_r"], dy=int(dy * 0.9))
    p["leg_l"] = stretch_y(b["leg_l"], top=b["leg_l"][1] + dy)
    p["leg_r"] = stretch_y(b["leg_r"], top=b["leg_r"][1] + dy)
    return p


def pose_punch(b):
    p = dict(b)
    p["hand_r"] = shift(b["hand_r"], dx=30, dy=-6)
    p["sleeve_r"] = stretch_x(shift(b["sleeve_r"], dy=-2), right=b["sleeve_r"][2] + 18)
    p["hand_l"] = shift(b["hand_l"], dx=-6)
    _lean(p, dx=6, dy=0)
    return p


def pose_kick_air(b, extend):
    # A flying/jumping side kick: the whole body laid out roughly horizontal
    # (all parts sharing a similar height band, spread wide in x) rather than
    # an upright standing kick — this is what actually reads as wider-than-
    # tall for "a kick in the air", unlike a grounded side-kick which keeps
    # the torso vertical. Hand-authored like knockdown, not a lerp/delta of
    # the standing base, since the layout is structurally unlike standing.
    # `extend` is 0 (wind-up, leg still chambered) or 1 (full extension).
    reach = 55 + extend * 55
    p = {
        "head": (0, 40, 26, 66),
        "face": (4, 48, 22, 60),
        "torso": (26, 36, 66, 62),
        "belt": (60, 40, 74, 56),
        "sleeve_l": (20, 20, 40, 38),
        "hand_l": (14, 14, 30, 28),
        "sleeve_r": (30, 62, 50, 78),
        "hand_r": (40, 70, 56, 84),
        "leg_l": (66, 44, 90, 70),
        "boot_l": (86, 50, 106, 68),
        "stripe_l": (86, 50, 106, 56),
        "leg_r": (70, 30, 70 + reach, 50),
        "boot_r": (70 + reach - 10, 26, 70 + reach + 25, 46),
        "stripe_r": (70 + reach - 10, 26, 70 + reach + 25, 32),
    }
    if "shoulder_l" in b:
        p["shoulder_l"] = (24, 38, 40, 54)
        p["shoulder_r"] = (56, 34, 72, 50)
    return p


def pose_uppercut(b):
    p = dict(b)
    p["hand_r"] = shift(b["hand_r"], dx=8, dy=-46)
    p["sleeve_r"] = stretch_y(shift(b["sleeve_r"], dx=4), top=b["sleeve_r"][1] - 30)
    p["hand_l"] = shift(b["hand_l"], dx=-4, dy=8)
    p["sleeve_l"] = shift(b["sleeve_l"], dy=6)
    p["torso"] = shift(b["torso"], dy=6)
    p["leg_l"] = stretch_y(b["leg_l"], top=b["leg_l"][1] + 6)
    p["leg_r"] = stretch_y(b["leg_r"], top=b["leg_r"][1] + 6)
    for key in ("head", "face"):
        p[key] = shift(b[key], dy=4)
    for key in ("shoulder_l", "shoulder_r"):
        if key in b:
            p[key] = shift(b[key], dy=4)
    p["belt"] = shift(b["belt"], dy=4)
    return p


def pose_sweep(b):
    p = dict(b)
    dy = 40
    for key in ("head", "face"):
        p[key] = shift(b[key], dy=dy)
    for key in ("shoulder_l", "shoulder_r"):
        if key in b:
            p[key] = shift(b[key], dy=int(dy * 0.6))
    p["torso"] = stretch_y(shift(b["torso"], dy=int(dy * 0.6)), bottom=b["torso"][3] + 6)
    p["belt"] = shift(b["belt"], dy=int(dy * 0.3))
    p["sleeve_l"] = shift(b["sleeve_l"], dy=int(dy * 0.5))
    p["hand_l"] = shift(b["hand_l"], dy=int(dy * 0.5) + 4)
    p["sleeve_r"] = shift(b["sleeve_r"], dy=int(dy * 0.5))
    p["hand_r"] = shift(b["hand_r"], dy=int(dy * 0.5) + 4)
    p["leg_l"] = stretch_y(b["leg_l"], top=b["leg_l"][1] + 34)
    # sweeping leg extends forward along the ground, not dy-shifted further
    # down than the standing boot line (it would clip past the canvas bottom).
    p["leg_r"] = shift(b["leg_r"], dx=32, dy=0)
    p["boot_r"] = shift(b["boot_r"], dx=38, dy=0)
    p["stripe_r"] = shift(b["stripe_r"], dx=38, dy=0)
    return p


def pose_special(b):
    p = dict(b)
    p["hand_l"] = shift(b["hand_l"], dx=16, dy=-2)
    p["sleeve_l"] = stretch_x(b["sleeve_l"], right=b["sleeve_l"][2] + 10)
    p["hand_r"] = shift(b["hand_r"], dx=14, dy=-2)
    p["sleeve_r"] = stretch_x(b["sleeve_r"], left=b["sleeve_r"][0] - 10)
    _lean(p, dx=0, dy=4)
    return p


def pose_hit_stun(b):
    p = dict(b)
    _lean(p, dx=-10, dy=-6)
    p["head"] = shift(b["head"], dx=-14, dy=-12)
    p["face"] = shift(b["face"], dx=-14, dy=-12)
    p["sleeve_l"] = shift(b["sleeve_l"], dx=-16, dy=-12)
    p["hand_l"] = shift(b["hand_l"], dx=-18, dy=-14)
    p["sleeve_r"] = shift(b["sleeve_r"], dx=-6, dy=-16)
    p["hand_r"] = shift(b["hand_r"], dx=-8, dy=-18)
    p["leg_l"] = shift(b["leg_l"], dx=-4)
    p["boot_l"] = shift(b["boot_l"], dx=-4)
    p["stripe_l"] = shift(b["stripe_l"], dx=-4)
    return p


def pose_launched(b):
    p = dict(b)
    p["leg_l"] = stretch_y(b["leg_l"], bottom=b["leg_l"][3] - 24)
    p["leg_r"] = stretch_y(b["leg_r"], bottom=b["leg_r"][3] - 24)
    p["boot_l"] = shift(stretch_y(b["boot_l"], top=b["boot_l"][1] - 24, bottom=b["boot_l"][3] - 24), dx=-8)
    p["stripe_l"] = shift(stretch_y(b["stripe_l"], top=b["stripe_l"][1] - 24, bottom=b["stripe_l"][3] - 24), dx=-8)
    p["boot_r"] = shift(stretch_y(b["boot_r"], top=b["boot_r"][1] - 24, bottom=b["boot_r"][3] - 24), dx=8)
    p["stripe_r"] = shift(stretch_y(b["stripe_r"], top=b["stripe_r"][1] - 24, bottom=b["stripe_r"][3] - 24), dx=8)
    p["sleeve_l"] = shift(b["sleeve_l"], dx=-14, dy=-14)
    p["hand_l"] = shift(b["hand_l"], dx=-18, dy=-20)
    p["sleeve_r"] = shift(b["sleeve_r"], dx=14, dy=-10)
    p["hand_r"] = shift(b["hand_r"], dx=20, dy=-16)
    for key in ("head", "face"):
        p[key] = shift(b[key], dy=-6)
    for key in ("shoulder_l", "shoulder_r"):
        if key in b:
            p[key] = shift(b[key], dy=-6)
    p["torso"] = shift(b["torso"], dy=-6)
    p["belt"] = shift(b["belt"], dy=-6)
    return p


def pose_launched_alt(b):
    # Second tumble frame: flail arms swapped, for a genuine (if simple) spin.
    full = pose_launched(b)
    alt = dict(full)
    alt["sleeve_l"], alt["sleeve_r"] = full["sleeve_r"], full["sleeve_l"]
    alt["hand_l"], alt["hand_r"] = full["hand_r"], full["hand_l"]
    return alt


def pose_knockdown(b):
    # Structurally different from standing poses: a sprawled figure occupying
    # a horizontal band. Authored in the original 0-90 coordinate space, then
    # shifted by the same offsets as the standing skeletons since this
    # ignores `b` entirely.
    p = {}
    p["head"] = (4, 152, 34, 174)
    p["face"] = (8, 160, 28, 172)
    for key in ("shoulder_l", "shoulder_r"):
        if key in b:
            p[key] = (30, 156, 46, 172)
    p["torso"] = (30, 156, 66, 176)
    p["belt"] = (60, 160, 72, 174)
    p["sleeve_l"] = (10, 158, 32, 170)
    p["hand_l"] = (2, 158, 14, 168)
    p["sleeve_r"] = (34, 148, 50, 160)
    p["hand_r"] = (46, 142, 58, 154)
    p["leg_l"] = (60, 160, 78, 174)
    p["leg_r"] = (70, 158, 88, 172)
    p["boot_l"] = (74, 160, 90, 174)
    p["stripe_l"] = (74, 160, 90, 164)
    p["boot_r"] = (82, 158, 98, 172)
    p["stripe_r"] = (82, 158, 98, 162)
    return {k: shift(v, dx=OFFSET_X, dy=OFFSET_Y) for k, v in p.items()}


def pose_knockdown_alt(b):
    # Subtle second frame: a small "settle"/twitch rather than a new pose.
    full = pose_knockdown(b)
    alt = dict(full)
    alt["hand_r"] = shift(full["hand_r"], dx=-4, dy=3)
    alt["head"] = shift(full["head"], dy=2)
    alt["face"] = shift(full["face"], dy=2)
    return alt


# Poses generated by lerping from idle (0.5) to the full pose (1.0). kick,
# knockdown, and idle itself are hand-authored instead (see build_frames) —
# each is structurally unlike a lerp from standing.
DELTA_POSES = {
    "walkForward": pose_walk_forward,
    "walkBack": pose_walk_back,
    "jump": pose_jump,
    "crouch": pose_crouch,
    "punch": pose_punch,
    "uppercut": pose_uppercut,
    "sweep": pose_sweep,
    "special": pose_special,
    "hitStun": pose_hit_stun,
    "launched": pose_launched,
}


def build_frames(base, pose_name):
    """Returns [frame0_parts, frame1_parts] for a pose, for one character."""
    if pose_name == "idle":
        return [dict(base), pose_idle_bob(base)]
    if pose_name == "knockdown":
        return [pose_knockdown(base), pose_knockdown_alt(base)]
    if pose_name == "kick":
        return [pose_kick_air(base, extend=0), pose_kick_air(base, extend=1)]
    if pose_name == "launched":
        full = pose_launched(base)
        frame0 = lerp_parts(base, full, 0.5)
        frame1 = pose_launched_alt(base)
        return [frame0, frame1]
    full = DELTA_POSES[pose_name](base)
    frame0 = lerp_parts(base, full, 0.5)
    return [frame0, full]


# To add a pose: add its name here, add a case in build_frames() (or an
# entry in DELTA_POSES if it's a simple lerp-from-idle transform), then
# add the matching pose key to POSE_NAMES in src/characters/roster.js and
# reference it from a move's `pose` field (see genericMoves.js etc.).
POSE_NAMES = [
    "idle", "walkForward", "walkBack", "jump", "crouch",
    "punch", "kick", "uppercut", "sweep", "special",
    "hitStun", "launched", "knockdown",
]


def bbox_of(parts_list):
    xs0, ys0, xs1, ys1 = [], [], [], []
    for parts in parts_list:
        for rect in parts.values():
            x0, y0, x1, y1 = rect
            xs0.append(min(x0, x1)); xs1.append(max(x0, x1))
            ys0.append(min(y0, y1)); ys1.append(max(y0, y1))
    return min(xs0), min(ys0), max(xs1), max(ys1)


def render_frame(parts, size, path, palette):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for key in DRAW_ORDER:
        if key not in parts:
            continue
        x0, y0, x1, y1 = parts[key]
        rect = (min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
        if rect[0] < 0 or rect[1] < 0 or rect[2] > size[0] or rect[3] > size[1]:
            print(f"CLIPPING in {path}: {key} = {rect} (canvas {size})")
        color = palette[key]
        if key in ELLIPSE_PARTS:
            d.ellipse(rect, fill=color)
        else:
            d.rectangle(rect, fill=color)
    img.save(path)


def generate(base, palette, character):
    out_dir = os.path.join(SPRITES_DIR, character)
    os.makedirs(out_dir, exist_ok=True)
    skip = REAL_ART_POSES.get(character, set())

    sizes = {}
    for pose_name in POSE_NAMES:
        if pose_name in skip:
            print(f"skipping {character}/{pose_name}: has real art (see REAL_ART_POSES)")
            continue
        frames = build_frames(base, pose_name)
        bx0, by0, bx1, by1 = bbox_of(frames)
        bx0 -= CANVAS_MARGIN
        by0 -= CANVAS_MARGIN
        bx1 += CANVAS_MARGIN
        by1 += CANVAS_MARGIN
        size = (int(bx1 - bx0), int(by1 - by0))
        sizes[pose_name] = size
        for i, parts in enumerate(frames):
            shifted = {k: shift(v, dx=-bx0, dy=-by0) for k, v in parts.items()}
            render_frame(shifted, size, os.path.join(out_dir, f"{pose_name}_{i}.png"), palette)
    return sizes


if __name__ == "__main__":
    burak_sizes = generate(BURAK_BASE, BURAK_PALETTE, "burak")
    aleks_sizes = generate(ALEKS_BASE, ALEKS_PALETTE, "aleks")

    print("Burak pose canvas sizes:")
    for k, v in burak_sizes.items():
        print(f"  {k}: {v[0]}x{v[1]}")
    total = 2 * (len(burak_sizes) + len(aleks_sizes))
    print("done:", total, f"procedural sprite files written under {SPRITES_DIR}/<character>/")
