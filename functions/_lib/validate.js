// Validación del lado servidor: mismas reglas que el formulario, pero aquí son la autoridad.
import { LIMITS, POSITIONS, JERSEY_SIZES } from './config.js';

// Nombres: letras Unicode (con sus marcas combinantes, p. ej. हिन्दी o ñ descompuesta), espacios, apóstrofo, guion y punto
// ("St. John"). Mismo patrón que el formulario (script.js) para que lo que el navegador acepta no lo rechace el servidor.
const NAME_RE = /^\p{L}[\p{L}\p{M}'’.\- ]*$/u;
const NAME_MIN = 2;
const NAME_MAX = 60;
// Correo: letras/números Unicode y . _ % + ' - en la parte local; sin <>"();,:\\ ni espacios.
const EMAIL_RE = /^[\p{L}\p{N}._%+'-]{1,64}@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,}$/u;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ATTRIBUTION_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'first_utm_source', 'first_utm_medium', 'first_utm_campaign',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid', 'twclid', 'li_fat_id', 'epik',
  'irclickid', 'sccid', 'dclid', 'yclid',
  'landing_page', 'attribution_referrer', 'first_seen', 'last_seen'
]);

const TOP_LEVEL_KEYS = new Set(['firstName', 'lastName', 'email', 'phone', 'country', 'country_code', 'quantity', 'terms', 'company', 'cf-turnstile-response']);

// El formulario envía el nombre del país del select ("Mexico"); también se acepta el código ISO de 2 letras.
// "Other" usa el país elegido en el selector de teléfono (country_code) o "ZZ" (desconocido).
const COUNTRY_NAMES = { CANADA: 'CA', 'UNITED STATES': 'US', USA: 'US', MEXICO: 'MX', 'MÉXICO': 'MX' };
export function normalizeCountry(raw, phoneCountry) {
  const up = cleanText(raw).toUpperCase();
  if (/^[A-Z]{2}$/.test(up)) return up;
  if (COUNTRY_NAMES[up]) return COUNTRY_NAMES[up];
  if (up === 'OTHER') {
    const code = cleanText(phoneCountry).toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : 'ZZ';
  }
  return '';
}

// Nombre normalizado (espacios repetidos → uno) o '' si no cumple. Máx. 3 marcas combinantes seguidas (evita texto "zalgo").
export function cleanName(value) {
  const name = cleanText(value).replace(/ {2,}/g, ' ');
  const length = [...name].length;
  return length >= NAME_MIN && length <= NAME_MAX && NAME_RE.test(name) && !/\p{M}{4,}/u.test(name) ? name : '';
}

// Correo: caracteres permitidos, parte local ≤ 64 sin punto al inicio/final ni consecutivos, dominio con TLD de letras.
export function isValidEmail(email) {
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf('@'));
  return !(local.startsWith('.') || local.endsWith('.') || local.includes('..'));
}

export function cleanText(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).normalize('NFC').replace(CONTROL_RE, '').trim();
}

// Convierte las claves de FormData `players[0][name]` en { players: [{ name }] }.
export function parseForm(entries) {
  const out = { players: new Map(), attribution: {} };
  for (const [key, raw] of entries) {
    if (typeof raw !== 'string') continue; // se ignoran archivos
    const player = /^players\[(\d{1,2})\]\[(name|age|position|jerseySize)\]$/.exec(key);
    if (player) {
      const index = Number(player[1]);
      if (!out.players.has(index)) out.players.set(index, {});
      out.players.get(index)[player[2]] = raw;
    } else if (ATTRIBUTION_KEYS.has(key)) {
      out.attribution[key] = cleanText(raw).replace(/[<>]/g, '').slice(0, 300);
    } else if (TOP_LEVEL_KEYS.has(key) && !Object.hasOwn(out, key)) {
      out[key] = raw.slice(0, 2100); // tope por campo; la validación posterior es la que decide
    }
  }
  out.players = [...out.players.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);
  return out;
}

function toInt(value) {
  const text = cleanText(value);
  return /^\d{1,3}$/.test(text) ? Number(text) : NaN;
}

export function validateCheckout(input) {
  const errors = {};
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  // Correo y teléfono jamás se "reparan": con caracteres de control se rechazan (quitarlos cambiaría la dirección o el número).
  const hasControl = value => typeof value === 'string' && /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
  const email = hasControl(input.email) ? '' : cleanText(input.email).toLowerCase();
  const phone = hasControl(input.phone) ? '' : cleanText(input.phone);
  const country = normalizeCountry(input.country, input.country_code);
  const quantity = toInt(input.quantity);

  if (!firstName) errors.firstName = 'Enter a valid first name (letters, spaces, apostrophes and hyphens).';
  if (!lastName) errors.lastName = 'Enter a valid last name (letters, spaces, apostrophes and hyphens).';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  const digits = phone.replace(/\D+/g, '');
  if (!/^\+?[0-9() .-]{7,25}$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Enter a valid phone number (7 to 15 digits).';
  if (!/^[A-Z]{2}$/.test(country)) errors.country = 'Select your country.';
  if (!['accepted', 'true', 'on', '1', 'yes'].includes(cleanText(input.terms).toLowerCase())) errors.terms = 'You must accept the terms and privacy policy.';

  if (!Number.isInteger(quantity) || quantity < LIMITS.qtyMin || quantity > LIMITS.qtyMax) {
    errors.quantity = `Quantity must be between ${LIMITS.qtyMin} and ${LIMITS.qtyMax}.`;
  }

  const players = [];
  const list = Array.isArray(input.players) ? input.players : [];
  if (!Array.isArray(input.players) || (Number.isInteger(quantity) && list.length !== quantity)) {
    errors.players = 'The number of players must match the quantity.';
  } else {
    list.forEach((raw, i) => {
      const n = i + 1;
      const name = cleanName(raw?.name);
      const age = toInt(raw?.age);
      const position = cleanText(raw?.position);
      const jerseySize = cleanText(raw?.jerseySize).toUpperCase();
      if (!name) errors[`players[${i}].name`] = `Player ${n}: enter a valid name.`;
      if (!Number.isInteger(age) || age < LIMITS.ageMin || age > LIMITS.ageMax) errors[`players[${i}].age`] = `Player ${n}: age must be between ${LIMITS.ageMin} and ${LIMITS.ageMax}.`;
      if (!POSITIONS.includes(position)) errors[`players[${i}].position`] = `Player ${n}: select a valid position.`;
      if (!JERSEY_SIZES.includes(jerseySize)) errors[`players[${i}].jerseySize`] = `Player ${n}: select a valid jersey size.`;
      players.push({ name, age, position, jerseySize });
    });
  }

  const attribution = {};
  for (const [key, value] of Object.entries(input.attribution || {})) {
    if (ATTRIBUTION_KEYS.has(key) && value) attribution[key] = String(value).slice(0, 300);
  }

  return {
    errors,
    value: { firstName, lastName, email, phone, country, quantity, players, attribution }
  };
}

// Mensaje corto para mostrar en el formulario (el cliente muestra `error`).
export function firstErrorMessage(errors) {
  return Object.values(errors)[0] || 'Please review the form and try again.';
}
