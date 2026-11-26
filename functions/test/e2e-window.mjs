// Ventana de venta automática en workerd real: el Worker sirve la variante de página según la hora.
//   XHOCK_STATUS=auto npm run build && node functions/test/e2e-window.mjs   (lo hace `npm run test:window`)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const event = JSON.parse(readFileSync(new URL('../../src/_data/cms/event.json', import.meta.url), 'utf8'));
import { startStack } from './harness.mjs';

const cases = [
  ['soon', { salesOpensAt: '2999-01-01T10:00', salesClosesAt: '2999-02-01' }, { form: false, text: event.soonTitle }],
  ['open', { salesOpensAt: '2000-01-01T10:00', salesClosesAt: '2999-02-01' }, { form: true, text: null }],
  ['closed', { salesOpensAt: '2000-01-01', salesClosesAt: '2000-02-01' }, { form: false, text: event.closedTitle }]
];
let failed = false;
let n = 0;
for (const [state, window, expect] of cases) {
  n += 1; // puerto distinto por caso: evita hablar con el proceso anterior que aún se está cerrando
  const stack = await startStack({ port: 8790 + n, stripePort: 8780 + n, status: 'auto', extraVars: [`EVENT_OVERRIDES:${JSON.stringify(window)}`] });
  try {
    const tickets = await fetch(`${stack.base}/tickets`);
    const html = await tickets.text();
    assert.equal(tickets.status, 200);
    assert.equal(html.includes('id="ticketForm"'), expect.form, `${state}: formulario`);
    if (expect.text) assert.ok(html.includes(expect.text), `${state}: aviso "${expect.text}"`);
    const home = await (await fetch(`${stack.base}/`)).text();
    assert.equal(home.includes('id="ticketForm"'), false);
    const redirect = await fetch(`${stack.base}/tickets.html`, { redirect: 'manual' });
    assert.ok([200, 307, 308].includes(redirect.status), `${state}: /tickets.html → ${redirect.status}`);
    if (redirect.status !== 200) assert.ok(!String(redirect.headers.get('location')).includes('/_v/'), 'el redirect no expone /_v/');
    assert.equal((await fetch(`${stack.base}/_v/open/tickets`)).status, 404);
    const checkout = await fetch(`${stack.base}/api/checkout`, { method: 'POST', body: new FormData() });
    assert.equal(checkout.status === 403, state !== 'open', `${state}: checkout ${checkout.status}`);
    console.log(`ok  ${state}: página, redirect, variantes ocultas y checkout coherentes`);
  } catch (error) {
    failed = true;
    console.error(`falló (${state}):`, error.message);
  } finally {
    stack.stop();
    await new Promise(r => setTimeout(r, 1500));
  }
}
console.log(failed ? 'E2E ventana: FALLÓ' : 'E2E ventana: todo correcto');
process.exit(failed ? 1 : 0);
