// GET /api/admin/registrations[?status=paid][&q=texto][&country=MX][&team=Azul|unassigned][&from=YYYY-MM-DD][&to=YYYY-MM-DD][&format=csv]
// Listado + resumen (totales, ingresos, tallas, posiciones, países) para el equipo de KOA.
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


// Resumen para el panel. Cuenta pedidos una sola vez (las filas vienen por jugador).
export function summarize(rows) {
  const orders = new Map();
  const players = { total: 0, paid: 0, unassigned: 0 };
  const byJersey = {}, byPosition = {}, byCountry = {}, byTeam = {}, byDay = {};
  const bump = (map, key) => { map[key || '—'] = (map[key || '—'] || 0) + 1; };
  for (const row of rows) {
    if (!orders.has(row.order_id)) orders.set(row.order_id, row);
    players.total += 1;
    if (row.status === 'paid') {
      players.paid += 1;
      bump(byJersey, row.jersey_size); bump(byPosition, row.position); bump(byTeam, row.team || 'unassigned');
      if (!row.team) players.unassigned += 1;
    }
  }
  const byStatus = {};
  const revenue = {};
  let paidOrders = 0;
  for (const order of orders.values()) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    if (order.status === 'paid') {
      paidOrders += 1;
      const cur = String(order.currency).toUpperCase();
      revenue[cur] = (revenue[cur] || 0) + order.amount_total;
      bump(byCountry, order.country);
      bump(byDay, String(order.paid_at || order.created_at).slice(0, 10));
    }
  }
  const money = Object.fromEntries(Object.entries(revenue).map(([cur, cents]) => [cur, cents / 100]));
  return { orders: orders.size, paid_orders: paidOrders, players, by_status: byStatus, revenue: money, by_jersey: byJersey, by_position: byPosition, by_country: byCountry, by_team: byTeam, paid_by_day: byDay };
}

const CSV_COLUMNS = [
  ['order_id', r => r.order_id], ['status', r => r.status], ['created_at', r => r.created_at], ['paid_at', r => r.paid_at],
  ['buyer_first_name', r => r.first_name], ['buyer_last_name', r => r.last_name], ['buyer_email', r => r.email],
  ['buyer_phone', r => r.phone], ['buyer_country', r => r.country], ['tickets_in_order', r => r.quantity],
  ['order_amount', r => (r.amount_total / 100).toFixed(2)], ['currency', r => String(r.currency).toUpperCase()],
  ['player_id', r => r.player_id], ['player_no', r => r.position_no], ['player_name', r => r.player_name], ['player_age', r => r.age],
  ['player_position', r => r.position], ['jersey_size', r => r.jersey_size], ['player_price', r => (r.unit_amount == null ? '' : (r.unit_amount / 100).toFixed(2))], ['price_tier', r => r.price_tier], ['team', r => r.team],
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

  const filters = [];
  const params = [];
  const add = (sql, value) => { params.push(value); filters.push(sql.replace('?', `?${params.length}`)); };
  if (status) add('o.status = ?', status);

  const country = (url.searchParams.get('country') || '').trim().toUpperCase();
  if (country) {
    if (!/^[A-Z]{2}$/.test(country)) return json(400, { error: 'Invalid country.' });
    add('o.country = ?', country);
  }
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';
  for (const [label, value] of [['from', from], ['to', to]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return json(400, { error: `Invalid ${label} date.` });
  }
  if (from) add('o.created_at >= ?', `${from}T00:00:00.000Z`);
  if (to) add('o.created_at < ?', `${to}T23:59:59.999Z`);

  const team = (url.searchParams.get('team') || '').trim();
  if (team === 'unassigned') filters.push("(p.team IS NULL OR p.team = '')");
  else if (team) add('p.team = ?', team.slice(0, 40));

  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, m => '\\' + m)}%`;
    const n = params.push(like);
    filters.push(`(o.email LIKE ?${n} ESCAPE '\\' OR o.first_name LIKE ?${n} ESCAPE '\\' OR o.last_name LIKE ?${n} ESCAPE '\\' OR p.name LIKE ?${n} ESCAPE '\\')`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const statement = env.DB.prepare(
    `SELECT o.id AS order_id, o.status, o.created_at, o.paid_at, o.first_name, o.last_name, o.email, o.phone, o.country,
            o.quantity, o.amount_total, o.currency, o.attribution,
            p.id AS player_id, p.position_no, p.name AS player_name, p.age, p.position, p.jersey_size, p.team, p.unit_amount, p.price_tier
     FROM orders o JOIN players p ON p.order_id = o.id
     ${where}
     ORDER BY o.created_at DESC, p.position_no
     LIMIT ${MAX_ROWS}`
  );
  const { results } = await (params.length ? statement.bind(...params) : statement).all();

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
  return json(200, { count: rows.length, truncated: rows.length >= MAX_ROWS, summary: summarize(rows), rows });
}

export async function onRequest() {
  return methodNotAllowed('GET');
}
