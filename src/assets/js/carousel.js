(function () {
  'use strict';
  var root = document.querySelector('[data-carousel]');
  if (!root || !window.RemplaCareCarousel) { return; }

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role=tab]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var carousel = window.RemplaCareCarousel.createCarousel({ count: tabs.length });

  var glider = root.querySelector('.tab-glider');
  var shown = carousel.getIndex();   // carte actuellement affichée (ou en cours de départ)
  var gliderAt = shown;              // onglet sous le carré
  var pending = null;                // index cible d'une transition en cours
  var timers = [];

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function cssMs(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseFloat(v);
    if (!(n > 0)) { return 0; }
    return /ms$/.test(v) ? n : (/s$/.test(v) ? n * 1000 : n);
  }
  function setPhase(p) { root.setAttribute('data-phase', p); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function select(i) {
    tabs.forEach(function (tab, k) {
      tab.setAttribute('aria-selected', k === i ? 'true' : 'false');
      tab.setAttribute('tabindex', k === i ? '0' : '-1');
    });
  }
  function showPanel(i) {
    panels.forEach(function (p, k) { if (p) { p.hidden = k !== i; } });
    shown = i;
  }
  function placeGlider(i) {
    gliderAt = i;
    if (glider) { glider.style.setProperty('--glider-x', tabs[i].offsetLeft + 'px'); }
    root.setAttribute('data-active-tool', tabs[i].getAttribute('data-tool'));
  }
  // Recalage sans animation (chargement, polices, redimensionnement).
  function syncGlider() {
    if (!glider) { return; }
    glider.style.transition = 'none';
    placeGlider(gliderAt);
    void glider.offsetWidth;
    glider.style.transition = '';
  }
  // Termine immédiatement la transition en cours : état final engagé.
  function finish() {
    if (pending === null) { return; }
    var t = pending;
    pending = null;
    clearTimers();
    showPanel(t);
    placeGlider(t);
    setPhase('idle');
  }

  // Fondu sortant, glissement du carré, fondu entrant ; le dernier changement gagne.
  function show(i) {
    finish();
    select(i);
    var tOut = cssMs('--t-out'), tGlide = cssMs('--t-glide'), tIn = cssMs('--t-in');
    if (i === shown && gliderAt === i) { return; }
    if (reducedMotion() || tOut + tGlide + tIn === 0) {
      showPanel(i); placeGlider(i); setPhase('idle');
      return;
    }
    pending = i;
    setPhase('out');
    timers.push(setTimeout(function () {
      setPhase('glide');
      placeGlider(i);
      timers.push(setTimeout(function () {
        showPanel(i);
        setPhase('in');
        timers.push(setTimeout(function () { pending = null; setPhase('idle'); }, tIn));
      }, tGlide));
    }, tOut));
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
    if (pending !== null) { return; }
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
  select(carousel.getIndex());
  showPanel(carousel.getIndex());
  syncGlider();
  window.addEventListener('resize', syncGlider);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(syncGlider); }
})();
