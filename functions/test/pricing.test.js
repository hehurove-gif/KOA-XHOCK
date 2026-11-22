import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPricing, priceFor, priceOrder, isEarlyBird } from '../_lib/pricing.js';

const base = { price: 175, currency: 'USD' };
const full = { ...base, childPrice: 100, childMaxAge: 12, earlyBirdUntil: '2026-09-01', earlyBirdPrice: 150, earlyBirdChildPrice: 80 };
const at = iso => Date.parse(iso);

test('solo precio base: todos pagan lo mismo (comportamiento anterior)', () => {
  const p = buildPricing(base);
  assert.deepEqual(priceFor(8, p), { tier: 'adult', amount: 17500 });
  assert.deepEqual(priceFor(40, p), { tier: 'adult', amount: 17500 });
  assert.equal(priceOrder([{ age: 8 }, { age: 40 }], p).total, 35000);
});

test('tarifa junior por edad (límite inclusivo)', () => {
  const p = buildPricing({ ...base, childPrice: 100, childMaxAge: 12 });
  assert.deepEqual(priceFor(12, p), { tier: 'child', amount: 10000 });
  assert.deepEqual(priceFor(13, p), { tier: 'adult', amount: 17500 });
});

test('preventa: rige hasta el final del día en Cancún y luego vuelve al precio normal', () => {
  const p = buildPricing(full);
  assert.equal(isEarlyBird(p, at('2026-09-01T23:30:00-05:00')), true);
  assert.equal(isEarlyBird(p, at('2026-09-02T00:00:01-05:00')), false);
  assert.deepEqual(priceFor(30, p, at('2026-08-01T12:00:00Z')), { tier: 'early_adult', amount: 15000 });
  assert.deepEqual(priceFor(9, p, at('2026-08-01T12:00:00Z')), { tier: 'early_child', amount: 8000 });
  assert.deepEqual(priceFor(30, p, at('2026-09-05T12:00:00Z')), { tier: 'adult', amount: 17500 });
  assert.deepEqual(priceFor(9, p, at('2026-09-05T12:00:00Z')), { tier: 'child', amount: 10000 });
});

test('preventa solo para adultos: junior conserva su precio y su categoría', () => {
  const p = buildPricing({ ...base, childPrice: 100, childMaxAge: 12, earlyBirdUntil: '2026-09-01', earlyBirdPrice: 150 });
  assert.deepEqual(priceFor(9, p, at('2026-08-01T12:00:00Z')), { tier: 'child', amount: 10000 });
});

test('pedido mixto: líneas agrupadas y total', () => {
  const p = buildPricing(full);
  const order = priceOrder([{ age: 30 }, { age: 31 }, { age: 9 }], p, at('2026-08-01T12:00:00Z'));
  assert.equal(order.total, 15000 * 2 + 8000);
  assert.deepEqual(order.lines.map(l => [l.tier, l.quantity, l.unitAmount]).sort(), [['early_adult', 2, 15000], ['early_child', 1, 8000]]);
});

test('valores vacíos del CMS se ignoran', () => {
  const p = buildPricing({ ...base, childPrice: '', childMaxAge: '', earlyBirdUntil: '', earlyBirdPrice: '', earlyBirdChildPrice: '' });
  assert.deepEqual(priceFor(5, p), { tier: 'adult', amount: 17500 });
});
