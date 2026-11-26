// Selector de idioma EN/ES. El sitio se escribe en inglés; el español se aplica en el navegador con el diccionario
// editable en Pages CMS ("Traducciones"). Lo que no tenga traducción se queda en inglés.
import { buildDictionary, translate } from './i18n-core.js';

const STORE = 'koa-lang';
const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
const SKIP = 'script,style,noscript,svg,textarea,[translate="no"],[data-i18n-skip]';
const root = document.documentElement;

const texts = new WeakMap();   // nodo de texto → { orig, out }
const attrs = new WeakMap();   // elemento → { atributo: { orig, out } }
let dict = null;
let lang = 'en';
let observer = null;

const read = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
const save = value => { try { localStorage.setItem(STORE, value); } catch { /* sin almacenamiento: solo dura la visita */ } };

function initialLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'es' || fromUrl === 'en') { save(fromUrl); return fromUrl; }
  return read() === 'es' ? 'es' : 'en';
}

function translateText(node) {
  const rec = texts.get(node);
  if (rec && node.nodeValue === rec.out) return;
  const source = node.nodeValue;
  const out = translate(source, dict, node.parentElement?.closest('[data-i18n-scope]')?.dataset.i18nScope);
  if (out == null) { texts.delete(node); return; }
  const lead = /^[,.;:!?)]/.test(out) ? '' : source.match(/^\s*/)[0];
  const trail = source.match(/\s*$/)[0];
  const value = lead + out + (source.trim() ? trail : '');
  texts.set(node, { orig: source, out: value });
  node.nodeValue = value;
}

function translateAttrs(el) {
  for (const name of ATTRS) {
    if (!el.hasAttribute(name)) continue;
    const rec = (attrs.get(el) || {})[name];
    const current = el.getAttribute(name);
    if (rec && current === rec.out) continue;
    const out = translate(current, dict);
    if (out == null) continue;
    attrs.set(el, { ...(attrs.get(el) || {}), [name]: { orig: current, out } });
    el.setAttribute(name, out);
  }
}

const META = 'meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]';
const metaRecords = new Map();

function walk(base, fn) {
  const tree = document.createTreeWalker(base, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: n => (n.nodeType === 1 && n.matches(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const nodes = [];
  while (tree.nextNode()) nodes.push(tree.currentNode);
  nodes.forEach(fn);
}

function applyAll(base) {
  if (base.nodeType === 3) { if (!base.parentElement?.closest(SKIP)) translateText(base); return; }
  if (base.nodeType !== 1 || base.closest?.(SKIP)) return;
  translateAttrs(base);
  walk(base, n => (n.nodeType === 3 ? translateText(n) : translateAttrs(n)));
}

function restoreAll() {
  walk(document.body, n => {
    if (n.nodeType === 3) {
      const rec = texts.get(n);
      if (rec && n.nodeValue === rec.out) n.nodeValue = rec.orig;
    } else {
      const rec = attrs.get(n);
      if (rec) for (const [name, r] of Object.entries(rec)) if (n.getAttribute(name) === r.out) n.setAttribute(name, r.orig);
    }
  });
}

function applyHead() {
  if (!metaRecords.has('title')) metaRecords.set('title', document.title);
  const title = translate(metaRecords.get('title'), dict);
  if (title) document.title = title;
  document.querySelectorAll(META).forEach(m => {
    if (!metaRecords.has(m)) metaRecords.set(m, m.content);
    const out = translate(metaRecords.get(m), dict);
    if (out) m.content = out;
  });
}

function restoreHead() {
  if (metaRecords.has('title')) document.title = metaRecords.get('title');
  document.querySelectorAll(META).forEach(m => { if (metaRecords.has(m)) m.content = metaRecords.get(m); });
}

function observe() {
  observer?.disconnect();
  observer = new MutationObserver(records => {
    observer.disconnect();
    for (const r of records) {
      if (r.type === 'characterData') applyAll(r.target);
      else if (r.type === 'attributes') translateAttrs(r.target);
      else r.addedNodes.forEach(applyAll);
    }
    observer.observe(document.body, OPTIONS);
  });
  observer.observe(document.body, OPTIONS);
}
const OPTIONS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };

async function loadDictionary() {
  if (dict) return dict;
  try {
    const res = await fetch('assets/i18n-es.json', { credentials: 'same-origin' });
    dict = buildDictionary((await res.json()).es);
  } catch { dict = new Map(); }
  return dict;
}

function paintButtons() {
  document.querySelectorAll('[data-lang-toggle]').forEach(button => {
    const toEs = lang === 'en';
    button.textContent = toEs ? 'ES' : 'EN';
    button.setAttribute('aria-label', toEs ? 'Cambiar a español' : 'Switch to English');
    button.setAttribute('title', toEs ? 'Español' : 'English');
    button.lang = toEs ? 'es' : 'en';
  });
}

export async function setLang(next) {
  lang = next === 'es' ? 'es' : 'en';
  save(lang);
  if (lang === 'es') {
    await loadDictionary();
    applyHead();
    applyAll(document.body);
    observe();
  } else {
    observer?.disconnect();
    restoreAll();
    restoreHead();
  }
  paintButtons();
  root.lang = lang;
  root.dataset.lang = lang;
  root.classList.add('i18n-ready');
  document.dispatchEvent(new CustomEvent('koa:langchange', { detail: { lang } }));
}

function mountButton() {
  if (document.querySelector('[data-lang-toggle]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lang-toggle';
  button.setAttribute('data-lang-toggle', '');
  button.setAttribute('translate', 'no');
  button.addEventListener('click', () => setLang(lang === 'en' ? 'es' : 'en'));
  const nav = document.querySelector('.nav');
  const bar = document.querySelector('.ticket-header__inner, .legal-header');
  if (nav) nav.append(button);
  else if (bar) bar.append(button);
  else { button.classList.add('lang-toggle--float'); document.body.append(button); }
}

mountButton();
lang = initialLang();
window.KoaI18n = { setLang, get lang() { return lang; } };
setLang(lang);
