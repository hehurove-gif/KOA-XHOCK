// Compara los cuatro informes Lighthouse (antes/después, móvil/escritorio).
// Uso: node lh-compare.js
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', '01-informe', 'EVIDENCIA', 'lighthouse');
const files = {
  'live mobile': 'lh-live-mobile.report.json',
  'live desktop': 'lh-live-desktop.report.json',
  'local mobile': 'lh-local-mobile.report.json',
  'local desktop': 'lh-local-desktop.report.json'
};

for (const [label, file] of Object.entries(files)) {
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) {
    console.log(label.padEnd(14), '(falta', file + ')');
    continue;
  }
  const j = JSON.parse(fs.readFileSync(full, 'utf8'));
  const a = j.audits;
  const get = (id) => (a[id] ? a[id].displayValue || a[id].score : 'n/a');
  console.log(
    label.padEnd(14),
    'perf', Math.round(j.categories.performance.score * 100),
    'a11y', Math.round(j.categories.accessibility.score * 100),
    'bp', Math.round(j.categories['best-practices'].score * 100),
    'seo', Math.round(j.categories.seo.score * 100)
  );
  console.log(
    '  FCP', get('first-contentful-paint'),
    '| LCP', get('largest-contentful-paint'),
    '| TBT', get('total-blocking-time'),
    '| CLS', get('cumulative-layout-shift'),
    '| SI', get('speed-index')
  );
  const fails = Object.entries(a).filter(([id, x]) =>
    x.score !== null && x.score < 1 &&
    ['accessibility', 'best-practices', 'seo'].some(c =>
      (j.categories[c] || { auditRefs: [] }).auditRefs.some(r => r.id === id)
    )
  );
  console.log('  fallos a11y/bp/seo:', fails.map(([id]) => id).join(', ') || 'ninguno');
}
