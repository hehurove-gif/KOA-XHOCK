# Herramientas de QA

Scripts usados para servir el sitio, probarlo, capturarlo y comparar Lighthouse.

## Requisitos

- Node.js 18+.
- Google Chrome instalado en
  `C:\Program Files\Google\Chrome\Application\chrome.exe`
  (o definir `CHROME_PATH`).
- `npm install` en esta carpeta (instala `playwright-core`).
- Para las capturas y la suite funcional, el sitio debe estar servido en
  `http://127.0.0.1:8099/index.html` (la suite también abre
  `http://127.0.0.1:8099/tickets.html`).

## Servir el sitio

```bash
# Opción A: sin compresión, desde la carpeta principal del paquete
# (la que contiene index.html).
python -m http.server 8099

# Opción B: con gzip/brotli, caché y cabeceras, desde esta carpeta.
npm run serve
# http://127.0.0.1:8100/tickets/   (también responde en /)
```

`serve.js` sirve la carpeta principal del paquete (donde está `index.html`),
quita el prefijo `/tickets/` para imitar la ruta de producción y no ejecuta PHP.

## Suite funcional

```bash
npm test
```

- 35 comprobaciones: responsive y consola en el landing y en `tickets.html`,
  imágenes, hero, CTAs, cursor nativo, FAQ, cantidad, validación, borrador y
  `POST` mockeado.
- Escribe capturas `prueba-*.png`, `resultados.json` y `post-mock.txt` en
  `../01-informe/EVIDENCIA/capturas-despues/`.
- No crea pedidos reales: intercepta `**/api/checkout.php`.

## Capturas

```bash
npm run shots
```

- Genera `despues-*.png` (landing), `tickets-*.png` (compra),
  `sin-js-390.png` y `sin-js-tickets-390.png` en
  `../01-informe/EVIDENCIA/capturas-despues/`.
- Recorre el landing para cargar imágenes `lazy`, fuerza `.is-visible` y captura
  con animaciones desactivadas.

Variables opcionales:

- `BASE_URL` (por defecto `http://127.0.0.1:8099/index.html`).
- `CHROME_PATH`.

## Comparar Lighthouse

```bash
npm run lh:compare
```

Lee los cuatro informes de `../01-informe/EVIDENCIA/lighthouse/` y muestra
puntuaciones y métricas antes/después.

Para generarlos:

```bash
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"

npx lighthouse http://127.0.0.1:8100/tickets/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html \
  --output-path=../01-informe/EVIDENCIA/lighthouse/lh-local-mobile \
  --chrome-flags="--headless=new --no-sandbox"

npx lighthouse http://127.0.0.1:8100/tickets/ --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html \
  --output-path=../01-informe/EVIDENCIA/lighthouse/lh-local-desktop \
  --chrome-flags="--headless=new --no-sandbox"
```

## Notas

- Los scripts usan rutas relativas a esta carpeta; se pueden mover con el
  paquete completo.
- No ejecutar el `POST` contra producción con datos válidos: podría crear una
  sesión de Stripe o un lead.
- La suite no cubre pagos reales, lector de pantalla ni Safari/iOS.
