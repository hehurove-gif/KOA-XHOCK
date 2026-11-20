# KOA · XHOCK — QA y sitio corregido (octubre 2026)

Este paquete contiene la auditoría de `https://koa-hub.com/tickets/`, el sitio
corregido listo para desplegar, la evidencia de las pruebas y la guía de
despliegue.

---

## Contenido

```
KOA-QA-2026-10/
├── index.html                      Página principal del sitio
├── tickets.html                    Compra de boletos (página independiente)
├── terms.html                      Términos (borrador para revisión legal)
├── privacy.html                    Privacidad (borrador para revisión legal)
├── robots.txt                      Publicar en la raíz del dominio
├── sitemap.xml
├── assets/
│   ├── css/styles.css
│   ├── js/script.js
│   ├── js/analytics.js
│   ├── img/                        Imágenes WebP/JPG
│   ├── fonts/                      Manrope y Orbitron (WOFF2)
│   ├── logos/                      Logos KOA y Happi Arena
│   └── favicon.png
├── 01-informe/
│   ├── 00-informe-original.md      Informe QA original (sin modificar)
│   ├── INFORME_QA_ACTUALIZADO.md   Informe final: estado de los 22 hallazgos
│   ├── PLAN_DE_CORRECCIONES.md     Plan priorizado y criterios de aceptación
│   ├── CAMBIOS_REALIZADOS.md       Cambios archivo por archivo
│   ├── REVISION_DISENO.md          Análisis visual de landing y compra
│   ├── VERIFICACION.md             Pruebas, métricas y cómo reproducirlas
│   └── EVIDENCIA/
│       ├── capturas-antes/         Página en vivo (1440/1024/768/390/360)
│       ├── capturas-despues/       Landing, página de tickets y sin JS
│       └── lighthouse/             Informes JSON/HTML antes y después
├── 02-despliegue/
│   ├── nginx-koa.conf              Configuración de referencia
│   ├── CHECKLIST_DESPLIEGUE.md     Paso a paso y verificación
│   ├── VALIDACION_SERVIDOR.md      Checklist de backend (20 casos)
│   └── api/checkout.example.php    Referencia, NO desplegar tal cual
├── 03-herramientas/
│   ├── serve.js                    Servidor local con gzip/brotli/caché
│   ├── test-site.js                Suite funcional Playwright (35 checks)
│   ├── shots.js                    Capturas responsive
│   ├── lh-compare.js               Comparador de informes Lighthouse
│   ├── package.json                Scripts `npm test`, `npm run shots`, etc.
│   ├── package-lock.json           Versión fijada de `playwright-core`
│   └── README.md
└── 04-otros-proyectos/             Archivo de otros proyectos KOA (no se publica)
    ├── escuelas/                   Assets de la landing de Escuelas
    ├── landing-padres/             Assets y fuentes de la landing para padres
    └── koa-2-landings-correcciones-finales-main/
                                    Copia antigua de tickets y sponsorship
```

---

## Empieza por aquí

1. **`01-informe/INFORME_QA_ACTUALIZADO.md`** — qué se encontró, qué se corrigió
   y qué sigue pendiente.
2. **`01-informe/REVISION_DISENO.md`** — lectura de diseño y mejoras sugeridas.
3. **`index.html`** — abrir en un navegador o servir en local.
4. **`02-despliegue/CHECKLIST_DESPLIEGUE.md`** — antes de publicar.
5. **`02-despliegue/VALIDACION_SERVIDOR.md`** — lo que debe cerrar el backend.

---

## Ver el sitio en local

```bash
# Desde esta carpeta (la que contiene index.html)
python -m http.server 8099
# http://127.0.0.1:8099/
# http://127.0.0.1:8099/tickets.html
```

Para medir con compresión y caché:

```bash
node 03-herramientas/serve.js
# http://127.0.0.1:8100/tickets/   (también responde en /)
```

El servidor Node solo sirve archivos estáticos; el checkout real no funciona en
local (el `POST` se mockea en las pruebas).

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
