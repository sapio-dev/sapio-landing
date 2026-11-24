/* Sapio — la página del análisis gratis (/analisis/ y /en/analysis/).
   Desde el 24/11, en /analisis/ hay dos pasos: cuatro preguntas sobre el trabajo que frena al equipo y
   después la agenda de Cal.com. Las respuestas viajan en las notas de la reserva, así el experto llega a la
   reunión con el caso leído. Cal.com pide nombre y correo al confirmar la hora. No hay backend: todo
   queda en Cal.com. Si la página no trae las preguntas (/en/analysis/ por ahora), la agenda se abre de
   entrada, como desde el 02/11.
   Medición para GTM (js/funnel.js), sin datos personales (las respuestas nunca van al dataLayer):
     lead_form_start         primer campo tocado en las preguntas (o primer clic en la agenda, sin preguntas)
     generate_lead           respondió las preguntas y pasó a la agenda (sin preguntas: reservó)
     booking_started         la agenda se vio por primera vez (bookerViewed de Cal.com)
     demo_booking_confirmed  reservó: Cal.com confirmó la hora en el navegador */
(() => {
  'use strict';
  const D = JSON.parse(document.getElementById('sapio-datos').textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const F = window.SapioFunnel || { push() {}, uuid: () => String(Date.now()), touches: () => ({}) };
  const caja = $('#calEmbed');
  if (!caja) return;
  const form = $('#fForm');
  const suave = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  // Desde qué página llegó (?origen=inicio, ?origen=clinicas…): va a la medición y a la reserva.
  const origen = (new URLSearchParams(location.search).get('origen') || '').slice(0, 60);
  const entrada = origen || 'directo';

  // La medición: cada evento una sola vez por visita a la página.
  const hecho = {};
  const una = (n, params) => { if (hecho[n]) return; hecho[n] = 1; F.push(n, params); };

  // Lo que escribió en la portada («¿Qué hace tu equipo a mano?») llega por sessionStorage: con preguntas,
  // queda escrito en la primera; sin ellas, va directo a las notas de la reunión.
  let trabajo = '';
  try { trabajo = sessionStorage.getItem('sapio-trabajo') || ''; sessionStorage.removeItem('sapio-trabajo'); } catch (e) { /* sin sessionStorage */ }

  // ---- la agenda ----
  let agendaAbierta = false;
  const abrirAgenda = (notas) => {
    if (agendaAbierta) return;
    agendaAbierta = true;

    // La reserva lleva la fuente de la visita (utm_*): en Cal.com se ve de qué campaña vino cada reunión.
    const cfg = { layout: 'month_view', theme: 'dark' };
    if (notas) cfg.notes = notas;
    const tq = F.touches() || {};
    const fuente = (tq.last && tq.last.utm_source ? tq.last : tq.first) || {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => { if (fuente[k]) cfg[k] = fuente[k]; });
    if (origen) cfg['metadata[origen]'] = origen;

    // El cargador oficial de Cal.com (embed.js), tal cual.
    (function (C, Aa, L) { const p = function (a, ar) { a.q.push(ar); }; const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = Aa; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    const Cal = window.Cal;
    Cal('init', 'agenda', { origin: 'https://cal.com' });
    Cal.ns.agenda('inline', { elementOrSelector: '#calEmbed', calLink: D.cal, config: cfg });
    // Los colores de la tarjeta: la agenda se funde con el fondo y el azul es el del botón del sitio.
    Cal.ns.agenda('ui', {
      theme: 'dark',
      hideEventTypeDetails: true,
      layout: 'month_view',
      cssVarsPerTheme: { dark: { 'cal-brand': '#2272e2', 'cal-brand-emphasis': '#3a85f0', 'cal-brand-text': '#ffffff', 'cal-bg': '#151518', 'cal-bg-muted': '#1c1c20', 'cal-bg-subtle': '#1f1f24', 'cal-bg-emphasis': '#2a2a30', 'cal-border': 'rgba(255,255,255,0.10)', 'cal-border-subtle': 'rgba(255,255,255,0.07)' } },
    });

    // Si Cal.com no carga (bloqueado o caído), queda el link directo a la agenda.
    let lista = false;
    const respaldo = () => { if (lista) return; caja.removeAttribute('aria-busy'); $('.cal-espera', caja).hidden = true; $('.cal-respaldo', caja).hidden = false; };
    setTimeout(respaldo, 15000);
    Cal.ns.agenda('on', { action: 'linkFailed', callback: respaldo });
    Cal.ns.agenda('on', { action: 'linkReady', callback: () => { lista = true; caja.removeAttribute('aria-busy'); caja.classList.add('lista'); } });

    Cal.ns.agenda('on', { action: 'bookerViewed', callback: () => una('booking_started', { entry_point: entrada }) });
    if (!form) {
      // Sin preguntas, el primer clic dentro de la agenda es el inicio: el foco pasa al iframe de Cal.com.
      addEventListener('blur', () => setTimeout(() => {
        const a = document.activeElement;
        if (a && a.tagName === 'IFRAME' && caja.contains(a)) una('lead_form_start', { entry_point: entrada });
      }, 0));
    }

    const reservado = (e) => {
      if (hecho.reserva) return;
      hecho.reserva = 1;
      const datos = (e && e.detail && e.detail.data) || {};
      const id = datos.uid || F.uuid();
      // Sin preguntas, el prospecto nace con la reserva; con preguntas, ya se contó al responderlas.
      if (!form) F.push('generate_lead', { event_id: id, entry_point: entrada });
      F.push('demo_booking_confirmed', { event_id: id + ':booked', confirmed_by: 'cal_embed' });
      $('#fCal').hidden = true;
      $('#fDone').hidden = false;
      const prog = $('#fProg');
      if (prog) prog.className = 'ficha-prog fin';
      $('#fDoneH').focus({ preventScroll: true });
      $('#ficha').scrollIntoView({ behavior: suave(), block: 'center' });
    };
    Cal.ns.agenda('on', { action: 'bookingSuccessfulV2', callback: reservado });
    Cal.ns.agenda('on', { action: 'bookingSuccessful', callback: reservado });
  };

  if (!form) { abrirAgenda(trabajo); return; }

  // ---- las preguntas previas ----
  const tarea = $('#fTarea'), sistemas = $('#fSistemas'), traspaso = $('#fTraspaso');
  if (trabajo && !tarea.value) tarea.value = trabajo.slice(0, 600);

  form.addEventListener('focusin', () => una('lead_form_start', { entry_point: entrada }));

  const limpio = (el) => el.value.trim().replace(/\s+\n/g, '\n');
  const marcar = (el, err, msg) => {
    if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(err).textContent = msg || '';
  };
  const validar = () => {
    const horas = form.querySelector('input[name="horas"]:checked');
    const e = {
      tarea: limpio(tarea).length < 3 ? 'Cuéntanos cuál es la tarea, aunque sea en pocas palabras.' : '',
      sistemas: limpio(sistemas).length < 2 ? 'Escribe qué usan hoy, aunque sea «Excel» o «el correo».' : '',
      horas: horas ? '' : 'Elige un rango aproximado.',
    };
    marcar(tarea, '#eTarea', e.tarea);
    marcar(sistemas, '#eSistemas', e.sistemas);
    marcar(null, '#eHoras', e.horas);
    const primero = e.tarea ? tarea : e.sistemas ? sistemas : e.horas ? form.querySelector('input[name="horas"]') : null;
    return { ok: !primero, primero, horas: horas && horas.value };
  };
  [tarea, sistemas].forEach((el) => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true' && limpio(el)) marcar(el, el === tarea ? '#eTarea' : '#eSistemas', ''); }));
  form.addEventListener('change', (ev) => { if (ev.target.name === 'horas') marcar(null, '#eHoras', ''); });

  // Las respuestas, tal como las va a leer el experto en la invitación del calendario (notas de Cal.com).
  const notasDe = (horas) => [
    'Tarea que más tiempo quita: ' + limpio(tarea),
    'Sistemas o planillas que usan: ' + limpio(sistemas),
    'Horas a la semana en esa tarea: ' + horas,
    limpio(traspaso) ? 'Información que pasan a mano: ' + limpio(traspaso) : '',
  ].filter(Boolean).join('\n');

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (form.hp.value) return; // relleno automático de bots: no avanza
    const v = validar();
    if (!v.ok) { v.primero.focus(); return; }
    una('generate_lead', { event_id: F.uuid(), entry_point: entrada });
    form.hidden = true;
    $('#fCal').hidden = false;
    const prog = $('#fProg');
    if (prog) prog.className = 'ficha-prog dos';
    abrirAgenda(notasDe(v.horas));
    $('#ficha').scrollIntoView({ behavior: suave(), block: 'start' });
  });
})();
