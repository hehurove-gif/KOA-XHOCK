# Verificación — resultados y cómo reproducirlos

**Fecha:** 28 de octubre de 2026
**Sitio verificado:** `index.html` (raíz del paquete) servido en local
**Navegador:** Google Chrome (headless) vía Playwright
**Lighthouse:** 13.5

---

## 1. Entorno de prueba

| Elemento | Valor |
|---|---|
| Servidor estático | `python -m http.server 8099` y un servidor Node con gzip/brotli en `:8100` |
| Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Playwright | `playwright-core` (Node) |
| Anchos | 1440×900, 1024×768, 768×1024, 390×844, 360×800 |
| Red Lighthouse | Móvil: 4G simulada / CPU 4×; escritorio: preset desktop |

El servidor Node (`03-herramientas/serve.js`) imita las cabeceras de producción:
gzip/brotli, `Cache-Control`, tipos MIME y cabeceras de seguridad. Se usó para
Lighthouse; el servidor Python se usó para las capturas y la suite funcional.

---

## 2. Suite funcional (Playwright)

**Resultado: 35/35.**

| # | Comprobación | Resultado |
|---|---|---|
| 1–20 | Sin scroll horizontal y sin errores de consola en el landing y en `tickets.html` (1440/1024/768/390/360) | PASS |
| 21 | Todas las imágenes del landing cargan | PASS |
| 22 | Hero visible sin esperar animación (`opacity=1`) | PASS |
| 23 | Los 5 CTAs enlazan a `tickets.html` y no queda modal en el DOM | PASS |
| 24 | Cursor nativo sobre tarjetas y FAQ (ya no hay `cursor:none`) | PASS |
| 25 | FAQ sincroniza `aria-expanded` e `inert` | PASS |
| 26 | El CTA de navegación abre la página de tickets | PASS |
| 27 | `tickets.html` tiene formulario, precio y no tiene modal | PASS |
| 28 | Todas las imágenes de la página de tickets cargan | PASS |
| 29 | Cantidad 1000 se limita a 10 (10 bloques) | PASS |
| 30 | Stepper resta y sincroniza jugadores | PASS |
| 31 | Validación inline bloquea envío vacío y enfoca el primer error | PASS |
| 32 | Nombre con números se rechaza | PASS |
| 33 | Edad 1 se rechaza | PASS |
| 34 | Borrador se restaura tras recargar en `tickets.html` | PASS |
| 35 | `POST` incluye `quantity` y jugadores | PASS |

Salida completa: `01-informe/EVIDENCIA/capturas-despues/resultados.json`.
Cuerpo del `POST` simulado: `post-mock.txt`.

### 2.1 Sin JavaScript

- Se cargaron el landing y `tickets.html` con `javaScriptEnabled: false` a 390 px.
- **0** elementos `.fade-up`/`.reveal` con `opacity: 0`.
- El contenido, el FAQ (abierto por defecto), el formulario de contacto y el pie
  son legibles; el aviso sin JS explica cómo comprar por WhatsApp.
- Capturas: `capturas-despues/sin-js-390.png` y `sin-js-tickets-390.png`.

### 2.2 Qué no cubre la suite

- Pago real con Stripe.
- Envío real a Zapier/CRM.
- Lector de pantalla (NVDA/VoiceOver).
- Safari/iOS real.
- Rate limiting del servidor.

---

## 3. Lighthouse

### 3.1 Móvil

| Métrica | En vivo | Corregido | Δ |
|---|---:|---:|---:|
| Rendimiento | 43 | **90** | +47 |
| Accesibilidad | 96 | **100** | +4 |
| Buenas prácticas | 79 | **100** | +21 |
| SEO | 100 | **100** | 0 |
| FCP | 3.1 s | **1.8 s** | −1.3 s |
| LCP | 5.6 s | **3.1 s** (3.0–3.6) | −2.0 a −2.6 s |
| TBT | 3,470 ms | **170 ms** | −3,300 ms |
| CLS | 0.002 | **0** | −0.002 |
| Peso | 1,797 KiB | **242 KiB** | −86 % |

### 3.2 Escritorio

| Métrica | En vivo | Corregido | Δ |
|---|---:|---:|---:|
| Rendimiento | 59 | **100** | +41 |
| Accesibilidad | 96 | **100** | +4 |
| Buenas prácticas | 78 | **100** | +22 |
| SEO | 100 | **100** | 0 |
| FCP | 1.2 s | **0.5 s** | −0.7 s |
| LCP | 1.8 s | **0.8 s** | −1.0 s |
| TBT | 570 ms | **0 ms** | −570 ms |
| CLS | 0.118 | **0** | −0.118 |

### 3.3 Fallos de accesibilidad corregidos

Antes (móvil y escritorio): `color-contrast`.

- `#ff7f19` sobre crema = **2.44:1** (mínimo 4.5:1).
- `#76705d` sobre crema = **4.0:1** (mínimo 4.5:1).
- Elementos afectados: `.step-card__num`, `.stat-card__label`, `.eyebrow`,
  enlaces de acento, iconos.

Ahora:

- `--color-secondary-ink: #a34a00` → **5.3:1**.
- `--color-muted: #5f5947` → **6.0:1**.
- Lighthouse: **100/100** en ambos factores.

### 3.4 Nota sobre LCP móvil

El LCP es el párrafo del hero. En laboratorio con 4G simulada tarda 3.0–3.6 s;
el objetivo de 2.5 s no se alcanza. Causas: intercambio de fuente y CSS crítico
bajo throttling. En producción, con HTTP/2/3 y CDN, debería mejorar. Se
recomienda medir con PSI real y, si sigue alto, evaluar `font-display: optional`
o un subconjunto de Manrope.

### 3.5 Variación entre corridas

El rendimiento móvil osciló entre **85 y 90**, el LCP entre **3.0 y 3.6 s** y el
TBT entre **170 y 230 ms** en corridas consecutivas. Es normal en Lighthouse con
throttling simulado. Los informes guardados corresponden a la última corrida,
hecha sobre `http://127.0.0.1:8100/tickets/`.

---

## 4. Capturas

Se capturaron cinco anchos en estado final:

| Archivo | Ancho | Altura |
|---|---:|---:|
| `capturas-despues/despues-1440.png` | 1440 | completa |
| `despues-1024.png` | 1024 | completa |
| `despues-768.png` | 768 | completa |
| `despues-390.png` | 390 | completa |
| `despues-360.png` | 360 | completa |

La página de compra se capturó en los mismos cinco anchos
(`tickets-1440/1024/768/390/360.png`).

También:

- `sin-js-390.png` y `sin-js-tickets-390.png`: sin JavaScript.
- `capturas-antes/live-*.png`: línea base en vivo.

**Método:** se recorrió la página para cargar imágenes `lazy`, se forzó
`.is-visible` en los elementos animados y se capturó con
`animations: 'disabled'`. Así se evita que una captura a mitad de transición
parezca “vacía”.

---

## 5. Comprobaciones manuales

- [x] Sin scroll horizontal en los cinco anchos
  (`scrollWidth === clientWidth`).
- [x] Sin errores de consola.
- [x] Todas las imágenes responden y tienen `alt`.
- [x] Hero legible y H1 en 5 líneas sin recortes a 1440.
- [x] Banderas SVG visibles.
- [x] Fecha «Oct 29 – Nov 1» en una línea.
- [x] Compra en `tickets.html`, con resumen de precio y formulario completo.
- [x] Cursor nativo visible sobre secciones blancas y tarjetas.
- [x] Pie sin el crédito «Developed by Dinametra».
- [x] FAQ con teclado.
- [x] Enlaces legales abren páginas reales.
- [x] WhatsApp flotante único.
- [x] Sin JS el contenido sigue visible.
- [x] `node --check` en `script.js` y `analytics.js`.
- [x] HTML parseado sin IDs duplicados en `index.html`, `tickets.html`,
  `terms.html` y `privacy.html`.

---

## 6. Comprobaciones de código

```bash
node --check assets/js/script.js
node --check assets/js/analytics.js
```

- [x] Ambos pasan.
- [ ] `php -l 02-despliegue/api/checkout.example.php`: **no ejecutado** (PHP no instalado en
  el equipo de auditoría). Revisar en staging.

---

## 7. Cómo reproducir

### 7.1 Servir el sitio

```bash
# Opción simple (sin compresión). Desde la raíz del paquete (donde está index.html)
python -m http.server 8099

# Opción con gzip/brotli y caché (para Lighthouse)
node 03-herramientas/serve.js
# → http://127.0.0.1:8100/tickets/   (también responde en /)
```

### 7.2 Suite funcional

```bash
cd 03-herramientas
npm install playwright-core   # si no está instalado
node test-site.js
```

Requiere Chrome en `C:\Program Files\Google\Chrome\Application\chrome.exe`.
Ajustar la constante `CHROME` si está en otra ruta.

### 7.3 Capturas

```bash
node shots.js
```

### 7.4 Lighthouse

```bash
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
npx lighthouse http://127.0.0.1:8100/tickets/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html \
  --output-path=./lh-local-mobile \
  --chrome-flags="--headless=new --no-sandbox"

npx lighthouse http://127.0.0.1:8100/tickets/ --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html \
  --output-path=./lh-local-desktop \
  --chrome-flags="--headless=new --no-sandbox"
```

---

## 8. Limitaciones conocidas

1. **HTTP/1.1 local**, sin CDN ni HTTP/2; producción puede variar.
2. **Sin backend real**: el `POST` se mockeó; no se creó ningún pedido.
3. **Sin lector de pantalla** ni Safari/iOS real.
4. **Sin consentimiento de analítica**: GTM/Pixel se difieren, pero no hay
   banner.
5. **`intl-tel-input` desde CDN**: 107 KiB de terceros en la carga inicial.
6. **PHP sin lintar** en este equipo.
7. **Textos legales sin aprobar**: son borradores.

---

## 9. Evidencia archivada

```
01-informe/EVIDENCIA/
├── capturas-antes/       live-*.png
├── capturas-despues/     despues-*.png, tickets-*.png,
│                         sin-js-*.png, resultados.json, post-mock.txt
└── lighthouse/           lh-live-mobile/desktop, lh-local-mobile/desktop
                          (JSON + HTML)
```

Los informes Lighthouse se copiaron desde el entorno de pruebas y se conservan
sin editar.
