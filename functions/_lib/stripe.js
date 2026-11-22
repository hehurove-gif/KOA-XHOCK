// Cliente mínimo de Stripe sobre fetch (sin SDK: arranca más rápido en Workers).
import { timingSafeEqual } from './http.js';

const encoder = new TextEncoder();

function apiBase(env) {
  return String(env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, '');
}

export async function createCheckoutSession(env, { order, config, successUrl, cancelUrl, description }) {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', order.id);
  body.set('customer_email', order.email);
  body.set('expires_at', String(Math.floor(Date.now() / 1000) + 60 * 60));
  body.set('metadata[order_id]', order.id);
  body.set('payment_intent_data[metadata][order_id]', order.id);
  body.set('line_items[0][quantity]', String(order.quantity));
  body.set('line_items[0][price_data][currency]', config.currency);
  body.set('line_items[0][price_data][unit_amount]', String(config.unitAmount));
  body.set('line_items[0][price_data][product_data][name]', `${config.eventName} — Player Ticket`);
  body.set('line_items[0][price_data][product_data][description]', description);

  const response = await fetch(`${apiBase(env)}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `checkout-${order.id}`
    },
    body,
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id || !data.url) {
    const detail = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Stripe session failed: ${detail}`);
  }
  return { id: data.id, url: data.url };
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verifica `Stripe-Signature` (https://docs.stripe.com/webhooks#verify-manually).
export async function verifyWebhook(rawBody, header, secret, { toleranceSeconds = 300, now = Date.now() } = {}) {
  if (!header || !secret) return false;
  const parts = header.split(',').map(p => p.trim().split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > toleranceSeconds) return false;
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return signatures.some(candidate => timingSafeEqual(candidate, expected));
}

// Firma un cuerpo como lo haría Stripe (para pruebas locales).
export async function signWebhook(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${await hmacHex(secret, `${timestamp}.${rawBody}`)}`;
}
