/* Sapio — la página del análisis gratis (/analisis/ y /en/analysis/).
   Desde el 02/11, un solo paso: la agenda de Cal.com abierta de entrada, sin formulario antes
   (Nico: «debería ser así de simple»). Cal.com pide nombre y correo al confirmar la hora, y la reserva
   llega al calendario del experto. No hay backend: todo queda en Cal.com.
   Medición para GTM (js/funnel.js), sin datos personales:
     booking_started         la agenda se vio por primera vez (bookerViewed de Cal.com)
     lead_form_start         primer clic dentro de la agenda
     generate_lead           reservó (sin formulario, el prospecto nace con la reserva)
     demo_booking_confirmed  reservó: Cal.com confirmó la hora en el navegador */
(() => {
  'use strict';
  const D = JSON.parse(document.getElementById('sapio-datos').textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const F = window.SapioFunnel || { push() {}, uuid: () => String(Date.now()), touches: () => ({}) };
  const caja = $('#calEmbed');
  if (!caja) return;

  // Desde qué página llegó (?origen=inicio, ?origen=clinicas…): va a la medición y a la reserva.
  const origen = (new URLSearchParams(location.search).get('origen') || '').slice(0, 60);
  const entrada = origen || 'directo';

  // Lo que escribió en la portada («¿Qué hace tu equipo a mano?») llega por sessionStorage y queda
  // escrito en las notas de la reunión.
  let notas = '';
  try { notas = sessionStorage.getItem('sapio-trabajo') || ''; sessionStorage.removeItem('sapio-trabajo'); } catch (e) { /* sin sessionStorage */ }

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

  // La medición: cada evento una sola vez por visita a la página.
  const hecho = {};
  const una = (n, params) => { if (hecho[n]) return; hecho[n] = 1; F.push(n, params); };
  Cal.ns.agenda('on', { action: 'bookerViewed', callback: () => una('booking_started', { entry_point: entrada }) });
  // El primer clic dentro de la agenda: el foco pasa de la página al iframe de Cal.com.
  addEventListener('blur', () => setTimeout(() => {
    const a = document.activeElement;
    if (a && a.tagName === 'IFRAME' && caja.contains(a)) una('lead_form_start', { entry_point: entrada });
  }, 0));

  const reservado = (e) => {
    if (hecho.reserva) return;
    hecho.reserva = 1;
    const datos = (e && e.detail && e.detail.data) || {};
    const id = datos.uid || F.uuid();
    F.push('generate_lead', { event_id: id, entry_point: entrada });
    F.push('demo_booking_confirmed', { event_id: id + ':booked', confirmed_by: 'cal_embed' });
    $('#fCal').hidden = true;
    $('#fDone').hidden = false;
    $('#fDoneH').focus({ preventScroll: true });
    $('#ficha').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  };
  Cal.ns.agenda('on', { action: 'bookingSuccessfulV2', callback: reservado });
  Cal.ns.agenda('on', { action: 'bookingSuccessful', callback: reservado });
})();
