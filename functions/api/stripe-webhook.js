// POST /api/stripe-webhook — única fuente de verdad del estado de pago.
// Verifica la firma de Stripe, es idempotente (tabla webhook_events) y tolera pagos asíncronos (OXXO/SPEI).
import { getConfig } from '../_lib/config.js';
import { json, methodNotAllowed, nowIso } from '../_lib/http.js';
import { verifyWebhook } from '../_lib/stripe.js';
import { getOrderWithPlayers } from '../_lib/db.js';
import { sendPaidEmails } from '../_lib/email.js';

const HANDLED = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'charge.refunded'
]);

// Devuelve la sentencia UPDATE (o null) que corresponde al evento.
function planUpdate(db, event, order) {
  const obj = event.data.object;
  const now = nowIso();

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const paid = obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required';
    if (!paid) {
      // Voucher emitido (OXXO/SPEI): se espera el pago.
      return db.prepare(`UPDATE orders SET status = 'awaiting_payment', stripe_session_id = ?2, stripe_payment_intent = ?3, updated_at = ?4
                         WHERE id = ?1 AND status = 'pending'`).bind(order.id, obj.id, obj.payment_intent ?? null, now);
    }
    // Pago confirmado: solo es "paid" si importe y moneda coinciden con lo que calculó el servidor.
    const matches = obj.amount_total === order.amount_total && String(obj.currency).toLowerCase() === order.currency;
    const status = matches ? 'paid' : 'review';
    const note = matches ? null : `Amount mismatch: stripe ${obj.amount_total} ${obj.currency} vs order ${order.amount_total} ${order.currency}`;
    return db.prepare(`UPDATE orders SET status = ?2, paid_at = ?3, stripe_session_id = ?4, stripe_payment_intent = ?5, notes = COALESCE(?6, notes), updated_at = ?3
                       WHERE id = ?1 AND status NOT IN ('paid','refunded')`)
      .bind(order.id, status, now, obj.id, obj.payment_intent ?? null, note);
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    return db.prepare(`UPDATE orders SET status = 'failed', updated_at = ?2 WHERE id = ?1 AND status IN ('pending','awaiting_payment')`).bind(order.id, now);
  }
  if (event.type === 'checkout.session.expired') {
    return db.prepare(`UPDATE orders SET status = 'expired', updated_at = ?2 WHERE id = ?1 AND status IN ('pending','awaiting_payment')`).bind(order.id, now);
  }
  if (event.type === 'charge.refunded' && obj.refunded === true) {
    return db.prepare(`UPDATE orders SET status = 'refunded', updated_at = ?2 WHERE id = ?1 AND status != 'refunded'`).bind(order.id, now);
  }
  return null;
}

async function findOrder(db, event) {
  const obj = event.data.object;
  if (event.type === 'charge.refunded') {
    if (!obj.payment_intent) return null;
    return db.prepare('SELECT id, amount_total, currency FROM orders WHERE stripe_payment_intent = ?1').bind(obj.payment_intent).first();
  }
  const orderId = obj.client_reference_id || obj.metadata?.order_id;
  if (!orderId) return null;
  return db.prepare('SELECT id, amount_total, currency FROM orders WHERE id = ?1').bind(orderId).first();
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET) {
    console.error('webhook: missing DB binding or STRIPE_WEBHOOK_SECRET');
    return json(503, { error: 'Webhook is not configured.' });
  }

  const rawBody = await request.text();
  const valid = await verifyWebhook(rawBody, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json(400, { error: 'Invalid signature.' });

  let event;
  try { event = JSON.parse(rawBody); } catch { return json(400, { error: 'Malformed body.' }); }
  if (!event?.id || !event?.type || !event?.data?.object) return json(400, { error: 'Malformed event.' });

  // Eventos que no usamos: se aceptan para que Stripe no los reintente.
  if (!HANDLED.has(event.type)) return json(200, { received: true, ignored: true });

  const order = await findOrder(env.DB, event);
  if (!order) {
    // Puede ser un pago ajeno a este sitio (misma cuenta de Stripe). Se registra y se acepta.
    console.warn('webhook: no matching order for', event.type, event.id);
    return json(200, { received: true, matched: false });
  }

  const update = planUpdate(env.DB, event, order);
  const statements = [
    env.DB.prepare('INSERT OR IGNORE INTO webhook_events (id, type, received_at) VALUES (?1, ?2, ?3)').bind(event.id, event.type, nowIso())
  ];
  if (update) statements.push(update);

  let results;
  try {
    results = await env.DB.batch(statements); // transacción: evento + cambio de estado juntos
  } catch (error) {
    console.error('webhook: db failure', error?.message);
    return json(500, { error: 'Temporary failure.' }); // Stripe reintenta
  }

  const firstTime = results[0].meta.changes > 0;
  const changed = update && results[1].meta.changes > 0;
  if (firstTime && changed && update) {
    const fresh = await getOrderWithPlayers(env.DB, order.id);
    if (fresh?.status === 'paid') await sendPaidEmails(env, getConfig(env), fresh);
  }
  return json(200, { received: true, duplicate: !firstTime });
}

export async function onRequest() {
  return methodNotAllowed('POST');
}
