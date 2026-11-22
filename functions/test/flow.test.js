// Flujo completo con D1 real (SQLite), Stripe y Resend simulados por servidores HTTP locales.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createD1 } from './d1-shim.js';
import { goodEntries } from './validate.test.js';
import { onRequestPost as checkout } from '../api/checkout.js';
import { onRequestPost as webhook } from '../api/stripe-webhook.js';
import { onRequestGet as admin, csvCell } from '../api/admin/registrations.js';
import { signWebhook } from '../_lib/stripe.js';

const WEBHOOK_SECRET = 'whsec_test_secret';
const ADMIN_TOKEN = 'a'.repeat(40);

let stripeServer, mailServer, stripeCalls, mailCalls, stripeMode, db, env;

function listen(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const urlOf = server => `http://127.0.0.1:${server.address().port}`;

before(async () => {
  stripeServer = await listen((req, res) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      stripeCalls.push({ url: req.url, headers: req.headers, form: new URLSearchParams(body) });
      if (stripeMode === 'fail') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'boom' } }));
      }
      const id = `cs_test_${stripeCalls.length}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, url: `https://checkout.stripe.com/c/pay/${id}` }));
    });
  });
  mailServer = await listen((req, res) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => { mailCalls.push(JSON.parse(body)); res.writeHead(200); res.end('{}'); });
  });
});
after(() => { stripeServer.close(); mailServer.close(); });

beforeEach(() => {
  stripeCalls = []; mailCalls = []; stripeMode = 'ok';
  db = createD1();
  env = {
    DB: db, XHOCK_STATUS: 'open', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_API_BASE: urlOf(stripeServer), ADMIN_TOKEN, PUBLIC_BASE_URL: 'https://koa-hub.com/tickets/'
  };
});

function formRequest(entries, headers = {}) {
  const form = new FormData();
  for (const [k, v] of entries) form.append(k, v);
  return new Request('https://koa-hub.com/tickets/api/checkout', { method: 'POST', body: form, headers: { 'CF-Connecting-IP': '203.0.113.7', ...headers } });
}
const post = (entries, headers, e = env) => checkout({ request: formRequest(entries, headers), env: e });
const count = async (table, where = '1=1') => (await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).first()).n;

async function sendWebhook(type, object, { id = `evt_${Math.random().toString(36).slice(2)}`, secret = WEBHOOK_SECRET, e = env } = {}) {
  const body = JSON.stringify({ id, type, data: { object } });
  const request = new Request('https://x/api/stripe-webhook', {
    method: 'POST', body, headers: { 'Stripe-Signature': await signWebhook(body, secret) }
  });
  const response = await webhook({ request, env: e });
  return { response, data: await response.json(), id };
}

async function createOrder(overrides) {
  const response = await post(goodEntries(overrides));
  assert.equal(response.status, 200, await response.clone().text());
  const { url } = await response.json();
  const order = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1').first();
  return { url, order };
}

const sessionOf = (order, extra = {}) => ({
  id: order.stripe_session_id, client_reference_id: order.id, payment_status: 'paid', payment_intent: 'pi_test_1',
  amount_total: order.amount_total, currency: order.currency, ...extra
});

// ------------------------------------------------------------------ /api/checkout
test('pedido válido: guarda pending en D1 y devuelve la URL de Stripe', async () => {
  const { url, order } = await createOrder();
  assert.match(url, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(order.status, 'pending');
  assert.equal(order.stripe_session_id, 'cs_test_1');
  assert.equal(await count('players'), 2);
  assert.equal(order.ip_hash.length, 32);
  assert.ok(!JSON.stringify(order).includes('203.0.113.7'), 'la IP no se guarda');
});

test('el importe lo calcula el servidor, no el navegador', async () => {
  await createOrder({ quantity: '2', amount: '1', price: '0.01', unit_amount: '1' });
  const form = stripeCalls[0].form;
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '17500');
  assert.equal(form.get('line_items[0][quantity]'), '2');
  assert.equal(form.get('line_items[0][price_data][currency]'), 'usd');
  assert.equal(form.get('mode'), 'payment');
  assert.equal(form.get('success_url'), 'https://koa-hub.com/tickets/success.html');
  assert.equal(form.get('cancel_url'), 'https://koa-hub.com/tickets/tickets.html?checkout=cancelled');
  assert.equal(stripeCalls[0].headers.authorization, 'Bearer sk_test_x');
  assert.ok(stripeCalls[0].headers['idempotency-key'].startsWith('checkout-'));
  assert.equal((await db.prepare('SELECT amount_total FROM orders').first()).amount_total, 35000);
});

test('con la venta cerrada responde 403 y no crea nada', async () => {
  const response = await post(goodEntries(), {}, { ...env, XHOCK_STATUS: 'closed' });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).reason, 'closed');
  assert.equal(await count('orders'), 0);
  assert.equal(stripeCalls.length, 0);
});

test('validación: 422 con mensaje legible y sin pedido', async () => {
  for (const overrides of [{ quantity: '0' }, { quantity: '1000' }, { email: 'x' }, { terms: '' }]) {
    const response = await post(goodEntries(overrides));
    assert.equal(response.status, 422);
    const data = await response.json();
    assert.ok(data.error && data.errors);
  }
  assert.equal((await post([])).status, 422);
  assert.equal(await count('orders'), 0);
  assert.equal(stripeCalls.length, 0);
});

test('honeypot lleno: 200 genérico, sin pedido ni sesión', async () => {
  const response = await post(goodEntries({ company: 'ACME' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(await count('orders'), 0);
  assert.equal(stripeCalls.length, 0);
});

test('método y tipo de contenido incorrectos', async () => {
  const { onRequest } = await import('../api/checkout.js');
  assert.equal((await onRequest({ request: new Request('https://x/api/checkout') })).status, 405);
  const text = new Request('https://x/api/checkout', { method: 'POST', body: 'hola', headers: { 'Content-Type': 'text/plain' } });
  assert.equal((await checkout({ request: text, env })).status, 415);
  const big = new Request('https://x/api/checkout', { method: 'POST', body: 'a=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': '999999' } });
  assert.equal((await checkout({ request: big, env })).status, 413);
});

test('también acepta JSON con el mismo formato', async () => {
  const json = {
    firstName: 'Ana', lastName: 'Lopez', email: 'ana@example.com', phone: '+1 604 555 0100', country: 'CA', quantity: 1, terms: true,
    players: [{ name: 'Ana Lopez', age: 28, position: 'Left Wing', jerseySize: 'S' }]
  };
  const request = new Request('https://x/api/checkout', { method: 'POST', body: JSON.stringify(json), headers: { 'Content-Type': 'application/json' } });
  const response = await checkout({ request, env });
  assert.equal(response.status, 200);
  assert.equal(await count('orders'), 1);
});

test('reintento idéntico (doble clic): mismo enlace, un solo pedido', async () => {
  const a = await (await post(goodEntries())).json();
  const b = await (await post(goodEntries())).json();
  assert.equal(a.url, b.url);
  assert.equal(await count('orders'), 1);
  assert.equal(stripeCalls.length, 1);
});

test('si Stripe falla: 502, pedido marcado failed (sin huérfanos pendientes)', async () => {
  stripeMode = 'fail';
  const response = await post(goodEntries());
  assert.equal(response.status, 502);
  assert.equal((await db.prepare('SELECT status FROM orders').first()).status, 'failed');
  // y un reintento posterior sí crea un pedido nuevo
  stripeMode = 'ok';
  assert.equal((await post(goodEntries())).status, 200);
  assert.equal(await count('orders'), 2);
});

test('sin configuración de Stripe/D1: 503 controlado', async () => {
  const response = await post(goodEntries(), {}, { ...env, STRIPE_SECRET_KEY: undefined });
  assert.equal(response.status, 503);
});

test('límite por correo: 429 con Retry-After tras 5 intentos', async () => {
  const statuses = [];
  for (let i = 0; i < 7; i++) {
    const r = await post(goodEntries({ quantity: '1' }, [{ name: 'Ana Lopez', age: String(20 + i), position: 'Center', jerseySize: 'M' }]));
    statuses.push(r.status);
    if (r.status === 429) assert.equal(r.headers.get('Retry-After'), '600');
  }
  assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.deepEqual(statuses.slice(5), [429, 429]);
});

test('la IP del Worker solo se respeta con el secreto correcto', async () => {
  const e = { ...env, PROXY_SECRET: 's'.repeat(32) };
  await post(goodEntries(), { 'X-Proxy-Client-IP': '198.51.100.9', 'X-Proxy-Secret': e.PROXY_SECRET }, e);
  const trusted = (await db.prepare('SELECT ip_hash FROM orders').first()).ip_hash;
  await db.prepare('DELETE FROM orders').run();
  await post(goodEntries(), { 'X-Proxy-Client-IP': '198.51.100.9', 'X-Proxy-Secret': 'incorrecto' }, e);
  const spoofed = (await db.prepare('SELECT ip_hash FROM orders').first()).ip_hash;
  assert.notEqual(trusted, spoofed, 'con secreto falso se usa la IP de conexión');
});

// ------------------------------------------------------------------ /api/stripe-webhook
test('webhook: firma inválida o ausente → 400 sin tocar el pedido', async () => {
  const { order } = await createOrder();
  const bad = await sendWebhook('checkout.session.completed', sessionOf(order), { secret: 'whsec_otro' });
  assert.equal(bad.response.status, 400);
  const request = new Request('https://x/api/stripe-webhook', { method: 'POST', body: '{}' });
  assert.equal((await webhook({ request, env })).status, 400);
  assert.equal((await db.prepare('SELECT status FROM orders').first()).status, 'pending');
});

test('webhook: firma vieja (replay) se rechaza', async () => {
  const { order } = await createOrder();
  const body = JSON.stringify({ id: 'evt_old', type: 'checkout.session.completed', data: { object: sessionOf(order) } });
  const old = Math.floor(Date.now() / 1000) - 3600;
  const request = new Request('https://x/api/stripe-webhook', { method: 'POST', body, headers: { 'Stripe-Signature': await signWebhook(body, WEBHOOK_SECRET, old) } });
  assert.equal((await webhook({ request, env })).status, 400);
});

test('webhook: pago confirmado → paid, idempotente y un solo correo', async () => {
  env.RESEND_API_KEY = 're_x'; env.MAIL_FROM = 'XHOCK <no-reply@koa-hub.com>'; env.NOTIFY_EMAIL = 'ops@koa-hub.com'; env.RESEND_API_BASE = urlOf(mailServer);
  const { order } = await createOrder();
  const first = await sendWebhook('checkout.session.completed', sessionOf(order), { id: 'evt_1' });
  assert.equal(first.response.status, 200);
  const paid = await db.prepare('SELECT status, paid_at, stripe_payment_intent FROM orders').first();
  assert.equal(paid.status, 'paid');
  assert.ok(paid.paid_at);
  assert.equal(paid.stripe_payment_intent, 'pi_test_1');
  assert.equal(mailCalls.length, 2); // comprador + aviso a KOA

  const again = await sendWebhook('checkout.session.completed', sessionOf(order), { id: 'evt_1' });
  assert.equal(again.data.duplicate, true);
  assert.equal(await count('webhook_events'), 1);
  assert.equal(mailCalls.length, 2, 'el reenvío no duplica correos');
  assert.ok(!JSON.stringify(mailCalls).includes('<script'), 'sin HTML sin escapar');
});

test('webhook: importe distinto al del servidor → review, no paid', async () => {
  const { order } = await createOrder();
  await sendWebhook('checkout.session.completed', sessionOf(order, { amount_total: 100 }));
  const row = await db.prepare('SELECT status, notes FROM orders').first();
  assert.equal(row.status, 'review');
  assert.match(row.notes, /mismatch/i);
});

test('webhook: OXXO/SPEI (pago asíncrono): awaiting_payment → paid, o failed', async () => {
  const { order } = await createOrder();
  await sendWebhook('checkout.session.completed', sessionOf(order, { payment_status: 'unpaid' }));
  assert.equal((await db.prepare('SELECT status FROM orders').first()).status, 'awaiting_payment');
  await sendWebhook('checkout.session.async_payment_succeeded', sessionOf(order));
  assert.equal((await db.prepare('SELECT status FROM orders').first()).status, 'paid');

  const second = await createOrder({ email: 'otro@example.com' });
  await sendWebhook('checkout.session.completed', sessionOf(second.order, { payment_status: 'unpaid' }));
  await sendWebhook('checkout.session.async_payment_failed', sessionOf(second.order));
  assert.equal((await db.prepare('SELECT status FROM orders WHERE id = ?1').bind(second.order.id).first()).status, 'failed');
});

test('webhook: expirada y reembolsada', async () => {
  const { order } = await createOrder();
  await sendWebhook('checkout.session.expired', sessionOf(order, { payment_status: 'unpaid' }));
  assert.equal((await db.prepare('SELECT status FROM orders').first()).status, 'expired');

  const paidOne = await createOrder({ email: 'pago@example.com' });
  await sendWebhook('checkout.session.completed', sessionOf(paidOne.order));
  await sendWebhook('charge.refunded', { payment_intent: 'pi_test_1', refunded: false });
  assert.equal((await db.prepare('SELECT status FROM orders WHERE id = ?1').bind(paidOne.order.id).first()).status, 'paid', 'reembolso parcial no cambia el estado');
  await sendWebhook('charge.refunded', { payment_intent: 'pi_test_1', refunded: true });
  assert.equal((await db.prepare('SELECT status FROM orders WHERE id = ?1').bind(paidOne.order.id).first()).status, 'refunded');
});

test('webhook: eventos desconocidos o de otro sitio se aceptan sin cambios', async () => {
  const ignored = await sendWebhook('customer.created', { id: 'cus_1' });
  assert.equal(ignored.response.status, 200);
  const foreign = await sendWebhook('checkout.session.completed', { id: 'cs_x', client_reference_id: 'no-existe', payment_status: 'paid' });
  assert.equal(foreign.response.status, 200);
  assert.equal(foreign.data.matched, false);
});

// ------------------------------------------------------------------ /api/admin/registrations
const adminRequest = (path = '', token = ADMIN_TOKEN) =>
  new Request(`https://koa-hub.com/tickets/api/admin/registrations${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('admin: sin token o con token incorrecto → 401; sin configurar → 503', async () => {
  assert.equal((await admin({ request: adminRequest('', null), env })).status, 401);
  assert.equal((await admin({ request: adminRequest('', 'x'.repeat(40)), env })).status, 401);
  assert.equal((await admin({ request: adminRequest(), env: { ...env, ADMIN_TOKEN: 'corto' } })).status, 503);
  assert.equal((await admin({ request: adminRequest(), env: { ...env, ADMIN_TOKEN: undefined } })).status, 503);
});

test('admin: JSON y CSV con filtro por estado', async () => {
  const a = await createOrder();
  await sendWebhook('checkout.session.completed', sessionOf(a.order));
  await createOrder({ email: 'pendiente@example.com' });

  const all = await (await admin({ request: adminRequest(), env })).json();
  assert.equal(all.count, 4); // 2 pedidos × 2 jugadores
  const paid = await (await admin({ request: adminRequest('?status=paid'), env })).json();
  assert.equal(paid.count, 2);
  assert.equal((await admin({ request: adminRequest('?status=hack'), env })).status, 400);

  const csv = await admin({ request: adminRequest('?status=paid&format=csv'), env });
  assert.match(csv.headers.get('Content-Type'), /text\/csv/);
  const bytes = new Uint8Array(await csv.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'BOM UTF-8 para que Excel lea los acentos');
  const lines = new TextDecoder().decode(bytes).trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^order_id,status,/);
  assert.ok(lines[1].includes('paid') && lines[1].includes('maria@example.com'));
  assert.ok(lines[1].includes('350.00'), 'importe total del pedido');
});

test('csvCell neutraliza fórmulas y escapa comillas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+525512345678'), `'+525512345678`);
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(34), '34');
});
