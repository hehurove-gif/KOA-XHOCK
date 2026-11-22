// Flujo de compra en un navegador real contra el Worker local (workerd + D1) y un Stripe simulado.
//   npm run test:browser      (CHROME_PATH opcional; por defecto usa el Chromium de Playwright)
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { signWebhook } from '../_lib/stripe.js';
import { startStack, WEBHOOK_SECRET, ADMIN_TOKEN } from './harness.mjs';

const stack = await startStack({ port: 8790, stripePort: 8767 });
const { base } = stack;
let browser, failed = false;
const ok = label => console.log('ok  ' + label);

try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  let lastCheckout = '';
  page.on('response', async r => { if (r.url().endsWith('/api/checkout')) lastCheckout = `${r.status()} ${await r.text().catch(() => '')}`; });
  page.on('pageerror', e => pageErrors.push(e.message));

  // Los destinos externos se interceptan: Stripe, analítica y el captcha nunca salen a internet.
  let redirectedTo = null;
  await page.route(/checkout\.stripe\.com/, route => { redirectedTo = route.request().url(); route.fulfill({ status: 200, contentType: 'text/html', body: 'stripe' }); });
  await page.route(/googletagmanager|facebook|challenges\.cloudflare/, route => route.abort());

  // 1. El formulario rechaza datos inválidos sin llamar al servidor
  await page.goto(`${base}/tickets.html`);
  let checkoutCalls = 0;
  page.on('request', r => { if (r.url().endsWith('/api/checkout')) checkoutCalls += 1; });
  await page.click('button[type=submit]');
  await page.waitForSelector('.tm-field__error:not([hidden])');
  assert.equal(checkoutCalls, 0);
  ok('validación del cliente: errores visibles y sin petición al servidor');

  // 2. Compra válida de 2 boletos
  await page.fill('#tmFirstName', 'María');
  await page.fill('#tmLastName', 'González');
  await page.fill('#tmEmail', `maria.${Date.now()}@example.com`);
  await page.fill('#tmPhone', '55 1234 5678');
  await page.selectOption('#tmCountry', 'Mexico');
  await page.click('[data-qty-step="1"]');
  assert.equal(await page.inputValue('#tmQty'), '2');
  for (const [i, [name, age, position, size]] of [['María González', '30', 'Center', 'M'], ['Luis González', '9', 'Goalie', 'XS']].entries()) {
    await page.fill(`[name="players[${i}][name]"]`, name);
    await page.fill(`[name="players[${i}][age]"]`, age);
    await page.selectOption(`[name="players[${i}][position]"]`, position);
    await page.selectOption(`[name="players[${i}][jerseySize]"]`, size);
  }
  await page.check('#tmTerms');
  await Promise.all([page.waitForRequest(r => r.url().endsWith('/api/checkout')), page.click('button[type=submit]')]);
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }).catch(async error => {
    const visible = await page.locator('.tm-field__error:not([hidden]), #tmError:not([hidden])').allTextContents();
    throw new Error(`no se redirigió a Stripe. Errores visibles: ${JSON.stringify(visible)}. Respuesta del servidor: ${lastCheckout}. ${error.message}`);
  });
  assert.match(redirectedTo, /checkout\.stripe\.com\/c\/pay\/cs_e2e_/);
  assert.equal(stack.stripeCalls.length, 1);
  assert.equal(stack.stripeCalls[0].get('line_items[0][price_data][unit_amount]'), '17500');
  assert.equal(stack.stripeCalls[0].get('line_items[0][quantity]'), '2');
  ok('compra válida: redirige a Stripe con el importe calculado en el servidor');

  // 3. Webhook de pago y panel de administración en el navegador
  const orderId = stack.stripeCalls[0].get('client_reference_id');
  const sessionId = redirectedTo.split('/').pop();
  const body = JSON.stringify({ id: `evt_${Date.now()}`, type: 'checkout.session.completed', data: { object: { id: sessionId, client_reference_id: orderId, payment_status: 'paid', payment_intent: 'pi_b', amount_total: 35000, currency: 'usd' } } });
  const hook = await fetch(`${base}/api/stripe-webhook`, { method: 'POST', body, headers: { 'Stripe-Signature': await signWebhook(body, WEBHOOK_SECRET) } });
  assert.equal(hook.status, 200);

  await page.goto(`${base}/admin/`);
  await page.fill('#adm-token', ADMIN_TOKEN);
  await page.fill('#adm-q', 'González');
  await page.click('#adm-form button[type=submit]');
  await page.waitForSelector('#adm-table tbody tr');
  assert.equal(await page.locator('#adm-table tbody tr').count(), 2);
  await page.check('#adm-table thead input');
  await page.fill('#adm-assign-team', 'Azul');
  await page.click('#adm-assign button');
  await page.waitForFunction(() => document.getElementById('adm-ok').textContent.includes('2 player'));
  await page.fill('#adm-team', 'Azul');
  await page.click('#adm-form button[type=submit]');
  await page.waitForFunction(() => document.querySelectorAll('#adm-table tbody tr').length === 2);
  assert.match(await page.textContent('#adm-cards'), /350\.00 USD/);
  ok('panel: pedido pagado visible, equipo asignado y filtrable');

  // 4. Volver de Stripe cancelando muestra el aviso y conserva el formulario
  await page.goto(`${base}/tickets.html?checkout=cancelled`);
  await page.waitForSelector('#tmError:not([hidden]), .tm-notice, [role=status]:not(:empty)', { timeout: 5000 }).catch(() => {});
  assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
  ok('sin errores de JavaScript en todo el recorrido');
  console.log('Browser E2E: todo correcto');
} catch (error) {
  failed = true;
  console.error('Browser E2E falló:', error.message);
  console.error(stack.log.slice(-1200));
} finally {
  await browser?.close();
  stack.stop();
  setTimeout(() => process.exit(failed ? 1 : 0), 500);
}
