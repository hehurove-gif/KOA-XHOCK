// Núcleo del traductor EN → ES (sin DOM, para usarlo igual en el navegador y en Node).
// Las cadenas se buscan primero tal cual y, si no están, con las fechas / importes / números sustituidos por
// marcadores: "Order total: $525.00" → "Order total: {m1}" → "Total del pedido: {m1}".
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const MON = `(${MONTHS.join('|')}|Sept|${SHORT.join('|')})`;
const DATE_RE = new RegExp(`\\b${MON}\\.? (\\d{1,2})(?:\\s*(–|-|to|through)\\s*(?:${MON}\\.? )?(\\d{1,2}))?(?:, (\\d{4}))?\\b`, 'g');
const MONEY_RE = /\$\d[\d,]*(?:\.\d+)?/g;
const NUM_RE = /\b\d+\b/g;

const monthIndex = name => {
  const i = MONTHS.indexOf(name);
  if (i >= 0) return { i, short: false };
  const s = name === 'Sept' ? 8 : SHORT.indexOf(name);
  return { i: s, short: true };
};

function renderDate([, m1, d1, conn, m2, d2, year]) {
  const a = monthIndex(m1);
  const name = idx => (a.short ? SHORT_ES[idx] : MONTHS_ES[idx]);
  const sep = a.short ? ' ' : ' de ';
  const tail = year ? ` de ${year}` : '';
  if (!d2) return `${d1}${sep}${name(a.i)}${tail}`;
  const word = conn === 'to' || conn === 'through' ? 'al' : '–';
  const b = m2 ? monthIndex(m2) : a;
  if (b.i === a.i) return `${d1} ${word} ${d2}${sep}${name(a.i)}${tail}`;
  return `${d1}${sep}${name(a.i)} ${word} ${d2}${sep}${name(b.i)}${tail}`;
}

export const normalize = text => text.replace(/\s+/g, ' ').trim();

// Sustituye fechas, importes y números por {d1}, {m1}, {n1}… y devuelve cómo volver a ponerlos.
export function tokenize(text) {
  const values = {};
  let d = 0, m = 0, n = 0;
  let out = text.replace(DATE_RE, (...match) => { const key = `d${++d}`; values[key] = renderDate(match); return `{${key}}`; });
  out = out.replace(MONEY_RE, s => { const key = `m${++m}`; values[key] = s; return `{${key}}`; });
  out = out.replace(NUM_RE, s => { const key = `n${++n}`; values[key] = s; return `{${key}}`; });
  return { template: out, values };
}

export function buildDictionary(entries) {
  const map = new Map();
  for (const { en, es } of entries || []) if (en && es) map.set(normalize(en), es);
  return map;
}

const fill = (text, values) => text.replace(/\{([dmn]\d+)\}/g, (all, key) => (key in values ? values[key] : all));

// Devuelve la traducción o null si no hay (el texto original se queda como está).
export function translate(text, dict, scope = '') {
  const clean = normalize(text);
  if (!clean || !/\p{L}/u.test(clean)) return null;
  // Una misma frase puede traducirse distinto según la zona (clave "zona::frase", marcada con data-i18n-scope).
  if (scope && dict.has(`${scope}::${clean}`)) return dict.get(`${scope}::${clean}`);
  if (dict.has(clean)) return dict.get(clean);
  const { template, values } = tokenize(clean);
  if (dict.has(template)) return fill(dict.get(template), values);
  // Listas "a + b" (resumen del pedido): cada parte se traduce por separado.
  if (clean.includes(' + ')) {
    const parts = clean.split(' + ').map(part => translate(part, dict));
    if (parts.every(Boolean)) return parts.join(' + ');
  }
  return null;
}

// Clave que debe tener el diccionario para una cadena (la usa el extractor).
export const keyFor = text => {
  const clean = normalize(text);
  const { template } = tokenize(clean);
  return template;
};
