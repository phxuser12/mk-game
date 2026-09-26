// Trauma-based camera shake: impacts add trauma, it decays over time, and
// the actual pixel offset is trauma^2 so small hits barely shake while big
// ones (uppercut launches, knockdowns, KOs) punch noticeably harder.
const DECAY_PER_SECOND = 2.2;
const MAX_OFFSET_PX = 14;

export class ScreenShake {
  constructor() {
    this.trauma = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - DECAY_PER_SECOND * dt);
  }

  getOffset() {
    const magnitude = this.trauma * this.trauma * MAX_OFFSET_PX;
    return {
      x: (Math.random() * 2 - 1) * magnitude,
      y: (Math.random() * 2 - 1) * magnitude,
    };
  }
}
