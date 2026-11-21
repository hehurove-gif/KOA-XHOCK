import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('./cms/site.json', import.meta.url), 'utf8'));

export default {
  ...site,
  whatsappUrl: (message) => `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`
};
