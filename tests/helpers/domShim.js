// The only browser global the testable logic touches is `Image`, used by
// Fighter's constructor to preload sprite frames (src/entities/fighter.js).
// Tests never render, so a real image never needs to decode — this stub
// just needs to exist and hold a `src` string without throwing. Import this
// once, before importing fighter.js/roster.js, in any test that constructs
// a Fighter.
if (typeof global.Image === 'undefined') {
  global.Image = class Image {
    constructor() {
      this.src = '';
      this.complete = false;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
    }
  };
}
