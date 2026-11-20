const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8099/index.html';
const TICKETS = new URL('tickets.html', BASE).href;
const OUT = path.resolve(__dirname, '..', '01-informe', 'EVIDENCIA', 'capturas-despues');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results = [];
  const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  };

  const VIEWPORTS = [[1440, 900, '1440'], [1024, 768, '1024'], [768, 1024, '768'], [390, 844, '390'], [360, 800, '360']];

  // ---------- Responsive: landing + standalone ticket page ----------
  for (const [w, h, label] of VIEWPORTS) {
    for (const [url, name] of [[BASE, 'index'], [TICKETS, 'tickets']]) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(1000);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflow: [...document.querySelectorAll('body *')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > document.documentElement.clientWidth + 2 || r.left < -2) && getComputedStyle(el).position !== 'fixed';
        }).slice(0, 8).map(el => el.className || el.tagName)
      }));
      record(`sin scroll horizontal ${name} @${label}`, metrics.scrollWidth <= metrics.clientWidth + 1, `scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth} overflow=${JSON.stringify(metrics.overflow)}`);
      record(`sin errores de consola ${name} @${label}`, errors.length === 0, errors.slice(0, 3).join(' | '));
      await page.screenshot({ path: path.join(OUT, `prueba-${name}-${label}.png`), fullPage: true });
      await context.close();
    }
  }

  // ---------- Landing page: CTAs, cursor, FAQ ----------
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const brokenImages = await page.evaluate(() =>
    [...document.images].filter(img => img.complete && img.naturalWidth === 0).map(img => img.currentSrc || img.src)
  );
  record('todas las imágenes del landing cargan', brokenImages.length === 0, brokenImages.join(', '));

  const heroOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.hero__sub')).opacity);
  record('hero visible sin esperar animación', heroOpacity === '1', `opacity=${heroOpacity}`);

  const ctaState = await page.evaluate(() => ({
    links: [...document.querySelectorAll('a[href="tickets.html"]')].length,
    modal: !!document.getElementById('ticketModal'),
    oldTriggers: document.querySelectorAll('.js-open-ticket-modal').length
  }));
  record('CTAs enlazan a tickets.html y no queda modal', ctaState.links >= 5 && !ctaState.modal && ctaState.oldTriggers === 0, JSON.stringify(ctaState));

  const cursorState = await page.evaluate(() => {
    const pick = sel => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).cursor : 'missing';
    };
    return {
      body: getComputedStyle(document.body).cursor,
      card: pick('.tilt-card'),
      faq: pick('.faq-item'),
      link: pick('.nav__links a'),
      button: pick('.btn')
    };
  });
  record('cursor nativo sobre secciones blancas', cursorState.card !== 'none' && cursorState.faq !== 'none' && cursorState.body !== 'none', JSON.stringify(cursorState));

  // FAQ still works (the landing keeps its accordion)
  const faqBefore = await page.evaluate(() => {
    const items = document.querySelectorAll('.faq-item');
    return { firstExpanded: items[0].querySelector('button').getAttribute('aria-expanded'), secondInert: items[1].querySelector('.faq-panel').inert };
  });
  await page.click('.faq-item:nth-child(2) button');
  await page.waitForTimeout(200);
  const faqAfter = await page.evaluate(() => {
    const items = document.querySelectorAll('.faq-item');
    return { secondExpanded: items[1].querySelector('button').getAttribute('aria-expanded'), secondInert: items[1].querySelector('.faq-panel').inert };
  });
  record('FAQ sincroniza aria-expanded e inert', faqBefore.secondInert === true && faqAfter.secondExpanded === 'true' && faqAfter.secondInert === false, JSON.stringify({ faqBefore, faqAfter }));

  // Navigation: the nav CTA must take the visitor to the standalone page.
  await page.click('.nav a[href="tickets.html"]');
  await page.waitForLoadState('load');
  record('el CTA navega a la página de tickets', page.url().endsWith('/tickets.html'), page.url());

  // ---------- Standalone ticket page ----------
  await page.waitForTimeout(500);
  const pageState = await page.evaluate(() => ({
    heading: document.querySelector('h1')?.textContent.trim().slice(0, 60),
    form: !!document.getElementById('ticketForm'),
    modal: !!document.getElementById('ticketModal'),
    price: document.querySelector('.ticket-summary__price strong')?.textContent.trim()
  }));
  record('página de tickets independiente con formulario', pageState.form && !pageState.modal && pageState.price === '$175', JSON.stringify(pageState));

  const ticketBroken = await page.evaluate(() =>
    [...document.images].filter(img => img.complete && img.naturalWidth === 0).map(img => img.currentSrc || img.src)
  );
  record('todas las imágenes de tickets cargan', ticketBroken.length === 0, ticketBroken.join(', '));

  // Quantity hard clamp
  await page.fill('#tmQty', '1000');
  await page.waitForTimeout(700);
  const qtyState = await page.evaluate(() => ({
    value: document.getElementById('tmQty').value,
    players: document.querySelectorAll('[data-player-index]').length
  }));
  record('cantidad 1000 se limita a 10', qtyState.value === '10' && qtyState.players === 10, JSON.stringify(qtyState));

  // Stepper
  await page.click('[data-qty-step="-1"]');
  await page.waitForTimeout(400);
  const qtyAfter = await page.evaluate(() => ({
    value: document.getElementById('tmQty').value,
    players: document.querySelectorAll('[data-player-index]').length
  }));
  record('stepper resta y sincroniza jugadores', qtyAfter.value === '9' && qtyAfter.players === 9, JSON.stringify(qtyAfter));

  // Validation: empty submit
  await page.fill('#tmQty', '1');
  await page.waitForTimeout(400);
  await page.click('#ticketForm button[type="submit"]');
  await page.waitForTimeout(500);
  const validation = await page.evaluate(() => ({
    firstNameInvalid: document.getElementById('tmFirstName').getAttribute('aria-invalid'),
    firstNameError: document.getElementById('err-tmFirstName').hidden,
    errorVisible: !document.getElementById('tmError').hidden,
    focus: document.activeElement.id
  }));
  record('validación inline bloquea envío vacío', validation.firstNameInvalid === 'true' && validation.firstNameError === false && validation.errorVisible, JSON.stringify(validation));

  // Invalid name
  await page.fill('#tmFirstName', 'Maria123');
  await page.locator('#tmFirstName').blur();
  await page.waitForTimeout(200);
  const nameInvalid = await page.evaluate(() => ({
    invalid: document.getElementById('tmFirstName').getAttribute('aria-invalid'),
    msg: document.getElementById('err-tmFirstName').textContent
  }));
  record('nombre con números se rechaza', nameInvalid.invalid === 'true', JSON.stringify(nameInvalid));

  // Age out of range
  await page.fill('#tmPlayerAge1', '1');
  await page.locator('#tmPlayerAge1').blur();
  await page.waitForTimeout(200);
  const ageInvalid = await page.evaluate(() => document.getElementById('tmPlayerAge1').getAttribute('aria-invalid'));
  record('edad 1 se rechaza', ageInvalid === 'true', `aria-invalid=${ageInvalid}`);

  // Draft autosave / restore
  await page.fill('#tmFirstName', 'Lucia');
  await page.fill('#tmLastName', 'Fernandez');
  await page.fill('#tmEmail', 'lucia@example.com');
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(700);
  const draft = await page.evaluate(() => ({
    first: document.getElementById('tmFirstName').value,
    last: document.getElementById('tmLastName').value,
    notice: !!document.querySelector('.tm-draft-note')
  }));
  record('borrador se restaura tras recargar', draft.first === 'Lucia' && draft.last === 'Fernandez' && draft.notice, JSON.stringify(draft));

  // Checkout POST contract (mocked)
  await page.route('**/api/checkout.php', async route => {
    const body = route.request().postData() || '';
    fs.writeFileSync(path.join(OUT, 'post-mock.txt'), body);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://example.com/pay' }) });
  });
  await page.route('https://example.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Mock pay</title>' }));

  await page.fill('#tmPhone', '5512345678');
  await page.selectOption('#tmCountry', 'Mexico');
  await page.fill('#tmQty', '1');
  await page.waitForTimeout(400);
  await page.fill('#tmPlayerName1', 'Lucia Fernandez');
  await page.fill('#tmPlayerAge1', '27');
  await page.selectOption('#tmPlayerPosition1', 'Center');
  await page.selectOption('#tmPlayerJersey1', 'M');
  await page.check('#tmTerms');
  await page.click('#ticketForm button[type="submit"]');
  await page.waitForTimeout(1200);
  const post = fs.existsSync(path.join(OUT, 'post-mock.txt')) ? fs.readFileSync(path.join(OUT, 'post-mock.txt'), 'utf8') : '';
  record('POST incluye quantity y jugadores', /name="quantity"[\s\S]*?1/.test(post) && post.includes('players[0][name]'), post.slice(0, 300).replace(/\r?\n/g, ' '));

  await context.close();
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
