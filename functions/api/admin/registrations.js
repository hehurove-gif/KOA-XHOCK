// GET /api/admin/registrations[?status=paid][&format=csv] — listado para el equipo de KOA.
// Protegido con un token (ADMIN_TOKEN). Recomendado además: Cloudflare Access delante de /api/admin/* y /admin/*.
import { json, methodNotAllowed, timingSafeEqual } from '../../_lib/http.js';

const STATUSES = ['pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'refunded', 'review'];
const MAX_ROWS = 5000;

function authorized(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token || token.length < 24) return null; // sin token fuerte, el panel queda deshabilitado
  const header = request.headers.get('Authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  return supplied !== '' && timingSafeEqual(supplied, token);
}

// Evita que una celda comience con = + - @ (inyección de fórmulas al abrir el CSV en Excel/Sheets).
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_COLUMNS = [
  ['order_id', r => r.order_id], ['status', r => r.status], ['created_at', r => r.created_at], ['paid_at', r => r.paid_at],
  ['buyer_first_name', r => r.first_name], ['buyer_last_name', r => r.last_name], ['buyer_email', r => r.email],
  ['buyer_phone', r => r.phone], ['buyer_country', r => r.country], ['tickets_in_order', r => r.quantity],
  ['order_amount', r => (r.amount_total / 100).toFixed(2)], ['currency', r => String(r.currency).toUpperCase()],
  ['player_no', r => r.position_no], ['player_name', r => r.player_name], ['player_age', r => r.age],
  ['player_position', r => r.position], ['jersey_size', r => r.jersey_size], ['team', r => r.team],
  ['utm_source', r => r.utm_source], ['utm_medium', r => r.utm_medium], ['utm_campaign', r => r.utm_campaign]
];

export async function onRequestGet({ request, env }) {
  const auth = authorized(request, env);
  if (auth === null) return json(503, { error: 'Admin access is not configured.' });
  if (!auth) return json(401, { error: 'Unauthorized.' }, { 'WWW-Authenticate': 'Bearer' });
  if (!env.DB) return json(503, { error: 'Database is not configured.' });

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  if (status && !STATUSES.includes(status)) return json(400, { error: 'Unknown status.' });

  const where = status ? 'WHERE o.status = ?1' : '';
  const statement = env.DB.prepare(
    `SELECT o.id AS order_id, o.status, o.created_at, o.paid_at, o.first_name, o.last_name, o.email, o.phone, o.country,
            o.quantity, o.amount_total, o.currency, o.attribution,
            p.position_no, p.name AS player_name, p.age, p.position, p.jersey_size, p.team
     FROM orders o JOIN players p ON p.order_id = o.id
     ${where}
     ORDER BY o.created_at DESC, p.position_no
     LIMIT ${MAX_ROWS}`
  );
  const { results } = await (status ? statement.bind(status) : statement).all();

  const rows = results.map(row => {
    let attribution = {};
    try { attribution = row.attribution ? JSON.parse(row.attribution) : {}; } catch { /* dato corrupto: se ignora */ }
    const { attribution: _drop, ...rest } = row;
    return { ...rest, utm_source: attribution.utm_source ?? '', utm_medium: attribution.utm_medium ?? '', utm_campaign: attribution.utm_campaign ?? '' };
  });

  if (url.searchParams.get('format') === 'csv') {
    const lines = [CSV_COLUMNS.map(([name]) => name).join(',')];
    for (const row of rows) lines.push(CSV_COLUMNS.map(([, pick]) => csvCell(pick(row))).join(','));
    return new Response('﻿' + lines.join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="xhock-registrations${status ? '-' + status : ''}.csv"`,
        'Cache-Control': 'no-store'
      }
    });
  }
  return json(200, { count: rows.length, truncated: rows.length >= MAX_ROWS, rows });
}

export async function onRequest() {
  return methodNotAllowed('GET');
}
