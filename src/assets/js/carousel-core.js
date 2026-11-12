(function () {
  'use strict';

  function isIndex(i, count) {
    return Number.isInteger(i) && i >= 0 && i < count;
  }

  function createCarousel(options) {
    var count = options && options.count;
    if (!Number.isInteger(count) || count < 1) {
      throw new RangeError('count doit être un entier >= 1');
    }
    var start = options.startIndex === undefined ? 0 : options.startIndex;
    if (!isIndex(start, count)) {
      throw new RangeError('startIndex doit être un entier dans [0, count-1]');
    }
    var index = start;
    var autoplay = true;

    return {
      getIndex: function () { return index; },
      isAutoplay: function () { return autoplay; },
      next: function () { index = (index + 1) % count; return index; },
      prev: function () { index = (index - 1 + count) % count; return index; },
      goTo: function (i) { if (isIndex(i, count)) { index = i; } return index; },
      userInteracted: function () { autoplay = false; },
      tick: function () {
        if (!autoplay) { return null; }
        index = (index + 1) % count;
        return index;
      }
    };
  }

  var api = { createCarousel: createCarousel };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined') { window.RemplaCareCarousel = api; }
})();
