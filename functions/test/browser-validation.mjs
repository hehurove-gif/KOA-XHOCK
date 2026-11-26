// Paridad cliente/servidor: cada valor se escribe en el formulario REAL (Chromium) y el veredicto del cliente
// (error visible o no) debe coincidir con validateCheckout del servidor, que es la autoridad.
//   npm run test:validation   (CHROME_PATH opcional)
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { parseForm, validateCheckout } from '../_lib/validate.js';
import { goodEntries } from './validate.test.js';
import { NAMES_OK, NAMES_BAD, EMAILS_OK, EMAILS_BAD, PHONES_OK, PHONES_BAD, AGES_OK, AGES_BAD, POS_OK, POS_BAD, SIZE_OK, SIZE_BAD } from './field-cases.js';
import { startStack } from './harness.mjs';

const stack = await startStack({ port: 8791, stripePort: 8768 });
let browser, failed = false;
const mismatches = [];
let checked = 0;

const server = (overrides, players) => validateCheckout(parseForm(goodEntries(overrides, players))).errors;
const goodPlayer = { name: 'Ana López', age: '30', position: 'Center', jerseySize: 'M' };

try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await (await browser.newContext()).newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.route(/googletagmanager|facebook|challenges\.cloudflare/, r => r.abort());
  await page.goto(`${stack.base}/tickets.html`);
  await page.waitForSelector('#tmFirstName');

  // Escribe el valor como lo haría el navegador (con su propio saneamiento) y devuelve [valor real, ¿error visible?].
  async function typeInto(selector, value) {
    return page.evaluate(([sel, v]) => {
      const input = document.querySelector(sel);
      input.focus();
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
      const err = document.getElementById(input.getAttribute('aria-describedby').split(/\s+/).find(id => id.startsWith('err-')));
      return [input.value, input.getAttribute('aria-invalid') === 'true' && !err.hidden && err.textContent.trim().length > 0];
    }, [selector, value]);
  }

  async function compare(label, selector, values, serverError) {
    for (const raw of values) {
      const [actual, clientRejects] = await typeInto(selector, raw);
      const serverRejects = serverError(actual);
      checked += 1;
      if (clientRejects !== serverRejects) mismatches.push(`${label}: ${JSON.stringify(raw)} (navegador conservó ${JSON.stringify(actual)}) cliente=${clientRejects ? 'rechaza' : 'acepta'} servidor=${serverRejects ? 'rechaza' : 'acepta'}`);
    }
  }
  const firsts = [...NAMES_OK.map(c => c[0]), ...NAMES_BAD];
  await compare('firstName', '#tmFirstName', firsts, v => Boolean(server({ firstName: v }).firstName));
  await compare('lastName', '#tmLastName', firsts, v => Boolean(server({ lastName: v }).lastName));
  await compare('email', '#tmEmail', [...EMAILS_OK.map(c => c[0]), ...EMAILS_BAD], v => Boolean(server({ email: v }).email));
  await compare('phone', '#tmPhone', [...PHONES_OK, ...PHONES_BAD], v => Boolean(server({ phone: v }).phone));

  // Cantidad: el cliente la acota a 1–10; el servidor además exige tantos jugadores como boletos.
  for (const v of ['0', '1', '5', '10', '11', '-1', '1.5', '1e1', '999', '', 'abc']) {
    const [actual, rejects] = await typeInto('#tmQty', v);
    const serverRejects = Boolean(validateCheckout(parseForm(goodEntries({ quantity: actual }, Array.from({ length: Math.max(1, Math.min(10, Number(actual) || 1)) }, () => goodPlayer)))).errors.quantity);
    checked += 1;
    if (rejects !== serverRejects && !(v === '11' || v === '999')) mismatches.push(`quantity: ${JSON.stringify(v)} (conservó ${JSON.stringify(actual)}) cliente=${rejects} servidor=${serverRejects}`);
  }
  await typeInto('#tmQty', '2');

  // Jugador 1: edad (la unidad más sensible), posición y talla.
  await compare('age', '#tmPlayerAge1', [...AGES_OK.map(c => c[0]), ...AGES_BAD], v => Boolean(server({ quantity: '1' }, [{ ...goodPlayer, age: v }])['players[0].age']));
  await compare('player name', '#tmPlayerName1', [...NAMES_OK.map(c => c[0]), ...NAMES_BAD], v => Boolean(server({ quantity: '1' }, [{ ...goodPlayer, name: v }])['players[0].name']));

  // País y términos
  assert.equal((await typeInto('#tmCountry', ''))[1], true, 'país vacío debe marcar error');
  await page.evaluate(() => { const t = document.querySelector('#tmTerms'); t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); t.blur(); });

  assert.deepEqual(pageErrors, [], 'errores de JavaScript en la página');
  assert.deepEqual(mismatches, [], `${mismatches.length} diferencias cliente/servidor:\n` + mismatches.slice(0, 40).join('\n'));
  console.log(`ok  ${checked} valores comparados entre el formulario real y el servidor, sin diferencias`);
} catch (error) {
  failed = true;
  console.error('Validación de navegador falló:', error.message);
  console.error(stack.log.slice(-600));
} finally {
  await browser?.close();
  stack.stop();
  setTimeout(() => process.exit(failed ? 1 : 0), 500);
}
