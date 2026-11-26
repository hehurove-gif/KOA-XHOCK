// Arranque compartido de las pruebas de extremo a extremo: Stripe simulado + `wrangler dev` (workerd real, D1 local).
import { spawn } from 'node:child_process';
import http from 'node:http';

export const WEBHOOK_SECRET = 'whsec_e2e';
export const ADMIN_TOKEN = 'e2e-admin-token-'.padEnd(40, 'x');
export const RUN = Date.now().toString(36);

export async function startStack({ port = 8788, stripePort = 8765, extraVars = [], status = 'open' } = {}) {
  const base = `http://127.0.0.1:${port}`;
  const stripeCalls = [];
  // Si algo ya responde en el puerto, la prueba hablaría con ese servidor (otro estado) y no con el suyo.
  if (await fetch(`${base}/`).then(() => true, () => false)) throw new Error(`el puerto ${port} ya está ocupado`);
  const stripe = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      stripeCalls.push(new URLSearchParams(body));
      const id = `cs_e2e_${RUN}_${stripeCalls.length}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, url: `https://checkout.stripe.com/c/pay/${id}` }));
    });
  }).listen(stripePort, '127.0.0.1');

  const dev = spawn('npx', [
    'wrangler', 'dev', '-c', 'wrangler.dev.toml', '--port', String(port), '--ip', '127.0.0.1',
    '--var', 'STRIPE_SECRET_KEY:sk_test_e2e', `STRIPE_WEBHOOK_SECRET:${WEBHOOK_SECRET}`,
    `STRIPE_API_BASE:http://127.0.0.1:${stripePort}`, `XHOCK_STATUS:${status}`, `ADMIN_TOKEN:${ADMIN_TOKEN}`,
    `PUBLIC_BASE_URL:${base}/`, ...extraVars
  ], { stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  // SIGTERM solo a npx puede dejar vivo a workerd; se cierra el grupo completo (en Windows, solo el proceso).
  const kill = () => {
    try {
      if (process.platform === 'win32') dev.kill('SIGTERM');
      else process.kill(-dev.pid, 'SIGTERM');
    } catch { /* ya había terminado */ }
  };
  // Al ir en su propio grupo ya no recibe el Ctrl+C de la terminal: se cierra también al salir.
  process.once('exit', kill);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => process.exit(1));
  const stack = { base, stripeCalls, log: '', stop() { kill(); stripe.close(); } };
  dev.stdout.on('data', d => (stack.log += d));
  dev.stderr.on('data', d => (stack.log += d));

  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(`${base}/`)).ok) return stack; } catch { /* aún no */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  stack.stop();
  throw new Error('wrangler no arrancó:\n' + stack.log.slice(-2000));
}
