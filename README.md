# KOA · XHOCK — QA y sitio corregido (octubre 2026)

Este paquete contiene la auditoría de `https://koa-hub.com/tickets/`, el sitio
corregido listo para desplegar, la evidencia de las pruebas y la guía de
despliegue.

---

## Contenido

```
.
├── src/                            Sitio (Eleventy). Se construye a _site/
│   ├── index.njk                   Página principal
│   ├── tickets.njk                 Compra de boletos (o aviso si la venta está cerrada)
│   ├── terms.njk / privacy.njk     Términos y privacidad (borradores para revisión legal)
│   ├── sitemap.njk, robots.txt     SEO
│   ├── _headers                    Cabeceras de seguridad y caché (Cloudflare Pages)
│   ├── _includes/                  Piezas compartidas (SEO, analítica, macros)
│   ├── _data/cms/                  CONTENIDO EDITABLE desde Pages CMS (event, home, faq, site)
│   └── assets/                     CSS, JS, imágenes, fuentes, logos
├── .pages.yml                      Qué campos ve el cliente en Pages CMS
├── eleventy.config.js              Configuración del generador y atajos {dates}, {price}…
├── package.json                    npm run dev / npm run build
├── 01-informe/                     Informe QA original y actualizado, evidencia y Lighthouse
├── 02-despliegue/                  Cloudflare Pages + CMS (nuevo), nginx y checkout de referencia (legado)
└── 03-herramientas/                Pruebas Playwright, capturas, servidor local
```

---

## Empieza por aquí

1. **`01-informe/INFORME_QA_ACTUALIZADO.md`** — qué se encontró, qué se corrigió
   y qué sigue pendiente.
2. **`01-informe/REVISION_DISENO.md`** — lectura de diseño y mejoras sugeridas.
3. **`src/index.njk`** — plantilla de la landing; el contenido está en `src/_data/cms/`.
4. **`02-despliegue/CLOUDFLARE_PAGES_Y_CMS.md`** — cómo se publica y cómo edita el cliente
   (`CHECKLIST_DESPLIEGUE.md` y `nginx-koa.conf` quedan como referencia del plan anterior con nginx).
5. **`02-despliegue/VALIDACION_SERVIDOR.md`** — lo que debe cerrar el backend.

---

## Ver el sitio en local

```bash
npm install
npm run dev                      # http://localhost:8080
XHOCK_STATUS=open npm run dev    # fuerza "venta abierta" para probar el formulario
npm run build                    # genera _site/ (lo que publica Cloudflare Pages)
```

El estado real de la venta (`open` / `soon` / `closed`) está en `src/_data/cms/event.json`.
Despliegue, Pages CMS y guía para el cliente: **`02-despliegue/CLOUDFLARE_PAGES_Y_CMS.md`**.
El checkout (Stripe + D1) se prueba en local con `npm run test` y `npm run test:e2e` (workerd real + Stripe simulado). Ver `02-despliegue/CHECKOUT_STRIPE_D1.md`.

---

## Resultado en una frase

El frontend pasó de **43/96/79/100** a **90/100/100/100** en Lighthouse móvil,
redujo el peso inicial un **86 %** y resolvió los P1/P2 de formulario, cantidad,
borrador, contraste y rendimiento. La compra vive ahora en `tickets.html`, una
página independiente. Quedan abiertos **el backend real (QA-008)**, **los textos
legales (QA-006)**, **el consentimiento de analítica** y **algunas decisiones de
negocio**.

---

## Qué **no** hace este paquete

- No despliega nada: los archivos están listos, pero no se publicaron.
- No crea pedidos ni pagos reales.
- No modifica el backend de KOA.
- No sustituye la revisión legal de `terms.html` y `privacy.html`.
- No garantiza que el endpoint actual valide en servidor; eso se comprueba con
  la checklist.

---

## Notas importantes

- **`02-despliegue/api/checkout.example.php` es una referencia**, no el endpoint
  de producción. No debe desplegarse como si lo fuera.
- **`robots.txt` va en la raíz del dominio** (`https://koa-hub.com/robots.txt`),
  no solo en `/tickets/`.
- **Los textos legales son borradores** marcados con `[KOA to confirm]`.
- **La analítica no tiene banner de consentimiento**; debe decidirlo legal.
- **`04-otros-proyectos/` es un archivo** de material fuente de otras landings
  KOA; no forma parte del sitio XHOCK y no se publica.
- El precio ($175 USD), el máximo de 10 boletos y el rango de edad 5–99 son
  propuestas; confirmar con KOA antes de producción.

---

## Contacto / responsables

| Área | Responsable |
|---|---|
| Frontend y QA | Equipo de auditoría |
| Backend / pagos | KOA |
| Legal / privacidad | KOA |
| Infraestructura / nginx | KOA |
| Contenido (hoteles, precios) | KOA |
