// Records directional CHANGES (not every tick) so a held direction doesn't
// spam duplicate entries, then checks whether the most recent entries match
// a special move's required sequence within a frame window. This is the
// simple charge/tap style the brief calls for — no motion-fighter circles.

const HISTORY_LIMIT = 12; // comfortably more than any 2-3 tap pattern needs

export class MotionBuffer {
  constructor() {
    this.history = []; // { dir, tick }
    this.lastDir = 'neutral';
    this.tick = 0;
  }

  update(dir) {
    this.tick += 1;
    if (dir !== this.lastDir) {
      this.lastDir = dir;
      this.history.push({ dir, tick: this.tick });
      if (this.history.length > HISTORY_LIMIT) this.history.shift();
    }
  }

  // True if the most recent non-neutral entries match `sequence` in order
  // and the whole thing happened within the last `maxFrames` ticks.
  matches(sequence, maxFrames) {
    const nonNeutral = this.history.filter((entry) => entry.dir !== 'neutral');
    if (nonNeutral.length < sequence.length) return false;

    const tail = nonNeutral.slice(-sequence.length);
    if (!tail.every((entry, i) => entry.dir === sequence[i])) return false;

    return this.tick - tail[0].tick <= maxFrames;
  }
}

// 'down'/'up' take priority over horizontal: a diagonal charge isn't a
// pattern this game supports, keeping the example motions (back-back-
// forward, down-down, up-up) unambiguous.
export function computeMotionDir(input, facing) {
  if (input.down) return 'down';
  if (input.up) return 'up';
  const raw = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (raw === 0) return 'neutral';
  return raw === facing ? 'forward' : 'back';
}
