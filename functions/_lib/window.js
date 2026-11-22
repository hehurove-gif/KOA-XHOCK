// Ventana de venta. Estado de la venta según el modo del evento:
//   open | soon | closed   → fijo (lo que diga el CMS)
//   auto                   → según la hora real: antes de salesOpensAt = soon, entre ambas = open, desde salesClosesAt = closed
// Las fechas son hora de Cancún (UTC-5, sin horario de verano): "YYYY-MM-DDTHH:mm" (o solo "YYYY-MM-DD").
// Una fecha de cierre sin hora cierra al terminar ese día; una de apertura sin hora abre a las 00:00.
const OFFSET = '-05:00';
const MANUAL = ['open', 'soon', 'closed'];

export function parseLocal(value, { endOfDay = false } = {}) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const time = m[2] ? `${m[2]}:${m[3]}:00.000` : endOfDay ? '23:59:59.999' : '00:00:00.000';
  const ms = Date.parse(`${m[1]}T${time}${OFFSET}`);
  return Number.isNaN(ms) ? null : ms;
}

export function salesState(event, now = Date.now()) {
  const mode = event.status;
  if (mode !== 'auto') return MANUAL.includes(mode) ? mode : 'closed';
  const opens = parseLocal(event.salesOpensAt);
  const closes = parseLocal(event.salesClosesAt, { endOfDay: true });
  if (opens === null && closes === null) return 'closed'; // auto sin fechas: por seguridad, cerrado
  if (opens !== null && now < opens) return 'soon';
  if (closes !== null && now > closes) return 'closed';
  return 'open';
}

// Texto legible para avisos ("December 1, 6:00 PM Cancún time").
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function formatLocal(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(value ?? '').trim());
  if (!m) return '';
  const day = `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  if (!m[4]) return day;
  const hour = Number(m[4]);
  return `${day}, ${hour % 12 || 12}:${m[5]} ${hour < 12 ? 'AM' : 'PM'} Cancún time`;
}
