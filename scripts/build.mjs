// Build del sitio. Con status "auto" (ventana de venta por fechas) genera además una copia de las páginas que
// cambian con el estado en _v/<estado>/, y el Worker sirve la que corresponde a la hora real.
//   SITE_DIR=ruta  (por defecto _site)  ·  XHOCK_STATUS=open|soon|closed|auto  (forzar estado)
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = process.env.SITE_DIR || '_site';
const raw = JSON.parse(readFileSync(new URL('../src/_data/cms/event.json', import.meta.url), 'utf8'));
const requested = process.env.XHOCK_STATUS || raw.status;

function eleventy(args, env = {}) {
  const result = spawnSync('npx', ['eleventy', ...args], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

eleventy([`--output=${out}`]);

if (requested === 'auto') {
  for (const state of ['open', 'soon', 'closed']) {
    const dir = join(out, '_v', state);
    eleventy([`--output=${dir}`], { XHOCK_STATUS: state });
    // De cada variante solo se conservan las páginas HTML; los recursos se sirven desde la raíz.
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory() || !entry.endsWith('.html')) rmSync(path, { recursive: true, force: true });
    }
  }
  console.log('[build] modo auto: variantes open/soon/closed generadas en ' + join(out, '_v'));
}
