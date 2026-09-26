"""Slice a real-art sprite sheet into per-frame files using a JSON coordinate
manifest (see tools/sprite_generation_brief.md for the delivery format this
expects). One-off authoring tool, not a runtime dependency.

Usage:
    python3 tools/slice_sprites.py <sheet.png> <manifest.json> <character> \
        [--skip key1,key2] [--rename old=new,old2=new2]

Writes assets/sprites/<character>/<pose>_<frameIndex>.png for every manifest
entry not in --skip, applying any --rename first. Run from the repo root.
"""
import argparse
import json
import os
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet")
    parser.add_argument("manifest")
    parser.add_argument("character")
    parser.add_argument("--skip", default="", help="comma-separated manifest keys to drop (bad/contaminated crops)")
    parser.add_argument("--rename", default="", help="comma-separated old=new pairs, applied after skipping")
    args = parser.parse_args()

    skip = {k for k in args.skip.split(",") if k}
    rename = dict(pair.split("=") for pair in args.rename.split(",") if pair)

    sheet = Image.open(args.sheet).convert("RGBA")
    with open(args.manifest) as f:
        manifest = json.load(f)

    out_dir = os.path.join("assets", "sprites", args.character)
    os.makedirs(out_dir, exist_ok=True)

    written = []
    for key, box in manifest.items():
        if key in skip:
            continue
        out_key = rename.get(key, key)
        x, y, w, h = box["x"], box["y"], box["width"], box["height"]
        x2, y2 = min(x + w, sheet.width), min(y + h, sheet.height)
        crop = sheet.crop((x, y, x2, y2))
        crop.save(os.path.join(out_dir, f"{out_key}.png"))
        written.append(out_key)

    print(f"Wrote {len(written)} frames to {out_dir}/")
    by_pose = {}
    for key in written:
        pose = key.rsplit("_", 1)[0]
        by_pose[pose] = by_pose.get(pose, 0) + 1
    for pose, count in sorted(by_pose.items()):
        print(f"  {pose}: {count} frames")


if __name__ == "__main__":
    main()
