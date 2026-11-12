(function () {
  'use strict';
  var root = document.querySelector('[data-carousel]');
  if (!root || !window.RemplaCareCarousel) { return; }

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role=tab]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var carousel = window.RemplaCareCarousel.createCarousel({ count: tabs.length });

  var glider = root.querySelector('.tab-glider');
  var shown = carousel.getIndex();   // carte affichée
  var gliderAt = shown;              // onglet sous le carré
  var timer = null;

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  // Durée du mouvement (ms) ; vide, NaN ou 0 : bascule instantanée.
  function switchMs() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--t-switch').trim();
    var n = parseFloat(v);
    if (!(n > 0)) { return 0; }
    return /ms$/.test(v) ? n : (/s$/.test(v) ? n * 1000 : n);
  }
  function setPhase(p) { root.setAttribute('data-phase', p); }

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

  // Un seul mouvement : les transitions CSS font le fondu enchaîné et le glissement ;
  // le dernier changement gagne (les transitions se réorientent d'elles-mêmes).
  function show(i) {
    select(i);
    if (i === shown && gliderAt === i) { return; }
    var t = switchMs();
    clearTimeout(timer);
    placeGlider(i);
    showPanel(i);
    if (reducedMotion() || t === 0) { setPhase('idle'); return; }
    setPhase('moving');
    timer = setTimeout(function () { setPhase('idle'); }, t);
  }

  function go(i, focus) {
    show(carousel.goTo(i));
    if (focus) { tabs[carousel.getIndex()].focus(); }
  }

  // Minuteur : l'animation CSS de l'anneau de l'onglet actif.
  root.addEventListener('animationend', function (e) {
    if (!e.target.classList || !e.target.classList.contains('ring-path')) { return; }
    if (e.target.closest('[role=tab]') !== tabs[carousel.getIndex()]) { return; }
    if (root.getAttribute('data-phase') !== 'idle') { return; }
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
  if (prev) { prev.addEventListener('click', function () { show(carousel.prev()); }); }
  if (next) { next.addEventListener('click', function () { show(carousel.next()); }); }

  // Seule pause : le focus clavier à l'intérieur d'une carte (pas les onglets, pas le survol).
  function inPanel(el) { return !!(el && el.closest && el.closest('.panel') && root.contains(el)); }
  root.addEventListener('focusin', function (e) {
    // Clavier dans une carte : pause ; tout autre focus (souris, onglets, flèches) : jamais de pause.
    if (inPanel(e.target) && e.target.matches(':focus-visible')) { root.setAttribute('data-paused', ''); }
    else { root.removeAttribute('data-paused'); }
  });
  root.addEventListener('focusout', function (e) {
    if (!inPanel(e.relatedTarget)) { root.removeAttribute('data-paused'); }
  });

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
      show(dx < 0 ? carousel.next() : carousel.prev());
    }
  }, { passive: true });

  // Mouvement réduit : pas de défilement automatique.
  if (reducedMotion()) {
    carousel.userInteracted();
    root.setAttribute('data-autoplay', 'off');
  }
  select(carousel.getIndex());
  showPanel(carousel.getIndex());
  syncGlider();
  window.addEventListener('resize', syncGlider);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(syncGlider); }
})();
