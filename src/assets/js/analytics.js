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
  events.forEach(function (name) {
    window.addEventListener(name, load, { once: true, passive: true });
  });

  // Hard stop: never keep analytics out forever for a visitor who only reads.
  window.setTimeout(load, 5000);
})();
