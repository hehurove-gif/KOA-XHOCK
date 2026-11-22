// Sirve el proyecto de Cloudflare Pages en https://koa-hub.com/tickets/*
// sin tocar lo que ya viva en el resto de koa-hub.com.
//
//   koa-hub.com/tickets/            -> <UPSTREAM_HOST>/
//   koa-hub.com/tickets/tickets.html-> <UPSTREAM_HOST>/tickets.html
//   koa-hub.com/tickets/api/checkout-> <UPSTREAM_HOST>/api/checkout   (Pages Function)
//
// El sitio usa rutas relativas, por eso funciona igual bajo /tickets/ que en la raíz.

const PREFIX = '/tickets';

export function mapRequest(url, upstreamHost) {
  if (url.pathname === PREFIX) {
    return { redirect: `${url.origin}${PREFIX}/${url.search}` };
  }
  if (!url.pathname.startsWith(PREFIX + '/')) return { passthrough: true };
  const path = url.pathname.slice(PREFIX.length) || '/';
  return { upstream: `https://${upstreamHost}${path}${url.search}` };
}

// Las redirecciones de Pages (p. ej. /tickets.html -> /tickets) vienen sin el prefijo público.
export function rewriteLocation(location, upstreamHost, publicOrigin) {
  if (!location) return location;
  try {
    const target = new URL(location, `https://${upstreamHost}`);
    if (target.host !== upstreamHost) return location;
    return `${publicOrigin}${PREFIX}${target.pathname}${target.search}${target.hash}`;
  } catch {
    return location;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const mapped = mapRequest(url, env.UPSTREAM_HOST);

    if (mapped.redirect) return Response.redirect(mapped.redirect, 301);
    if (mapped.passthrough) return fetch(request); // ruta fuera de /tickets: no se toca

    const upstreamRequest = new Request(mapped.upstream, request);
    upstreamRequest.headers.set('X-Forwarded-Host', url.host);
    // Cloudflare ve la IP del Worker, no la del visitante: se reenvía firmada con PROXY_SECRET
    // (las Functions solo confían en ella si el secreto coincide). Lo que mande el cliente se descarta.
    upstreamRequest.headers.delete('X-Proxy-Client-IP');
    upstreamRequest.headers.delete('X-Proxy-Secret');
    if (env.PROXY_SECRET) {
      upstreamRequest.headers.set('X-Proxy-Client-IP', request.headers.get('CF-Connecting-IP') || '');
      upstreamRequest.headers.set('X-Proxy-Secret', env.PROXY_SECRET);
    }
    const response = await fetch(upstreamRequest, { redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const headers = new Headers(response.headers);
      headers.set('Location', rewriteLocation(headers.get('Location'), env.UPSTREAM_HOST, url.origin));
      return new Response(null, { status: response.status, headers });
    }
    return response;
  }
};
