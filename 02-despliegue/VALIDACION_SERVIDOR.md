> **Obsoleto.** El checkout real ya está en `functions/` (Stripe + D1). Ver `CHECKOUT_STRIPE_D1.md`. Este documento queda como checklist de QA histórico.

# Validación del servidor — checkout XHOCK

Este documento cubre lo que **no se puede comprobar desde el navegador** y que
debe revisar el equipo de backend de KOA antes de dar por cerrado QA-008.

El archivo `02-despliegue/api/checkout.example.php` es una **referencia**
de validación y creación de sesión; no es el endpoint de producción y no se
desplegó. No se ejecutaron pruebas contra producción para no crear pedidos ni
sesiones de pago reales.

---

## 1. Contrato esperado del endpoint

`POST /tickets/api/checkout.php`

- `Content-Type: application/json` (o `multipart/form-data` si el front actual
  lo usa; el `script.js` envía `FormData`).
- Respuesta correcta: `200` con `{ "url": "https://checkout.stripe.com/..." }`.
- Errores de validación: `422` con `{ "errors": { "campo": "mensaje" } }`.
- Método incorrecto: `405` con `Allow: POST`.
- Demasiadas peticiones: `429` con `Retry-After`.
- Error interno: `500` sin stack trace ni datos sensibles.
- **Nunca** `200` con HTML de la página (eso es el fallo N-01 actual).

---

## 2. Reglas que el servidor debe repetir

El cliente ya valida, pero el servidor es la autoridad. Debe rechazar cualquier
petición que no cumpla:

| Campo | Regla |
|---|---|
| `firstName`, `lastName` | 1–50 caracteres; letras Unicode, espacio, apóstrofo y guion; sin dígitos ni símbolos raros. |
| `email` | Formato válido, longitud ≤ 254, dominio con TLD; normalizar a minúsculas. |
| `phone` | E.164 o número nacional válido para el país; longitud 7–15 dígitos; validar con libphonenumber. |
| `country` | Código ISO 3166-1 alfa-2 permitido. |
| `quantity` | Entero entre **1 y 10** (máximo propuesto; confirmar con KOA). Rechazar `0`, negativos, decimales y texto. |
| `players[]` | Exactamente `quantity` elementos. |
| `players[].name` | 1–60 caracteres; letras, espacio, apóstrofo y guion. |
| `players[].age` | Entero entre **5 y 99** (rango propuesto; confirmar con negocio). |
| `players[].position` | Valor de la lista permitida (o vacío si es opcional). |
| `players[].jerseySize` | Valor de la lista permitida. |
| `terms` | Debe ser verdadero; registrar versión/fecha de los términos aceptados. |
| `company` (honeypot) | Debe estar vacío; si viene completo, responder `200` genérico y no crear nada. |
| Campos extra | Ignorar o rechazar; no reenviar a Stripe/Zapier sin filtrar. |

Reglas transversales:

- [ ] Límite de longitud del cuerpo (`client_max_body_size`, PHP `post_max_size`).
- [ ] Límite de claves/array de jugadores (no confiar en `quantity` del cliente).
- [ ] Normalización Unicode y eliminación de caracteres de control.
- [ ] Codificación de salida al mostrar nombres en correos, panel o CRM.
- [ ] Consultas SQL parametrizadas (PDO/MySQLi con *prepared statements*).
- [ ] Sin concatenar datos del usuario en HTML, correos o logs.
- [ ] Sin secretos en el repositorio ni en el front; solo variables de entorno.

---

## 3. Pago y pedido

- [ ] El **precio se calcula en el servidor** (`175 USD × quantity`), nunca se
      acepta un importe enviado por el cliente.
- [ ] La sesión de Stripe se crea con `line_items` y `quantity` calculados en
      servidor; `success_url` y `cancel_url` son URLs propias permitidas.
- [ ] Se usa **idempotency key** por intento para evitar pedidos duplicados.
- [ ] El webhook de Stripe verifica la firma (`Stripe-Signature`) y no confía
      en el redirect del navegador para marcar el pedido como pagado.
- [ ] El pedido se guarda con estado `pending` antes de redirigir y se actualiza
      solo con el webhook.
- [ ] No se registran datos de tarjeta (Stripe Checkout los recoge fuera del sitio).
- [ ] Los datos personales se limitan a lo necesario y se cifran en tránsito.
- [ ] Retención y borrado definidos con legal (ver `privacy.html`).
- [ ] Rate limiting por IP y por email; captcha o Turnstile si hay abuso.
- [ ] Logs sin PII completa: enmascarar email/teléfono y no volcar el payload.

---

## 4. Casos de prueba (staging)

Ejecutar en un entorno de pruebas con claves de Stripe de test. **No** ejecutar
en producción sin autorización expresa.

| # | Petición | Esperado |
|---|---|---|
| 1 | `GET` al endpoint | `405`, `Allow: POST`, JSON. |
| 2 | `POST {}` | `422`, errores por campo, sin sesión. |
| 3 | `POST` con `quantity: 0` | `422`. |
| 4 | `POST` con `quantity: 11` | `422`. |
| 5 | `POST` con `quantity: 1000` | `422`, sin intentar crear 1000 jugadores. |
| 6 | `POST` con `quantity: "10"` y 10 jugadores válidos | `200` + URL de Stripe test. |
| 7 | `POST` con 10 jugadores pero `quantity: 3` | `422` (desajuste). |
| 8 | `POST` con edad `4` y `100` | `422`. |
| 9 | `POST` con nombre `"123"` o `<script>` | `422`; si se guarda, escape correcto. |
| 10 | `POST` con email inválido | `422`. |
| 11 | `POST` con teléfono inválido para el país | `422`. |
| 12 | `POST` sin `terms` | `422`. |
| 13 | `POST` con honeypot lleno | `200` genérico, sin pedido ni sesión. |
| 14 | 20 peticiones seguidas | `429` tras el límite; `Retry-After`. |
| 15 | `POST` con `Content-Type: text/plain` | `415` o `422`, no `200`. |
| 16 | Webhook con firma inválida | `400`, sin cambiar el pedido. |
| 17 | Webhook válido de `checkout.session.completed` | Pedido `paid`, idempotente. |
| 18 | Repetir el mismo webhook | Sin duplicar pedido ni correo. |
| 19 | Timeout de Stripe | `502`/`503` controlado, sin pedido huérfano. |
| 20 | `OPTIONS` (si hay CORS) | Sin `Access-Control-Allow-Origin: *`; solo orígenes propios. |

Guardar las respuestas (código + cuerpo) como evidencia, sin datos personales
reales.

---

## 5. Cabeceras y transporte

- [ ] TLS 1.2/1.3, certificado válido, redirección 301 de HTTP a HTTPS.
- [ ] HSTS (solo si todo el dominio es HTTPS).
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] `Permissions-Policy` restrictiva.
- [ ] CSP en `Report-Only` primero; luego endurecer.
- [ ] Sin `X-Powered-By`, sin listados de directorio, sin `.git`/`.env`.
- [ ] `Cache-Control: no-store` en el endpoint de checkout.

---

## 6. Qué queda pendiente de KOA

1. Confirmar el máximo de boletos por pedido (hoy la propuesta es 10).
2. Confirmar el rango de edad (hoy la propuesta es 5–99).
3. Confirmar el texto legal, la entidad responsable y la retención de datos.
4. Confirmar el backend real y si el endpoint actual ya valida en servidor.
5. Autorizar una prueba de compra real (y su reembolso) antes del lanzamiento.
6. Decidir si se requiere consentimiento explícito para GTM/Meta Pixel.

Hasta que estos puntos se resuelvan, QA-008 y QA-006 quedan **parcialmente
abiertos** aunque la parte de cliente y la estructura ya estén corregidas.
