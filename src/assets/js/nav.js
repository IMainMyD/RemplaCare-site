(function () {
  var burger = document.querySelector('.nav-burger');
  var menu = document.getElementById('nav-menu');
  if (!burger || !menu) return;
  function set(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('open', open);
  }
  burger.addEventListener('click', function () {
    set(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') set(false);
  });
})();
