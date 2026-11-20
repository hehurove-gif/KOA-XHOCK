// Servidor estático local que imita las cabeceras de producción (gzip/brotli,
// caché y tipos MIME) para medir Lighthouse de forma representativa.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8100);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.php': 'text/plain; charset=utf-8'
};

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

function send(req, res, status, headers, body) {
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(req, res, 400, { 'Content-Type': 'text/plain' }, 'Bad request');
  }

  if (urlPath === '/tickets') {
    return send(req, res, 301, { Location: '/tickets/' }, '');
  }
  // El sitio se publica en /tickets/, pero ROOT apunta a la carpeta principal
  // del paquete (donde vive index.html): se quita el prefijo para que
  // /tickets/assets/... funcione igual que en producción.
  if (urlPath === '/tickets/') {
    urlPath = '/';
  } else if (urlPath.startsWith('/tickets/')) {
    urlPath = urlPath.slice('/tickets'.length);
  }

  let file = path.join(ROOT, urlPath);
  if (urlPath.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT)) {
    return send(req, res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      const notFound = path.join(ROOT, '404.html');
      if (fs.existsSync(notFound)) {
        return send(req, res, 404, { 'Content-Type': 'text/html; charset=utf-8' }, fs.readFileSync(notFound));
      }
      return send(req, res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    }

    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const isAsset = /[\\/]assets[\\/]/.test(file);
    const headers = {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': isAsset
        ? 'public, max-age=2592000, stale-while-revalidate=86400'
        : (ext === '.html' ? 'no-cache' : 'public, max-age=604800, stale-while-revalidate=86400')
    };

    const data = fs.readFileSync(file);
    const accept = req.headers['accept-encoding'] || '';
    let body = data;
    if (COMPRESSIBLE.has(ext)) {
      if (/\bbr\b/.test(accept)) {
        body = zlib.brotliCompressSync(data);
        headers['Content-Encoding'] = 'br';
      } else if (/\bgzip\b/.test(accept)) {
        body = zlib.gzipSync(data);
        headers['Content-Encoding'] = 'gzip';
      }
    }
    headers['Content-Length'] = body.length;
    headers.Vary = 'Accept-Encoding';
    send(req, res, 200, headers, body);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}/`);
});
