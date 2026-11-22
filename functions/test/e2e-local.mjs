// Prueba de humo en el runtime real de Cloudflare (workerd) con D1 local y un Stripe simulado.
//   npm run build && npm run db:migrate:local && node functions/test/e2e-local.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { signWebhook } from '../_lib/stripe.js';

const PORT = 8788;
const STRIPE_PORT = 8765;
const BASE = `http://127.0.0.1:${PORT}`;
const WEBHOOK_SECRET = 'whsec_e2e';
const ADMIN_TOKEN = 'e2e-admin-token-'.padEnd(40, 'x');

const stripeCalls = [];
const stripe = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    stripeCalls.push(new URLSearchParams(body));
    const id = `cs_e2e_${stripeCalls.length}`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id, url: `https://checkout.stripe.com/c/pay/${id}` }));
  });
}).listen(STRIPE_PORT, '127.0.0.1');

const dev = spawn('npx', [
  'wrangler', 'pages', 'dev', '_site', '--port', String(PORT), '--local',
  '--binding', 'STRIPE_SECRET_KEY=sk_test_e2e', `STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}`,
  `STRIPE_API_BASE=http://127.0.0.1:${STRIPE_PORT}`, 'XHOCK_STATUS=open', `ADMIN_TOKEN=${ADMIN_TOKEN}`,
  `PUBLIC_BASE_URL=${BASE}/`
], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
dev.stdout.on('data', d => (log += d));
dev.stderr.on('data', d => (log += d));

async function waitReady() {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(`${BASE}/`)).ok) return; } catch { /* aún no */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('wrangler no arrancó:\n' + log.slice(-2000));
}

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
  await waitReady();

  // 1. checkout
  let res = await fetch(`${BASE}/api/checkout`, { method: 'POST', body: form() });
  assert.equal(res.status, 200, await res.clone().text());
  const { url } = await res.json();
  assert.match(url, /^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_e2e_1$/);
  assert.equal(stripeCalls[0].get('line_items[0][price_data][unit_amount]'), '17500');
  const orderId = stripeCalls[0].get('client_reference_id');
  console.log('ok  checkout →', url);

  // 2. webhook con firma inválida y válida
  const event = (type, object) => JSON.stringify({ id: `evt_${type}_${Date.now()}`, type, data: { object } });
  const session = { id: 'cs_e2e_1', client_reference_id: orderId, payment_status: 'paid', payment_intent: 'pi_e2e', amount_total: 35000, currency: 'usd' };
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
  assert.equal(data.count, 2);
  assert.equal(data.rows[0].status, 'paid');
  assert.equal(data.rows[0].utm_source, 'e2e');
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
  console.error(log.slice(-1500));
} finally {
  dev.kill('SIGTERM');
  stripe.close();
  setTimeout(() => process.exit(failed ? 1 : 0), 500);
}
