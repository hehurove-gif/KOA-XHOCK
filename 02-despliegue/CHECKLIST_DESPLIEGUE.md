# Checklist de despliegue — KOA XHOCK /tickets/ (nginx · plan anterior)

> **Reemplazado:** el sitio se publica ahora en Cloudflare Pages. Ver `CLOUDFLARE_PAGES_Y_CMS.md`.
> Este documento se conserva solo como referencia (rutas de archivos anteriores a la migración a `src/`).

Este documento asume que se publican **solo los archivos del sitio** que están
en la raíz del paquete (`index.html`, `tickets.html`, páginas legales,
`robots.txt`, `sitemap.xml` y `assets/`) en el servidor de producción, con el
respaldo y la validación previos que se describen abajo. Las carpetas
`01-informe/`, `02-despliegue/` y `03-herramientas/` **no** se publican.

> **No desplegar `02-despliegue/api/checkout.example.php` como si fuera
> producción.** Es una referencia de validación del servidor. El endpoint real
> debe integrarse con el backend/Stripe de KOA y revisarse antes de sustituir el
> actual.

---

## 0. Antes de empezar

- [ ] Confirmar con KOA la ventana de despliegue y quién aprueba.
- [ ] Confirmar que el backend de checkout actual sigue disponible y sin cambios.
- [ ] Confirmar que los textos legales (`terms.html`, `privacy.html`) fueron
      revisados por legal. Si no, publicarlos solo en staging.
- [ ] Confirmar la política de analítica/cookies (GTM + Meta Pixel) con legal.
- [ ] Tener acceso a nginx, PHP-FPM y al directorio `/var/www/koa-hub/`.
- [ ] Copia de seguridad del sitio actual:

```bash
STAMP=$(date +%Y%m%d-%H%M)
sudo tar -czf /var/backups/koa-tickets-$STAMP.tar.gz \
  -C /var/www/koa-hub tickets
ls -lh /var/backups/koa-tickets-$STAMP.tar.gz
```

---

## 1. Staging primero

```bash
# Subir solo el sitio a un directorio de staging, nunca directo a producción.
# Ejecutar desde la raíz del paquete (donde está index.html).
sudo rsync -av --delete \
  ./index.html ./tickets.html ./terms.html ./privacy.html ./robots.txt ./sitemap.xml \
  ./assets/ \
  usuario@servidor:/var/www/koa-hub-tickets-staging/
```

- [ ] Revisar en staging con un `server_name` o host temporal.
- [ ] Ejecutar la lista de verificación de la sección 4 contra staging.
- [ ] Revisar en móvil real (iOS Safari y Android Chrome), no solo emulado.
- [ ] Abrir `tickets.html` desde los cinco CTAs del landing y probar la compra
      **sin llegar a pagar**.
- [ ] Comprobar que `terms.html` y `privacy.html` abren y vuelven correctamente.

---

## 2. Publicación

```bash
# Sincronizar solo los archivos del sitio (sin borrar api/ real del servidor).
# CSS, JS, imágenes y fuentes viajan dentro de assets/.
sudo rsync -av \
  ./index.html \
  ./tickets.html \
  ./terms.html \
  ./privacy.html \
  ./sitemap.xml \
  usuario@servidor:/var/www/koa-hub/tickets/

sudo rsync -av ./assets/ \
  usuario@servidor:/var/www/koa-hub/tickets/assets/

# robots.txt va en la RAÍZ del dominio, no en /tickets/
sudo rsync -av ./robots.txt \
  usuario@servidor:/var/www/koa-hub/robots.txt
```

- [ ] **No** sobrescribir `/var/www/koa-hub/tickets/api/checkout.php` real.
- [ ] Permisos: directorios `755`, archivos `644`, propietario del usuario de
      nginx o del usuario de despliegue.
- [ ] Confirmar que no se subió `checkout.example.php`, `.git`, `.env` ni backups.

```bash
sudo find /var/www/koa-hub/tickets -type d -exec chmod 755 {} \;
sudo find /var/www/koa-hub/tickets -type f -exec chmod 644 {} \;
```

---

## 3. nginx

```bash
sudo cp nginx-koa.conf /etc/nginx/sites-available/koa-hub.conf
sudo ln -sf /etc/nginx/sites-available/koa-hub.conf /etc/nginx/sites-enabled/koa-hub.conf
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] `nginx -t` sin errores.
- [ ] Si se activó Brotli, comprobar que el módulo existe:
      `nginx -V 2>&1 | tr ' ' '\n' | grep brotli`.
- [ ] Si se activó `limit_req_zone`, la zona debe estar en el bloque `http`
      de `/etc/nginx/nginx.conf`, no dentro del `server`.
- [ ] HSTS solo si todo el dominio y subdominios son HTTPS.
- [ ] La CSP se activa primero como `Content-Security-Policy-Report-Only`.

---

## 4. Verificación en producción

Ejecutar desde una máquina externa. Guardar la salida como evidencia.

### 4.1 Respuesta y compresión

```bash
curl -sSI https://koa-hub.com/tickets/ | sed -n '1,20p'
curl -sSI https://koa-hub.com/tickets/tickets.html | sed -n '1,20p'
curl -sSI -H 'Accept-Encoding: br,gzip' https://koa-hub.com/tickets/ | grep -i -E 'HTTP/|content-encoding|cache-control|strict-transport|x-content-type'
```

Esperado:

- `HTTP/2 200` (o `HTTP/1.1 200` si aún no hay HTTP/2).
- `content-encoding: br` o `gzip`.
- `cache-control: no-cache` en el HTML.
- `strict-transport-security`, `x-content-type-options: nosniff`.

### 4.2 Estáticos y caché

```bash
curl -sSI https://koa-hub.com/tickets/assets/img/hockey-hero-800.webp | grep -i -E 'HTTP/|cache-control|content-type'
curl -sSI https://koa-hub.com/tickets/assets/css/styles.css | grep -i -E 'HTTP/|cache-control|content-type'
```

Esperado: `200`, `image/webp` o `text/css`, y `cache-control` con
`max-age` (30 días para imágenes, 7 días para CSS/JS).

### 4.3 Legal, robots y sitemap

```bash
curl -sSI https://koa-hub.com/tickets/terms.html | head -n 1
curl -sSI https://koa-hub.com/tickets/privacy.html | head -n 1
curl -sS  https://koa-hub.com/robots.txt
curl -sSI https://koa-hub.com/tickets/sitemap.xml | head -n 1
```

Esperado: `200` en los cuatro; `robots.txt` con `Sitemap:
https://koa-hub.com/tickets/sitemap.xml`.

### 4.4 404 real (hallazgo N-01)

```bash
curl -sSI https://koa-hub.com/tickets/no-existe.html | head -n 1
curl -sSI https://koa-hub.com/tickets/api/checkout.php | head -n 1
```

Esperado:

- Recurso inexistente: `404`, **no** `200` con el HTML de la página.
- `GET` al checkout: `405 Method Not Allowed` (JSON), **no** `200` con HTML.
- `POST` vacío: `422` (JSON de validación), **no** un pedido creado.

```bash
# Prueba segura: payload vacío. No crear pedidos reales.
curl -sS -o /tmp/koa-post.txt -w '%{http_code}\n' \
  -X POST https://koa-hub.com/tickets/api/checkout.php \
  -H 'Content-Type: application/json' \
  -d '{}'
cat /tmp/koa-post.txt
```

- [ ] El código es `400`/`422`/`429`, nunca `200` con una URL de Stripe.
- [ ] La respuesta no filtra rutas, stack traces, claves ni datos internos.

### 4.5 Seguridad básica

```bash
curl -sSI https://koa-hub.com/.git/config | head -n 1     # 403/404
curl -sSI https://koa-hub.com/tickets/.env | head -n 1    # 403/404
curl -sSI https://koa-hub.com/tickets/api/checkout.example.php | head -n 1  # 404
```

- [ ] Sin listados de directorio.
- [ ] Sin archivos de configuración accesibles.
- [ ] Sin `X-Powered-By`.

### 4.6 Funcional en navegador

- [ ] La página carga sin errores en consola (Chrome DevTools → Console).
- [ ] El hero se ve de inmediato, sin pantalla en blanco.
- [ ] Los cinco anchos (1440, 1024, 768, 390, 360) no tienen scroll horizontal.
- [ ] El CTA del landing abre `tickets.html`; el formulario no vive en un modal.
- [ ] La página de tickets muestra precio, resumen y formulario sin desbordes.
- [ ] Cantidad `1000` se limita a `10`; los bloques de jugador se generan sin bloqueo.
- [ ] Los errores aparecen junto al campo y el foco va al primero inválido.
- [ ] El borrador se recupera tras recargar y se borra tras un envío correcto.
- [ ] El FAQ abre/cierra con teclado y `aria-expanded` cambia.
- [ ] Los enlaces legales abren documentos reales.
- [ ] El botón de WhatsApp flotante abre el chat correcto.
- [ ] Con JavaScript desactivado, el contenido sigue visible.

---

## 5. Analítica y consentimiento

- [ ] Confirmar con legal si se requiere banner de consentimiento (UE/UK, o
      políticas de KOA). `analytics.js` difiere GTM y Meta Pixel hasta la primera
      interacción o 5 s, pero **no** implementa consentimiento explícito.
- [ ] Verificar en GTM que los eventos de compra siguen llegando.
- [ ] Verificar que el píxel no se dispara antes de la interacción.
- [ ] Si se añade consentimiento, cargar `analytics.js` solo tras aceptar.

---

## 6. Post-despliegue

- [ ] Ejecutar PageSpeed Insights móvil y escritorio sobre la URL real.
- [ ] Guardar los informes en `01-informe/EVIDENCIA/lighthouse/`.
- [ ] Revisar `Search Console` (sitemap enviado, sin errores de rastreo).
- [ ] Revisar `robots.txt` y `sitemap.xml` en Search Console.
- [ ] Probar un pedido real **solo con autorización expresa de KOA** y reembolsarlo.
- [ ] Vigilar logs de nginx/PHP durante 24-48 h (429, 5xx, errores de Stripe).
- [ ] Anotar la versión desplegada y la fecha en el registro de cambios.

---

## 7. Rollback

Si algo falla:

```bash
STAMP=AAAA-MM-DD-HHMM   # el usado en la copia de seguridad
sudo rm -rf /var/www/koa-hub/tickets
sudo tar -xzf /var/backups/koa-tickets-$STAMP.tar.gz -C /var/www/koa-hub
sudo systemctl reload nginx
```

- [ ] Confirmar `200` en `/tickets/` y que el checkout anterior responde.
- [ ] Avisar a KOA y registrar la causa.
- [ ] No dejar el sitio en un estado intermedio (HTML nuevo + API vieja o
      viceversa) más tiempo del necesario.

---

## 8. Criterios de aceptación

Se considera desplegado cuando:

1. `/tickets/` y `/tickets/tickets.html` responden `200` con el HTML nuevo y
   sin errores de consola.
2. Legal, robots, sitemap y 404 responden como se indica arriba.
3. El checkout real (el de KOA, no el de ejemplo) sigue creando sesiones
   correctamente y el `POST` vacío no crea pedidos.
4. Lighthouse móvil no baja de 80 en Rendimiento y 100 en Accesibilidad,
   Buenas prácticas y SEO (o se documenta la desviación).
5. No hay regresiones en el flujo de compra ni en los enlaces de WhatsApp.
