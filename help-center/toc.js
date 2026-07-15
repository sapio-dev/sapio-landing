/* Navegación y ritmo de las notas del centro de ayuda:
   - divide los títulos "Paso N — Título" en kicker mono + título serif
   - arma el TOC lateral fijo (desktop ancho) y el plegable (angosto)
   - scroll-spy en el lateral, con el footer como límite inferior
   - revelado sutil de secciones al hacer scroll (respeta reduced motion) */
(function () {
  var article = document.querySelector('article.article');
  var body = document.querySelector('.article-body');
  if (!article || !body) return;

  var heads = Array.prototype.slice.call(body.querySelectorAll('h2')).filter(function (h) {
    return !h.closest('.cta-box');
  });
  if (heads.length < 2) return;

  var slug = function (s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  };

  // Kicker de pasos + id + etiqueta del TOC, a partir del texto original
  var seen = {};
  var items = heads.map(function (h) {
    var original = h.textContent.trim();
    var label = original;
    var m = original.match(/^Paso\s+(\d+)\s*[—–-]\s*(.+)$/);
    if (m) {
      h.innerHTML = '<span class="step-kicker">Paso ' + m[1] + '</span>' + m[2];
      label = m[2];
    }
    if (!h.id) {
      var id = slug(original) || 'seccion';
      while (seen[id] || document.getElementById(id)) id += '-2';
      seen[id] = true;
      h.id = id;
    }
    return { h: h, label: label };
  });

  var linksHtml = items.map(function (it) {
    return '<li><a href="#' + it.h.id + '">' + it.label + '</a></li>';
  }).join('');

  // Menú lateral fijo (desktop ancho)
  var aside = document.createElement('aside');
  aside.className = 'toc';
  aside.setAttribute('aria-label', 'Contenido de la página');
  aside.innerHTML =
    '<div class="toc-label">En esta página</div>' +
    '<ul>' + linksHtml + '</ul>' +
    '<a class="toc-top" href="#">↑ Volver arriba</a>';
  article.appendChild(aside);

  // Menú plegable (pantallas angostas), antes del cuerpo del artículo
  var det = document.createElement('details');
  det.className = 'toc-inline';
  det.innerHTML = '<summary>Contenido</summary><ul>' + linksHtml + '</ul>';
  body.parentNode.insertBefore(det, body);

  // "Volver arriba" sin dejar hash en la URL
  aside.querySelector('.toc-top').addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Scroll-spy: resalta el h2 visible
  var links = {};
  Array.prototype.forEach.call(aside.querySelectorAll('ul a'), function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var footer = document.querySelector('footer');
  var baseTop = null;
  var current = null;
  var onScroll = function () {
    // El footer es el límite: si alcanza al menú, lo empuja hacia arriba.
    if (baseTop === null) {
      aside.style.top = '';
      baseTop = parseFloat(getComputedStyle(aside).top) || 0;
    }
    if (footer) {
      var limit = footer.getBoundingClientRect().top - aside.offsetHeight - 48;
      aside.style.top = Math.min(baseTop, limit) + 'px';
    }

    var y = window.scrollY + 140;
    var id = heads[0].id;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].offsetTop <= y) id = heads[i].id;
    }
    if (id === current) return;
    if (current && links[current]) links[current].classList.remove('is-active');
    if (links[id]) links[id].classList.add('is-active');
    current = id;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { baseTop = null; onScroll(); }, { passive: true });
  onScroll();

  // Revelado sutil: solo bloques bajo el pliegue, solo si el usuario acepta motion
  if ('IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(body.children, function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight - 60) {
        el.classList.add('rv');
        io.observe(el);
      }
    });
  }
})();
