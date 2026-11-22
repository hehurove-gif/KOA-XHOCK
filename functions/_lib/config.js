// Configuración del evento. Sale del mismo JSON que edita el cliente en Pages CMS, así que
// precio, moneda y estado de la venta tienen UNA sola fuente de verdad: el servidor nunca
// acepta un importe enviado por el navegador.
import event from '../../src/_data/cms/event.json' with { type: 'json' };
import { buildPricing } from './pricing.js';
import { salesState } from './window.js';
import site from '../../src/_data/cms/site.json' with { type: 'json' };

export const LIMITS = { qtyMin: 1, qtyMax: 10, ageMin: 5, ageMax: 99, maxBodyBytes: 64 * 1024 };
export const POSITIONS = ['Goalie', 'Left Wing', 'Right Wing', 'Left Defense', 'Right Defense', 'Center'];
export const JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Permite ajustar tarifas sin tocar el repo (p. ej. EVENT_OVERRIDES='{"earlyBirdUntil":"2027-01-31"}' como secret) y
// probar categorías de precio en los tests. Solo se aceptan estas claves.
const OVERRIDABLE = ['salesOpensAt', 'salesClosesAt', 'price', 'currency', 'childPrice', 'childMaxAge', 'earlyBirdUntil', 'earlyBirdPrice', 'earlyBirdChildPrice'];
function eventWithOverrides(env) {
  if (!env.EVENT_OVERRIDES) return event;
  try {
    const extra = JSON.parse(env.EVENT_OVERRIDES);
    return { ...event, ...Object.fromEntries(Object.entries(extra).filter(([key]) => OVERRIDABLE.includes(key))) };
  } catch {
    console.error('config: EVENT_OVERRIDES is not valid JSON, ignored');
    return event;
  }
}

export function getConfig(env = {}, now = Date.now()) {
  const ev = eventWithOverrides(env);
  const mode = env.XHOCK_STATUS || ev.status;
  // Con status "auto" el estado sale de la hora real; el servidor es quien manda (el navegador solo lo refleja).
  const status = salesState({ ...ev, status: mode }, now);
  const baseUrl = String(env.PUBLIC_BASE_URL || site.url).replace(/\/?$/, '/');
  return {
    mode,
    auto: mode === 'auto',
    status,
    open: status === 'open',
    eventName: event.name,
    tournamentName: event.tournamentName,
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate,
    pricing: buildPricing(ev),
    unitAmount: Math.round(Number(ev.price) * 100),
    currency: String(ev.currency || 'USD').toLowerCase(),
    baseUrl,
    termsVersion: env.TERMS_VERSION || 'draft',
    brand: site.brand,
    whatsappNumber: site.whatsappNumber
  };
}
