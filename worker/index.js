// Worker de XHOCK: sirve el sitio estático (binding ASSETS) y atiende /api/*.
// Reutiliza los manejadores de functions/api (mismo contrato onRequestGet/onRequestPost/onRequest).
import * as checkout from '../functions/api/checkout.js';
import * as webhook from '../functions/api/stripe-webhook.js';
import * as registrations from '../functions/api/admin/registrations.js';

const ROUTES = {
  '/api/checkout': checkout,
  '/api/stripe-webhook': webhook,
  '/api/admin/registrations': registrations
};

export async function handleApi(request, env, ctx) {
  const { pathname } = new URL(request.url);
  const module = ROUTES[pathname.replace(/\/+$/, '')];
  if (!module) return null;
  const handler = module[`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`] || module.onRequest;
  return handler({ request, env, waitUntil: ctx?.waitUntil?.bind(ctx), params: {} });
}

export default {
  async fetch(request, env, ctx) {
    const response = await handleApi(request, env, ctx);
    if (response) return response;
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Not found.' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    return env.ASSETS.fetch(request);
  }
};
