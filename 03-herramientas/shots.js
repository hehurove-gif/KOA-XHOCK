const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8099/index.html';
const TICKETS = new URL('tickets.html', BASE).href;
const OUT = path.resolve(__dirname, '..', '01-informe', 'EVIDENCIA', 'capturas-despues');

async function prepare(page) {
  // Scroll through once so lazy images decode, then force the final state so
  // the full-page capture is deterministic (no mid-transition blank areas).
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.querySelectorAll('.fade-up,.reveal,.split-title').forEach(el => el.classList.add('is-visible'));
  });
  await page.waitForTimeout(1300);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const [w, h, label] of [[1440, 900, '1440'], [1024, 768, '1024'], [768, 1024, '768'], [390, 844, '390'], [360, 800, '360']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });

    const landing = await ctx.newPage();
    await landing.goto(BASE, { waitUntil: 'load' });
    await landing.waitForTimeout(700);
    await prepare(landing);
    await landing.screenshot({ path: path.join(OUT, `despues-${label}.png`), fullPage: true, animations: 'disabled' });

    const tickets = await ctx.newPage();
    await tickets.goto(TICKETS, { waitUntil: 'load' });
    await tickets.waitForTimeout(900);
    await tickets.screenshot({ path: path.join(OUT, `tickets-${label}.png`), fullPage: true, animations: 'disabled' });

    console.log('captured', label);
    await ctx.close();
  }

  // No-JS: content must remain visible and readable on both pages.
  for (const [url, file] of [[BASE, 'sin-js-390.png'], [TICKETS, 'sin-js-tickets-390.png']]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    const hidden = await page.evaluate(() => [...document.querySelectorAll('.fade-up,.reveal')].filter(el => getComputedStyle(el).opacity === '0').length).catch(() => -1);
    console.log('no-JS hidden elements:', file, hidden);
    await ctx.close();
  }

  await browser.close();
  console.log('shots done');
})();
