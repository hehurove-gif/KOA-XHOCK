// Validación campo por campo: valores válidos, inválidos y límites de cada dato del formulario de compra.
// Un caso por línea: si una regla cambia, el fallo dice exactamente qué valor y qué campo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckout, parseForm } from '../_lib/validate.js';
import { goodEntries } from './validate.test.js';
import { long, NAMES_OK, NAMES_BAD, EMAILS_OK, EMAILS_BAD, PHONES_OK, PHONES_BAD, AGES_OK, AGES_BAD, POS_OK, POS_BAD, SIZE_OK, SIZE_BAD } from './field-cases.js';

const run = (overrides = {}, players) => validateCheckout(parseForm(goodEntries(overrides, players)));
const player = (extra = {}) => ({ name: 'Ana Ruiz', age: '30', position: 'Center', jerseySize: 'M', ...extra });
const two = extra => [player(extra), player({ name: 'Luis Ruiz', age: '10' })];
const runPlayer = extra => run({}, two(extra));

function table(label, field, valid, invalid, runner) {
  test(`${label}: valores válidos`, () => {
    for (const [input, expected] of valid) {
      const { errors, value } = runner(input);
      assert.equal(errors[field], undefined, `${JSON.stringify(input)} debería ser válido, error: ${errors[field]}`);
      if (expected !== undefined) assert.deepEqual(value.__picked ?? pick(value, field), expected, `normalización de ${JSON.stringify(input)}`);
    }
  });
  test(`${label}: valores inválidos`, () => {
    for (const input of invalid) {
      const { errors } = runner(input);
      assert.ok(errors[field], `${JSON.stringify(input).slice(0, 90)} debería rechazarse`);
    }
  });
}
const pick = (value, field) => (field.startsWith('players[0].') ? value.players[0][field.split('.')[1]] : value[field]);

table('firstName', 'firstName', NAMES_OK, NAMES_BAD, v => run({ firstName: v }));
table('lastName', 'lastName', NAMES_OK, NAMES_BAD, v => run({ lastName: v }));
table('players[].name', 'players[0].name', NAMES_OK, NAMES_BAD, v => runPlayer({ name: v }));

test('nombre: tipos no texto (número, objeto, arreglo, null) se rechazan sin romper', () => {
  for (const v of [123, null, undefined, {}, [], ['Ana'], true]) {
    const { errors } = validateCheckout({ ...parseForm(goodEntries()), firstName: v });
    assert.ok(errors.firstName, String(v));
  }
});

// ------------------------------------------------------------------ correo
table('email', 'email', EMAILS_OK, EMAILS_BAD, v => run({ email: v }));

test('correo: 254 caracteres como máximo en total', () => {
  const domain = `${long(60)}.${long(60)}.${long(60)}.${long(60)}.com`; // 4*60 + 4 + 3 = 247
  const local = long(6);
  const ok = `${local}@${domain}`;
  assert.ok(ok.length <= 254 && ok.length > 250, String(ok.length));
  assert.equal(run({ email: ok }).errors.email, undefined);
  assert.ok(run({ email: `${long(20)}@${domain}` }).errors.email, 'más de 254');
});

// ------------------------------------------------------------------ teléfono
table('phone', 'phone', PHONES_OK.map(p => [p]), PHONES_BAD, v => run({ phone: v }));

test('teléfono: espacios y salto de línea finales se recortan; con caracteres de control en medio se rechaza (no se "repara")', () => {
  assert.equal(run({ phone: '+52 55 1234 5678 ' }).errors.phone, undefined);
  assert.equal(run({ phone: '5512345678\n' }).errors.phone, undefined);
  assert.ok(run({ phone: '55123456\u00007' }).errors.phone);
  assert.ok(run({ email: 'a@b.com\u0000x' }).errors.email);
});

// ------------------------------------------------------------------ país
test('país: nombres del select, ISO y "Other" con el país del teléfono', () => {
  const ok = [['Mexico', 'MX'], ['México', 'MX'], ['mexico', 'MX'], ['Canada', 'CA'], ['United States', 'US'], ['USA', 'US'], ['mx', 'MX'], ['MX', 'MX'], ['  ca ', 'CA']];
  for (const [input, expected] of ok) assert.equal(run({ country: input }).value.country, expected, input);
  assert.equal(run({ country: 'Other', country_code: 'br' }).value.country, 'BR');
  assert.equal(run({ country: 'Other', country_code: 'BR' }).value.country, 'BR');
  assert.equal(run({ country: 'Other', country_code: '<x>' }).value.country, 'ZZ');
  assert.equal(run({ country: 'Other' }).value.country, 'ZZ');
});
test('país: valores inválidos', () => {
  for (const v of ['', ' ', 'Atlantis', 'M', 'MEX', 'M1', '1M', '<script>', 'Mexico City', "Mexico'; DROP TABLE orders;--", 'Méx', 'ＭＸ', '🇲🇽', 'US\nCA']) {
    assert.ok(run({ country: v }).errors.country, JSON.stringify(v));
  }
});

// ------------------------------------------------------------------ cantidad y número de jugadores
test('cantidad: enteros 1–10 (con ceros a la izquierda y espacios se normalizan)', () => {
  const players = n => Array.from({ length: n }, (_, i) => player({ name: `Jugador ${String.fromCharCode(65 + i)}` }));
  for (const q of [1, 2, 5, 9, 10]) {
    const { errors } = run({ quantity: String(q) }, players(q));
    assert.deepEqual(errors, {}, `quantity=${q}`);
  }
  assert.deepEqual(run({ quantity: ' 2 ' }).errors, {});
  assert.deepEqual(run({ quantity: '02' }).errors, {});
});
test('cantidad: valores inválidos', () => {
  for (const q of ['0', '11', '-1', '1.5', '1e1', 'abc', '', ' ', '999', '１０', '2 3', '+2', '0x2', 'NaN', 'Infinity', '2;', '2\n3', '١٢', '99999999999999999999']) {
    const { errors } = run({ quantity: q }, [player(), player({ name: 'Luis' })]);
    assert.ok(errors.quantity, JSON.stringify(q));
  }
});
test('jugadores: el número debe coincidir exactamente con la cantidad', () => {
  assert.ok(run({ quantity: '2' }, [player()]).errors.players, 'faltan');
  assert.ok(run({ quantity: '2' }, [player(), player({ name: 'B1' }), player({ name: 'Cc' })]).errors.players, 'sobran');
  assert.ok(run({ quantity: '1' }, []).errors.players, 'ninguno');
  const eleven = Array.from({ length: 11 }, (_, i) => player({ name: `Jugador ${String.fromCharCode(65 + i)}` }));
  assert.ok(run({ quantity: '11' }, eleven).errors.quantity, '11 > máximo');
});

// ------------------------------------------------------------------ edad, posición, talla
table('players[].age', 'players[0].age', AGES_OK, AGES_BAD, v => runPlayer({ age: v }));

table('players[].position', 'players[0].position', POS_OK, POS_BAD, v => runPlayer({ position: v }));

table('players[].jerseySize', 'players[0].jerseySize', SIZE_OK, SIZE_BAD, v => runPlayer({ jerseySize: v }));

// ------------------------------------------------------------------ términos
test('términos: valores aceptados y rechazados', () => {
  for (const v of ['accepted', 'true', 'on', '1', 'yes', 'TRUE', 'On', ' accepted ']) assert.equal(run({ terms: v }).errors.terms, undefined, v);
  for (const v of ['', 'false', '0', 'no', 'off', 'accepted!', 'acepto', 'null', 'undefined', 'truee']) assert.ok(run({ terms: v }).errors.terms, JSON.stringify(v));
  const entries = goodEntries().filter(([k]) => k !== 'terms');
  assert.ok(validateCheckout(parseForm(entries)).errors.terms, 'campo ausente');
});

// ------------------------------------------------------------------ campos ausentes, duplicados, extras y atribución
test('campos requeridos ausentes: cada uno produce su propio error', () => {
  for (const field of ['firstName', 'lastName', 'email', 'phone', 'country', 'quantity', 'terms']) {
    const entries = goodEntries().filter(([k]) => k !== field);
    const { errors } = validateCheckout(parseForm(entries));
    assert.ok(errors[field], `sin ${field}`);
  }
  const empty = validateCheckout(parseForm([])).errors;
  assert.deepEqual(Object.keys(empty).sort(), ['country', 'email', 'firstName', 'lastName', 'phone', 'quantity', 'terms']);
});

test('campos duplicados: el primero manda en los de contacto', () => {
  const { value } = validateCheckout(parseForm([...goodEntries(), ['email', 'otro@example.com'], ['firstName', 'Otro']]));
  assert.equal(value.email, 'maria@example.com');
  assert.equal(value.firstName, 'María José');
});

test('campos de más: se ignoran y no llegan al valor validado', () => {
  const { value } = validateCheckout(parseForm([...goodEntries(), ['isAdmin', 'true'], ['amount_total', '1'], ['status', 'paid'], ['__proto__', 'x'], ['players[0][role]', 'admin'], ['players[0][__proto__]', 'x']]));
  assert.deepEqual(Object.keys(value).sort(), ['attribution', 'country', 'email', 'firstName', 'lastName', 'phone', 'players', 'quantity']);
  assert.deepEqual(Object.keys(value.players[0]).sort(), ['age', 'jerseySize', 'name', 'position']);
});

test('valor gigante en un campo: se trunca y la validación lo rechaza', () => {
  assert.ok(run({ firstName: long(5000) }).errors.firstName);
  assert.ok(run({ email: `${long(5000)}@example.com` }).errors.email);
  assert.ok(run({ phone: '5'.repeat(5000) }).errors.phone);
});

test('atribución: solo claves conocidas, sin < >, máximo 300 caracteres, sin romper con valores raros', () => {
  const { value } = validateCheckout(parseForm([...goodEntries(), ['utm_source', 'ig<b>'], ['utm_medium', long(1000)], ['gclid', 'abc123'], ['landing_page', 'https://koa-hub.com/tickets?x=1'], ['no_conocida', 'x'], ['utm_term', '']]));
  assert.equal(value.attribution.utm_source, 'igb');
  assert.equal(value.attribution.utm_medium.length, 300);
  assert.equal(value.attribution.gclid, 'abc123');
  assert.equal(value.attribution.landing_page, 'https://koa-hub.com/tickets?x=1');
  assert.equal(value.attribution.no_conocida, undefined);
  assert.equal(value.attribution.utm_term, undefined, 'vacíos no se guardan');
});

test('índices de jugador: huecos y duplicados no cuelan jugadores extra', () => {
  const base = goodEntries({ quantity: '2' }).filter(([k]) => !k.startsWith('players['));
  const gap = [...base, ['players[0][name]', 'Ana Ruiz'], ['players[0][age]', '30'], ['players[0][position]', 'Center'], ['players[0][jerseySize]', 'M'],
    ['players[7][name]', 'Luis Ruiz'], ['players[7][age]', '10'], ['players[7][position]', 'Goalie'], ['players[7][jerseySize]', 'S']];
  const { errors, value } = validateCheckout(parseForm(gap));
  assert.deepEqual(errors, {}, 'los huecos se compactan, no se pierde ni se inventa a nadie');
  assert.equal(value.players.length, 2);
  for (const bad of ['players[100][name]', 'players[-1][name]', 'players[a][name]', 'players[0][name', 'players[0][name][x]', 'players[][name]', 'players[0].name']) {
    assert.equal(parseForm([[bad, 'X']]).players.length, 0, bad);
  }
});
