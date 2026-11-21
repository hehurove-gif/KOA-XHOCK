// Datos derivados del evento. El cliente edita src/_data/cms/event.json
// (desde Pages CMS); aquí solo se calculan textos y estados a partir de eso.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('./cms/event.json', import.meta.url), 'utf8'));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parts(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  return { year, month: month - 1, day };
}

const start = parts(raw.startDate);
const end = parts(raw.endDate || raw.startDate);
const long = p => `${MONTHS[p.month]} ${p.day}`;
const short = p => `${MONTHS[p.month].slice(0, 3)} ${p.day}`;
const sameMonth = start.month === end.month && start.year === end.year;
const sameDay = sameMonth && start.day === end.day;

const dateLabel = sameDay ? long(start) : sameMonth ? `${long(start)} – ${end.day}` : `${long(start)} – ${long(end)}`;
const dateShort = sameDay ? short(start) : sameMonth ? `${short(start)} – ${end.day}` : `${short(start)} – ${short(end)}`;
const dateFromTo = sameDay ? long(start) : sameMonth ? `${long(start)} to ${end.day}` : `${long(start)} to ${long(end)}`;
const dateThrough = sameDay ? long(start) : sameMonth ? `${long(start)} through ${end.day}` : `${long(start)} through ${long(end)}`;
const days = Math.round((Date.UTC(end.year, end.month, end.day) - Date.UTC(start.year, start.month, start.day)) / 86400000) + 1;

// XHOCK_STATUS=open npm run build permite previsualizar/probar otro estado sin tocar el JSON.
const requested = process.env.XHOCK_STATUS || raw.status;
const status = ['open', 'soon', 'closed'].includes(requested) ? requested : 'closed';

export default {
  ...raw,
  status,
  isOpen: status === 'open',
  isClosed: status === 'closed',
  isSoon: status === 'soon',
  year: start.year,
  days,
  dateLabel,
  dateShort,
  dateFromTo,
  dateThrough,
  priceLabel: `$${raw.price}`,
  noticeTitle: status === 'soon' ? raw.soonTitle : raw.closedTitle,
  noticeText: status === 'soon' ? raw.soonText : raw.closedText
};
