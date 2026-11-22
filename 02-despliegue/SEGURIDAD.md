# Seguridad y validación de datos

Cubierto por `functions/test/security.test.js` (se ejecuta con `npm test` y en el CI).

| Riesgo | Defensa |
|---|---|
| **SQL injection** | Todas las consultas usan parámetros enlazados (`?1`, `.bind()`); nunca se concatenan datos del usuario. Los filtros del panel (`q`, `team`) van enlazados y el `%`/`_` del buscador se escapa; `status`, `country`, `from`, `to` se validan contra lista/formato (400 si no cumplen). |
| **XSS** | Los nombres solo admiten letras Unicode, espacios, apóstrofo y guion; `< >` se eliminan de los campos de atribución; el panel pinta con `textContent`; los correos escapan HTML (`escapeHtml`). CSP en `src/_headers` (sin `object-src`, `form-action` y `frame-ancestors` restringidos). |
| **Inyección de fórmulas CSV** | Celdas que empiezan con `= + - @` (o tab/CR) se neutralizan con `'`. |
| **Inyección de cabeceras** | El nombre del CSV usa solo el `status` de una lista permitida; los nombres con CR/LF o caracteres de control se rechazan. |
| **Mass assignment / prototype pollution** | `parseForm` solo acepta una lista fija de campos (más `players[n][campo]` y atribución); `__proto__`, `constructor`, `status`, `amount_total`… se ignoran. El precio y el estado jamás vienen del navegador. |
| **DoS por tamaño** | Cuerpo del checkout ≤ 64 KB (también sin `Content-Length`), máx. 10 boletos, índices de jugador acotados, webhook ≤ 256 KB. |
| **Fuerza bruta / abuso** | Checkout: límite por IP y por correo + honeypot + Turnstile opcional. Admin: 10 intentos fallidos por IP cada 10 min → 429. |
| **Fraude de pago** | Importe y moneda se verifican contra lo calculado en servidor antes de marcar `paid`; webhook con firma HMAC y tolerancia de 5 min; eventos idempotentes. |
| **CSRF / envíos de terceros** | El checkout rechaza `Origin` ajeno o `null`. Los endpoints de admin exigen `Authorization: Bearer` (no cookies). |
| **Fugas de información** | Errores genéricos; sin stack traces, claves ni IPs en respuestas; la IP solo se guarda como hash. |

## Pendiente fuera del código
- Poner **Cloudflare Access** delante de `/admin*` y `/api/admin*` (ver `CHECKOUT_STRIPE_D1.md`).
- Rotar `ADMIN_TOKEN`, `STRIPE_*` y `PROXY_SECRET` si alguien que los conocía deja el proyecto.
- Activar WAF/Bot Fight Mode en la zona de koa-hub.com si hay abuso.
