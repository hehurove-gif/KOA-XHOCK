// Cálculo de precios. UNA sola fuente de verdad: la usa el servidor (checkout) y se copia a assets/js/pricing.js
// para que el formulario muestre exactamente el mismo total. Todo en unidad menor (centavos).
//
// Tarifas (todas opcionales salvo la base):
//   adult            precio normal
//   child            precio para jugadores con edad <= childMaxAge (si no se define, igual al adulto)
//   earlyUntil       fecha YYYY-MM-DD (inclusive, hora de Cancún) hasta la que rige la preventa
//   earlyAdult/Child precios de preventa (si no se definen, rige el precio normal de esa categoría)

const CANCUN_OFFSET = '-05:00'; // Quintana Roo no usa horario de verano

export function buildPricing(event) {
  const cents = value => (value === '' || value === null || value === undefined || Number.isNaN(Number(value)) ? null : Math.round(Number(value) * 100));
  const adult = cents(event.price);
  const child = cents(event.childPrice);
  return {
    currency: String(event.currency || 'USD').toLowerCase(),
    adult,
    child: child ?? adult,
    childMaxAge: Number(event.childMaxAge) > 0 ? Number(event.childMaxAge) : 0,
    earlyUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(event.earlyBirdUntil || '')) ? event.earlyBirdUntil : '',
    earlyAdult: cents(event.earlyBirdPrice),
    earlyChild: cents(event.earlyBirdChildPrice)
  };
}

export function isEarlyBird(pricing, now = Date.now()) {
  if (!pricing.earlyUntil) return false;
  return now <= Date.parse(`${pricing.earlyUntil}T23:59:59.999${CANCUN_OFFSET}`);
}

// Devuelve { tier, amount } para un jugador de esa edad.
export function priceFor(age, pricing, now = Date.now()) {
  const isChild = pricing.childMaxAge > 0 && Number(age) <= pricing.childMaxAge;
  const early = isEarlyBird(pricing, now);
  const base = isChild ? pricing.child : pricing.adult;
  const earlyPrice = isChild ? (pricing.earlyChild ?? pricing.child) : (pricing.earlyAdult ?? pricing.adult);
  const amount = early && earlyPrice !== null ? earlyPrice : base;
  const usesEarly = early && earlyPrice !== null && earlyPrice !== base;
  return { tier: `${usesEarly ? 'early_' : ''}${isChild ? 'child' : 'adult'}`, amount };
}

export const TIER_LABELS = {
  adult: 'Player Ticket',
  child: 'Player Ticket — Junior',
  early_adult: 'Player Ticket — Early bird',
  early_child: 'Player Ticket — Junior, early bird'
};

// Precio de cada jugador, total y líneas agrupadas (para Stripe y para el resumen).
export function priceOrder(players, pricing, now = Date.now()) {
  const priced = players.map(player => ({ ...player, ...priceFor(player.age, pricing, now) }));
  const lines = new Map();
  for (const p of priced) {
    const line = lines.get(p.tier) || { tier: p.tier, unitAmount: p.amount, quantity: 0 };
    line.quantity += 1;
    lines.set(p.tier, line);
  }
  return {
    players: priced,
    lines: [...lines.values()],
    total: priced.reduce((sum, p) => sum + p.amount, 0)
  };
}
