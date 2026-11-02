/* Funnel B2B — atribución y eventos para GTM (DATA-10, WEB-06).
   Va en todas las páginas. Nunca manda datos personales al dataLayer:
   solo tipo de página, punto de entrada e identificadores opacos.

   Eventos:
     cta_demo_click          clic en «Hablar con un experto» / «Pide el análisis», o envío de un
                             formulario que lleva al análisis («¿Qué hace tu equipo a mano?»)
     agent_creation_started  envío válido de «Crear mi agente» (objetivo distinto)
     lead_form_start         primer campo tocado en /agendar
     generate_lead           el backend confirmó el formulario
     booking_started         se abrió la agenda
     demo_booking_confirmed  el backend recibió la reserva desde Cal.com
     video_play / video_50 / video_complete
                             los mini videos del sitio nuevo (assets/sapio/sapio.js), una vez por video */
(function () {
  var FT = 'sapio_ft', LT = 'sapio_lt';
  var dl = window.dataLayer = window.dataLayer || [];

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function get(s, k) { try { return JSON.parse(s.getItem(k)); } catch (e) { return null; } }
  function set(s, k, v) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  function pageType() {
    var p = location.pathname;
    if (p === '/' || p === '/landing.html' || p === '/en/') return 'inicio';
    if (p.indexOf('/blog') === 0) return 'blog';
    if (p.indexOf('/help-center') === 0) return 'ayuda';
    if (/^\/(post-venta|ventas|cobranza)$/.test(p)) return 'solucion';
    if (/^\/(inmobiliaria|salud|retail)$/.test(p)) return 'industria';
    // El sitio nuevo (noviembre 2026): las industrias y «Lo que hacemos», en español y en inglés.
    if (/^\/(industrias|en\/industries)(\/|$)/.test(p)) return 'industria';
    if (/^\/(lo-que-hacemos|en\/what-we-do)\/?$/.test(p)) return 'solucion';
    if (p === '/agendar' || p.indexOf('/analisis') === 0 || p.indexOf('/en/analysis') === 0) return 'agendar';
    return 'producto';
  }

  /* ---- atribución: primera fuente (para siempre) y fuente de esta visita ---- */
  var q = new URLSearchParams(location.search);
  var ref = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : '';
  var touch = { landing_path: location.pathname, ts: new Date().toISOString() };
  if (ref) touch.referrer = ref.slice(0, 300);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
    var v = q.get(k); if (v) touch[k] = v.slice(0, 120);
  });
  var external = !!(ref || touch.utm_source);
  var ls = store('localStorage'), ss = store('sessionStorage');
  if (ls && !get(ls, FT)) set(ls, FT, touch);
  // La visita empieza en la primera página de la sesión o cuando llega con fuente nueva;
  // el recorrido interno no la pisa.
  if (ss && (!get(ss, LT) || external)) set(ss, LT, touch);

  function push(event, params) {
    var o = { event: event, event_id: (params && params.event_id) || uuid(), page_type: pageType() };
    for (var k in params) if (k !== 'event_id') o[k] = params[k];
    dl.push(o);
  }

  function entryPoint(el) {
    var box = el.closest('nav, footer, header, section[id], [data-entry]');
    if (!box) return 'cuerpo';
    return box.getAttribute('data-entry') || box.id || box.tagName.toLowerCase();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('/agendar') === 0 || h.indexOf('/analisis') === 0 || h.indexOf('/en/analysis') === 0 || h.indexOf('calendar.app.google') > -1) {
      push('cta_demo_click', { entry_point: entryPoint(a) });
    }
  }, true);

  // Un formulario que lleva al análisis también es un clic al CTA: el campo «¿Qué hace tu equipo a mano?».
  document.addEventListener('submit', function (e) {
    var f = e.target, act = f && f.getAttribute && (f.getAttribute('action') || '');
    if (act && /^\/(agendar|analisis|en\/analysis)/.test(act)) push('cta_demo_click', { entry_point: entryPoint(f) });
  }, true);

  // «Crear mi agente»: misma validación que el formulario de Sofi; solo cuenta si sigue.
  document.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'sofiForm') return;
    var inp = e.target.querySelector('input');
    var v = inp ? inp.value.trim().replace(/\s+/g, '') : '';
    if (/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v)) {
      push('agent_creation_started', { entry_point: entryPoint(e.target) });
    }
  }, true);

  window.SapioFunnel = {
    push: push,
    uuid: uuid,
    touches: function () {
      return { first: (ls && get(ls, FT)) || touch, last: (ss && get(ss, LT)) || touch };
    }
  };
})();
