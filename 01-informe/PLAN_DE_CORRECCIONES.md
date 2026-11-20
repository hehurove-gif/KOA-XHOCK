# Plan de correcciones — XHOCK /tickets/

Plan priorizado para cerrar los 22 hallazgos del informe original y los nuevos.
La columna **Estado** refleja lo entregado en la raíz del paquete
(`index.html` + `assets/`).

---

## Fase 0 — Contención (hecho)

| # | Acción | Estado |
|---|---|---|
| 0.1 | Descargar la página en vivo y usarla como línea base (no la copia local antigua). | Hecho |
| 0.2 | Medir Lighthouse móvil/escritorio y capturar los cinco anchos. | Hecho |
| 0.3 | Confirmar códigos HTTP de legal, robots, sitemap y checkout. | Hecho |
| 0.4 | No crear pedidos ni pagos reales durante la auditoría. | Hecho |

---

## Fase 1 — P1 (bloqueantes de publicación)

| # | Hallazgo | Acción | Responsable | Esfuerzo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| 1.1 | QA-001 | Validación de nombres, edad, email, teléfono, país y cantidad en cliente. | Frontend | M | Campos inválidos bloquean el envío con mensaje y foco. | **Hecho** |
| 1.2 | QA-001 | Repetir reglas en servidor. | Backend KOA | M | `POST` inválido → 422; sin datos corruptos. | **Pendiente** |
| 1.3 | QA-003 | Clamp 1–10, stepper y debounce. | Frontend | S | `1000` se convierte en `10` sin bloquear. | **Hecho** |
| 1.4 | QA-003 | Límite de cantidad en servidor. | Backend KOA | S | `quantity > 10` → 422. | **Pendiente** |
| 1.5 | QA-006 | Enlazar términos/privacidad desde la casilla y el pie. | Frontend | S | Los enlaces abren documentos reales sin perder el formulario. | **Hecho** |
| 1.6 | QA-006 | Redactar y aprobar los textos legales. | Legal KOA | L | Documentos firmados, con entidad y fecha. | **Pendiente** |
| 1.7 | QA-008 | Revisar endpoint real, parametrización y límites. | Backend KOA | L | Checklist de 20 casos en verde. | **Pendiente** |
| 1.8 | QA-017 | Quitar bloqueos: fuentes locales, analítica diferida, hero visible, imágenes WebP. | Frontend | L | FCP ≤ 2.5 s y LCP ≤ 3.5 s en laboratorio; sin pantalla en blanco. | **Hecho / mejorado** |
| 1.9 | QA-017 | Medir en producción con HTTP/2 y CDN. | Infra KOA | S | PSI móvil ≥ 80 y LCP real monitorizado. | **Pendiente** |

---

## Fase 2 — P2 (experiencia y robustez)

| # | Hallazgo | Acción | Responsable | Esfuerzo | Criterio | Estado |
|---|---|---|---|---|---|---|
| 2.1 | QA-002 | Validación en `blur`/`input`, `aria-invalid`, resumen y foco. | Frontend | M | El usuario ve el error junto al campo antes de enviar. | **Hecho** |
| 2.2 | QA-004 | Borrador en `sessionStorage` 24 h + aviso + limpieza. | Frontend | M | Recargar no pierde datos; el pago no se guarda. | **Hecho** |
| 2.3 | QA-005 | Compra en página propia (`tickets.html`): resumen + formulario, sticky en escritorio, salto al formulario en móvil. | Frontend | M | Flujo usable a 390/360 sin confusión. | **Hecho** |
| 2.4 | QA-005 | Evaluar flujo por pasos (contacto → jugadores → pago) dentro de `tickets.html`. | Producto/Frontend | L | Si hay abandono, dividir con indicador de progreso. | **Opcional** |
| 2.5 | QA-009 | Cursor nativo, sin blur, rAF, reduced motion. | Frontend | S | Hover legible y sin consumo excesivo. | **Hecho** |
| 2.6 | QA-018 | Garantizar LCP medible y hero sin JS. | Frontend | S | Lighthouse calcula LCP/TBT. | **Hecho** |
| 2.7 | QA-019 | WebP/srcset, fuentes locales, caché, analítica diferida. | Frontend/Infra | L | Peso inicial < 400 KiB. | **Hecho** |
| 2.8 | QA-019 | Autoalojar o diferir `intl-tel-input`. | Frontend | M | Terceros iniciales < 20 KiB. | **Pendiente** |

---

## Fase 3 — P3 (calidad y contenido)

| # | Hallazgo | Acción | Responsable | Esfuerzo | Criterio | Estado |
|---|---|---|---|---|---|---|
| 3.1 | QA-007 | Documentar que el collage es decorativo (no hay carrusel). | Diseño | S | Sin controles falsos. | **Hecho** |
| 3.2 | QA-010 | Evaluar transición negro/crema. | Diseño | S | Decisión de marca documentada. | **Pendiente (marca)** |
| 3.3 | QA-011 | Decidir si se repite el precio. | Contenido KOA | S | Una sola propuesta de precio o beneficio distinto. | **Pendiente (contenido)** |
| 3.4 | QA-012 | Tracking, balance, contraste y palabra huérfana. | Frontend | S | Títulos legibles en los cinco anchos. | **Hecho** |
| 3.5 | QA-013/014 | Tarjetas equilibradas y sin recortes. | Frontend | S | Sin scroll horizontal; fecha en una línea. | **Hecho** |
| 3.6 | QA-015 | Lista legal con separación y foco. | Frontend | S | Enlaces distinguibles y área táctil ≥ 24 px. | **Hecho** |
| 3.7 | QA-016 | Un solo WhatsApp on-brand sin captura de datos. | Frontend | S | Sin widget ajeno ni doble flujo. | **Hecho** |
| 3.8 | QA-020 | Contraste y foco; auditoría automática. | Frontend | S | 100/100 en Lighthouse. | **Hecho** |
| 3.9 | QA-020 | Prueba con NVDA/VoiceOver. | QA | M | Flujo completo con lector de pantalla. | **Pendiente** |
| 3.10 | QA-021 | OG/Twitter, canonical, lang, JSON-LD, robots, sitemap. | Frontend | S | Validadores sin errores; archivos publicados. | **Hecho** |
| 3.11 | QA-022 | FAQ + WhatsApp Business con respuestas rápidas. | Operación KOA | M | Menos consultas manuales; hoteles publicados. | **Parcial** |

---

## Fase 4 — Nuevos hallazgos

| # | Acción | Responsable | Estado |
|---|---|---|---|
| 4.1 | N-01: `try_files` sin fallback a HTML y location PHP explícita. | Infra | **Hecho en config; pendiente de desplegar** |
| 4.2 | N-02: publicar `robots.txt` en la raíz y `sitemap.xml` en `/tickets/`. | Infra | **Pendiente de desplegar** |
| 4.3 | N-03: reemplazar `href="#"` por páginas reales. | Frontend | **Hecho** |
| 4.4 | N-04: diferir GTM/Pixel y eliminar Dinametra. | Frontend | **Hecho** |
| 4.5 | N-05: sustituir el ajuste JS del H1 por container queries. | Frontend | **Hecho** |
| 4.6 | N-06: unificar WhatsApp y confirmar con KOA. | Frontend/Operación | **Hecho / confirmar** |
| 4.7 | N-07: hero visible sin JS. | Frontend | **Hecho** |

---

## Orden de ejecución recomendado

1. **Staging:** subir los archivos del sitio (raíz del paquete) y aplicar
   `nginx-koa.conf`.
2. **Legal:** aprobar `terms.html` y `privacy.html` (o mantenerlos fuera de producción).
3. **Backend:** ejecutar `VALIDACION_SERVIDOR.md` y corregir el endpoint real.
4. **Producción:** desplegar con `CHECKLIST_DESPLIEGUE.md` y verificar códigos.
5. **Medición:** PSI/Lighthouse y CrUX; guardar evidencia.
6. **Operación:** WhatsApp Business, hoteles reales y revisión de contenido.

---

## Dependencias y riesgos

- **Legal bloquea QA-006.** Sin textos aprobados no se deben publicar enlaces
  como si fueran definitivos.
- **Backend bloquea QA-008.** El frontend no puede garantizar integridad de datos.
- **Infra bloquea N-01/N-02.** El `try_files` actual devuelve HTML en rutas
  inexistentes; hay que desplegar la configuración.
- **LCP móvil** puede seguir alto en laboratorio; no es un bloqueo funcional,
  pero sí de rendimiento. Medir con HTTP/2 antes de optimizar más.
- **Analítica sin consentimiento** es un riesgo legal, no técnico.

---

## Definition of done

- [ ] Los 5 P1 cerrados o con responsable y fecha.
- [ ] Los 6 P2 cerrados o con decisión documentada.
- [ ] Suite funcional 35/35 en staging y producción.
- [ ] Lighthouse móvil ≥ 80 rendimiento y 100 en accesibilidad/BP/SEO.
- [ ] Legal, robots, sitemap y 404 verificados en producción.
- [ ] Checkout real probado con autorización y reembolsado.
- [ ] Evidencia archivada en `01-informe/EVIDENCIA/`.
