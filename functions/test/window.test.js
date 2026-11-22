import test from 'node:test';
import assert from 'node:assert/strict';
import { salesState, parseLocal, formatLocal } from '../_lib/window.js';

const at = iso => Date.parse(iso);
const ev = extra => ({ status: 'auto', ...extra });

test('modos fijos ignoran las fechas', () => {
  for (const status of ['open', 'soon', 'closed']) assert.equal(salesState({ status, salesOpensAt: '2099-01-01T00:00', salesClosesAt: '2000-01-01' }), status);
  assert.equal(salesState({ status: 'raro' }), 'closed');
});

test('auto: soon → open → closed según la hora de Cancún', () => {
  const e = ev({ salesOpensAt: '2026-12-01T18:00', salesClosesAt: '2027-01-15T20:30' });
  assert.equal(salesState(e, at('2026-12-01T17:59:59-05:00')), 'soon');
  assert.equal(salesState(e, at('2026-12-01T18:00:00-05:00')), 'open');
  assert.equal(salesState(e, at('2027-01-15T20:30:00-05:00')), 'open');
  assert.equal(salesState(e, at('2027-01-15T20:30:01-05:00')), 'closed');
  assert.equal(salesState(e, at('2026-12-01T23:00:00Z')), 'open', '18:00 Cancún = 23:00 UTC');
});

test('auto: solo cierre (abierto desde ya), solo apertura, y sin fechas = cerrado', () => {
  assert.equal(salesState(ev({ salesClosesAt: '2027-01-15' }), at('2027-01-15T23:59:00-05:00')), 'open', 'sin hora: cierra al terminar el día');
  assert.equal(salesState(ev({ salesClosesAt: '2027-01-15' }), at('2027-01-16T00:00:01-05:00')), 'closed');
  assert.equal(salesState(ev({ salesOpensAt: '2026-12-01' }), at('2026-11-30T23:59:59-05:00')), 'soon');
  assert.equal(salesState(ev({ salesOpensAt: '2026-12-01' }), at('2030-01-01T00:00:00-05:00')), 'open');
  assert.equal(salesState(ev({})), 'closed');
  assert.equal(salesState(ev({ salesOpensAt: 'mañana', salesClosesAt: 'x' })), 'closed');
});

test('parseLocal y formatLocal', () => {
  assert.equal(parseLocal('2026-13-45T25:99'), null);
  assert.equal(parseLocal(''), null);
  assert.equal(parseLocal('2026-12-01 18:00'), at('2026-12-01T18:00:00-05:00'));
  assert.equal(formatLocal('2026-12-01T18:00'), 'December 1, 2026, 6:00 PM Cancún time');
  assert.equal(formatLocal('2026-12-01T00:05'), 'December 1, 2026, 12:05 AM Cancún time');
  assert.equal(formatLocal('2026-12-01'), 'December 1, 2026');
  assert.equal(formatLocal('nada'), '');
});
