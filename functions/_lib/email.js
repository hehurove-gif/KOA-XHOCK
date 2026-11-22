// Correos transaccionales opcionales (Resend). Si no hay llaves configuradas, no se envía nada:
// Stripe ya manda su propio recibo y los registros están en D1.
import { escapeHtml } from './http.js';

export function emailEnabled(env) {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

async function send(env, { to, subject, html }) {
  const response = await fetch(`${env.RESEND_API_BASE || 'https://api.resend.com'}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

function money(amount, currency) {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function playersHtml(order) {
  const rows = order.players.map(p =>
    `<tr><td>${p.position_no}</td><td>${escapeHtml(p.name)}</td><td>${p.age}</td><td>${escapeHtml(p.position)}</td><td>${escapeHtml(p.jersey_size)}</td></tr>`
  ).join('');
  return `<table cellpadding="6" border="1" style="border-collapse:collapse"><tr><th>#</th><th>Name</th><th>Age</th><th>Position</th><th>Jersey</th></tr>${rows}</table>`;
}

// Nunca lanza: un fallo de correo no debe hacer fallar el webhook (Stripe reintentaría).
export async function sendPaidEmails(env, config, order) {
  if (!emailEnabled(env)) return;
  const summary = `<p>${escapeHtml(config.eventName)} · ${escapeHtml(config.venue)}<br>${order.quantity} × Player Ticket — ${escapeHtml(money(order.amount_total, order.currency))}</p>${playersHtml(order)}`;
  const jobs = [
    send(env, {
      to: order.email,
      subject: `${config.eventName}: payment confirmed`,
      html: `<p>Hi ${escapeHtml(order.first_name)}, your payment was received. We'll assign each player to a team and contact you before the tournament.</p>${summary}<p>Questions? WhatsApp +${escapeHtml(config.whatsappNumber)}.</p>`
    })
  ];
  const notify = String(env.NOTIFY_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  if (notify.length) {
    jobs.push(send(env, {
      to: notify,
      subject: `New paid registration — ${order.first_name} ${order.last_name} (${order.quantity})`,
      html: `<p>Order ${escapeHtml(order.id)}<br>${escapeHtml(order.email)} · ${escapeHtml(order.phone)} · ${escapeHtml(order.country)}</p>${summary}`
    }));
  }
  const results = await Promise.allSettled(jobs);
  results.filter(r => r.status === 'rejected').forEach(r => console.error('email failed:', r.reason?.message));
}
