// Utilidades HTTP compartidas por las Functions.

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

export function methodNotAllowed(allow) {
  return json(405, { error: `Method not allowed. Use ${allow}.` }, { Allow: allow });
}

export function nowIso() {
  return new Date().toISOString();
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Comparación en tiempo constante para tokens y firmas.
export function timingSafeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// IP del visitante. Detrás del Worker de /tickets, Cloudflare ve la IP del Worker; por eso el Worker
// reenvía la IP real firmada con PROXY_SECRET, y solo entonces se confía en ella.
export function clientIp(request, env) {
  const forwarded = request.headers.get('X-Proxy-Client-IP');
  const secret = request.headers.get('X-Proxy-Secret');
  if (forwarded && secret && env.PROXY_SECRET && timingSafeEqual(secret, env.PROXY_SECRET)) return forwarded;
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}
