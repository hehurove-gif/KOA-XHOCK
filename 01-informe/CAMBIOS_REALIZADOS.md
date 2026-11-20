# Cambios realizados — sitio corregido

Todo el trabajo del sitio está en la raíz del paquete (`index.html`,
`tickets.html`, `terms.html`, `privacy.html`, `robots.txt`, `sitemap.xml` y
`assets/`). El informe original (`00-informe-original.md`, dentro de
`01-informe/`) no se modificó.

---

## 1. Resumen de archivos

| Archivo | Antes | Ahora | Nota |
|---|---:|---:|---|
| `index.html` | ~44 KB | 37.2 KB | Reestructurado: head, hero, FAQ, footer y CTAs a `tickets.html`. |
| `tickets.html` | — | 13.3 KB | Nuevo: página independiente de compra. |
| `assets/css/styles.css` | ~68 KB | 88.6 KB | Bloques de corrección al final (tokens, formulario, página de tickets, legal, print, container queries). |
| `assets/js/script.js` | ~34 KB | 40.4 KB | Validación, cantidad, borrador, envío y soporte de la página de tickets. |
| `assets/js/analytics.js` | — | 2.2 KB | Nuevo: GTM + Meta Pixel diferidos. |
| `terms.html` | — | 9.5 KB | Nuevo: borrador de términos. |
| `privacy.html` | — | 9.0 KB | Nuevo: borrador de privacidad. |
| `robots.txt` | — | 278 B | Nuevo. |
| `sitemap.xml` | — | 612 B | Nuevo. |
| `02-despliegue/api/checkout.example.php` | — | 10.1 KB | Referencia de validación; **no desplegar tal cual**. |
| `assets/` | Unsplash/Google Fonts | local | WebP responsivos, logos, favicon y WOFF2. |

---

## 2. `index.html`

### 2.1 `<head>`

- `lang="en"` y `meta viewport` conservados.
- **Añadido:** `canonical`, Open Graph (`og:*`), Twitter Card, `theme-color`,
  JSON-LD `SportsEvent` con fecha, sede y oferta.
- **Eliminado:** Google Fonts (preconnect + stylesheet) y las etiquetas de GTM/
  Pixel que bloqueaban el render.
- **Añadido:** `preload` de Orbitron, Manrope y la imagen del hero (con
  `imagesrcset` y `fetchpriority="high"`).
- **Añadido:** `assets/js/analytics.js` con `defer`; `assets/js/script.js` con `defer`.
- **Movido:** `intl-tel-input` (CSS y JS) a `tickets.html`, la única página que
  tiene campo de teléfono.
- **Añadido:** script inline mínimo que marca `.js` antes del primer paint
  (progressive enhancement).

### 2.2 Cuerpo

- **Skip link** al inicio y `<main id="top" tabindex="-1">`.
- **Noscript:** aviso de que el checkout requiere JS y enlace directo a WhatsApp.
- **Nav:** `aria-controls="primaryNav"`, `aria-expanded`, botón de menú con
  etiqueta dinámica.
- **Hero:** `is-visible` en badge, subtítulo, acciones y prueba social; el
  titular no depende de JS. Imágenes locales con `srcset`, `sizes`, `width`,
  `height`, `loading` y `fetchpriority`.
- **Banderas:** SVG inline (Canadá, EE. UU., México) en lugar de emojis.
- **Badge de fecha:** formato corto «Oct 29 – Nov 1» para no partir la línea.
- **Sección de valor:** tarjetas con fecha en una línea, banderas alineadas y
  contenido sin espacios vacíos.
- **FAQ:** `<h3>` dentro de `<button>`, `aria-expanded`, `aria-controls`,
  paneles `role="region"` y `inert` gestionado por JS.
- **Pie:** columna legal como `<ul>` con enlaces reales a `terms.html` y
  `privacy.html`; año y aviso de marcas.
- **Compra:** los CTAs del nav, hero, precio, CTA final y pie enlazan a
  `tickets.html`. Ya no hay modal en el landing.
- **WhatsApp:** un único botón flotante con `wa.me` y mensaje en inglés; se
  eliminó el widget de Dinametra.
- **Pie:** se eliminó el crédito «Developed by Dinametra»; queda solo el aviso
  de copyright.
- **Eliminado:** el modal que se abría solo al final de la página y el script
  que ajustaba el H1 después de cargar.

---

## 3. `assets/css/styles.css`

Se conservó la base y se añadieron bloques numerados al final para no romper la
estética existente:

1. **Fuentes autoalojadas** (`@font-face` de Manrope y Orbitron variables).
2. **Tokens de contraste:** `--color-muted:#5f5947`,
   `--color-secondary-ink:#a34a00`, `--color-focus`.
3. **Cursor nativo** y `:focus-visible` claro.
4. **Revelados progresivos** condicionados a `.js`; sin JS todo es visible.
5. **Titulares:** tracking, `text-wrap: balance`, contraste del acento.
6. **Tarjetas de valor y fecha:** `white-space: nowrap`, banderas, logos.
7. **Botones y CTA:** scrim para legibilidad sobre foto.
8. **Pie legal:** lista, separación y área táctil.
9. **FAQ accesible:** transición `0fr/1fr`, sin `inert` en el HTML.
10. **Formulario de compra:** card con cabecera, cuerpo y pie; se reutiliza en
    `tickets.html`.
11. **Stepper y errores:** estados, mensajes y foco.
12. **Aviso de borrador** y botón de limpiar.
13. **WhatsApp flotante** on-brand.
14. **Print styles.**
15. **Páginas legales** (tipografía, TOC, callout).
16. **Container queries del H1:** `font-size: min(5.8rem, 11.1cqw)`; elimina el
    script de ajuste y el CLS.
17. **Banderas SVG** y espaciado del bloque de jugadores.
18. **Ajustes finales** de responsive y overflow.
19. **Página de tickets independiente:** layout de resumen + formulario, cabecera
    propia, pie, checkbox y leyenda del fieldset. Cursor nativo en todo el sitio.

También se corrigió el naranja de texto sobre fondos claros (de `#ff7f19` a
`#a34a00`) y el gris secundario, que eran los dos fallos de contraste de
Lighthouse.

---

## 4. `assets/js/script.js`

Reescritura completa manteniendo la atribución de campaña y los efectos
visuales, pero con límites y accesibilidad:

### 4.1 Constantes

```js
const QTY_MIN = 1;
const QTY_MAX = 10;
const AGE_MIN = 5;
const AGE_MAX = 99;
const DRAFT_KEY = 'koa-xhock-draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const CHECKOUT_TIMEOUT_MS = 20000;
```

### 4.2 Formulario

- Validación en `blur`/`input` con `debounce`, no solo al enviar.
- Reglas: nombres, apellidos, jugador, edad, email, teléfono, país, cantidad,
  términos y número de jugadores.
- `aria-invalid` y `aria-describedby`; resumen y foco en el primer error.
- Honeypot (`company`) y comprobación de tiempo mínimo.
- `fetch` con `AbortController` y timeout de 20 s.
- Redirección solo a URLs `https://checkout.stripe.com` (o la URL permitida).
- Limpieza del borrador tras éxito.

### 4.3 Cantidad

- Clamp duro 1–10 en `input`, `change`, stepper y submit.
- `debounce` antes de regenerar los bloques de jugador.
- Stepper `−`/`+` sincronizado con el campo.
- Ya no se renderizan 1000 bloques por pulsación.

### 4.4 Borrador

- Guarda en `sessionStorage` con marca de tiempo.
- Restaura al abrir `tickets.html` y muestra un aviso con opción de borrar.
- Caduca a las 24 h.
- No guarda datos de pago.

### 4.5 Página de tickets

- `tickets.html` contiene únicamente el resumen de compra y el formulario.
- Resumen sticky en escritorio; en móvil se apila y ofrece un salto al formulario.
- Foco inicial y validación inline; al enviar, el foco va al primer error.
- Si se vuelve de Stripe con `?checkout=error|cancelled`, el aviso aparece en la
  misma página (ya no se abre un modal).
- `Esc` y trampa de foco se conservan solo como compatibilidad si algún día se
  reutiliza el modal; en la página no hay modal.

### 4.6 Animaciones y rendimiento

- `IntersectionObserver` para revelados; `is-settled` desactiva transiciones.
- Parallax con `requestAnimationFrame` y `translate3d`.
- Partículas pausadas cuando el hero no está visible.
- Respeta `prefers-reduced-motion` y `(pointer:fine)`.
- Menú móvil con `aria-expanded` y cierre al navegar.

### 4.7 Atribución

- Conserva UTMs, `gclid`, `fbclid` y referrer con TTL de 90 días.
- Se envían con el `POST` del checkout.

---

## 5. `assets/js/analytics.js` (nuevo)

- GTM (`GTM-PPGNTDHR`) y Meta Pixel (`1026403033730229`) se inyectan **después**
  de la primera interacción (`pointerdown`, `keydown`, `touchstart`, `scroll`) o
  a los 5 s.
- Los `<noscript>` de ambos siguen en `index.html`.
- No implementa consentimiento explícito: es una decisión legal pendiente.

---

## 6. Páginas legales

### `terms.html`

- 11 secciones: quién es KOA, qué incluye el boleto, registro/edad, precio e
  impuestos, cambios/cancelaciones, conducta/riesgo, imagen, propiedad
  intelectual, responsabilidad, ley aplicable y contacto.
- Callout visible: **Draft for KOA legal review**.
- Marcas `[KOA to confirm]` en entidad, domicilio, impuestos, reembolsos,
  seguro, menores y ley aplicable.
- `canonical`, `lang`, TOC y enlace de vuelta.

### `privacy.html`

- 10 secciones: responsable, datos, finalidades, bases legales, terceros,
  cookies/almacenamiento/retención, derechos, menores, seguridad y cambios.
- Refleja lo que el sitio recoge hoy (formulario, borrador en `sessionStorage`,
  GTM, Meta Pixel, Stripe, WhatsApp).
- Callout y marcas `[KOA to confirm]`.

**No son asesoría legal.** Deben revisarse antes de publicarse.

---

## 7. SEO e infraestructura

- `robots.txt`: permite todo, bloquea `/api/`, declara el sitemap. **Debe
  publicarse en la raíz del dominio**, no solo en `/tickets/`.
- `sitemap.xml`: página principal, términos y privacidad, con `lastmod`.
- `02-despliegue/api/checkout.example.php`: referencia de validación en
  servidor; no crea sesiones reales ni sustituye al endpoint de KOA.

---

## 8. Assets

- **Imágenes:** `hockey-hero` (480/800/1200/1600), `team-ice` (480/800/1200),
  `hockey-detail` (480/800), `team-action` (480), en WebP.
- **Open Graph:** `og-xhock.jpg` 1200×630.
- **Logos:** `Logo-negativo.png`, `Logo-isotipo-negativo.png`,
  `happi-arena.webp` (y PNG de respaldo).
- **Favicon:** `favicon.png`.
- **Fuentes:** `Manrope-variable-latin.woff2` (24.8 KB) y
  `Orbitron-variable-latin.woff2` (11.8 KB), autoalojadas.
- **Limpieza:** se eliminó `team-action-800.webp` (109 KB) porque ninguna
  página lo referenciaba. Se conserva `happi-arena.png` como *fallback* del
  `<picture>` para navegadores sin WebP.

---

## 9. Qué se eliminó

- Google Fonts (CSS y preconnect).
- GTM y Meta Pixel del `<head>` (ahora diferidos).
- Widget de Dinametra en español con captura de nombre/email/teléfono.
- Modal de auto-apertura al final de la página.
- Crédito «Developed by Dinametra» del pie.
- Reglas `cursor:none` que ocultaban el puntero sobre tarjetas y FAQ.
- Script que ajustaba el tamaño del H1 después de cargar.
- Efecto de cursor personalizado y `blur` en hover.
- Enlaces legales `href="#"` con `onclick="return false"`.

---

## 10. Qué **no** se tocó

- El backend real de KOA ni el endpoint de producción.
- El precio ($175 USD) ni la pasarela de pago.
- La copia local antigua (`koa-2-landings-correcciones-finales-main/`), que no
  representa producción.
- El informe original.
- La decisión de marca sobre el corte negro/crema y la repetición del precio.
