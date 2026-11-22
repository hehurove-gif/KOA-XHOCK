// Prueba de humo en el runtime real de Cloudflare (workerd) con D1 local y un Stripe simulado.
//   npm run build && npm run db:migrate:local && node functions/test/e2e-local.mjs
import assert from 'node:assert/strict';
import { signWebhook } from '../_lib/stripe.js';
import { startStack, WEBHOOK_SECRET, ADMIN_TOKEN, RUN } from './harness.mjs';

const stack = await startStack();
const { base: BASE, stripeCalls } = stack;
const log = { toString: () => stack.log };

function form() {
  const f = new FormData();
  const fields = { firstName: 'Ana', lastName: 'López', email: 'ana.e2e@example.com', phone: '+52 55 1234 5678', country: 'MX', quantity: '2', terms: 'accepted', company: '', utm_source: 'e2e' };
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  [['Ana López', '30', 'Center', 'M'], ['Luis López', '8', 'Goalie', 'XS']].forEach((p, i) =>
    ['name', 'age', 'position', 'jerseySize'].forEach((k, j) => f.append(`players[${i}][${k}]`, p[j])));
  return f;
}

let failed = false;
try {
  // 1. checkout
  let res = await fetch(`${BASE}/api/checkout`, { method: 'POST', body: form() });
  assert.equal(res.status, 200, await res.clone().text());
  const { url } = await res.json();
  assert.match(url, new RegExp(`^https://checkout\\.stripe\\.com/c/pay/cs_e2e_${RUN}_1$`));
  assert.equal(stripeCalls[0].get('line_items[0][price_data][unit_amount]'), '17500');
  const orderId = stripeCalls[0].get('client_reference_id');
  console.log('ok  checkout →', url);

  // 2. webhook con firma inválida y válida
  const event = (type, object) => JSON.stringify({ id: `evt_${type}_${Date.now()}`, type, data: { object } });
  const session = { id: `cs_e2e_${RUN}_1`, client_reference_id: orderId, payment_status: 'paid', payment_intent: 'pi_e2e', amount_total: 35000, currency: 'usd' };
  let body = event('checkout.session.completed', session);
  res = await fetch(`${BASE}/api/stripe-webhook`, { method: 'POST', body, headers: { 'Stripe-Signature': 't=1,v1=00' } });
  assert.equal(res.status, 400);
  res = await fetch(`${BASE}/api/stripe-webhook`, { method: 'POST', body, headers: { 'Stripe-Signature': await signWebhook(body, WEBHOOK_SECRET) } });
  assert.equal(res.status, 200, await res.clone().text());
  console.log('ok  webhook firmado');

  // 3. admin
  res = await fetch(`${BASE}/api/admin/registrations?status=paid`);
  assert.equal(res.status, 401);
  res = await fetch(`${BASE}/api/admin/registrations?status=paid`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
  const data = await res.json();
  assert.ok(data.rows.some(r => r.email === 'ana.e2e@example.com' && r.status === 'paid'));
    res = await fetch(`${BASE}/api/admin/registrations?format=csv`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
  assert.match(await res.text(), /Luis López/);
  console.log('ok  admin JSON + CSV');

  // 4. páginas estáticas
  for (const path of ['/', '/tickets.html', '/success.html', '/admin/']) {
    res = await fetch(`${BASE}${path}`);
    assert.equal(res.status, 200, path);
  }
  console.log('ok  páginas estáticas (incluye success y admin)');
  console.log('E2E: todo correcto');
} catch (error) {
  failed = true;
  console.error('E2E falló:', error.message);
  console.error(stack.log.slice(-1500));
} finally {
  stack.stop();
  setTimeout(() => process.exit(failed ? 1 : 0), 500);
}
