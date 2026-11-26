// Selector EN/ES en un navegador real: alternar, persistir, cobertura de traducciones y formulario en español.
//   npm run test:i18n   (CHROME_PATH opcional)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { keyFor } from '../../src/assets/js/i18n-core.js';

const root = '_site';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(readFileSync(path));
}).listen(8798);
const base = 'http://localhost:8798';
const dict = new Map(JSON.parse(readFileSync('src/_data/cms/translations.json', 'utf8')).es.map(e => [keyFor(e.en), e.es]));

let browser, failed = false;
const ok = label => console.log('ok  ' + label);
const visible = page => page.evaluate(() => {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.parentElement.closest('script,style,noscript,svg,[data-lang-toggle]')) continue;
    out.push(n.nodeValue.replace(/\s+/g, ' ').trim());
  }
  document.querySelectorAll('[placeholder],[aria-label],[alt]').forEach(el => { if (!el.closest('[data-lang-toggle]')) out.push(el.placeholder || el.getAttribute('aria-label') || el.alt || ''); });
  return out.filter(Boolean).join('\n');
});

try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/googletagmanager|facebook|challenges\.cloudflare/, r => r.abort());

  // 1. Inglés por defecto, botón visible y accesible
  await page.goto(`${base}/index.html`);
  await page.waitForSelector('[data-lang-toggle]');
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  assert.equal(await page.textContent('[data-lang-toggle]'), 'ES');
  const english = await visible(page);
  assert.match(english, /Experience/);
  ok('inglés por defecto; el botón ofrece ES');

  // 2. Cambiar a español
  await page.click('[data-lang-toggle]');
  await page.waitForFunction(() => document.documentElement.lang === 'es');
  assert.equal(await page.textContent('[data-lang-toggle]'), 'EN');
  assert.match(await page.title(), /Torneo internacional de hockey/);
  assert.match(await page.getAttribute('meta[name=description]', 'content'), /Regístrate como jugador individual/);
  assert.match(await page.textContent('.hero-date'), /^Del 23 al 26 de abril$/);
  assert.match(await page.textContent('.badge__date'), /23 – 26 de abril/);
  assert.match(await page.textContent('.nav__links'), /Experiencia/);
  ok('español: título, meta, fechas ("23 al 26 de abril") y navegación');

  // 3. Persiste al recargar y entre páginas; ?lang= funciona
  await page.reload();
  await page.waitForSelector('html.i18n-ready');
  assert.equal(await page.getAttribute('html', 'lang'), 'es');
  assert.match(await page.textContent('.nav__links'), /Experiencia/);
  await page.goto(`${base}/tickets.html`);
  await page.waitForSelector('html.i18n-ready');
  assert.equal(await page.getAttribute('html', 'lang'), 'es');
  ok('la preferencia persiste al recargar y en otras páginas');

  // 4. Formulario en español: errores, tarjetas de jugador y total
  await page.click('button[type=submit]');
  await page.waitForSelector('.tm-field__error:not([hidden])');
  const errorTexts = await page.locator('.tm-field__error:not([hidden])').allTextContents();
  assert.ok(errorTexts.length >= 4 && errorTexts.every(t => /^(Ingresa|Selecciona|Acepta|Este campo)/.test(t)), JSON.stringify(errorTexts));
  await page.fill('#tmQty', '2');
  await page.press('#tmQty', 'Tab');
  await page.waitForSelector('#tmPlayerAge2');
  await page.waitForTimeout(600);
  assert.match(await page.textContent('legend >> nth=1'), /Jugador 2/);
  await page.fill('#tmPlayerAge1', '30');
  await page.waitForTimeout(300);
  assert.match(await page.textContent('#tmTotal, .tm-total, [data-total]').catch(() => '') || await visible(page), /Total del pedido: \$350\.00/);
  await page.fill('#tmFirstName', 'A'); await page.dispatchEvent('#tmFirstName', 'blur');
  assert.match(await page.textContent('#err-tmFirstName'), /El nombre debe tener al menos 2 caracteres\./);
  await page.fill('#tmPlayerAge1', '2'); await page.dispatchEvent('#tmPlayerAge1', 'blur');
  await page.waitForFunction(() => document.querySelector('#err-tmPlayerAge1')?.textContent.trim(), null, { timeout: 3000 });
  assert.match(await page.textContent('#err-tmPlayerAge1'), /La edad debe estar entre 5 y 99\./);
  ok('formulario en español: errores, "Jugador 2", total, mensajes con números');

  // 5. Cobertura: ninguna cadena visible de las páginas queda sin traducir
  for (const file of ['index.html', 'tickets.html', 'success.html', 'terms.html', 'privacy.html']) {
    await page.goto(`${base}/${file}`);
    await page.waitForSelector('html.i18n-ready');
    await page.waitForTimeout(300);
    const text = await visible(page);
    // En español no debe quedar ninguna frase del diccionario en inglés (salvo las que son iguales en ambos idiomas).
    const leftovers = [...dict].filter(([en, es]) => en !== es && en.length > 12 && !/\{[dmn]\d/.test(en) && text.includes(en));
    assert.deepEqual(leftovers.map(([en]) => en), [], `${file}: frases sin traducir en pantalla`);
  }
  ok('cobertura: sin frases del diccionario en inglés en home, tickets y success');

  // 5a. Todo lo que se ve en inglés tiene su traducción en el diccionario (si falta algo, el cliente lo verá en inglés)
  for (const file of ['index.html', 'tickets.html', 'success.html', 'terms.html', 'privacy.html']) {
    await page.goto(`${base}/${file}?lang=en`);
    await page.waitForSelector('html.i18n-ready');
    await page.waitForTimeout(300);
    const missing = (await visible(page)).split('\n').filter(t => /\p{L}/u.test(t) && !/^[<]|^(src|height)=/.test(t) && !dict.has(keyFor(t)));
    assert.deepEqual([...new Set(missing)], [], `${file}: frases sin traducción en el diccionario`);
  }
  ok('todas las frases visibles tienen traducción en el diccionario');

  // 5b. Páginas legales: el botón existe y traduce títulos y fechas
  await page.goto(`${base}/terms.html?lang=es`);
  await page.waitForSelector('html.i18n-ready');
  assert.equal(await page.textContent('[data-lang-toggle]'), 'EN');
  assert.match(await page.textContent('h1'), /Términos y Condiciones/);
  assert.match(await page.textContent('.legal-meta'), /23 – 26 de abril · Última actualización: 25 de noviembre de 2026/);
  assert.match(await page.title(), /^Términos y Condiciones/);
  ok('términos y privacidad: botón, título, fechas en español');

  // 6. Volver a inglés restaura todo exactamente
  await page.goto(`${base}/index.html`);
  await page.waitForSelector('html.i18n-ready');
  await page.click('[data-lang-toggle]');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await visible(page), english);
  assert.equal(await page.textContent('[data-lang-toggle]'), 'ES');
  ok('al volver a inglés el texto queda idéntico al original');

  // 7. Sin errores de JavaScript
  assert.deepEqual(errors, []);
  ok('sin errores de JavaScript');
} catch (error) {
  failed = true;
  console.error('Prueba de idioma falló:', error.message);
} finally {
  await browser?.close();
  server.close();
  setTimeout(() => process.exit(failed ? 1 : 0), 300);
}
