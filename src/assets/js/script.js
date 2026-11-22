/* ==========================================================================
   KOA XHOCK — tickets page
   QA 2026-10 rewrite: hard quantity limit, inline validation, draft autosave,
   accessible modal (focus trap + inert background) and lighter animations.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Limits (single source of truth) ---------- */
  const QTY_MIN = 1;
  const QTY_MAX = 10;
  const AGE_MIN = 5;
  const AGE_MAX = 99;
  const DRAFT_KEY = 'koa-xhock-draft';
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const CHECKOUT_TIMEOUT_MS = 20000;

  const doc = document.documentElement;
  const body = document.body;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointerFine = window.matchMedia('(pointer:fine)').matches;

  // Assigned once the draft section is defined; a no-op keeps the quantity
  // initialisation below free of temporal-dead-zone surprises.
  let queueDraftSave = () => {};

  const clampInt = (value, min, max, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  };

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ======================================================================
     1. Scroll UI: progress bar, compact nav and parallax (rAF throttled)
     ====================================================================== */
  const nav = $('.nav');
  const progress = $('.scroll-progress');
  const parallaxItems = $$('[data-parallax], [data-parallax-bg], [data-parallax-soft]');
  let scrollFrame = 0;

  function updateScrollUi() {
    scrollFrame = 0;
    const max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);

    if (reduceMotion || !pointerFine || !parallaxItems.length) return;
    const vh = window.innerHeight;
    parallaxItems.forEach(item => {
      const rect = item.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > vh + 120) return;
      const viewProgress = Math.min(Math.max((vh - rect.top) / (vh + rect.height), 0), 1);
      if (item.hasAttribute('data-parallax')) {
        item.style.transform = `translate3d(0, ${(viewProgress - .5) * 22}px, 0)`;
      } else if (item.hasAttribute('data-parallax-bg')) {
        const img = item.querySelector('img');
        if (img) img.style.transform = `translate3d(0, ${(viewProgress - .5) * 48}px, 0) scale(1.06)`;
      } else {
        const img = item.querySelector('img');
        if (img) img.style.transform = `translate3d(0, ${(viewProgress - .5) * 24}px, 0) scale(1.06)`;
      }
    });
  }

  function requestScrollUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollUi);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  updateScrollUi();

  /* ======================================================================
     2. Entrance animations + counters (IntersectionObserver)
     ====================================================================== */
  const revealEls = $$('.fade-up, .reveal');
  const counterEls = $$('.counter');

  function settle(el) {
    el.classList.add('is-visible');
    el.classList.add('is-settled');
  }

  function animateCounter(el) {
    if (el.dataset.animated === 'true') return;
    el.dataset.animated = 'true';
    const end = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = `${end}${suffix}`; return; }
    const duration = 1100;
    const started = performance.now();
    const formatter = new Intl.NumberFormat('en-US');
    function tick(now) {
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${formatter.format(Math.round(eased * end))}${suffix}`;
      if (t < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        settle(entry.target);
        if (entry.target.classList.contains('counter')) animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    revealEls.forEach(el => {
      if (el.classList.contains('is-visible')) return;
      observer.observe(el);
    });
    counterEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(settle);
    counterEls.forEach(animateCounter);
  }

  // Safety net: anything still hidden after load gets shown (print, odd
  // browsers, or a section that never crosses the observer threshold).
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      revealEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) settle(el);
      });
    }, 400);
  });

  /* ======================================================================
     3. Mobile navigation
     ====================================================================== */
  const navToggle = $('.nav__toggle');
  const navLinks = $('#primaryNav');

  function setMenu(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      setMenu(!nav.classList.contains('menu-open'));
    });
    $$('a', navLinks || nav).forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('menu-open')) {
        setMenu(false);
        navToggle.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!nav.classList.contains('menu-open')) return;
      if (nav.contains(event.target)) return;
      setMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 780) setMenu(false);
    }, { passive: true });
  }

  /* ======================================================================
     4. Pointer effects (desktop only, never on reduced motion)
     ====================================================================== */
  if (pointerFine && !reduceMotion) {
    $$('.btn').forEach(btn => {
      btn.addEventListener('pointermove', event => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--x', `${event.clientX - rect.left}px`);
        btn.style.setProperty('--y', `${event.clientY - rect.top}px`);
      });
    });

    $$('.magnetic:not(.btn)').forEach(el => {
      el.addEventListener('pointermove', event => {
        const rect = el.getBoundingClientRect();
        const mx = (event.clientX - rect.left - rect.width / 2) / rect.width;
        const my = (event.clientY - rect.top - rect.height / 2) / rect.height;
        el.style.transform = `translate(${mx * 8}px, ${my * 8}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.tilt-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.transform = `perspective(1100px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ======================================================================
     5. Particle canvases: paused when off-screen or on a hidden tab
     ====================================================================== */
  function initParticles(canvas) {
    if (reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const colors = ['rgba(235,226,102,.62)', 'rgba(255,127,25,.42)', 'rgba(226,6,19,.34)', 'rgba(255,255,255,.24)'];
    const state = { particles: [], width: 0, height: 0, dpr: Math.min(window.devicePixelRatio || 1, 1.5) };
    let running = false;
    let frame = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      state.width = Math.max(1, rect.width);
      state.height = Math.max(1, rect.height);
      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      const base = canvas.dataset.particles === 'hero' ? 42 : 22;
      const count = Math.round(base * Math.min(state.width / 1200, 1.2));
      state.particles = Array.from({ length: count }, () => ({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        r: Math.random() * 2 + 0.6,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        color: colors[Math.floor(Math.random() * colors.length)],
        line: Math.random() > 0.75
      }));
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, state.width, state.height);
      state.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -12) p.x = state.width + 12;
        if (p.x > state.width + 12) p.x = -12;
        if (p.y < -12) p.y = state.height + 12;
        if (p.y > state.height + 12) p.y = -12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        if (!p.line) return;
        for (let j = i + 1; j < state.particles.length; j += 1) {
          const q = state.particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= 110) continue;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(235,226,102,${0.07 * (1 - dist / 110)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      frame = window.requestAnimationFrame(draw);
    }

    function start() {
      if (running || document.hidden) return;
      running = true;
      frame = window.requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(frame);
    }

    resize();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries.forEach(entry => (entry.isIntersecting ? start() : stop()));
      }, { threshold: 0 }).observe(canvas);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    window.addEventListener('resize', debounce(resize, 200), { passive: true });
  }

  $$('.particle-canvas').forEach(initParticles);

  /* ======================================================================
     6. FAQ accordion (ARIA + inert collapsed panels)
     ====================================================================== */
  $$('[data-accordion]').forEach(accordion => {
    const items = $$('.faq-item', accordion);

    function setItem(item, open) {
      const button = $('button', item);
      const panel = $('.faq-panel', item);
      item.classList.toggle('active', open);
      if (button) button.setAttribute('aria-expanded', String(open));
      if (panel) panel.inert = !open;
    }

    items.forEach(item => {
      const button = $('button', item);
      setItem(item, item.classList.contains('active'));
      if (!button) return;
      button.addEventListener('click', () => {
        setItem(item, !item.classList.contains('active'));
      });
    });
  });

  /* ======================================================================
     7. Image fallback
     ====================================================================== */
  $$('img').forEach(img => {
    const applyFallback = () => {
      const parent = img.closest('figure, .visual-card__media, .phone-card, .context__media, .method__mini-grid, .cta-banner__media');
      if (parent) parent.classList.add('image-fallback');
      img.style.opacity = '0';
    };
    img.addEventListener('error', applyFallback, { once: true });
    if (img.complete && img.naturalWidth === 0) applyFallback();
  });

  /* ======================================================================
     8. Ticket form: the checkout lives on tickets.html
     ======================================================================
     The form used to open in a modal on index.html. It is now a standalone
     page, so every helper below is a no-op on the landing page and the modal
     code only runs if an old modal is ever present. */
  const ticketModal = $('#ticketModal');
  const ticketForm = $('#ticketForm');
  const ticketQty = $('#tmQty');
  const playersContainer = $('#tmPlayers');
  const modalBody = $('#ticketFormBody') || $('#ticketModalBody');
  const errorBox = $('#tmError');
  const submitButton = ticketForm ? $('button[type="submit"]', ticketForm) : null;
  const submitLabel = submitButton ? $('.tm-submit__label', submitButton) : null;
  const inertTargets = $$('.nav, main, .footer, .wa-float, .skip-link');
  let lastFocused = null;
  let submitting = false;
  let checkoutStarted = false;

  const playerPositions = ['Goalie', 'Left Wing', 'Right Wing', 'Left Defense', 'Right Defense', 'Center'];
  const jerseySizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  function focusableIn(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
  }

  function setBackgroundInert(inert) {
    inertTargets.forEach(el => { el.inert = inert; });
  }

  function openTicketModal() {
    if (!ticketModal || ticketModal.classList.contains('is-open')) return;
    lastFocused = document.activeElement;
    ticketModal.classList.add('is-open');
    ticketModal.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
    setBackgroundInert(true);
    const target = $('#tmFirstName') || $('.ticket-modal__close', ticketModal);
    window.setTimeout(() => target && target.focus(), 40);
  }

  function closeTicketModal() {
    if (!ticketModal || !ticketModal.classList.contains('is-open')) return;
    ticketModal.classList.remove('is-open');
    ticketModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
    setBackgroundInert(false);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  if (ticketModal) {
    $$('[data-modal-close]', ticketModal).forEach(el => el.addEventListener('click', closeTicketModal));

    document.addEventListener('keydown', event => {
      if (!ticketModal.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTicketModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = focusableIn(ticketModal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ======================================================================
     9. Player fields + hard quantity limit (QA-003)
     ====================================================================== */
  let renderedQuantity = 0;

  function collectPlayerDrafts() {
    if (!playersContainer) return [];
    return $$('[data-player-index]', playersContainer).map(card => ({
      name: $('[data-player-field="name"]', card)?.value || '',
      age: $('[data-player-field="age"]', card)?.value || '',
      position: $('[data-player-field="position"]', card)?.value || '',
      jerseySize: $('[data-player-field="jerseySize"]', card)?.value || ''
    }));
  }

  function playerFieldMarkup(number, index) {
    return `
      <fieldset class="tm-player" data-player-index="${index}">
        <legend>Player ${number}</legend>
        <div class="tm-grid">
          <div class="tm-field">
            <label for="tmPlayerName${number}">Player name</label>
            <input id="tmPlayerName${number}" name="players[${index}][name]" data-player-field="name" type="text" placeholder="e.g. Maria Gonzalez" autocomplete="off" maxlength="60" required aria-describedby="err-tmPlayerName${number}" />
            <p class="tm-field__error" id="err-tmPlayerName${number}" hidden></p>
          </div>
          <div class="tm-field">
            <label for="tmPlayerAge${number}">Age</label>
            <input id="tmPlayerAge${number}" name="players[${index}][age]" data-player-field="age" type="number" min="${AGE_MIN}" max="${AGE_MAX}" step="1" inputmode="numeric" placeholder="e.g. 18" required aria-describedby="err-tmPlayerAge${number}" />
            <p class="tm-field__error" id="err-tmPlayerAge${number}" hidden></p>
          </div>
        </div>
        <div class="tm-grid tm-grid--player-last">
          <div class="tm-field">
            <label for="tmPlayerPosition${number}">Player position</label>
            <select id="tmPlayerPosition${number}" name="players[${index}][position]" data-player-field="position" required aria-describedby="err-tmPlayerPosition${number}">
              <option value="" disabled selected>Select position</option>
              ${playerPositions.map(position => `<option value="${position}">${position}</option>`).join('')}
            </select>
            <p class="tm-field__error" id="err-tmPlayerPosition${number}" hidden></p>
          </div>
          <div class="tm-field">
            <label for="tmPlayerJersey${number}">Jersey size</label>
            <select id="tmPlayerJersey${number}" name="players[${index}][jerseySize]" data-player-field="jerseySize" required aria-describedby="err-tmPlayerJersey${number}">
              <option value="" disabled selected>Select jersey size</option>
              ${jerseySizes.map(size => `<option value="${size}">${size}</option>`).join('')}
            </select>
            <p class="tm-field__error" id="err-tmPlayerJersey${number}" hidden></p>
          </div>
        </div>
      </fieldset>`;
  }

  function renderPlayerFields(quantity) {
    if (!playersContainer) return;
    const drafts = collectPlayerDrafts();
    playersContainer.innerHTML = '';
    for (let index = 0; index < quantity; index += 1) {
      playersContainer.insertAdjacentHTML('beforeend', playerFieldMarkup(index + 1, index));
      const card = playersContainer.lastElementChild;
      const draft = drafts[index];
      if (!draft) continue;
      const name = $('[data-player-field="name"]', card);
      const age = $('[data-player-field="age"]', card);
      const position = $('[data-player-field="position"]', card);
      const jersey = $('[data-player-field="jerseySize"]', card);
      if (name) name.value = draft.name;
      if (age) age.value = draft.age;
      if (position) position.value = draft.position;
      if (jersey) jersey.value = draft.jerseySize;
    }
    renderedQuantity = quantity;
  }

  function updateStepperState() {
    if (!ticketQty) return;
    const value = clampInt(ticketQty.value, QTY_MIN, QTY_MAX, QTY_MIN);
    $$('.tm-stepper__btn').forEach(button => {
      const step = Number(button.dataset.qtyStep);
      button.disabled = (step < 0 && value <= QTY_MIN) || (step > 0 && value >= QTY_MAX);
    });
  }

  function applyQuantity(next, { rerender = true } = {}) {
    if (!ticketQty) return;
    const quantity = clampInt(next, QTY_MIN, QTY_MAX, QTY_MIN);
    if (ticketQty.value !== String(quantity)) ticketQty.value = String(quantity);
    updateStepperState();
    if (rerender && quantity !== renderedQuantity) renderPlayerFields(quantity);
    if (rerender) { queueDraftSave(); window.setTimeout(() => { if (typeof updateTotal === 'function') updateTotal(); }, 0); }
  }

  /* ----- Total del pedido (mismo cálculo que el servidor: assets/js/pricing.js) ----- */
  const totalBox = $('#tmTotal');
  let pricingModule = null;
  let pricingConfig = null;
  try { pricingConfig = JSON.parse(ticketForm?.dataset.pricing || 'null'); } catch (e) { pricingConfig = null; }

  function formatMoney(cents, currency) {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100); }
    catch (e) { return (cents / 100).toFixed(2) + ' ' + currency.toUpperCase(); }
  }

  function updateTotal() {
    if (!totalBox || !pricingModule || !pricingConfig || !ticketForm) return;
    const pricing = pricingModule.buildPricing(pricingConfig);
    const ages = $$('[data-player-field="age"]', ticketForm).map(input => Number.parseInt(input.value, 10));
    const count = Math.max(1, ages.length);
    const players = Array.from({ length: count }, (_, i) => ({ age: Number.isFinite(ages[i]) ? ages[i] : NaN }));
    // Con edad aún sin escribir se muestra el precio de adulto, como estimación.
    const order = pricingModule.priceOrder(players.map(p => ({ age: Number.isFinite(p.age) ? p.age : 999 })), pricing);
    const mixed = order.lines.length > 1 || order.lines[0].tier !== 'adult';
    const detail = mixed
      ? order.lines.map(l => l.quantity + ' × ' + formatMoney(l.unitAmount, pricing.currency) + ' (' + pricingModule.TIER_LABELS[l.tier].replace('Player Ticket — ', '').toLowerCase() + ')').join(' + ')
      : '';
    totalBox.textContent = '';
    totalBox.append('Order total: ' + formatMoney(order.total, pricing.currency));
    if (detail) { const small = document.createElement('small'); small.textContent = detail; totalBox.appendChild(small); }
    totalBox.hidden = false;
  }

  if (totalBox && pricingConfig) {
    import('./pricing.js').then(module => { pricingModule = module; updateTotal(); }).catch(() => { /* sin total en vivo; el servidor cobra igual */ });
    ticketForm.addEventListener('input', updateTotal);
    ticketForm.addEventListener('change', updateTotal);
  }

  if (ticketQty && playersContainer) {
    applyQuantity(ticketQty.value || QTY_MIN);
    const clampAndRender = debounce(() => applyQuantity(ticketQty.value), 300);

    ticketQty.addEventListener('input', () => {
      const raw = Number.parseInt(ticketQty.value, 10);
      // A typed 1000 must never reach the renderer: clamp before the debounce.
      if (Number.isFinite(raw) && raw > QTY_MAX) {
        ticketQty.value = String(QTY_MAX);
        applyQuantity(QTY_MAX);
        return;
      }
      updateStepperState();
      clampAndRender();
    });

    ticketQty.addEventListener('change', () => applyQuantity(ticketQty.value));
    ticketQty.addEventListener('blur', () => applyQuantity(ticketQty.value));

    $$('.tm-stepper__btn').forEach(button => {
      button.addEventListener('click', () => {
        const step = Number(button.dataset.qtyStep);
        const current = clampInt(ticketQty.value, QTY_MIN, QTY_MAX, QTY_MIN);
        applyQuantity(current + step);
        ticketQty.focus();
      });
    });
  }

  /* ======================================================================
     10. Phone field (intl-tel-input, optional)
     ====================================================================== */
  const phoneInput = $('#tmPhone');
  const countrySelect = $('#tmCountry');
  let phoneIti = null;

  function initPhoneField() {
    if (!phoneInput || typeof window.intlTelInput !== 'function') return null;
    phoneInput.name = 'phone_national';

    const dropdownHost = document.createElement('div');
    dropdownHost.className = 'tm-iti-host';
    document.body.appendChild(dropdownHost);

    const instance = window.intlTelInput(phoneInput, {
      initialCountry: 'mx',
      separateDialCode: true,
      countryOrder: ['us', 'ca', 'mx'],
      dropdownContainer: dropdownHost,
      hiddenInput: () => ({ phone: 'phone', country: 'country_code' }),
      loadUtils: () => import('../vendor/intl-tel-input/js/utils.js')
    });

    phoneInput.addEventListener('countrychange', () => {
      const iso2 = (instance.getSelectedCountryData().iso2 || '').toLowerCase();
      const map = { us: 'United States', ca: 'Canada', mx: 'Mexico' };
      if (countrySelect && map[iso2]) countrySelect.value = map[iso2];
    });

    return instance;
  }

  phoneIti = initPhoneField();

  function phoneValue() {
    if (!phoneInput) return '';
    if (!phoneIti) return phoneInput.value.trim();
    return phoneIti.getNumber() || phoneInput.value.trim();
  }

  function setPhoneValue(value) {
    if (!phoneInput || !value) return;
    if (!phoneIti) { phoneInput.value = value; return; }
    try { phoneIti.setNumber(value); } catch (error) { phoneInput.value = value; }
  }

  // intl-tel-input fills its hidden inputs from its own submit listener, and
  // listener order against ours is not guaranteed — so write them explicitly.
  function syncPhoneFields() {
    if (!phoneIti || !ticketForm) return;
    const number = ticketForm.querySelector('input[type="hidden"][name="phone"]');
    const code = ticketForm.querySelector('input[type="hidden"][name="country_code"]');
    if (number) number.value = phoneValue();
    if (code) code.value = (phoneIti.getSelectedCountryData().iso2 || '').toUpperCase();
  }

  if (countrySelect && phoneIti) {
    countrySelect.addEventListener('change', () => {
      const map = { Canada: 'ca', 'United States': 'us', Mexico: 'mx' };
      const iso2 = map[countrySelect.value];
      if (iso2) phoneIti.setCountry(iso2);
    });
  }

  /* ======================================================================
     11. Inline validation (QA-001, QA-002)
     ====================================================================== */
  const NAME_PATTERN = /^\p{L}[\p{L}\p{M}'’.\- ]*$/u;

  function nameError(value, label) {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (!clean) return `Please enter your ${label}.`;
    if (clean.length < 2) return `The ${label} must have at least 2 characters.`;
    if (clean.length > 60) return `The ${label} is too long (60 characters max).`;
    if (!NAME_PATTERN.test(clean)) return `The ${label} can only contain letters, spaces, apostrophes and hyphens.`;
    return '';
  }

  function emailError(value) {
    const clean = value.trim();
    if (!clean) return 'Please enter your email address.';
    if (clean.length > 254) return 'The email address is too long.';
    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(clean)) return 'Enter a valid email address, e.g. name@email.com.';
    return '';
  }

  function phoneError(value) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 'Please enter your phone number.';
    if (digits.length < 8) return 'The phone number is too short (at least 8 digits).';
    if (digits.length > 15) return 'The phone number is too long (15 digits max).';
    return '';
  }

  function ageError(value) {
    if (String(value).trim() === '') return 'Please enter the player age.';
    const age = Number.parseInt(value, 10);
    if (!Number.isFinite(age)) return 'Enter the age as a whole number.';
    if (age < AGE_MIN || age > AGE_MAX) return `The age must be between ${AGE_MIN} and ${AGE_MAX}.`;
    return '';
  }

  const fieldRules = {
    tmFirstName: value => nameError(value, 'first name'),
    tmLastName: value => nameError(value, 'last name'),
    tmEmail: emailError,
    tmPhone: phoneError,
    tmCountry: value => (value ? '' : 'Please select your country.'),
    tmQty: value => {
      const quantity = Number.parseInt(value, 10);
      if (!Number.isFinite(quantity)) return 'Enter the number of tickets.';
      if (quantity < QTY_MIN || quantity > QTY_MAX) return `You can buy between ${QTY_MIN} and ${QTY_MAX} tickets per order.`;
      return '';
    },
    tmTerms: (value, input) => (input.checked ? '' : 'Please accept the Terms & Conditions and the Privacy Policy.')
  };

  function errorElementFor(input) {
    const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/);
    for (const id of describedBy) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('tm-field__error')) return el;
    }
    return null;
  }

  function setFieldError(input, message) {
    const errorEl = errorElementFor(input);
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
    }
    return !message;
  }

  function validateField(input) {
    if (!input || !input.id) return true;
    const rule = fieldRules[input.id];
    if (!rule) {
      if (input.dataset.playerField === 'name') return setFieldError(input, nameError(input.value, 'player name'));
      if (input.dataset.playerField === 'age') return setFieldError(input, ageError(input.value));
      if (input.dataset.playerField) return setFieldError(input, input.value ? '' : 'This field is required.');
      return true;
    }
    return setFieldError(input, rule(input.value, input));
  }

  function validateForm() {
    if (!ticketForm) return true;
    const fields = $$('input, select', ticketForm).filter(input => input.type !== 'hidden' && input.type !== 'checkbox');
    const checkbox = $('#tmTerms');
    let firstInvalid = null;

    fields.forEach(input => {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (checkbox && !validateField(checkbox) && !firstInvalid) firstInvalid = checkbox;

    if (firstInvalid) {
      showFormError('Please review the highlighted fields.');
      firstInvalid.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      window.setTimeout(() => firstInvalid.focus({ preventScroll: true }), reduceMotion ? 0 : 220);
      return false;
    }
    clearFormError();
    return true;
  }

  function showFormError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearFormError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  if (ticketForm) {
    const liveFields = $$('input, select', ticketForm).filter(input => input.type !== 'hidden');

    liveFields.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
        queueDraftSave();
      });
      input.addEventListener('change', () => {
        validateField(input);
        queueDraftSave();
      });
    });
  }

  /* ======================================================================
     12. Draft autosave / restore (QA-004)
     ====================================================================== */
  function readDraft() {
    if (!ticketForm) return null;
    const values = Object.fromEntries(new FormData(ticketForm).entries());
    return {
      firstName: values.firstName || '',
      lastName: values.lastName || '',
      email: values.email || '',
      phone: phoneValue(),
      country: values.country || '',
      quantity: clampInt(values.quantity, QTY_MIN, QTY_MAX, QTY_MIN),
      players: collectPlayerDrafts(),
      savedAt: Date.now()
    };
  }

  function saveDraftNow() {
    const draft = readDraft();
    if (!draft) return;
    try { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (error) { /* private mode */ }
  }

  queueDraftSave = debounce(saveDraftNow, 500);

  function readStoredDraft() {
    let draft = null;
    try { draft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (error) { return null; }
    if (!draft || typeof draft !== 'object') return null;
    if (Date.now() - (draft.savedAt || 0) > DRAFT_TTL_MS) {
      try { window.sessionStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
      return null;
    }
    return draft;
  }

  function clearDraft() {
    try { window.sessionStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
  }

  let draftNotice = null;

  function showDraftNotice() {
    if (draftNotice || !ticketForm || !modalBody) return;
    draftNotice = document.createElement('div');
    draftNotice.className = 'tm-draft-note';
    draftNotice.setAttribute('role', 'status');
    draftNotice.innerHTML = '<span>We restored the details you entered earlier.</span> <button type="button" class="tm-draft-note__clear">Clear details</button>';
    modalBody.insertBefore(draftNotice, modalBody.firstChild);
    $('.tm-draft-note__clear', draftNotice).addEventListener('click', () => {
      ticketForm.reset();
      applyQuantity(QTY_MIN);
      clearDraft();
      draftNotice.remove();
      draftNotice = null;
      $('#tmFirstName')?.focus();
    });
  }

  function restoreDraft(draft) {
    if (!draft || !ticketForm) return false;
    ['firstName', 'lastName', 'email', 'country'].forEach(name => {
      const input = ticketForm.querySelector(`[name="${name}"]`);
      if (input && draft[name]) input.value = draft[name];
    });
    if (draft.phone) setPhoneValue(draft.phone);
    if (draft.quantity) {
      ticketQty.value = String(clampInt(draft.quantity, QTY_MIN, QTY_MAX, QTY_MIN));
      renderPlayerFields(clampInt(draft.quantity, QTY_MIN, QTY_MAX, QTY_MIN));
      updateStepperState();
    }
    (draft.players || []).forEach((player, index) => {
      const card = playersContainer?.querySelector(`[data-player-index="${index}"]`);
      if (!card) return;
      Object.entries(player).forEach(([field, value]) => {
        const input = card.querySelector(`[data-player-field="${field}"]`);
        if (input && value) input.value = value;
      });
    });
    showDraftNotice();
    return true;
  }

  /* ======================================================================
     13. Campaign attribution (UTMs + click IDs)
     ====================================================================== */
  const ATTRIBUTION_KEY = 'koa-xhock-attribution';
  const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
  const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid', 'twclid', 'li_fat_id', 'epik', 'irclickid', 'sccid', 'dclid', 'yclid'];
  const ATTRIBUTION_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS];
  let attributionMemory = null;

  function readAttributionStore() {
    for (const store of [window.localStorage, window.sessionStorage]) {
      try {
        const raw = store.getItem(ATTRIBUTION_KEY);
        if (raw) return JSON.parse(raw);
      } catch (error) { /* privacy mode or corrupt value */ }
    }
    return attributionMemory;
  }

  function writeAttributionStore(record) {
    attributionMemory = record;
    const raw = JSON.stringify(record);
    for (const store of [window.localStorage, window.sessionStorage]) {
      try { store.setItem(ATTRIBUTION_KEY, raw); return; } catch (error) { /* next store */ }
    }
  }

  function paramsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    ATTRIBUTION_KEYS.forEach(key => {
      const value = (params.get(key) || '').trim();
      if (value) found[key] = value.slice(0, 120);
    });
    return found;
  }

  function externalReferrer() {
    const referrer = document.referrer || '';
    if (!referrer) return '';
    try {
      if (new URL(referrer).hostname === window.location.hostname) return '';
    } catch (error) { return ''; }
    return referrer.slice(0, 300);
  }

  function syncAttribution() {
    const now = Date.now();
    let record = readAttributionStore();
    if (record && now - (record.lastSeenAt || 0) > ATTRIBUTION_TTL_MS) record = null;

    const found = paramsFromUrl();
    const utms = {};
    const ids = {};
    Object.entries(found).forEach(([key, value]) => {
      (UTM_KEYS.includes(key) ? utms : ids)[key] = value;
    });
    const referrer = externalReferrer();
    const hasFreshUtm = Object.keys(utms).length > 0;

    if (!record) {
      record = {
        version: 1,
        first: utms,
        firstSeen: new Date(now).toISOString(),
        landingPage: (window.location.origin + window.location.pathname).slice(0, 300),
        referrer,
        last: utms,
        ids: {},
        lastSeenAt: now
      };
    } else if (hasFreshUtm) {
      record.last = utms;
      if (!record.first || Object.keys(record.first).length === 0) record.first = utms;
    }

    record.ids = { ...(record.ids || {}), ...ids };
    if (referrer && !record.referrer) record.referrer = referrer;
    record.lastSeenAt = now;
    record.lastSeen = new Date(now).toISOString();

    writeAttributionStore(record);
    return record;
  }

  function attributionFields() {
    const record = syncAttribution();
    const fields = { ...(record.last || {}), ...(record.ids || {}) };
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(key => {
      const value = (record.first || {})[key];
      if (value) fields[`first_${key}`] = value;
    });
    if (record.landingPage) fields.landing_page = record.landingPage;
    if (record.referrer) fields.attribution_referrer = record.referrer;
    if (record.firstSeen) fields.first_seen = record.firstSeen;
    if (record.lastSeen) fields.last_seen = record.lastSeen;
    return fields;
  }

  function applyAttributionToForm() {
    if (!ticketForm) return;
    const host = ticketForm.querySelector('[data-attribution-fields]') || ticketForm;
    const fields = attributionFields();
    const names = new Set([
      ...ATTRIBUTION_KEYS,
      'first_utm_source', 'first_utm_medium', 'first_utm_campaign',
      'landing_page', 'attribution_referrer', 'first_seen', 'last_seen'
    ]);

    names.forEach(name => {
      const value = fields[name] || '';
      let input = ticketForm.querySelector(`input[type="hidden"][name="${name}"]`);
      if (!input) {
        if (!value) return;
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        host.appendChild(input);
      }
      input.value = value;
    });
  }

  syncAttribution();
  applyAttributionToForm();

  /* ======================================================================
     14. Submit → api/checkout.php → Stripe Checkout
     ====================================================================== */
  function setSubmitting(state) {
    submitting = state;
    if (!submitButton) return;
    submitButton.disabled = state;
    submitButton.setAttribute('aria-busy', String(state));
    if (submitLabel) submitLabel.textContent = state ? 'Redirecting to payment…' : 'Continue to Payment';
  }

  function safeRedirect(url) {
    try {
      const parsed = new URL(url, window.location.href);
      // Solo se acepta la página de pago de Stripe (o el mismo sitio, para pruebas).
      const sameSite = parsed.origin === window.location.origin;
      const stripe = parsed.protocol === 'https:' && /(^|\.)stripe\.com$/.test(parsed.hostname);
      if (!sameSite && !stripe) return false;
      window.location.assign(parsed.href);
      return true;
    } catch (error) {
      return false;
    }
  }

  if (ticketForm) {
    ticketForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitting) return;
      if (!validateForm()) return;

      clearFormError();
      // intl-tel-input necesita sus utilidades para formatear con lada; si tardan, se envía lo escrito.
      if (phoneIti && phoneIti.promise) {
        await Promise.race([phoneIti.promise.catch(() => {}), new Promise(resolve => window.setTimeout(resolve, 2500))]);
      }
      syncPhoneFields();
      applyAttributionToForm();
      saveDraftNow();
      setSubmitting(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);

      try {
        const response = await fetch(ticketForm.action, {
          method: 'POST',
          body: new FormData(ticketForm),
          headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' },
          signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.url) {
          throw new Error(data.error || 'We could not reach the payment provider. Please try again.');
        }
        checkoutStarted = true;
        clearDraft();
        if (!safeRedirect(data.url)) {
          checkoutStarted = false;
          throw new Error('The payment link is not valid. Please try again or contact KOA on WhatsApp.');
        }
      } catch (error) {
        setSubmitting(false);
        // El token de Turnstile es de un solo uso: se pide uno nuevo tras cualquier fallo.
        if (window.turnstile && typeof window.turnstile.reset === 'function') window.turnstile.reset();
        if (error.name === 'AbortError') {
          showFormError('The payment provider is taking too long to respond. Please try again.');
        } else {
          showFormError(error.message || 'Something went wrong. Please try again.');
        }
        if (errorBox) errorBox.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      } finally {
        window.clearTimeout(timeout);
      }
    });
  }

  /* ======================================================================
     15. Boot: restore draft and handle the return from Stripe
     ====================================================================== */
  (function boot() {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('checkout');
    const storedDraft = readStoredDraft();

    if (storedDraft) restoreDraft(storedDraft);

    if (!state) return;
    if (state === 'error') {
      openTicketModal();
      // El motivo viene de la URL: solo se muestran mensajes conocidos, nunca texto libre.
      const reasons = {
        closed: 'Ticket sales are closed.',
        invalid: 'Some of your details were not accepted. Please review the form and try again.',
        unavailable: 'The payment provider is not available right now. Please try again in a few minutes.'
      };
      showFormError(reasons[params.get('reason')] || 'We could not start the checkout. Please try again.');
    } else if (state === 'cancelled') {
      openTicketModal();
      showFormError('Your checkout was cancelled — nothing was charged. Your details are still here when you are ready.');
    }
    // On the standalone page there is no modal: bring the error into view so
    // the visitor is not left at the top of a long form.
    if (!ticketModal && errorBox) {
      errorBox.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    // Drop the query string so a refresh does not show the error again.
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  })();

  // Keep the draft fresh even if the visitor never touches the form again,
  // but never resurrect it after a successful redirect to Stripe.
  window.addEventListener('pagehide', () => {
    if (!checkoutStarted) saveDraftNow();
  });
})();
