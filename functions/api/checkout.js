// POST /api/checkout — valida, guarda el pedido como "pending" en D1 y devuelve la URL de Stripe Checkout.
// El pedido solo pasa a "paid" desde el webhook firmado (api/stripe-webhook.js), nunca desde el navegador.
import { getConfig, LIMITS } from '../_lib/config.js';
import { parseForm, validateCheckout, firstErrorMessage } from '../_lib/validate.js';
import { json, methodNotAllowed, clientIp, sha256Hex } from '../_lib/http.js';
import { isRateLimited, purgeOldRateLimits, findRecentPendingOrder, insertOrder, attachSession, markFailed } from '../_lib/db.js';
import { createCheckoutSession } from '../_lib/stripe.js';
import { verifyTurnstile } from '../_lib/turnstile.js';
import { priceOrder } from '../_lib/pricing.js';

const IP_LIMIT = 30;     // peticiones por IP y ventana (varias personas pueden compartir red)
const EMAIL_LIMIT = 5;   // intentos por correo y ventana
const WINDOW_SECONDS = 600;

// Lee el cuerpo con tope de tamaño aunque no venga Content-Length (transferencia por fragmentos).
async function readLimited(request, max) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > max) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function readBody(request) {
  const contentType = request.headers.get('Content-Type') || '';
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (!['multipart/form-data', 'application/x-www-form-urlencoded', 'application/json'].includes(type)) {
    return { status: 415, error: 'Unsupported content type.' };
  }
  const bytes = await readLimited(request, LIMITS.maxBodyBytes);
  if (bytes === null) return { status: 413, error: 'Request body is too large.' };

  if (type === 'application/json') {
    let data;
    try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return { status: 400, error: 'Malformed JSON body.' }; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 400, error: 'The JSON body must be an object.' };
    // Mismo formato que FormData: se aplanan los jugadores para reutilizar el parser.
    const entries = Object.entries(data).filter(([k]) => k !== 'players').map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]);
    (Array.isArray(data.players) ? data.players : []).slice(0, 20).forEach((p, i) => {
      for (const f of ['name', 'age', 'position', 'jerseySize']) entries.push([`players[${i}][${f}]`, String(p?.[f] ?? '')]);
    });
    return { input: parseForm(entries) };
  }
  const form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData().catch(() => null);
  if (!form) return { status: 400, error: 'Malformed form body.' };
  return { input: parseForm(form.entries()) };
}

// El formulario solo se acepta desde el propio sitio (evita envíos desde páginas de terceros).
function originAllowed(request, config) {
  const origin = request.headers.get('Origin');
  if (!origin || origin === 'null') return !origin; // sin Origin (herramientas/servidor): permitido; "null": no
  try {
    return new Set([new URL(request.url).origin, new URL(config.baseUrl).origin]).has(origin);
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  const config = getConfig(env);

  if (!config.open) {
    return json(403, { error: 'Ticket sales are closed.', reason: 'closed' });
  }
  if (!env.DB || !env.STRIPE_SECRET_KEY) {
    console.error('checkout: missing DB binding or STRIPE_SECRET_KEY');
    return json(503, { error: 'Payments are not available right now. Please contact KOA on WhatsApp.', reason: 'unavailable' });
  }

  if (!originAllowed(request, config)) return json(403, { error: 'Forbidden origin.' });

  const body = await readBody(request);
  if (body.error) return json(body.status, { error: body.error });

  // Honeypot: un humano nunca llena este campo oculto. Respuesta genérica, sin procesar nada.
  if (String(body.input.company || '').trim() !== '') return json(200, { ok: true });

  // Captcha (solo si TURNSTILE_SECRET está configurado). Se comprueba antes de validar y de tocar la base de datos.
  const captcha = await verifyTurnstile(env, body.input['cf-turnstile-response'], clientIp(request, env));
  if (!captcha.ok) {
    if (captcha.reason === 'unavailable') return json(503, { error: 'Security check unavailable. Please try again in a moment.', reason: 'captcha_unavailable' });
    return json(400, { error: 'Please complete the security check and try again.', reason: 'captcha' });
  }

  const { errors, value } = validateCheckout(body.input);
  if (Object.keys(errors).length) {
    return json(422, { error: firstErrorMessage(errors), errors });
  }

  const salt = env.HASH_SALT || 'koa-xhock';
  const ipHash = (await sha256Hex(`${salt}:${clientIp(request, env)}`)).slice(0, 32);
  const emailHash = (await sha256Hex(`${salt}:${value.email}`)).slice(0, 32);
  if (
    (await isRateLimited(env.DB, `ip:${ipHash}`, IP_LIMIT, WINDOW_SECONDS)) ||
    (await isRateLimited(env.DB, `email:${emailHash}`, EMAIL_LIMIT, WINDOW_SECONDS))
  ) {
    return json(429, { error: 'Too many attempts. Please wait a few minutes and try again.' }, { 'Retry-After': String(WINDOW_SECONDS) });
  }
  if (Math.random() < 0.02) await purgeOldRateLimits(env.DB).catch(() => {});

  // Reintento idéntico: mismo enlace de pago, sin crear otro pedido.
  // El servidor calcula el precio de cada jugador (edad, preventa); el navegador nunca manda importes.
  const priced = priceOrder(value.players, config.pricing);
  const payloadHash = await sha256Hex(JSON.stringify([value.email, value.firstName, value.lastName, value.phone, value.country, value.quantity, value.players, priced.total]));
  const existing = await findRecentPendingOrder(env.DB, payloadHash);
  if (existing) return json(200, { url: existing.checkout_url });

  const order = {
    id: crypto.randomUUID(),
    ...value,
    players: priced.players,
    lines: priced.lines,
    unitAmount: config.pricing.adult,
    amountTotal: priced.total,
    currency: config.currency,
    payloadHash,
    termsVersion: config.termsVersion,
    ipHash
  };

  try {
    await insertOrder(env.DB, order, priced.players);
  } catch (error) {
    console.error('checkout: insert failed', error?.message);
    return json(500, { error: 'We could not save your registration. Please try again.' });
  }

  try {
    const session = await createCheckoutSession(env, {
      order,
      config,
      successUrl: new URL('success.html', config.baseUrl).href,
      cancelUrl: new URL('tickets.html?checkout=cancelled', config.baseUrl).href,
      description: `${order.quantity} player${order.quantity > 1 ? 's' : ''} · ${config.venue}`
    });
    await attachSession(env.DB, order.id, session);
    return json(200, { url: session.url });
  } catch (error) {
    console.error('checkout: stripe failed', error?.message);
    await markFailed(env.DB, order.id, error?.message || 'stripe error').catch(() => {});
    return json(502, { error: 'The payment provider is not available right now. Please try again in a few minutes.', reason: 'unavailable' });
  }
}

export async function onRequest({ request }) {
  return methodNotAllowed('POST');
}
