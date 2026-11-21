import assert from 'node:assert/strict';
import worker, { mapRequest, rewriteLocation } from './src/index.js';

const H = 'koa-xhock.pages.dev';
assert.deepEqual(mapRequest(new URL('https://koa-hub.com/tickets'), H), { redirect: 'https://koa-hub.com/tickets/' });
assert.deepEqual(mapRequest(new URL('https://koa-hub.com/tickets?x=1'), H), { redirect: 'https://koa-hub.com/tickets/?x=1' });
assert.equal(mapRequest(new URL('https://koa-hub.com/tickets/'), H).upstream, `https://${H}/`);
assert.equal(mapRequest(new URL('https://koa-hub.com/tickets/tickets.html?a=b'), H).upstream, `https://${H}/tickets.html?a=b`);
assert.equal(mapRequest(new URL('https://koa-hub.com/tickets/api/checkout'), H).upstream, `https://${H}/api/checkout`);
assert.equal(mapRequest(new URL('https://koa-hub.com/ticketsX'), H).passthrough, true);
assert.equal(mapRequest(new URL('https://koa-hub.com/'), H).passthrough, true);
assert.equal(rewriteLocation('/tickets', H, 'https://koa-hub.com'), 'https://koa-hub.com/tickets/tickets');
assert.equal(rewriteLocation(`https://${H}/terms?x=1`, H, 'https://koa-hub.com'), 'https://koa-hub.com/tickets/terms?x=1');
assert.equal(rewriteLocation('https://checkout.stripe.com/c/pay/abc', H, 'https://koa-hub.com'), 'https://checkout.stripe.com/c/pay/abc');

// Flujo completo con fetch simulado
const seen = [];
globalThis.fetch = async (req, init) => {
  seen.push([String(req.url ?? req), init?.redirect]);
  if (String(req.url).endsWith('/tickets.html')) return new Response(null, { status: 308, headers: { Location: '/tickets' } });
  return new Response('ok', { status: 200 });
};
const env = { UPSTREAM_HOST: H };
let r = await worker.fetch(new Request('https://koa-hub.com/tickets/'), env);
assert.equal(r.status, 200); assert.equal(seen[0][0], `https://${H}/`); assert.equal(seen[0][1], 'manual');
r = await worker.fetch(new Request('https://koa-hub.com/tickets/tickets.html'), env);
assert.equal(r.status, 308); assert.equal(r.headers.get('Location'), 'https://koa-hub.com/tickets/tickets');
r = await worker.fetch(new Request('https://koa-hub.com/tickets'), env);
assert.equal(r.status, 301); assert.equal(r.headers.get('Location'), 'https://koa-hub.com/tickets/');
console.log('worker tests: all passed');
