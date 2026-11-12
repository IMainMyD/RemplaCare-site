(function () {
  var burger = document.querySelector('.nav-burger');
  var menu = document.getElementById('nav-menu');
  if (!burger || !menu) return;
  function set(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('open', open);
  }
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') !== 'true';
    set(open);
    // Le panneau précède le burger dans le DOM : on amène le focus dedans.
    if (open) {
      var first = menu.querySelector('.nav-link');
      if (first) first.focus();
    }
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var wasOpen = burger.getAttribute('aria-expanded') === 'true';
    set(false);
    if (wasOpen) burger.focus();
  });
})();
