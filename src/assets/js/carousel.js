(function () {
  'use strict';
  var root = document.querySelector('[data-carousel]');
  if (!root || !window.RemplaCareCarousel) { return; }

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role=tab]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var carousel = window.RemplaCareCarousel.createCarousel({ count: tabs.length });

  function show(i) {
    tabs.forEach(function (tab, k) {
      var on = k === i;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.setAttribute('tabindex', on ? '0' : '-1');
      if (panels[k]) { panels[k].hidden = !on; }
    });
  }

  function stopAutoplay() {
    carousel.userInteracted();
    root.setAttribute('data-autoplay', 'off');
  }

  function go(i, focus) {
    stopAutoplay();
    show(carousel.goTo(i));
    if (focus) { tabs[carousel.getIndex()].focus(); }
  }

  // Minuteur : l'animation CSS de l'anneau de l'onglet actif.
  root.addEventListener('animationend', function (e) {
    if (!e.target.classList || !e.target.classList.contains('ring-path')) { return; }
    if (e.target.closest('[role=tab]') !== tabs[carousel.getIndex()]) { return; }
    var n = carousel.tick();
    if (n !== null) { show(n); }
  });

  tabs.forEach(function (tab, k) {
    tab.addEventListener('click', function () { go(k, false); });
    tab.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) { return; }
      var n = tabs.length, cur = carousel.getIndex(), target = null;
      if (e.key === 'ArrowRight') { target = (cur + 1) % n; }
      else if (e.key === 'ArrowLeft') { target = (cur - 1 + n) % n; }
      else if (e.key === 'Home') { target = 0; }
      else if (e.key === 'End') { target = n - 1; }
      if (target === null) { return; }
      e.preventDefault();
      go(target, true);
    });
  });

  var prev = root.querySelector('[data-carousel-prev]');
  var next = root.querySelector('[data-carousel-next]');
  if (prev) { prev.addEventListener('click', function () { stopAutoplay(); show(carousel.prev()); }); }
  if (next) { next.addEventListener('click', function () { stopAutoplay(); show(carousel.next()); }); }

  // Pauses survol / focus.
  function pause() { root.setAttribute('data-paused', ''); }
  function resume(e) {
    if (e && e.type === 'focusout' && e.relatedTarget && root.contains(e.relatedTarget)) { return; }
    if (root.matches(':hover')) { return; }
    var a = document.activeElement;
    if (a && a !== document.body && root.contains(a) && !(e && e.type === 'focusout' && e.target === a)) { return; }
    root.removeAttribute('data-paused');
  }
  root.addEventListener('mouseenter', pause);
  root.addEventListener('mouseleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', resume);

  // Balayage horizontal.
  var sx = null, sy = null;
  root.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (sx === null) { return; }
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      stopAutoplay();
      show(dx < 0 ? carousel.next() : carousel.prev());
    }
  }, { passive: true });

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stopAutoplay();
  }
  show(carousel.getIndex());
})();
