/* site.js — el menú se vuelve oscuro sobre las bandas oscuras, como en las landings */
(function () {
  var nav = document.getElementById('nav'); if (!nav) return;
  var darks = [].slice.call(document.querySelectorAll('.dark'));
  function tone() {
    var y = 40;
    nav.classList.toggle('dk', darks.some(function (d) { var r = d.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
  }
  addEventListener('scroll', tone, { passive: true }); tone();
})();
