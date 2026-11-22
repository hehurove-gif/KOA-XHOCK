# Cloudflare Pages + Pages CMS

Este documento reemplaza a `CHECKLIST_DESPLIEGUE.md` y `nginx-koa.conf` (que describen un servidor propio con nginx
y PHP). El sitio ahora se **construye** con Eleventy y se **publica** en Cloudflare Pages; el cliente edita el
contenido desde Pages CMS, sin tocar código.

```
 Cliente edita en Pages CMS ──► commit en GitHub ──► Cloudflare Pages ejecuta `npm run build` ──► sitio publicado
```

## 1. Estructura del repo

| Ruta | Qué es | Quién la toca |
|---|---|---|
| `src/_data/cms/*.json` | **Contenido editable** (evento, textos de la home, FAQ, ajustes) | Cliente, desde Pages CMS |
| `.pages.yml` | Define qué campos ve el cliente en Pages CMS | Desarrollo |
| `src/*.njk`, `src/_includes/` | Plantillas (HTML con huecos para el contenido) | Desarrollo |
| `src/assets/` | CSS, JS, imágenes, fuentes | Desarrollo |
| `src/_headers` | Cabeceras de seguridad y caché de Cloudflare | Desarrollo |
| `eleventy.config.js` | Configuración del generador y de los atajos `{dates}`, `{price}`… | Desarrollo |
| `workers/tickets-proxy/` | Worker que sirve Pages en `koa-hub.com/tickets/` | Desarrollo |
| `_site/` | Resultado del build (no se versiona) | Nadie |

## 2. Cloudflare Workers (sitio + API)

El proyecto es un **Worker con Static Assets** (`wrangler.toml`): sirve `_site` y atiende `/api/*` con `worker/index.js`
(que reutiliza `functions/api/*`).

1. Cloudflare → *Workers & Pages* → *Create* → *Import a repository* (Workers Builds) → elegir este repo.
2. Configuración de build:

   | Campo | Valor |
   |---|---|
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Variable de entorno | `NODE_VERSION` = `22` |

3. Cada commit a `main` publica solo. Las ramas generan versiones de vista previa (Workers Builds).
4. **Dirección final: `https://koa-hub.com/tickets/`** (decidido; se mantiene la URL que ya estaba publicada, así no se
   rompen enlaces, SEO ni analítica). El Worker publica en la raíz de su propio dominio (`<proyecto>.<subdominio>.workers.dev`), así que
   un Worker en la ruta `koa-hub.com/tickets*` sirve ese proyecto bajo el prefijo, sin tocar lo que haya en el resto
   de koa-hub.com.

   ```
   koa-hub.com/tickets/                -> Worker (assets): /
   koa-hub.com/tickets/tickets.html    -> Worker (assets): /tickets.html
   koa-hub.com/tickets/api/checkout    -> Worker: /api/checkout
   ```

   Pasos (una sola vez):
   1. Anotar el dominio `*.workers.dev` del Worker (activar workers.dev en Settings → Domains & Routes) y ponerlo en `UPSTREAM_HOST` de `workers/tickets-proxy/wrangler.toml`.
   2. Verificar que koa-hub.com esté en Cloudflare con el DNS **con proxy activado** (nube naranja). Si el dominio está
      en otro DNS, las rutas de Worker no funcionan y hay que moverlo, o usar un proxy inverso en el servidor actual.
   3. `cd workers/tickets-proxy && npx wrangler deploy`.
   4. Probar `https://koa-hub.com/tickets` (debe redirigir a `/tickets/`), `/tickets/tickets.html` y `/tickets/terms.html`.

   Las pruebas del Worker: `node workers/tickets-proxy/test.mjs`. El sitio usa rutas relativas y el `canonical` ya apunta
   a `https://koa-hub.com/tickets/`, por lo que no hay que cambiar nada más en `site.json`.

   Dos detalles a tener en cuenta:
   - Los buscadores solo leen `robots.txt` en la raíz. El `Sitemap: https://koa-hub.com/tickets/sitemap.xml` debe estar
     también en `https://koa-hub.com/robots.txt` (el de este repo queda en `/tickets/robots.txt` y no tiene efecto).
   - Cloudflare quita el `.html` con una redirección (`/tickets.html` → `/tickets`); el Worker reescribe esas redirecciones
     para conservar el prefijo.

## 3. Pages CMS

1. Entrar a <https://app.pagescms.org> con la cuenta de GitHub que tenga acceso al repo.
2. Instalar la GitHub App de Pages CMS en el repo y abrirlo. Pages CMS lee `.pages.yml` y muestra cuatro secciones:
   **Evento**, **Página principal**, **Preguntas frecuentes** y **Ajustes del sitio**.
3. Para el cliente: darle acceso de colaborador al repo (o invitarlo desde Pages CMS). No necesita saber Git.

### Qué puede cambiar el cliente

- **Estado de la venta** (`Evento → Estado de la venta`): *Abierta*, *Próximamente* o *Cerrada*.
  - Abierta: botones de compra, sección de boletos y formulario de `tickets.html`.
  - Próximamente / Cerrada: desaparecen los botones y el formulario; aparece el aviso configurable y un botón a WhatsApp.
    `tickets.html` pasa a `noindex` y sale del sitemap, y el JSON-LD deja de anunciar la oferta.
- **Fechas, sede, ciudad y precio mostrado**: las fechas se escriben una sola vez y se reflejan en el hero, el banner,
  las tarjetas, las cintas, el JSON-LD y los textos que usen atajos.
- **Textos de cada sección**, **preguntas frecuentes** (agregar, borrar, reordenar) y **datos de contacto**.

### Atajos dentro de los textos

| Escribes | Se muestra |
|---|---|
| `{dates}` | October 29 – November 1 |
| `{datesShort}` | Oct 29 – Nov 1 |
| `{datesFromTo}` | October 29 to November 1 |
| `{datesThrough}` | October 29 through November 1 |
| `{venue}`, `{price}`, `{currency}`, `{year}` | Happi Arena Cancun, $175, USD, 2026 |
| `**texto**` | negritas (solo donde la etiqueta del campo lo indica) |

### Lo que el CMS **no** cambia (requiere desarrollo)

- Imágenes de las secciones y logos (están en la plantilla).
- Los textos legales (`terms.njk`, `privacy.njk`): son borradores pendientes de revisión legal.
- Límites del formulario (máximo 10 boletos, edad 5–99): viven en `src/assets/js/script.js` y deben coincidir con el servidor.
- El precio **real** del cobro: lo define Stripe. El campo de precio del CMS solo cambia lo que se muestra.

## 4. Probar localmente

```bash
npm install
npm run dev                          # http://localhost:8080  (estado según event.json)
XHOCK_STATUS=open npm run dev        # fuerza "venta abierta" para probar el formulario
npm run build                        # genera _site/
```

Suite funcional (35 checks, requiere Chrome):

```bash
XHOCK_STATUS=open npm run build
python3 -m http.server 8099 --directory _site &
cd 03-herramientas && npm ci && CHROME_PATH=/ruta/a/chrome node test-site.js
```

## 5. Checkout (Stripe + D1)

Ya implementado: `functions/api/checkout.js`, `stripe-webhook.js` y `admin/registrations.js`, con base de datos D1.
Pasos de configuración (cuentas, secrets, webhook, pruebas) en **`CHECKOUT_STRIPE_D1.md`**.


## Consentimiento de analítica

`site.json → analyticsConsent` (editable en Pages CMS, campo "Consentimiento de analítica"):
- `banner` (por defecto): GTM y Meta Pixel **no cargan** hasta que el visitante acepta en el banner. La elección se guarda
  en `localStorage` (`koa_analytics_consent`) y se cambia desde "Cookie settings" en el pie.
- `auto`: comportamiento anterior (cargan tras la primera interacción o a los 5 s).
KOA debe decidir con su asesor legal cuál usar; `privacy.njk` describe el modo `banner`.

## CI

`.github/workflows/ci.yml` corre build, pruebas y `wrangler deploy --dry-run` en cada push a `main` y en cada PR.
