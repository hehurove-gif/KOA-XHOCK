# Informe QA actualizado — XHOCK by KOA /tickets/

**Fecha de la auditoría:** 24 de octubre de 2026
**URL auditada:** https://koa-hub.com/tickets/
**Entregable:** sitio corregido + evidencia + guía de despliegue
**Informe original:** `00-informe-original.md` (22 hallazgos, sin modificar)

---

## 1. Resumen ejecutivo

Se auditaron los 22 hallazgos del informe original contra la página en vivo y se
corrigieron los casos **P1 y P2** que dependen del frontend. El sitio corregido
está en la raíz del paquete (`index.html` + `assets/`) y se entrega como archivos
desplegables, **sin desplegar**.

Resultados principales (Lighthouse 13.5, mismo método antes/después):

| Categoría | Móvil en vivo | Móvil corregido | Escritorio en vivo | Escritorio corregido |
|---|---:|---:|---:|---:|
| Rendimiento | 43 | **90** | 59 | **100** |
| Accesibilidad | 96 | **100** | 96 | **100** |
| Buenas prácticas | 79 | **100** | 78 | **100** |
| SEO | 100 | **100** | 100 | **100** |

- **Peso inicial móvil:** 1,797 KiB → **242 KiB** (−86 %).
- **Terceros en la carga inicial:** 1,599 KiB / 20 peticiones → **107 KiB / 4 peticiones**.
- **TBT móvil:** 3,470 ms → **170 ms** (−95 %; 170–230 ms entre corridas).
- **CLS:** 0.118 en escritorio → **0**; 0.002 en móvil → **0**.
- **FCP móvil:** 3.1 s → **1.8 s**. **LCP móvil:** 5.6 s → **3.1 s** (rango 3.0–3.6 s).
- **LCP escritorio:** 1.8 s → **0.8 s**.

**Lo que sigue abierto y no se puede cerrar solo con frontend:**

1. **Validación real en servidor y creación de la sesión de pago** (QA-008):
   hay una referencia y una checklist, pero el backend de KOA no se modificó.
2. **Textos legales definitivos** (QA-006): las páginas existen y están
   enlazadas, pero son borradores marcados para revisión legal.
3. **Decisiones de negocio:** máximo de boletos (propuesta: 10), rango de edad
   (propuesta: 5–99), precio/impuestos, hoteles y automatización de WhatsApp.
4. **Consentimiento de analítica:** GTM y Meta Pixel se difieren, pero no hay
   banner de consentimiento; debe decidirlo legal.
5. **LCP móvil de 3.0–3.6 s** sigue por encima del objetivo de 2.5 s en
   laboratorio con 4G simulado; se recomienda medir con HTTP/2 y CDN en
   producción y con datos reales (CrUX).

---

## 2. Alcance y método

### 2.1 Qué se revisó

- Página en vivo `https://koa-hub.com/tickets/` (HTML, CSS, JS y red).
- Estado HTTP de `robots.txt`, `sitemap.xml`, `terms` y `privacy`.
- Respuesta de `GET` y `POST` a `api/checkout.php` (solo lectura / payload vacío).
- Los 22 hallazgos del informe original, uno por uno.
- Cinco anchos: **1440, 1024, 768, 390 y 360 px**.
- Navegación con teclado, foco, FAQ, formulario, página de compra y ausencia de JS.

### 2.2 Herramientas

- Lighthouse 13.5 (móvil y escritorio) con Chrome headless.
- Playwright + Chrome para pruebas funcionales y capturas.
- `curl`/PowerShell para cabeceras y códigos HTTP.
- Revisión manual de HTML/CSS/JS y del contraste con los valores calculados.

### 2.3 Línea base

El informe original cita PageSpeed Insights con **FCP 4.6 s** y **NO_LCP**. Para
poder comparar antes/después con el mismo método, se ejecutó Lighthouse 13.5
sobre la página en vivo el mismo día. Esa medición dio **FCP 3.1 s, LCP 5.6 s,
TBT 3,470 ms, CLS 0.002** en móvil y **FCP 1.2 s, LCP 1.8 s, TBT 570 ms,
CLS 0.118** en escritorio. Las diferencias con PSI son normales (red, CPU,
caché y momento de la medición); se usa la medición propia como línea base
comparable.

### 2.4 Limitaciones

- La medición final se hizo contra un servidor local con **HTTP/1.1**, gzip/brotli
  y caché simulados, sin CDN ni HTTP/2. Producción debería mejorar, no empeorar.
- No se ejecutaron pagos reales ni se crearon pedidos.
- No se hizo prueba de penetración ni revisión del backend.
- La accesibilidad se validó con auditorías automáticas y teclado; falta prueba
  con lector de pantalla real (NVDA/VoiceOver).

---

## 3. Comparativa de métricas

### 3.1 Móvil (Lighthouse, 4G simulada)

| Métrica | En vivo | Corregido | Objetivo | Estado |
|---|---:|---:|---:|---|
| Rendimiento | 43 | **90** | ≥ 90 | **Cumple** |
| FCP | 3.1 s | **1.8 s** | ≤ 1.8 s | **Cumple** |
| LCP | 5.6 s | **3.1 s** (3.0–3.6) | ≤ 2.5 s | Mejorado; aún alto |
| TBT | 3,470 ms | **170 ms** | ≤ 200 ms | **Cumple** |
| CLS | 0.002 | **0** | ≤ 0.1 | **Cumple** |
| Peso | 1,797 KiB | **242 KiB** | — | −86 % |
| Terceros | 1,599 KiB | **107 KiB** | — | −93 % |

### 3.2 Escritorio

| Métrica | En vivo | Corregido | Objetivo | Estado |
|---|---:|---:|---:|---|
| Rendimiento | 59 | **100** | ≥ 90 | **Cumple** |
| FCP | 1.2 s | **0.5 s** | ≤ 1.8 s | **Cumple** |
| LCP | 1.8 s | **0.8 s** | ≤ 2.5 s | **Cumple** |
| TBT | 570 ms | **0 ms** | ≤ 200 ms | **Cumple** |
| CLS | 0.118 | **0** | ≤ 0.1 | **Cumple** |

### 3.3 Por qué mejoró

1. **Fuentes autoalojadas** (Manrope y Orbitron en WOFF2) con `preload` y
   `font-display: swap`; se eliminó Google Fonts del camino crítico.
2. **Analítica diferida:** GTM y Meta Pixel ya no bloquean el render; se cargan
   tras la primera interacción o a los 5 s (`assets/js/analytics.js`).
3. **Imágenes responsivas WebP** con `srcset`, `sizes`, dimensiones explícitas,
   `loading="lazy"` bajo el pliegue y `fetchpriority="high"` en el hero.
4. **Sin script de ajuste del H1:** el titular se ajusta con container queries
   CSS; se eliminó el CLS de escritorio.
5. **Animaciones condicionadas a `.js`** y hero visible desde el HTML: el LCP no
   depende de JavaScript.
6. **Menos trabajo en el hilo principal:** cursor nativo, parallax con
   `requestAnimationFrame`, partículas pausadas fuera de pantalla y
   `prefers-reduced-motion`.

---

## 4. Estado de los 22 hallazgos

Leyenda: **Corregido** = implementado y verificado en local; **Mejorado** =
resuelto en parte, con límite conocido; **Parcial** = estructura lista, falta
una decisión o un sistema externo; **No aplica** = la premisa del hallazgo no
se sostiene; **Pendiente** = depende de KOA/backend/legal.

| ID | Prio | Tema | Estado | Qué se hizo / qué falta |
|---|---|---|---|---|
| QA-001 | P1 | Validación de campos | **Corregido (cliente)** | Nombres solo letras/espacio/apóstrofo/guion; edad 5–99; email/teléfono/país; cantidad 1–10; `maxlength`; errores inline. Servidor: ver QA-008. |
| QA-002 | P2 | Validación solo al final | **Corregido** | Validación en `blur`/`input`, `aria-invalid`, `aria-describedby`, resumen y foco en el primer error. |
| QA-003 | P1 | Cantidad sin límite | **Corregido (cliente)** | Clamp duro 1–10, `debounce`, stepper, render acotado; el servidor debe repetir el máximo. |
| QA-004 | P2 | Pérdida de progreso | **Corregido** | Borrador en `sessionStorage` con TTL 24 h, aviso de restauración, botón de borrar y limpieza tras éxito; sin datos de pago. |
| QA-005 | P2 | Scroll largo en móvil | **Corregido** | La compra salió del modal a `tickets.html`: resumen + formulario, resumen sticky en escritorio, apilado en móvil con salto al formulario y CTA al final del card. No se dividió en pasos. |
| QA-006 | P1 | Términos ocultos | **Parcial** | Enlaces reales en la casilla y en el pie; `terms.html` y `privacy.html` publicables. **Contenido pendiente de revisión legal.** |
| QA-007 | P3 | Galería no ampliable | **No aplica** | La página no tiene carrusel: es un collage decorativo sin promesa de lightbox. Se documenta; no se añadió interacción falsa. |
| QA-008 | P1 | Validación en servidor | **Pendiente** | Se añadió `02-despliegue/api/checkout.example.php` como referencia y `VALIDACION_SERVIDOR.md`. El backend real de KOA no se modificó. |
| QA-009 | P2 | Cursor luminoso/desenfoque | **Corregido** | Cursor nativo, sin `blur` en hover, parallax con rAF, desactivado en táctil y con movimiento reducido. |
| QA-010 | P3 | Contraste brusco entre secciones | **No modificado** | Es una decisión de dirección de arte; no impide la tarea. Se documenta como opción de marca. |
| QA-011 | P3 | Precio repetido | **No modificado** | Requiere decisión de contenido de KOA; se documenta. |
| QA-012 | P3 | Tipografía de titulares | **Corregido** | `letter-spacing` corregido, `text-wrap: balance`, contraste del amarillo, container queries y `&nbsp;` para evitar la palabra huérfana. |
| QA-013 | P3 | Tarjetas de valor | **Corregido** | Fecha en una línea, banderas alineadas, alturas y espaciado equilibrados. |
| QA-014 | P3 | Tarjetas flotantes cortadas | **Corregido** | `inset`/`max-width` relativos, sin scroll horizontal en 1440/1024/768/390/360. |
| QA-015 | P3 | Enlaces legales del pie | **Corregido** | Lista `<ul>`, separación, foco visible y destinos reales. |
| QA-016 | P3 | Widget de WhatsApp | **Corregido** | Se eliminó el widget de Dinametra en español; queda un único botón flotante on-brand que abre `wa.me` sin pedir datos. |
| QA-017 | P1 | FCP alto / pantalla en blanco | **Mejorado** | FCP 3.1→1.8 s, LCP 5.6→3.1 s (rango 3.0–3.6), sin pantalla en blanco. Aún por encima de 2.5 s en laboratorio. |
| QA-018 | P2 | NO_LCP | **Corregido (local)** | Lighthouse ya calcula LCP y TBT; el hero es visible sin JS. Re-medir en producción. |
| QA-019 | P2 | Oportunidades de Lighthouse | **Corregido (mayormente)** | WebP/srcset, fuentes locales, analítica diferida, caché en nginx. Queda `intl-tel-input` como tercero (107 KiB). |
| QA-020 | P3 | Accesibilidad 96 | **Corregido** | Contraste de texto naranja y gris corregido; 100/100 en local. Falta prueba con lector de pantalla. |
| QA-021 | P3 | Open Graph / robots / sitemap | **Corregido** | OG/Twitter, canonical, `lang`, JSON-LD, `robots.txt` y `sitemap.xml`. Publicar en la raíz del dominio. |
| QA-022 | P3 | Consultas repetitivas por WhatsApp | **Parcial** | El FAQ ya responde 9 preguntas; hoteles y casos abiertos siguen manuales. Se recomienda WhatsApp Business con respuestas rápidas. |

---

## 5. Detalle de los P1

### QA-001 — Validación de los campos

**Antes:** nombres aceptaban números y símbolos; la edad solo tenía mínimo; no
había mensajes por campo.

**Ahora:**

- `firstName`/`lastName`: letras Unicode, espacio, apóstrofo y guion; 1–50.
- `player name`: 1–60 con la misma regla.
- `age`: entero **5–99** (constantes `AGE_MIN`/`AGE_MAX` en `assets/js/script.js`).
- `email`: formato y longitud; `phone`: validación internacional con
  `intl-tel-input`; `country`: lista ISO.
- `quantity`: entero **1–10**; el valor se recorta antes de renderizar.
- Mensajes inline, `aria-invalid`, `aria-describedby` y foco en el primer error.

**Pendiente:** repetir exactamente las reglas en el servidor (QA-008) y
confirmar con KOA el rango de edad y el máximo de boletos.

### QA-003 — Cantidad de boletos

**Antes:** cualquier valor; con 1000 se generaban 1000 bloques y la página se
bloqueaba.

**Ahora:** `QTY_MAX = 10`, clamp en `input`, `change`, stepper y submit;
`debounce` antes de regenerar los bloques; el render nunca supera 10.

**Pendiente:** el servidor debe rechazar `quantity > 10` aunque el cliente sea
manipulado.

### QA-006 — Términos y privacidad

**Antes:** la casilla no enlazaba a nada y los enlaces del pie eran `href="#"`
con `onclick="return false"`.

**Ahora:**

- La casilla enlaza a `terms.html` y `privacy.html` en pestaña nueva.
- El pie usa una lista de enlaces reales.
- Ambas páginas existen, tienen `canonical`, `lang`, navegación de vuelta y
  fecha de actualización.

**Pendiente:** el contenido es un **borrador en inglés** con marcas
`[KOA to confirm]`; legal debe aprobar entidad, precio, impuestos,
cancelaciones, reembolsos, menores, retención y transferencias.

### QA-008 — Validación en servidor

**Antes:** no verificable; el cliente aceptaba símbolos y la petición podía
interceptarse.

**Ahora:** se entrega `02-despliegue/api/checkout.example.php` como referencia (validación,
límites, método, JSON, idempotencia básica) y `02-despliegue/VALIDACION_SERVIDOR.md`
con 20 casos de prueba.

**Pendiente:** el endpoint real sigue siendo el de KOA. No se desplegó el
ejemplo ni se probó con datos válidos en producción para no crear pedidos.

### QA-017 — FCP y pantalla en blanco

**Antes:** FCP 3.1 s (PSI: 4.6 s), LCP 5.6 s, cuatro cuadros en blanco.

**Ahora:** FCP 1.8 s, LCP 3.1 s (rango 3.0–3.6), sin pantalla en blanco; el hero tiene
`is-visible` en el HTML y las fuentes están autoalojadas.

**Por qué no llega a 2.5 s:** el LCP es el párrafo del hero y su render depende
del intercambio de fuente y del CSS crítico bajo 4G simulado. En producción,
con HTTP/2 y CDN, debería bajar. Recomendación: medir con PSI real y, si sigue
alto, evaluar `font-display: optional` o un subconjunto de fuente.

---

## 6. Detalle de los P2

### QA-002 — Validación en línea

Se valida al salir del campo y al escribir (con debounce), no solo al pulsar el
botón. Al enviar, se muestra un resumen y el foco va al primer campo inválido.
El botón no envía si hay errores.

### QA-004 — Borrador

Se guarda en `sessionStorage` (`koa-xhock-draft`) con TTL de 24 h. Al volver, se
restaura y se muestra un aviso con opción de borrar. No se guardan datos de
pago. Se limpia al completar el pedido.

### QA-005 — Móvil

La compra dejó de ser un modal dentro del landing y ahora vive en `tickets.html`.
En escritorio el resumen queda sticky junto al formulario; por debajo de 980 px
se apila y el resumen ofrece un botón «Fill in my details» que salta al
formulario. El botón de pago va al final del card, sin barras fijas que tapen
contenido. **No** se convirtió en un flujo por pasos: sigue siendo un formulario
único, que era el requisito.

### QA-009 — Cursor y desenfoque

Se eliminó el cursor personalizado y el `blur` de los estados hover. El parallax
usa `requestAnimationFrame` y se desactiva con `prefers-reduced-motion` y en
dispositivos táctiles.

### QA-018 — NO_LCP

La causa probable era el contenido oculto tras animaciones/JS. El hero ya es
visible desde el HTML y las animaciones solo se activan con `.js`. Lighthouse
calcula LCP y TBT en las cuatro corridas locales.

### QA-019 — Peso y caché

- Imágenes: WebP responsivos (480/800/1200/1600) y dimensiones explícitas.
- Fuentes: WOFF2 autoalojadas (36.6 KB en total).
- Analítica: diferida.
- Caché: `nginx-koa.conf` define 30 días para imágenes y 7 días para CSS/JS.
- Pendiente: `intl-tel-input` sigue viniendo de jsDelivr (107 KiB). Se puede
  autoalojar; ya solo se carga en `tickets.html`.

---

## 7. Detalle de los P3

- **QA-007 (galería):** la página no tiene carrusel ni controles; el collage es
  decorativo. Añadir un lightbox sería inventar una función que el diseño no
  promete. Se documenta como no aplica.
- **QA-010 (contraste de secciones):** se mantiene el corte negro/crema. Es una
  decisión de marca; si KOA quiere suavizarlo, se puede añadir un degradado de
  80–160 px.
- **QA-011 (precio repetido):** se mantiene. Requiere decidir si la tarjeta
  «03» muestra otro beneficio; no se inventó contenido.
- **QA-012 (tipografía):** corregido el tracking, el balance de líneas y el
  contraste; se añadió `&nbsp;` para que «An» no quede sola.
- **QA-013/014 (tarjetas):** fecha sin cortes, banderas alineadas y sin
  desbordamiento horizontal en los cinco anchos.
- **QA-015 (enlaces legales):** lista con separación, foco visible y destinos
  reales.
- **QA-016 (WhatsApp):** se eliminó el widget de Dinametra (español, captura de
  datos, estilo ajeno). Queda un botón flotante único que abre `wa.me` con el
  mensaje en inglés, sin pedir datos.
- **QA-020 (accesibilidad):** contraste corregido (`#a34a00` sobre crema,
  `#5f5947` para texto secundario); 100/100 en local. Falta lector de pantalla.
- **QA-021 (SEO):** OG/Twitter, `canonical`, `lang`, JSON-LD `SportsEvent`,
  `robots.txt` y `sitemap.xml`. El `robots.txt` debe publicarse en la raíz del
  dominio.
- **QA-022 (WhatsApp repetitivo):** el FAQ cubre 9 preguntas; hoteles y
  excepciones siguen manuales. Se recomienda configurar WhatsApp Business con
  saludo, respuestas rápidas y menú, y publicar hoteles reales cuando KOA los
  confirme.

---

## 8. Hallazgos nuevos

| ID | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| N-01 | `GET /tickets/api/checkout.php` devolvía `200` con el HTML de la página (fallback de nginx), no `405`. | `curl -sI` en vivo | Corregido en `nginx-koa.conf` (`try_files ... =404` + location PHP); **pendiente de desplegar**. |
| N-02 | `robots.txt`, `sitemap.xml`, `terms` y `privacy` devolvían `404` en vivo. | `curl` en vivo | Archivos creados; **pendiente de publicar**. |
| N-03 | Los enlaces legales del pie eran `href="#"` con `onclick="return false"`. | Código en vivo | Corregido con páginas reales. |
| N-04 | GTM y Meta Pixel bloqueaban el render desde el `<head>`; el widget de Dinametra añadía otro tercero. | Lighthouse / red | GTM y Pixel diferidos; widget eliminado. |
| N-05 | El ajuste del H1 se hacía con JavaScript después de cargar, causando CLS en escritorio. | Lighthouse (CLS 0.118) | Sustituido por container queries CSS. |
| N-06 | Dos rutas de WhatsApp con criterios distintos: widget que pedía datos y enlaces `wa.me` que no. | Código en vivo | Unificado en un solo botón sin captura de datos; KOA debe confirmar. |
| N-07 | El hero y el contenido usaban `opacity:0` hasta que corría el JS, con riesgo de LCP no medible. | Código en vivo | Hero con `is-visible` en HTML; animaciones solo con `.js`. |

---

## 9. Pendientes de KOA

### 9.1 Legal

- Aprobar o reescribir `terms.html` y `privacy.html`.
- Confirmar entidad, domicilio, impuestos, política de cancelación/reembolso,
  tratamiento de menores, retención y transferencias internacionales.
- Decidir si hace falta banner de consentimiento para GTM/Meta Pixel.

### 9.2 Backend / pagos

- Revisar el endpoint real con `VALIDACION_SERVIDOR.md`.
- Confirmar máximo de boletos (10) y rango de edad (5–99).
- Garantizar precio calculado en servidor, idempotencia y webhook firmado.
- Autorizar una compra real de prueba con reembolso antes del lanzamiento.

### 9.3 Contenido / operación

- Confirmar hoteles y tarifas reales (QA-022).
- Decidir si se mantiene la repetición de precio (QA-011).
- Decidir si se suaviza el corte negro/crema (QA-010).
- Configurar WhatsApp Business con respuestas rápidas.

### 9.4 Infraestructura

- Publicar `robots.txt` en `https://koa-hub.com/robots.txt`.
- Activar HTTP/2 o HTTP/3, brotli y caché según `nginx-koa.conf`.
- Re-medir Lighthouse/PSI en producción y guardar los informes.

---

## 10. Evidencia

```
01-informe/EVIDENCIA/
├── capturas-antes/        live-1440/1024/768/390/360.png
├── capturas-despues/      despues-*.png (landing)
│                          tickets-*.png (página de compra)
│                          sin-js-390.png, sin-js-tickets-390.png
│                          resultados.json, post-mock.txt
└── lighthouse/            informes JSON + HTML antes/después
```

- `resultados.json`: salida de la suite funcional (35/35).
- `post-mock.txt`: cuerpo del `POST` simulado con cantidad y jugadores.
- `capturas-despues/`: estado final, con animaciones desactivadas para que la
  captura sea determinista.

La suite funcional cubre:

- Sin scroll horizontal ni errores de consola en el landing y en `tickets.html`,
  en los cinco anchos.
- Todas las imágenes cargan en ambas páginas; hero visible sin esperar animación.
- Los cinco CTAs del landing enlazan a `tickets.html` y no queda modal en el DOM.
- Cursor nativo sobre tarjetas, FAQ y controles (ya no hay `cursor:none`).
- FAQ con `aria-expanded` e `inert` sincronizados.
- `tickets.html` tiene formulario, precio y resumen, sin modal.
- Cantidad 1000 → 10; stepper sincroniza jugadores.
- Validación inline, nombre con números y edad 1 rechazados.
- Borrador restaurado tras recargar la página de compra.
- `POST` con `quantity` y jugadores.
- Sin JS: 0 elementos ocultos en ambas páginas.

---

## 11. Recomendaciones siguientes

1. **Desplegar primero en staging** y ejecutar `CHECKLIST_DESPLIEGUE.md`.
2. **Cerrar QA-008** con el backend real antes de la campaña.
3. **Aprobar legal** antes de publicar los documentos; si no, dejar los enlaces
   en staging y no en producción.
4. **Medir en producción** con PSI y CrUX; el laboratorio local no sustituye
   datos reales.
5. **Autoalojar `intl-tel-input`** para bajar los 107 KiB de terceros; ya solo se
   carga en `tickets.html`.
6. **Evaluar un flujo por pasos** en `tickets.html` (contacto → jugadores → pago)
   si la analítica muestra abandono en móvil.
7. **Configurar WhatsApp Business** para reducir consultas repetitivas.

La lectura de diseño completa, con las mejoras de conversión sugeridas (total
del pedido, CTA móvil persistente, acordeón por jugador), está en
`01-informe/REVISION_DISENO.md`.

---

## 12. Conclusión

Los problemas que dependían del frontend están corregidos y verificados: el
sitio es más rápido, accesible, claro en la validación, resistente a cantidades
absurdas, con documentos legales enlazados y sin el widget ajeno. El riesgo
restante está en **servidor, legal y decisiones de negocio**, no en el HTML/CSS/JS
entregado.

Con el backend validado y los textos aprobados, el sitio queda en condiciones de
publicarse. Sin esos dos cierres, QA-008 y QA-006 deben considerarse abiertos
aunque la experiencia de cliente ya esté resuelta.
