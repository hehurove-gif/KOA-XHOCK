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
| `_site/` | Resultado del build (no se versiona) | Nadie |

## 2. Cloudflare Pages

1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → elegir este repo.
2. Configuración de build:

   | Campo | Valor |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `_site` |
   | Variable de entorno | `NODE_VERSION` = `22` |

3. Cada commit a `main` publica solo. Cada rama y cada PR obtienen una URL de vista previa (útil para revisar antes de publicar).
4. Dominio: *Custom domains* → añadir el dominio o subdominio elegido.
   - **Pendiente de decidir:** hoy el sitio vive en `koa-hub.com/tickets/`. Pages publica en la raíz de un dominio
     (`xhock.koa-hub.com`, por ejemplo). Si debe seguir en `/tickets/`, hace falta una regla o Worker en `koa-hub.com`
     que dirija esa ruta a Pages. Al decidirlo hay que actualizar `url` en `src/_data/cms/site.json`
     (canonical, Open Graph y sitemap lo usan).

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

## 5. Checkout (pendiente)

El formulario envía un `POST` a `api/checkout` (`checkoutEndpoint` en `site.json`). **Ese endpoint todavía no existe.**
Con la venta cerrada no hace falta. Para una próxima edición, en Cloudflare Pages va como **Pages Function**
(`functions/api/checkout.js`), que valida los datos (mismas reglas que el cliente: `VALIDACION_SERVIDOR.md`),
crea la sesión de Stripe Checkout y devuelve `{ "url": "…" }`. Las llaves van como *secrets* de Cloudflare, nunca en el repo.
La referencia de validación está en `02-despliegue/api/checkout.example.php`.

Decisiones que faltan para escribirlo: cuenta de Stripe y llaves, precio o *Price ID*, adónde llegan los registros
(correo, Zapier, Google Sheets o base de datos) y límites definitivos de boletos y edades.
