// Acceso a D1: límites de uso, pedidos y jugadores.
import { nowIso } from './http.js';

const RATE_SQL = `
  INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
  ON CONFLICT(key) DO UPDATE SET
    count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,
    window_start = excluded.window_start
  RETURNING count`;

// Devuelve true si la petición excede `limit` en la ventana (segundos).
export async function isRateLimited(db, key, limit, windowSeconds) {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = await db.prepare(RATE_SQL).bind(key, windowStart).first();
  return Number(row?.count ?? 0) > limit;
}

export async function purgeOldRateLimits(db) {
  const cutoff = Math.floor(Date.now() / 1000) - 24 * 3600;
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?1').bind(cutoff).run();
}

// Un pedido pendiente idéntico y reciente (doble clic, reintento tras timeout) reutiliza su enlace de pago.
export async function findRecentPendingOrder(db, payloadHash, minutes = 25) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  return db.prepare(
    `SELECT id, checkout_url FROM orders
     WHERE payload_hash = ?1 AND status = 'pending' AND checkout_url IS NOT NULL AND created_at > ?2
     ORDER BY created_at DESC LIMIT 1`
  ).bind(payloadHash, since).first();
}

// Inserta pedido + jugadores en una sola transacción (batch de D1).
export async function insertOrder(db, order, players) {
  const statements = [
    db.prepare(
      `INSERT INTO orders (id, created_at, updated_at, status, first_name, last_name, email, phone, country, quantity,
                           unit_amount, amount_total, currency, payload_hash, terms_accepted_at, terms_version, attribution, ip_hash)
       VALUES (?1, ?2, ?2, 'pending', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?2, ?13, ?14, ?15)`
    ).bind(
      order.id, nowIso(), order.firstName, order.lastName, order.email, order.phone, order.country, order.quantity,
      order.unitAmount, order.amountTotal, order.currency, order.payloadHash, order.termsVersion,
      Object.keys(order.attribution).length ? JSON.stringify(order.attribution) : null, order.ipHash
    ),
    ...players.map((p, i) =>
      db.prepare('INSERT INTO players (order_id, position_no, name, age, position, jersey_size) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(order.id, i + 1, p.name, p.age, p.position, p.jerseySize)
    )
  ];
  await db.batch(statements);
}

export async function attachSession(db, orderId, session) {
  await db.prepare('UPDATE orders SET stripe_session_id = ?2, checkout_url = ?3, updated_at = ?4 WHERE id = ?1')
    .bind(orderId, session.id, session.url, nowIso()).run();
}

export async function markFailed(db, orderId, note) {
  await db.prepare(`UPDATE orders SET status = 'failed', notes = ?2, updated_at = ?3 WHERE id = ?1 AND status = 'pending'`)
    .bind(orderId, String(note).slice(0, 300), nowIso()).run();
}

export async function getOrderWithPlayers(db, orderId) {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) return null;
  const { results } = await db.prepare('SELECT position_no, name, age, position, jersey_size, team FROM players WHERE order_id = ?1 ORDER BY position_no').bind(orderId).all();
  return { ...order, players: results };
}
