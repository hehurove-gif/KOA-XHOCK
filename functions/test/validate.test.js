import test from 'node:test';
import assert from 'node:assert/strict';
import { parseForm, validateCheckout } from '../_lib/validate.js';

export function goodEntries(overrides = {}, players) {
  const base = {
    firstName: 'María José', lastName: "O'Connor-Pérez", email: 'Maria@Example.com', phone: '+52 55 1234 5678',
    country: 'mx', quantity: '2', terms: 'accepted', company: '', ticketType: 'Player Ticket', utm_source: 'ig', evil: 'x', ...overrides
  };
  const list = players ?? [
    { name: 'María José', age: '34', position: 'Center', jerseySize: 'M' },
    { name: 'Jean-Luc', age: '12', position: 'Goalie', jerseySize: 'XS' }
  ];
  const entries = Object.entries(base);
  list.forEach((p, i) => Object.entries(p).forEach(([k, v]) => entries.push([`players[${i}][${k}]`, v])));
  return entries;
}

const run = (overrides, players) => validateCheckout(parseForm(goodEntries(overrides, players)));

test('acepta un pedido válido y normaliza', () => {
  const { errors, value } = run();
  assert.deepEqual(errors, {});
  assert.equal(value.email, 'maria@example.com');
  assert.equal(value.country, 'MX');
  assert.equal(value.quantity, 2);
  assert.equal(value.players.length, 2);
  assert.deepEqual(value.attribution, { utm_source: 'ig' }); // solo claves permitidas
});

test('rechaza cantidades fuera de rango y desajuste de jugadores', () => {
  for (const q of ['0', '11', '1000', '-1', '2.5', 'abc', '']) assert.ok(run({ quantity: q }).errors.quantity, `quantity ${q}`);
  assert.ok(run({ quantity: '3' }).errors.players); // 2 jugadores, quantity 3
});

test('rechaza edades, nombres, posiciones y tallas inválidas', () => {
  const bad = (p) => run({ quantity: '1' }, [{ name: 'Ana', age: '20', position: 'Center', jerseySize: 'M', ...p }]).errors;
  assert.ok(bad({ age: '4' })['players[0].age']);
  assert.ok(bad({ age: '100' })['players[0].age']);
  assert.ok(bad({ name: '123' })['players[0].name']);
  assert.ok(bad({ name: '<script>alert(1)</script>' })['players[0].name']);
  assert.ok(bad({ position: 'Striker' })['players[0].position']);
  assert.ok(bad({ jerseySize: 'XXXL' })['players[0].jerseySize']);
});

test('rechaza datos de contacto inválidos y términos sin aceptar', () => {
  assert.ok(run({ email: 'no-es-email' }).errors.email);
  assert.ok(run({ phone: '123' }).errors.phone);
  assert.ok(run({ country: 'MEX' }).errors.country);
  assert.ok(run({ terms: '' }).errors.terms);
  assert.ok(run({ firstName: '' }).errors.firstName);
  assert.ok(Object.keys(validateCheckout(parseForm([])).errors).length >= 5);
});

test('ignora índices de jugador fuera de formato y claves peligrosas', () => {
  const parsed = parseForm([['players[999][name]', 'x'], ['__proto__', 'x'], ['players', 'x'], ['constructor', 'x']]);
  assert.deepEqual(parsed.players, []);
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
});
