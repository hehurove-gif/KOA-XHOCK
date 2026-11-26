// Lista las cadenas visibles (texto y atributos) de las páginas construidas, para traducirlas.
//   XHOCK_STATUS=open npm run build && node scripts/i18n-extract.mjs [--missing]
// Con --missing solo muestra las que no están en src/_data/cms/translations.json.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { keyFor } from '../src/assets/js/i18n-core.js';

const root = process.env.SITE_DIR || '_site';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(readFileSync(path));
}).listen(8799);

export const PAGES = (process.env.I18N_PAGES || 'index.html,tickets.html,success.html').split(',');
const found = new Set();
const norm = s => s.replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.route(/googletagmanager|facebook|challenges\.cloudflare/, r => r.abort());

async function collect() {
  const list = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.parentElement.closest('script,style,noscript,svg,[data-lang-toggle],[translate="no"]')) continue;
      out.push(n.nodeValue);
    }
    document.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(el => {
      if (el.closest('[data-lang-toggle],[translate="no"]')) return;
      for (const a of ['placeholder', 'aria-label', 'alt', 'title']) if (el.hasAttribute(a)) out.push(el.getAttribute(a));
    });
    document.querySelectorAll('noscript').forEach(el => out.push(...el.textContent.split(/\n/)));
    out.push(document.title);
    document.querySelectorAll('meta[name=description],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]').forEach(m => out.push(m.content));
    return out;
  });
  for (const s of list) { const t = norm(s); if (t && /\p{L}/u.test(t)) found.add(t); }
}

for (const file of PAGES) {
  await page.goto(`http://localhost:8799/${file}`);
  await page.waitForTimeout(400);
  await collect();
  if (file === 'tickets.html' && await page.$('#tmQty')) {
    await page.click('button[type=submit]'); await collect();                      // errores vacíos
    await page.fill('#tmQty', '3'); await page.waitForTimeout(500); await collect(); // tarjetas de jugador
    await page.click('button[type=submit]'); await collect();
    for (const [sel, v] of [['#tmFirstName', 'A'], ['#tmEmail', 'x'], ['#tmPhone', '12'], ['#tmPlayerAge1', '2'], ['#tmQty', '99']]) {
      await page.fill(sel, v).catch(() => {}); await page.dispatchEvent(sel, 'blur'); await collect();
    }
  }
}
await browser.close(); server.close();

let have = new Set();
if (process.argv.includes('--missing') && existsSync('src/_data/cms/translations.json')) {
  have = new Set(JSON.parse(readFileSync('src/_data/cms/translations.json', 'utf8')).es.map(e => keyFor(e.en)));
}
const keys = new Set([...found].map(keyFor));
for (const s of [...keys].sort()) if (!have.has(s)) console.log(s);
