import event from './src/_data/event.js';
import site from './src/_data/site.js';

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Tokens que el cliente puede escribir en cualquier texto del CMS.
function fill(value) {
  return String(value ?? '')
    .replaceAll('{dates}', event.dateLabel)
    .replaceAll('{datesShort}', event.dateShort)
    .replaceAll('{datesFromTo}', event.dateFromTo)
    .replaceAll('{datesThrough}', event.dateThrough)
    .replaceAll('{venue}', event.venue)
    .replaceAll('{price}', event.priceLabel)
    .replaceAll('{currency}', event.currency)
    .replaceAll('{opens}', event.opensAtLabel)
    .replaceAll('{closes}', event.closesAtLabel)
    .replaceAll('{year}', String(event.year));
}

export default function (eleventyConfig) {
  // Copia tal cual: CSS, JS, imágenes, fuentes, robots y cabeceras de Cloudflare.
  eleventyConfig.addPassthroughCopy('src/assets');
  // Widget de teléfono autoalojado (sin CDN): solo los archivos que se usan.
  eleventyConfig.addPassthroughCopy({
    'node_modules/intl-tel-input/build/css/intlTelInput.min.css': 'assets/vendor/intl-tel-input/css/intlTelInput.min.css',
    'node_modules/intl-tel-input/build/js/intlTelInput.min.js': 'assets/vendor/intl-tel-input/js/intlTelInput.min.js',
    'node_modules/intl-tel-input/build/js/utils.js': 'assets/vendor/intl-tel-input/js/utils.js',
    'node_modules/intl-tel-input/build/img': 'assets/vendor/intl-tel-input/img'
  });
  // Mismo cálculo de precios que usa el servidor: el formulario muestra el total exacto.
  eleventyConfig.addPassthroughCopy({ 'functions/_lib/pricing.js': 'assets/js/pricing.js' });
  eleventyConfig.addPassthroughCopy('src/robots.txt');
  eleventyConfig.addPassthroughCopy('src/_headers');

  // {tokens} → valores del evento. Nunjucks escapa el resultado (autoescape).
  eleventyConfig.addFilter('fill', value => fill(value));
  // Igual, pero permite **negritas**; escapa el HTML y se usa siempre con | safe.
  eleventyConfig.addFilter('md', value =>
    escapeHtml(fill(value)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  );
  // Texto plano para atributos y JSON-LD (sin escapar: lo hace el JSON/atributo).
  eleventyConfig.addFilter('plain', value => fill(value).replace(/\*\*/g, ''));
  eleventyConfig.addFilter('json', value => JSON.stringify(value));
  eleventyConfig.addFilter('absUrl', path => new URL(path, site.url).href);
  eleventyConfig.addFilter('dateISO', d => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter('pad2', n => String(n).padStart(2, '0'));

  // JSON-LD del evento. Solo anuncia la oferta de boletos cuando la venta está abierta.
  eleventyConfig.addFilter('eventJsonLd', (ev, st) => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${ev.name} — International Hockey Tournament`,
      startDate: ev.startDate,
      endDate: ev.endDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      description: `International hockey tournament bringing together players from Canada, the United States and Mexico at ${ev.venue}.`,
      image: [new URL(st.ogImage, st.url).href],
      url: st.url,
      location: {
        '@type': 'Place',
        name: ev.venue,
        address: { '@type': 'PostalAddress', addressLocality: ev.city, addressRegion: ev.region, addressCountry: ev.country }
      },
      organizer: { '@type': 'Organization', name: st.organizer, url: st.organizerUrl }
    };
    if (ev.isOpen) {
      data.offers = {
        '@type': 'Offer',
        url: new URL('tickets.html', st.url).href,
        price: String(ev.price),
        priceCurrency: ev.currency,
        availability: 'https://schema.org/InStock',
        category: 'Player ticket'
      };
    }
    return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'html', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
}
