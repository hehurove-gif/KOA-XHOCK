import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.js';
import { createD1 } from './d1-shim.js';

// ASSETS simulado: devuelve el nombre de la ruta pedida; /_v/*/tickets.html redirige al canónico, como Workers Assets.
const assets = (missingVariants = false) => ({
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (missingVariants && pathname.startsWith('/_v/')) return new Response('nf', { status: 404 });
    if (pathname.endsWith('/tickets.html')) return new Response(null, { status: 307, headers: { Location: pathname.replace('.html', '') } });
    return new Response(`asset:${pathname}`, { headers: { 'Cache-Control': 'public, max-age=0' } });
  }
});
const get = (env, path) => worker.fetch(new Request(`https://koa-hub.com${path}`), env, {});
const auto = extra => ({ XHOCK_STATUS: 'auto', ASSETS: assets(), DB: createD1(), ...extra });
const window = (opens, closes) => ({ EVENT_OVERRIDES: JSON.stringify({ salesOpensAt: opens, salesClosesAt: closes }) });

test('auto: antes de la apertura sirve la variante "soon"', async () => {
  const env = auto(window('2999-01-01T10:00', '2999-02-01'));
  assert.equal(await (await get(env, '/tickets')).text(), 'asset:/_v/soon/tickets');
  assert.equal(await (await get(env, '/')).text(), 'asset:/_v/soon/');
});

test('auto: dentro de la ventana sirve "open" y tras el cierre "closed"', async () => {
  assert.equal(await (await get(auto(window('2000-01-01T10:00', '2999-02-01')), '/tickets')).text(), 'asset:/_v/open/tickets');
  assert.equal(await (await get(auto(window('2000-01-01', '2000-02-01')), '/tickets')).text(), 'asset:/_v/closed/tickets');
});

test('auto: caché corta para que el cambio de estado se note en segundos', async () => {
  const response = await get(auto(window('2000-01-01', '2999-01-01')), '/');
  assert.match(response.headers.get('Cache-Control'), /max-age=30/);
});

test('auto: el redirect canónico no deja ver el prefijo interno', async () => {
  const response = await get(auto(window('2000-01-01', '2999-01-01')), '/tickets.html');
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('Location'), '/tickets');
});

test('las variantes internas no son accesibles desde fuera', async () => {
  const response = await get(auto(window('2000-01-01', '2999-01-01')), '/_v/open/tickets');
  assert.equal(response.status, 404);
});

test('otras páginas y recursos se sirven tal cual', async () => {
  const env = auto(window('2000-01-01', '2999-01-01'));
  assert.equal(await (await get(env, '/privacy')).text(), 'asset:/privacy');
  assert.equal(await (await get(env, '/assets/css/styles.css')).text(), 'asset:/assets/css/styles.css');
});

test('modo fijo (sin auto): no usa variantes', async () => {
  const env = { XHOCK_STATUS: 'open', ASSETS: assets(), DB: createD1() };
  assert.equal(await (await get(env, '/tickets')).text(), 'asset:/tickets');
});

test('auto pero el build no generó variantes: cae al archivo normal', async () => {
  const env = auto({ ...window('2000-01-01', '2999-01-01'), ASSETS: assets(true) });
  assert.equal(await (await get(env, '/tickets')).text(), 'asset:/tickets');
});

test('el checkout respeta la ventana en el servidor, aunque la página esté en caché', async () => {
  const post = env => worker.fetch(new Request('https://koa-hub.com/api/checkout', { method: 'POST', body: new FormData() }), env, {});
  assert.equal((await post(auto(window('2000-01-01', '2000-02-01')))).status, 403);
  assert.equal((await post(auto(window('2999-01-01', '2999-02-01')))).status, 403);
  const open = await post(auto({ ...window('2000-01-01', '2999-02-01'), STRIPE_SECRET_KEY: 'sk' }));
  assert.notEqual(open.status, 403, 'con la ventana abierta pasa a validar el formulario');
});
