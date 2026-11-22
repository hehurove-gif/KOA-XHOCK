# Checkout con Stripe + Cloudflare D1

Flujo: formulario → `POST api/checkout` (valida, calcula el precio en servidor desde `event.json`, guarda pedido
`pending` en D1, crea la sesión de Stripe Checkout) → pago en Stripe → webhook firmado `api/stripe-webhook`
(marca `paid`, idempotente, verifica monto) → `success.html`. Panel/exportación: `/admin/` y `api/admin/registrations`.

Probado: `npm test` (32 pruebas + proxy) y `npm run test:e2e` (workerd real, D1 local, Stripe simulado).

## Pasos externos (una sola vez)

1. **Stripe**: cuenta verificada (Argentina/México según la entidad de KOA). Activar métodos de pago en
   Settings → Payment methods. OXXO y SPEI **requieren cobrar en MXN**: si `event.json` queda en USD solo
   funcionan tarjetas. Copiar la llave secreta (`sk_test_…` para pruebas, `sk_live_…` para producción).
2. **D1**: `npx wrangler login` → `npx wrangler d1 create koa-xhock` → en `wrangler.toml` descomentar el bloque `[[d1_databases]]` y pegar el `database_id`
   → `npm run db:migrate:remote` → commit. (Está comentado porque un id falso hace fallar el despliegue en Pages.)
3. **Worker → Settings → Variables and Secrets** (tipo **Secret**; las variables de texto puestas en el panel se borran en cada deploy porque `wrangler.toml` manda):
   - Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_TOKEN` (≥24 caracteres aleatorios), `PROXY_SECRET` (el mismo en el Worker).
   - Opcionales: `RESEND_API_KEY`, `MAIL_FROM`, `NOTIFY_EMAIL` (correos de confirmación/aviso), `HASH_SALT`, `PUBLIC_BASE_URL` (`https://koa-hub.com/tickets/`).
4. **Webhook de Stripe** → Developers → Webhooks → endpoint `https://koa-xhock.<subdominio>.workers.dev/api/stripe-webhook`
   (directo al `workers.dev`, no por el proxy de /tickets) con eventos: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `charge.refunded`. Copiar el *signing secret* (`whsec_…`) a `STRIPE_WEBHOOK_SECRET`.
5. **Worker proxy** (`workers/tickets-proxy`): `npx wrangler secret put PROXY_SECRET`, ajustar `UPSTREAM_HOST`, `npx wrangler deploy`.
   Requiere que el DNS de koa-hub.com esté proxied (nube naranja) en Cloudflare.
6. **Proteger el panel**: Cloudflare Zero Trust → Access → aplicación para `koa-hub.com/tickets/admin*` y
   `koa-hub.com/tickets/api/admin*` (correo de KOA). Además el endpoint exige `Authorization: Bearer <ADMIN_TOKEN>`.
7. **Turnstile (captcha, recomendado)**: Cloudflare → Turnstile → Add widget (dominio `koa-hub.com`, modo Managed).
   Pegar la *Site Key* en Pages CMS → Ajustes (`turnstileSiteKey`) y guardar la *Secret Key* como secret `TURNSTILE_SECRET`
   del Worker. Sin secret el checkout no exige captcha; con secret, rechaza peticiones sin token válido (400) y falla
   cerrado (503) si Cloudflare no responde.
8. **Legal**: revisar `terms.njk`/`privacy.njk` con KOA (retención de datos, entidad responsable).

## Prueba antes de abrir ventas

1. Con llaves `sk_test_`, poner el estado en `open` (Pages CMS → Evento, o `XHOCK_STATUS=open`).
2. Comprar con tarjeta `4242 4242 4242 4242`; verificar redirección a `success.html`, fila `paid` en el panel y el correo.
3. Probar un pago rechazado (`4000 0000 0000 0002`) y cancelar en Stripe (vuelve con `?checkout=cancelled`).
4. Reembolsar desde Stripe → el pedido pasa a `refunded`.
5. Cambiar a llaves `sk_live_` + webhook live, y hacer una compra real mínima con reembolso.

## Tarifas por categoría (junior, preventa)

Todo se edita en Pages CMS → Evento (campos vacíos = sin esa tarifa; con solo `price` rige un precio único):
- `price`: precio adulto / normal. `childPrice` + `childMaxAge`: tarifa junior para jugadores de esa edad o menos.
- `earlyBirdUntil` (fecha inclusive, hora de Cancún), `earlyBirdPrice` y `earlyBirdChildPrice`: preventa.
El servidor calcula el precio de **cada jugador** según su edad y la fecha (`functions/_lib/pricing.js`); el formulario usa
el mismo archivo para mostrar el total exacto. Stripe recibe una línea por categoría; cada jugador guarda lo cobrado
(`players.unit_amount`, `price_tier`; también salen en el CSV). **Aplicar la migración `0002_pricing.sql`**
(`npm run db:migrate:remote`) antes de abrir una edición con esta versión. Para mover la fecha de preventa sin
redeploy: secret `EVENT_OVERRIDES` = `{"earlyBirdUntil":"2027-01-31"}` (solo admite claves de precio).
Los pedidos de ediciones anteriores no tienen estos datos (quedan vacíos).

## Nueva edición del evento

Pages CMS → Evento: nombre, fechas, sede, precio, moneda y estado (`soon` / `open` / `closed`). El precio que se
cobra es siempre el de `event.json` (el cliente no puede alterarlo). Los registros de ediciones previas
permanecen en D1; exporta el CSV antes de reutilizar.

## Operación

- Panel: `/tickets/admin/` (token en memoria de la pestaña). Filtros por estado, búsqueda (nombre/correo), país, equipo
  (o `unassigned`) y fechas; totales (pedidos, ingresos, tallas, posiciones, países, equipos, pedidos por día) y
  **asignación de equipo** a varios jugadores a la vez (`POST /api/admin/team`).
- Exportar: botón "Download CSV" (respeta los filtros) o `/tickets/api/admin/registrations?format=csv&status=paid` con el token.
- Límites: 10 boletos por pedido, edades 5–99 (ajustar en `functions/_lib/config.js` si KOA decide otros).
- D1 gratis: 100k escrituras/día, 5 GB; sobra para este volumen.
