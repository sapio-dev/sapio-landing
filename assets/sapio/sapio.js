/* Sapio · el movimiento del sitio. Todo lo que se mueve muestra trabajo pasando: la industria que
   rota en el titular, las tarjetas de cada industria, el mini video de sus páginas, el año que todos
   esperan cayendo a hoy, los números de la prueba y la cuenta del mes. Sin JavaScript todo se ve entero. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const datosEl = $('#sapio-datos');
  const D = datosEl ? JSON.parse(datosEl.textContent) : {};
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const alVer = (el, fn, opts = { threshold: 0.35 }) => {
    if (!el) return;
    if (quieto) { fn(); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { fn(); io.disconnect(); } }), opts);
    io.observe(el);
  };

  /* ---------- navegación ---------- */
  const nav = $('#nav');
  const solida = () => nav && nav.classList.toggle('solida', scrollY > 12);
  addEventListener('scroll', solida, { passive: true });
  solida();

  // El menú de industrias: abre con clic o al pasar el mouse, cierra con Esc, al salir o al hacer clic afuera.
  const dropB = $('.nav-drop-b'), drop = $('#drop-ind');
  if (dropB && drop) {
    let t, desde = 0;
    const abrir = () => { clearTimeout(t); if (!drop.classList.contains('abierto')) desde = performance.now(); drop.classList.add('abierto'); dropB.setAttribute('aria-expanded', 'true'); };
    const cerrar = (foco) => { drop.classList.remove('abierto'); dropB.setAttribute('aria-expanded', 'false'); if (foco) dropB.focus(); };
    dropB.addEventListener('click', () => {
      if (drop.classList.contains('abierto') && performance.now() - desde > 450) cerrar();
      else abrir();
    });
    const zona = dropB.parentElement;
    if (matchMedia('(hover: hover)').matches) {
      zona.addEventListener('pointerenter', abrir);
      zona.addEventListener('pointerleave', () => { t = setTimeout(() => cerrar(), 180); });
    }
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && drop.classList.contains('abierto')) cerrar(true); });
    document.addEventListener('click', (e) => { if (!zona.contains(e.target)) cerrar(); });
    let y0 = scrollY;
    addEventListener('scroll', () => { if (drop.classList.contains('abierto') && Math.abs(scrollY - y0) > 40) cerrar(); if (!drop.classList.contains('abierto')) y0 = scrollY; }, { passive: true });
    zona.addEventListener('focusout', (e) => { if (!zona.contains(e.relatedTarget)) cerrar(); });
  }

  const hoja = $('#hoja'), abrirH = $('.nav-menu'), cerrarH = $('.hoja-cerrar');
  const cerrarHoja = () => {
    if (!hoja || hoja.hidden) return;
    hoja.classList.remove('abierta');
    abrirH.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { hoja.hidden = true; }, quieto ? 0 : 350);
    abrirH.focus();
  };
  if (hoja && abrirH) {
    abrirH.addEventListener('click', () => {
      hoja.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => hoja.classList.add('abierta')));
      abrirH.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      cerrarH.focus();
    });
    cerrarH.addEventListener('click', cerrarHoja);
    $$('a', hoja).forEach((a) => a.addEventListener('click', cerrarHoja));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarHoja(); });
  }

  /* ---------- la industria que rota en el titular ---------- */
  const rota = $('.rota');
  if (rota && !quieto) {
    const palabras = JSON.parse(rota.dataset.words || '[]');
    const ids = JSON.parse(rota.dataset.ids || '[]');
    const medidor = document.createElement('span');
    medidor.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none';
    rota.parentElement.appendChild(medidor);
    const ancho = (w) => { medidor.textContent = w; return medidor.getBoundingClientRect().width; };
    const pad = () => parseFloat(getComputedStyle(rota).paddingLeft) * 2;
    let i = 0;
    window.__sapioRota = () => i;
    const fijar = () => { rota.style.width = ancho(palabras[i]) + pad() + 'px'; };
    document.fonts && document.fonts.ready.then(fijar);
    fijar();
    addEventListener('resize', fijar);
    rota.setAttribute('aria-hidden', 'true');
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = palabras[0];
    rota.after(sr);
    const paso = () => {
      i = (i + 1) % palabras.length;
      const viejo = rota.querySelector('.rota-w:not(.sale)');
      const nuevo = document.createElement('span');
      nuevo.className = 'rota-w entra';
      nuevo.textContent = palabras[i];
      if (viejo) { viejo.classList.remove('entra'); viejo.classList.add('sale'); setTimeout(() => viejo.remove(), 520); }
      fijar();
      setTimeout(() => rota.appendChild(nuevo), 170);
    };
    setTimeout(() => setInterval(() => { if (!document.hidden) paso(); }, 2800), 1700);
  }

  /* ---------- el manifiesto: veinte años que caen a hoy, y hoy, en vivo ---------- */
  // En la portada tiene una etapa más: el año gira hasta ser el total de mensajes, que sigue sumando
  // al ritmo real de cada hora (el promedio de las últimas cuatro semanas, desde la última medición).
  const man = $('[data-man]');
  if (man && !quieto && D.years) {
    const lineas = $$('.man-l', man);
    const texto = $('.man-texto', man);
    const anioEl = $('[data-anio]', man);
    const pista = $('.man-pista', man);
    const lienzo = $('canvas.luz', man);
    const hoy = new Date().getFullYear();
    // Una etapa por línea; la penúltima («ni diez, ni cinco») baja el año en dos pasos y la última llega a hoy.
    const n = lineas.length;
    const etapas = [];
    const luzDe = (f) => (f >= 20 ? 0 : f >= 10 ? 0.15 : f > 0 ? 0.3 : 0.75);
    if (D.years.length === n) {
      // Un plazo por línea: cada una dice su plazo y el año cae con ella.
      lineas.forEach((_, j) => etapas.push({ linea: j, faltan: D.years[j], enc: luzDe(D.years[j]) }));
    } else {
      for (let j = 0; j < n - 2; j++) etapas.push({ linea: j, faltan: D.years[0], enc: 0 });
      etapas.push({ linea: n - 2, faltan: D.yearsMid, enc: 0.15 });
      etapas.push({ linea: n - 2, faltan: D.years[D.years.length - 2] || 5, enc: 0.3 });
      etapas.push({ linea: n - 1, faltan: 0, enc: 0.75 });
    }
    const contador = vivoManifiesto(man, anioEl);
    // En el final, el número se corre hasta el borde izquierdo del texto (en el teléfono ya está ahí).
    const caja = $('.anio-caja', man);
    // Se mide con el ancho final: el separador de miles (y las columnas plegadas) todavía no se abrieron.
    const correr = () => {
      if (!caja) return;
      const crece = $$('.anio-sep, .dg.plegada', caja).reduce((s, el) => s + Math.max(0, el.scrollWidth - el.offsetWidth), 0);
      man.style.setProperty('--dx', `${texto.offsetLeft - (caja.offsetLeft - crece)}px`);
    };
    addEventListener('resize', correr);
    if (contador) etapas.push({ linea: n - 1, faltan: 0, enc: 1, vivo: true });
    // Las columnas del año son las que no están plegadas; el año descansa en la segunda vuelta (d + 10).
    const ponerAnio = (y) => {
      const dg = $$('.dg:not(.plegada)', anioEl);
      String(y).split('').forEach((d, k) => dg[k] && dg[k].style.setProperty('--d', +d + 10));
    };
    let actual = -1;
    const ir = (k) => {
      if (k === actual) return;
      actual = k;
      const e = etapas[k];
      const ultima = e.linea === lineas.length - 1;
      // Una frase a la vez: la que toca aparece y las anteriores se van hacia arriba.
      lineas.forEach((l, j) => {
        l.classList.toggle('on', j === e.linea);
        l.classList.toggle('pasada', j < e.linea);
      });
      texto.classList.toggle('final', !!e.final);
      texto.classList.toggle('vivo', !!e.vivo);
      man.classList.toggle('en-vivo', !!e.vivo);
      if (e.vivo) { correr(); contador.mostrar(); }
      else {
        if (contador) contador.ocultar();
        ponerAnio(hoy + e.faltan);
      }
      const fin = e.faltan === 0;
      anioEl.classList.toggle('hoy', fin);
      if (lienzo) { lienzo.dataset.enc = String(e.enc); lienzo.classList.toggle('vivo', e.enc > 0); }
    };
    const cortes = etapas.slice(1).map((_, k) => 0.1 + (k * (contador ? 0.66 : 0.62)) / Math.max(1, etapas.length - 2));
    const leer = () => {
      const r = pista.getBoundingClientRect();
      const total = pista.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      let k = 0;
      while (k < cortes.length && p >= cortes[k]) k++;
      ir(k);
    };
    ir(0);
    addEventListener('scroll', leer, { passive: true });
    addEventListener('resize', leer);
    leer();
  } else if (man) {
    const lienzo = $('canvas.luz', man);
    if (lienzo) { lienzo.dataset.enc = '1'; lienzo.classList.add('vivo'); }
  }

  // El final del manifiesto: las personas atendidas en el número grande y los mensajes al lado. Cada
  // cifra parte de la última medición, suma lo que habría llegado hasta ahora al ritmo de cada hora de
  // la semana (el promedio real de las últimas cuatro semanas) y desde ahí avanza sola, con una espera
  // al azar alrededor de ese promedio: los mensajes, uno cada ~30 s una tarde de semana; las personas,
  // una cada pocos minutos.
  function vivoManifiesto(man, anioEl) {
    const V = D.vivo, caja = $('[data-vivo]', man);
    if (!V || !caja || !anioEl) return null;
    const fmt = (x) => Number(x).toLocaleString(V.loc);
    const fCL = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
    const DIAS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const horaSemana = (ms) => {
      const p = {};
      fCL.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
      return DIAS[p.weekday] * 24 + (+p.hour % 24);
    };
    // Una cifra que corre sola: su total medido, su ritmo por hora y qué hacer cada vez que suma.
    const cifra = ({ total, ritmo }, alSumar) => {
      const porHora = (ms) => Math.max(0.05, ritmo[horaSemana(ms)] || 0);
      const desde = Date.parse(V.al);
      const objetivo = () => {
        let suma = 0, t = desde;
        const fin = Math.min(Date.now(), desde + 60 * 864e5);
        while (t < fin) {
          const sig = Math.min(fin, (Math.floor(t / 36e5) + 1) * 36e5);
          suma += (porHora(t) * (sig - t)) / 36e5;
          t = sig;
        }
        return Math.floor(total + suma);
      };
      const c = { valor: objetivo() };
      const siguiente = () => {
        const media = 3600 / porHora(Date.now());
        const espera = Math.min(3600, Math.max(4, media * (0.55 + Math.random() * 0.9)));
        setTimeout(() => {
          if (!document.hidden) { c.valor = Math.max(c.valor + 1, objetivo()); alSumar(c.valor); }
          siguiente();
        }, espera * 1000);
      };
      siguiente();
      return c;
    };

    // El número grande: las columnas del año, que giran hasta las personas atendidas.
    const nEl = $('[data-vivo-n]', caja);
    let visible = false;
    const columnas = () => $$('.dg', anioEl);
    const quietas = (c, fn) => { const inn = c.firstElementChild; inn.style.transition = 'none'; fn(); void inn.offsetWidth; inn.style.transition = ''; };
    const rearmar = (texto) => {
      const col = '0123456789'.repeat(5).split('').map((x) => `<span>${x}</span>`).join('');
      $('.anio-n', anioEl).innerHTML = texto.split('').map((ch) => (/\d/.test(ch) ? `<span class="dg plegada" style="--d:${+ch + 30}"><span class="dg-in">${col}</span></span>` : `<span class="anio-sep">${ch}</span>`)).join('');
      columnas().slice(-4).forEach((c) => c.classList.remove('plegada')); // el año vuelve a ocupar las últimas cuatro
    };
    const pintar = (valor, spin) => {
      const texto = fmt(valor), ds = texto.replace(/\D/g, '');
      if (ds.length !== columnas().length) rearmar(texto);
      const cols = columnas();
      cols.forEach((c, i) => {
        const d = +ds[i], antes = +c.style.getPropertyValue('--d');
        if (spin) {
          // Al llegar: cada columna gira desde el año hasta la cuarta vuelta; las de la derecha, más rato.
          c.style.setProperty('--dur', `${(1.3 + (i / Math.max(1, cols.length - 1))).toFixed(2)}s`);
          c.style.setProperty('--d', d + 30);
          return;
        }
        if (antes % 10 === d && antes >= 30) return;
        c.style.setProperty('--dur', '0.9s');
        c.classList.add('tic');
        setTimeout(() => c.classList.remove('tic'), 900);
        if (d >= antes % 10) { c.style.setProperty('--d', d + 30); return; }
        // De 9 a 0: sigue hacia adelante a la quinta vuelta y vuelve a la cuarta sin que se note.
        const inn = c.firstElementChild;
        const fin = () => { inn.removeEventListener('transitionend', fin); quietas(c, () => c.style.setProperty('--d', d + 30)); };
        inn.addEventListener('transitionend', fin);
        c.style.setProperty('--d', d + 40);
      });
    };
    const personas = cifra(V.personas, (v) => { nEl.textContent = fmt(v); if (visible) pintar(v, false); });
    nEl.textContent = fmt(personas.valor);

    // Los mensajes y las horas, al lado: cada número cambia a la vista y se enciende un momento.
    [['[data-vivo-msj]', V.mensajes], ['[data-vivo-hrs]', V.horas]].forEach(([sel, datos]) => {
      const el = $(sel, caja);
      if (!el || !datos || !datos.ritmo) return;
      const c = cifra(datos, (v) => {
        el.textContent = fmt(v);
        el.classList.remove('tic'); void el.offsetWidth; el.classList.add('tic');
      });
      el.textContent = fmt(c.valor);
    });
    return {
      mostrar() { if (visible) return; visible = true; pintar(personas.valor, true); },
      ocultar() { visible = false; },
    };
  }

  /* ---------- lo que hacemos: el artefacto de la pieza que se lee ---------- */
  const pz = $('[data-pz]');
  if (pz) {
    const items = $$('.pz', pz);
    const lista = $('.pz-lista', pz);
    const arts = $$('[data-arts] .pz-art', pz);
    if (!quieto) lista.classList.add('scrub');
    let act = 0;
    const poner = (k) => {
      if (k === act) return;
      act = k;
      items.forEach((x, i) => x.classList.toggle('on', i === k));
      arts.forEach((x, i) => x.classList.toggle('on', i === k));
    };
    const leer = () => {
      const mitad = innerHeight * 0.5;
      let k = 0;
      items.forEach((x, i) => { if (x.getBoundingClientRect().top < mitad) k = i; });
      poner(k);
    };
    addEventListener('scroll', leer, { passive: true });
    leer();
  }

  function contar(el, destino, ms) {
    const m = String(destino).match(/^(\d+)(.*)$/);
    if (!m || quieto) return;
    const fin = +m[1], suf = m[2];
    const t0 = performance.now();
    const f = (ahora) => {
      const p = Math.min(1, (ahora - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(fin * e) + suf;
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }

  /* ---------- la prueba y el precio: aparecen cuando se ven ---------- */
  // La comparación entra fila por fila; el mes de ejemplo enciende un trabajo a la vez hasta el tope.
  $$('[data-cmp], [data-mes], [data-metodo], [data-gar]').forEach((el) => alVer(el, () => el.classList.add('visto'), { threshold: 0.4 }));

  /* ---------- el mini video: cinco escenas del trabajo, como un video con subtítulos ---------- */
  // Cada cosa entra a su tiempo (data-d, milisegundos desde que empieza su escena). Corre solo
  // mientras se ve; la barra salta a cualquier escena y el botón lo pausa. Con «menos movimiento»
  // no avanza solo: queda armado hasta la escena de antes del informe.
  const pelis = $$('[data-peli]').map((el) => {
    const tiempos = JSON.parse(($('[data-tiempos]', el) || {}).textContent || '[]');
    const its = $$('.pi, .pinf', el).map((x) => ({ x, s: +x.dataset.s, d: +x.dataset.d || 0, hasta: x.dataset.hasta ? +x.dataset.hasta : null }));
    // La tarjeta del sistema y su cabecera: en cada momento se ve solo la última que entró.
    const grupos = ['.pe', '.psc'].map((q) => $$(q, el).map((x) => ({ x, s: +x.dataset.s, d: +x.dataset.d || 0 })));
    const caps = $$('.peli-cap', el);
    const barras = $$('.peli-seg i', el);
    const P = { el, tiempos, n: tiempos.length, s: 0, t: 0, visible: false, pausada: false, quieta: false, alTerminar: null, alPintar: null, total: tiempos.reduce((a, x) => a + x, 0) || 1, medido: {} };
    P.avance = () => (P.tiempos.slice(0, P.s).reduce((a, x) => a + x, 0) + Math.min(P.t, P.tiempos[P.s] || 0)) / P.total;
    P.pintar = () => {
      for (const it of its) {
        let on = it.s < P.s || (it.s === P.s && P.t >= it.d);
        if (on && it.hasta !== null && (it.s < P.s || P.t >= it.hasta)) on = false;
        it.x.classList.toggle('on', on);
      }
      for (const g of grupos) {
        let ult = null;
        for (const e of g) if (e.s < P.s || (e.s === P.s && P.t >= e.d)) ult = e.x;
        g.forEach((e) => e.x.classList.toggle('on', e.x === ult));
      }
      el.classList.toggle('con-informe', its.some((it) => it.x.classList.contains('pinf') && it.x.classList.contains('on')));
      caps.forEach((c, k) => c.classList.toggle('on', k === P.s));
      barras.forEach((b, k) => b.style.setProperty('--p', k < P.s ? 1 : k > P.s ? 0 : Math.min(1, P.t / P.tiempos[k]).toFixed(3)));
      if (P.alPintar) P.alPintar(P.avance());
    };
    // Saltar sin transiciones: lo de escenas anteriores aparece de una.
    P.ir = (s, t = 0) => {
      P.s = s; P.t = t;
      el.classList.add('salta');
      P.pintar();
      void el.offsetWidth;
      el.classList.remove('salta');
    };
    P.pausar = (si) => {
      P.pausada = si;
      el.classList.toggle('pausada', si);
      const b = $('.peli-pausa', el);
      if (b) b.setAttribute('aria-label', si ? b.dataset.seguir : b.dataset.pausar);
      if (!si) correr();
    };
    $$('.peli-seg', el).forEach((b) => b.addEventListener('click', () => { P.ir(+b.dataset.ir, P.pausada ? P.tiempos[+b.dataset.ir] : 0); correr(); }));
    const boton = $('.peli-pausa', el);
    if (boton) boton.addEventListener('click', () => P.pausar(!P.pausada));
    if (quieto) { P.quieta = true; P.pausada = true; el.classList.add('pausada'); if (boton) boton.setAttribute('aria-label', boton.dataset.seguir); P.ir(Math.max(0, P.n - 2), 1e9); }
    else P.ir(0, 0);
    return P;
  });
  // Medición (GTM): cada mini video avisa una vez cuando empieza a correr a la vista, a la mitad y al
  // terminar; los mismos eventos que la película de sapio.dev. video = la industria (peli-clinicas → clinicas).
  const medir = (P, n) => {
    if (P.medido[n]) return;
    P.medido[n] = 1;
    const video = (P.el.id || '').replace(/^peli-/, '') || 'mini-video';
    if (window.SapioFunnel) window.SapioFunnel.push('video_' + n, { video });
    else (window.dataLayer = window.dataLayer || []).push({ event: 'video_' + n, video });
  };
  // Al terminar vuelve a empezar, con un fundido.
  const reiniciar = (P) => {
    P.fundiendo = true;
    P.el.classList.add('fundido');
    setTimeout(() => { P.ir(0, 0); P.el.classList.remove('fundido'); P.fundiendo = false; }, 480);
  };
  let corriendo = false, prev = 0;
  const cuadro = (ahora) => {
    const dt = Math.min(64, ahora - prev);
    prev = ahora;
    let alguno = false;
    for (const P of pelis) {
      if (P.pausada || !P.visible || P.fundiendo || document.hidden) continue;
      alguno = true;
      P.t += dt;
      medir(P, 'play');
      if (P.t >= P.tiempos[P.s]) {
        if (P.s < P.n - 1) { P.s += 1; P.t = 0; }
        else { P.t = P.tiempos[P.s]; P.pintar(); medir(P, 'complete'); if (P.alTerminar) P.alTerminar(); else reiniciar(P); continue; }
      }
      if (P.avance() >= 0.5) medir(P, '50');
      P.pintar();
    }
    if (alguno) requestAnimationFrame(cuadro);
    else corriendo = false;
  };
  function correr() {
    if (corriendo) return;
    corriendo = true;
    prev = performance.now();
    requestAnimationFrame(cuadro);
  }
  if (pelis.length) {
    const io = new IntersectionObserver((ents) => {
      for (const en of ents) {
        const P = pelis.find((x) => x.el === en.target);
        if (P) P.visible = en.isIntersecting;
      }
      correr();
    }, { threshold: 0.35 });
    pelis.forEach((P) => io.observe(P.el));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) correr(); });
  }

  /* ---------- la portada: una tarjeta por industria elige su mini video ---------- */
  const sel = $('[data-sel]');
  if (sel) {
    const lista = $('.tt-lista', sel);
    const tabs = $$('.tt', sel);
    const paneles = tabs.map((b) => document.getElementById(b.getAttribute('aria-controls')));
    let elegida = false; // si el visitante elige una, ya no se pasa sola a la siguiente
    // En el teléfono las tarjetas se deslizan de lado: la elegida se corre a la vista, sin mover la página.
    const mostrar = (b) => {
      if (!lista || lista.scrollWidth <= lista.clientWidth + 2) return;
      const izq = b.offsetLeft - parseFloat(getComputedStyle(lista).paddingLeft || 0);
      lista.scrollTo({ left: Math.max(0, izq), behavior: quieto ? 'auto' : 'smooth' });
    };
    const poner = (k, { foco = false } = {}) => {
      tabs.forEach((b, i) => {
        const on = i === k;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        paneles[i].hidden = !on;
        paneles[i].classList.toggle('on', on);
      });
      if (foco) tabs[k].focus({ preventScroll: true });
      mostrar(tabs[k]);
      const P = pelis.find((x) => paneles[k].contains(x.el));
      if (P) { if (!P.quieta) P.ir(0, 0); correr(); }
    };
    tabs.forEach((b, k) => {
      b.addEventListener('click', () => { elegida = true; poner(k); });
      b.addEventListener('keydown', (e) => {
        const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); elegida = true; poner(0, { foco: true }); }
        else if (e.key === 'End') { e.preventDefault(); elegida = true; poner(tabs.length - 1, { foco: true }); }
        else if (n) { e.preventDefault(); elegida = true; poner((k + n + tabs.length) % tabs.length, { foco: true }); }
      });
    });
    pelis.forEach((P) => {
      const k = paneles.findIndex((p) => p && p.contains(P.el));
      if (k < 0) return;
      const raya = $('.tt-avance i', tabs[k]);
      P.alPintar = (f) => { if (raya) raya.style.setProperty('--p', f.toFixed(3)); };
      P.pintar();
      P.alTerminar = () => {
        if (elegida) { reiniciar(P); return; }
        P.fundiendo = true;
        P.el.classList.add('fundido');
        setTimeout(() => { P.el.classList.remove('fundido'); P.fundiendo = false; poner((k + 1) % tabs.length); }, 480);
      };
    });
  }

  /* ---------- cualquier trabajo: una fila elige su trabajo y lo muestra pasando ---------- */
  // Llega, los tres pasos, sale y el reloj (la animación es CSS: .corre). Mientras se ve, pasa sola al
  // siguiente trabajo; si el visitante elige uno, se queda ahí. Con «menos movimiento» queda todo a la vista.
  const lg = $('[data-llega]');
  if (lg) {
    const filas = $$('.lg-fila', lg);
    const paneles = filas.map((b) => document.getElementById(b.getAttribute('aria-controls')));
    const lista = $('.lg-lista', lg);
    const DUR = 8200;
    let k = 0, elegida = false, visible = false, t0 = 0, raf = 0;
    const correrPanel = (p) => { p.classList.remove('corre'); void p.offsetWidth; p.classList.add('corre'); };
    const poner = (n, { foco = false } = {}) => {
      k = n;
      filas.forEach((b, i) => {
        const on = i === n;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        paneles[i].hidden = !on;
        paneles[i].classList.toggle('on', on);
        if (!on) paneles[i].classList.remove('corre');
        const r = $('.lg-avance i', b); if (r) r.style.setProperty('--p', 0);
      });
      if (foco) filas[n].focus({ preventScroll: true });
      if (lista && lista.scrollWidth > lista.clientWidth + 2) {
        const izq = filas[n].offsetLeft - parseFloat(getComputedStyle(lista).paddingLeft || 0);
        lista.scrollTo({ left: Math.max(0, izq), behavior: quieto ? 'auto' : 'smooth' });
      }
      if (quieto) paneles[n].classList.add('corre'); else correrPanel(paneles[n]);
      t0 = performance.now();
    };
    filas.forEach((b, i) => {
      b.addEventListener('click', () => { elegida = true; lg.classList.add('elegida'); poner(i); });
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        elegida = true; lg.classList.add('elegida');
        poner((i + d + filas.length) % filas.length, { foco: true });
      });
    });
    if (quieto) paneles.forEach((p) => p.classList.add('corre'));
    else {
      const paso = (ahora) => {
        raf = 0;
        if (!visible || elegida || document.hidden) return;
        const f = Math.min(1, (ahora - t0) / DUR);
        const r = $('.lg-avance i', filas[k]); if (r) r.style.setProperty('--p', f.toFixed(3));
        if (f >= 1) poner((k + 1) % filas.length);
        raf = requestAnimationFrame(paso);
      };
      const io = new IntersectionObserver((ents) => ents.forEach((en) => {
        visible = en.isIntersecting;
        if (!visible) return;
        if (!paneles[k].classList.contains('corre')) correrPanel(paneles[k]);
        t0 = performance.now();
        if (!raf) raf = requestAnimationFrame(paso);
      }), { threshold: 0.35 });
      io.observe(lg);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) { t0 = performance.now(); raf = requestAnimationFrame(paso); } });
    }
    // Lo que el visitante escribe viaja al análisis por sessionStorage, no por la dirección.
    const campo = $('[data-lg-campo]', lg);
    if (campo) campo.addEventListener('submit', () => {
      const v = ($('#lg-q', campo).value || '').trim();
      try { if (v) sessionStorage.setItem('sapio-trabajo', v.slice(0, 300)); } catch (e) { /* sin sessionStorage */ }
    });
  }

  /* ---------- la cuenta del mes ---------- */
  $$('[data-cuenta]').forEach((cuenta) => {
    alVer(cuenta, () => {
      cuenta.classList.add('vista');
      const n = $('[data-n]', cuenta);
      if (n) contar(n, cuenta.dataset.n, 900);
    }, { threshold: 0.4 });
  });

  /* ---------- preguntas que abren y cierran suave ---------- */
  $$('.faq-i').forEach((d) => {
    const sum = $('summary', d), cuerpo = $('.faq-a', d);
    sum.addEventListener('click', (e) => {
      if (quieto) return;
      e.preventDefault();
      if (d.dataset.anim) return;
      d.dataset.anim = '1';
      if (d.open) {
        const h = cuerpo.scrollHeight;
        cuerpo.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)' })
          .onfinish = () => { d.open = false; delete d.dataset.anim; };
      } else {
        d.open = true;
        const h = cuerpo.scrollHeight;
        cuerpo.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' })
          .onfinish = () => { delete d.dataset.anim; };
      }
    });
  });
})();
