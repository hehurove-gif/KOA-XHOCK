// POST /api/checkout — valida, guarda el pedido como "pending" en D1 y devuelve la URL de Stripe Checkout.
// El pedido solo pasa a "paid" desde el webhook firmado (api/stripe-webhook.js), nunca desde el navegador.
import { getConfig, LIMITS } from '../_lib/config.js';
import { parseForm, validateCheckout, firstErrorMessage } from '../_lib/validate.js';
import { json, methodNotAllowed, clientIp, sha256Hex } from '../_lib/http.js';
import { isRateLimited, purgeOldRateLimits, findRecentPendingOrder, insertOrder, attachSession, markFailed } from '../_lib/db.js';
import { createCheckoutSession } from '../_lib/stripe.js';
import { verifyTurnstile } from '../_lib/turnstile.js';

const IP_LIMIT = 30;     // peticiones por IP y ventana (varias personas pueden compartir red)
const EMAIL_LIMIT = 5;   // intentos por correo y ventana
const WINDOW_SECONDS = 600;

async function readBody(request) {
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > LIMITS.maxBodyBytes) return { status: 413, error: 'Request body is too large.' };

  if (type === 'multipart/form-data' || type === 'application/x-www-form-urlencoded') {
    const form = await request.formData().catch(() => null);
    if (!form) return { status: 400, error: 'Malformed form body.' };
    return { input: parseForm(form.entries()) };
  }
  if (type === 'application/json') {
    const text = await request.text();
    if (text.length > LIMITS.maxBodyBytes) return { status: 413, error: 'Request body is too large.' };
    let data;
    try { data = JSON.parse(text); } catch { return { status: 400, error: 'Malformed JSON body.' }; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 400, error: 'The JSON body must be an object.' };
    // Mismo formato que FormData: se aplanan los jugadores para reutilizar el parser.
    const entries = Object.entries(data).filter(([k]) => k !== 'players').map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]);
    (Array.isArray(data.players) ? data.players : []).forEach((p, i) => {
      for (const f of ['name', 'age', 'position', 'jerseySize']) entries.push([`players[${i}][${f}]`, String(p?.[f] ?? '')]);
    });
    return { input: parseForm(entries) };
  }
  return { status: 415, error: 'Unsupported content type.' };
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
  const payloadHash = await sha256Hex(JSON.stringify([value.email, value.firstName, value.lastName, value.phone, value.country, value.quantity, value.players]));
  const existing = await findRecentPendingOrder(env.DB, payloadHash);
  if (existing) return json(200, { url: existing.checkout_url });

  const order = {
    id: crypto.randomUUID(),
    ...value,
    unitAmount: config.unitAmount,
    amountTotal: config.unitAmount * value.quantity, // el servidor calcula el importe, siempre
    currency: config.currency,
    payloadHash,
    termsVersion: config.termsVersion,
    ipHash
  };

  try {
    await insertOrder(env.DB, order, value.players);
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
