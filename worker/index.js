// Worker de XHOCK: sirve el sitio estático (binding ASSETS) y atiende /api/*.
// Reutiliza los manejadores de functions/api (mismo contrato onRequestGet/onRequestPost/onRequest).
import * as checkout from '../functions/api/checkout.js';
import * as webhook from '../functions/api/stripe-webhook.js';
import * as registrations from '../functions/api/admin/registrations.js';
import * as team from '../functions/api/admin/team.js';
import { getConfig } from '../functions/_lib/config.js';

const ROUTES = {
  '/api/checkout': checkout,
  '/api/stripe-webhook': webhook,
  '/api/admin/registrations': registrations,
  '/api/admin/team': team
};

export async function handleApi(request, env, ctx) {
  const { pathname } = new URL(request.url);
  const module = ROUTES[pathname.replace(/\/+$/, '')];
  if (!module) return null;
  const handler = module[`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`] || module.onRequest;
  return handler({ request, env, waitUntil: ctx?.waitUntil?.bind(ctx), params: {} });
}

// Páginas cuyo contenido depende de si la venta está abierta, próxima o cerrada.
const STATE_PAGES = new Set(['/', '/index.html', '/tickets', '/tickets.html']);
const VARIANT_PREFIX = '/_v/';

// En modo "auto" el build genera una copia de esas páginas por estado (_v/open, _v/soon, _v/closed) y aquí se elige
// la que corresponde a la hora real. Sin variantes (build normal) se sirve el archivo de siempre.
export async function serveStatePage(request, env) {
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const url = new URL(request.url);
  if (!STATE_PAGES.has(url.pathname)) return null;
  const config = getConfig(env);
  if (!config.auto) return null;

  const variant = new URL(url);
  variant.pathname = `${VARIANT_PREFIX}${config.status}${url.pathname === '/' ? '/' : url.pathname}`;
  const response = await env.ASSETS.fetch(new Request(variant, request));
  if (response.status === 404) return null;

  const headers = new Headers(response.headers);
  const location = headers.get('Location');
  if (location) { // el canónico de Assets (/_v/open/tickets.html → /_v/open/tickets) se devuelve sin el prefijo
    const target = new URL(location, url);
    target.pathname = target.pathname.replace(new RegExp(`^${VARIANT_PREFIX}(open|soon|closed)`), '') || '/';
    headers.set('Location', target.pathname + target.search);
  } else {
    headers.set('Cache-Control', 'public, max-age=30, must-revalidate'); // el estado cambia solo: máx. 30 s de retraso
  }
  return new Response(response.body, { status: response.status, headers });
}

const notFound = () => new Response('Not found', { status: 404 });

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith(VARIANT_PREFIX)) return notFound(); // las variantes solo se sirven internamente

    const response = await handleApi(request, env, ctx);
    if (response) return response;
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Not found.' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    const page = await serveStatePage(request, env);
    if (page) return page;
    return env.ASSETS.fetch(request);
  }
};
