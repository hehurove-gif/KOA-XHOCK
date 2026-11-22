/* ==========================================================================
   KOA XHOCK — deferred analytics loader
   GTM and the Meta Pixel are injected only after the first real interaction
   (or 5 s after load). This keeps them out of the critical path: on mobile
   they were responsible for most of the ~2.9 s of blocked main thread
   (QA-017 / QA-019).

   The noscript fallbacks stay in index.html, so visitors without JavaScript
   are still counted by both platforms.
   ========================================================================== */
(function () {
  'use strict';

  // Los IDs vienen del HTML (src/_data/cms/site.json) para que no haya que tocar código.
  var tag = document.currentScript || {};
  var data = tag.dataset || {};
  var GTM_ID = data.gtm || '';
  var META_PIXEL_ID = data.pixel || '';
  var loaded = false;

  function loadMetaPixel() {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function loadGtm() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(script);
  }

  var MODE = data.consent === 'auto' ? 'auto' : 'banner';
  var KEY = 'koa_analytics_consent';

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* sin almacenamiento: se pregunta de nuevo */ }
  }

  function load() {
    if (loaded) return;
    loaded = true;
    if (GTM_ID) loadGtm();
    if (META_PIXEL_ID) loadMetaPixel();
    events.forEach(function (name) {
      window.removeEventListener(name, load);
    });
  }

  var events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  function loadAfterInteraction() {
    events.forEach(function (name) {
      window.addEventListener(name, load, { once: true, passive: true });
    });
    // Hard stop: never keep analytics out forever for a visitor who only reads.
    window.setTimeout(load, 5000);
  }

  // ---- Banner de consentimiento (modo "banner"): nada de GTM/Pixel hasta que el visitante acepte ----
  function injectStyles() {
    if (document.getElementById('koa-consent-css')) return;
    var css = document.createElement('style');
    css.id = 'koa-consent-css';
    css.textContent =
      '.koa-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;' +
      'background:#11110f;color:#fff;border:1px solid #ebe266;border-radius:12px;padding:16px;font:14px/1.5 system-ui,sans-serif;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.4)}' +
      '.koa-consent p{margin:0 0 12px}.koa-consent a{color:#ebe266}' +
      '.koa-consent__row{display:flex;gap:8px;flex-wrap:wrap}' +
      '.koa-consent button{flex:1 1 140px;min-height:44px;border-radius:8px;border:2px solid #ebe266;font:600 14px system-ui,sans-serif;cursor:pointer}' +
      '.koa-consent__yes{background:#ebe266;color:#050505}.koa-consent__no{background:transparent;color:#ebe266}' +
      '.koa-consent button:focus-visible{outline:3px solid #fff;outline-offset:2px}';
    document.head.appendChild(css);
  }

  function closeBanner() {
    var el = document.getElementById('koa-consent');
    if (el) el.remove();
  }

  function decide(value) {
    store(value);
    closeBanner();
    if (value === 'granted') load();
    else if (loaded) window.location.reload(); // retirar scripts ya cargados
  }

  function showBanner() {
    if (document.getElementById('koa-consent')) return;
    injectStyles();
    var box = document.createElement('div');
    box.id = 'koa-consent';
    box.className = 'koa-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookie preferences');
    box.innerHTML =
      '<p>We use Google Analytics and the Meta Pixel to measure visits and ads. They only load if you accept. ' +
      '<a href="privacy.html#storage">Privacy policy</a></p>' +
      '<div class="koa-consent__row"><button type="button" class="koa-consent__yes">Accept</button>' +
      '<button type="button" class="koa-consent__no">Reject</button></div>';
    box.querySelector('.koa-consent__yes').addEventListener('click', function () { decide('granted'); });
    box.querySelector('.koa-consent__no').addEventListener('click', function () { decide('denied'); });
    document.body.appendChild(box);
  }

  if (MODE === 'auto') {
    loadAfterInteraction();
  } else {
    var choice = stored();
    if (choice === 'granted') loadAfterInteraction();
    else if (choice !== 'denied') showBanner();
    document.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('[data-cookie-settings]')) showBanner();
    });
  }
})();
