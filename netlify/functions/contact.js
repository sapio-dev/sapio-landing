import { Resend } from 'resend';

const TO_EMAIL = process.env.CONTACT_TO || 'diego@sapio.dev';
const FROM_EMAIL = process.env.RESEND_FROM || 'Sapio <onboarding@sapio.dev>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot: bots completan campos ocultos. Devolvemos 200 para no darles señal.
  if (body?.website) {
    return Response.json({ ok: true });
  }

  const email = (body?.email || '').toString().trim().toLowerCase();
  // `source` lo manda el cliente y ahora viaja en el asunto del correo:
  // se limita a lo que usan las landings (letras, numeros y guiones) para
  // que nadie meta saltos de linea ahi con un POST directo.
  const source = (body?.source || 'unknown').toString()
    .replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'unknown';

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY');
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const safeEmail = escapeHtml(email);
  const safeSource = escapeHtml(source);

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color: #111; line-height: 1.55;">
      <p>Hola Diego,</p>
      <p>El correo <strong>${safeEmail}</strong> quiere que lo contacten.</p>
      <p style="font-size: 12px; color: #777; margin-top: 24px;">
        Origen: ${safeSource} · sapio.dev
      </p>
    </div>
  `;
  const text = `Hola Diego,

El correo ${email} quiere que lo contacten.

Origen: ${source} · sapio.dev`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      replyTo: email,
      subject: `Sapio — nueva consulta desde ${source} (${email})`,
      html,
      text
    });
    if (error) {
      console.error('Resend error:', error);
      return Response.json({ error: 'send failed' }, { status: 502 });
    }
    return Response.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('Contact handler error:', err);
    return Response.json({ error: 'internal' }, { status: 500 });
  }
};

export const config = {
  path: '/api/contact'
};
