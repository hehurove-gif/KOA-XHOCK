// Configuración del evento. Sale del mismo JSON que edita el cliente en Pages CMS, así que
// precio, moneda y estado de la venta tienen UNA sola fuente de verdad: el servidor nunca
// acepta un importe enviado por el navegador.
import event from '../../src/_data/cms/event.json' with { type: 'json' };
import site from '../../src/_data/cms/site.json' with { type: 'json' };

export const LIMITS = { qtyMin: 1, qtyMax: 10, ageMin: 5, ageMax: 99, maxBodyBytes: 64 * 1024 };
export const POSITIONS = ['Goalie', 'Left Wing', 'Right Wing', 'Left Defense', 'Right Defense', 'Center'];
export const JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function getConfig(env = {}) {
  const status = env.XHOCK_STATUS || event.status;
  const baseUrl = String(env.PUBLIC_BASE_URL || site.url).replace(/\/?$/, '/');
  return {
    status,
    open: status === 'open',
    eventName: event.name,
    tournamentName: event.tournamentName,
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate,
    unitAmount: Math.round(Number(event.price) * 100),
    currency: String(event.currency || 'USD').toLowerCase(),
    baseUrl,
    termsVersion: env.TERMS_VERSION || 'draft',
    brand: site.brand,
    whatsappNumber: site.whatsappNumber
  };
}
