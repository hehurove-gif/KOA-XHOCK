// Pruebas de seguridad: entradas maliciosas contra /api/checkout, /api/admin/* y /api/stripe-webhook.
// Cada caso comprueba que (a) se rechaza o se guarda como TEXTO inofensivo y (b) la base de datos sigue intacta.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createD1 } from './d1-shim.js';
import { goodEntries } from './validate.test.js';
import { onRequestPost as checkout } from '../api/checkout.js';
import { onRequestPost as webhook } from '../api/stripe-webhook.js';
import { onRequestGet as admin, csvCell } from '../api/admin/registrations.js';
import { onRequestPost as assignTeam } from '../api/admin/team.js';
import { signWebhook } from '../_lib/stripe.js';
import { escapeHtml } from '../_lib/http.js';

const ADMIN_TOKEN = 'a'.repeat(40);
const WEBHOOK_SECRET = 'whsec_sec';
let stripe, db, env;

before(async () => {
  stripe = await new Promise(resolve => {
    const server = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ id: `cs_${Math.random()}`, url: 'https://checkout.stripe.com/c/pay/x' })); });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
});
after(() => stripe.close());
beforeEach(() => {
  db = createD1();
  env = { DB: db, XHOCK_STATUS: 'open', STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, STRIPE_API_BASE: `http://127.0.0.1:${stripe.address().port}`, ADMIN_TOKEN, PUBLIC_BASE_URL: 'https://koa-hub.com/tickets/' };
});

const request = (entries, headers = {}) => {
  const form = new FormData();
  for (const [k, v] of entries) form.append(k, v);
  return new Request('https://koa-hub.com/tickets/api/checkout', { method: 'POST', body: form, headers: { 'CF-Connecting-IP': `198.51.100.${Math.floor(Math.random() * 200)}`, ...headers } });
};
const post = (entries, headers) => checkout({ request: request(entries, headers), env });
const tables = async () => (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(r => r.name);
const count = async table => (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;
const adminReq = (query = '', token = ADMIN_TOKEN, ip = '203.0.113.9') => new Request(`https://x/api/admin/registrations${query}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'CF-Connecting-IP': ip } });

const SQLI = [
  "'; DROP TABLE orders; --", "' OR '1'='1", "\" OR 1=1 --", "x'); DELETE FROM players; --",
  "1; UPDATE orders SET status='paid'", "' UNION SELECT * FROM sqlite_master --", "Robert'); DROP TABLE players;--"
];
const XSS = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "javascript:alert(1)", '<svg/onload=alert(1)>', '{{7*7}}', '${7*7}'];

const TEXT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'country', 'quantity', 'terms'];

test('SQLi/XSS en cada campo del contacto: se rechaza y no toca la base de datos', async () => {
  const before = await tables();
  for (const field of TEXT_FIELDS) {
    for (const payload of [...SQLI, ...XSS]) {
      const response = await post(goodEntries({ [field]: payload }));
      assert.ok([400, 422].includes(response.status), `${field} = ${payload} → ${response.status}`);
    }
  }
  assert.deepEqual(await tables(), before);
  assert.equal(await count('orders'), 0);
});

test('SQLi/XSS en los datos de cada jugador: se rechaza', async () => {
  for (const field of ['name', 'age', 'position', 'jerseySize']) {
    for (const payload of [...SQLI, ...XSS]) {
      const players = [{ name: 'Ana', age: '30', position: 'Center', jerseySize: 'M', [field]: payload }, { name: 'Luis', age: '10', position: 'Goalie', jerseySize: 'S' }];
      const response = await post(goodEntries({}, players));
      assert.equal(response.status, 422, `${field} = ${payload}`);
    }
  }
  assert.equal(await count('orders'), 0);
});

test('campos de atribución (texto libre): se guardan como parámetro, sin < >, acotados y la base sigue intacta', async () => {
  const response = await post(goodEntries({ utm_source: "x'); DROP TABLE orders;--", utm_campaign: '<script>alert(1)</script>', landing_page: 'a'.repeat(5000) }));
  assert.equal(response.status, 200);
  assert.deepEqual((await tables()).includes('orders'), true);
  const attribution = JSON.parse((await db.prepare('SELECT attribution FROM orders').first()).attribution);
  assert.ok(!/[<>]/.test(JSON.stringify(attribution)), 'sin < ni >');
  assert.ok(attribution.landing_page.length <= 300);
});

test('claves inesperadas y contaminación de prototipo se ignoran', async () => {
  const response = await post([...goodEntries(), ['__proto__', 'x'], ['constructor', 'x'], ['isAdmin', 'true'], ['status', 'paid'], ['players[0][__proto__]', 'x'], ['players[0][status]', 'paid'], ['amount_total', '1'], ['unit_amount', '1']]);
  assert.equal(response.status, 200);
  assert.equal(({}).isAdmin, undefined);
  const order = await db.prepare('SELECT status, amount_total FROM orders').first();
  assert.deepEqual([order.status, order.amount_total], ['pending', 35000]);
});

test('JSON: valores anidados, tipos raros y claves peligrosas no rompen ni se cuelan', async () => {
  const body = JSON.stringify({ firstName: { $ne: 1 }, lastName: ['a'], email: 123, phone: null, country: true, quantity: { valueOf: 1 }, terms: 'accepted', players: [{ name: { a: 1 } }], __proto__: { polluted: true } });
  const response = await checkout({ request: new Request('https://koa-hub.com/tickets/api/checkout', { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.1' } }), env });
  assert.equal(response.status, 422);
  assert.equal(({}).polluted, undefined);
  const bad = await checkout({ request: new Request('https://koa-hub.com/tickets/api/checkout', { method: 'POST', body: '{"a":', headers: { 'Content-Type': 'application/json' } }), env });
  assert.equal(bad.status, 400);
});

test('límites: cuerpo enorme, demasiados jugadores, índices disparatados y Unicode peligroso', async () => {
  const huge = await post([...goodEntries(), ['company', 'x'.repeat(200000)]]);
  assert.equal(huge.status, 413);

  const many = Array.from({ length: 30 }, (_, i) => ({ name: `P${i}`, age: '20', position: 'Center', jerseySize: 'M' }));
  assert.equal((await post(goodEntries({ quantity: '30' }, many))).status, 422);
  assert.equal((await post(goodEntries({ quantity: '999999999999999999999' }))).status, 422);
  assert.equal((await post(goodEntries({ quantity: '-1' }))).status, 422);
  assert.equal((await post(goodEntries({ quantity: '1e1' }))).status, 422);
  assert.equal((await post(goodEntries({ quantity: '０２' }))).status, 422, 'dígitos de ancho completo');

  const sparse = [...goodEntries().filter(([k]) => !k.startsWith('players[')), ['players[0][name]', 'Ana'], ['players[99][name]', 'Luis']];
  assert.equal((await post(sparse)).status, 422);

  for (const name of ['Ana‮evil', 'A\u0000na', 'Ana\r\nBcc: x@evil.com', 'ＡＮＡ<', 'Ana​x', '𝕬na']) {
    const response = await post(goodEntries({ firstName: name }));
    assert.ok([200, 422].includes(response.status), name);
    if (response.status === 200) {
      const stored = (await db.prepare('SELECT first_name FROM orders ORDER BY created_at DESC LIMIT 1').first()).first_name;
      assert.ok(!/[\u0000-\u001F‮​<>]/.test(stored), `guardado limpio: ${JSON.stringify(stored)}`);
    }
  }
  assert.equal(await count('orders') >= 0, true);
});

test('cabeceras: Content-Type no permitido y Origin ajeno', async () => {
  const text = await checkout({ request: new Request('https://koa-hub.com/tickets/api/checkout', { method: 'POST', body: 'x', headers: { 'Content-Type': 'text/plain' } }), env });
  assert.equal(text.status, 415);
  assert.equal((await post(goodEntries(), { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(goodEntries(), { Origin: 'null' })).status, 403);
  assert.equal(await count('orders'), 0);
});

test('admin: filtros con SQLi no ejecutan nada y el estado/fechas/país se validan', async () => {
  const before = await tables();
  for (const payload of SQLI) {
    for (const key of ['q', 'team']) {
      const response = await admin({ request: adminReq(`?${key}=${encodeURIComponent(payload)}`), env });
      assert.equal(response.status, 200, `${key}=${payload}`);
    }
    for (const key of ['status', 'country', 'from', 'to']) {
      const response = await admin({ request: adminReq(`?${key}=${encodeURIComponent(payload)}`), env });
      assert.equal(response.status, 400, `${key}=${payload}`);
    }
  }
  assert.deepEqual(await tables(), before);
});

test('admin: el nombre del CSV no se puede manipular con el parámetro status (inyección de cabeceras)', async () => {
  const response = await admin({ request: adminReq('?format=csv&status=paid%0D%0ASet-Cookie:%20x=1'), env });
  assert.equal(response.status, 400);
  const ok = await admin({ request: adminReq('?format=csv&status=paid'), env });
  assert.match(ok.headers.get('Content-Disposition'), /^attachment; filename="xhock-registrations-paid\.csv"$/);
});

test('admin/team: ids no enteros, listas enormes y nombres con control o SQLi', async () => {
  const send = body => assignTeam({ request: new Request('https://x/api/admin/team', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'CF-Connecting-IP': '203.0.113.9' } }), env });
  assert.equal((await send({ player_ids: [1.5], team: 'A' })).status, 422);
  assert.equal((await send({ player_ids: ['1 OR 1=1'], team: 'A' })).status, 422);
  assert.equal((await send({ player_ids: [-1], team: 'A' })).status, 422);
  assert.equal((await send({ player_ids: Array.from({ length: 301 }, (_, i) => i + 1), team: 'A' })).status, 422);
  assert.equal((await send({ player_ids: [1], team: { $ne: 1 } })).status, 422);
  const bad = await assignTeam({ request: new Request('https://x/api/admin/team', { method: 'POST', body: '{', headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }), env });
  assert.equal(bad.status, 400);
  const response = await send({ player_ids: [1], team: "x'); DROP TABLE players;--" });
  assert.equal(response.status, 200);
  assert.ok((await tables()).includes('players'));
});

test('CSV: las celdas que empiezan con = + - @ se neutralizan', () => {
  for (const f of ['=HYPERLINK("http://evil")', '+1+1', '-2+3', '@SUM(A1)', '\t=1', '\r=1']) assert.match(csvCell(f), /^"?'/, f);
  assert.equal(csvCell('normal'), 'normal');
  assert.equal(csvCell('a,b'), '"a,b"');
});

test('HTML de correos: escapeHtml neutraliza etiquetas y comillas', () => {
  const out = escapeHtml(`<img src=x onerror="alert('x')">&`);
  assert.ok(!/[<>"']/.test(out));
});

test('admin: fuerza bruta de token → 429 tras 10 fallos, incluso con el token correcto', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await admin({ request: adminReq('', 'mal-token-' + i, '192.0.2.50'), env })).status, 401);
  assert.equal((await admin({ request: adminReq('', 'otro', '192.0.2.50'), env })).status, 429);
  assert.equal((await admin({ request: adminReq('', ADMIN_TOKEN, '192.0.2.50'), env })).status, 429);
  assert.equal((await admin({ request: adminReq('', ADMIN_TOKEN, '192.0.2.51'), env })).status, 200, 'otra IP no se ve afectada');
});

test('admin: sin token, token corto o mal formado', async () => {
  assert.equal((await admin({ request: adminReq('', null), env })).status, 401);
  assert.equal((await admin({ request: new Request('https://x/', { headers: { Authorization: 'Basic abc' } }), env })).status, 401);
  assert.equal((await admin({ request: adminReq(''), env: { ...env, ADMIN_TOKEN: 'corto' } })).status, 503);
  assert.equal((await admin({ request: adminReq(''), env: { ...env, ADMIN_TOKEN: undefined } })).status, 503);
});

test('webhook: firma ausente/ajena/vieja, cuerpo enorme y JSON roto', async () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs', client_reference_id: 'x' } } });
  const send = (b, sig) => webhook({ request: new Request('https://x/api/stripe-webhook', { method: 'POST', body: b, headers: sig ? { 'Stripe-Signature': sig } : {} }), env });
  assert.equal((await send(body)).status, 400);
  assert.equal((await send(body, await signWebhook(body, 'otro-secreto'))).status, 400);
  assert.equal((await send(body, `t=1,v1=${'0'.repeat(64)}`)).status, 400);
  const big = 'x'.repeat(300000);
  assert.equal((await send(big, await signWebhook(big, WEBHOOK_SECRET))).status, 413);
  const broken = '{no-json';
  assert.equal((await send(broken, await signWebhook(broken, WEBHOOK_SECRET))).status, 400);
  assert.equal(await count('webhook_events'), 0);
});

test('la respuesta de error del checkout no filtra detalles internos', async () => {
  const response = await checkout({ request: request(goodEntries()), env: { ...env, STRIPE_API_BASE: 'http://127.0.0.1:9' } });
  const text = await response.text();
  assert.ok(response.status >= 500);
  assert.ok(!/sk_|127\.0\.0\.1|stack|at \w+\.|Error:/.test(text), text);
});
