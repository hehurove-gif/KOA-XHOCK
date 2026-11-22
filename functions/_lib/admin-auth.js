// Autenticación compartida de los endpoints de administración (Bearer ADMIN_TOKEN) con freno a la fuerza bruta:
// tras 10 intentos fallidos por IP en 10 minutos responde 429 aunque el token sea el correcto.
import { json, timingSafeEqual, clientIp } from './http.js';
import { isRateLimited } from './db.js';

const FAIL_LIMIT = 10;
const WINDOW_SECONDS = 600;

// Devuelve null si el acceso es válido, o la Response de error que hay que devolver.
export async function adminGate(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token || token.length < 24) return json(503, { error: 'Admin access is not configured.' }); // sin token fuerte, deshabilitado
  if (!env.DB) return json(503, { error: 'Database is not configured.' });

  const key = `admin-fail:${clientIp(request, env)}`;
  const header = request.headers.get('Authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const valid = supplied !== '' && timingSafeEqual(supplied, token);
  if (valid) {
    // Un acceso válido solo se bloquea si esa IP ya agotó sus intentos fallidos.
    const blocked = await isBlocked(env.DB, key);
    return blocked ? json(429, { error: 'Too many failed attempts. Try again later.' }, { 'Retry-After': String(WINDOW_SECONDS) }) : null;
  }
  const limited = await isRateLimited(env.DB, key, FAIL_LIMIT, WINDOW_SECONDS);
  if (limited) return json(429, { error: 'Too many failed attempts. Try again later.' }, { 'Retry-After': String(WINDOW_SECONDS) });
  return json(401, { error: 'Unauthorized.' }, { 'WWW-Authenticate': 'Bearer' });
}

async function isBlocked(db, key) {
  const windowStart = Math.floor(Date.now() / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS;
  const row = await db.prepare('SELECT count FROM rate_limits WHERE key = ?1 AND window_start = ?2').bind(key, windowStart).first();
  return Number(row?.count ?? 0) > FAIL_LIMIT;
}
